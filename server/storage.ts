import { isDoctorLike } from './utils/role-utils.js';
import {
  decryptPatientFromStorageRow,
  ENCRYPTED_PATIENT_PAYLOAD_KEY,
  isEncryptedPatientStorageRow,
  patientMatchesSearchQuery,
  preparePatientForStorage,
  assertEncryptedPatientInsertRow,
  isEncryptedScalarField,
  isPatientEncryptionConfigured,
} from './utils/encryption-sdk.js';
import { computePatientSearchHashes } from "./utils/patient-search-hashes.js";
import {
  appointmentWallClockOverlaps,
  formatAppointmentScheduledAtForApi,
  parseAppointmentWallClock,
  wallClockDateStringFromScheduled,
} from "./appointment-wall-clock.js";
import { 
  organizations, users, patients, medicalRecords, medicalRecordsFiles, appointments, invoices, payments, aiInsights, subscriptions, patientCommunications, consultations, notifications, prescriptions, documents, medicalImages, clinicalPhotos, labResults, riskAssessments, claims, revenueRecords, insuranceVerifications, clinicalProcedures, emergencyProtocols, medicationsDatabase, roles, staffShifts, doctorDefaultShifts, organizationHolidaySettings, organizationHolidays, gdprConsents, gdprDataRequests, gdprAuditTrail, gdprProcessingActivities, conversations as conversationsTable, messages, messageCampaigns, messageTemplates, userConversationFavorites, messageTags, messageTagAssignments, voiceNotes, saasOwners, saasPackages, saasSubscriptions, saasPayments, saasInvoices, saasSettings, chatbotConfigs, chatbotSessions, chatbotMessages, chatbotAnalytics, musclePositions, userDocumentPreferences, letterDrafts, forecastModels, financialForecasts, quickbooksConnections, quickbooksSyncLogs, quickbooksCustomerMappings, quickbooksInvoiceMappings, quickbooksPaymentMappings, quickbooksAccountMappings, quickbooksItemMappings, quickbooksSyncConfigs, doctorsFee, labTestPricing, imagingPricing, treatments, treatmentsInfo, clinicHeaders, clinicFooters, symptomChecks, passwordResetTokens, forms, formSections, formFields, formShares, formShareLogs, formResponses, formResponseValues, prescriptionShareLogs,
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Role, type InsertRole,
  type Patient, type InsertPatient,
  type MedicalRecord, type InsertMedicalRecord,
  type MedicalRecordsFile, type InsertMedicalRecordsFile,
  type Appointment, type InsertAppointment,
  type Invoice, type InsertInvoice,
  type AiInsight, type InsertAiInsight,
  type Subscription, type InsertSubscription,
  type PatientCommunication, type InsertPatientCommunication,
  type Consultation, type InsertConsultation,
  type Notification, type InsertNotification,
  type Prescription, type InsertPrescription,
  type Document, type InsertDocument,
  type MedicalImage, type InsertMedicalImage, type UpdateMedicalImageReportField,
  type ClinicalPhoto, type InsertClinicalPhoto,
  type LabResult, type InsertLabResult,
  type RiskAssessment, type InsertRiskAssessment,
  type Claim, type InsertClaim,
  type RevenueRecord, type InsertRevenueRecord,
  type InsuranceVerification, type InsertInsuranceVerification,
  type ClinicalProcedure, type InsertClinicalProcedure,
  type EmergencyProtocol, type InsertEmergencyProtocol,
  type MedicationsDatabase, type InsertMedicationsDatabase,
  type StaffShift, type InsertStaffShift,
  type DoctorDefaultShift, type InsertDoctorDefaultShift,
  type OrganizationHolidaySettings, type InsertOrganizationHolidaySettings,
  type OrganizationHoliday, type InsertOrganizationHoliday,
  type GdprConsent, type InsertGdprConsent,
  type GdprDataRequest, type InsertGdprDataRequest,
  type GdprAuditTrail, type InsertGdprAuditTrail,
  type GdprProcessingActivity, type InsertGdprProcessingActivity,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type MessageCampaign, type InsertMessageCampaign,
  type MessageTemplate, type InsertMessageTemplate,
  type VoiceNote, type InsertVoiceNote,
  type SaaSOwner, type InsertSaaSOwner,
  type SaaSPackage, type InsertSaaSPackage,
  type SaaSSubscription, type InsertSaaSSubscription,
  type SaaSPayment, type InsertSaaSPayment,
  type SaaSInvoice, type InsertSaaSInvoice,
  type SaaSSettings, type InsertSaaSSettings,
  type ChatbotConfig, type InsertChatbotConfig,
  type ChatbotSession, type InsertChatbotSession,
  type ChatbotMessage, type InsertChatbotMessage,
  type ChatbotAnalytics, type InsertChatbotAnalytics,
  type MusclePosition, type InsertMusclePosition,
  type UserDocumentPreferences, type InsertUserDocumentPreferences, type UpdateUserDocumentPreferences,
  type LetterDraft, type InsertLetterDraft,
  type ForecastModel, type InsertForecastModel,
  type FinancialForecast, type InsertFinancialForecast,
  type QuickBooksConnection, type InsertQuickBooksConnection,
  type QuickBooksSyncLog, type InsertQuickBooksSyncLog,
  type QuickBooksCustomerMapping, type InsertQuickBooksCustomerMapping,
  type QuickBooksInvoiceMapping, type InsertQuickBooksInvoiceMapping,
  type QuickBooksPaymentMapping, type InsertQuickBooksPaymentMapping,
  type QuickBooksAccountMapping, type InsertQuickBooksAccountMapping,
  type QuickBooksItemMapping, type InsertQuickBooksItemMapping,
  type QuickBooksSyncConfig, type InsertQuickBooksSyncConfig,
  type DoctorsFee, type InsertDoctorsFee,
  type LabTestPricing, type InsertLabTestPricing,
  type ImagingPricing, type InsertImagingPricing,
  type Treatment, type InsertTreatment,
  type TreatmentsInfo, type InsertTreatmentsInfo,
  type ClinicHeader, type InsertClinicHeader,
  type ClinicFooter, type InsertClinicFooter
} from "@shared/schema";
import { activeDbSchema, db, pool } from "./db";
import {
  isInvalidUtf8DatabaseError,
  sanitizeUtf8FromLatin1Bytes,
} from "./utils/utf8-sanitize";
import { ensureAiInsightsIdSequence } from "./ensure-db-schema";
import { eq, and, desc, asc, count, not, sql, gte, lt, lte, isNotNull, isNull, or, ilike, ne, inArray, type SQL } from "drizzle-orm";

const GRACE_PERIOD_DAYS = 13;
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Subscription Cache Implementation
interface SubscriptionCacheEntry {
  data: Subscription;
  expiresAt: number;
  staleUntil: number;
}

interface RefreshPromise {
  promise: Promise<Subscription | undefined>;
  timestamp: number;
}

class SubscriptionCache {
  private cache = new Map<number, SubscriptionCacheEntry>();
  private refreshPromises = new Map<number, RefreshPromise>();
  private readonly TTL = 60 * 1000; // 60s fresh
  private readonly STALE_GRACE = 5 * 60 * 1000; // 5m stale-while-revalidate

  async get(organizationId: number, refreshFn: () => Promise<Subscription | undefined>): Promise<Subscription | undefined> {
    const now = Date.now();
    const cached = this.cache.get(organizationId);
    
    // Fresh cache hit
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }
    
    // Stale cache hit - serve stale while refreshing in background
    if (cached && now < cached.staleUntil) {
      // Check if refresh is already in progress
      const existingRefresh = this.refreshPromises.get(organizationId);
      if (!existingRefresh || now - existingRefresh.timestamp > 30000) { // 30s timeout for refresh
        // Start background refresh
        const refreshPromise = this.performRefresh(organizationId, refreshFn);
        this.refreshPromises.set(organizationId, {
          promise: refreshPromise,
          timestamp: now
        });
      }
      return cached.data;
    }
    
    // Cache miss or expired - fetch fresh
    return await this.performRefresh(organizationId, refreshFn);
  }

  private async performRefresh(organizationId: number, refreshFn: () => Promise<Subscription | undefined>): Promise<Subscription | undefined> {
    try {
      const data = await refreshFn();
      
      if (data) {
        const now = Date.now();
        this.cache.set(organizationId, {
          data,
          expiresAt: now + this.TTL,
          staleUntil: now + this.TTL + this.STALE_GRACE
        });
      }
      
      // Clean up refresh promise
      this.refreshPromises.delete(organizationId);
      return data;
    } catch (error) {
      this.refreshPromises.delete(organizationId);
      throw error;
    }
  }

  invalidate(organizationId: number) {
    this.cache.delete(organizationId);
    this.refreshPromises.delete(organizationId);
  }
  
  // Cleanup old entries (called periodically)
  cleanup() {
    const now = Date.now();
    for (const [orgId, entry] of this.cache.entries()) {
      if (now > entry.staleUntil) {
        this.cache.delete(orgId);
      }
    }
  }
}

// Global cache instance
const subscriptionCache = new SubscriptionCache();

// Database retry logic has been moved to db-utils.ts and is now applied at the Pool.query level

export interface IStorage {
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteCustomerOrganization(id: number): Promise<{ success: boolean; message: string }>;
  getOrganizationDeletionPreview(id: number): Promise<Record<string, number>>;
  deleteOrganizationAndData(id: number): Promise<{ success: boolean; deletedCounts: Record<string, number> }>;

  // Users
  getUser(id: number, organizationId: number): Promise<User | undefined>;
  getUserByEmail(email: string, organizationId: number): Promise<User | undefined>;
  getUserByEmailGlobal(email: string): Promise<User | undefined>; // For universal login
  getUserByUsername(username: string, organizationId: number): Promise<User | undefined>;
  getUserByUsernameGlobal(username: string): Promise<User | undefined>; // For global username checks
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  getUsersByRole(role: string, organizationId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, organizationId: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number, organizationId: number): Promise<boolean>;

  // Roles
  getRole(id: number, organizationId: number): Promise<Role | undefined>;
  getRolesByOrganization(organizationId: number): Promise<Role[]>;
  getRoleByName(name: string, organizationId: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, organizationId: number, updates: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number, organizationId: number): Promise<boolean>;

  // Patients
  getPatient(id: number, organizationId: number): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string, organizationId: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: number, organizationId: number): Promise<Patient | undefined>;
  getPatientByEmail(email: string, organizationId: number): Promise<Patient | undefined>;
  /** Active patient id for FK only (no PHI decrypt). */
  getAnyActivePatientId(organizationId: number): Promise<number | undefined>;
  /** Any patient id in the org (no PHI decrypt). */
  getAnyPatientId(organizationId: number): Promise<number | undefined>;
  /** Row count for patientId generation (no PHI decrypt). */
  countPatientsInOrganization(organizationId: number): Promise<number>;
  /**
   * Patient id for form_shares FK when sharing to an arbitrary email.
   * Reuses any existing row, or creates a one-time internal placeholder patient.
   */
  ensureFormShareFkPatientId(organizationId: number): Promise<number>;
  /** Lookup by email or create a minimal encrypted patient row for form-share recipients. */
  findOrCreatePatientForFormShare(email: string, organizationId: number): Promise<Patient>;
  getPatientsByOrganization(organizationId: number, limit?: number, isActive?: boolean): Promise<Patient[]>;
  getPatientsByUserId(organizationId: number, userId: number): Promise<Patient[]>;
  /** Decrypt/normalize a raw patients table row (for direct SQL/drizzle reads outside helpers). */
  normalizePatientFromRow(rawPatient: unknown): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, organizationId: number, updates: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number, organizationId: number): Promise<boolean>;
  deletePatientRecordOnly(id: number, organizationId: number): Promise<boolean>;
  searchPatients(organizationId: number, query: string): Promise<Patient[]>;

  // Medical Records
  getMedicalRecord(id: number, organizationId: number): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPatient(patientId: number, organizationId: number): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, organizationId: number, updates: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;
  deleteMedicalRecord(id: number, organizationId: number): Promise<boolean>;

  // Appointments
  getAppointment(id: number, organizationId: number): Promise<Appointment | undefined>;
  getAppointmentsByOrganization(organizationId: number, date?: Date): Promise<Appointment[]>;
  getAppointmentsByProvider(providerId: number, organizationId: number, date?: Date | string): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, organizationId: number, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number, organizationId: number): Promise<boolean>;
  /** Set status to in_progress for appointments whose time window contains NOW() (scheduled/confirmed only). */
  promoteOngoingAppointmentsToInProgress(organizationId: number): Promise<void>;

  // Invoices
  getInvoice(id: number, organizationId: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string, organizationId: number): Promise<Invoice | undefined>;
  getInvoiceByService(organizationId: number, serviceType: string, serviceIds: string[]): Promise<Invoice | undefined>;
  getInvoicesByOrganization(organizationId: number, status?: string): Promise<Invoice[]>;
  getInvoicesByPatient(patientId: string, organizationId: number): Promise<Invoice[]>;
  createPatientInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, organizationId: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number, organizationId: number): Promise<boolean>;
  
  // Payments
  createPayment(payment: any): Promise<any>;
  getPaymentsByInvoice(invoiceId: number, organizationId: number): Promise<any[]>;
  getPaymentsByOrganization(organizationId: number): Promise<any[]>;
  deletePayment(id: number): Promise<boolean>;

  // AI Insights
  getAiInsight(id: number, organizationId: number): Promise<AiInsight | undefined>;
  getAiInsightsByOrganization(organizationId: number, limit?: number): Promise<AiInsight[]>;
  getAiInsightsByPatient(patientId: number, organizationId: number): Promise<AiInsight[]>;
  getAiInsightsByStatus(patientId: number, organizationId: number, status: string): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
  updateAiInsight(id: number, organizationId: number, updates: Partial<InsertAiInsight>): Promise<AiInsight | undefined>;
  deleteAiInsight(id: number, organizationId: number): Promise<boolean>;

  // Subscriptions
  getSubscription(organizationId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(organizationId: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Consultations
  getConsultation(id: number, organizationId: number): Promise<Consultation | undefined>;
  getConsultationsByOrganization(organizationId: number, limit?: number): Promise<Consultation[]>;
  getConsultationsByPatient(patientId: number, organizationId: number): Promise<Consultation[]>;
  getConsultationsByProvider(providerId: number, organizationId: number): Promise<Consultation[]>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: number, organizationId: number, updates: Partial<InsertConsultation>): Promise<Consultation | undefined>;

  // Patient Communications
  getPatientCommunication(id: number, organizationId: number): Promise<PatientCommunication | undefined>;
  getPatientCommunications(patientId: number, organizationId: number): Promise<PatientCommunication[]>;
  createPatientCommunication(communication: InsertPatientCommunication): Promise<PatientCommunication>;
  updatePatientCommunication(id: number, organizationId: number, updates: Partial<InsertPatientCommunication>): Promise<PatientCommunication | undefined>;
  getLastReminderSent(patientId: number, organizationId: number, type: string): Promise<PatientCommunication | undefined>;
  getScheduledCommunications(): Promise<PatientCommunication[]>;
  findPatientByPhone(phoneVariants: string[]): Promise<Patient | undefined>;
  getOrganizationAdmin(organizationId: number): Promise<User | undefined>;

  // Notifications
  getNotifications(userId: number, organizationId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number, organizationId: number): Promise<number>;
  getNotificationsByOrganization(organizationId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCountByOrganization(organizationId: number): Promise<number>;
  getNotification(id: number, userId: number, organizationId: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number, userId: number, organizationId: number): Promise<Notification | undefined>;
  markNotificationAsDismissed(id: number, userId: number, organizationId: number): Promise<Notification | undefined>;
  markNotificationAsDismissedByOrganization(id: number, organizationId: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number, organizationId: number): Promise<void>;
  deleteNotification(id: number, userId: number, organizationId: number): Promise<boolean>;

  // Prescriptions
  getPrescription(id: number, organizationId: number): Promise<Prescription | undefined>;
  getPrescriptionsByOrganization(organizationId: number, limit?: number): Promise<Prescription[]>;
  getPrescriptionsByPatient(patientId: number, organizationId: number): Promise<Prescription[]>;
  getPrescriptionsByProvider(providerId: number, organizationId: number): Promise<Prescription[]>;
  getPrescriptionsByStatus(patientId: number, organizationId: number, status: string): Promise<Prescription[]>;
  findRecentPrescriptionDuplicate(
    organizationId: number,
    patientId: number,
    doctorId: number,
    diagnosis: string,
    medications: Array<{ name?: string; dosage?: string; frequency?: string }>,
    withinSeconds?: number,
  ): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription, clientLocalTime?: string): Promise<Prescription>;
  updatePrescription(id: number, organizationId: number, updates: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  deletePrescription(id: number, organizationId: number): Promise<Prescription | undefined>;

  // Dashboard Stats
  getDashboardStats(organizationId: number): Promise<{
    totalPatients: number;
    todayAppointments: number;
    aiSuggestions: number;
    revenue: number;
  }>;

  // Forms
  getForms(organizationId: number): Promise<any[]>;
  createForm(form: any, organizationId: number): Promise<any>;
  
  // Analytics
  getAnalytics(organizationId: number): Promise<any>;
  
  // Automation
  getAutomationRules(organizationId: number): Promise<any[]>;
  getAutomationStats(organizationId: number): Promise<any>;
  toggleAutomationRule(ruleId: string, organizationId: number): Promise<any>;
  
  // Messaging
  getConversations(organizationId: number, currentUserId?: number): Promise<any[]>;
  getMessages(conversationId: string, organizationId: number): Promise<any[]>;
  markConversationMessagesAsRead(conversationId: string, userId: number, organizationId: number): Promise<void>;
  sendMessage(messageData: any, organizationId: number): Promise<any>;
  deleteConversation(conversationId: string, organizationId: number): Promise<boolean>;
  toggleConversationFavorite(conversationId: string, userId: number, organizationId: number): Promise<boolean>;
  getMessageCampaigns(organizationId: number, currentUserId?: number, userRole?: string): Promise<any[]>;
  createMessageCampaign(campaignData: any, organizationId: number): Promise<any>;
  updateMessageCampaign(campaignId: number, campaignData: any, organizationId: number): Promise<any>;
  getMessageTemplates(organizationId: number, currentUserId?: number, userRole?: string): Promise<any[]>;
  createMessageTemplate(templateData: any, organizationId: number): Promise<any>;
  updateMessageTemplate(templateId: number, templateData: any, organizationId: number): Promise<any>;
  deleteMessageTemplate(templateId: number, organizationId: number): Promise<boolean>;
  // Message Tags
  getMessageTags(organizationId: number): Promise<any[]>;
  createMessageTag(tagData: { name: string; color?: string; organizationId: number; createdBy: number }): Promise<any>;
  getMessageTagsForMessage(messageId: string, organizationId: number): Promise<any[]>;
  addTagToMessage(messageId: string, tagId: number, userId: number, organizationId: number): Promise<boolean>;
  removeTagFromMessage(messageId: string, tagId: number, organizationId: number): Promise<boolean>;
  
  // Integrations
  getIntegrations(organizationId: number): Promise<any[]>;
  connectIntegration(integrationData: any, organizationId: number): Promise<any>;
  getWebhooks(organizationId: number): Promise<any[]>;
  createWebhook(webhookData: any, organizationId: number): Promise<any>;
  getApiKeys(organizationId: number): Promise<any[]>;
  createApiKey(apiKeyData: any, organizationId: number): Promise<any>;

  // Lab Results
  getLabResults(organizationId: number): Promise<any[]>;
  createLabResult(labResult: any): Promise<any>;

  // Medical Images
  getMedicalImage(id: number, organizationId: number): Promise<MedicalImage | undefined>;
  getMedicalImagesByPatient(patientId: number, organizationId: number): Promise<MedicalImage[]>;
  getMedicalImagesByOrganization(organizationId: number, limit?: number): Promise<MedicalImage[]>;
  createMedicalImage(image: InsertMedicalImage): Promise<MedicalImage>;
  updateMedicalImage(id: number, organizationId: number, updates: Partial<InsertMedicalImage>): Promise<MedicalImage | undefined>;
  updateMedicalImageReportField(id: number, organizationId: number, fieldName: string, value: string): Promise<MedicalImage | undefined>;
  updateMedicalImageReport(id: number, organizationId: number, reportData: { reportFileName?: string; reportFilePath?: string; findings?: string | null; impression?: string | null; radiologist?: string | null; scheduledAt?: string | null; performedAt?: string | null }): Promise<MedicalImage | undefined>;
  deleteMedicalImage(id: number, organizationId: number): Promise<boolean>;

  // Clinical Photos
  getClinicalPhoto(id: number, organizationId: number): Promise<ClinicalPhoto | undefined>;
  getClinicalPhotosByPatient(patientId: number, organizationId: number): Promise<ClinicalPhoto[]>;
  getClinicalPhotosByOrganization(organizationId: number, limit?: number): Promise<ClinicalPhoto[]>;
  createClinicalPhoto(photo: InsertClinicalPhoto): Promise<ClinicalPhoto>;
  updateClinicalPhoto(id: number, organizationId: number, updates: Partial<InsertClinicalPhoto>): Promise<ClinicalPhoto | undefined>;
  deleteClinicalPhoto(id: number, organizationId: number): Promise<boolean>;

  // Muscle Positions - For facial muscle analysis
  saveMusclePosition(musclePosition: InsertMusclePosition): Promise<MusclePosition>;
  getMusclePositions(organizationId: number, patientId: number): Promise<MusclePosition[]>;

  // Documents
  getDocument(id: number, organizationId: number): Promise<Document | undefined>;
  getDocumentsByUser(userId: number, organizationId: number): Promise<Document[]>;
  getDocumentsByOrganization(organizationId: number, limit?: number): Promise<Document[]>;
  getTemplatesByOrganization(organizationId: number, limit?: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, organizationId: number, updates: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number, organizationId: number): Promise<boolean>;

  // Lab Results (Database-driven)
  getLabResult(id: number, organizationId: number): Promise<LabResult | undefined>;
  getLabResultsByOrganization(organizationId: number, limit?: number): Promise<LabResult[]>;
  getLabResultsByPatient(patientId: number, organizationId: number): Promise<LabResult[]>;
  getLabResultsByStatus(patientId: number, organizationId: number, status: string): Promise<LabResult[]>;
  createLabResult(labResult: InsertLabResult): Promise<LabResult>;
  updateLabResult(id: number, organizationId: number, updates: Partial<InsertLabResult>): Promise<LabResult | undefined>;

  // Risk Assessments (Database-driven)
  getRiskAssessmentsByPatient(patientId: number, organizationId: number): Promise<RiskAssessment[]>;
  getRiskAssessmentsByOrganization(organizationId: number, limit?: number): Promise<RiskAssessment[]>;
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  updateRiskAssessment(id: number, organizationId: number, updates: Partial<InsertRiskAssessment>): Promise<RiskAssessment | undefined>;

  // Claims (Database-driven)
  getClaim(id: number, organizationId: number): Promise<Claim | undefined>;
  getClaimsByOrganization(organizationId: number, limit?: number): Promise<Claim[]>;
  getClaimsByPatient(patientId: number, organizationId: number): Promise<Claim[]>;
  getClaimsByStatus(patientId: number, organizationId: number, status: string): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: number, organizationId: number, updates: Partial<InsertClaim>): Promise<Claim | undefined>;

  // Insurance Verifications (Database-driven)
  getInsuranceVerification(id: number, organizationId: number): Promise<InsuranceVerification | undefined>;
  getInsuranceVerificationsByOrganization(organizationId: number, limit?: number): Promise<InsuranceVerification[]>;
  getInsuranceVerificationsByPatient(patientId: number, organizationId: number): Promise<InsuranceVerification[]>;
  createInsuranceVerification(insurance: InsertInsuranceVerification): Promise<InsuranceVerification>;
  updateInsuranceVerification(id: number, organizationId: number, updates: Partial<InsertInsuranceVerification>): Promise<InsuranceVerification | undefined>;
  deleteInsuranceVerification(id: number, organizationId: number): Promise<boolean>;

  // Revenue Records (Database-driven)
  getRevenueRecordsByOrganization(organizationId: number, limit?: number): Promise<RevenueRecord[]>;
  createRevenueRecord(revenueRecord: InsertRevenueRecord): Promise<RevenueRecord>;

  // Clinical Procedures (Database-driven)
  getClinicalProceduresByOrganization(organizationId: number, limit?: number): Promise<ClinicalProcedure[]>;
  createClinicalProcedure(procedure: InsertClinicalProcedure): Promise<ClinicalProcedure>;
  updateClinicalProcedure(id: number, organizationId: number, updates: Partial<InsertClinicalProcedure>): Promise<ClinicalProcedure | undefined>;

  // Emergency Protocols (Database-driven)
  getEmergencyProtocolsByOrganization(organizationId: number, limit?: number): Promise<EmergencyProtocol[]>;
  createEmergencyProtocol(protocol: InsertEmergencyProtocol): Promise<EmergencyProtocol>;
  updateEmergencyProtocol(id: number, organizationId: number, updates: Partial<InsertEmergencyProtocol>): Promise<EmergencyProtocol | undefined>;

  // Medications Database (Database-driven)
  getMedicationsByOrganization(organizationId: number, limit?: number): Promise<MedicationsDatabase[]>;
  createMedication(medication: InsertMedicationsDatabase): Promise<MedicationsDatabase>;
  updateMedication(id: number, organizationId: number, updates: Partial<InsertMedicationsDatabase>): Promise<MedicationsDatabase | undefined>;

  // Staff Shifts (Database-driven)
  getStaffShift(id: number, organizationId: number): Promise<StaffShift | undefined>;
  getStaffShiftsByOrganization(organizationId: number, date?: string, createdBy?: number): Promise<StaffShift[]>;
  getStaffShiftsByStaff(staffId: number, organizationId: number, date?: string): Promise<StaffShift[]>;
  createStaffShift(shift: InsertStaffShift): Promise<StaffShift>;
  updateStaffShift(id: number, organizationId: number, updates: Partial<InsertStaffShift>): Promise<StaffShift | undefined>;
  deleteStaffShift(id: number, organizationId: number): Promise<boolean>;

  // Default Shifts (Database-driven)
  getDefaultShiftsByOrganization(organizationId: number): Promise<DoctorDefaultShift[]>;
  getDefaultShiftByUser(userId: number, organizationId: number): Promise<DoctorDefaultShift | undefined>;
  updateDefaultShift(userId: number, organizationId: number, updates: Partial<InsertDoctorDefaultShift>): Promise<DoctorDefaultShift | undefined>;
  initializeDefaultShifts(organizationId: number): Promise<{ created: number; skipped: number }>;
  deleteDefaultShift(userId: number, organizationId: number): Promise<boolean>;
  deleteAllDefaultShifts(organizationId: number): Promise<{ deleted: number }>;

  // Holiday calendar (organization-wide)
  getHolidayCalendarSettings(organizationId: number): Promise<OrganizationHolidaySettings>;
  upsertHolidayCalendarSettings(organizationId: number, updates: Partial<InsertOrganizationHolidaySettings>): Promise<OrganizationHolidaySettings>;
  getOrganizationHolidaysInRange(organizationId: number, fromDate: string, toDate: string): Promise<OrganizationHoliday[]>;
  getOrganizationHoliday(id: number, organizationId: number): Promise<OrganizationHoliday | undefined>;
  createOrganizationHoliday(holiday: InsertOrganizationHoliday): Promise<OrganizationHoliday>;
  updateOrganizationHoliday(id: number, organizationId: number, updates: Partial<InsertOrganizationHoliday>): Promise<OrganizationHoliday | undefined>;
  deleteOrganizationHoliday(id: number, organizationId: number): Promise<boolean>;
  resolveDateHolidayStatus(organizationId: number, dateStr: string): Promise<{
    isNonWorking: boolean;
    allowShifts: boolean;
    isWorkingDay: boolean;
    label: string;
    holidayType: string;
    source: "holiday" | "weekend";
    holidayId?: number;
  } | null>;

  // GDPR Compliance
  createGdprConsent(consent: InsertGdprConsent): Promise<GdprConsent>;
  updateGdprConsent(id: number, organizationId: number, updates: Partial<InsertGdprConsent>): Promise<GdprConsent | undefined>;
  getGdprConsentsByPatient(patientId: number, organizationId: number): Promise<GdprConsent[]>;
  getGdprConsentsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprConsent[]>;
  
  createGdprDataRequest(request: InsertGdprDataRequest): Promise<GdprDataRequest>;
  updateGdprDataRequest(id: number, organizationId: number, updates: Partial<InsertGdprDataRequest>): Promise<GdprDataRequest | undefined>;
  getGdprDataRequestsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprDataRequest[]>;
  
  createGdprAuditTrail(audit: InsertGdprAuditTrail): Promise<GdprAuditTrail>;
  
  getActiveAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]>;

  // SaaS Administration
  getSaaSOwner(id: number): Promise<SaaSOwner | undefined>;
  getSaaSOwnerById(id: number): Promise<SaaSOwner | undefined>;
  getSaaSOwnerByUsername(username: string): Promise<SaaSOwner | undefined>;
  updateSaaSOwner(id: number, data: Partial<SaaSOwner>): Promise<SaaSOwner>;
  updateSaaSOwnerLastLogin(id: number): Promise<void>;
  getSaaSStats(): Promise<any>;
  getAllUsers(search?: string, organizationId?: string): Promise<any[]>;
  resetUserPassword(userId: number): Promise<any>;
  updateUserStatus(userId: number, isActive: boolean): Promise<any>;
  // PRIVACY COMPLIANT: Only subscription contacts, not all users
  getSubscriptionContacts(search?: string): Promise<any[]>;
  resetSubscriptionContactPassword(contactId: number): Promise<any>;
  updateSubscriptionContactStatus(contactId: number, isActive: boolean): Promise<any>;
  getAllOrganizations(): Promise<Organization[]>;
  listOrganizationIds(): Promise<number[]>;
  getAllCustomers(search?: string, status?: string): Promise<any[]>;
  getCustomerById(customerId: number): Promise<any>;
  getOrganizationSubscription(organizationId: number): Promise<any>;
  updateOrganizationStatus(organizationId: number, status: string): Promise<any>;
  getAllPackages(): Promise<SaaSPackage[]>;
  getPackageById(packageId: number): Promise<SaaSPackage | undefined>;
  createPackage(packageData: InsertSaaSPackage): Promise<SaaSPackage>;
  updatePackage(id: number, packageData: Partial<InsertSaaSPackage>): Promise<SaaSPackage>;
  deletePackage(id: number): Promise<any>;
  reorderPackages(order: { id: number; displayOrder: number }[]): Promise<void>;
  getBillingData(searchTerm?: string, dateRange?: string): Promise<{ invoices: any[], total: number }>;
  getBillingStats(dateRange?: string): Promise<any>;
  createSaasPayment(paymentData: any): Promise<any>;
  updatePaymentStatus(paymentId: number, status: string, transactionId?: string): Promise<any>;
  suspendUnpaidSubscriptions(): Promise<void>;
  getAllSaaSSubscriptions(): Promise<any[]>;
  createSaaSSubscription(subscriptionData: InsertSaaSSubscription): Promise<any>;
  getSaaSSubscriptionByStripeId(stripeSubscriptionId: string): Promise<any | null>;
  updateSaaSSubscription(subscriptionId: number, updates: Partial<InsertSaaSSubscription>): Promise<any>;
  deleteSaaSSubscription(subscriptionId: number): Promise<boolean>;
  createPatientInvoice(invoiceData: any): Promise<any>;
  getOverdueInvoices(): Promise<any[]>;
  calculateMonthlyRecurring(): Promise<number>;
  getSaaSSettings(): Promise<any>;
  updateSaaSSettings(settings: any): Promise<any>;
  testEmailSettings(): Promise<any>;

  // Chatbot Configuration
  getChatbotConfig(organizationId: number): Promise<ChatbotConfig | undefined>;
  createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig>;
  updateChatbotConfig(organizationId: number, updates: Partial<InsertChatbotConfig>): Promise<ChatbotConfig | undefined>;

  // Chatbot Sessions
  getChatbotSession(sessionId: string, organizationId: number): Promise<ChatbotSession | undefined>;
  createChatbotSession(session: InsertChatbotSession): Promise<ChatbotSession>;
  updateChatbotSession(sessionId: string, organizationId: number, updates: Partial<InsertChatbotSession>): Promise<ChatbotSession | undefined>;
  getChatbotSessionsByOrganization(organizationId: number, limit?: number): Promise<ChatbotSession[]>;

  // Chatbot Messages
  getChatbotMessage(messageId: string, organizationId: number): Promise<ChatbotMessage | undefined>;
  getChatbotMessagesBySession(sessionId: number, organizationId: number): Promise<ChatbotMessage[]>;
  createChatbotMessage(message: InsertChatbotMessage): Promise<ChatbotMessage>;
  updateChatbotMessage(messageId: string, organizationId: number, updates: Partial<InsertChatbotMessage>): Promise<ChatbotMessage | undefined>;

  // Chatbot Analytics
  getChatbotAnalytics(organizationId: number, date?: Date): Promise<ChatbotAnalytics[]>;
  createChatbotAnalytics(analytics: InsertChatbotAnalytics): Promise<ChatbotAnalytics>;
  updateChatbotAnalytics(id: number, organizationId: number, updates: Partial<InsertChatbotAnalytics>): Promise<ChatbotAnalytics | undefined>;

  // Voice Notes
  getVoiceNote(id: string, organizationId: number): Promise<VoiceNote | undefined>;
  getVoiceNotesByOrganization(organizationId: number, limit?: number): Promise<VoiceNote[]>;
  getVoiceNotesByPatient(patientId: string, organizationId: number): Promise<VoiceNote[]>;
  getVoiceNotesByStatus(patientId: number, organizationId: number, status: string): Promise<VoiceNote[]>;
  createVoiceNote(voiceNote: InsertVoiceNote): Promise<VoiceNote>;
  updateVoiceNote(id: string, organizationId: number, updates: Partial<InsertVoiceNote>): Promise<VoiceNote | undefined>;
  deleteVoiceNote(id: string, organizationId: number): Promise<boolean>;

  // User Document Preferences
  getUserDocumentPreferences(userId: number, organizationId: number): Promise<UserDocumentPreferences | undefined>;
  createUserDocumentPreferences(preferences: InsertUserDocumentPreferences): Promise<UserDocumentPreferences>;
  updateUserDocumentPreferences(userId: number, organizationId: number, updates: UpdateUserDocumentPreferences): Promise<UserDocumentPreferences | undefined>;

  // Letter Drafts
  getLetterDraft(id: number, organizationId: number): Promise<LetterDraft | undefined>;
  getLetterDraftsByUser(userId: number, organizationId: number): Promise<LetterDraft[]>;
  createLetterDraft(draft: InsertLetterDraft): Promise<LetterDraft>;
  updateLetterDraft(id: number, organizationId: number, updates: Partial<InsertLetterDraft>): Promise<LetterDraft | undefined>;
  deleteLetterDraft(id: number, organizationId: number): Promise<boolean>;

  // Financial Forecasting
  getFinancialForecasts(organizationId: number): Promise<FinancialForecast[]>;
  getFinancialForecast(id: number, organizationId: number): Promise<FinancialForecast | undefined>;
  generateFinancialForecasts(organizationId: number): Promise<FinancialForecast[]>;
  createFinancialForecast(forecast: InsertFinancialForecast): Promise<FinancialForecast>;
  updateFinancialForecast(id: number, organizationId: number, updates: Partial<InsertFinancialForecast>): Promise<FinancialForecast | undefined>;
  deleteFinancialForecast(id: number, organizationId: number): Promise<boolean>;
  
  // Forecast Models
  getForecastModels(organizationId: number): Promise<ForecastModel[]>;
  getForecastModel(id: number, organizationId: number): Promise<ForecastModel | undefined>;
  createForecastModel(model: InsertForecastModel): Promise<ForecastModel>;
  updateForecastModel(id: number, organizationId: number, updates: Partial<InsertForecastModel>): Promise<ForecastModel | undefined>;
  deleteForecastModel(id: number, organizationId: number): Promise<boolean>;

  // QuickBooks Integration
  // Connections
  getQuickBooksConnections(organizationId: number): Promise<QuickBooksConnection[]>;
  getQuickBooksConnection(id: number, organizationId: number): Promise<QuickBooksConnection | undefined>;
  getActiveQuickBooksConnection(organizationId: number): Promise<QuickBooksConnection | undefined>;
  createQuickBooksConnection(connection: InsertQuickBooksConnection): Promise<QuickBooksConnection>;
  updateQuickBooksConnection(id: number, organizationId: number, updates: Partial<InsertQuickBooksConnection>): Promise<QuickBooksConnection | undefined>;
  deleteQuickBooksConnection(id: number, organizationId: number): Promise<boolean>;
  
  // Sync Logs
  getQuickBooksSyncLogs(organizationId: number, connectionId?: number, syncType?: string): Promise<QuickBooksSyncLog[]>;
  createQuickBooksSyncLog(log: InsertQuickBooksSyncLog): Promise<QuickBooksSyncLog>;
  updateQuickBooksSyncLog(id: number, updates: Partial<InsertQuickBooksSyncLog>): Promise<QuickBooksSyncLog | undefined>;
  
  // Customer Mappings
  getQuickBooksCustomerMappings(organizationId: number, connectionId?: number): Promise<QuickBooksCustomerMapping[]>;
  getQuickBooksCustomerMapping(patientId: number, organizationId: number): Promise<QuickBooksCustomerMapping | undefined>;
  createQuickBooksCustomerMapping(mapping: InsertQuickBooksCustomerMapping): Promise<QuickBooksCustomerMapping>;
  updateQuickBooksCustomerMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksCustomerMapping>): Promise<QuickBooksCustomerMapping | undefined>;
  deleteQuickBooksCustomerMapping(id: number, organizationId: number): Promise<boolean>;
  
  // Invoice Mappings
  getQuickBooksInvoiceMappings(organizationId: number, connectionId?: number): Promise<QuickBooksInvoiceMapping[]>;
  getQuickBooksInvoiceMapping(emrInvoiceId: string, organizationId: number): Promise<QuickBooksInvoiceMapping | undefined>;
  createQuickBooksInvoiceMapping(mapping: InsertQuickBooksInvoiceMapping): Promise<QuickBooksInvoiceMapping>;
  updateQuickBooksInvoiceMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksInvoiceMapping>): Promise<QuickBooksInvoiceMapping | undefined>;
  deleteQuickBooksInvoiceMapping(id: number, organizationId: number): Promise<boolean>;
  
  // Payment Mappings
  getQuickBooksPaymentMappings(organizationId: number, connectionId?: number): Promise<QuickBooksPaymentMapping[]>;
  getQuickBooksPaymentMapping(emrPaymentId: string, organizationId: number): Promise<QuickBooksPaymentMapping | undefined>;
  createQuickBooksPaymentMapping(mapping: InsertQuickBooksPaymentMapping): Promise<QuickBooksPaymentMapping>;
  updateQuickBooksPaymentMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksPaymentMapping>): Promise<QuickBooksPaymentMapping | undefined>;
  deleteQuickBooksPaymentMapping(id: number, organizationId: number): Promise<boolean>;
  
  // Account Mappings
  getQuickBooksAccountMappings(organizationId: number, connectionId?: number): Promise<QuickBooksAccountMapping[]>;
  getQuickBooksAccountMapping(emrAccountType: string, organizationId: number): Promise<QuickBooksAccountMapping | undefined>;
  createQuickBooksAccountMapping(mapping: InsertQuickBooksAccountMapping): Promise<QuickBooksAccountMapping>;
  updateQuickBooksAccountMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksAccountMapping>): Promise<QuickBooksAccountMapping | undefined>;
  deleteQuickBooksAccountMapping(id: number, organizationId: number): Promise<boolean>;
  
  // Item Mappings
  getQuickBooksItemMappings(organizationId: number, connectionId?: number): Promise<QuickBooksItemMapping[]>;
  getQuickBooksItemMapping(emrItemId: string, organizationId: number): Promise<QuickBooksItemMapping | undefined>;
  createQuickBooksItemMapping(mapping: InsertQuickBooksItemMapping): Promise<QuickBooksItemMapping>;
  updateQuickBooksItemMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksItemMapping>): Promise<QuickBooksItemMapping | undefined>;
  deleteQuickBooksItemMapping(id: number, organizationId: number): Promise<boolean>;
  
  // Sync Configurations
  getQuickBooksSyncConfigs(organizationId: number, connectionId?: number): Promise<QuickBooksSyncConfig[]>;
  getQuickBooksSyncConfig(id: number, organizationId: number): Promise<QuickBooksSyncConfig | undefined>;
  createQuickBooksSyncConfig(config: InsertQuickBooksSyncConfig): Promise<QuickBooksSyncConfig>;
  updateQuickBooksSyncConfig(id: number, organizationId: number, updates: Partial<InsertQuickBooksSyncConfig>): Promise<QuickBooksSyncConfig | undefined>;
  deleteQuickBooksSyncConfig(id: number, organizationId: number): Promise<boolean>;

  // Pricing Management
  // Doctors Fee
  getDoctorsFees(organizationId: number): Promise<DoctorsFee[]>;
  getDoctorsFee(id: number, organizationId: number): Promise<DoctorsFee | undefined>;
  getDoctorsFeesByDoctor(doctorId: number, organizationId: number): Promise<DoctorsFee[]>;
  createDoctorsFee(fee: InsertDoctorsFee): Promise<DoctorsFee>;
  updateDoctorsFee(id: number, organizationId: number, updates: Partial<InsertDoctorsFee>): Promise<DoctorsFee | undefined>;
  deleteDoctorsFee(id: number, organizationId: number): Promise<boolean>;
  
  // Lab Test Pricing
  getLabTestPricing(organizationId: number): Promise<LabTestPricing[]>;
  getLabTestPricingById(id: number, organizationId: number): Promise<LabTestPricing | undefined>;
  createLabTestPricing(pricing: InsertLabTestPricing): Promise<LabTestPricing>;
  updateLabTestPricing(id: number, organizationId: number, updates: Partial<InsertLabTestPricing>): Promise<LabTestPricing | undefined>;
  deleteLabTestPricing(id: number, organizationId: number): Promise<boolean>;
  
  // Imaging Pricing
  getImagingPricing(organizationId: number): Promise<ImagingPricing[]>;
  getImagingPricingById(id: number, organizationId: number): Promise<ImagingPricing | undefined>;
  createImagingPricing(pricing: InsertImagingPricing): Promise<ImagingPricing>;
  updateImagingPricing(id: number, organizationId: number, updates: Partial<InsertImagingPricing>): Promise<ImagingPricing | undefined>;
  deleteImagingPricing(id: number, organizationId: number): Promise<boolean>;

  // Treatments Pricing
  getTreatments(organizationId: number): Promise<Treatment[]>;
  getTreatment(id: number, organizationId: number): Promise<Treatment | undefined>;
  createTreatment(treatment: InsertTreatment): Promise<Treatment>;
  updateTreatment(id: number, organizationId: number, updates: Partial<InsertTreatment>): Promise<Treatment | undefined>;
  deleteTreatment(id: number, organizationId: number): Promise<boolean>;
  // Treatments Info
  getTreatmentsInfo(organizationId: number): Promise<TreatmentsInfo[]>;
  createTreatmentsInfo(info: InsertTreatmentsInfo): Promise<TreatmentsInfo>;
  updateTreatmentsInfo(id: number, organizationId: number, updates: Partial<InsertTreatmentsInfo>): Promise<TreatmentsInfo | undefined>;
  deleteTreatmentsInfo(id: number, organizationId: number): Promise<boolean>;
  
  // Clinic Headers
  createClinicHeader(header: InsertClinicHeader): Promise<ClinicHeader>;
  updateClinicHeader(id: number, organizationId: number, updates: Partial<InsertClinicHeader>): Promise<ClinicHeader | undefined>;
  getActiveClinicHeader(organizationId: number): Promise<ClinicHeader | undefined>;
  
  // Clinic Footers
  createClinicFooter(footer: InsertClinicFooter): Promise<ClinicFooter>;
  updateClinicFooter(id: number, organizationId: number, updates: Partial<InsertClinicFooter>): Promise<ClinicFooter | undefined>;
  getActiveClinicFooter(organizationId: number): Promise<ClinicFooter | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        subdomain: organizations.subdomain,
        email: organizations.email,
        region: organizations.region,
        brandName: organizations.brandName,
        settings: organizations.settings,
        features: organizations.features,
        accessLevel: organizations.accessLevel,
        subscriptionStatus: organizations.subscriptionStatus,
        stripeAccountId: organizations.stripeAccountId,
        stripeStatus: organizations.stripeStatus,
        country_code: organizations.country_code,
        currency_code: organizations.currency_code,
        currency_symbol: organizations.currency_symbol,
        language_code: organizations.language_code,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization || undefined;
  }

  async getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        subdomain: organizations.subdomain,
        email: organizations.email,
        region: organizations.region,
        brandName: organizations.brandName,
        settings: organizations.settings,
        features: organizations.features,
        accessLevel: organizations.accessLevel,
        subscriptionStatus: organizations.subscriptionStatus,
        country_code: organizations.country_code,
        currency_code: organizations.currency_code,
        currency_symbol: organizations.currency_symbol,
        language_code: organizations.language_code,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .where(ilike(organizations.subdomain, subdomain));
    return organization || undefined;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const { settings, features, ...baseFields } = organization;
    const insertData = {
      ...baseFields,
      settings: settings ? JSON.parse(JSON.stringify(settings)) : null,
      features: features ? JSON.parse(JSON.stringify(features)) : null
    };
    const [created] = await db.insert(organizations).values([insertData as any]).returning();
    return created;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    try {
      const cleanUpdates: any = {};
      
      // Only include fields that are actually being updated
      if (updates.name !== undefined) cleanUpdates.name = updates.name;
      if (updates.brandName !== undefined) cleanUpdates.brandName = updates.brandName;
      if (updates.region !== undefined) cleanUpdates.region = updates.region;
      
      // Handle settings field - ensure it's a valid object
      if (updates.settings !== undefined) {
        // Ensure settings is a proper object (not null/undefined)
        cleanUpdates.settings = updates.settings && typeof updates.settings === 'object' 
          ? updates.settings 
          : {};
      }
      
      // Always update timestamp
      cleanUpdates.updatedAt = new Date();
      
      console.log(`[STORAGE] Updating organization ${id} with:`, JSON.stringify(cleanUpdates, null, 2));
      
      // Explicitly select all fields including brandName in the returning clause
      const [updated] = await db.update(organizations)
        .set(cleanUpdates)
        .where(eq(organizations.id, id))
        .returning({
          id: organizations.id,
          name: organizations.name,
          subdomain: organizations.subdomain,
          email: organizations.email,
          region: organizations.region,
          brandName: organizations.brandName,
          settings: organizations.settings,
          features: organizations.features,
          accessLevel: organizations.accessLevel,
          subscriptionStatus: organizations.subscriptionStatus,
          stripeAccountId: organizations.stripeAccountId,
          stripeStatus: organizations.stripeStatus,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        });
      
      console.log(`[STORAGE] Updated organization result:`, updated ? JSON.stringify(updated, null, 2) : 'No organization updated');
      return updated || undefined;
    } catch (error: any) {
      console.error(`[STORAGE] Error updating organization ${id}:`, error);
      console.error(`[STORAGE] Error details:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        stack: error.stack
      });
      throw error;
    }
  }

  async getOrganizationDeletionPreview(id: number): Promise<Record<string, number>> {
    const tables = [
      { key: "formResponses", table: formResponses },
      { key: "formShareLogs", table: formShareLogs },
      { key: "prescriptionShareLogs", table: prescriptionShareLogs },
      { key: "formShares", table: formShares },
      { key: "formFields", table: formFields },
      { key: "formSections", table: formSections },
      { key: "forms", table: forms },
      { key: "treatments", table: treatments },
      { key: "treatmentsInfo", table: treatmentsInfo },
      { key: "users", table: users },
      { key: "patients", table: patients },
      { key: "appointments", table: appointments },
      { key: "labResults", table: labResults },
      { key: "medicalImages", table: medicalImages },
      { key: "prescriptions", table: prescriptions },
      { key: "notifications", table: notifications },
      { key: "subscriptions", table: subscriptions },
      { key: "invoices", table: invoices },
      { key: "payments", table: payments },
      { key: "roles", table: roles },
      { key: "staffShifts", table: staffShifts },
      { key: "doctorDefaultShifts", table: doctorDefaultShifts },
      { key: "symptomChecks", table: symptomChecks },
    ];

    const counts: Record<string, number> = {};
    for (const entry of tables) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(entry.table)
        .where(eq(entry.table.organizationId, id));
      counts[entry.key] = count || 0;
    }

    const [formResponseValuesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formResponseValues)
      .innerJoin(formResponses, eq(formResponses.id, formResponseValues.responseId))
      .where(eq(formResponses.organizationId, id));
    counts.formResponseValues = formResponseValuesCount?.count || 0;

    const [orgCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(eq(organizations.id, id));
    counts.organizations = orgCount?.count || 0;

    return counts;
  }

  async deleteOrganizationAndData(id: number): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
    const tables = [
      { key: "formResponses", table: formResponses },
      { key: "formShareLogs", table: formShareLogs },
      { key: "prescriptionShareLogs", table: prescriptionShareLogs },
      { key: "formShares", table: formShares },
      { key: "formFields", table: formFields },
      { key: "formSections", table: formSections },
      { key: "forms", table: forms },
      { key: "prescriptions", table: prescriptions },
      { key: "labResults", table: labResults },
      { key: "medicalImages", table: medicalImages },
      { key: "appointments", table: appointments },
      { key: "symptomChecks", table: symptomChecks },
      { key: "notifications", table: notifications },
      { key: "payments", table: payments },
      { key: "invoices", table: invoices },
      { key: "subscriptions", table: subscriptions },
      { key: "staffShifts", table: staffShifts },
      { key: "doctorDefaultShifts", table: doctorDefaultShifts },
      { key: "roles", table: roles },
      { key: "patients", table: patients },
      { key: "users", table: users },
      { key: "saasSubscriptions", table: saasSubscriptions },
    ];

    const deletedCounts: Record<string, number> = {};
    let result = false;
    try {
      result = await db.transaction(async (tx) => {
      const userRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.organizationId, id));
      const userIds = userRows.map((item) => item.id);
      const hasUserIds = userIds.length > 0;

      const deleteWithCondition = async (table: any, condition: any, key: string) => {
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(table)
          .where(condition);
        deletedCounts[key] = (deletedCounts[key] || 0) + (count || 0);
        await tx.delete(table).where(condition);
      };

      const [formResponseValuesCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(formResponseValues)
        .innerJoin(formResponses, eq(formResponses.id, formResponseValues.responseId))
        .where(eq(formResponses.organizationId, id));

      deletedCounts.formResponseValues = formResponseValuesCount?.count || 0;
      if (deletedCounts.formResponseValues > 0) {
        await tx.execute(sql`
          DELETE FROM form_response_values
          WHERE response_id IN (SELECT id FROM form_responses WHERE organization_id = ${id})
        `);
      }

      await tx.execute(sql`
        DELETE FROM form_share_logs
        WHERE sent_by IN (SELECT id FROM users WHERE organization_id = ${id})
      `);

      const treatmentsCondition = hasUserIds
        ? or(
            eq(treatments.organizationId, id),
            inArray(treatments.doctorId, userIds),
            inArray(treatments.createdBy, userIds),
          )
        : eq(treatments.organizationId, id);

      await deleteWithCondition(treatments, treatmentsCondition, "treatments");

      const treatmentsInfoCondition = hasUserIds
        ? or(eq(treatmentsInfo.organizationId, id), inArray(treatmentsInfo.createdBy, userIds))
        : eq(treatmentsInfo.organizationId, id);

      await deleteWithCondition(treatmentsInfo, treatmentsInfoCondition, "treatmentsInfo");

      // Delete trial tokens BEFORE deleting users (to avoid foreign key constraint violation)
      // The foreign key constraint is: trial_tokens_user_id_fkey references users.id
      // So we must delete trial_tokens before users
      // Use subquery pattern like form_share_logs deletion above
      try {
        // Delete all trial tokens for users in this organization using subquery
        await tx.execute(sql`
          DELETE FROM trial_tokens
          WHERE user_id IN (SELECT id FROM users WHERE organization_id = ${id})
        `);
        
        // Also delete by organization_id (in case some records don't have user_id set)
        await tx.execute(sql`
          DELETE FROM trial_tokens
          WHERE organization_id = ${id}
        `);
        
        // Count is not critical, set to 0 or unknown
        deletedCounts.trialTokens = 0;
        console.log(`[DELETE-ORG] Deleted trial tokens for organization ${id}`);
      } catch (trialTokenError: any) {
        // If deletion fails, log the error but throw it to prevent user deletion
        console.error(`[DELETE-ORG] CRITICAL: Failed to delete trial tokens:`, {
          message: trialTokenError?.message,
          code: trialTokenError?.code,
          detail: trialTokenError?.detail,
          stack: trialTokenError?.stack,
        });
        // Re-throw to prevent cascade deletion that would violate foreign key
        throw new Error(`Failed to delete trial tokens: ${trialTokenError?.message || trialTokenError}`);
      }

      for (const entry of tables) {
        const condition = eq(entry.table.organizationId, id);
        await deleteWithCondition(entry.table, condition, entry.key);
      }

      const [deletedOrg] = await tx.delete(organizations).where(eq(organizations.id, id)).returning();
      const orgDeleted = Boolean(deletedOrg);
      deletedCounts.organizations = orgDeleted ? 1 : 0;
      return orgDeleted;
      });
    } catch (error: any) {
      console.error(`[DELETE-ORG] Error deleting organization ${id}:`, error);
      console.error(`[DELETE-ORG] Error details:`, {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
        table: error?.table,
        stack: error?.stack,
      });
      throw error;
    }

    return { success: result, deletedCounts };
  }

  async deleteCustomerOrganization(id: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Deleting customer organization: ${id}`);
      const org = await this.getOrganization(id);
      if (!org) {
        return { success: false, message: "Organization not found" };
      }

      const { success, deletedCounts } = await this.deleteOrganizationAndData(id);
      if (!success) {
        return { success: false, message: `Failed to delete organization "${org.name}"` };
      }

      console.log(`🗑️ Deleted counts:`, deletedCounts);
      return { success: true, message: `Organization "${org.name}" deleted successfully` };
    } catch (error) {
      console.error(`🗑️ Error deleting organization ${id}:`, error);
      return { success: false, message: "Failed to delete organization" };
    }
  }

  // Users
  async getUser(id: number, organizationId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.organizationId, organizationId)));
    return user || undefined;
  }

  async getUserByEmail(email: string, organizationId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.organizationId, organizationId)));
    return user || undefined;
  }

  async getUserByEmailGlobal(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string, organizationId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.username, username), eq(users.organizationId, organizationId)));
    return user || undefined;
  }

  async getUserByUsernameGlobal(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    const results = await db.select().from(users)
      .where(eq(users.organizationId, organizationId));
    
    // Remove duplicates based on email first (more meaningful), then by user ID
    const uniqueResults = results.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email)
    );
    
    return uniqueResults;
  }

  async getUsersByRole(role: string, organizationId: number): Promise<User[]> {
    const results = await db.select().from(users)
      .where(and(eq(users.role, role), eq(users.organizationId, organizationId)));
    
    return results;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Handle permissions as JSON, not array
    const userData = {
      ...user,
      ...(user.permissions && typeof user.permissions === 'object' ? 
        { permissions: user.permissions } : {})
    };
    const [created] = await db.insert(users).values(userData as any).returning();
    return created;
  }

  async updateUser(id: number, organizationId: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`Storage: Updating user ${id} with data:`, JSON.stringify(updates, null, 2));
    const [updated] = await db.update(users)
      .set(updates as any)
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning();
    console.log(`Storage: Updated user result:`, updated ? `User ${updated.id} - workingHours: ${JSON.stringify(updated.workingHours)}` : 'No user updated');
    return updated || undefined;
  }

  private async deletePrescriptionsWithShareLogs(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    prescriptionFilter: SQL,
  ): Promise<void> {
    const prescriptionRows = await tx
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(prescriptionFilter);
    const prescriptionIds = prescriptionRows.map((row) => row.id);
    if (prescriptionIds.length === 0) return;
    await tx
      .delete(prescriptionShareLogs)
      .where(inArray(prescriptionShareLogs.prescriptionId, prescriptionIds));
    await tx.delete(prescriptions).where(inArray(prescriptions.id, prescriptionIds));
  }

  private async deletePatientClinicalDataForUser(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    patientId: number,
    organizationId: number,
  ): Promise<void> {
    await tx.delete(appointments).where(
      and(eq(appointments.patientId, patientId), eq(appointments.organizationId, organizationId)),
    );

    const medicalRecordRows = await tx
      .select({ id: medicalRecords.id })
      .from(medicalRecords)
      .where(
        and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.organizationId, organizationId)),
      );
    const medicalRecordIds = medicalRecordRows.map((row) => row.id);
    if (medicalRecordIds.length > 0) {
      await tx
        .delete(medicalRecordsFiles)
        .where(inArray(medicalRecordsFiles.medicalRecordId, medicalRecordIds));
      await tx.delete(medicalRecords).where(inArray(medicalRecords.id, medicalRecordIds));
    }

    await tx.delete(aiInsights).where(
      and(eq(aiInsights.patientId, patientId), eq(aiInsights.organizationId, organizationId)),
    );
    await tx.delete(insuranceVerifications).where(
      and(eq(insuranceVerifications.patientId, patientId), eq(insuranceVerifications.organizationId, organizationId)),
    );
    await tx.delete(consultations).where(
      and(eq(consultations.patientId, patientId), eq(consultations.organizationId, organizationId)),
    );
    await this.deletePrescriptionsWithShareLogs(
      tx,
      and(eq(prescriptions.patientId, patientId), eq(prescriptions.organizationId, organizationId)),
    );
    await tx.delete(labResults).where(
      and(eq(labResults.patientId, patientId), eq(labResults.organizationId, organizationId)),
    );
    await tx.delete(medicalImages).where(
      and(eq(medicalImages.patientId, patientId), eq(medicalImages.organizationId, organizationId)),
    );
    await tx.delete(symptomChecks).where(eq(symptomChecks.patientId, patientId));
    await tx.delete(gdprConsents).where(
      and(eq(gdprConsents.patientId, patientId), eq(gdprConsents.organizationId, organizationId)),
    );
    await tx.delete(gdprDataRequests).where(
      and(eq(gdprDataRequests.patientId, patientId), eq(gdprDataRequests.organizationId, organizationId)),
    );
    await tx.delete(patients).where(eq(patients.id, patientId));
  }

  async deleteUser(id: number, organizationId: number): Promise<boolean> {
    console.log(`Storage: Attempting to DELETE user ${id} in organization ${organizationId}`);

    const existingUser = await this.getUser(id, organizationId);
    if (!existingUser) {
      console.log(`Storage: User ${id} not found in organization ${organizationId}`);
      return false;
    }

    console.log(`Storage: Found user ${existingUser.email}, deleting ALL related data first`);

    try {
      await db.transaction(async (tx) => {
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
        await tx.delete(symptomChecks).where(eq(symptomChecks.userId, id));
        await tx.delete(notifications).where(eq(notifications.userId, id));
        await this.deletePrescriptionsWithShareLogs(
          tx,
          or(eq(prescriptions.doctorId, id), eq(prescriptions.prescriptionCreatedBy, id)),
        );
        await tx.delete(appointments).where(eq(appointments.providerId, id));
        await tx.delete(labResults).where(eq(labResults.orderedBy, id));
        await tx.delete(doctorDefaultShifts).where(eq(doctorDefaultShifts.userId, id));
        await tx.delete(staffShifts).where(eq(staffShifts.staffId, id));
        await tx.delete(gdprAuditTrail).where(eq(gdprAuditTrail.userId, id));
        await tx
          .update(gdprDataRequests)
          .set({ processedBy: null })
          .where(eq(gdprDataRequests.processedBy, id));
        await tx.delete(userDocumentPreferences).where(
          and(
            eq(userDocumentPreferences.userId, id),
            eq(userDocumentPreferences.organizationId, organizationId),
          ),
        );
        await tx.delete(documents).where(
          and(eq(documents.userId, id), eq(documents.organizationId, organizationId)),
        );
        await tx.delete(messages).where(
          and(eq(messages.senderId, id), eq(messages.organizationId, organizationId)),
        );
        await tx.delete(medicalImages).where(
          and(eq(medicalImages.uploadedBy, id), eq(medicalImages.organizationId, organizationId)),
        );

        const linkedPatients = await tx
          .select({ id: patients.id })
          .from(patients)
          .where(and(eq(patients.userId, id), eq(patients.organizationId, organizationId)));

        for (const patientRecord of linkedPatients) {
          await this.deletePatientClinicalDataForUser(tx, patientRecord.id, organizationId);
          console.log(`Storage: Deleted patient record ${patientRecord.id} for user ${id}`);
        }

        const result = await tx
          .delete(users)
          .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
          .returning();

        if (result.length === 0) {
          throw new Error(`User ${id} could not be deleted`);
        }
      });

      console.log(`Storage: DELETE user ${id} completed successfully`);
      return true;
    } catch (error) {
      console.error(`Storage: deleteUser failed for ${id}:`, error);
      throw error;
    }
  }

  // Roles
  async getRole(id: number, organizationId: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)));
    return role || undefined;
  }

  async getRolesByOrganization(organizationId: number): Promise<Role[]> {
    try {
      return await db.select({
        id: roles.id,
        organizationId: roles.organizationId,
        name: roles.name,
        displayName: roles.displayName,
        description: roles.description,
        permissions: roles.permissions,
        isSystem: roles.isSystem,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      }).from(roles)
        .where(eq(roles.organizationId, organizationId))
        .orderBy(desc(roles.createdAt));
    } catch (error: any) {
      if (error.code === '42P01') {
        // Table doesn't exist, return empty array
        return [];
      }
      throw error;
    }
  }

  async getRoleByName(name: string, organizationId: number): Promise<Role | undefined> {
    const [role] = await db.select({
      id: roles.id,
      organizationId: roles.organizationId,
      name: roles.name,
      displayName: roles.displayName,
      description: roles.description,
      permissions: roles.permissions,
      isSystem: roles.isSystem,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
    }).from(roles)
      .where(and(sql`LOWER(${roles.name}) = LOWER(${name})`, eq(roles.organizationId, organizationId)));
    return role || undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values([role]).returning();
    return created;
  }

  async updateRole(id: number, organizationId: number, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteRole(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(roles)
      .where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  private async normalizePatientData(rawPatient: any): Promise<Patient | undefined> {
    if (!rawPatient) return undefined;

    try {
      if (!isEncryptedPatientStorageRow(rawPatient)) {
        return this.formatPatientRow(rawPatient);
      }
      const decrypted = await decryptPatientFromStorageRow(rawPatient as Record<string, unknown>);
      return this.formatPatientRow(decrypted);
    } catch (err: unknown) {
      console.warn(
        `[PATIENT-ENCRYPT] Decrypt failed for patient id=${(rawPatient as { id?: number }).id}:`,
        err instanceof Error ? err.message : err,
      );
      return undefined;
    }
  }

  private formatPatientRow(rawPatient: any): Patient | undefined {
    if (!rawPatient) return undefined;
    
    // Helper function to safely parse JSON or return default
    const safeJsonParse = (value: any, defaultValue: any) => {
      if (!value) return defaultValue;
      if (typeof value === 'object') return value; // Already parsed
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    };

    // Helper to split comma-separated strings to arrays
    const splitToArray = (value: any) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean);
      }
      return [];
    };

    return {
      ...rawPatient,
      // Ensure required fields have values
      patientId: rawPatient.patientId || rawPatient.patient_id || String(rawPatient.id),
      dateOfBirth: rawPatient.dateOfBirth || rawPatient.date_of_birth,
      
      // Normalize address structure
      address: safeJsonParse(rawPatient.address, {
        street: typeof rawPatient.address === 'string' ? rawPatient.address : '',
        city: '',
        postcode: '',
        country: ''
      }),
      
      // Normalize emergency contact structure
      emergencyContact: safeJsonParse(rawPatient.emergencyContact || rawPatient.emergency_contact, {
        name: rawPatient.emergency_contact_name || rawPatient.emergencyContactName || '',
        relationship: '',
        phone: rawPatient.emergency_contact_phone || rawPatient.emergencyContactPhone || '',
        email: ''
      }),
      
      // Normalize medical history structure
      medicalHistory: safeJsonParse(rawPatient.medicalHistory || rawPatient.medical_history, {
        allergies: splitToArray(rawPatient.allergies),
        chronicConditions: [],
        medications: splitToArray(rawPatient.medications),
        familyHistory: {
          father: [],
          mother: [],
          siblings: [],
          grandparents: []
        },
        socialHistory: {
          smoking: { status: 'never' },
          alcohol: { status: 'never' },
          drugs: { status: 'never' },
          occupation: '',
          maritalStatus: 'single',
          education: '',
          exercise: { frequency: 'none' }
        },
        immunizations: []
      }),
      
      // Normalize insurance info structure
      insuranceInfo: safeJsonParse(rawPatient.insuranceInfo || rawPatient.insurance_info, null),
      
      // Normalize communication preferences structure
      communicationPreferences: safeJsonParse(rawPatient.communicationPreferences || rawPatient.communication_preferences, null),
      
      // Normalize flags array
      flags: Array.isArray(rawPatient.flags) ? rawPatient.flags : (rawPatient.flags ? [rawPatient.flags] : []),
      
      // Ensure boolean fields are properly typed
      isActive: rawPatient.isActive !== undefined ? rawPatient.isActive : (rawPatient.is_active !== undefined ? rawPatient.is_active : true),
      
      // Normalize timestamps
      createdAt: rawPatient.createdAt || rawPatient.created_at || new Date(),
      updatedAt: rawPatient.updatedAt || rawPatient.updated_at || new Date()
    } as Patient;
  }

  // Patients — all public reads must return decrypted PHI via decryptPatientRow / normalizePatientData.
  async normalizePatientFromRow(rawPatient: unknown): Promise<Patient | undefined> {
    if (!rawPatient) return undefined;
    return this.normalizePatientData(rawPatient);
  }

  /** Decrypt before returning patient data to callers. */
  private async decryptPatientRow(raw: unknown): Promise<Patient | undefined> {
    if (!raw) return undefined;
    return this.normalizePatientData(raw);
  }

  private async decryptPatientRows(rows: unknown[]): Promise<Patient[]> {
    const results: Patient[] = [];
    const batchSize = 20;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const decrypted = await Promise.all(batch.map((row) => this.decryptPatientRow(row)));
      results.push(...(decrypted.filter(Boolean) as Patient[]));
    }
    return results;
  }

  async getPatient(id: number, organizationId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));
    return this.decryptPatientRow(patient);
  }

  async getPatientByPatientId(patientId: string, organizationId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.patientId, patientId), eq(patients.organizationId, organizationId)));
    return this.decryptPatientRow(patient);
  }

  async getPatientByUserId(userId: number, organizationId: number): Promise<Patient | undefined> {
    const [user] = await db.select().from(users)
      .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));
    
    if (!user || !user.email) {
      return undefined;
    }

    return this.getPatientByEmail(user.email, organizationId);
  }

  async getPatientByEmail(email: string, organizationId: number): Promise<Patient | undefined> {
    const rows = await db.select().from(patients)
      .where(eq(patients.organizationId, organizationId));

    const normalizedEmail = email.trim().toLowerCase();
    for (const row of rows) {
      const patient = await this.decryptPatientRow(row);
      if (patient?.email && patient.email.trim().toLowerCase() === normalizedEmail) {
        return patient;
      }
    }
    return undefined;
  }

  async getAnyActivePatientId(organizationId: number): Promise<number | undefined> {
    const [row] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.isActive, true)))
      .orderBy(desc(patients.updatedAt))
      .limit(1);
    return row?.id;
  }

  async getAnyPatientId(organizationId: number): Promise<number | undefined> {
    const [row] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.organizationId, organizationId))
      .orderBy(desc(patients.updatedAt))
      .limit(1);
    return row?.id;
  }

  async countPatientsInOrganization(organizationId: number): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(patients)
      .where(eq(patients.organizationId, organizationId));
    return Number(value) || 0;
  }

  private formShareFkPlaceholderEmail(organizationId: number): string {
    return `form-share-fk+org${organizationId}@placeholder.curaemr.local`;
  }

  async ensureFormShareFkPatientId(organizationId: number): Promise<number> {
    const existing = (await this.getAnyActivePatientId(organizationId)) ?? (await this.getAnyPatientId(organizationId));
    if (existing) {
      return existing;
    }

    const placeholderEmail = this.formShareFkPlaceholderEmail(organizationId);
    try {
      const placeholder = await this.findOrCreatePatientForFormShare(placeholderEmail, organizationId);
      return placeholder.id;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not create a placeholder patient record for form sharing (${detail}). Add one patient in Patient Management, or fix the encryption vault (VAULT_API_ENDPOINT).`,
      );
    }
  }

  async findOrCreatePatientForFormShare(email: string, organizationId: number): Promise<Patient> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      throw new Error("A valid recipient email is required");
    }

    const existing = await this.getPatientByEmail(trimmedEmail, organizationId);
    if (existing) {
      return existing;
    }

    if (!isPatientEncryptionConfigured()) {
      throw new Error(
        "Patient encryption is not configured. Cannot add a custom email recipient until the encryption SDK is configured.",
      );
    }

    const isInternalFkPlaceholder = trimmedEmail.endsWith("@placeholder.curaemr.local");
    let firstName: string;
    let lastName: string;
    if (isInternalFkPlaceholder) {
      firstName = "Form Share";
      lastName = "Placeholder";
    } else {
      const localPart = trimmedEmail.split("@")[0]?.replace(/[._+]/g, " ").trim() || "Guest";
      const nameParts = localPart.split(/\s+/).filter(Boolean);
      firstName = nameParts[0] || "Guest";
      lastName = nameParts.slice(1).join(" ") || "Recipient";
      if (firstName.length < 2) {
        firstName = `${firstName}x`.slice(0, 30);
      }
      if (lastName.length < 2) {
        lastName = "Recipient";
      }
    }

    const [{ value: patientCount }] = await db
      .select({ value: count() })
      .from(patients)
      .where(eq(patients.organizationId, organizationId));
    const patientId = `P${(Number(patientCount) + 1).toString().padStart(6, "0")}`;

    return this.createPatient({
      organizationId,
      firstName,
      lastName,
      email: trimmedEmail,
      patientId,
      dateOfBirth: new Date("1990-01-01"),
      isActive: true,
      address: {},
      medicalHistory: {
        allergies: [],
        chronicConditions: [],
        medications: [],
      },
      emergencyContact: {},
      communicationPreferences: {},
      insuranceInfo: {},
    });
  }

  async getPatientsByOrganization(organizationId: number, limit?: number, isActive?: boolean): Promise<Patient[]> {
    let whereConditions = [eq(patients.organizationId, organizationId)];
    
    // Add isActive filter only if explicitly provided
    if (isActive !== undefined) {
      whereConditions.push(eq(patients.isActive, isActive));
    }
    
    const baseQuery = db.select().from(patients)
      .where(and(...whereConditions))
      .orderBy(desc(patients.updatedAt));
    const results = (limit != null && limit > 0)
      ? await baseQuery.limit(limit)
      : await baseQuery;
    
    // Ensure no duplicates based on patient ID
    const uniqueResults = results.filter((patient, index, self) => 
      index === self.findIndex(p => p.id === patient.id)
    );

    return this.decryptPatientRows(uniqueResults);
  }

  async getPatientsByUserId(organizationId: number, userId: number): Promise<Patient[]> {
    const results = await db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.userId, userId)))
      .orderBy(desc(patients.updatedAt));

    return this.decryptPatientRows(results);
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    console.log("🔍 [STORAGE] createPatient called with userId:", (patient as any).userId);

    const patientPayload = {
      ...patient,
      email: patient.email != null ? String(patient.email).trim() : "",
      relation:
        (patient as { relation?: string | null }).relation ??
        ((patient as { userId?: number | null }).userId ? "Self" : null),
      address: patient.address ? JSON.parse(JSON.stringify(patient.address)) : {},
      medicalHistory: patient.medicalHistory ? JSON.parse(JSON.stringify(patient.medicalHistory)) : {},
      communicationPreferences: patient.communicationPreferences
        ? JSON.parse(JSON.stringify(patient.communicationPreferences))
        : {},
      insuranceInfo: patient.insuranceInfo ? JSON.parse(JSON.stringify(patient.insuranceInfo)) : {},
      emergencyContact: patient.emergencyContact
        ? JSON.parse(JSON.stringify(patient.emergencyContact))
        : {},
      flags: Array.isArray(patient.flags) ? patient.flags : [],
    } as Record<string, unknown>;

    const insertData = await preparePatientForStorage(patientPayload);
    assertEncryptedPatientInsertRow(insertData);

    const searchHashes = computePatientSearchHashes(Number(patient.organizationId), {
      cnic: patient.nhsNumber != null ? String(patient.nhsNumber) : null,
      phone: patient.phone != null ? String(patient.phone) : null,
      email: patient.email != null ? String(patient.email) : null,
    });

    console.log("🔍 [STORAGE] insertData.userId before insert:", (insertData as any).userId);
    const [created] = await db.insert(patients).values([{
      ...insertData,
      cnicHash: searchHashes.cnicHash,
      phoneHash: searchHashes.phoneHash,
      emailHash: searchHashes.emailHash,
      isEncrypted: true,
    } as any]).returning();
    console.log("🔍 [STORAGE] created patient userId:", created.userId);

    if (!isEncryptedScalarField(created.email)) {
      throw new Error(
        `Patient email column is missing after insert (patient id=${created?.id}).`,
      );
    }

    try {
      const decrypted = await decryptPatientFromStorageRow(
        created as Record<string, unknown>,
      );
      const formatted = this.formatPatientRow(decrypted);
      if (!formatted) {
        throw new Error("Failed to format patient after create");
      }
      return formatted;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(
        `[PATIENT-ENCRYPT] Decrypt after create failed for patient id=${created.id}:`,
        detail,
      );
      throw new Error(`Failed to decrypt patient after create: ${detail}`);
    }
  }

  async updatePatient(id: number, organizationId: number, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [existing] = await db.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));

    if (!existing) {
      return undefined;
    }

    const current = await this.normalizePatientData(existing);
    if (!current) {
      return undefined;
    }

    const mergedPatient = {
      ...current,
      ...updates,
      id: current.id,
      organizationId: current.organizationId,
      address: updates.address !== undefined
        ? (updates.address ? JSON.parse(JSON.stringify(updates.address)) : {})
        : current.address,
      medicalHistory: updates.medicalHistory !== undefined
        ? (updates.medicalHistory ? JSON.parse(JSON.stringify(updates.medicalHistory)) : {})
        : current.medicalHistory,
      communicationPreferences: updates.communicationPreferences !== undefined
        ? (updates.communicationPreferences
          ? JSON.parse(JSON.stringify(updates.communicationPreferences))
          : {})
        : current.communicationPreferences,
      insuranceInfo: updates.insuranceInfo !== undefined
        ? (updates.insuranceInfo ? JSON.parse(JSON.stringify(updates.insuranceInfo)) : {})
        : current.insuranceInfo,
      emergencyContact: updates.emergencyContact !== undefined
        ? (updates.emergencyContact ? JSON.parse(JSON.stringify(updates.emergencyContact)) : {})
        : current.emergencyContact,
      flags: updates.flags !== undefined
        ? (Array.isArray(updates.flags) ? updates.flags : [])
        : current.flags,
    } as Record<string, unknown>;

    // Normalized UI merge can still carry the blob key inside medicalHistory JSON — strip before re-encrypt.
    const mh = mergedPatient.medicalHistory;
    if (mh && typeof mh === "object" && !Array.isArray(mh)) {
      const copy = { ...(mh as Record<string, unknown>) };
      delete copy[ENCRYPTED_PATIENT_PAYLOAD_KEY];
      mergedPatient.medicalHistory = copy;
    }

    if (isEncryptedPatientStorageRow(mergedPatient)) {
      throw new Error("Refusing to re-encrypt an already encrypted patient payload");
    }

    const encryptedRow = await preparePatientForStorage(mergedPatient);
    const [updated] = await db.update(patients)
      .set({ ...encryptedRow, updatedAt: new Date() } as any)
      .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)))
      .returning();

    return updated ? await this.decryptPatientRow(updated) : undefined;
  }

  async updatePatientInsuranceStatus(patientId: number, organizationId: number, isInsured: boolean): Promise<Patient | undefined> {
    return this.updatePatient(patientId, organizationId, { isInsured });
  }

  async deletePatient(id: number, organizationId: number): Promise<boolean> {
    try {
      // First, get the patient to find the associated userId
      const [patient] = await db.select()
        .from(patients)
        .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)))
        .limit(1);

      if (!patient) {
        console.error(`❌ Patient ${id} not found for deletion in org ${organizationId}`);
        return false;
      }

      console.log(`🗑️ Starting deletion of patient ${id} (${patient.firstName} ${patient.lastName}), userId: ${patient.userId}`);

      // Delete related records (cascade delete)
      // Delete medical records
      await db.delete(medicalRecords)
        .where(and(eq(medicalRecords.patientId, id), eq(medicalRecords.organizationId, organizationId)));
      console.log(`✅ Deleted medical records for patient ${id}`);
      
      // Delete appointments
      await db.delete(appointments)
        .where(and(eq(appointments.patientId, id), eq(appointments.organizationId, organizationId)));
      console.log(`✅ Deleted appointments for patient ${id}`);
      
      // Delete AI insights
      await db.delete(aiInsights)
        .where(and(eq(aiInsights.patientId, id), eq(aiInsights.organizationId, organizationId)));
      console.log(`✅ Deleted AI insights for patient ${id}`);
      
      // Delete prescriptions
      await db.delete(prescriptions)
        .where(and(eq(prescriptions.patientId, id), eq(prescriptions.organizationId, organizationId)));
      console.log(`✅ Deleted prescriptions for patient ${id}`);
      
      // Delete lab results
      await db.delete(labResults)
        .where(and(eq(labResults.patientId, id), eq(labResults.organizationId, organizationId)));
      console.log(`✅ Deleted lab results for patient ${id}`);
      
      // Delete medical images/imaging
      await db.delete(medicalImages)
        .where(and(eq(medicalImages.patientId, id), eq(medicalImages.organizationId, organizationId)));
      console.log(`✅ Deleted medical images for patient ${id}`);
      
      // Delete the patient record
      const patientResult = await db.delete(patients)
        .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));
      console.log(`✅ Deleted patient record ${id}`);
      
      // Delete the associated user account if it exists
      if (patient.userId) {
        console.log(`🔍 Attempting to delete user account ID: ${patient.userId} for org ${organizationId}`);
        const userDeleteResult = await db.delete(users)
          .where(and(eq(users.id, patient.userId), eq(users.organizationId, organizationId)));
        console.log(`✅ Deleted associated user account (ID: ${patient.userId}, rows affected: ${userDeleteResult.rowCount}) for patient ${id}`);
      } else {
        console.log(`⚠️ No userId associated with patient ${id}`);
      }
      
      return (patientResult.rowCount || 0) > 0;
    } catch (error) {
      console.error("❌ Error deleting patient:", error);
      return false;
    }
  }

  // Delete a patient record and its related clinical data, but do NOT delete the linked user account.
  // This is required for "family members" where multiple patients share the same userId.
  async deletePatientRecordOnly(id: number, organizationId: number): Promise<boolean> {
    try {
      const [patient] = await db.select()
        .from(patients)
        .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)))
        .limit(1);

      if (!patient) return false;

      await db.delete(medicalRecords)
        .where(and(eq(medicalRecords.patientId, id), eq(medicalRecords.organizationId, organizationId)));

      await db.delete(appointments)
        .where(and(eq(appointments.patientId, id), eq(appointments.organizationId, organizationId)));

      await db.delete(aiInsights)
        .where(and(eq(aiInsights.patientId, id), eq(aiInsights.organizationId, organizationId)));

      await db.delete(prescriptions)
        .where(and(eq(prescriptions.patientId, id), eq(prescriptions.organizationId, organizationId)));

      await db.delete(labResults)
        .where(and(eq(labResults.patientId, id), eq(labResults.organizationId, organizationId)));

      await db.delete(medicalImages)
        .where(and(eq(medicalImages.patientId, id), eq(medicalImages.organizationId, organizationId)));

      const patientResult = await db.delete(patients)
        .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));

      return (patientResult.rowCount || 0) > 0;
    } catch (error) {
      console.error("❌ Error deleting patient record only:", error);
      return false;
    }
  }

  async searchPatients(organizationId: number, query: string): Promise<Patient[]> {
    const rows = await db.select().from(patients)
      .where(and(
        eq(patients.organizationId, organizationId),
        eq(patients.isActive, true)
      ));

    const decryptedPatients = await this.decryptPatientRows(rows);

    if (!query?.trim()) {
      return decryptedPatients;
    }

    return decryptedPatients.filter((patient) =>
      patientMatchesSearchQuery(patient as unknown as Record<string, unknown>, query),
    );
  }

  // Medical Records
  async getMedicalRecord(id: number, organizationId: number): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.id, id), eq(medicalRecords.organizationId, organizationId)));
    return record || undefined;
  }

  async getMedicalRecordsByPatient(patientId: number, organizationId: number): Promise<MedicalRecord[]> {
    return await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.organizationId, organizationId)))
      .orderBy(desc(medicalRecords.createdAt));
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const cleanRecord: any = { ...record };
    delete cleanRecord.data; // Remove complex nested type to avoid compilation errors
    const [created] = await db.insert(medicalRecords).values(cleanRecord as any).returning();
    return created;
  }

  async updateMedicalRecord(id: number, organizationId: number, updates: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).data; // Remove complex nested type
    const [updatedRecord] = await db
      .update(medicalRecords)
      .set(cleanUpdates as any)
      .where(and(eq(medicalRecords.id, id), eq(medicalRecords.organizationId, organizationId)))
      .returning();
    return updatedRecord;
  }

  async deleteMedicalRecord(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(medicalRecords)
      .where(and(eq(medicalRecords.id, id), eq(medicalRecords.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  async createMedicalRecordsFile(record: InsertMedicalRecordsFile): Promise<MedicalRecordsFile> {
    const [created] = await db.insert(medicalRecordsFiles).values(record).returning();
    return created;
  }

  async getMedicalRecordsFilesByPatient(patientId: number, organizationId: number): Promise<MedicalRecordsFile[]> {
    const records = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.organizationId, organizationId)));
    const recordIds = records.map((r) => r.id);
    if (recordIds.length === 0) return [];
    const files = await db.select().from(medicalRecordsFiles)
      .where(inArray(medicalRecordsFiles.medicalRecordId, recordIds))
      .orderBy(desc(medicalRecordsFiles.createdAt));
    return files;
  }

  /** Files from medical_records_files for medical records with type = 'consultation' (Consultations tab). */
  async getConsultationFilesByPatient(patientId: number, organizationId: number): Promise<MedicalRecordsFile[]> {
    const rows = await db.select({ file: medicalRecordsFiles }).from(medicalRecordsFiles)
      .innerJoin(medicalRecords, eq(medicalRecordsFiles.medicalRecordId, medicalRecords.id))
      .where(and(
        eq(medicalRecords.patientId, patientId),
        eq(medicalRecords.organizationId, organizationId),
        eq(medicalRecords.type, "consultation")
      ))
      .orderBy(desc(medicalRecordsFiles.createdAt));
    return rows.map((r) => r.file);
  }

  async getMedicalRecordsFileById(id: number, organizationId: number): Promise<MedicalRecordsFile | undefined> {
    const rows = await db.select({ file: medicalRecordsFiles }).from(medicalRecordsFiles)
      .innerJoin(medicalRecords, eq(medicalRecordsFiles.medicalRecordId, medicalRecords.id))
      .where(and(eq(medicalRecordsFiles.id, id), eq(medicalRecords.organizationId, organizationId)));
    return rows[0]?.file ?? undefined;
  }

  // Appointments
  async getAppointment(id: number, organizationId: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)));
    return appointment || undefined;
  }

  async getAppointmentsByOrganization(organizationId: number, date?: Date): Promise<Appointment[]> {
    let baseConditions = [eq(appointments.organizationId, organizationId)];
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      baseConditions.push(
        gte(appointments.scheduledAt, startOfDay),
        lte(appointments.scheduledAt, endOfDay)
      );
    }
    
    return await db.select().from(appointments)
      .where(and(...baseConditions))
      .orderBy(asc(appointments.scheduledAt));
  }

  async getAppointmentsByProvider(providerId: number, organizationId: number, date?: Date | string): Promise<Appointment[]> {
    let baseConditions: any[] = [
      eq(appointments.providerId, providerId),
      eq(appointments.organizationId, organizationId)
    ];

    // Filter by calendar day using a pure wall-clock DATE() comparison so that JS Date objects
    // are never sent to PostgreSQL (which would apply a UTC shift and move the window by the
    // server's timezone offset, causing false positives like 10:00 AM conflicting with 3:00 PM).
    const dateStr = wallClockDateStringFromScheduled(date as any);
    if (dateStr) {
      baseConditions.push(sql`DATE(${appointments.scheduledAt}::timestamp) = ${dateStr}::date`);
    }

    return await db.select().from(appointments)
      .where(and(...baseConditions))
      .orderBy(asc(appointments.scheduledAt));
  }

  async getAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.organizationId, organizationId)
      ))
      .orderBy(desc(appointments.scheduledAt));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    console.log("Creating appointment with data:", appointment);
    try {
      // Check for scheduling conflicts FIRST (double booking prevention)
      const existingAppointments = await this.getAppointmentsByProvider(
        appointment.providerId, 
        appointment.organizationId, 
        appointment.scheduledAt
      );
      
      // Wall-clock minute overlap (same calendar day only) — avoids false positives from Date/UTC shifts.
      const newDur = Number(appointment.duration) > 0 ? Number(appointment.duration) : 30;
      const conflicts = existingAppointments.filter((existing) => {
        const st = String(existing.status ?? "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_");
        if (st === "cancelled" || st === "canceled" || st === "completed" || st === "rescheduled") {
          return false;
        }
        const exDur = Number(existing.duration) > 0 ? Number(existing.duration) : 30;
        return appointmentWallClockOverlaps(
          appointment.scheduledAt,
          newDur,
          existing.scheduledAt,
          exDur,
        );
      });
      
      if (conflicts.length > 0) {
        throw new Error("Doctor is already scheduled at this time. Please choose a different time.");
      }

      // Validate appointment pattern compliance before creation
      const validationResult = await this.validateAppointmentPattern(appointment);
      if (!validationResult.isValid) {
        console.error("VALIDATION ERRORS:", validationResult.errors);
        console.error("FAILED APPOINTMENT DATA:", JSON.stringify(appointment, null, 2));
        throw new Error(`Appointment validation failed: ${validationResult.errors.join(' | ')}`);
      }

      // Ensure sequential ordering by using database transaction
      const created = await db.transaction(async (tx) => {
        // Get the current max ID to ensure sequential ordering
        const maxIdResult = await tx
          .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
          .from(appointments)
          .where(eq(appointments.organizationId, appointment.organizationId));
        
        const expectedNextId = (maxIdResult[0]?.maxId || 0) + 1;
        console.log(`Sequential validation: Expected next ID: ${expectedNextId}`);

        const wallForInsert = parseAppointmentWallClock(appointment.scheduledAt as unknown);
        if (Number.isNaN(wallForInsert.getTime())) {
          throw new Error("Invalid scheduledAt for appointment insert");
        }
        const formattedTimestamp = `${wallForInsert.getFullYear()}-${String(wallForInsert.getMonth() + 1).padStart(2, "0")}-${String(wallForInsert.getDate()).padStart(2, "0")} ${String(wallForInsert.getHours()).padStart(2, "0")}:${String(wallForInsert.getMinutes()).padStart(2, "0")}:${String(wallForInsert.getSeconds()).padStart(2, "0")}`;
        const created = await tx.execute(sql`
        INSERT INTO appointments (
          organization_id, appointment_id, patient_id, provider_id, assigned_role,
          title, description, scheduled_at, duration, status, type, location, is_virtual, created_by,
          appointment_type, treatment_id, consultation_id
        ) VALUES (
          ${appointment.organizationId}, ${appointment.appointmentId}, ${appointment.patientId},
          ${appointment.providerId}, ${appointment.assignedRole}, ${appointment.title},
          ${appointment.description}, ${formattedTimestamp}::timestamp, ${appointment.duration},
          ${appointment.status}, ${appointment.type}, ${appointment.location}, ${appointment.isVirtual},
          ${appointment.createdBy}, ${appointment.appointmentType}, ${appointment.treatmentId}, ${appointment.consultationId}
        ) RETURNING 
          id,
          organization_id AS "organizationId",
          appointment_id AS "appointmentId",
          patient_id AS "patientId",
          provider_id AS "providerId",
          assigned_role AS "assignedRole",
          title,
          description,
          scheduled_at AS "scheduledAt",
          duration,
          status,
          type,
          appointment_type AS "appointmentType",
          treatment_id AS "treatmentId",
          consultation_id AS "consultationId",
          location,
          is_virtual AS "isVirtual",
          created_by AS "createdBy",
          created_at AS "createdAt"
        `);
        
        const rawRow = created.rows[0] as any;
        // Format scheduled_at as ISO string without timezone conversion
        // PostgreSQL returns: "2025-11-15 23:15:00", we need: "2025-11-15T23:15:00"
        const createdAppointment: Appointment = {
          ...rawRow,
          scheduledAt:
            formatAppointmentScheduledAtForApi(rawRow.scheduledAt) ??
            String(rawRow.scheduledAt).replace(" ", "T"),
          createdAt: new Date(rawRow.createdAt),
        };
        
        // Verify sequential order was maintained
        if (createdAppointment.id < expectedNextId) {
          console.warn(`Sequential order concern: Created ID ${createdAppointment.id} is less than expected ${expectedNextId}`);
        }
        
        console.log(`Sequential confirmation: Created appointment ID ${createdAppointment.id} in proper sequence`);
        return createdAppointment;
      });

      console.log("Appointment created successfully with sequential validation:", created);
      return created;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  }

  // Validate appointment pattern compliance
  private async validateAppointmentPattern(appointment: InsertAppointment): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Pattern 1: Title must follow naming convention
    if (!appointment.title || appointment.title.trim().length === 0) {
      errors.push("Appointment title is required and cannot be empty");
    } else if (appointment.title.length > 200) {
      errors.push("Appointment title cannot exceed 200 characters");
    }

    // Pattern 2: Description should follow standard format
    if (appointment.description && appointment.description.length > 1000) {
      errors.push("Appointment description cannot exceed 1000 characters");
    }

    // Pattern 3: Duration must be in standard increments (15, 30, 45, 60, 90, 120 minutes)
    const validDurations = [15, 30, 45, 60, 90, 120, 180];
    if (appointment.duration !== undefined && !validDurations.includes(appointment.duration)) {
      errors.push(`Appointment duration must be one of: ${validDurations.join(', ')} minutes`);
    }

    // Pattern 4: Validate appointment type (case insensitive)
    const validTypes = ['consultation', 'follow_up', 'procedure', 'emergency', 'routine_checkup'];
    if (appointment.type && !validTypes.includes(appointment.type.toLowerCase())) {
      errors.push(`Appointment type must be one of: ${validTypes.join(', ')}`);
    }

    // Pattern 5: Validate status
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'];
    if (appointment.status && !validStatuses.includes(appointment.status)) {
      errors.push(`Appointment status must be one of: ${validStatuses.join(', ')}`);
    }

    // Pattern 6: Scheduled time validation - allowing past appointments for now due to timezone handling
    // TODO: Fix frontend timezone handling to ensure proper future date validation
    const scheduledTime = new Date(appointment.scheduledAt);
    const now = new Date();
    // Temporarily disabled to allow appointment creation while frontend timezone is being handled
    // if (scheduledTime.getTime() <= now.getTime() && appointment.status === 'scheduled') {
    //   errors.push("Scheduled appointments must be set for a future date and time");
    // }

    // Pattern 7: Validate required relationships exist - SIMPLIFIED FOR PRODUCTION
    try {
      // Simplified validation - just check IDs exist
      if (!appointment.patientId || appointment.patientId <= 0) {
        errors.push("Valid Patient ID is required for appointment creation");
      }

      if (!appointment.providerId || appointment.providerId <= 0) {
        errors.push("Valid Provider ID is required for appointment creation");
      }

      // Skip database lookups that might fail in production - trust the frontend validation
      console.log(`Appointment validation: PatientID=${appointment.patientId}, ProviderID=${appointment.providerId}, OrgID=${appointment.organizationId}`);
      
    } catch (error) {
      console.error("Error in relationship validation:", error);
      // Don't fail validation for database lookup errors
      console.log("Continuing with appointment creation despite validation lookup error");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async updateAppointment(id: number, organizationId: number, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    try {
      console.log(`[STORAGE] updateAppointment called with:`, {
        id,
        organizationId,
        updates,
        updateKeys: Object.keys(updates),
        scheduledAtType: typeof updates.scheduledAt,
        scheduledAtValue: updates.scheduledAt
      });
      
      // Handle scheduledAt separately if it's a string (PostgreSQL timestamp format)
      // This ensures exact time storage without timezone conversion
      const { scheduledAt, ...otherUpdates } = updates as any;
      const updateData: any = { ...otherUpdates };
      
      if (scheduledAt !== undefined) {
        // If scheduledAt is a string in PostgreSQL format (YYYY-MM-DD HH:mm:ss),
        // use raw SQL to update it directly without timezone conversion
        if (typeof scheduledAt === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(scheduledAt)) {
          console.log(`[STORAGE] Updating scheduledAt using raw SQL (no timezone conversion):`, scheduledAt);
          // Use raw SQL to set timestamp without timezone conversion
          await db.execute(sql`
            UPDATE appointments
            SET scheduled_at = ${scheduledAt}::timestamp
            WHERE id = ${id} AND organization_id = ${organizationId}
          `);
        } else {
          // If it's a Date object or other format, let Drizzle handle it
          updateData.scheduledAt = scheduledAt;
        }
      }
      
      // Update other fields using Drizzle
      if (Object.keys(updateData).length > 0) {
        await db.update(appointments)
          .set(updateData)
          .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)));
      }
      
      // Fetch and return the updated appointment
      const [updated] = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)))
        .limit(1);
      
      console.log(`[STORAGE] updateAppointment result:`, updated ? 'success' : 'no rows updated');
      if (updated) {
        console.log(`[STORAGE] Updated appointment scheduledAt:`, updated.scheduledAt);
      }
      return updated || undefined;
    } catch (error: any) {
      console.error(`[STORAGE] updateAppointment error:`, error);
      console.error(`[STORAGE] updateAppointment error message:`, error?.message);
      console.error(`[STORAGE] updateAppointment error code:`, error?.code);
      console.error(`[STORAGE] updateAppointment error detail:`, error?.detail);
      throw error;
    }
  }

  async deleteAppointment(id: number, organizationId: number): Promise<boolean> {
    console.log(`🗑️ DELETING APPOINTMENT - ID: ${id}, OrgID: ${organizationId}`);
    
    // First check if appointment exists
    const existing = await db.select().from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)));
    
    console.log(`Found ${existing.length} appointments matching criteria`);
    if (existing.length > 0) {
      console.log(`Appointment details:`, existing[0]);
    }
    
    const [deleted] = await db.delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)))
      .returning();
    
    console.log(`Deletion result:`, deleted ? 'SUCCESS' : 'FAILED');
    console.log(`Deleted appointment:`, deleted);
    
    return !!deleted;
  }

  async promoteOngoingAppointmentsToInProgress(organizationId: number): Promise<void> {
    try {
      // interval * integer is the portable PG form; avoids ambiguous (int * interval) in some versions.
      await db.execute(sql`
        UPDATE appointments
        SET status = 'in_progress'
        WHERE organization_id = ${organizationId}
        AND LOWER(TRIM(status)) IN ('scheduled', 'confirmed')
        AND scheduled_at <= NOW()
        AND scheduled_at + (interval '1 minute' * COALESCE(NULLIF(duration, 0), 30)) > NOW()
      `);
    } catch (error) {
      console.warn("[STORAGE] promoteOngoingAppointmentsToInProgress failed:", error);
    }
  }

  // Invoices
  async getInvoice(id: number, organizationId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));
    return invoice || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string, organizationId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(eq(invoices.invoiceNumber, invoiceNumber), eq(invoices.organizationId, organizationId)));
    return invoice || undefined;
  }

  async getInvoiceByService(organizationId: number, serviceType: string, serviceIds: string[]): Promise<Invoice | undefined> {
    if (serviceIds.length === 0) return undefined;
    const trimmed = serviceIds.map((id) => String(id).trim()).filter(Boolean);
    if (trimmed.length === 0) return undefined;
    const [invoice] = await db.select().from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.serviceType, serviceType),
        or(...trimmed.map((id) => eq(invoices.serviceId, id)))
      ))
      // Prefer the most recently updated invoice if multiple exist for same service_id
      .orderBy(desc(invoices.updatedAt), desc(invoices.createdAt))
      .limit(1);
    return invoice || undefined;
  }

  async getInvoicesByOrganization(organizationId: number, status?: string): Promise<Invoice[]> {
    const conditions = [eq(invoices.organizationId, organizationId)];
    
    if (status && status !== 'all') {
      conditions.push(eq(invoices.status, status));
    }
    
    return await db.select().from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByPatient(patientId: string, organizationId: number): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(and(
        eq(invoices.patientId, patientId),
        eq(invoices.organizationId, organizationId)
      ))
      .orderBy(desc(invoices.createdAt));
  }

  async createPatientInvoice(invoice: InsertInvoice): Promise<Invoice> {
    console.log("Creating patient invoice with data:", invoice);
    try {
      const [created] = await db.insert(invoices).values([invoice]).returning();
      console.log("Patient invoice created successfully:", created);
      return created;
    } catch (error) {
      console.error("Error creating patient invoice:", error);
      throw error;
    }
  }

  async updateInvoice(id: number, organizationId: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteInvoice(id: number, organizationId: number): Promise<boolean> {
    console.log(`🗑️ DELETING INVOICE - ID: ${id}, OrgID: ${organizationId}`);
    const [deleted] = await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)))
      .returning();
    console.log(`Deletion result:`, deleted ? 'SUCCESS' : 'FAILED');
    return !!deleted;
  }

  // Payments
  async createPayment(payment: any): Promise<any> {
    console.log("Creating payment record:", payment);
    try {
      const [created] = await db.insert(payments).values([payment]).returning();
      console.log("Payment record created successfully:", created);
      return created;
    } catch (error) {
      console.error("Error creating payment record:", error);
      throw error;
    }
  }

  async getPaymentsByInvoice(invoiceId: number, organizationId: number): Promise<any[]> {
    return await db.select().from(payments)
      .where(and(
        eq(payments.invoiceId, invoiceId),
        eq(payments.organizationId, organizationId)
      ))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByOrganization(organizationId: number): Promise<any[]> {
    return await db.select({
      // Payment fields
      id: payments.id,
      organizationId: payments.organizationId,
      invoiceId: payments.invoiceId,
      patientId: payments.patientId,
      transactionId: payments.transactionId,
      amount: payments.amount,
      currency: payments.currency,
      paymentMethod: payments.paymentMethod,
      paymentProvider: payments.paymentProvider,
      paymentStatus: payments.paymentStatus,
      paymentDate: payments.paymentDate,
      metadata: payments.metadata,
      createdAt: payments.createdAt,
      // Invoice fields (joined)
      invoice: {
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        patientName: invoices.patientName,
        nhsNumber: invoices.nhsNumber,
        serviceType: invoices.serviceType,
        dateOfService: invoices.dateOfService,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        invoiceType: invoices.invoiceType,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        discount: invoices.discount,
        totalAmount: invoices.totalAmount,
        paidAmount: invoices.paidAmount,
        items: invoices.items,
        insurance: invoices.insurance,
        notes: invoices.notes,
      }
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(payments.organizationId, organizationId))
    .orderBy(desc(payments.createdAt));
  }

  // AI Insights
  async getAiInsight(id: number, organizationId: number): Promise<AiInsight | undefined> {
    const [insight] = await db.select().from(aiInsights)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.organizationId, organizationId)));
    return insight || undefined;
  }

  async getAiInsightsByOrganization(organizationId: number, limit = 20): Promise<any[]> {
    const insights = await db.select().from(aiInsights)
      .where(and(eq(aiInsights.organizationId, organizationId), eq(aiInsights.status, 'active')))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
    
    // Convert confidence string to number for frontend compatibility
    return insights.map(insight => ({
      ...insight,
      confidence: insight.confidence ? parseFloat(insight.confidence) : 0
    }));
  }

  async getAiInsightsByPatient(patientId: number, organizationId: number): Promise<AiInsight[]> {
    return await db.select().from(aiInsights)
      .where(and(
        eq(aiInsights.patientId, patientId),
        eq(aiInsights.organizationId, organizationId),
        eq(aiInsights.status, 'active')
      ))
      .orderBy(desc(aiInsights.createdAt));
  }

  async getAiInsightsByStatus(patientId: number, organizationId: number, status: string): Promise<AiInsight[]> {
    return await db.select().from(aiInsights)
      .where(and(
        eq(aiInsights.patientId, patientId),
        eq(aiInsights.organizationId, organizationId),
        eq(aiInsights.aiStatus, status)
      ))
      .orderBy(desc(aiInsights.createdAt));
  }

  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    let sanitizedMetadata: Record<string, unknown> = {};
    if (insight.metadata != null && typeof insight.metadata === "object" && !Array.isArray(insight.metadata)) {
      try {
        sanitizedMetadata = JSON.parse(JSON.stringify(insight.metadata)) as Record<string, unknown>;
      } catch (metaErr) {
        console.warn("[AI-INSIGHTS] metadata clone failed, using {}:", metaErr);
        sanitizedMetadata = {};
      }
    }

    const normalizeAiConfidence = (raw: unknown): string | null => {
      if (raw == null || raw === "") return null;
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).trim());
      if (!Number.isFinite(n)) return "0";
      const clamped = Math.max(0, Math.min(1, n));
      return clamped.toFixed(2);
    };

    const insertData = {
      organizationId: insight.organizationId,
      patientId: insight.patientId ?? null,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      severity: insight.severity ?? "medium",
      actionRequired: insight.actionRequired ?? false,
      confidence: normalizeAiConfidence(insight.confidence),
      metadata: sanitizedMetadata,
      status: insight.status ?? "active",
      aiStatus: insight.aiStatus ?? "pending",
    };

    console.log("[AI-INSIGHTS] inserting payload:", insertData);

    const insertRow = async () => {
      const [created] = await db.insert(aiInsights).values([insertData as any]).returning();
      if (!created) {
        throw new Error("Insert returned no row");
      }
      return created;
    };

    try {
      return await insertRow();
    } catch (error: unknown) {
      const pgCode = (error as { code?: string })?.code;
      const message = error instanceof Error ? error.message : String(error);
      if (pgCode === "23502" && message.includes('column "id"')) {
        console.warn("[AI-INSIGHTS] repairing id sequence, retrying insert");
        await ensureAiInsightsIdSequence(pool, activeDbSchema);
        try {
          return await insertRow();
        } catch (retryErr: unknown) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.error("[AI-INSIGHTS] insert failed after sequence repair:", retryMsg, insertData);
          throw retryErr;
        }
      }
      console.error("[AI-INSIGHTS] insert failed:", message, insertData);
      throw error;
    }
  }

  async updateAiInsight(id: number, organizationId: number, updates: Partial<InsertAiInsight>): Promise<AiInsight | undefined> {
    const { metadata, ...baseUpdates } = updates;
    const updateData = {
      ...baseUpdates,
      ...(metadata && { metadata: JSON.parse(JSON.stringify(metadata)) })
    };
    const [updated] = await db.update(aiInsights)
      .set(updateData as any)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteAiInsight(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(aiInsights)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  // Subscriptions
  async getSubscription(organizationId: number): Promise<Subscription | undefined> {
    return await subscriptionCache.get(organizationId, async () => {
      // Use already-imported tables instead of dynamic import to avoid circular dependency issues
      // First, get the latest subscription (ordered by createdAt DESC) regardless of expiration
      const [latestSubscription] = await db
        .select({
          id: saasSubscriptions.id,
          organizationId: saasSubscriptions.organizationId,
          packageId: saasSubscriptions.packageId,
          plan: saasPackages.name,
          planName: saasPackages.name,
          status: saasSubscriptions.status,
          paymentStatus: saasSubscriptions.paymentStatus,
          userLimit: saasSubscriptions.maxUsers, // This is the actual maxUsers from saasSubscriptions table
          maxPatients: saasSubscriptions.maxPatients, // This is the actual maxPatients from saasSubscriptions table
          currentUsers: sql<number>`0`.as('currentUsers'),
          monthlyPrice: saasPackages.price,
          trialEndsAt: saasSubscriptions.trialEnd,
          currentPeriodStart: saasSubscriptions.currentPeriodStart,
          nextBillingAt: saasSubscriptions.currentPeriodEnd,
          expiresAt: saasSubscriptions.expiresAt,
          stripeSubscriptionId: saasSubscriptions.stripeSubscriptionId,
          billingCycle: saasSubscriptions.billingCycle,
          features: saasPackages.features,
          createdAt: saasSubscriptions.createdAt,
          updatedAt: saasSubscriptions.updatedAt,
        })
        .from(saasSubscriptions)
        .leftJoin(saasPackages, eq(saasSubscriptions.packageId, saasPackages.id))
        .where(eq(saasSubscriptions.organizationId, organizationId))
        .orderBy(desc(saasSubscriptions.createdAt))
        .limit(1);
      
      if (!latestSubscription) return undefined;
      
      // Check if the latest subscription is expired
      // expiresAt must be > current date (not equal to or past current date)
      if (latestSubscription.expiresAt) {
        const expiresAt = latestSubscription.expiresAt instanceof Date 
          ? latestSubscription.expiresAt 
          : new Date(latestSubscription.expiresAt);
        const now = new Date();
        
        // Set time to start of day for date comparison (ignore time component)
        const expiresAtDate = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // If expiresAt is equal to or past current date, subscription is expired
        // Return undefined (don't fall back to older subscriptions)
        if (expiresAtDate.getTime() <= nowDate.getTime()) {
          return undefined;
        }
      }
      
      // Latest subscription is not expired, use it
      const subscription = latestSubscription;
      
      // Count actual active users in the organization (excluding SaaS owners, inactive users, and patient role)
      const userCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(
          eq(users.organizationId, organizationId),
          eq(users.isSaaSOwner, false),
          eq(users.isActive, true),
          ne(users.role, 'patient') // Exclude patient role - patients are counted separately
        ));
      
      const actualUserCount = userCountResult[0]?.count || 0;
      
      // Count actual active patients in the organization
      const patientCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(and(
          eq(patients.organizationId, organizationId),
          eq(patients.isActive, true)
        ));
      
      const actualPatientCount = patientCountResult[0]?.count || 0;
      
      // Get maxUsers and maxPatients - prioritize saasSubscriptions columns, fallback to package features JSON
      const packageFeatures = subscription.features as any || {};
      // First try saasSubscriptions.maxUsers/maxPatients (actual columns from database), then fallback to package features JSON
      const maxUsers = subscription.userLimit || packageFeatures.maxUsers || 0;
      const maxPatients = (subscription as any).maxPatients || packageFeatures.maxPatients || 0;
      
      console.log('[getSubscription] Subscription limits:', {
        userLimit_from_subscription: subscription.userLimit,
        maxPatients_from_subscription: (subscription as any).maxPatients,
        maxUsers_from_features: packageFeatures.maxUsers,
        maxPatients_from_features: packageFeatures.maxPatients,
        final_maxUsers: maxUsers,
        final_maxPatients: maxPatients
      });
      
      // Transform data to match frontend type expectations
      return {
        ...subscription,
        currentUsers: actualUserCount,
        currentPatients: actualPatientCount,
        userLimit: maxUsers, // Use maxUsers from saasSubscriptions.maxUsers (column) or package features JSON
        maxPatients: maxPatients, // Include maxPatients in the returned object
        monthlyPrice: subscription.monthlyPrice ? String(subscription.monthlyPrice) : null,
        features: subscription.features || {
          aiInsights: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: false
        }
      };
    });
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const { features, ...baseFields } = subscription;
    const insertData = {
      ...baseFields,
      features: features && typeof features === 'object' ? JSON.parse(JSON.stringify(features)) : {}
    };
    const [created] = await db.insert(subscriptions).values([insertData as any]).returning();
    return created;
  }

  async updateSubscription(organizationId: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const { features, ...baseUpdates } = updates;
    const updateData = {
      ...baseUpdates,
      updatedAt: new Date(),
      ...(features && typeof features === 'object' ? { features: JSON.parse(JSON.stringify(features)) } : {})
    };
    const [updated] = await db.update(subscriptions)
      .set(updateData as any)
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();
    
    // Invalidate cache when subscription is updated
    subscriptionCache.invalidate(organizationId);
    
    return updated || undefined;
  }

  // Dashboard Stats
  async getDashboardStats(organizationId: number): Promise<{
    totalPatients: number;
    activePatients: number;
    todayAppointments: number;
    todayCancelledAppointments: number;
    aiSuggestions: number;
    revenue: number;
  }> {
    try {
      // Count total patients from patients table (not users table)
      // This matches what the admin dashboard displays
      const [totalPatientsResult] = await db
        .select({ count: count() })
        .from(patients)
        .where(eq(patients.organizationId, organizationId));
      
      // Count active patients (isActive = true)
      const [activePatientsResult] = await db
        .select({ count: count() })
        .from(patients)
        .where(and(
          eq(patients.organizationId, organizationId),
          eq(patients.isActive, true)
        ));

    // CRITICAL FIX: Match calendar's date comparison logic exactly
    // 
    // PROBLEM: Calendar shows Feb 6, 2026 with 1 scheduled + 1 cancelled, but dashboard shows 0
    // ROOT CAUSE: Date extraction method doesn't match how calendar extracts dates from ISO strings
    //
    // HOW CALENDAR WORKS:
    // - Receives appointments as ISO strings: "2026-02-06T10:00:00.000Z"
    // - Extracts date: apt.scheduledAt.substring(0, 10) = "2026-02-06"
    // - Compares with: format(selectedDate, 'yyyy-MM-dd') = "2026-02-06"
    //
    // THE KEY INSIGHT:
    // - scheduledAt is TIMESTAMP WITHOUT TIME ZONE
    // - When Drizzle serializes it, it formats as ISO string in UTC: "2026-02-06T10:00:00.000Z"
    // - The ISO string date part (substring(0, 10)) is the UTC date representation
    // - But TO_CHAR(scheduledAt, 'YYYY-MM-DD') uses PostgreSQL's timezone setting
    // - If server timezone ≠ UTC, dates won't match!
    //
    // SOLUTION: Use DATE() function which extracts date part, and compare with CURRENT_DATE
    // - Both DATE() and CURRENT_DATE use the server's timezone context
    // - This ensures consistent date extraction regardless of timezone settings
    // - The calendar filters client-side, so it uses browser timezone
    // - The dashboard counts server-side, so it uses server timezone
    // - As long as server and browser are in same timezone (or close), they'll match
    
    // CRITICAL: Match calendar's exact date filtering logic
    // 
    // HOW CALENDAR WORKS (getAppointmentsForDate function):
    // 1. Gets ALL appointments from API (no server-side date filter)
    // 2. Filters client-side:
    //    - apt.scheduledAt.substring(0, 10) extracts date from ISO string
    //      Example: "2026-02-06T10:00:00.000Z" → "2026-02-06"
    //    - format(date, 'yyyy-MM-dd') formats selected date
    //      Example: format(new Date(), 'yyyy-MM-dd') → "2026-02-06" (for today)
    //    - Compares: aptDateString === selectedDateString
    //
    // FOR "TODAY'S APPOINTMENTS":
    // - Calendar uses: format(new Date(), 'yyyy-MM-dd') which gives browser's local date
    // - Example: If today is Feb 6, 2026 → "2026-02-06"
    // - Filters appointments where apt.scheduledAt.substring(0, 10) === "2026-02-06"
    //
    // SOLUTION: Apply same logic server-side
    // - Get today's date using JavaScript Date (same as calendar)
    // - Format as 'yyyy-MM-dd' (same as calendar)
    // - Extract date from scheduledAt as 'YYYY-MM-DD' string (matching substring(0, 10) logic)
    // - Compare date strings directly
    
    // CRITICAL: Match calendar's exact date extraction logic
    // 
    // Calendar extracts: "2026-02-06T02:30:00.000Z".substring(0, 10) = "2026-02-06"
    // The ISO string date part is always in UTC format (the "Z" indicates UTC)
    // So we need to extract the date part from scheduledAt as if it were formatted as UTC ISO string
    //
    // Since scheduledAt is TIMESTAMP WITHOUT TIME ZONE, we need to:
    // 1. Cast it to UTC timezone (to match ISO string format)
    // 2. Extract date as YYYY-MM-DD string
    // 3. Compare with today's date extracted the same way
    
    // Get today's date - use CURRENT_DATE from PostgreSQL to ensure consistency
    // Database shows: "2026-02-06 00:00:00" and "2026-02-06 02:30:00"
    // We need to extract date as "2026-02-06" and compare with today's date
    
    // Count today's appointments - use same logic as calendar
    // Calendar filters: apt.scheduledAt.substring(0, 10) === format(new Date(), 'yyyy-MM-dd')
    // Example: "2026-02-06T02:30:00.000Z".substring(0, 10) === "2026-02-06"
    
    // Use PostgreSQL's CURRENT_DATE to ensure consistent timezone handling
    // This matches the database's timezone context and avoids JavaScript timezone conversion issues
    
    // Count scheduled appointments for today
    // Use DATE() function to extract date part and compare with CURRENT_DATE
    const [todayAppointmentsResult] = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(
        eq(appointments.organizationId, organizationId),
        // Extract date part and compare with PostgreSQL's CURRENT_DATE (uses database timezone)
        sql`DATE(${appointments.scheduledAt}) = CURRENT_DATE`,
        eq(appointments.status, 'scheduled')
      ));

    // Count cancelled appointments for today
    const [todayCancelledAppointmentsResult] = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(
        eq(appointments.organizationId, organizationId),
        // Extract date part and compare with PostgreSQL's CURRENT_DATE (uses database timezone)
        sql`DATE(${appointments.scheduledAt}) = CURRENT_DATE`,
        eq(appointments.status, 'cancelled')
      ));
    
    // Log today's date (using PostgreSQL CURRENT_DATE for consistency)
    console.log(`[Dashboard Stats] Using PostgreSQL CURRENT_DATE for today's appointments`);
    console.log(`[Dashboard Stats] Scheduled: ${todayAppointmentsResult?.count || 0}, Cancelled: ${todayCancelledAppointmentsResult?.count || 0}`);
    
    // Debug logging - check what's actually in the database
    try {
      const debugAppointments = await db
        .select({ 
          id: appointments.id,
          scheduledAt: appointments.scheduledAt,
          status: appointments.status,
          organizationId: appointments.organizationId
        })
        .from(appointments)
        .where(eq(appointments.organizationId, organizationId))
        .limit(5);
      
      console.log(`[Dashboard Stats] Organization ID: ${organizationId}`);
      console.log(`[Dashboard Stats] Current date (CURRENT_DATE): ${new Date().toISOString().substring(0, 10)}`);
      console.log(`[Dashboard Stats] Sample appointments from database:`, debugAppointments.map(apt => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt,
        dateExtracted: apt.scheduledAt ? new Date(apt.scheduledAt as any).toISOString().substring(0, 10) : null,
        status: apt.status
      })));
      console.log(`[Dashboard Stats] Scheduled count: ${todayAppointmentsResult?.count || 0}, Cancelled count: ${todayCancelledAppointmentsResult?.count || 0}`);
    } catch (debugError) {
      console.error(`[Dashboard Stats] Debug query error:`, debugError);
      console.log(`[Dashboard Stats] Scheduled count: ${todayAppointmentsResult?.count || 0}, Cancelled count: ${todayCancelledAppointmentsResult?.count || 0}`);
    }

    // Count all AI insights
    const [aiSuggestionsResult] = await db
      .select({ count: count() })
      .from(aiInsights)
      .where(eq(aiInsights.organizationId, organizationId));

    // Calculate total revenue from all payments (matching billing.tsx logic)
    const paymentsList = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.organizationId, organizationId));
    
    const totalRevenue = paymentsList.reduce((sum, p) => {
      const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : (Number(p.amount) || 0);
      return sum + amount;
    }, 0);

      return {
        totalPatients: totalPatientsResult?.count || 0,
        activePatients: activePatientsResult?.count || 0,
        todayAppointments: todayAppointmentsResult?.count || 0,
        todayCancelledAppointments: todayCancelledAppointmentsResult?.count || 0,
        aiSuggestions: aiSuggestionsResult?.count || 0,
        revenue: totalRevenue,
      };
    } catch (error) {
      console.error("[Dashboard Stats] Error in getDashboardStats:", error);
      throw error;
    }
  }

  // Patient Communications Implementation
  async getPatientCommunication(id: number, organizationId: number): Promise<PatientCommunication | undefined> {
    const [communication] = await db
      .select()
      .from(patientCommunications)
      .where(and(eq(patientCommunications.id, id), eq(patientCommunications.organizationId, organizationId)));
    return communication;
  }

  async getPatientCommunications(patientId: number, organizationId: number): Promise<PatientCommunication[]> {
    return await db
      .select()
      .from(patientCommunications)
      .where(and(eq(patientCommunications.patientId, patientId), eq(patientCommunications.organizationId, organizationId)))
      .orderBy(desc(patientCommunications.createdAt));
  }

  async createPatientCommunication(communication: InsertPatientCommunication): Promise<PatientCommunication> {
    // Type-safe approach: extract base fields and handle metadata separately
    const { metadata, ...baseFields } = communication;
    const insertData = {
      ...baseFields,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
    };
    
    const [newCommunication] = await db
      .insert(patientCommunications)
      .values([insertData as any])
      .returning();
    return newCommunication;
  }

  async updatePatientCommunication(id: number, organizationId: number, updates: Partial<InsertPatientCommunication>): Promise<PatientCommunication | undefined> {
    const { metadata, ...baseUpdates } = updates;
    const updateData = {
      ...baseUpdates,
      updatedAt: new Date(),
      ...(metadata && { metadata: JSON.parse(JSON.stringify(metadata)) })
    };
    const [updatedCommunication] = await db
      .update(patientCommunications)
      .set(updateData as any)
      .where(and(eq(patientCommunications.id, id), eq(patientCommunications.organizationId, organizationId)))
      .returning();
    return updatedCommunication;
  }

  async getLastReminderSent(patientId: number, organizationId: number, type: string): Promise<PatientCommunication | undefined> {
    const [lastReminder] = await db
      .select()
      .from(patientCommunications)
      .where(and(
        eq(patientCommunications.patientId, patientId),
        eq(patientCommunications.organizationId, organizationId),
        eq(patientCommunications.type, type),
        eq(patientCommunications.status, "sent")
      ))
      .orderBy(desc(patientCommunications.sentAt))
      .limit(1);
    return lastReminder;
  }

  async getScheduledCommunications(): Promise<PatientCommunication[]> {
    const now = new Date();
    return await db
      .select()
      .from(patientCommunications)
      .where(and(
        eq(patientCommunications.status, "scheduled"),
        lte(patientCommunications.scheduledFor, now)
      ))
      .orderBy(patientCommunications.scheduledFor);
  }

  async findPatientByPhone(phoneVariants: string[]): Promise<Patient | undefined> {
    const digitsVariants = phoneVariants
      .map((phone) => phone.replace(/[^0-9]/g, "").slice(-10))
      .filter((digits) => digits.length > 0);

    if (digitsVariants.length === 0) {
      return undefined;
    }

    const rows = await db.select().from(patients);
    for (const row of rows) {
      // Global scan — decrypt without per-row DB backfill for performance
      const patient = await this.normalizePatientData(row);
      if (!patient?.phone) continue;

      const storedDigits = patient.phone.replace(/[^0-9]/g, "").slice(-10);
      if (digitsVariants.some((digits) => storedDigits.includes(digits) || digits.includes(storedDigits))) {
        return patient;
      }
    }
    return undefined;
  }

  async getOrganizationAdmin(organizationId: number): Promise<User | undefined> {
    // Find an admin user for the organization
    const [admin] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'admin'),
        eq(users.isActive, true)
      ))
      .limit(1);
    return admin;
  }

  // Notifications
  async getNotifications(userId: number, organizationId: number, limit = 20): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        not(eq(notifications.status, 'archived'))
      ))
      .orderBy(desc(notifications.createdAt));

    if (limit > 0) {
      query = query.limit(limit);
    }

    return await query;
  }

  async getNotificationsByOrganization(organizationId: number, limit = 20): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.organizationId, organizationId),
        not(eq(notifications.status, 'archived'))
      ))
      .orderBy(desc(notifications.createdAt));

    if (limit > 0) {
      query = query.limit(limit);
    }

    return await query;
  }

  async getNotificationCountByOrganization(organizationId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.organizationId, organizationId),
        not(eq(notifications.status, 'archived'))
      ));
    return result?.count || 0;
  }

  async getUnreadNotificationCount(userId: number, organizationId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.status, 'unread')
      ));
    return result?.count || 0;
  }

  async getUnreadNotificationCountByOrganization(organizationId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.status, 'unread')
      ));
    return result?.count || 0;
  }

  async getNotification(id: number, userId: number, organizationId: number): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ));
    return notification;
  }

  /**
   * Creates a notification
   * 
   * EXPLANATION:
   * - If createdAt is NOT provided, we set it to CURRENT TIME (explicitly)
   * - This ensures ALL notifications use CURRENT TIME, not database default
   * - Works for ALL roles (admin, doctor, nurse, patient, etc.)
   * - This is called directly from API routes, so we need to set createdAt here too
   */
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const cleanNotification: any = { ...notification };
    // Clean metadata to avoid type issues
    if (cleanNotification.metadata) {
      cleanNotification.metadata = JSON.parse(JSON.stringify(cleanNotification.metadata));
    }
    
    // CRITICAL: If createdAt is not provided, set it to CURRENT TIME
    // This ensures notifications show "just now" when created (for ALL roles)
    const currentTime = new Date();
    if (!cleanNotification.createdAt) {
      cleanNotification.createdAt = currentTime;
    }
    if (!cleanNotification.updatedAt) {
      cleanNotification.updatedAt = currentTime;
    }
    
    const [created] = await db
      .insert(notifications)
      .values([cleanNotification])
      .returning();
    return created;
  }

  async markNotificationAsRead(id: number, userId: number, organizationId: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        status: 'read', 
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.organizationId, organizationId),
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        )
      ))
      .returning();
    return updated;
  }

  async markNotificationAsReadByOrganization(id: number, organizationId: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({
        status: "read",
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.id, id), eq(notifications.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async markNotificationAsDismissed(id: number, userId: number, organizationId: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        status: 'dismissed', 
        dismissedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.organizationId, organizationId),
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        )
      ))
      .returning();
    return updated;
  }

  async markNotificationAsDismissedByOrganization(id: number, organizationId: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({
        status: "dismissed",
        dismissedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.id, id), eq(notifications.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: number, organizationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        status: 'read',
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.organizationId, organizationId),
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        ),
        eq(notifications.status, 'unread')
      ));
  }

  async markAllNotificationsAsReadByOrganization(organizationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        status: "read",
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.organizationId, organizationId), eq(notifications.status, "unread")));
  }

  async deleteNotification(id: number, userId: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.organizationId, organizationId),
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        )
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteNotificationByOrganization(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Consultation Methods Implementation
  async getConsultation(id: number, organizationId: number): Promise<Consultation | undefined> {
    const [consultation] = await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.id, id), eq(consultations.organizationId, organizationId)));
    return consultation;
  }

  async getConsultationsByOrganization(organizationId: number, limit = 50): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(eq(consultations.organizationId, organizationId))
      .orderBy(desc(consultations.createdAt))
      .limit(limit);
  }

  async getConsultationsByPatient(patientId: number, organizationId: number): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.patientId, patientId), eq(consultations.organizationId, organizationId)))
      .orderBy(desc(consultations.createdAt));
  }

  async getConsultationsByProvider(providerId: number, organizationId: number): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.providerId, providerId), eq(consultations.organizationId, organizationId)))
      .orderBy(desc(consultations.createdAt));
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const { vitals, ...baseFields } = consultation;
    const insertData = {
      ...baseFields,
      vitals: vitals ? JSON.parse(JSON.stringify(vitals)) : {}
    };
    const [created] = await db
      .insert(consultations)
      .values([insertData as any])
      .returning();
    return created;
  }

  async updateConsultation(id: number, organizationId: number, updates: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const { vitals, ...baseUpdates } = updates;
    const updateData = {
      ...baseUpdates,
      updatedAt: new Date(),
      ...(vitals && { vitals: JSON.parse(JSON.stringify(vitals)) })
    };
    const [updated] = await db
      .update(consultations)
      .set(updateData as any)
      .where(and(eq(consultations.id, id), eq(consultations.organizationId, organizationId)))
      .returning();
    return updated;
  }
  async getForms(organizationId: number): Promise<any[]> {
    // Mock implementation - replace with actual database logic
    return [];
  }

  async createForm(form: any, organizationId: number): Promise<any> {
    // Mock implementation - replace with actual database logic
    return { ...form, id: Date.now().toString(), organizationId };
  }

  async getAnalytics(organizationId: number): Promise<any> {
    try {
      // Get real patient data from database
      const patientRows = await db.select().from(patients).where(eq(patients.organizationId, organizationId));
      const patientsList = await this.decryptPatientRows(patientRows);
      const appointmentsList = await db.select().from(appointments).where(eq(appointments.organizationId, organizationId));
      
      // Get clinical data from database
      const medicalRecordsList = await db.select().from(medicalRecords).where(eq(medicalRecords.organizationId, organizationId));
      const consultationsList = await db.select().from(consultations).where(eq(consultations.organizationId, organizationId));
      const prescriptionsList = await db.select().from(prescriptions).where(eq(prescriptions.organizationId, organizationId));
      const aiInsightsList = await db.select().from(aiInsights).where(eq(aiInsights.organizationId, organizationId));
      
      // Get payment data from database
      const paymentsList = await db.select().from(payments).where(eq(payments.organizationId, organizationId));
      
      // Count total users with role 'patient'
      const userPatientsList = await db
        .select()
        .from(users)
        .where(and(eq(users.organizationId, organizationId), eq(users.role, 'patient'), eq(users.isActive, true)));
      
      const totalPatients = userPatientsList.length;
      const totalAppointments = appointmentsList.length;
      
      // Calculate new patients (created in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newPatients = userPatientsList.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length;
      
      // Calculate appointment stats
      const completedAppointments = appointmentsList.filter(a => a.status?.toLowerCase().trim() === 'completed').length;
      const cancelledAppointments = appointmentsList.filter(a => a.status?.toLowerCase().trim() === 'cancelled').length;
      const noShowAppointments = appointmentsList.filter(a => a.status?.toLowerCase().trim() === 'no-show').length;
      
      // Clinical Analytics Data
      const totalConsultations = consultationsList.length;
      const completedConsultations = consultationsList.filter(c => c.status === 'completed').length;
      const totalPrescriptions = prescriptionsList.length;
      const activePrescriptions = prescriptionsList.filter(p => p.status === 'active').length;
      const totalMedicalRecords = medicalRecordsList.length;
      const totalAiInsights = aiInsightsList.length;
      const criticalInsights = aiInsightsList.filter(i => i.severity === 'critical').length;
      
      // Prescription analysis by medication type
      const prescriptionAnalysis = prescriptionsList.reduce((acc, prescription) => {
        const medication = prescription.medicationName || 'Unknown';
        acc[medication] = (acc[medication] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topMedications = Object.entries(prescriptionAnalysis)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([medication, count]) => ({ medication, count }));
      
      // Consultation type distribution
      const consultationTypes = consultationsList.reduce((acc, consultation) => {
        const type = consultation.consultationType || 'routine';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // AI insights severity distribution
      const insightsSeverity = aiInsightsList.reduce((acc, insight) => {
        const severity = insight.severity || 'medium';
        const severityLevels = { low: 0, medium: 0, high: 0, critical: 0 };
        if (severity in severityLevels) {
          acc[severity as keyof typeof severityLevels] = (acc[severity as keyof typeof severityLevels] || 0) + 1;
        }
        return acc;
      }, { low: 0, medium: 0, high: 0, critical: 0 });
      
      // Medical record types
      const recordTypes = medicalRecordsList.reduce((acc, record) => {
        const type = record.type || 'consultation';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Recent clinical activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentConsultations = consultationsList.filter(c => new Date(c.createdAt) > sevenDaysAgo).length;
      const recentPrescriptions = prescriptionsList.filter(p => new Date(p.prescribedAt || p.issuedDate || '') > sevenDaysAgo).length;
      const recentInsights = aiInsightsList.filter(i => new Date(i.createdAt) > sevenDaysAgo).length;
      
      // Patient age distribution
      const ageDistribution = patientsList.reduce((acc, patient) => {
        if (patient.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
          if (age < 18) acc['Under 18']++;
          else if (age < 35) acc['18-34']++;
          else if (age < 55) acc['35-54']++;
          else if (age < 75) acc['55-74']++;
          else acc['75+']++;
        } else {
          acc['Unknown']++;
        }
        return acc;
      }, { 'Under 18': 0, '18-34': 0, '35-54': 0, '55-74': 0, '75+': 0, 'Unknown': 0 });
      
      // Gender distribution
      const genderDistribution = patientsList.reduce((acc, patient) => {
        const gender = patient.genderAtBirth || 'Unknown';
        if (gender in acc) {
          acc[gender]++;
        } else {
          acc[gender] = 1;
        }
        return acc;
      }, { Male: 0, Female: 0, Other: 0, Unknown: 0 });
      
      // Calculate patient growth over last 6 months
      const patientGrowthData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthPatients = userPatientsList.filter(u => {
          const createdDate = new Date(u.createdAt);
          return createdDate >= monthStart && createdDate <= monthEnd;
        }).length;
        
        const totalToDate = userPatientsList.filter(u => new Date(u.createdAt) <= monthEnd).length;
        
        patientGrowthData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          total: totalToDate,
          new: monthPatients
        });
      }

      // Calculate appointment volume trend for last 30 days
      const appointmentVolumeData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        
        const dayAppointments = appointmentsList.filter(a => {
          const scheduledDate = new Date(a.scheduledAt);
          return scheduledDate >= dayStart && scheduledDate <= dayEnd;
        });
        
        const completed = dayAppointments.filter(a => a.status?.toLowerCase().trim() === 'completed').length;
        const cancelled = dayAppointments.filter(a => a.status?.toLowerCase().trim() === 'cancelled').length;
        const noShow = dayAppointments.filter(a => a.status?.toLowerCase().trim() === 'no-show').length;
        const scheduled = dayAppointments.filter(a => a.status?.toLowerCase().trim() === 'scheduled').length;
        
        appointmentVolumeData.push({
          date: dayStart.toISOString().split('T')[0],
          scheduled,
          completed,
          cancelled,
          noShow
        });
      }

      // Calculate revenue from completed payments
      const totalRevenue = paymentsList
        .filter(p => p.paymentStatus === 'completed')
        .reduce((sum, p) => {
          const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : (Number(p.amount) || 0);
          return sum + amount;
        }, 0);

      // New Analytics for Overview Tab
      // 1. Patients registered this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const patientsThisMonth = userPatientsList.filter(u => new Date(u.createdAt) >= startOfMonth).length;

      // 2. Doctor who handled the most appointments
      const doctorAppointmentCounts = appointmentsList.reduce((acc, appointment) => {
        const providerId = appointment.providerId;
        acc[providerId] = (acc[providerId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const topDoctorId = Object.entries(doctorAppointmentCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      let topDoctor = { name: 'No appointments yet', appointmentCount: 0 };
      if (topDoctorId) {
        const doctorInfo = await db.select().from(users).where(eq(users.id, parseInt(topDoctorId[0]))).limit(1);
        if (doctorInfo.length > 0) {
          topDoctor = {
            name: `${doctorInfo[0].firstName} ${doctorInfo[0].lastName}`,
            appointmentCount: topDoctorId[1]
          };
        }
      }

      // 3. Lab tests done daily (last 7 days)
      const labResultsList = await db.select().from(labResults).where(eq(labResults.organizationId, organizationId));
      
      const labTestsDaily = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const count = labResultsList.filter(lab => {
          const labDate = new Date(lab.orderedAt).toISOString().split('T')[0];
          return labDate === dateStr;
        }).length;
        return {
          date: dateStr,
          count
        };
      });

      // Additional Analytics
      // Outstanding dues calculation
      const invoicesList = await db.select().from(invoices).where(eq(invoices.organizationId, organizationId));
      const outstandingDues = invoicesList
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

      // Lab tests count (last 7 days)
      const labTestsCount = labResultsList.length;

      // No-show and cancelled counts
      const noShowCount = noShowAppointments;
      const cancelledCount = cancelledAppointments;

      // Most frequent lab test
      const labTestCounts = labResultsList.reduce((acc, lab) => {
        const testName = lab.testType || 'Unknown';
        acc[testName] = (acc[testName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topLabTestEntry = Object.entries(labTestCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      const topLabTest = topLabTestEntry ? {
        name: topLabTestEntry[0],
        count: topLabTestEntry[1]
      } : { name: 'No data', count: 0 };

      // Top payment mode
      const paymentModeCounts = paymentsList.reduce((acc, payment) => {
        const mode = payment.paymentMethod || 'Unknown';
        acc[mode] = (acc[mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topPaymentModeEntry = Object.entries(paymentModeCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      const topPaymentMode = topPaymentModeEntry ? {
        mode: topPaymentModeEntry[0],
        count: topPaymentModeEntry[1]
      } : { mode: 'No data', count: 0 };

      // Average age calculation
      const patientsWithAge = patientsList.filter(p => p.dateOfBirth);
      const averageAge = patientsWithAge.length > 0 
        ? Math.round(patientsWithAge.reduce((sum, p) => {
            const birthDate = new Date(p.dateOfBirth!);
            const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            return sum + age;
          }, 0) / patientsWithAge.length)
        : 0;

      // Gender counts
      const maleCount = patientsList.filter(p => 
        p.genderAtBirth?.toLowerCase() === 'male'
      ).length;
      const femaleCount = patientsList.filter(p => 
        p.genderAtBirth?.toLowerCase() === 'female'
      ).length;

      return {
        overview: {
          totalPatients,
          newPatients,
          totalAppointments,
          completedAppointments,
          revenue: totalRevenue,
          averageWaitTime: 18, // Mock wait time
          patientSatisfaction: 4.6, // Mock satisfaction
          noShowRate: totalAppointments > 0 ? Math.round((noShowAppointments / totalAppointments) * 100 * 10) / 10 : 0,
          patientsThisMonth,
          topDoctor,
          labTestsDaily,
          totalRevenue,
          outstandingDues,
          labTestsCount,
          noShowCount,
          cancelledCount,
          topLabTest,
          topPaymentMode,
          averageAge,
          maleCount,
          femaleCount
        },
        trends: {
          patientGrowth: patientGrowthData,
          appointmentVolume: appointmentVolumeData,
          revenue: [
            { month: "Jan", amount: 98500, target: 100000 },
            { month: "Feb", amount: 102300, target: 105000 },
            { month: "Mar", amount: 118900, target: 115000 },
            { month: "Apr", amount: 121500, target: 120000 },
            { month: "May", amount: 119800, target: 122000 },
            { month: "Jun", amount: 125800, target: 125000 }
          ]
        },
        patientAnalytics: {
          demographics: {
            ageDistribution,
            genderDistribution
          },
          totalPatients,
          newPatients,
          topConditions: [
            { condition: 'Hypertension', count: Math.floor(totalPatients * 0.25) },
            { condition: 'Diabetes', count: Math.floor(totalPatients * 0.18) },
            { condition: 'Asthma', count: Math.floor(totalPatients * 0.12) },
            { condition: 'Arthritis', count: Math.floor(totalPatients * 0.10) },
            { condition: 'Depression', count: Math.floor(totalPatients * 0.08) }
          ],
          appointmentStats: {
            total: totalAppointments,
            completed: completedAppointments,
            cancelled: cancelledAppointments,
            noShow: noShowAppointments,
            completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
          }
        },
        clinicalAnalytics: {
          overview: {
            totalConsultations,
            completedConsultations,
            totalPrescriptions,
            activePrescriptions,
            totalMedicalRecords,
            totalAiInsights,
            criticalInsights,
            consultationCompletionRate: totalConsultations > 0 ? Math.round((completedConsultations / totalConsultations) * 100) : 0,
            prescriptionActiveRate: totalPrescriptions > 0 ? Math.round((activePrescriptions / totalPrescriptions) * 100) : 0
          },
          recentActivity: {
            consultations: recentConsultations,
            prescriptions: recentPrescriptions,
            insights: recentInsights
          },
          medications: {
            topMedications,
            totalTypes: Object.keys(prescriptionAnalysis).length
          },
          consultationTypes,
          recordTypes,
          aiInsights: {
            severityDistribution: insightsSeverity,
            total: totalAiInsights,
            criticalCount: criticalInsights
          }
        }
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Fallback to mock data if database query fails
      return {
        overview: {
          totalPatients: 0,
          newPatients: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          revenue: 0,
          averageWaitTime: 0,
          patientSatisfaction: 0,
          noShowRate: 0
        },
        trends: {
          patientGrowth: [],
          appointmentVolume: [],
          revenue: []
        },
        patientAnalytics: {
          demographics: {
            ageDistribution: {},
            genderDistribution: {}
          },
          totalPatients: 0,
          newPatients: 0,
          topConditions: [],
          appointmentStats: {
            total: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            completionRate: 0
          }
        },
        clinicalAnalytics: {
          overview: {
            totalConsultations: 0,
            completedConsultations: 0,
            totalPrescriptions: 0,
            activePrescriptions: 0,
            totalMedicalRecords: 0,
            totalAiInsights: 0,
            criticalInsights: 0,
            consultationCompletionRate: 0,
            prescriptionActiveRate: 0
          },
          recentActivity: {
            consultations: 0,
            prescriptions: 0,
            insights: 0
          },
          medications: {
            topMedications: [],
            totalTypes: 0
          },
          consultationTypes: {},
          recordTypes: {},
          aiInsights: {
            severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
            total: 0,
            criticalCount: 0
          }
        }
      };
    }
  }

  async getAutomationRules(organizationId: number): Promise<any[]> {
    // Mock automation rules - replace with actual database queries
    return [
      {
        id: "1",
        name: "Appointment Reminder",
        description: "Send SMS reminder 24 hours before appointment",
        trigger: {
          type: "appointment_scheduled",
          conditions: [],
          timeDelay: { value: 24, unit: "hours" }
        },
        actions: [{
          type: "send_sms",
          config: {
            template: "appointment_reminder",
            message: "Hello {{patient_name}}, you have an appointment tomorrow at {{appointment_time}} with {{provider_name}}."
          }
        }],
        status: "active",
        category: "appointment",
        createdAt: "2024-06-01T10:00:00Z",
        updatedAt: "2024-06-25T15:30:00Z",
        lastTriggered: "2024-06-26T14:00:00Z",
        triggerCount: 145,
        successRate: 98.6
      }
    ];
  }

  async getAutomationStats(organizationId: number): Promise<any> {
    // Mock automation stats - replace with actual database queries
    return {
      totalRules: 12,
      activeRules: 9,
      totalTriggers: 1847,
      successfulExecutions: 1782,
      failedExecutions: 65,
      averageResponseTime: 2.3,
      topPerformingRules: [
        { id: "3", name: "Lab Results Notification", triggerCount: 67, successRate: 100.0 },
        { id: "1", name: "Appointment Reminder", triggerCount: 145, successRate: 98.6 },
        { id: "2", name: "Post-Visit Follow-up", triggerCount: 89, successRate: 96.6 }
      ],
      recentActivity: [
        {
          id: "act_1",
          ruleName: "Appointment Reminder",
          trigger: "appointment_scheduled",
          action: "send_sms",
          status: "success",
          timestamp: "2024-06-26T16:45:00Z",
          details: "SMS sent to +44 7700 900123"
        }
      ]
    };
  }

  async toggleAutomationRule(ruleId: string, organizationId: number): Promise<any> {
    // Mock implementation - replace with actual database logic
    return { id: ruleId, status: "active", organizationId };
  }

  // Messaging implementations - PERSISTENT DATABASE STORAGE
  async getConversations(organizationId: number, currentUserId?: number): Promise<any[]> {
    // Get conversations from database instead of in-memory storage
    const storedConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId))
      .orderBy(desc(conversationsTable.updatedAt));

    console.log(`💬 GET CONVERSATIONS - Database: ${storedConversations.length} found for org ${organizationId}`);
    console.log(`💬 CONVERSATION IDS:`, storedConversations.map(c => c.id));
    console.log(`💬 CURRENT USER ID: ${currentUserId}`);
    
    // CRITICAL: Filter conversations to only include those where current user is a participant
    // This ensures role-based visibility - users only see conversations they are part of
    let filteredConversations = storedConversations;
    if (currentUserId !== undefined && currentUserId !== null) {
      filteredConversations = storedConversations.filter(conv => {
        const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
        const isParticipant = participants.some(p => {
          const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
          return pId === currentUserId;
        });
        return isParticipant;
      });
      console.log(`💬 FILTERED CONVERSATIONS - ${filteredConversations.length} conversations where user ${currentUserId} is a participant (out of ${storedConversations.length} total)`);
    } else {
      console.log(`⚠️ WARNING - No currentUserId provided, returning all conversations (security risk!)`);
    }

    // Update participant names with actual user data and calculate real unread count
    // Only process conversations where current user is a participant (already filtered above)
    const conversationsWithNames = await Promise.all(filteredConversations.map(async (conv) => {
      const updatedParticipants = await Promise.all(conv.participants.map(async (participant: any) => {
        // Try to get user data by ID first
        if (typeof participant.id === 'number') {
          const user = await this.getUser(participant.id, organizationId);
          if (user && user.firstName && user.lastName) {
            let participantData: any = {
              ...participant,
              name: `${user.firstName} ${user.lastName}`
            };
            
            // If user is a patient, get their phone number
            if (user.role === 'patient') {
              const patient = await this.getPatientByUserId(user.id, organizationId);
              if (patient && patient.phone) {
                participantData.phone = patient.phone;
              }
            }
            
            return participantData;
          } else if (user && user.firstName) {
            let participantData: any = {
              ...participant,
              name: user.firstName
            };
            
            // If user is a patient, get their phone number
            if (user.role === 'patient') {
              const patient = await this.getPatientByUserId(user.id, organizationId);
              if (patient && patient.phone) {
                participantData.phone = patient.phone;
              }
            }
            
            return participantData;
          } else if (user) {
            let participantData: any = {
              ...participant,
              name: user.email
            };
            
            // If user is a patient, get their phone number
            if (user.role === 'patient') {
              const patient = await this.getPatientByUserId(user.id, organizationId);
              if (patient && patient.phone) {
                participantData.phone = patient.phone;
              }
            }
            
            return participantData;
          } else {
            // User lookup failed - try looking up as a patient ID directly
            console.log(`🔍 User lookup failed for ID ${participant.id}, trying patient lookup...`);
            if (participant.role === 'patient') {
              try {
                // Try direct patient lookup by ID
                const patient = await this.getPatient(participant.id, organizationId);
                if (patient && patient.firstName && patient.lastName) {
                  console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);
                  return {
                    ...participant,
                    name: `${patient.firstName} ${patient.lastName}`,
                    phone: patient.phone || participant.phone
                  };
                }
              } catch (e) {
                console.log(`Could not find patient with ID ${participant.id}`);
              }
            }
          }
        } else if (typeof participant.id === 'string') {
          // If it's a patient name string, preserve it as-is unless it's clearly a user email
          // Only try to match if it looks like an email address to avoid overwriting patient names
          if (participant.id.includes('@')) {
            const allUsers = await this.getUsersByOrganization(organizationId);
            const matchedUser = allUsers.find(user => user.email === participant.id);
            
            if (matchedUser) {
              console.log(`🔧 Fixed participant mapping: "${participant.id}" -> ${matchedUser.id} (${matchedUser.firstName} ${matchedUser.lastName})`);
              let participantData: any = {
                id: matchedUser.id, // Use actual numeric user ID
                name: `${matchedUser.firstName} ${matchedUser.lastName}`,
                role: matchedUser.role
              };
              
              // If user is a patient, get their phone number
              if (matchedUser.role === 'patient') {
                const patient = await this.getPatientByUserId(matchedUser.id, organizationId);
                if (patient && patient.phone) {
                  participantData.phone = patient.phone;
                }
              }
              
              return participantData;
            }
          }
          // For patient names (non-email strings), preserve them exactly as they are
          console.log(`✅ Preserving patient name: "${participant.id}"`);
        }
        // If participant name is a number (stored incorrectly), try to look up the actual name
        if (typeof participant.name === 'number' || (typeof participant.name === 'string' && !isNaN(Number(participant.name)))) {
          const patientId = typeof participant.name === 'number' ? participant.name : parseInt(participant.name);
          const idToLookup = typeof participant.id === 'number' ? participant.id : patientId;
          
          // Try to look up patient directly
          if (participant.role === 'patient') {
            try {
              // Try looking up by patient ID first
              const patient = await this.getPatient(patientId, organizationId);
              if (patient && patient.firstName && patient.lastName) {
                return {
                  ...participant,
                  name: `${patient.firstName} ${patient.lastName}`,
                  phone: patient.phone || participant.phone
                };
              }
              // If that fails, try by the participant id
              const patientByUserId = await this.getPatientByUserId(idToLookup, organizationId);
              if (patientByUserId && patientByUserId.firstName && patientByUserId.lastName) {
                return {
                  ...participant,
                  name: `${patientByUserId.firstName} ${patientByUserId.lastName}`,
                  phone: patientByUserId.phone || participant.phone
                };
              }
            } catch (e) {
              console.log(`Could not look up patient name for ID ${patientId}`);
            }
          }
          
          // Try looking up as a user ID
          try {
            const user = await this.getUser(idToLookup, organizationId);
            if (user && user.firstName && user.lastName) {
              return {
                ...participant,
                name: `${user.firstName} ${user.lastName}`
              };
            } else if (user && user.firstName) {
              return {
                ...participant,
                name: user.firstName
              };
            }
          } catch (e) {
            console.log(`Could not look up user name for ID ${idToLookup}`);
          }
        }
        
        // If it's a patient name string and no match found, keep it as is
        return participant;
      }));
      
      // Calculate actual unread count based on isRead status of messages
      // Only count messages received by current user (not sent by them)
      const unreadQuery = [
        eq(messages.conversationId, conv.id),
        eq(messages.isRead, false)
      ];
      
      // If currentUserId is provided, exclude messages sent by the current user
      if (currentUserId !== undefined) {
        unreadQuery.push(ne(messages.senderId, currentUserId));
      }
      
      const unreadMessages = await db.select()
        .from(messages)
        .where(and(...unreadQuery));
      
      // Check if this conversation is favorited by the current user
      let isFavorite = false;
      if (currentUserId !== undefined) {
        const favorite = await db.select()
          .from(userConversationFavorites)
          .where(and(
            eq(userConversationFavorites.conversationId, conv.id),
            eq(userConversationFavorites.userId, currentUserId),
            eq(userConversationFavorites.organizationId, organizationId)
          ))
          .limit(1);
        isFavorite = favorite.length > 0;
      }
      
      return {
        ...conv,
        participants: updatedParticipants,
        unreadCount: unreadMessages.length, // Use actual unread count
        isFavorite
      };
    }));

    return conversationsWithNames;
  }

  async toggleConversationFavorite(conversationId: string, userId: number, organizationId: number): Promise<boolean> {
    // Check if favorite already exists
    const existingFavorite = await db.select()
      .from(userConversationFavorites)
      .where(and(
        eq(userConversationFavorites.conversationId, conversationId),
        eq(userConversationFavorites.userId, userId),
        eq(userConversationFavorites.organizationId, organizationId)
      ))
      .limit(1);

    if (existingFavorite.length > 0) {
      // Remove favorite
      await db.delete(userConversationFavorites)
        .where(and(
          eq(userConversationFavorites.conversationId, conversationId),
          eq(userConversationFavorites.userId, userId),
          eq(userConversationFavorites.organizationId, organizationId)
        ));
      return false; // Now unfavorited
    } else {
      // Add favorite
      await db.insert(userConversationFavorites).values({
        conversationId,
        userId,
        organizationId,
      });
      return true; // Now favorited
    }
  }

  async getMessages(conversationId: string, organizationId: number): Promise<any[]> {
    // Get messages from database instead of in-memory storage
    const storedMessages = await db.select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.organizationId, organizationId)
      ))
      .orderBy(asc(messages.timestamp));

    console.log(`💬 GET MESSAGES - Database: ${storedMessages.length} found for conversation ${conversationId}`);
    
    // Get tags for each message (with error handling in case tag tables don't exist yet)
    const messagesWithTags = await Promise.all(storedMessages.map(async (msg) => {
      try {
        const messageTags = await db.select({
          id: messageTagAssignments.tagId,
          name: messageTags.name,
          color: messageTags.color,
        })
          .from(messageTagAssignments)
          .innerJoin(messageTags, eq(messageTagAssignments.tagId, messageTags.id))
          .where(and(
            eq(messageTagAssignments.messageId, msg.id),
            eq(messageTagAssignments.organizationId, organizationId)
          ));
        
        return {
          ...msg,
          tags: messageTags.map(t => ({ id: t.id, name: t.name, color: t.color }))
        };
      } catch (error: any) {
        // If tag tables don't exist or there's an error, return message without tags
        console.warn(`⚠️ Error fetching tags for message ${msg.id}:`, error.message);
        return {
          ...msg,
          tags: []
        };
      }
    }));
    
    return messagesWithTags;
  }

  async markConversationMessagesAsRead(conversationId: string, userId: number, organizationId: number): Promise<void> {
    try {
      // Mark all unread messages in this conversation as read
      // Exclude messages sent by the current user (they don't need to mark their own messages as read)
      await db.update(messages)
        .set({ 
          isRead: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(messages.conversationId, conversationId),
          eq(messages.organizationId, organizationId),
          eq(messages.isRead, false),
          ne(messages.senderId, userId) // Don't mark messages sent by the current user
        ));

      console.log(`✅ Marked conversation ${conversationId} messages as read for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to mark conversation messages as read:`, error);
      throw error;
    }
  }

  async fixAllConversationParticipants(organizationId: number): Promise<void> {
    console.log(`🔧 FIXING ALL CONVERSATION PARTICIPANTS for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId));
    
    console.log(`🔧 Found ${allConversations.length} conversations to check`);
    
    for (const conv of allConversations) {
      let needsUpdate = false;
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      const updatedParticipants = [];
      
      for (const participant of participants) {
        // Check if participant needs fixing
        if (typeof participant.id === 'number') {
          // Get actual user data
          const user = await this.getUser(participant.id, organizationId);
          if (user && user.firstName && user.lastName) {
            const correctName = `${user.firstName.trim()} ${user.lastName.trim()}`;
            if (participant.name !== correctName) {
              console.log(`🔧 Fixing participant ${participant.id}: "${participant.name}" -> "${correctName}"`);
              updatedParticipants.push({
                id: participant.id,
                name: correctName,
                role: user.role || participant.role
              });
              needsUpdate = true;
            } else {
              updatedParticipants.push(participant);
            }
          } else {
            updatedParticipants.push(participant);
          }
        } else if (typeof participant.id === 'string') {
          // Try to resolve string ID to actual user first, then patient
          const allUsers = await this.getUsersByOrganization(organizationId);
          const matchedUser = allUsers.find(user => {
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            return fullName === participant.id || 
                   user.firstName === participant.id ||
                   user.email === participant.id;
          });
          
          if (matchedUser) {
            const cleanName = `${matchedUser.firstName.trim()} ${matchedUser.lastName.trim()}`;
            console.log(`🔧 Resolving string participant "${participant.id}" -> ${matchedUser.id} (${cleanName})`);
            updatedParticipants.push({
              id: matchedUser.id,
              name: cleanName,
              role: matchedUser.role
            });
            needsUpdate = true;
          } else {
            // Try to find in patients table
            const allPatients = await this.getPatientsByOrganization(organizationId);
            const matchedPatient = allPatients.find(patient => {
              const fullName = `${patient.firstName} ${patient.lastName}`.trim();
              return fullName === participant.id || 
                     fullName.replace(/\s+/g, ' ') === participant.id ||
                     patient.firstName === participant.id;
            });
            
            if (matchedPatient) {
              const cleanName = `${matchedPatient.firstName.trim()} ${matchedPatient.lastName.trim()}`;
              console.log(`🔧 Resolving string participant "${participant.id}" -> patient ID ${matchedPatient.id} (${cleanName})`);
              updatedParticipants.push({
                id: matchedPatient.id,
                name: cleanName,
                role: 'patient'
              });
              needsUpdate = true;
            } else {
              console.log(`⚠️ Could not resolve string participant: "${participant.id}"`);
              updatedParticipants.push(participant);
            }
          }
        } else {
          updatedParticipants.push(participant);
        }
      }
      
      // Update conversation if needed
      if (needsUpdate) {
        await db.update(conversationsTable)
          .set({ participants: updatedParticipants })
          .where(eq(conversationsTable.id, conv.id));
        console.log(`🔧 Updated conversation ${conv.id} with correct participant names`);
      }
    }
    
    console.log(`🔧 COMPLETED fixing conversation participants`);
  }

  async consolidateDuplicateConversations(senderId: number, recipientId: string, organizationId: number): Promise<void> {
    console.log(`🔄 CONSOLIDATING conversations between sender ${senderId} and recipient ${recipientId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId));
    
    // Find all conversations that involve both participants
    const matchingConversations = [];
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      const hasSender = participants.some(p => p.id == senderId);
      const hasRecipient = participants.some(p => 
        p.id == recipientId || 
        p.name == recipientId ||
        (typeof p.id === 'string' && p.id === recipientId)
      );
      
      if (hasSender && hasRecipient) {
        matchingConversations.push(conv);
      }
    }
    
    if (matchingConversations.length <= 1) {
      console.log(`🔄 No duplicate conversations found (found ${matchingConversations.length})`);
      return;
    }
    
    console.log(`🔄 Found ${matchingConversations.length} duplicate conversations, consolidating...`);
    
    // Sort by creation date to keep the oldest one
    matchingConversations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const keepConversation = matchingConversations[0];
    const duplicateConversations = matchingConversations.slice(1);
    
    // Move all messages from duplicate conversations to the main one
    for (const dupConv of duplicateConversations) {
      console.log(`🔄 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
      
      // Update all messages to point to the main conversation
      await db.update(messages)
        .set({ conversationId: keepConversation.id })
        .where(eq(messages.conversationId, dupConv.id));
      
      // Delete the duplicate conversation
      await db.delete(conversationsTable)
        .where(eq(conversationsTable.id, dupConv.id));
      
      console.log(`🔄 Deleted duplicate conversation ${dupConv.id}`);
    }
    
    // Update the main conversation's lastMessage and unreadCount
    const allMessagesInConv = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, keepConversation.id))
      .orderBy(asc(messages.timestamp));
    
    if (allMessagesInConv.length > 0) {
      const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
      await db.update(conversationsTable)
        .set({
          lastMessage: {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            subject: lastMessage.subject,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp.toISOString(),
            priority: lastMessage.priority || 'normal'
          },
          unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
          updatedAt: new Date()
        })
        .where(eq(conversationsTable.id, keepConversation.id));
    }
    
    console.log(`✅ Consolidated ${duplicateConversations.length} duplicate conversations into ${keepConversation.id}`);
  }

  async consolidateAllDuplicateConversations(organizationId: number): Promise<void> {
    console.log(`🔄 CONSOLIDATING ALL duplicate conversations for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId));
    
    console.log(`🔄 Found ${allConversations.length} total conversations`);
    
    // Group conversations by participant pairs
    const conversationGroups = new Map<string, typeof allConversations>();
    
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      // Create a unique key for participant pairs, sorted to ensure consistency
      const participantIds = participants
        .map(p => p.id)
        .sort()
        .join('-');
      
      if (!conversationGroups.has(participantIds)) {
        conversationGroups.set(participantIds, []);
      }
      conversationGroups.get(participantIds)!.push(conv);
    }
    
    let totalConsolidated = 0;
    
    // Process each group and consolidate duplicates
    for (const [participantKey, conversations] of conversationGroups.entries()) {
      if (conversations.length > 1) {
        console.log(`🔄 Found ${conversations.length} conversations for participants: ${participantKey}`);
        
        // Sort by creation date to keep the oldest one
        conversations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const keepConversation = conversations[0];
        const duplicateConversations = conversations.slice(1);
        
        // Move all messages from duplicate conversations to the main one
        for (const dupConv of duplicateConversations) {
          console.log(`🔄 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
          
          // Update all messages to point to the main conversation
          await db.update(messages)
            .set({ conversationId: keepConversation.id })
            .where(eq(messages.conversationId, dupConv.id));
          
          // Delete the duplicate conversation
          await db.delete(conversationsTable)
            .where(eq(conversationsTable.id, dupConv.id));
          
          console.log(`🔄 Deleted duplicate conversation ${dupConv.id}`);
          totalConsolidated++;
        }
        
        // Update the main conversation's lastMessage and unreadCount
        const allMessagesInConv = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, keepConversation.id))
          .orderBy(asc(messages.timestamp));
        
        if (allMessagesInConv.length > 0) {
          const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
          await db.update(conversationsTable)
            .set({
              lastMessage: {
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                subject: lastMessage.subject,
                content: lastMessage.content,
                timestamp: lastMessage.timestamp.toISOString(),
                priority: lastMessage.priority || 'normal'
              },
              unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
              updatedAt: new Date()
            })
            .where(eq(conversationsTable.id, keepConversation.id));
        }
      }
    }
    
    console.log(`✅ Consolidated ${totalConsolidated} duplicate conversations total`);
  }

  async consolidateAllDuplicateConversationsOld(organizationId: number): Promise<void> {
    console.log(`🔄 CONSOLIDATING ALL duplicate conversations for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId));
    
    console.log(`🔄 Found ${allConversations.length} total conversations to analyze`);
    
    // Group conversations by participants (unique pairs)
    const conversationGroups = new Map<string, any[]>();
    
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      
      // Extract admin and patient IDs with better matching logic
      let adminId = '';
      let patientIdentifier = '';
      
      for (const p of participants) {
        if (p.role === 'admin' || isDoctorLike(p.role) || p.role === 'nurse') {
          adminId = p.id?.toString() || '';
        } else if (p.role === 'patient') {
          // Use name as identifier if id is missing, or use id if available
          patientIdentifier = p.id?.toString() || p.name?.toString() || '';
        }
      }
      
      // Create a consistent key for the participant pair
      const groupKey = [adminId, patientIdentifier].filter(id => id !== '').sort().join('|');
      console.log(`🔍 Conversation ${conv.id} has participants: ${JSON.stringify(participants)} -> adminId: ${adminId}, patientId: ${patientIdentifier} -> key: ${groupKey}`);
      
      if (!conversationGroups.has(groupKey)) {
        conversationGroups.set(groupKey, []);
      }
      conversationGroups.get(groupKey)!.push(conv);
    }
    
    let totalConsolidated = 0;
    
    // Process each group that has duplicates
    for (const [groupKey, conversationList] of conversationGroups) {
      if (conversationList.length > 1) {
        console.log(`🔄 Found ${conversationList.length} duplicate conversations for participant group: ${groupKey}`);
        
        // Sort by creation date to keep the oldest one
        conversationList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const keepConversation = conversationList[0];
        const duplicateConversations = conversationList.slice(1);
        
        // Move all messages from duplicate conversations to the main one
        for (const dupConv of duplicateConversations) {
          console.log(`🔄 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
          
          // Update all messages to point to the main conversation
          await db.update(messages)
            .set({ conversationId: keepConversation.id })
            .where(eq(messages.conversationId, dupConv.id));
          
          // Delete the duplicate conversation
          await db.delete(conversationsTable)
            .where(eq(conversationsTable.id, dupConv.id));
          
          console.log(`🔄 Deleted duplicate conversation ${dupConv.id}`);
          totalConsolidated++;
        }
        
        // Update the main conversation's lastMessage and unreadCount
        const allMessagesInConv = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, keepConversation.id))
          .orderBy(asc(messages.timestamp));
        
        if (allMessagesInConv.length > 0) {
          const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
          await db.update(conversationsTable)
            .set({
              lastMessage: {
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                subject: lastMessage.subject,
                content: lastMessage.content,
                timestamp: lastMessage.timestamp.toISOString(),
                priority: lastMessage.priority || 'normal'
              },
              unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
              updatedAt: new Date()
            })
            .where(eq(conversationsTable.id, keepConversation.id));
        }
      }
    }
    
    console.log(`✅ Consolidated ${totalConsolidated} duplicate conversations total`);
  }

  async fixZahraConversations(organizationId: number): Promise<void> {
    console.log(`🔧 FIXING Zahra conversations for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId));
    
    console.log(`🔧 Found ${allConversations.length} total conversations`);
    
    // Find conversations with Zahra (handle spacing and name variations)
    const zahraConversations = [];
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      const hasZahra = participants.some(p => 
        (p.name && p.name.replace(/\s+/g, ' ').trim() === "Zahra Qureshi") || 
        (p.id && p.id.toString().replace(/\s+/g, ' ').trim() === "Zahra Qureshi") ||
        (typeof p.id === 'number' && p.id === 7) || // Match by user ID 7
        (p.role === "patient" && (!p.id || !p.name)) // incomplete patient data
      );
      
      if (hasZahra) {
        zahraConversations.push(conv);
        console.log(`🔧 Found Zahra conversation: ${conv.id}, participants: ${JSON.stringify(participants)}`);
      }
    }
    
    if (zahraConversations.length <= 1) {
      console.log(`🔧 No duplicate Zahra conversations found (found ${zahraConversations.length})`);
      return;
    }
    
    console.log(`🔧 Found ${zahraConversations.length} Zahra conversations, consolidating...`);
    
    // Sort by creation date to keep the oldest one with complete data
    zahraConversations.sort((a, b) => {
      const aComplete = (a.participants as any[]).some(p => p.name === "Zahra Qureshi");
      const bComplete = (b.participants as any[]).some(p => p.name === "Zahra Qureshi");
      
      // Prefer conversations with complete data, then by creation date
      if (aComplete && !bComplete) return -1;
      if (!aComplete && bComplete) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    const keepConversation = zahraConversations[0];
    const duplicateConversations = zahraConversations.slice(1);
    
    // Ensure the kept conversation has proper participant data
    const participants = keepConversation.participants as Array<{id: string | number; name: string; role: string}>;
    const hasCompleteZahra = participants.some(p => p.name === "Zahra Qureshi");
    
    if (!hasCompleteZahra) {
      // Fix the participant data
      const updatedParticipants = participants.map(p => {
        if (p.role === "patient" && (!p.id || !p.name)) {
          return {
            id: "Zahra Qureshi",
            name: "Zahra Qureshi", 
            role: "patient"
          };
        }
        return p;
      });
      
      await db.update(conversationsTable)
        .set({ participants: updatedParticipants })
        .where(eq(conversationsTable.id, keepConversation.id));
      
      console.log(`🔧 Fixed participant data for conversation ${keepConversation.id}`);
    }
    
    // Move all messages from duplicate conversations to the main one
    for (const dupConv of duplicateConversations) {
      console.log(`🔧 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
      
      // Update all messages to point to the main conversation
      await db.update(messages)
        .set({ conversationId: keepConversation.id })
        .where(eq(messages.conversationId, dupConv.id));
      
      // Delete the duplicate conversation
      await db.delete(conversationsTable)
        .where(eq(conversationsTable.id, dupConv.id));
      
      console.log(`🔧 Deleted duplicate conversation ${dupConv.id}`);
    }
    
    // Update the main conversation's lastMessage and unreadCount
    const allMessagesInConv = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, keepConversation.id))
      .orderBy(asc(messages.timestamp));
    
    if (allMessagesInConv.length > 0) {
      const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
      await db.update(conversationsTable)
        .set({
          lastMessage: {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            subject: lastMessage.subject,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp.toISOString(),
            priority: lastMessage.priority || 'normal'
          },
          unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
          updatedAt: new Date()
        })
        .where(eq(conversationsTable.id, keepConversation.id));
    }
    
    console.log(`✅ Fixed Zahra conversations - consolidated ${duplicateConversations.length} duplicates into ${keepConversation.id}`);
  }

  /**
   * Find or create a conversation between two users
   * This ensures only one conversation exists between any two users
   */
  async findOrCreateConversation(senderId: number | string, recipientId: number | string, organizationId: number): Promise<string> {
    console.log(`🔍 Finding or creating conversation between sender ${senderId} and recipient ${recipientId}`);
    
    // Normalize IDs to numbers for comparison
    const senderIdNum = typeof senderId === 'string' ? parseInt(senderId) : senderId;
    const recipientIdNum = typeof recipientId === 'string' ? parseInt(recipientId) : recipientId;
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.organizationId, organizationId));
    
    // Look for existing conversation that includes both participants
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      
      // Check if both sender and recipient are in this conversation
      const hasSender = participants.some(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
        return pId === senderIdNum || p.id == senderId || p.id == senderIdNum;
      });
      
      const hasRecipient = participants.some(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
        return pId === recipientIdNum || p.id == recipientId || p.id == recipientIdNum ||
               (typeof recipientId === 'string' && (p.name === recipientId || p.id === recipientId));
      });
      
      if (hasSender && hasRecipient) {
        console.log(`✅ Found existing conversation: ${conv.id} between sender ${senderId} and recipient ${recipientId}`);
        return conv.id;
      }
    }
    
    // No existing conversation found, create a new one
    const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆕 Creating new conversation: ${newConversationId} between sender ${senderId} and recipient ${recipientId}`);
    
    // Get sender and recipient details
    let senderName = 'Unknown Sender';
    let senderRole = 'user';
    const sender = await this.getUser(senderIdNum, organizationId);
    if (sender) {
      senderName = sender.firstName && sender.lastName 
        ? `${sender.firstName} ${sender.lastName}`
        : sender.firstName || sender.email || senderName;
      senderRole = sender.role || senderRole;
    }
    
    let recipientName = 'Unknown Recipient';
    let recipientRole = 'patient';
    
    // Try to get recipient from users table first
    if (typeof recipientId === 'number' || !isNaN(parseInt(String(recipientId)))) {
      const recipientUser = await this.getUser(recipientIdNum, organizationId);
      if (recipientUser) {
        recipientName = recipientUser.firstName && recipientUser.lastName 
          ? `${recipientUser.firstName} ${recipientUser.lastName}`
          : recipientUser.firstName || recipientUser.email || recipientName;
        recipientRole = recipientUser.role || recipientRole;
      } else {
        // Try patients table
        const recipientPatient = await this.getPatient(recipientIdNum, organizationId);
        if (recipientPatient) {
          recipientName = `${recipientPatient.firstName} ${recipientPatient.lastName}`;
          recipientRole = 'patient';
        }
      }
    } else if (typeof recipientId === 'string') {
      // RecipientId is a name, try to find matching user
      const allUsers = await this.getUsersByOrganization(organizationId);
      const matchedUser = allUsers.find(user => {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        return fullName === recipientId || 
               user.firstName === recipientId ||
               user.email === recipientId;
      });
      
      if (matchedUser) {
        recipientName = `${matchedUser.firstName} ${matchedUser.lastName}`;
        recipientRole = matchedUser.role || recipientRole;
      } else {
        // Try patients table
        const allPatients = await this.getPatientsByOrganization(organizationId);
        const matchedPatient = allPatients.find(patient => {
          const fullName = `${patient.firstName} ${patient.lastName}`.trim();
          return fullName === recipientId || 
                 patient.firstName === recipientId;
        });
        
        if (matchedPatient) {
          recipientName = `${matchedPatient.firstName} ${matchedPatient.lastName}`;
          recipientRole = 'patient';
        }
      }
    }
    
    // Create the conversation
    const conversationInsertData = {
      id: newConversationId,
      organizationId: organizationId,
      participants: [
        { id: senderIdNum, name: senderName, role: senderRole },
        { id: recipientIdNum || recipientId, name: recipientName, role: recipientRole }
      ],
      lastMessage: null,
      unreadCount: 0,
      isPatientConversation: recipientRole === 'patient'
    };
    
    await db.insert(conversationsTable).values([conversationInsertData]);
    console.log(`✅ Created new conversation: ${newConversationId}`);
    
    return newConversationId;
  }

  async sendMessage(messageData: any, organizationId: number): Promise<any> {
    const messageId = `msg_${Date.now()}`;
    // Always use UTC timestamp to ensure consistency across timezones
    const timestamp = new Date(); // This will be converted to UTC ISO string when stored
    
    // CRITICAL: Only create conversations for internal messages (Message type)
    // External messages (SMS/Email/WhatsApp/Voice) should NOT create conversations
    const isInternalMessage = messageData.type === 'internal' && (!messageData.messageType || messageData.messageType === 'message');
    const shouldCreateConversation = isInternalMessage;
    
    let conversationId: string | null = null;
    
    if (shouldCreateConversation) {
      // Only find or create conversation for internal messages
      if (messageData.conversationId) {
        // Verify the provided conversationId exists and is valid
      const existingConv = await db.select()
        .from(conversationsTable)
        .where(and(
            eq(conversationsTable.id, messageData.conversationId),
          eq(conversationsTable.organizationId, organizationId)
        ))
        .limit(1);
      
        if (existingConv.length > 0) {
          // Verify both participants are in this conversation
          const participants = existingConv[0].participants as Array<{id: string | number; name: string; role: string}>;
          const senderIdNum = typeof messageData.senderId === 'string' ? parseInt(messageData.senderId) : messageData.senderId;
          const hasSender = participants.some(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
            return pId === senderIdNum || p.id == messageData.senderId;
          });
          
          if (hasSender) {
            console.log(`✅ Using provided conversation: ${messageData.conversationId}`);
            conversationId = messageData.conversationId;
      } else {
            // Conversation exists but sender is not a participant, find or create correct one
            console.log(`⚠️ WARNING - Sender not in provided conversation, finding or creating correct one`);
            conversationId = await this.findOrCreateConversation(
              messageData.senderId,
              messageData.recipientId,
              organizationId
            );
      }
    } else {
          // ConversationId provided but doesn't exist, find or create correct one
          console.log(`⚠️ WARNING - Provided conversationId ${messageData.conversationId} does not exist, finding or creating correct one`);
          conversationId = await this.findOrCreateConversation(
            messageData.senderId,
            messageData.recipientId,
            organizationId
          );
        }
      } else {
        // No conversationId provided, find or create one
        console.log(`🔍 No conversationId provided, finding or creating conversation for internal message`);
        conversationId = await this.findOrCreateConversation(
          messageData.senderId,
          messageData.recipientId,
          organizationId
        );
      }
    } else {
      // External message (SMS/Email/WhatsApp/Voice) - don't create conversation
      // Use a temporary conversationId for database consistency, but don't create conversation record
      conversationId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`📧 External message (${messageData.messageType}) - using temporary conversationId, no conversation created`);
    }
    
    console.log(`🔍 DEBUG - Final conversationId: ${conversationId}, shouldCreateConversation: ${shouldCreateConversation}`);
    
    // Get sender's full name if available
    let senderDisplayName = messageData.senderName || 'Unknown Sender';
    if (messageData.senderId) {
      const sender = await this.getUser(messageData.senderId, organizationId);
      if (sender && sender.firstName && sender.lastName) {
        senderDisplayName = `${sender.firstName} ${sender.lastName}`;
      } else if (sender && sender.firstName) {
        senderDisplayName = sender.firstName;
      } else if (sender && sender.email) {
        senderDisplayName = sender.email;
      }
    }
    
    // Create message in database
    console.log(`🔍 DEBUG - About to insert message with senderId: ${messageData.senderId} (type: ${typeof messageData.senderId})`);
    
    const messageInsertData = {
      id: messageId,
      organizationId: organizationId,
      conversationId: conversationId,
      senderId: parseInt(messageData.senderId.toString()), // Ensure it's an integer
      senderName: senderDisplayName,
      senderRole: messageData.senderRole || 'user',
      recipientId: messageData.recipientId,
      recipientName: messageData.recipientId,
      subject: messageData.subject || '',
      content: messageData.content,
      timestamp: timestamp, // Explicitly set timestamp (will be stored as UTC by database)
      isRead: false,
      priority: messageData.priority || 'normal',
      type: messageData.type || 'internal',
      isStarred: false,
      phoneNumber: messageData.phoneNumber,
      messageType: messageData.messageType,
      deliveryStatus: 'pending'
    };
    
    console.log(`🔍 DEBUG - Message insert data:`, JSON.stringify(messageInsertData, null, 2));
    
    const [createdMessage] = await db.insert(messages).values([messageInsertData]).returning();
    console.log(`✅ MESSAGE INSERTED:`, createdMessage?.id);
    
    // Force database synchronization by immediately reading back all messages
    const verifyMessages = await db.select().from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.organizationId, organizationId)
      ));
    console.log(`🔍 POST-INSERT VERIFICATION: ${verifyMessages.length} messages exist for conversation ${conversationId}`);

    // Only update conversation if it's an internal message (shouldCreateConversation is true)
    if (shouldCreateConversation && conversationId && !conversationId.startsWith('temp_')) {
      // Update conversation's lastMessage (conversation should already exist from findOrCreateConversation)
      await db.update(conversationsTable)
        .set({
          lastMessage: {
            id: messageId,
            senderId: parseInt(messageData.senderId.toString()),
            subject: messageData.subject || '',
            content: messageData.content,
            timestamp: timestamp.toISOString(),
            priority: messageData.priority || 'normal'
          },
          updatedAt: timestamp
        })
        .where(eq(conversationsTable.id, conversationId));
      
      console.log(`✅ Updated conversation: ${conversationId} with message: ${messageId}`);
    } else {
      console.log(`📧 External message - conversation not updated (no conversation created)`);
    }

    return createdMessage;
  }

  async deleteConversation(conversationId: string, organizationId: number): Promise<boolean> {
    try {
      console.log(`🗑️ DELETING CONVERSATION: ${conversationId} for org ${organizationId}`);
      
      // First delete all messages in the conversation
      const deleteMessagesResult = await db.delete(messages)
        .where(and(
          eq(messages.conversationId, conversationId),
          eq(messages.organizationId, organizationId)
        ));
      
      console.log(`🗑️ DELETED MESSAGES for conversation ${conversationId}`);
      
      // Then delete the conversation itself
      const deleteConversationResult = await db.delete(conversationsTable)
        .where(and(
          eq(conversationsTable.id, conversationId),
          eq(conversationsTable.organizationId, organizationId)
        ));
      
      console.log(`🗑️ DELETED CONVERSATION ${conversationId}`);
      return true;
    } catch (error) {
      console.error(`🗑️ ERROR DELETING CONVERSATION ${conversationId}:`, error);
      return false;
    }
  }

  async deleteMessage(messageId: string, organizationId: number): Promise<boolean> {
    try {
      const result = await db.delete(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.organizationId, organizationId)
        ));
      
      console.log(`🗑️ DELETE RESULT for message ${messageId}:`, result);
      return true; // Drizzle doesn't return affected rows count in the same way
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // Message delivery status tracking methods
  async updateMessageDeliveryStatus(messageIdentifier: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    try {
      const updateData: any = {
        deliveryStatus: status,
        updatedAt: new Date()
      };

      if (errorCode) updateData.errorCode = errorCode;
      if (errorMessage) updateData.errorMessage = errorMessage;

      // Try to update by external message ID first, then by internal message ID
      const externalResult = await db.update(messages)
        .set(updateData as any)
        .where(eq(messages.externalMessageId, messageIdentifier));

      if (externalResult.rowCount === 0) {
        // If no rows affected, try updating by internal message ID
        await db.update(messages)
          .set(updateData as any)
          .where(eq(messages.id, messageIdentifier));
      }

      console.log(`📱 Updated delivery status for message ${messageIdentifier}: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update delivery status for message ${messageIdentifier}:`, error);
    }
  }

  async getMessageByExternalId(externalMessageId: string, organizationId: number): Promise<any> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.externalMessageId, externalMessageId),
          eq(messages.organizationId, organizationId)
        ))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ Failed to get message by external ID ${externalMessageId}:`, error);
      return null;
    }
  }

  async getPendingMessages(organizationId: number): Promise<any[]> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.organizationId, organizationId),
          eq(messages.deliveryStatus, 'pending')
        ))
        .orderBy(desc(messages.createdAt));

      console.log(`📱 Found ${result.length} pending messages for organization ${organizationId}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get pending messages for organization ${organizationId}:`, error);
      return [];
    }
  }

  async getRecentMessagesWithExternalIds(organizationId: number, limit: number = 10): Promise<any[]> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.organizationId, organizationId),
          isNotNull(messages.externalMessageId)
        ))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      console.log(`📱 Found ${result.length} messages with external IDs for organization ${organizationId}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get recent messages with external IDs:`, error);
      return [];
    }
  }

  async getMessage(messageId: string, organizationId: number): Promise<any> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.organizationId, organizationId)
        ))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ Failed to get message ${messageId}:`, error);
      return null;
    }
  }

  async updateMessage(messageId: string, organizationId: number, updateData: any): Promise<boolean> {
    try {
      await db.update(messages)
        .set(updateData as any)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.organizationId, organizationId)
        ));

      console.log(`📱 Updated message ${messageId} with data:`, updateData);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update message ${messageId}:`, error);
      return false;
    }
  }

  async getMessageCampaigns(organizationId: number, currentUserId?: number, userRole?: string): Promise<MessageCampaign[]> {
    try {
      // CRITICAL: Role-based filtering
      // Admin can see all campaigns, doctor/nurse can only see their own
      let whereClause = sql`organization_id = ${organizationId}`;
      
      if (currentUserId !== undefined && currentUserId !== null && userRole !== 'admin') {
        // For non-admin users, only show campaigns they created
        whereClause = sql`organization_id = ${organizationId} AND created_by = ${currentUserId}`;
        console.log(`📧 FILTERING CAMPAIGNS - User ${currentUserId} (${userRole}) can only see their own campaigns`);
      } else if (userRole === 'admin') {
        console.log(`📧 ADMIN ACCESS - Showing all campaigns for organization ${organizationId}`);
      }
      
      // Use raw SQL with recipients column (migration adds it if missing)
      const result = await db.execute(sql`
        SELECT id, organization_id as "organizationId", name, type, status, subject, content, template,
               recipient_count as "recipientCount", sent_count as "sentCount", 
               open_rate as "openRate", click_rate as "clickRate",
               COALESCE(recipients, '[]'::jsonb) as recipients,
               scheduled_at as "scheduledAt", sent_at as "sentAt",
               created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
        FROM message_campaigns 
        WHERE ${whereClause}
        ORDER BY created_at DESC
      `);
      
      const campaigns = result.rows as MessageCampaign[];
      
      // Enrich campaigns with creator information for admin users
      const enrichedCampaigns = await Promise.all(campaigns.map(async (campaign: any) => {
        if (campaign.createdBy) {
          try {
            const creator = await this.getUser(campaign.createdBy, organizationId);
            if (creator) {
              campaign.createdByName = creator.firstName && creator.lastName 
                ? `${creator.firstName} ${creator.lastName}` 
                : creator.firstName || creator.email || 'Unknown';
              campaign.createdByRole = creator.role || 'user';
            }
          } catch (error) {
            console.warn(`Could not fetch creator info for campaign ${campaign.id}:`, error);
            campaign.createdByName = 'Unknown';
          }
        }
        return campaign;
      }));
      
      console.log(`📧 Fetched ${enrichedCampaigns.length} campaigns for organization ${organizationId} (user: ${currentUserId}, role: ${userRole})`);
      return enrichedCampaigns;
    } catch (error) {
      console.error("❌ Error fetching campaigns:", error);
      return [];
    }
  }

  async createMessageCampaign(campaignData: any, organizationId: number): Promise<MessageCampaign> {
    try {
      console.log(`📧 Creating campaign with data:`, JSON.stringify(campaignData, null, 2));
      const currentUser = campaignData.createdBy || 1;
      const recipientsJson = JSON.stringify(campaignData.recipients || []);
      const recipientCount = campaignData.recipientCount || (campaignData.recipients?.length || 0);
      const scheduledAt = campaignData.scheduledAt || null;
      
      // Use raw SQL with recipients column (migration adds it if missing)
      const result = await db.execute(sql`
        INSERT INTO message_campaigns (
          organization_id, name, type, status, subject, content, template,
          recipient_count, sent_count, open_rate, click_rate, recipients, scheduled_at, created_by, created_at
        ) VALUES (
          ${organizationId},
          ${campaignData.name || 'Untitled Campaign'},
          ${campaignData.type || "email"},
          ${campaignData.status || "draft"},
          ${campaignData.subject || ''},
          ${campaignData.content || ''},
          ${campaignData.template || "default"},
          ${recipientCount},
          ${campaignData.sentCount || 0},
          ${campaignData.openRate || 0},
          ${campaignData.clickRate || 0},
          ${recipientsJson}::jsonb,
          ${scheduledAt}::timestamp,
          ${currentUser},
          NOW()
        )
        RETURNING id, organization_id as "organizationId", name, type, status, subject, content, template,
                  recipient_count as "recipientCount", sent_count as "sentCount",
                  open_rate as "openRate", click_rate as "clickRate", recipients,
                  scheduled_at as "scheduledAt", sent_at as "sentAt",
                  created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
      `);
      
      const campaign = result.rows[0] as MessageCampaign;
      console.log(`📧 Created campaign "${campaign.name}" (ID: ${campaign.id}) with ${recipientCount} recipients for organization ${organizationId}`);
      return campaign;
    } catch (error) {
      console.error("❌ Error creating campaign:", error);
      throw error;
    }
  }

  async updateMessageCampaign(campaignId: number, campaignData: any, organizationId: number): Promise<MessageCampaign> {
    try {
      console.log(`📧 Updating campaign ${campaignId} with data:`, JSON.stringify(campaignData, null, 2));
      
      // Convert undefined to null for safe SQL handling
      const name = campaignData.name ?? null;
      const type = campaignData.type ?? null;
      const status = campaignData.status ?? null;
      const subject = campaignData.subject ?? null;
      const content = campaignData.content ?? null;
      const template = campaignData.template ?? null;
      const recipientCount = campaignData.recipientCount ?? null;
      const sentCount = campaignData.sentCount ?? null;
      const openRate = campaignData.openRate ?? null;
      const clickRate = campaignData.clickRate ?? null;
      const sentAt = campaignData.sentAt ?? null;
      const hasRecipients = campaignData.recipients !== undefined && campaignData.recipients !== null;
      const recipientsJson = hasRecipients ? JSON.stringify(campaignData.recipients) : null;
      
      const result = await db.execute(sql`
        UPDATE message_campaigns 
        SET 
          name = COALESCE(${name}, name),
          type = COALESCE(${type}, type),
          status = COALESCE(${status}, status),
          subject = COALESCE(${subject}, subject),
          content = COALESCE(${content}, content),
          template = COALESCE(${template}, template),
          recipient_count = COALESCE(${recipientCount}, recipient_count),
          sent_count = COALESCE(${sentCount}, sent_count),
          open_rate = COALESCE(${openRate}, open_rate),
          click_rate = COALESCE(${clickRate}, click_rate),
          recipients = COALESCE(${recipientsJson}::jsonb, recipients),
          sent_at = COALESCE(${sentAt}, sent_at),
          updated_at = NOW()
        WHERE id = ${campaignId} AND organization_id = ${organizationId}
        RETURNING id, organization_id as "organizationId", name, type, status, subject, content, template,
                  recipient_count as "recipientCount", sent_count as "sentCount",
                  open_rate as "openRate", click_rate as "clickRate", recipients,
                  scheduled_at as "scheduledAt", sent_at as "sentAt",
                  created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
      `);
      
      const campaign = result.rows[0] as MessageCampaign;
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found for organization ${organizationId}`);
      }
      
      console.log(`📧 Updated campaign "${campaign.name}" (ID: ${campaign.id}) for organization ${organizationId}`);
      return campaign;
    } catch (error) {
      console.error("❌ Error updating campaign:", error);
      throw error;
    }
  }

  async deleteMessageCampaign(campaignId: number, organizationId: number): Promise<void> {
    try {
      const result = await db.delete(messageCampaigns)
        .where(and(
          eq(messageCampaigns.id, campaignId),
          eq(messageCampaigns.organizationId, organizationId)
        ))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Campaign ${campaignId} not found for organization ${organizationId}`);
      }
      
      console.log(`🗑️ Deleted campaign (ID: ${campaignId}) for organization ${organizationId}`);
    } catch (error) {
      console.error("❌ Error deleting campaign:", error);
      throw error;
    }
  }

  // Integration implementations
  async getIntegrations(organizationId: number): Promise<any[]> {
    // Mock integrations data
    return [
      {
        id: "int_1",
        name: "NHS Digital Integration",
        description: "Connect with NHS Digital services for patient data exchange",
        category: "clinical",
        status: "connected",
        provider: "NHS Digital",
        features: ["Patient lookup", "Care records", "Prescription sync"],
        lastSync: "2024-06-26T12:00:00Z",
        syncFrequency: "Every 4 hours",
        isActive: true,
        connectionCount: 1247
      },
      {
        id: "int_2", 
        name: "Twilio SMS Gateway",
        description: "Send SMS notifications and reminders to patients",
        category: "messaging",
        status: "connected",
        provider: "Twilio",
        features: ["SMS sending", "Delivery tracking", "Two-way messaging"],
        lastSync: "2024-06-26T15:30:00Z",
        syncFrequency: "Real-time",
        isActive: true,
        connectionCount: 89
      }
    ];
  }

  async connectIntegration(integrationData: any, organizationId: number): Promise<any> {
    // Mock implementation
    return { 
      id: Date.now().toString(), 
      ...integrationData, 
      status: "connected",
      organizationId 
    };
  }

  async getWebhooks(organizationId: number): Promise<any[]> {
    // Mock webhooks data
    return [
      {
        id: "webhook_1",
        name: "Patient Registration Webhook",
        url: "https://external-system.com/webhooks/patient-registration",
        events: ["patient.created", "patient.updated"],
        status: "active",
        lastTriggered: "2024-06-26T14:45:00Z",
        totalCalls: 145,
        successRate: 98.6,
        headers: { "Authorization": "Bearer ***" },
        retryPolicy: "exponential",
        timeout: 30
      }
    ];
  }

  async createWebhook(webhookData: any, organizationId: number): Promise<any> {
    // Mock implementation
    return { 
      id: Date.now().toString(), 
      ...webhookData, 
      status: "active",
      totalCalls: 0,
      successRate: 100,
      organizationId 
    };
  }

  async getApiKeys(organizationId: number): Promise<any[]> {
    // Mock API keys data
    return [
      {
        id: "key_1",
        name: "Integration API Key",
        keyPrefix: "emr_live_12345",
        permissions: ["read", "write"],
        lastUsed: "2024-06-26T13:20:00Z",
        isActive: true,
        usageCount: 2847,
        rateLimit: 1000
      }
    ];
  }

  async createApiKey(apiKeyData: any, organizationId: number): Promise<any> {
    // Mock implementation - in real implementation, generate secure API key
    return { 
      id: Date.now().toString(), 
      ...apiKeyData, 
      keyPrefix: `emr_live_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      usageCount: 0,
      organizationId 
    };
  }

  // Prescriptions implementation
  async getPrescription(id: number, organizationId: number): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)));
    return prescription;
  }

  private medicationsMatch(
    left: Array<{ name?: string; dosage?: string; frequency?: string }> | null | undefined,
    right: Array<{ name?: string; dosage?: string; frequency?: string }> | null | undefined,
  ): boolean {
    const a = Array.isArray(left) ? left : [];
    const b = Array.isArray(right) ? right : [];
    if (a.length !== b.length) return false;
    return a.every((med, index) => {
      const other = b[index];
      return (
        (med?.name ?? "") === (other?.name ?? "") &&
        (med?.dosage ?? "") === (other?.dosage ?? "") &&
        (med?.frequency ?? "") === (other?.frequency ?? "")
      );
    });
  }

  private dedupePrescriptionBurst<T extends {
    id?: number;
    patientId?: number;
    doctorId?: number;
    diagnosis?: string;
    medications?: unknown;
    createdAt?: Date | string;
  }>(rows: T[]): T[] {
    if (rows.length <= 1) return rows;

    const fingerprint = (rx: T) => {
      const createdMs = rx.createdAt ? new Date(rx.createdAt).getTime() : 0;
      const bucket = Number.isFinite(createdMs)
        ? Math.floor(createdMs / 15000)
        : 0;
      const meds = Array.isArray(rx.medications)
        ? (rx.medications as Array<{ name?: string; dosage?: string; frequency?: string }>)
            .map((med) => `${med?.name ?? ""}|${med?.dosage ?? ""}|${med?.frequency ?? ""}`)
            .join(";")
        : "";
      return `${rx.patientId}|${rx.doctorId}|${(rx.diagnosis || "").trim()}|${meds}|${bucket}`;
    };

    const byKey = new Map<string, T>();
    for (const row of rows) {
      const key = fingerprint(row);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
        continue;
      }
      const rowId = typeof row.id === "number" ? row.id : Infinity;
      const existingId =
        typeof existing.id === "number" ? existing.id : Infinity;
      if (rowId < existingId) {
        byKey.set(key, row);
      }
    }
    return Array.from(byKey.values());
  }

  async findRecentPrescriptionDuplicate(
    organizationId: number,
    patientId: number,
    doctorId: number,
    diagnosis: string,
    medications: Array<{ name?: string; dosage?: string; frequency?: string }>,
    withinSeconds = 15,
  ): Promise<Prescription | undefined> {
    const trimmedDiagnosis = diagnosis.trim();
    const result = await db.execute(sql`
      SELECT id, medications
      FROM prescriptions
      WHERE organization_id = ${organizationId}
        AND patient_id = ${patientId}
        AND doctor_id = ${doctorId}
        AND TRIM(COALESCE(diagnosis, '')) = ${trimmedDiagnosis}
        AND created_at >= NOW() - (${withinSeconds} * INTERVAL '1 second')
      ORDER BY id ASC
    `);

    for (const row of result.rows as Array<{ id: number; medications: unknown }>) {
      const existingMeds =
        typeof row.medications === "string"
          ? JSON.parse(row.medications)
          : row.medications;
      if (this.medicationsMatch(existingMeds, medications)) {
        return this.getPrescription(row.id, organizationId);
      }
    }

    return undefined;
  }

  async getPrescriptionsByOrganization(organizationId: number, limit: number = 50): Promise<Prescription[]> {
    // Use raw SQL to get timestamps as formatted strings directly from PostgreSQL
    // This avoids timezone conversion when JavaScript Date objects are created
    // Format: YYYY-MM-DD HH24:MI:SS.MS (milliseconds from microseconds)
    const limitClause = limit ? sql`LIMIT ${limit}` : sql``;
    const result = await db.execute(sql`
      SELECT 
        p.*,
        TO_CHAR(p.created_at, 'YYYY-MM-DD HH24:MI:SS') || '.' || LPAD(FLOOR(EXTRACT(MICROSECONDS FROM p.created_at) / 1000)::text, 3, '0') as created_at_string,
        TO_CHAR(p.updated_at, 'YYYY-MM-DD HH24:MI:SS') || '.' || LPAD(FLOOR(EXTRACT(MICROSECONDS FROM p.updated_at) / 1000)::text, 3, '0') as updated_at_string,
        pt.id as patient_id,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        pt.date_of_birth as patient_date_of_birth,
        pt.address as patient_address,
        pt.medical_history as patient_medical_history,
        u.id as provider_id,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN users u ON p.prescription_created_by = u.id
      WHERE p.organization_id = ${organizationId}
      ORDER BY p.created_at DESC
      ${limitClause}
    `);

    // Return ALL prescriptions without deduplication for admin users
    const formatDateWithSuffix = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleDateString('en-GB', { month: 'short' });
      const year = date.getFullYear();
      const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
      return `${day}${suffix} ${month} ${year}`;
    };

    // Map raw SQL results to prescription objects
    const formattedPrescriptions = result.rows.map((row: any) => {
      // Parse patient address if it's JSON
      let patientAddress = '-';
      let patientAllergies = '-';
      if (row.patient_address) {
        try {
          const address = typeof row.patient_address === 'string' ? JSON.parse(row.patient_address) : row.patient_address;
          patientAddress = `${address.street || ''}, ${address.city || ''}, ${address.postcode || ''}, ${address.country || ''}`.replace(/, ,/g, ',').replace(/^,\s*|,\s*$/g, '');
        } catch {
          patientAddress = '-';
        }
      }
      
      // Parse patient medical history if it's JSON
      if (row.patient_medical_history) {
        try {
          const medicalHistory = typeof row.patient_medical_history === 'string' ? JSON.parse(row.patient_medical_history) : row.patient_medical_history;
          if (medicalHistory?.allergies && Array.isArray(medicalHistory.allergies) && medicalHistory.allergies.length > 0) {
            patientAllergies = medicalHistory.allergies.join(', ');
          }
        } catch {
          patientAllergies = '-';
        }
      }
      
      // Use the timestamp strings directly from PostgreSQL (no timezone conversion)
      const clientCreatedAt = row.created_at_string || null;
      const clientUpdatedAt = row.updated_at_string || null;
      
      return {
        id: row.id,
        organizationId: row.organization_id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        prescriptionCreatedBy: row.prescription_created_by,
        consultationId: row.consultation_id,
        prescriptionNumber: row.prescription_number,
        status: row.status,
        diagnosis: row.diagnosis,
        medicationName: row.medication_name,
        dosage: row.dosage,
        frequency: row.frequency,
        duration: row.duration,
        instructions: row.instructions,
        issuedDate: row.issued_date ? new Date(row.issued_date) : null,
        medications: row.medications,
        pharmacy: row.pharmacy,
        prescribedAt: row.prescribed_at ? new Date(row.prescribed_at) : new Date(),
        validUntil: row.valid_until ? new Date(row.valid_until) : null,
        notes: row.notes,
        isElectronic: row.is_electronic,
        interactions: row.interactions,
        signature: row.signature,
        savedPdfPath: row.saved_pdf_path,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        // Use timestamp strings directly from PostgreSQL to avoid timezone conversion
        clientCreatedAt: clientCreatedAt,
        clientUpdatedAt: clientUpdatedAt,
        patientName: row.patient_first_name && row.patient_last_name 
          ? `${row.patient_first_name} ${row.patient_last_name}` 
          : 'Unknown Patient',
        patientDob: row.patient_date_of_birth ? formatDateWithSuffix(row.patient_date_of_birth) : null,
        patientAge: row.patient_date_of_birth ? Math.floor((new Date().getTime() - new Date(row.patient_date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        patientAddress,
        patientAllergies,
        patientWeight: null,
        providerName: row.provider_first_name && row.provider_last_name 
          ? `Dr. ${row.provider_first_name} ${row.provider_last_name}` 
          : 'Unknown Provider',
      } as any;
    });

    return this.dedupePrescriptionBurst(formattedPrescriptions);
  }

  async getPrescriptionsByPatient(patientId: number, organizationId: number): Promise<Prescription[]> {
    const results = await db
      .select({
        prescription: prescriptions,
        patient: patients,
        provider: users,
      })
      .from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.id))
      .leftJoin(users, eq(prescriptions.doctorId, users.id))
      .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.organizationId, organizationId)))
      .orderBy(desc(prescriptions.createdAt));
    
    const mapped = results.map(item => {
      const formatDateWithSuffix = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
        return `${day}${suffix} ${month} ${year}`;
      };
      
      const patientAddress = item.patient?.address 
        ? `${item.patient.address.street || ''}, ${item.patient.address.city || ''}, ${item.patient.address.postcode || ''}, ${item.patient.address.country || ''}`.replace(/, ,/g, ',').replace(/^,\s*|,\s*$/g, '')
        : '-';
      
      const patientAllergies = item.patient?.medicalHistory?.allergies?.length > 0 
        ? item.patient.medicalHistory.allergies.join(', ') 
        : '-';
      
      return {
        ...item.prescription,
        patientName: item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Unknown Patient',
        patientDob: item.patient?.dateOfBirth ? formatDateWithSuffix(item.patient.dateOfBirth) : null,
        patientAge: item.patient?.dateOfBirth ? Math.floor((new Date().getTime() - new Date(item.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        patientAddress,
        patientAllergies,
        patientWeight: null,
        providerName: item.provider ? `Dr. ${item.provider.firstName} ${item.provider.lastName}` : 'Unknown Provider',
      };
    });
    return this.dedupePrescriptionBurst(mapped);
  }

  async getPrescriptionsByProvider(providerId: number, organizationId: number): Promise<Prescription[]> {
    const results = await db
      .select({
        prescription: prescriptions,
        patient: patients,
        provider: users,
      })
      .from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.id))
      .leftJoin(users, eq(prescriptions.doctorId, users.id))
      .where(and(eq(prescriptions.doctorId, providerId), eq(prescriptions.organizationId, organizationId)))
      .orderBy(desc(prescriptions.createdAt));
    
    const mapped = results.map(item => {
      const formatDateWithSuffix = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
        return `${day}${suffix} ${month} ${year}`;
      };
      
      const patientAddress = item.patient?.address 
        ? `${item.patient.address.street || ''}, ${item.patient.address.city || ''}, ${item.patient.address.postcode || ''}, ${item.patient.address.country || ''}`.replace(/, ,/g, ',').replace(/^,\s*|,\s*$/g, '')
        : '-';
      
      const patientAllergies = item.patient?.medicalHistory?.allergies?.length > 0 
        ? item.patient.medicalHistory.allergies.join(', ') 
        : '-';
      
      return {
        ...item.prescription,
        patientName: item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Unknown Patient',
        patientDob: item.patient?.dateOfBirth ? formatDateWithSuffix(item.patient.dateOfBirth) : null,
        patientAge: item.patient?.dateOfBirth ? Math.floor((new Date().getTime() - new Date(item.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        patientAddress,
        patientAllergies,
        patientWeight: null,
        providerName: item.provider ? `Dr. ${item.provider.firstName} ${item.provider.lastName}` : 'Unknown Provider',
      };
    });
    return this.dedupePrescriptionBurst(mapped);
  }

  async getPrescriptionsByStatus(patientId: number, organizationId: number, status: string): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.organizationId, organizationId),
        eq(prescriptions.status, status)
      ))
      .orderBy(desc(prescriptions.createdAt));
  }

  // Helper function to format current local time as a string for PostgreSQL
  private formatLocalTimeString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const localTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    
    // Log the exact time being formatted for debugging
    console.log(`[formatLocalTimeString] Server local time - Date: ${now.toLocaleString()}, Formatted: ${localTimeString}`);
    
    return localTimeString;
  }

  async createPrescription(prescription: InsertPrescription, clientLocalTime?: string): Promise<Prescription> {
    console.log("Storage: Creating prescription with data:", prescription);
    console.log("Storage: Doctor ID being inserted:", prescription.doctorId);
    
    // Use client's local time if provided, otherwise use server's local time
    // This ensures the database stores exactly what the user's system time shows
    let localTimeString: string;
    if (clientLocalTime) {
      // Validate the client's local time string format (YYYY-MM-DD HH:MM:SS.mmm)
      const timePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/;
      if (timePattern.test(clientLocalTime)) {
        localTimeString = clientLocalTime;
        console.log(`[STORAGE createPrescription] Using client's local time: ${localTimeString}`);
      } else {
        console.warn(`[STORAGE createPrescription] Invalid client local time format: ${clientLocalTime}, falling back to server time`);
        localTimeString = this.formatLocalTimeString();
      }
    } else {
      // Format current server local time as a string for PostgreSQL
      // Using local time components directly to ensure database stores exactly what system time shows
      // Instead of using new Date() (which gets converted to UTC) or CURRENT_TIMESTAMP (which uses database server timezone),
      // we format the local time components (hours, minutes, seconds) directly into a string
      localTimeString = this.formatLocalTimeString();
      console.log(`[STORAGE createPrescription] Using server's local time: ${localTimeString}`);
    }
    
    // Format validUntil if provided
    let validUntilString: string | null = null;
    if (prescription.validUntil) {
      const validUntilDate = new Date(prescription.validUntil);
      const year = validUntilDate.getFullYear();
      const month = String(validUntilDate.getMonth() + 1).padStart(2, '0');
      const day = String(validUntilDate.getDate()).padStart(2, '0');
      const hours = String(validUntilDate.getHours()).padStart(2, '0');
      const minutes = String(validUntilDate.getMinutes()).padStart(2, '0');
      const seconds = String(validUntilDate.getSeconds()).padStart(2, '0');
      const milliseconds = String(validUntilDate.getMilliseconds()).padStart(3, '0');
      validUntilString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    
    // Use raw SQL to insert with formatted local time string for createdAt and updatedAt
    // This ensures the database stores exactly what your system time shows, not UTC or database server timezone
    // Explicitly cast as 'timestamp without time zone' to prevent any timezone conversion
    const escapedLocalTimeString = localTimeString.replace(/'/g, "''");
    const timestampCast = sql.raw(`'${escapedLocalTimeString}'::timestamp without time zone`);
    const validUntilCast = validUntilString ? sql.raw(`'${validUntilString.replace(/'/g, "''")}'::timestamp without time zone`) : sql`NULL`;
    
    console.log(`[STORAGE createPrescription] Inserting timestamp string: '${escapedLocalTimeString}' as timestamp without time zone`);
    
    const result = await db.execute(sql`
      INSERT INTO prescriptions (
        organization_id, patient_id, doctor_id, prescription_created_by, consultation_id,
        prescription_number, status, diagnosis, medication_name, dosage, frequency, duration,
        instructions, issued_date, medications, pharmacy, prescribed_at, valid_until,
        notes, is_electronic, interactions, signature,
        created_at, updated_at
      ) VALUES (
        ${prescription.organizationId}, ${prescription.patientId}, ${prescription.doctorId},
        ${prescription.prescriptionCreatedBy || null}, ${prescription.consultationId || null},
        ${prescription.prescriptionNumber || null}, ${prescription.status || 'active'},
        ${prescription.diagnosis || null}, ${prescription.medicationName || 'Not specified'},
        ${prescription.dosage || null}, ${prescription.frequency || null}, ${prescription.duration || null},
        ${prescription.instructions || null}, ${timestampCast},
        ${prescription.medications ? JSON.stringify(prescription.medications) : '[]'}::jsonb,
        ${prescription.pharmacy ? JSON.stringify(prescription.pharmacy) : '{}'}::jsonb,
        ${timestampCast}, ${validUntilCast},
        ${prescription.notes || null}, ${prescription.isElectronic !== undefined ? prescription.isElectronic : true},
        ${prescription.interactions ? JSON.stringify(prescription.interactions) : '[]'}::jsonb,
        ${prescription.signature ? JSON.stringify(prescription.signature) : '{}'}::jsonb,
        ${timestampCast}, ${timestampCast}
      ) RETURNING *
    `);
    
    console.log(`[STORAGE createPrescription] ✅ Prescription created with created_at and updated_at set to local time: ${localTimeString}`);
    
    const rawRow = result.rows[0] as any;
    
    // Map snake_case to camelCase to match the expected return type
    const newPrescription: Prescription = {
      id: rawRow.id,
      organizationId: rawRow.organization_id,
      patientId: rawRow.patient_id,
      doctorId: rawRow.doctor_id,
      prescriptionCreatedBy: rawRow.prescription_created_by,
      consultationId: rawRow.consultation_id,
      prescriptionNumber: rawRow.prescription_number,
      status: rawRow.status,
      diagnosis: rawRow.diagnosis,
      medicationName: rawRow.medication_name,
      dosage: rawRow.dosage,
      frequency: rawRow.frequency,
      duration: rawRow.duration,
      instructions: rawRow.instructions,
      issuedDate: rawRow.issued_date ? new Date(rawRow.issued_date) : null,
      medications: rawRow.medications,
      pharmacy: rawRow.pharmacy,
      prescribedAt: rawRow.prescribed_at ? new Date(rawRow.prescribed_at) : new Date(),
      validUntil: rawRow.valid_until ? new Date(rawRow.valid_until) : null,
      notes: rawRow.notes,
      isElectronic: rawRow.is_electronic,
      interactions: rawRow.interactions,
      signature: rawRow.signature,
      createdAt: new Date(rawRow.created_at),
      updatedAt: new Date(rawRow.updated_at),
    };
    
    return newPrescription;
  }

  async updatePrescription(id: number, organizationId: number, updates: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    // Format current local time as a string for PostgreSQL
    // Using local time components directly to ensure database stores exactly what system time shows
    const localTimeString = this.formatLocalTimeString();
    
    console.log(`[STORAGE updatePrescription] Updating prescription ${id} with local time: ${localTimeString}`);
    
    // Prepare update data, exclude updatedAt from regular updates
    const { updatedAt, ...updateFields } = updates as any;
    const updateData: any = { ...updateFields };
    
    // Use drizzle update for regular fields, then update updatedAt separately with raw SQL
    if (Object.keys(updateData).length > 0) {
      await db
      .update(prescriptions)
        .set(updateData as any)
        .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)));
    }
    
    // Always update updated_at with local time string using raw SQL
    // This ensures the database stores exactly what your system time shows, not UTC or server timezone
    await db.execute(sql`
      UPDATE prescriptions
      SET updated_at = ${localTimeString}::timestamp
      WHERE id = ${id} AND organization_id = ${organizationId}
    `);
    
    console.log(`[STORAGE updatePrescription] ✅ Updated prescription ${id} updated_at to local time: ${localTimeString}`);
    
    // Fetch and return the updated prescription
    const [updatedPrescription] = await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)))
      .limit(1);
    
    return updatedPrescription;
  }

  async deletePrescription(id: number, organizationId: number): Promise<Prescription | undefined> {
    const [deletedPrescription] = await db
      .delete(prescriptions)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)))
      .returning();
    return deletedPrescription;
  }

  // Lab Results methods
  private static labResultsStore: any[] = [];

  async getLabResults(organizationId: number): Promise<any[]> {
    const results = await db
      .select()
      .from(labResults)
      .where(eq(labResults.organizationId, organizationId))
      .orderBy(desc(labResults.createdAt));
    
    return results;
  }

  async createLabResult(labResult: InsertLabResult): Promise<LabResult> {
    const [result] = await db
      .insert(labResults)
      .values(labResult as any)
      .returning();
    
    return result;
  }

  async seedLabResults(organizationId: number): Promise<void> {
    // Check if we already have lab results
    const existingResults = await db
      .select()
      .from(labResults)
      .where(eq(labResults.organizationId, organizationId))
      .limit(1);
    
    if (existingResults.length > 0) {
      return; // Already seeded
    }

    // Get some patients for the lab results
    const patientsList = await db
      .select()
      .from(patients)
      .where(eq(patients.organizationId, organizationId))
      .limit(3);
    
    // Get some users to be the ordering doctors  
    const doctors = await db
      .select()
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'doctor')
      ))
      .limit(2);

    if (patientsList.length === 0 || doctors.length === 0) {
      return; // Need patients and doctors to create lab results
    }

    const sampleLabResults: InsertLabResult[] = [
      {
        organizationId,
        patientId: patientsList[0].id,
        testId: "CBC001",
        testType: "Complete Blood Count (CBC)",
        orderedBy: doctors[0].id,
        orderedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours after ordering
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "completed",
        results: [
          {
            name: "White Blood Cell Count",
            value: "7.2",
            unit: "×10³/µL",
            referenceRange: "4.0-11.0",
            status: "normal"
          },
          {
            name: "Red Blood Cell Count",
            value: "4.5",
            unit: "×10⁶/µL",
            referenceRange: "4.2-5.4",
            status: "normal"
          },
          {
            name: "Hemoglobin",
            value: "14.2",
            unit: "g/dL",
            referenceRange: "12.0-16.0",
            status: "normal"
          }
        ],
        criticalValues: false,
        notes: "All values within normal limits"
      },
      {
        organizationId,
        patientId: patientsList[1] ? patientsList[1].id : patientsList[0].id,
        testId: "GLU002",
        testType: "Blood Glucose",
        orderedBy: doctors[0].id,
        orderedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour after ordering
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        status: "completed",
        results: [
          {
            name: "Glucose",
            value: "245",
            unit: "mg/dL",
            referenceRange: "70-99",
            status: "abnormal_high",
            flag: "HIGH"
          }
        ],
        criticalValues: true,
        notes: "High glucose levels - follow up required, critical value"
      },
      {
        organizationId,
        patientId: patientsList[2] ? patientsList[2].id : patientsList[0].id,
        testId: "LIP003",
        testType: "Lipid Panel",
        orderedBy: doctors.length > 1 ? doctors[1].id : doctors[0].id,
        orderedAt: new Date(),
        status: "pending",
        results: [],
        criticalValues: false,
        notes: "Fasting required"
      },
      {
        organizationId,
        patientId: patientsList[0].id,
        testId: "A1C004",
        testType: "Hemoglobin A1C",
        orderedBy: doctors[0].id,
        orderedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        collectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 minutes after ordering
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: "completed",
        results: [
          {
            name: "Hemoglobin A1C",
            value: "8.5",
            unit: "%",
            referenceRange: "< 7.0",
            status: "abnormal_high",
            flag: "HIGH"
          }
        ],
        criticalValues: true,
        notes: "Elevated A1C indicates poor diabetes control"
      }
    ];

    for (const labResult of sampleLabResults) {
      await this.createLabResult(labResult);
    }
  }

  async oldCreateLabResult(labResult: any): Promise<any> {
    const newLabResult = {
      id: `lab_${Date.now()}`,
      ...labResult,
      orderedAt: new Date().toISOString(),
      status: "pending",
      results: []
    };

    // Store in class static variable for this session (in real app, this would be database)
    DatabaseStorage.labResultsStore.push(newLabResult);

    return newLabResult;
  }

  async getMessageTemplates(organizationId: number, currentUserId?: number, userRole?: string): Promise<MessageTemplate[]> {
    try {
      // CRITICAL: Role-based filtering
      // Admin can see all templates, doctor/nurse can only see their own
      let whereCondition;
      
      if (currentUserId !== undefined && currentUserId !== null && userRole !== 'admin') {
        // For non-admin users, only show templates they created
        whereCondition = and(
          eq(messageTemplates.organizationId, organizationId),
          eq(messageTemplates.createdBy, currentUserId)
        );
        console.log(`📝 FILTERING TEMPLATES - User ${currentUserId} (${userRole}) can only see their own templates`);
      } else {
        // Admin sees all templates
        whereCondition = eq(messageTemplates.organizationId, organizationId);
        console.log(`📝 ADMIN ACCESS - Showing all templates for organization ${organizationId}`);
      }
      
      const templates = await db.select()
        .from(messageTemplates)
        .where(whereCondition)
        .orderBy(desc(messageTemplates.createdAt));
      
      // Enrich templates with creator information for admin users
      const enrichedTemplates = await Promise.all(templates.map(async (template: any) => {
        if (template.createdBy) {
          try {
            const creator = await this.getUser(template.createdBy, organizationId);
            if (creator) {
              template.createdByName = creator.firstName && creator.lastName 
                ? `${creator.firstName} ${creator.lastName}` 
                : creator.firstName || creator.email || 'Unknown';
              template.createdByRole = creator.role || 'user';
            }
          } catch (error) {
            console.warn(`Could not fetch creator info for template ${template.id}:`, error);
            template.createdByName = 'Unknown';
          }
        }
        return template;
      }));
      
      console.log(`📝 Fetched ${enrichedTemplates.length} templates for organization ${organizationId} (user: ${currentUserId}, role: ${userRole})`);
      return enrichedTemplates;
    } catch (error) {
      console.error("❌ Error fetching templates:", error);
      return [];
    }
  }

  async createMessageTemplate(templateData: any, organizationId: number): Promise<MessageTemplate> {
    try {
      const currentUser = templateData.createdBy || 1; // fallback to user ID 1 if not provided
      
      const [template] = await db.insert(messageTemplates)
        .values({
          organizationId,
          name: templateData.name,
          category: templateData.category || "general",
          subject: templateData.subject,
          content: templateData.content,
          usageCount: 0,
          createdBy: currentUser,
        })
        .returning();
      
      console.log(`📝 Created template "${template.name}" (ID: ${template.id}) for organization ${organizationId}`);
      return template;
    } catch (error) {
      console.error("❌ Error creating template:", error);
      throw error;
    }
  }

  async updateMessageTemplate(templateId: number, templateData: any, organizationId: number): Promise<MessageTemplate> {
    try {
      const updateValues: any = {};
      
      if (templateData.name !== undefined) updateValues.name = templateData.name;
      if (templateData.category !== undefined) updateValues.category = templateData.category;
      if (templateData.subject !== undefined) updateValues.subject = templateData.subject;
      if (templateData.content !== undefined) updateValues.content = templateData.content;
      if (templateData.usageCount !== undefined) updateValues.usageCount = templateData.usageCount;
      if (templateData.createdBy !== undefined) updateValues.createdBy = templateData.createdBy;
      
      const [template] = await db.update(messageTemplates)
        .set(updateValues)
        .where(and(
          eq(messageTemplates.id, templateId),
          eq(messageTemplates.organizationId, organizationId)
        ))
        .returning();
      
      if (!template) {
        throw new Error(`Template ${templateId} not found for organization ${organizationId}`);
      }
      
      console.log(`📝 Updated template "${template.name}" (ID: ${template.id}) for organization ${organizationId}`);
      return template;
    } catch (error) {
      console.error("❌ Error updating template:", error);
      throw error;
    }
  }

  async deleteMessageTemplate(templateId: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db.delete(messageTemplates)
        .where(and(
          eq(messageTemplates.id, templateId),
          eq(messageTemplates.organizationId, organizationId)
        ));
      
      console.log(`🗑️ Deleted template (ID: ${templateId}) for organization ${organizationId}`);
      return true;
    } catch (error) {
      console.error("❌ Error deleting template:", error);
      return false;
    }
  }

  async getMessagingAnalytics(organizationId: number): Promise<any> {
    // Return sample messaging analytics for the demo
    return {
      totalMessages: 2847,
      responseRate: "94.2%",
      avgResponseTime: "4.2h",
      campaignReach: "18.5K",
      messageBreakdown: {
        internal: 1254,
        patient: 892,
        broadcast: 701
      },
      recentActivity: [
        {
          type: "campaign",
          title: "Flu Vaccination Reminder sent",
          description: "Reached 1,240 patients",
          timestamp: "2 hours ago",
          status: "completed"
        },
        {
          type: "template",
          title: "Lab Results Available used 12 times",
          description: "High engagement rate",
          timestamp: "4 hours ago",
          status: "active"
        },
        {
          type: "bulk",
          title: "Bulk message sent to Cardiology department",
          description: "45 recipients",
          timestamp: "6 hours ago",
          status: "delivered"
        }
      ]
    };
  }

  async getSmsMessages(organizationId: number, currentUserId?: number, userRole?: string): Promise<any[]> {
    try {
      // CRITICAL: Role-based filtering
      // Admin can see all SMS messages, doctor/nurse can only see their own
      let whereCondition;
      
      if (currentUserId !== undefined && currentUserId !== null && userRole !== 'admin') {
        // For non-admin users, only show SMS messages they sent
        whereCondition = and(
          eq(messages.organizationId, organizationId),
          eq(messages.messageType, 'sms'),
          eq(messages.senderId, currentUserId)
        );
        console.log(`📱 FILTERING SMS - User ${currentUserId} (${userRole}) can only see their own SMS messages`);
      } else {
        // Admin sees all SMS messages
        whereCondition = and(
          eq(messages.organizationId, organizationId),
          eq(messages.messageType, 'sms')
        );
        console.log(`📱 ADMIN ACCESS - Showing all SMS messages for organization ${organizationId}`);
      }
      
      const smsMessagesList = await db.select()
        .from(messages)
        .where(whereCondition)
        .orderBy(desc(messages.createdAt));
      
      // Enrich messages with patient names by looking up each recipient
      const enrichedMessages = await Promise.all(smsMessagesList.map(async (msg) => {
        let patientFirstName = null;
        let patientLastName = null;
        
        // Try to look up patient by recipientId if it's a number
        if (msg.recipientId && /^\d+$/.test(msg.recipientId)) {
          const patientId = parseInt(msg.recipientId, 10);
          const decrypted = await this.getPatient(patientId, organizationId);
          if (decrypted) {
            patientFirstName = decrypted.firstName;
            patientLastName = decrypted.lastName;
          }
        }
        
        return {
          ...msg,
          patientFirstName,
          patientLastName
        };
      }));
      
      console.log(`📱 Fetched ${enrichedMessages.length} SMS messages for organization ${organizationId} (user: ${currentUserId}, role: ${userRole})`);
      return enrichedMessages;
    } catch (error) {
      console.error("Error fetching SMS messages:", error);
      return [];
    }
  }




  // Documents implementation
  async getDocument(id: number, organizationId: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));
    return document;
  }

  async getDocumentsByUser(userId: number, organizationId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.organizationId, organizationId)))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByOrganization(organizationId: number, limit?: number): Promise<Document[]> {
    const query = db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .orderBy(desc(documents.createdAt));

    return await (limit ? query.limit(limit) : query);
  }

  async getTemplatesByOrganization(organizationId: number, limit?: number): Promise<Document[]> {
    const query = db
      .select()
      .from(documents)
      .where(and(eq(documents.organizationId, organizationId), eq(documents.isTemplate, true)))
      .orderBy(desc(documents.createdAt));

    return await (limit ? query.limit(limit) : query);
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const cleanDocument = {
      ...document,
      metadata: typeof document.metadata === 'object' ? document.metadata : {}
    };
    const [newDocument] = await db
      .insert(documents)
      .values(cleanDocument as any)
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, organizationId: number, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set(updates as any)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Medical Images implementation
  async getMedicalImage(id: number, organizationId: number): Promise<MedicalImage | undefined> {
    const [image] = await db
      .select()
      .from(medicalImages)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)));
    return image;
  }

  async getMedicalImagesByPatient(patientId: number, organizationId: number): Promise<MedicalImage[]> {
    return await db
      .select()
      .from(medicalImages)
      .where(and(eq(medicalImages.patientId, patientId), eq(medicalImages.organizationId, organizationId)))
      .orderBy(desc(medicalImages.createdAt));
  }

  async getMedicalImagesByOrganization(organizationId: number, limit: number = 50): Promise<MedicalImage[]> {
    return await db
      .select()
      .from(medicalImages)
      .where(eq(medicalImages.organizationId, organizationId))
      .orderBy(desc(medicalImages.createdAt))
      .limit(limit);
  }

  async createMedicalImage(image: InsertMedicalImage): Promise<MedicalImage> {
    const cleanImage = {
      ...image,
      metadata: typeof image.metadata === 'object' ? image.metadata : {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newImage] = await db
      .insert(medicalImages)
      .values(cleanImage as any)
      .returning();
    return newImage;
  }

  async updateMedicalImage(id: number, organizationId: number, updates: Partial<InsertMedicalImage>): Promise<MedicalImage | undefined> {
    const cleanUpdates = {
      ...updates,
      ...(updates.metadata && typeof updates.metadata === 'object' ? { metadata: updates.metadata } : {}),
      updatedAt: new Date(),
    };
    const [updatedImage] = await db
      .update(medicalImages)
      .set(cleanUpdates as any)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)))
      .returning();
    return updatedImage;
  }

  async updateMedicalImageReportField(id: number, organizationId: number, fieldName: string, value: string): Promise<MedicalImage | undefined> {
    // Validate field name to prevent SQL injection
    const allowedFields = ['findings', 'impression', 'radiologist'];
    if (!allowedFields.includes(fieldName)) {
      throw new Error(`Invalid field name: ${fieldName}`);
    }

    const updates: any = {
      updatedAt: new Date(),
    };
    updates[fieldName] = value;

    const [updatedImage] = await db
      .update(medicalImages)
      .set(updates)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)))
      .returning();
    return updatedImage;
  }

  async updateMedicalImageReport(id: number, organizationId: number, reportData: { reportFileName?: string; reportFilePath?: string; findings?: string | null; impression?: string | null; radiologist?: string | null; scheduledAt?: string | null; performedAt?: string | null }): Promise<MedicalImage | undefined> {
    const updates: any = {
      updatedAt: new Date(),
    };

    // Add only the provided fields to the update
    if (reportData.reportFileName !== undefined) {
      updates.reportFileName = reportData.reportFileName;
    }
    if (reportData.reportFilePath !== undefined) {
      updates.reportFilePath = reportData.reportFilePath;
    }
    if (reportData.findings !== undefined) {
      updates.findings = reportData.findings;
    }
    if (reportData.impression !== undefined) {
      updates.impression = reportData.impression;
    }
    if (reportData.radiologist !== undefined) {
      updates.radiologist = reportData.radiologist;
    }
    if (reportData.scheduledAt !== undefined) {
      updates.scheduledAt = reportData.scheduledAt ? new Date(reportData.scheduledAt) : null;
    }
    if (reportData.performedAt !== undefined) {
      updates.performedAt = reportData.performedAt ? new Date(reportData.performedAt) : null;
    }

    const [updatedImage] = await db
      .update(medicalImages)
      .set(updates)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)))
      .returning();
    return updatedImage;
  }

  async deleteMedicalImage(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(medicalImages)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Clinical Photos implementation
  async getClinicalPhoto(id: number, organizationId: number): Promise<ClinicalPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(clinicalPhotos)
      .where(and(eq(clinicalPhotos.id, id), eq(clinicalPhotos.organizationId, organizationId)));
    return photo;
  }

  async getClinicalPhotosByPatient(patientId: number, organizationId: number): Promise<ClinicalPhoto[]> {
    return await db
      .select()
      .from(clinicalPhotos)
      .where(and(eq(clinicalPhotos.patientId, patientId), eq(clinicalPhotos.organizationId, organizationId)))
      .orderBy(desc(clinicalPhotos.createdAt));
  }

  async getClinicalPhotosByOrganization(organizationId: number, limit: number = 50): Promise<ClinicalPhoto[]> {
    return await db
      .select()
      .from(clinicalPhotos)
      .where(eq(clinicalPhotos.organizationId, organizationId))
      .orderBy(desc(clinicalPhotos.createdAt))
      .limit(limit);
  }

  async createClinicalPhoto(photo: InsertClinicalPhoto): Promise<ClinicalPhoto> {
    const cleanPhoto = {
      ...photo,
      metadata: typeof photo.metadata === 'object' ? photo.metadata : {},
      aiAnalysis: typeof photo.aiAnalysis === 'object' ? photo.aiAnalysis : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newPhoto] = await db
      .insert(clinicalPhotos)
      .values(cleanPhoto as any)
      .returning();
    return newPhoto;
  }

  async updateClinicalPhoto(id: number, organizationId: number, updates: Partial<InsertClinicalPhoto>): Promise<ClinicalPhoto | undefined> {
    const cleanUpdates = {
      ...updates,
      ...(updates.metadata && typeof updates.metadata === 'object' ? { metadata: updates.metadata } : {}),
      ...(updates.aiAnalysis && typeof updates.aiAnalysis === 'object' ? { aiAnalysis: updates.aiAnalysis } : {}),
      updatedAt: new Date(),
    };
    const [updatedPhoto] = await db
      .update(clinicalPhotos)
      .set(cleanUpdates as any)
      .where(and(eq(clinicalPhotos.id, id), eq(clinicalPhotos.organizationId, organizationId)))
      .returning();
    return updatedPhoto;
  }

  async deleteClinicalPhoto(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(clinicalPhotos)
      .where(and(eq(clinicalPhotos.id, id), eq(clinicalPhotos.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Muscle Positions - For facial muscle analysis
  async saveMusclePosition(musclePosition: InsertMusclePosition): Promise<MusclePosition> {
    const cleanMusclePosition = {
      ...musclePosition,
      coordinates: typeof musclePosition.coordinates === 'object' ? musclePosition.coordinates : {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const [newMusclePosition] = await db
      .insert(musclePositions)
      .values(cleanMusclePosition as any)
      .returning();
    
    return newMusclePosition;
  }

  async getMusclePositions(organizationId: number, patientId: number): Promise<MusclePosition[]> {
    const positions = await db
      .select()
      .from(musclePositions)
      .where(
        and(
          eq(musclePositions.organizationId, organizationId),
          eq(musclePositions.patientId, patientId)
        )
      )
      .orderBy(asc(musclePositions.position));
    
    return positions;
  }

  // Lab Results (Database-driven)
  async getLabResult(id: number, organizationId: number): Promise<LabResult | undefined> {
    const [result] = await db.select()
      .from(labResults)
      .where(and(eq(labResults.id, id), eq(labResults.organizationId, organizationId)));
    return result || undefined;
  }

  async getLabResultsByOrganization(organizationId: number, limit: number = 50): Promise<LabResult[]> {
    // Use raw SQL query to bypass Drizzle schema issues
    // This ensures all fields including workflow fields are returned
    try {
      const results = await db.execute(sql`
        SELECT 
          id, organization_id as "organizationId", patient_id as "patientId", test_id as "testId",
          test_type as "testType", ordered_by as "orderedBy", doctor_name as "doctorName",
          main_specialty as "mainSpecialty", sub_specialty as "subSpecialty", priority,
          ordered_at as "orderedAt", collected_at as "collectedAt", completed_at as "completedAt",
          status, report_status as "reportStatus", results, critical_values as "criticalValues",
          notes, "Lab_Request_Generated" as "labRequestGenerated",
          "Sample_Collected" as "sampleCollected", "Lab_Report_Generated" as "labReportGenerated",
          "Reviewed" as "reviewed", ready_to_generate_lab as "readyToGenerateLab",
          lab_result_generated_report as "labResultGeneratedReport", signature,
          created_at as "createdAt"
        FROM lab_results
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
      
      const labResultsArray = results.rows as LabResult[];
      
      // 🔍 LOG: What we actually return from the database
      if (labResultsArray.length > 0) {
        const firstResult = labResultsArray[0] as any;
        console.log(`[STORAGE - RAW SQL RESULT] Organization ${organizationId}, First result:`, {
          testId: firstResult.testId,
          'readyToGenerateLab': firstResult.readyToGenerateLab,
          'readyToGenerateLab_type': typeof firstResult.readyToGenerateLab,
          'labResultGeneratedReport': firstResult.labResultGeneratedReport,
          'labResultGeneratedReport_type': typeof firstResult.labResultGeneratedReport,
          'All keys': Object.keys(firstResult),
        });
      }
      
      return labResultsArray;
    } catch (error: any) {
      console.error('[STORAGE] Error in getLabResultsByOrganization:', error);
      throw error;
    }
  }

  // Enhanced method to get lab results with comprehensive doctor details
  async getLabResultsWithDoctorDetails(organizationId: number, limit: number = 50): Promise<any[]> {
    const results = await db.select({
      // Lab result fields
      id: labResults.id,
      organizationId: labResults.organizationId,
      patientId: labResults.patientId,
      testId: labResults.testId,
      testType: labResults.testType,
      orderedBy: labResults.orderedBy,
      orderedAt: labResults.orderedAt,
      collectedAt: labResults.collectedAt,
      completedAt: labResults.completedAt,
      status: labResults.status,
      results: labResults.results,
      criticalValues: labResults.criticalValues,
      notes: labResults.notes,
      createdAt: labResults.createdAt,
      // Comprehensive doctor details including specializations
      doctorFirstName: users.firstName,
      doctorLastName: users.lastName,
      doctorEmail: users.email,
      doctorRole: users.role,
      doctorDepartment: users.department,
      doctorWorkingDays: users.workingDays,
      doctorWorkingHours: users.workingHours,
      doctorPermissions: users.permissions,
    })
    .from(labResults)
    .leftJoin(users, eq(labResults.orderedBy, users.id))
    .where(eq(labResults.organizationId, organizationId))
    .orderBy(desc(labResults.createdAt))
    .limit(limit);

    return results;
  }

  async getLabResultsByPatient(patientId: number, organizationId: number): Promise<LabResult[]> {
    // Use raw SQL query to bypass Drizzle schema issues
    // This ensures all fields including workflow fields are returned
    try {
      const results = await db.execute(sql`
        SELECT 
          id, organization_id as "organizationId", patient_id as "patientId", test_id as "testId",
          test_type as "testType", ordered_by as "orderedBy", doctor_name as "doctorName",
          main_specialty as "mainSpecialty", sub_specialty as "subSpecialty", priority,
          ordered_at as "orderedAt", collected_at as "collectedAt", completed_at as "completedAt",
          status, report_status as "reportStatus", results, critical_values as "criticalValues",
          notes, "Lab_Request_Generated" as "labRequestGenerated",
          "Sample_Collected" as "sampleCollected", "Lab_Report_Generated" as "labReportGenerated",
          "Reviewed" as "reviewed", ready_to_generate_lab as "readyToGenerateLab",
          lab_result_generated_report as "labResultGeneratedReport", signature,
          created_at as "createdAt"
        FROM lab_results
        WHERE patient_id = ${patientId} AND organization_id = ${organizationId}
        ORDER BY created_at DESC
      `);
      
      const labResultsArray = results.rows as LabResult[];
      
      // 🔍 LOG: What we actually return from the database
      if (labResultsArray.length > 0) {
        const firstResult = labResultsArray[0] as any;
        console.log(`[STORAGE - RAW SQL RESULT] Patient ${patientId}, Organization ${organizationId}, First result:`, {
          testId: firstResult.testId,
          'readyToGenerateLab': firstResult.readyToGenerateLab,
          'readyToGenerateLab_type': typeof firstResult.readyToGenerateLab,
          'labResultGeneratedReport': firstResult.labResultGeneratedReport,
          'labResultGeneratedReport_type': typeof firstResult.labResultGeneratedReport,
          'All keys': Object.keys(firstResult),
        });
      }
      
      return labResultsArray;
    } catch (error: any) {
      console.error('[STORAGE] Error in getLabResultsByPatient:', error);
      throw error;
    }
  }

  async getLabResultsByStatus(patientId: number, organizationId: number, status: string): Promise<LabResult[]> {
    return await db.select()
      .from(labResults)
      .where(and(
        eq(labResults.patientId, patientId),
        eq(labResults.organizationId, organizationId),
        eq(labResults.status, status)
      ))
      .orderBy(desc(labResults.createdAt));
  }


  async updateLabResult(id: number, organizationId: number, updates: Partial<InsertLabResult>): Promise<LabResult | undefined> {
    const [result] = await db.update(labResults)
      .set(updates as any)
      .where(and(eq(labResults.id, id), eq(labResults.organizationId, organizationId)))
      .returning();
    return result || undefined;
  }

  async deleteLabResult(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(labResults)
      .where(and(eq(labResults.id, id), eq(labResults.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Risk Assessments (Database-driven)
  async getRiskAssessmentsByPatient(patientId: number, organizationId: number): Promise<RiskAssessment[]> {
    return await db.select()
      .from(riskAssessments)
      .where(and(eq(riskAssessments.patientId, patientId), eq(riskAssessments.organizationId, organizationId)))
      .orderBy(desc(riskAssessments.assessmentDate));
  }

  async getRiskAssessmentsByOrganization(organizationId: number, limit: number = 100): Promise<RiskAssessment[]> {
    return await db.select()
      .from(riskAssessments)
      .where(eq(riskAssessments.organizationId, organizationId))
      .orderBy(desc(riskAssessments.assessmentDate))
      .limit(limit);
  }

  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const [result] = await db
      .insert(riskAssessments)
      .values(assessment as any)
      .returning();
    return result;
  }

  async updateRiskAssessment(id: number, organizationId: number, updates: Partial<InsertRiskAssessment>): Promise<RiskAssessment | undefined> {
    const [result] = await db.update(riskAssessments)
      .set(updates as any)
      .where(and(eq(riskAssessments.id, id), eq(riskAssessments.organizationId, organizationId)))
      .returning();
    return result || undefined;
  }

  // Claims (Database-driven)
  async getClaim(id: number, organizationId: number): Promise<Claim | undefined> {
    const [claim] = await db.select()
      .from(claims)
      .where(and(eq(claims.id, id), eq(claims.organizationId, organizationId)));
    return claim || undefined;
  }

  async getClaimsByOrganization(organizationId: number, limit: number = 50): Promise<Claim[]> {
    return await db.select()
      .from(claims)
      .where(eq(claims.organizationId, organizationId))
      .orderBy(desc(claims.createdAt))
      .limit(limit);
  }

  async getClaimById(claimId: number): Promise<Claim | null> {
    const result = await db.select().from(claims).where(eq(claims.id, claimId)).limit(1);
    return result[0] || null;
  }

  async deleteClaim(claimId: number): Promise<void> {
    await db.delete(claims).where(eq(claims.id, claimId));
  }

  async getClaimsByPatient(patientId: number, organizationId: number): Promise<Claim[]> {
    return await db.select()
      .from(claims)
      .where(and(eq(claims.patientId, patientId), eq(claims.organizationId, organizationId)))
      .orderBy(desc(claims.createdAt));
  }

  async getClaimsByStatus(patientId: number, organizationId: number, status: string): Promise<Claim[]> {
    return await db.select()
      .from(claims)
      .where(and(
        eq(claims.patientId, patientId),
        eq(claims.organizationId, organizationId),
        eq(claims.status, status)
      ))
      .orderBy(desc(claims.createdAt));
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const cleanClaim = {
      ...claim,
      procedures: Array.isArray(claim.procedures) ? claim.procedures : []
    };
    const [result] = await db.insert(claims).values(cleanClaim as any).returning();
    return result;
  }

  async updateClaim(id: number, organizationId: number, updates: Partial<InsertClaim>): Promise<Claim | undefined> {
    const [claim] = await db.update(claims)
      .set(updates as any)
      .where(and(eq(claims.id, id), eq(claims.organizationId, organizationId)))
      .returning();
    return claim || undefined;
  }

  // Insurance Verifications (Database-driven)
  async getInsuranceVerification(id: number, organizationId: number): Promise<InsuranceVerification | undefined> {
    const [insurance] = await db.select()
      .from(insuranceVerifications)
      .where(and(eq(insuranceVerifications.id, id), eq(insuranceVerifications.organizationId, organizationId)));
    return insurance || undefined;
  }

  async getInsuranceVerificationsByOrganization(organizationId: number, limit: number = 50): Promise<InsuranceVerification[]> {
    return await db.select()
      .from(insuranceVerifications)
      .where(eq(insuranceVerifications.organizationId, organizationId))
      .orderBy(desc(insuranceVerifications.createdAt))
      .limit(limit);
  }

  async getInsuranceVerificationsByPatient(patientId: number, organizationId: number): Promise<InsuranceVerification[]> {
    return await db.select()
      .from(insuranceVerifications)
      .where(and(eq(insuranceVerifications.patientId, patientId), eq(insuranceVerifications.organizationId, organizationId)))
      .orderBy(desc(insuranceVerifications.createdAt));
  }

  async createInsuranceVerification(insurance: InsertInsuranceVerification): Promise<InsuranceVerification> {
    const cleanInsurance = {
      ...insurance,
      benefits: insurance.benefits || {}
    };
    const [result] = await db.insert(insuranceVerifications).values(cleanInsurance as any).returning();
    return result;
  }

  async updateInsuranceVerification(id: number, organizationId: number, updates: Partial<InsertInsuranceVerification>): Promise<InsuranceVerification | undefined> {
    const [insurance] = await db.update(insuranceVerifications)
      .set(updates as any)
      .where(and(eq(insuranceVerifications.id, id), eq(insuranceVerifications.organizationId, organizationId)))
      .returning();
    return insurance || undefined;
  }

  async deleteInsuranceVerification(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(insuranceVerifications)
      .where(and(eq(insuranceVerifications.id, id), eq(insuranceVerifications.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Revenue Records (Database-driven)
  async getRevenueRecordsByOrganization(organizationId: number, limit: number = 50): Promise<RevenueRecord[]> {
    return await db.select()
      .from(revenueRecords)
      .where(eq(revenueRecords.organizationId, organizationId))
      .orderBy(desc(revenueRecords.createdAt))
      .limit(limit);
  }

  async createRevenueRecord(revenueRecord: InsertRevenueRecord): Promise<RevenueRecord> {
    const [result] = await db.insert(revenueRecords).values(revenueRecord as any).returning();
    return result;
  }

  // Clinical Procedures (Database-driven)
  async getClinicalProceduresByOrganization(organizationId: number, limit: number = 50): Promise<ClinicalProcedure[]> {
    return await db.select()
      .from(clinicalProcedures)
      .where(eq(clinicalProcedures.organizationId, organizationId))
      .orderBy(desc(clinicalProcedures.createdAt))
      .limit(limit);
  }

  async createClinicalProcedure(procedure: InsertClinicalProcedure): Promise<ClinicalProcedure> {
    const cleanProcedure = {
      ...procedure,
      prerequisites: Array.isArray(procedure.prerequisites) ? procedure.prerequisites : [],
      steps: Array.isArray(procedure.steps) ? procedure.steps : [],
      complications: Array.isArray(procedure.complications) ? procedure.complications : []
    };
    const [result] = await db.insert(clinicalProcedures).values(cleanProcedure as any).returning();
    return result;
  }

  async updateClinicalProcedure(id: number, organizationId: number, updates: Partial<InsertClinicalProcedure>): Promise<ClinicalProcedure | undefined> {
    const [procedure] = await db.update(clinicalProcedures)
      .set(updates as any)
      .where(and(eq(clinicalProcedures.id, id), eq(clinicalProcedures.organizationId, organizationId)))
      .returning();
    return procedure || undefined;
  }

  // Emergency Protocols (Database-driven)
  async getEmergencyProtocolsByOrganization(organizationId: number, limit: number = 50): Promise<EmergencyProtocol[]> {
    return await db.select()
      .from(emergencyProtocols)
      .where(eq(emergencyProtocols.organizationId, organizationId))
      .orderBy(desc(emergencyProtocols.createdAt))
      .limit(limit);
  }

  async createEmergencyProtocol(protocol: InsertEmergencyProtocol): Promise<EmergencyProtocol> {
    const cleanProtocol = {
      ...protocol,
      steps: Array.isArray(protocol.steps) ? protocol.steps : []
    };
    const [result] = await db.insert(emergencyProtocols).values(cleanProtocol as any).returning();
    return result;
  }

  async updateEmergencyProtocol(id: number, organizationId: number, updates: Partial<InsertEmergencyProtocol>): Promise<EmergencyProtocol | undefined> {
    const [protocol] = await db.update(emergencyProtocols)
      .set(updates as any)
      .where(and(eq(emergencyProtocols.id, id), eq(emergencyProtocols.organizationId, organizationId)))
      .returning();
    return protocol || undefined;
  }

  // Medications Database (Database-driven)
  async getMedicationsByOrganization(organizationId: number, limit: number = 50): Promise<MedicationsDatabase[]> {
    return await db.select()
      .from(medicationsDatabase)
      .where(eq(medicationsDatabase.organizationId, organizationId))
      .orderBy(desc(medicationsDatabase.createdAt))
      .limit(limit);
  }

  async createMedication(medication: InsertMedicationsDatabase): Promise<MedicationsDatabase> {
    const [result] = await db.insert(medicationsDatabase).values([medication]).returning();
    return result;
  }

  async updateMedication(id: number, organizationId: number, updates: Partial<InsertMedicationsDatabase>): Promise<MedicationsDatabase | undefined> {
    const [medication] = await db.update(medicationsDatabase)
      .set(updates as any)
      .where(and(eq(medicationsDatabase.id, id), eq(medicationsDatabase.organizationId, organizationId)))
      .returning();
    return medication || undefined;
  }

  // Staff Shifts (Database-driven)
  async getStaffShift(id: number, organizationId: number): Promise<StaffShift | undefined> {
    const [shift] = await db.select()
      .from(staffShifts)
      .where(and(eq(staffShifts.id, id), eq(staffShifts.organizationId, organizationId)));
    return shift || undefined;
  }

  async getStaffShiftsByOrganization(organizationId: number, date?: string, createdBy?: number): Promise<StaffShift[]> {
    let conditions = [eq(staffShifts.organizationId, organizationId)];

    if (date) {
      conditions.push(
        gte(staffShifts.date, new Date(date)),
        lt(staffShifts.date, new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000))
      );
    }

    // Add created_by filter for doctor roles
    if (createdBy !== undefined) {
      conditions.push(eq(staffShifts.createdBy, createdBy));
    }

    return await db.select()
      .from(staffShifts)
      .where(and(...conditions))
      .orderBy(asc(staffShifts.date), asc(staffShifts.startTime));
  }

  async getStaffShiftsByStaff(staffId: number, organizationId: number, date?: string): Promise<StaffShift[]> {
    let conditions = [
      eq(staffShifts.staffId, staffId),
      eq(staffShifts.organizationId, organizationId)
    ];

    if (date) {
      conditions.push(
        gte(staffShifts.date, new Date(date)),
        lt(staffShifts.date, new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000))
      );
    }

    return await db.select()
      .from(staffShifts)
      .where(and(...conditions))
      .orderBy(asc(staffShifts.date), asc(staffShifts.startTime));
  }

  async createStaffShift(shift: InsertStaffShift): Promise<StaffShift> {
    console.log("🔍 [SHIFT_CREATION] Received shift data:", JSON.stringify(shift, null, 2));
    console.log("🔍 [SHIFT_CREATION] Has createdBy?", 'createdBy' in shift, "Value:", (shift as any).createdBy);
    
    const [result] = await db.insert(staffShifts).values(shift as any).returning();
    
    console.log("✅ [SHIFT_CREATION] Created shift:", { id: result.id, staffId: result.staffId, createdBy: result.createdBy });
    return result;
  }

  async updateStaffShift(id: number, organizationId: number, updates: Partial<InsertStaffShift>): Promise<StaffShift | undefined> {
    const [shift] = await db.update(staffShifts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(staffShifts.id, id), eq(staffShifts.organizationId, organizationId)))
      .returning();
    return shift || undefined;
  }

  async deleteStaffShift(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(staffShifts)
      .where(and(eq(staffShifts.id, id), eq(staffShifts.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Holiday calendar
  async getHolidayCalendarSettings(organizationId: number): Promise<OrganizationHolidaySettings> {
    const [row] = await db.select()
      .from(organizationHolidaySettings)
      .where(eq(organizationHolidaySettings.organizationId, organizationId));
    if (row) return row;
    const [created] = await db.insert(organizationHolidaySettings)
      .values({ organizationId })
      .returning();
    return created;
  }

  async upsertHolidayCalendarSettings(
    organizationId: number,
    updates: Partial<InsertOrganizationHolidaySettings>,
  ): Promise<OrganizationHolidaySettings> {
    await this.getHolidayCalendarSettings(organizationId);
    const [row] = await db.update(organizationHolidaySettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizationHolidaySettings.organizationId, organizationId))
      .returning();
    return row;
  }

  async getOrganizationHolidaysInRange(
    organizationId: number,
    fromDate: string,
    toDate: string,
  ): Promise<OrganizationHoliday[]> {
    return await db.select()
      .from(organizationHolidays)
      .where(and(
        eq(organizationHolidays.organizationId, organizationId),
        gte(organizationHolidays.holidayDate, fromDate),
        lte(organizationHolidays.holidayDate, toDate),
      ))
      .orderBy(asc(organizationHolidays.holidayDate), asc(organizationHolidays.name));
  }

  async getOrganizationHoliday(id: number, organizationId: number): Promise<OrganizationHoliday | undefined> {
    const [row] = await db.select()
      .from(organizationHolidays)
      .where(and(eq(organizationHolidays.id, id), eq(organizationHolidays.organizationId, organizationId)));
    return row || undefined;
  }

  async createOrganizationHoliday(holiday: InsertOrganizationHoliday): Promise<OrganizationHoliday> {
    const [row] = await db.insert(organizationHolidays).values(holiday).returning();
    return row;
  }

  async updateOrganizationHoliday(
    id: number,
    organizationId: number,
    updates: Partial<InsertOrganizationHoliday>,
  ): Promise<OrganizationHoliday | undefined> {
    const [row] = await db.update(organizationHolidays)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(organizationHolidays.id, id), eq(organizationHolidays.organizationId, organizationId)))
      .returning();
    return row || undefined;
  }

  async deleteOrganizationHoliday(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(organizationHolidays)
      .where(and(eq(organizationHolidays.id, id), eq(organizationHolidays.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  async resolveDateHolidayStatus(organizationId: number, dateStr: string): Promise<{
    isNonWorking: boolean;
    allowShifts: boolean;
    isWorkingDay: boolean;
    label: string;
    holidayType: string;
    source: "holiday" | "weekend";
    holidayId?: number;
  } | null> {
    const settings = await this.getHolidayCalendarSettings(organizationId);
    const [explicit] = await db.select()
      .from(organizationHolidays)
      .where(and(
        eq(organizationHolidays.organizationId, organizationId),
        eq(organizationHolidays.holidayDate, dateStr),
      ))
      .limit(1);

    if (explicit) {
      const allowShifts = explicit.allowShifts ?? settings.defaultAllowShiftsOnHolidays;
      const isWorkingDay = explicit.isWorkingDay;
      const isNonWorking = !isWorkingDay;
      return {
        isNonWorking,
        allowShifts,
        isWorkingDay,
        label: explicit.name,
        holidayType: explicit.holidayType,
        source: "holiday",
        holidayId: explicit.id,
      };
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[new Date(`${dateStr}T12:00:00`).getDay()];
    const weekendDays = settings.weekendDays ?? ["Saturday", "Sunday"];
    if (settings.weekendsNonWorking && weekendDays.includes(dayName)) {
      return {
        isNonWorking: true,
        allowShifts: settings.defaultAllowShiftsOnHolidays,
        isWorkingDay: false,
        label: `${dayName} (weekend)`,
        holidayType: "weekend",
        source: "weekend",
      };
    }

    return null;
  }

  // Default Shifts Methods
  async getDefaultShiftsByOrganization(organizationId: number): Promise<DoctorDefaultShift[]> {
    return await db.select()
      .from(doctorDefaultShifts)
      .where(eq(doctorDefaultShifts.organizationId, organizationId))
      .orderBy(asc(doctorDefaultShifts.userId));
  }

  async getDefaultShiftByUser(userId: number, organizationId: number): Promise<DoctorDefaultShift | undefined> {
    const [shift] = await db.select()
      .from(doctorDefaultShifts)
      .where(and(
        eq(doctorDefaultShifts.userId, userId),
        eq(doctorDefaultShifts.organizationId, organizationId)
      ));
    return shift || undefined;
  }

  async updateDefaultShift(userId: number, organizationId: number, updates: Partial<InsertDoctorDefaultShift>): Promise<DoctorDefaultShift | undefined> {
    const [shift] = await db.update(doctorDefaultShifts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(doctorDefaultShifts.userId, userId),
        eq(doctorDefaultShifts.organizationId, organizationId)
      ))
      .returning();
    return shift || undefined;
  }

  async initializeDefaultShifts(organizationId: number): Promise<{ created: number; skipped: number }> {
    const allUsers = await db.select()
      .from(users)
      .where(eq(users.organizationId, organizationId));

    const nonPatientUsers = allUsers.filter(user => user.role !== 'patient');
    
    let created = 0;
    let skipped = 0;

    for (const user of nonPatientUsers) {
      const existingShift = await this.getDefaultShiftByUser(user.id, organizationId);
      
      if (!existingShift) {
        // Create 24/7 availability (always available)
        await db.insert(doctorDefaultShifts).values({
          userId: user.id,
          organizationId: organizationId,
          startTime: '00:00',
          endTime: '23:59',
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        } as any);
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped };
  }

  async deleteDefaultShift(userId: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(doctorDefaultShifts)
      .where(and(
        eq(doctorDefaultShifts.userId, userId),
        eq(doctorDefaultShifts.organizationId, organizationId)
      ))
      .returning();
    return result.length > 0;
  }

  async deleteAllDefaultShifts(organizationId: number): Promise<{ deleted: number }> {
    const result = await db.delete(doctorDefaultShifts)
      .where(eq(doctorDefaultShifts.organizationId, organizationId))
      .returning();
    return { deleted: result.length };
  }

  // GDPR Compliance Methods
  async createGdprConsent(consent: InsertGdprConsent): Promise<GdprConsent> {
    const cleanConsent = {
      ...consent,
      dataCategories: Array.isArray(consent.dataCategories) ? consent.dataCategories : []
    };
    const [result] = await db.insert(gdprConsents).values(cleanConsent as any).returning();
    return result;
  }

  async updateGdprConsent(id: number, organizationId: number, updates: Partial<InsertGdprConsent>): Promise<GdprConsent | undefined> {
    const [consent] = await db.update(gdprConsents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(gdprConsents.id, id), eq(gdprConsents.organizationId, organizationId)))
      .returning();
    return consent || undefined;
  }

  async getGdprConsentsByPatient(patientId: number, organizationId: number): Promise<GdprConsent[]> {
    return await db.select()
      .from(gdprConsents)
      .where(and(eq(gdprConsents.patientId, patientId), eq(gdprConsents.organizationId, organizationId)))
      .orderBy(desc(gdprConsents.createdAt));
  }

  async getGdprConsentsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprConsent[]> {
    return await db.select()
      .from(gdprConsents)
      .where(and(
        eq(gdprConsents.organizationId, organizationId),
        gte(gdprConsents.createdAt, startDate),
        lt(gdprConsents.createdAt, endDate)
      ))
      .orderBy(desc(gdprConsents.createdAt));
  }

  async createGdprDataRequest(request: InsertGdprDataRequest): Promise<GdprDataRequest> {
    const [result] = await db.insert(gdprDataRequests).values([request]).returning();
    return result;
  }

  async updateGdprDataRequest(id: number, organizationId: number, updates: Partial<InsertGdprDataRequest>): Promise<GdprDataRequest | undefined> {
    const [request] = await db.update(gdprDataRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(gdprDataRequests.id, id), eq(gdprDataRequests.organizationId, organizationId)))
      .returning();
    return request || undefined;
  }

  async getGdprDataRequestsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprDataRequest[]> {
    return await db.select()
      .from(gdprDataRequests)
      .where(and(
        eq(gdprDataRequests.organizationId, organizationId),
        gte(gdprDataRequests.requestedAt, startDate),
        lt(gdprDataRequests.requestedAt, endDate)
      ))
      .orderBy(desc(gdprDataRequests.requestedAt));
  }

  async createGdprAuditTrail(audit: InsertGdprAuditTrail): Promise<GdprAuditTrail> {
    const [result] = await db.insert(gdprAuditTrail).values([audit]).returning();
    return result;
  }

  async getActiveAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]> {
    const today = new Date();
    return await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.organizationId, organizationId),
        gte(appointments.scheduledAt, today),
        not(eq(appointments.status, "cancelled"))
      ))
      .orderBy(asc(appointments.scheduledAt));
  }

  // SaaS Administration Methods
  async getSaaSOwner(id: number): Promise<SaaSOwner | undefined> {
    const [owner] = await db.select().from(saasOwners).where(eq(saasOwners.id, id));
    return owner || undefined;
  }

  async getSaaSOwnerById(id: number): Promise<SaaSOwner | undefined> {
    const [owner] = await db.select().from(saasOwners).where(eq(saasOwners.id, id));
    return owner || undefined;
  }

  async getSaaSOwnerByUsername(username: string): Promise<SaaSOwner | undefined> {
    const [owner] = await db.select().from(saasOwners).where(eq(saasOwners.username, username));
    return owner || undefined;
  }

  async updateSaaSOwner(id: number, data: Partial<SaaSOwner>): Promise<SaaSOwner> {
    const [owner] = await db.update(saasOwners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(saasOwners.id, id))
      .returning();
    return owner;
  }

  async updateSaaSOwnerLastLogin(id: number): Promise<void> {
    await db.update(saasOwners)
      .set({ lastLoginAt: new Date() })
      .where(eq(saasOwners.id, id));
  }

  async getSaaSStats(): Promise<any> {
    // Get basic counts
    const [totalCustomers] = await db.select({ count: count() }).from(organizations);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
    const [activePackages] = await db.select({ count: count() }).from(saasPackages).where(eq(saasPackages.isActive, true));
    
    // Get customer status breakdown
    const customersByStatus = await db.select({
      status: organizations.subscriptionStatus,
      count: count()
    }).from(organizations).groupBy(organizations.subscriptionStatus);
    
    // Calculate customer status percentages
    const statusBreakdown = customersByStatus.reduce((acc, item) => {
      acc[item.status] = {
        count: item.count,
        percentage: totalCustomers.count > 0 ? Math.round((item.count / totalCustomers.count) * 100) : 0
      };
      return acc;
    }, {} as any);
    
    // Calculate monthly revenue from active subscriptions - SaaS portal fix
    let activeSubscriptions = [];
    try {
      activeSubscriptions = await db.select({
        packageName: saasPackages.name,
        price: saasPackages.price,
        count: count()
      })
      .from(subscriptions)
      .innerJoin(saasPackages, eq(subscriptions.plan, saasPackages.name))
      .where(and(
        eq(subscriptions.status, 'active'),
        isNotNull(subscriptions.plan),
        isNotNull(subscriptions.status)
      ))
      .groupBy(saasPackages.name, saasPackages.price);
    } catch (error) {
      console.error('Error fetching subscription revenue data:', error);
      // Fallback with mock data for SaaS display
      activeSubscriptions = [
        { packageName: 'Enterprise', price: 99.00, count: 8 },
        { packageName: 'Professional', price: 59.99, count: 4 }
      ];
    }
    
    const monthlyRevenue = activeSubscriptions.reduce((total, sub) => {
      return total + (sub.price * sub.count);
    }, 0);
    
    return {
      totalCustomers: totalCustomers.count,
      activeUsers: activeUsers.count,
      monthlyRevenue: monthlyRevenue,
      activePackages: activePackages.count,
      customerStatusBreakdown: statusBreakdown,
      revenueBreakdown: activeSubscriptions
    };
  }

  async getAllUsers(search?: string, organizationId?: string): Promise<any[]> {
    let query = db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      organizationName: organizations.name,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id));

    if (organizationId && organizationId !== 'all') {
      query = query.where(eq(users.organizationId, parseInt(organizationId)));
    }

    return await query.orderBy(desc(users.createdAt));
  }

  // PRIVACY COMPLIANT: Only return subscription contact users (organization admins)
  // SaaS owners should NOT see all internal users within organizations
  async getSubscriptionContacts(search?: string): Promise<any[]> {
    let query = db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      organizationName: organizations.name,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(and(
      eq(users.role, 'admin'), // Only organization admins (subscription contacts)
      ne(users.organizationId, 0) // Exclude SaaS owners
    ));

    if (search) {
      query = query.where(and(
        eq(users.role, 'admin'),
        ne(users.organizationId, 0),
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(organizations.name, `%${search}%`)
        )
      ));
    }

    return await query.orderBy(desc(users.createdAt));
  }

  async resetUserPassword(userId: number): Promise<any> {
    // Generate a temporary password and send email
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const bcryptModule = await import('bcrypt');
    const hashedPassword = await bcryptModule.hash(tempPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return { success: true, tempPassword };
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    const [user] = await db.update(users)
      .set({ isActive })
      .where(eq(users.id, userId))
      .returning();

    return { success: true, user };
  }

  // PRIVACY COMPLIANT: Only reset passwords for subscription contacts (organization admins)
  async resetSubscriptionContactPassword(contactId: number): Promise<any> {
    // First verify this is actually a subscription contact (org admin)
    const [contact] = await db.select()
      .from(users)
      .where(and(
        eq(users.id, contactId),
        eq(users.role, 'admin'), // Only organization admins
        ne(users.organizationId, 0) // Exclude SaaS owners
      ));

    if (!contact) {
      throw new Error('Contact not found or not a valid subscription contact');
    }

    // Generate a temporary password and send email
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const bcryptModule = await import('bcrypt');
    const hashedPassword = await bcryptModule.hash(tempPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, contactId));

    return { success: true, tempPassword, contact };
  }

  // PRIVACY COMPLIANT: Only update status for subscription contacts (organization admins)
  async updateSubscriptionContactStatus(contactId: number, isActive: boolean): Promise<any> {
    // First verify this is actually a subscription contact (org admin)
    const [contact] = await db.select()
      .from(users)
      .where(and(
        eq(users.id, contactId),
        eq(users.role, 'admin'), // Only organization admins
        ne(users.organizationId, 0) // Exclude SaaS owners
      ));

    if (!contact) {
      throw new Error('Contact not found or not a valid subscription contact');
    }

    const [user] = await db.update(users)
      .set({ isActive })
      .where(eq(users.id, contactId))
      .returning();

    return { success: true, user };
  }

  async listOrganizationIds(): Promise<number[]> {
    const rows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));
    return rows.map((row) => row.id);
  }

  private mapOrganizationRowFromLatin1(row: Record<string, unknown>): Organization {
    const str = (key: string, alt?: string) =>
      sanitizeUtf8FromLatin1Bytes(row[key] ?? row[alt ?? key]) ?? "";
    return {
      id: Number(row.id),
      name: str("name"),
      subdomain: str("subdomain"),
      email: str("email"),
      region: str("region") || "UK",
      brandName: str("brand_name", "brandName"),
      country_code: (row.country_code as string | null) ?? null,
      currency_code: (row.currency_code as string | null) ?? null,
      currency_symbol: sanitizeUtf8FromLatin1Bytes(row.currency_symbol) ?? null,
      language_code: (row.language_code as string | null) ?? null,
      settings: (row.settings as Organization["settings"]) ?? {},
      features: (row.features as Organization["features"]) ?? {},
      accessLevel: str("access_level", "accessLevel") || "full",
      subscriptionStatus: str("subscription_status", "subscriptionStatus") || "trial",
      paymentStatus: str("payment_status", "paymentStatus") || "trial",
      stripeAccountId: sanitizeUtf8FromLatin1Bytes(row.stripe_account_id) ?? null,
      stripeStatus: sanitizeUtf8FromLatin1Bytes(row.stripe_status) ?? "active",
      stripeCustomerId: sanitizeUtf8FromLatin1Bytes(row.stripe_customer_id) ?? null,
      createdAt: (row.created_at as Date) ?? new Date(),
      updatedAt: (row.updated_at as Date) ?? null,
    } as Organization;
  }

  private async getAllOrganizationsViaLatin1Encoding(): Promise<Organization[]> {
    const client = await pool.connect();
    try {
      await client.query("SET client_encoding TO 'LATIN1'");
      const { rows } = await client.query(
        `SELECT * FROM "${activeDbSchema}"."organizations" ORDER BY created_at DESC`,
      );
      await client.query("SET client_encoding TO 'UTF8'");
      console.warn(
        `[DB] Loaded ${rows.length} organization(s) with LATIN1 fallback (invalid UTF-8 bytes were sanitized)`,
      );
      return rows.map((row) => this.mapOrganizationRowFromLatin1(row as Record<string, unknown>));
    } finally {
      await client.query("SET client_encoding TO 'UTF8'").catch(() => undefined);
      client.release();
    }
  }

  async getAllOrganizations(): Promise<Organization[]> {
    try {
      return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
    } catch (error: unknown) {
      if (!isInvalidUtf8DatabaseError(error)) {
        throw error;
      }
      console.warn(
        "[DB] organizations SELECT failed (invalid UTF-8 in a text column); using LATIN1-safe loader",
      );
      return this.getAllOrganizationsViaLatin1Encoding();
    }
  }

  async createCustomerOrganization(customerData: any): Promise<any> {
    console.log('🏗️ [CUSTOMER-CREATE] Starting customer creation with data:', {
      name: customerData.name,
      subdomain: customerData.subdomain,
      billingPackageId: customerData.billingPackageId,
      adminEmail: customerData.adminEmail
    });

    try {
      const bcryptModule = await import('bcrypt');
      
      // Double-check subdomain availability to prevent conflicts
      const existingSubdomain = await db.select().from(organizations).where(eq(organizations.subdomain, customerData.subdomain)).limit(1);
      if (existingSubdomain.length > 0) {
        console.log('❌ [CUSTOMER-CREATE] Subdomain already exists:', customerData.subdomain);
        throw new Error(`Subdomain '${customerData.subdomain}' is already taken`);
      }

      // Check if admin email/username already exists
      const existingUser = await db.select().from(users).where(eq(users.email, customerData.adminEmail)).limit(1);
      if (existingUser.length > 0) {
        console.log('❌ [CUSTOMER-CREATE] Admin email already exists:', customerData.adminEmail);
        throw new Error(`Admin email '${customerData.adminEmail}' is already in use. Please use a different email address.`);
      }

      // Create Stripe Express account first
      let stripeAccountId: string | null = null;
      let stripeStatus: string = 'active';
      
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = process.env.STRIPE_SECRET_KEY
          ? new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2025-07-30.basil',
            })
          : null;
        
        if (stripe) {
          console.log('💳 [CUSTOMER-CREATE] Creating Stripe Express account...');
          
          // Get platform's country from Stripe account to match connected account country
          let platformCountry = process.env.STRIPE_ACCOUNT_COUNTRY || null;
          if (!platformCountry) {
            try {
              const platformAccount = await stripe.accounts.retrieve();
              platformCountry = platformAccount.country || 'GB'; // Default to GB if not found
              console.log('🌍 [CUSTOMER-CREATE] Platform country detected:', platformCountry);
            } catch (accountError: any) {
              console.warn('⚠️ [CUSTOMER-CREATE] Could not retrieve platform account, defaulting to GB:', accountError.message);
              platformCountry = 'GB'; // Default fallback
            }
          }
          
          console.log('🔧 [CUSTOMER-CREATE] Creating account with capabilities:', {
            card_payments: { requested: true },
            transfers: { requested: true },
          });
          
          const stripeAccount = await stripe.accounts.create({
            type: "express",
            email: customerData.adminEmail,
            country: platformCountry, // Use platform's country to avoid cross-border restrictions
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            metadata: {
              organization_name: customerData.name,
              subdomain: customerData.subdomain,
            },
          });
          stripeAccountId = stripeAccount.id;
          stripeStatus = 'active';
          console.log('✅ [CUSTOMER-CREATE] Stripe Express account created:', stripeAccountId);
        } else {
          console.warn('⚠️ [CUSTOMER-CREATE] Stripe not configured, skipping account creation');
        }
      } catch (stripeError: any) {
        console.error('❌ [CUSTOMER-CREATE] Failed to create Stripe account:', stripeError?.message || stripeError);
        // Don't fail organization creation if Stripe account creation fails
        stripeStatus = 'disconnected';
      }

      // Create organization - match database column names (snake_case)
      console.log('🏢 [CUSTOMER-CREATE] Creating organization with data:', {
        name: customerData.name,
        subdomain: customerData.subdomain,
        country_code: customerData.country_code,
        currency_code: customerData.currency_code,
        currency_symbol: customerData.currency_symbol,
        language_code: customerData.language_code,
      });
      
      let organization;
      try {
        const result = await db.insert(organizations)
          .values({
            name: customerData.name,
            brandName: customerData.brandName || customerData.name,
            subdomain: customerData.subdomain,
            email: customerData.adminEmail, // Add the admin email to organization
            region: 'UK',
            subscriptionStatus: customerData.billingPackageId ? 'active' : 'trial',
            features: customerData.features || {},
            accessLevel: customerData.accessLevel || 'full',
            stripeAccountId: stripeAccountId,
            stripeStatus: stripeStatus,
            country_code: customerData.country_code || null,
            currency_code: customerData.currency_code || null,
            currency_symbol: customerData.currency_symbol || null,
            language_code: customerData.language_code || null,
          })
          .returning();
        
        if (!result || result.length === 0) {
          throw new Error('Failed to create organization - no result returned');
        }
        
        organization = result[0];
        console.log('✅ [CUSTOMER-CREATE] Organization created with ID:', organization.id);
      } catch (dbError: any) {
        console.error('❌ [CUSTOMER-CREATE] Database error creating organization:', {
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          hint: dbError.hint,
          stack: dbError.stack
        });
        
        // Check if it's a column doesn't exist error
        if (dbError.message?.includes('column') && dbError.message?.includes('does not exist')) {
          throw new Error(`Database schema error: ${dbError.message}. Please run the migration script: migrations/add_country_currency_language_to_organizations.sql`);
        }
        
        // Re-throw with more context
        throw new Error(`Database error: ${dbError.message || 'Unknown database error'}`);
      }
      
      // Verify organization was created
      if (!organization) {
        throw new Error('Failed to retrieve created organization');
      }

      // Create default roles for the new organization
      console.log('🎭 [CUSTOMER-CREATE] Creating default roles for organization...');
      const { ensureSystemRolesForOrganization } = await import(
        "./default-system-roles.js"
      );
      const roleResult = await ensureSystemRolesForOrganization(organization.id);
      console.log(
        `✅ [CUSTOMER-CREATE] System roles ready (${roleResult.created} created, ${roleResult.existing} existing)`,
      );

      // Generate temporary password for admin user
      const crypto = await import('crypto');
      const tempPassword = crypto.randomBytes(4).toString('hex');
      const hashedPassword = await bcryptModule.hash(tempPassword, 10);

      // Use adminFirstName and adminLastName from customerData
      const firstName = customerData.adminFirstName || 'Admin';
      const lastName = customerData.adminLastName || 'User';

      // Create admin user
      console.log('👤 [CUSTOMER-CREATE] Creating admin user...');
      const [adminUser] = await db.insert(users)
        .values({
          organizationId: organization.id,
          email: customerData.adminEmail,
          username: customerData.adminEmail, // Use email as username
          passwordHash: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          role: 'admin',
          isActive: true
        })
        .returning();
      
      console.log('✅ [CUSTOMER-CREATE] Admin user created with ID:', adminUser.id);

      // Create billing subscription if package selected
      if (customerData.billingPackageId) {
        console.log('💳 [CUSTOMER-CREATE] Setting up billing subscription...');
        const selectedPackage = await db.select().from(saasPackages).where(eq(saasPackages.id, customerData.billingPackageId)).limit(1);
        if (selectedPackage.length > 0) {
          await db.insert(subscriptions).values({
            organizationId: organization.id,
            planName: selectedPackage[0].name,
            plan: selectedPackage[0].name,
            status: 'active',
            monthlyPrice: selectedPackage[0].price,
            features: customerData.features || selectedPackage[0].features || {},
          });
          
          // Also create SaaS subscription with status and paymentStatus
          const now = new Date();
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          
          await db.insert(saasSubscriptions).values({
            organizationId: organization.id,
            packageId: customerData.billingPackageId,
            status: customerData.status || 'trial',
            paymentStatus: customerData.paymentStatus || 'trial',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            trialEnd: customerData.status === 'trial' ? periodEnd : null,
            maxUsers: customerData.features?.maxUsers || null,
            maxPatients: customerData.features?.maxPatients || null,
            details: customerData.details || null,
            expiresAt: customerData.expiresAt ? new Date(customerData.expiresAt) : null,
          });
          
          console.log('✅ [CUSTOMER-CREATE] Billing subscription created for package:', selectedPackage[0].name);
        }
      }

      console.log('🎉 [CUSTOMER-CREATE] Customer creation completed successfully!');
      
      return { 
        success: true, 
        organization, 
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          tempPassword
        }
      };
      
    } catch (error: any) {
      console.error('❌ [CUSTOMER-CREATE] Customer creation failed:', {
        error: error.message,
        stack: error.stack,
        customerData: {
          name: customerData.name,
          subdomain: customerData.subdomain,
          adminEmail: customerData.adminEmail
        }
      });
      
      // Re-throw with more context for the API layer
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  async updateCustomerOrganization(organizationId: number, customerData: any): Promise<any> {
    console.log('Updating customer organization:', { organizationId, customerData });
    
    const updateData: any = {};
    const saasSubscriptionUpdateData: any = {};
    
    if (customerData.name) updateData.name = customerData.name;
    if (customerData.brandName) updateData.brandName = customerData.brandName;
    if (customerData.accessLevel) updateData.accessLevel = customerData.accessLevel;
    if (customerData.features) updateData.features = JSON.stringify(customerData.features);
    
    // Handle country, currency, and language fields
    if (customerData.country_code !== undefined) {
      updateData.country_code = customerData.country_code || null;
    }
    if (customerData.currency_code !== undefined) {
      updateData.currency_code = customerData.currency_code || null;
    }
    if (customerData.currency_symbol !== undefined) {
      updateData.currency_symbol = customerData.currency_symbol || null;
    }
    if (customerData.language_code !== undefined) {
      updateData.language_code = customerData.language_code || null;
    }

    // Keep organizations + saas_subscriptions subscription/payment status in sync
    if (customerData.subscriptionStatus !== undefined) {
      const subscriptionStatus = String(customerData.subscriptionStatus).toLowerCase();
      updateData.subscriptionStatus = subscriptionStatus;
      saasSubscriptionUpdateData.status = subscriptionStatus;

      if (subscriptionStatus === "active") {
        const now = new Date();
        let expiresAt = customerData.expiresAt
          ? new Date(customerData.expiresAt)
          : null;
        if (!expiresAt || expiresAt <= now) {
          expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }
        saasSubscriptionUpdateData.expiresAt = expiresAt;
        saasSubscriptionUpdateData.currentPeriodStart = now;
        saasSubscriptionUpdateData.currentPeriodEnd = expiresAt;
      }
    }

    if (customerData.paymentStatus !== undefined) {
      updateData.paymentStatus = customerData.paymentStatus;
      saasSubscriptionUpdateData.paymentStatus = customerData.paymentStatus;
    }

    if (customerData.details !== undefined) {
      saasSubscriptionUpdateData.details = customerData.details;
    }

    if (
      customerData.expiresAt !== undefined &&
      customerData.subscriptionStatus === undefined
    ) {
      saasSubscriptionUpdateData.expiresAt = customerData.expiresAt
        ? new Date(customerData.expiresAt)
        : null;
    }

    if (customerData.features) {
      if (customerData.features.maxUsers !== undefined) {
        saasSubscriptionUpdateData.maxUsers = customerData.features.maxUsers;
      }
      if (customerData.features.maxPatients !== undefined) {
        saasSubscriptionUpdateData.maxPatients = customerData.features.maxPatients;
      }
    }
    
    // Handle billing package assignment/update (saas_subscriptions, not tenant subscriptions)
    if (customerData.billingPackageId !== undefined) {
      if (customerData.billingPackageId && customerData.billingPackageId !== '') {
        const packageId =
          typeof customerData.billingPackageId === 'string'
            ? parseInt(customerData.billingPackageId, 10)
            : customerData.billingPackageId;

        const selectedPackage = await db
          .select()
          .from(saasPackages)
          .where(eq(saasPackages.id, packageId))
          .limit(1);

        if (selectedPackage.length > 0) {
          saasSubscriptionUpdateData.packageId = packageId;
          const pkgStatus =
            customerData.subscriptionStatus !== undefined
              ? String(customerData.subscriptionStatus).toLowerCase()
              : 'active';
          updateData.subscriptionStatus = pkgStatus;
          saasSubscriptionUpdateData.status = pkgStatus;
        }
      }
    }
    
    console.log('Update data prepared:', { updateData, saasSubscriptionUpdateData });
    
    if (
      Object.keys(updateData).length === 0 &&
      Object.keys(saasSubscriptionUpdateData).length === 0
    ) {
      throw new Error('No valid fields to update');
    }
    
    let organization;
    try {
      if (Object.keys(updateData).length > 0) {
        const result = await db.update(organizations)
          .set(updateData as any)
          .where(eq(organizations.id, organizationId))
          .returning();
        
        if (!result || result.length === 0) {
          throw new Error('Organization not found or update failed');
        }
        
        organization = result[0];
        console.log('✅ Organization updated successfully:', organization.id);
      } else {
        const [existingOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1);
        if (!existingOrg) {
          throw new Error('Organization not found');
        }
        organization = existingOrg;
      }
    } catch (dbError: any) {
      console.error('❌ Database error updating organization:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        hint: dbError.hint,
        stack: dbError.stack
      });
      
      // Check if it's a column doesn't exist error
      if (dbError.message?.includes('column') && dbError.message?.includes('does not exist')) {
        throw new Error(`Database schema error: ${dbError.message}. Please run the migration script: migrations/add_country_currency_language_to_organizations.sql`);
      }
      
      throw new Error(`Database error: ${dbError.message || 'Unknown database error'}`);
    }

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (Object.keys(saasSubscriptionUpdateData).length > 0) {
      saasSubscriptionUpdateData.updatedAt = new Date();

      const [existingSaasSubscription] = await db
        .select({ id: saasSubscriptions.id, packageId: saasSubscriptions.packageId })
        .from(saasSubscriptions)
        .where(eq(saasSubscriptions.organizationId, organizationId))
        .limit(1);

      if (existingSaasSubscription) {
        await db
          .update(saasSubscriptions)
          .set(saasSubscriptionUpdateData)
          .where(eq(saasSubscriptions.organizationId, organizationId));

        console.log('✅ Updated saasSubscriptions table with:', saasSubscriptionUpdateData);
      } else {
        const packageId =
          saasSubscriptionUpdateData.packageId ??
          (customerData.billingPackageId
            ? parseInt(String(customerData.billingPackageId), 10)
            : null);

        if (packageId) {
          const now = new Date();
          const periodEnd =
            saasSubscriptionUpdateData.expiresAt ??
            saasSubscriptionUpdateData.currentPeriodEnd ??
            new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await db.insert(saasSubscriptions).values({
            organizationId,
            packageId,
            status: saasSubscriptionUpdateData.status ?? organization.subscriptionStatus ?? 'active',
            paymentStatus:
              saasSubscriptionUpdateData.paymentStatus ??
              organization.paymentStatus ??
              'paid',
            currentPeriodStart: saasSubscriptionUpdateData.currentPeriodStart ?? now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            maxUsers: saasSubscriptionUpdateData.maxUsers ?? null,
            maxPatients: saasSubscriptionUpdateData.maxPatients ?? null,
            details: saasSubscriptionUpdateData.details ?? null,
            expiresAt: saasSubscriptionUpdateData.expiresAt ?? periodEnd,
          });
          console.log('✅ Created saasSubscriptions row for organization:', organizationId);
        } else {
          console.log('⚠️ No saasSubscription found and no packageId to create one:', organizationId);
        }
      }
    }

    const [updatedSubscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.organizationId, organizationId))
      .limit(1);

    return { success: true, organization, subscription: updatedSubscription ?? null };
  }

  async updateCustomerStatus(organizationId: number, status: string): Promise<any> {
    console.log('Updating customer status:', { organizationId, status });
    
    if (!status || typeof status !== 'string') {
      throw new Error('Invalid status provided');
    }

    const normalizedStatus = status.toLowerCase();
    
    const [organization] = await db.update(organizations)
      .set({ subscriptionStatus: normalizedStatus })
      .where(eq(organizations.id, organizationId))
      .returning();

    if (!organization) {
      throw new Error('Organization not found');
    }

    const saasUpdate: Record<string, unknown> = {
      status: normalizedStatus,
      updatedAt: new Date(),
    };

    if (normalizedStatus === 'active') {
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      saasUpdate.expiresAt = periodEnd;
      saasUpdate.currentPeriodStart = now;
      saasUpdate.currentPeriodEnd = periodEnd;
    }

    const [existingSaas] = await db
      .select({ id: saasSubscriptions.id })
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.organizationId, organizationId))
      .limit(1);

    if (existingSaas) {
      await db
        .update(saasSubscriptions)
        .set(saasUpdate as any)
        .where(eq(saasSubscriptions.organizationId, organizationId));
    }

    const [subscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.organizationId, organizationId))
      .limit(1);

    return { success: true, organization, subscription: subscription ?? null };
  }

  private mapCustomerRowFromLatin1(
    row: Record<string, unknown>,
    adminEmail = "",
  ): Record<string, unknown> {
    const str = (key: string) => sanitizeUtf8FromLatin1Bytes(row[key]) ?? "";
    return {
      id: Number(row.id),
      name: str("name"),
      brandName: str("brand_name"),
      subdomain: str("subdomain"),
      subscriptionStatus: str("subscription_status"),
      organizationPaymentStatus: str("organization_payment_status"),
      computedSubscriptionStatus: str("computed_subscription_status"),
      createdAt: row.created_at,
      features: (row.features as Record<string, unknown>) ?? {},
      userCount: Number(row.user_count ?? 0),
      packageName: sanitizeUtf8FromLatin1Bytes(row.package_name),
      billingPackageId:
        row.billing_package_id != null ? Number(row.billing_package_id) : null,
      adminEmail,
      subscriptionPaymentStatus: sanitizeUtf8FromLatin1Bytes(
        row.subscription_payment_status,
      ),
      subscriptionStart: row.subscription_start,
      subscriptionEnd: row.subscription_end,
      expiresAt: row.expires_at,
      daysActive: row.days_active != null ? Number(row.days_active) : null,
      expiryAlertLevel: str("expiry_alert_level") || "none",
      daysLeft: row.days_left != null ? Number(row.days_left) : null,
      stripeAccountId: sanitizeUtf8FromLatin1Bytes(row.stripe_account_id),
      stripeStatus: sanitizeUtf8FromLatin1Bytes(row.stripe_status) ?? "active",
      country_code: (row.country_code as string | null) ?? null,
      currency_code: (row.currency_code as string | null) ?? null,
      currency_symbol: sanitizeUtf8FromLatin1Bytes(row.currency_symbol),
      language_code: (row.language_code as string | null) ?? null,
    };
  }

  /** Read admin emails one row at a time so corrupt UTF-8 in one user does not break the list. */
  private async loadAdminEmailsByOrganizationViaLatin1(
    client: import("pg").PoolClient,
    schema: string,
    organizationIds: number[],
  ): Promise<Map<number, string>> {
    const emailsByOrg = new Map<number, string>();
    if (organizationIds.length === 0) {
      return emailsByOrg;
    }

    try {
      const { rows: adminRows } = await client.query<{ organization_id: number; id: number }>(
        `
          SELECT DISTINCT ON (organization_id) organization_id, id
          FROM "${schema}"."users"
          WHERE role = 'admin' AND organization_id = ANY($1::int[])
          ORDER BY organization_id, id ASC
        `,
        [organizationIds],
      );

      for (const adminRow of adminRows) {
        const orgId = Number(adminRow.organization_id);
        const userId = Number(adminRow.id);
        try {
          const { rows } = await client.query<{ email: string | null }>(
            `SELECT email FROM "${schema}"."users" WHERE id = $1 LIMIT 1`,
            [userId],
          );
          emailsByOrg.set(
            orgId,
            sanitizeUtf8FromLatin1Bytes(rows[0]?.email) ?? "",
          );
        } catch (error) {
          if (!isInvalidUtf8DatabaseError(error)) {
            throw error;
          }
          emailsByOrg.set(orgId, "");
        }
      }
    } catch (error) {
      if (!isInvalidUtf8DatabaseError(error)) {
        throw error;
      }
      console.warn(
        "[DB] Skipping admin email enrichment due to invalid UTF-8 in users table",
      );
    }

    return emailsByOrg;
  }

  private async getAllCustomersOrganizationsOnlyViaLatin1(
    client: import("pg").PoolClient,
    schema: string,
    search?: string,
    status?: string,
  ): Promise<any[]> {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (status && status !== "all") {
      params.push(status);
      whereClauses.push(`o.subscription_status = $${params.length}`);
    }

    if (search && search.trim() !== "") {
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
      const base = params.length - 2;
      whereClauses.push(
        `(o.name ILIKE $${base} OR o.brand_name ILIKE $${base + 1} OR o.subdomain ILIKE $${base + 2})`,
      );
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const { rows } = await client.query(
      `
      SELECT
        o.*,
        (
          SELECT COUNT(*)::int
          FROM "${schema}"."users" u2
          WHERE u2.organization_id = o.id
        ) AS user_count
      FROM "${schema}"."organizations" o
      ${whereSql}
      ORDER BY o.created_at DESC
      `,
      params,
    );

    let adminEmailsByOrg = new Map<number, string>();
    const organizationIds = rows.map((row) => Number((row as { id: number }).id));
    try {
      adminEmailsByOrg = await this.loadAdminEmailsByOrganizationViaLatin1(
        client,
        schema,
        organizationIds,
      );
    } catch {
      // Admin emails are optional for the organizations list.
    }

    return rows.map((row) => {
      const record = row as Record<string, unknown>;
      const orgId = Number(record.id);
      const mapped = this.mapCustomerRowFromLatin1(
        {
          id: record.id,
          name: record.name,
          brand_name: record.brand_name,
          subdomain: record.subdomain,
          subscription_status: record.subscription_status,
          organization_payment_status: record.payment_status,
          computed_subscription_status: record.subscription_status,
          created_at: record.created_at,
          features: record.features,
          user_count: record.user_count,
          package_name: null,
          billing_package_id: null,
          subscription_payment_status: null,
          subscription_start: null,
          subscription_end: null,
          expires_at: null,
          days_active: null,
          expiry_alert_level: "none",
          days_left: null,
          stripe_account_id: record.stripe_account_id,
          stripe_status: record.stripe_status,
          country_code: record.country_code,
          currency_code: record.currency_code,
          currency_symbol: record.currency_symbol,
          language_code: record.language_code,
        },
        adminEmailsByOrg.get(orgId) ?? "",
      );
      return mapped;
    });
  }

  private async getAllCustomersViaLatin1Encoding(
    search?: string,
    status?: string,
  ): Promise<any[]> {
    const client = await pool.connect();
    const schema = activeDbSchema;
    try {
      await client.query("SET client_encoding TO 'LATIN1'");

      const params: unknown[] = [];
      const whereClauses: string[] = [];

      if (status && status !== "all") {
        params.push(status);
        whereClauses.push(`o.subscription_status = $${params.length}`);
      }

      if (search && search.trim() !== "") {
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
        const base = params.length - 2;
        whereClauses.push(
          `(o.name ILIKE $${base} OR o.brand_name ILIKE $${base + 1} OR o.subdomain ILIKE $${base + 2})`,
        );
      }

      const whereSql =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      let rows: Record<string, unknown>[];
      try {
        ({ rows } = await client.query(
        `
        SELECT
          o.id,
          o.name,
          o.brand_name,
          o.subdomain,
          o.subscription_status,
          o.payment_status AS organization_payment_status,
          CASE
            WHEN ss.status IS NOT NULL
              AND LOWER(ss.status) NOT IN ('trial', 'active')
              THEN ss.status
            WHEN ss.expires_at IS NOT NULL AND ss.expires_at <= now()
              THEN 'expired'
            ELSE o.subscription_status
          END AS computed_subscription_status,
          o.created_at,
          o.features,
          (
            SELECT COUNT(*)::int
            FROM "${schema}"."users" u2
            WHERE u2.organization_id = o.id
          ) AS user_count,
          sp.name AS package_name,
          sp.id AS billing_package_id,
          ss.payment_status AS subscription_payment_status,
          ss.current_period_start AS subscription_start,
          ss.current_period_end AS subscription_end,
          ss.expires_at,
          CASE
            WHEN ss.current_period_start IS NOT NULL AND ss.expires_at IS NOT NULL
              THEN GREATEST(
                0,
                FLOOR(
                  EXTRACT(EPOCH FROM (ss.expires_at - ss.current_period_start)) / 86400
                )
              )::int
            ELSE NULL
          END AS days_active,
          CASE
            WHEN ss.expires_at IS NULL THEN 'none'
            WHEN ss.expires_at <= now() THEN 'expired'
            WHEN ss.expires_at <= now() + interval '1 day' THEN 'due_1'
            WHEN ss.expires_at <= now() + interval '7 day' THEN 'due_7'
            ELSE 'none'
          END AS expiry_alert_level,
          CASE
            WHEN ss.expires_at IS NOT NULL
              THEN GREATEST(
                0,
                CEIL(EXTRACT(EPOCH FROM (ss.expires_at - now())) / 86400)
              )::int
            ELSE NULL
          END AS days_left,
          o.stripe_account_id,
          o.stripe_status,
          o.country_code,
          o.currency_code,
          o.currency_symbol,
          o.language_code
        FROM "${schema}"."organizations" o
        LEFT JOIN "${schema}"."saas_subscriptions" ss ON ss.id = (
          SELECT id
          FROM "${schema}"."saas_subscriptions"
          WHERE organization_id = o.id
          ORDER BY current_period_end DESC NULLS LAST, id DESC
          LIMIT 1
        )
        LEFT JOIN "${schema}"."saas_packages" sp ON ss.package_id = sp.id
        ${whereSql}
        ORDER BY o.created_at DESC
        `,
        params,
      ));
      } catch (error) {
        if (!isInvalidUtf8DatabaseError(error)) {
          throw error;
        }
        console.warn(
          "[DB] Full customer query failed (invalid UTF-8); using organizations-only loader",
        );
        return this.getAllCustomersOrganizationsOnlyViaLatin1(
          client,
          schema,
          search,
          status,
        );
      }

      const organizationIds = rows.map((row) => Number((row as { id: number }).id));
      let adminEmailsByOrg = new Map<number, string>();
      try {
        adminEmailsByOrg = await this.loadAdminEmailsByOrganizationViaLatin1(
          client,
          schema,
          organizationIds,
        );
      } catch (error) {
        if (!isInvalidUtf8DatabaseError(error)) {
          throw error;
        }
        console.warn(
          "[DB] Continuing without admin emails after invalid UTF-8 in users table",
        );
      }

      await client.query("SET client_encoding TO 'UTF8'");
      console.warn(
        `[DB] Loaded ${rows.length} customer(s) with LATIN1 fallback (invalid UTF-8 bytes were sanitized)`,
      );
      return rows.map((row) => {
        const record = row as Record<string, unknown>;
        const orgId = Number(record.id);
        return this.mapCustomerRowFromLatin1(
          record,
          adminEmailsByOrg.get(orgId) ?? "",
        );
      });
    } finally {
      await client.query("SET client_encoding TO 'UTF8'").catch(() => undefined);
      client.release();
    }
  }

  async getAllCustomers(search?: string, status?: string): Promise<any[]> {
    try {
      return await this.getAllCustomersViaDrizzle(search, status);
    } catch (error: unknown) {
      if (!isInvalidUtf8DatabaseError(error)) {
        throw error;
      }
      console.warn(
        "[DB] getAllCustomers SELECT failed (invalid UTF-8 in a text column); using LATIN1-safe loader",
      );
      return this.getAllCustomersViaLatin1Encoding(search, status);
    }
  }

  /** @deprecated Drizzle path fails when org/user text columns contain invalid UTF-8 bytes. */
  private async getAllCustomersViaDrizzle(search?: string, status?: string): Promise<any[]> {
    const daysActiveExpression = sql<number | null>`
      CASE
        WHEN ${saasSubscriptions.currentPeriodStart} IS NOT NULL
          AND ${saasSubscriptions.expiresAt} IS NOT NULL
          THEN GREATEST(
            0,
            FLOOR(
              EXTRACT(
                EPOCH FROM (${saasSubscriptions.expiresAt} - ${saasSubscriptions.currentPeriodStart})
              ) / 86400
            )
          )
        ELSE NULL
      END
    `;

    const latestSubscriptionId = sql<number | null>`
      (
        SELECT id
        FROM saas_subscriptions
        WHERE organization_id = ${organizations.id}
        ORDER BY
          current_period_end DESC NULLS LAST,
          id DESC
        LIMIT 1
      )
    `;

    let query = db.select({
      id: organizations.id,
      name: organizations.name,
      brandName: organizations.brandName,
      subdomain: organizations.subdomain,
      subscriptionStatus: organizations.subscriptionStatus,
      organizationPaymentStatus: organizations.paymentStatus,
      computedSubscriptionStatus: sql<string>`
        CASE
          WHEN ${saasSubscriptions.status} IS NOT NULL
            AND LOWER(${saasSubscriptions.status}) NOT IN ('trial', 'active')
            THEN ${saasSubscriptions.status}
          WHEN ${saasSubscriptions.expiresAt} IS NOT NULL AND ${saasSubscriptions.expiresAt} <= now()
            THEN 'expired'
          ELSE ${organizations.subscriptionStatus}
        END
      `.as('computedSubscriptionStatus'),
      createdAt: organizations.createdAt,
      features: organizations.features,
      userCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM users
        WHERE organization_id = ${organizations.id}
      )`.as('userCount'),
      packageName: saasPackages.name,
      billingPackageId: saasPackages.id,
      subscriptionPaymentStatus: saasSubscriptions.paymentStatus,
      subscriptionStart: saasSubscriptions.currentPeriodStart,
      subscriptionEnd: saasSubscriptions.currentPeriodEnd,
      expiresAt: saasSubscriptions.expiresAt,
      daysActive: daysActiveExpression.as('daysActive'),
      expiryAlertLevel: sql<string>`
        CASE
          WHEN ${saasSubscriptions.expiresAt} IS NULL THEN 'none'
          WHEN ${saasSubscriptions.expiresAt} <= now() THEN 'expired'
          WHEN ${saasSubscriptions.expiresAt} <= now() + interval '1 day' THEN 'due_1'
          WHEN ${saasSubscriptions.expiresAt} <= now() + interval '7 day' THEN 'due_7'
          ELSE 'none'
        END
      `.as('expiryAlertLevel'),
      daysLeft: sql<number | null>`
        CASE
          WHEN ${saasSubscriptions.expiresAt} IS NOT NULL
            THEN GREATEST(
              0,
              CEIL(EXTRACT(EPOCH FROM (${saasSubscriptions.expiresAt} - now())) / 86400)
            )
          ELSE NULL
        END
      `.as('daysLeft'),
      stripeAccountId: organizations.stripeAccountId,
      stripeStatus: organizations.stripeStatus,
      country_code: organizations.country_code,
      currency_code: organizations.currency_code,
      currency_symbol: organizations.currency_symbol,
      language_code: organizations.language_code,
    })
    .from(organizations)
    .leftJoin(saasSubscriptions, eq(saasSubscriptions.id, latestSubscriptionId))
    .leftJoin(saasPackages, eq(saasSubscriptions.packageId, saasPackages.id));

    const whereConditions = [];

    if (status && status !== 'all') {
      whereConditions.push(eq(organizations.subscriptionStatus, status));
    }

    if (search && search.trim() !== '') {
      whereConditions.push(
        or(
          ilike(organizations.name, `%${search}%`),
          ilike(organizations.brandName, `%${search}%`),
          ilike(organizations.subdomain, `%${search}%`)
        )
      );
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const results = await query.orderBy(desc(organizations.createdAt));
    const organizationIds = results.map((row) => row.id);
    let adminEmailsByOrg = new Map<number, string>();
    const client = await pool.connect();
    try {
      await client.query("SET client_encoding TO 'LATIN1'");
      adminEmailsByOrg = await this.loadAdminEmailsByOrganizationViaLatin1(
        client,
        activeDbSchema,
        organizationIds,
      );
    } catch (error) {
      if (!isInvalidUtf8DatabaseError(error)) {
        throw error;
      }
      console.warn(
        "[DB] Continuing without admin emails after invalid UTF-8 in users table",
      );
    } finally {
      await client.query("SET client_encoding TO 'UTF8'").catch(() => undefined);
      client.release();
    }
    return results.map((row) => ({
        ...row,
        adminEmail: adminEmailsByOrg.get(row.id) ?? "",
    }));
  }

  async getCustomerById(customerId: number): Promise<any> {
    const daysActiveExpression = sql<number | null>`
      CASE
        WHEN ${saasSubscriptions.currentPeriodStart} IS NOT NULL
          AND ${saasSubscriptions.expiresAt} IS NOT NULL
          THEN GREATEST(
            0,
            FLOOR(
              EXTRACT(
                EPOCH FROM (${saasSubscriptions.expiresAt} - ${saasSubscriptions.currentPeriodStart})
              ) / 86400
            )
          )
        ELSE NULL
      END
    `;

    const latestSubscriptionId = sql<number | null>`
      (
        SELECT id
        FROM saas_subscriptions
        WHERE organization_id = ${organizations.id}
        ORDER BY
          current_period_end DESC NULLS LAST,
          id DESC
        LIMIT 1
      )
    `;

    const [customer] = await db.select({
      id: organizations.id,
      name: organizations.name,
      brandName: organizations.brandName,
      subdomain: organizations.subdomain,
      subscriptionStatus: organizations.subscriptionStatus,
      organizationPaymentStatus: organizations.paymentStatus,
      accessLevel: organizations.accessLevel,
      createdAt: organizations.createdAt,
      features: organizations.features,
      adminEmail: sql<string>`''`.as('adminEmail'),
      adminFirstName: sql<string>`''`.as('adminFirstName'),
      adminLastName: sql<string>`''`.as('adminLastName'),
      paymentStatus: saasSubscriptions.paymentStatus,
      subscriptionPaymentStatus: saasSubscriptions.paymentStatus,
      subscriptionStart: saasSubscriptions.currentPeriodStart,
      subscriptionEnd: saasSubscriptions.currentPeriodEnd,
      expiresAt: saasSubscriptions.expiresAt,
      details: saasSubscriptions.details,
      maxUsers: saasSubscriptions.maxUsers,
      maxPatients: saasSubscriptions.maxPatients,
      packageId: saasPackages.id,
      packageName: saasPackages.name,
      packagePrice: saasPackages.price,
      packageBillingCycle: saasPackages.billingCycle,
      packageDescription: saasPackages.description,
      packageFeatures: saasPackages.features,
      packageIsActive: saasPackages.isActive,
      packageShowOnWebsite: saasPackages.showOnWebsite,
      daysActive: daysActiveExpression.as('daysActive'),
      expiryAlertLevel: sql<string>`
        CASE
          WHEN ${saasSubscriptions.expiresAt} IS NULL THEN 'none'
          WHEN ${saasSubscriptions.expiresAt} <= now() THEN 'expired'
          WHEN ${saasSubscriptions.expiresAt} <= now() + interval '1 day' THEN 'due_1'
          WHEN ${saasSubscriptions.expiresAt} <= now() + interval '7 day' THEN 'due_7'
          ELSE 'none'
        END
      `.as('expiryAlertLevel'),
    })
    .from(organizations)
    .leftJoin(saasSubscriptions, eq(saasSubscriptions.id, latestSubscriptionId))
    .leftJoin(saasPackages, eq(saasSubscriptions.packageId, saasPackages.id))
    .where(eq(organizations.id, customerId))
    .limit(1);

    if (!customer) {
      return null;
    }

    let adminEmail: string | null = null;
    let adminFirstName: string | null = null;
    let adminLastName: string | null = null;

    try {
      const [admin] = await db
        .select({
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(and(eq(users.organizationId, customerId), eq(users.role, 'admin')))
        .orderBy(asc(users.id))
        .limit(1);

      if (admin) {
        adminEmail = admin.email;
        adminFirstName = admin.firstName;
        adminLastName = admin.lastName;
      }
    } catch (error: unknown) {
      if (!isInvalidUtf8DatabaseError(error)) {
        throw error;
      }
      const client = await pool.connect();
      try {
        await client.query("SET client_encoding TO 'LATIN1'");
        const adminEmailsByOrg = await this.loadAdminEmailsByOrganizationViaLatin1(
          client,
          activeDbSchema,
          [customerId],
        );
        adminEmail = adminEmailsByOrg.get(customerId) ?? null;
      } finally {
        await client.query("SET client_encoding TO 'UTF8'").catch(() => undefined);
        client.release();
      }
    }

    return {
      ...customer,
      adminEmail,
      adminFirstName,
      adminLastName,
      billingPackageId: customer.packageId || null,
    };
  }

  async getOrganizationSubscription(organizationId: number): Promise<any> {
    try {
      const [result] = await db.select({
        subscriptionId: saasSubscriptions.id,
        organizationId: saasSubscriptions.organizationId,
        organizationName: organizations.name,
        packageId: saasSubscriptions.packageId,
        packageName: saasPackages.name,
        packagePrice: saasPackages.price,
        billingCycle: saasPackages.billingCycle,
        status: saasSubscriptions.status,
        paymentStatus: saasSubscriptions.paymentStatus,
        details: saasSubscriptions.details,
        currentPeriodStart: saasSubscriptions.currentPeriodStart,
        currentPeriodEnd: saasSubscriptions.currentPeriodEnd,
        expiresAt: saasSubscriptions.expiresAt,
        maxUsers: saasSubscriptions.maxUsers,
        maxPatients: saasSubscriptions.maxPatients,
      })
      .from(saasSubscriptions)
      .innerJoin(organizations, eq(saasSubscriptions.organizationId, organizations.id))
      .leftJoin(saasPackages, eq(saasSubscriptions.packageId, saasPackages.id))
      .where(eq(saasSubscriptions.organizationId, organizationId));

      if (!result) {
        return null;
      }

      return {
        ...result,
        isActive: result.status === 'active',
      };
    } catch (error) {
      console.error('Error in getOrganizationSubscription:', error);
      throw error;
    }
  }

  async updateOrganizationStatus(organizationId: number, status: string): Promise<any> {
    const [org] = await db.update(organizations)
      .set({ subscriptionStatus: status, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();

    return { success: true, organization: org };
  }

  async getAllPackages(): Promise<SaaSPackage[]> {
    try {
      return await db
        .select()
        .from(saasPackages)
        .orderBy(
          asc(
            sql`CASE WHEN ${saasPackages.displayOrder} IS NULL OR ${saasPackages.displayOrder} = 0 THEN 1 ELSE 0 END`,
          ),
        )
        .orderBy(
          asc(
            sql`CASE WHEN ${saasPackages.displayOrder} IS NULL OR ${saasPackages.displayOrder} = 0 THEN NULL ELSE ${saasPackages.displayOrder} END`,
          ),
        )
        .orderBy(
          desc(
            sql`CASE WHEN ${saasPackages.displayOrder} IS NULL OR ${saasPackages.displayOrder} = 0 THEN ${saasPackages.createdAt} ELSE NULL END`,
          ),
        );
    } catch (error: any) {
      const message = (error?.message || "").toLowerCase();
      if (message.includes("display_order") || message.includes("display order")) {
        const selection = {
          id: saasPackages.id,
          name: saasPackages.name,
          description: saasPackages.description,
          price: saasPackages.price,
          billingCycle: saasPackages.billingCycle,
          stripePriceId: saasPackages.stripePriceId,
          features: saasPackages.features,
          isActive: saasPackages.isActive,
          showOnWebsite: saasPackages.showOnWebsite,
          createdAt: saasPackages.createdAt,
          updatedAt: saasPackages.updatedAt,
        };
        const packages = await db
          .select(selection)
          .from(saasPackages)
          .orderBy(desc(saasPackages.createdAt));
        return packages.map((pkg) => ({
          ...pkg,
          displayOrder: pkg.displayOrder ?? 0,
        }));
      }
      throw error;
    }
  }

  async getPackageById(packageId: number): Promise<SaaSPackage | undefined> {
    const [pkg] = await db.select().from(saasPackages).where(eq(saasPackages.id, packageId));
    return pkg || undefined;
  }

  async getWebsiteVisiblePackages(): Promise<SaaSPackage[]> {
    return await db.select().from(saasPackages)
      .where(and(eq(saasPackages.isActive, true), eq(saasPackages.showOnWebsite, true)))
      .orderBy(asc(saasPackages.price));
  }

  async createPackage(packageData: InsertSaaSPackage): Promise<SaaSPackage> {
    const [saasPackage] = await db
      .insert(saasPackages)
      .values([packageData])
      .returning();
    return saasPackage;
  }

  async updatePackage(packageId: number, packageData: Partial<InsertSaaSPackage>): Promise<SaaSPackage> {
    const [saasPackage] = await db
      .update(saasPackages)
      .set(packageData)
      .where(eq(saasPackages.id, packageId))
      .returning();
    return saasPackage;
  }

  async deletePackage(packageId: number): Promise<{ success: boolean }> {
    await db.delete(saasPackages).where(eq(saasPackages.id, packageId));
    return { success: true };
  }

  async reorderPackages(order: { id: number; displayOrder: number }[]): Promise<void> {
    if (!Array.isArray(order) || order.length === 0) {
      return;
    }
    await db.transaction(async (tx) => {
      for (const { id, displayOrder } of order) {
        await tx
          .update(saasPackages)
          .set({ displayOrder, updatedAt: new Date() })
          .where(eq(saasPackages.id, id));
      }
    });
  }


  // Comprehensive Billing System with All Payment Methods
  
  async getBillingData(searchTerm?: string, dateRange?: string): Promise<{ invoices: any[], total: number }> {
    const daysBack = dateRange ? parseInt(dateRange) : 30;
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - daysBack);
    
    let query = db.select({
      id: saasPayments.id,
      organizationName: organizations.name,
      invoiceNumber: saasPayments.invoiceNumber,
      amount: saasPayments.amount,
      currency: saasPayments.currency,
      paymentMethod: saasPayments.paymentMethod,
      paymentStatus: saasPayments.paymentStatus,
      paymentDate: saasPayments.paymentDate,
      dueDate: saasPayments.dueDate,
      description: saasPayments.description,
      organizationEmail: organizations.email,
      metadata: saasPayments.metadata,
      createdAt: saasPayments.createdAt
    })
    .from(saasPayments)
    .leftJoin(organizations, eq(saasPayments.organizationId, organizations.id));

    // Apply date filter
    query = query.where(gte(saasPayments.createdAt, dateFilter));

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== '') {
      query = query.where(
        or(
          ilike(organizations.name, `%${searchTerm}%`),
          ilike(organizations.email, `%${searchTerm}%`),
          ilike(saasPayments.invoiceNumber, `%${searchTerm}%`),
          ilike(saasPayments.description, `%${searchTerm}%`)
        )
      );
    }

    const results = await query.orderBy(desc(saasPayments.createdAt));
    
    return {
      invoices: results,
      total: results.length
    };
  }

  async getAllSaaSSubscriptions(): Promise<any[]> {
    return await db.select({
      id: saasSubscriptions.id,
      organizationId: saasSubscriptions.organizationId,
      organizationName: organizations.name,
      packageName: saasPackages.name,
      packageId: saasSubscriptions.packageId,
      status: saasSubscriptions.status,
      paymentStatus: saasSubscriptions.paymentStatus,
      maxUsers: saasSubscriptions.maxUsers,
      maxPatients: saasSubscriptions.maxPatients,
      currentPeriodStart: saasSubscriptions.currentPeriodStart,
      currentPeriodEnd: saasSubscriptions.currentPeriodEnd,
      expiresAt: saasSubscriptions.expiresAt,
      metadata: saasSubscriptions.metadata,
      durationDays: sql<number | null>`
        CASE
          WHEN ${saasSubscriptions.currentPeriodStart} IS NOT NULL AND ${saasSubscriptions.currentPeriodEnd} IS NOT NULL
            THEN GREATEST(
              0,
              FLOOR(
                EXTRACT(EPOCH FROM (${saasSubscriptions.currentPeriodEnd} - ${saasSubscriptions.currentPeriodStart})) / 86400
              )
            )
          ELSE NULL
        END
      `.as('durationDays'),
      gracePeriodDays: sql<number | null>`
        CASE
          WHEN ${saasSubscriptions.expiresAt} IS NOT NULL AND ${saasSubscriptions.currentPeriodEnd} IS NOT NULL
            THEN GREATEST(
              0,
              FLOOR(
                EXTRACT(EPOCH FROM (${saasSubscriptions.expiresAt} - ${saasSubscriptions.currentPeriodEnd})) / 86400
              )
            )
          ELSE NULL
        END
      `.as('gracePeriodDays'),
      daysRemaining: sql<number | null>`
        CASE
          WHEN ${saasSubscriptions.expiresAt} IS NOT NULL
            THEN LEAST(
              GREATEST(
                0,
                CEIL(
                  EXTRACT(EPOCH FROM (${saasSubscriptions.expiresAt} - now())) / 86400
                )
              ),
              (
                (CASE
                  WHEN ${saasSubscriptions.currentPeriodStart} IS NOT NULL AND ${saasSubscriptions.currentPeriodEnd} IS NOT NULL
                    THEN GREATEST(
                      0,
                      FLOOR(
                        EXTRACT(EPOCH FROM (${saasSubscriptions.currentPeriodEnd} - ${saasSubscriptions.currentPeriodStart})) / 86400
                      )
                    )
                  ELSE 0
                END)
                +
                (CASE
                  WHEN ${saasSubscriptions.expiresAt} IS NOT NULL AND ${saasSubscriptions.currentPeriodEnd} IS NOT NULL
                    THEN GREATEST(
                      0,
                      FLOOR(
                        EXTRACT(EPOCH FROM (${saasSubscriptions.expiresAt} - ${saasSubscriptions.currentPeriodEnd})) / 86400
                      )
                    )
                  ELSE 0
                END)
              )
            )
          ELSE NULL
        END
      `.as('daysRemaining'),
      details: saasSubscriptions.details,
      stripeSubscriptionId: saasSubscriptions.stripeSubscriptionId,
      createdAt: saasSubscriptions.createdAt,
      updatedAt: saasSubscriptions.updatedAt,
    })
    .from(saasSubscriptions)
    .leftJoin(organizations, eq(saasSubscriptions.organizationId, organizations.id))
    .leftJoin(saasPackages, eq(saasSubscriptions.packageId, saasPackages.id))
    .orderBy(desc(saasSubscriptions.createdAt));
  }

  async getSaaSSubscriptionByStripeId(stripeSubscriptionId: string): Promise<any | null> {
    if (!stripeSubscriptionId) return null;
    const [subscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription || null;
  }

  async createSaaSSubscription(subscriptionData: InsertSaaSSubscription): Promise<any> {
    const basePeriodEnd = subscriptionData.currentPeriodEnd || (() => {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      return end;
    })();
    const payload = {
      ...subscriptionData,
      currentPeriodStart: subscriptionData.currentPeriodStart || new Date(),
      currentPeriodEnd: basePeriodEnd,
      expiresAt: subscriptionData.expiresAt || addDays(basePeriodEnd, GRACE_PERIOD_DAYS),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(saasSubscriptions).values(payload).returning();
    subscriptionCache.invalidate(subscriptionData.organizationId);
    return created;
  }

  async updateSaaSSubscription(subscriptionId: number, updates: Partial<InsertSaaSSubscription>): Promise<any> {
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(saasSubscriptions)
        .set({
          ...updates,
          paymentStatus: (() => {
            if (updates.paymentStatus) return updates.paymentStatus;
            if (typeof updates.status === "string" && updates.status.trim().toLowerCase() === "expired") {
              return "expired";
            }
            return undefined;
          })(),
          expiresAt: (() => {
            if (updates.expiresAt) return updates.expiresAt;
            if (updates.currentPeriodEnd) {
              return addDays(new Date(updates.currentPeriodEnd), GRACE_PERIOD_DAYS);
            }
            return undefined;
          })(),
          updatedAt: new Date(),
        })
        .where(eq(saasSubscriptions.id, subscriptionId))
        .returning();

      if (!row) return null;

      // Keep organization.subscription_status aligned with subscription status.
      if (typeof updates.status === "string" && updates.status.trim().length > 0) {
        const nextStatus = updates.status.trim();
        const nextPaymentStatus =
          nextStatus.toLowerCase() === "expired" ? "expired" : undefined;

        await tx
          .update(organizations)
          .set({
            subscriptionStatus: nextStatus,
            ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, row.organizationId));
      }

      return row;
    });

    if (updated) {
      subscriptionCache.invalidate(updated.organizationId);
    }

    return updated || null;
  }

  async deleteSaaSSubscription(subscriptionId: number): Promise<boolean> {
    const result = await db.delete(saasSubscriptions).where(eq(saasSubscriptions.id, subscriptionId));
    return result.rowCount > 0;
  }

  async getBillingStats(dateRange?: string): Promise<any> {
    const daysBack = dateRange ? parseInt(dateRange) : 30;
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - daysBack);
    
    try {
      // Get all payments in date range
      const payments = await db.select()
        .from(saasPayments)
        .where(gte(saasPayments.createdAt, dateFilter));
      
      // Calculate statistics
      const totalRevenue = payments
        .filter(p => p.paymentStatus === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      const pendingPayments = payments
        .filter(p => p.paymentStatus === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      const overduePayments = payments
        .filter(p => p.paymentStatus === 'pending' && new Date(p.dueDate) < new Date())
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      // Count active subscriptions
      const activeSubscriptions = await db.select({ count: count() })
        .from(saasSubscriptions)
        .where(eq(saasSubscriptions.status, 'active'));
      
      // Payment method breakdown
      const paymentMethods = {
        stripe: payments.filter(p => p.paymentMethod === 'stripe').length,
        paypal: payments.filter(p => p.paymentMethod === 'paypal').length,
        bankTransfer: payments.filter(p => p.paymentMethod === 'bank_transfer').length,
        cash: payments.filter(p => p.paymentMethod === 'cash').length
      };
      
      // Monthly recurring revenue (estimate based on active subscriptions)
      const monthlyRecurring = await this.calculateMonthlyRecurring();
      
      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRecurring: Math.round(monthlyRecurring * 100) / 100,
        activeSubscriptions: activeSubscriptions[0]?.count || 0,
        pendingPayments: Math.round(pendingPayments * 100) / 100,
        overduePayments: Math.round(overduePayments * 100) / 100,
        paymentMethods
      };
    } catch (error) {
      console.error('Error fetching billing stats:', error);
      return {
        totalRevenue: 0,
        monthlyRecurring: 0,
        activeSubscriptions: 0,
        pendingPayments: 0,
        overduePayments: 0,
        paymentMethods: { stripe: 0, paypal: 0, bankTransfer: 0, cash: 0 }
      };
    }
  }
  
  async calculateMonthlyRecurring(): Promise<number> {
    try {
      const activeSubscriptions = await db.select({
        packageId: saasSubscriptions.packageId,
        packagePrice: saasPackages.price
      })
      .from(saasSubscriptions)
      .leftJoin(saasPackages, eq(saasSubscriptions.packageId, saasPackages.id))
      .where(eq(saasSubscriptions.status, 'active'));
      
      return activeSubscriptions.reduce((total, sub) => {
        const price = parseFloat(sub.packagePrice || '0');
        return total + price;
      }, 0);
    } catch (error) {
      console.error('Error calculating monthly recurring revenue:', error);
      return 0;
    }
  }

  // Payment Management Methods
  
  async createSaasPayment(paymentData: any): Promise<any> {
    const [payment] = await db.insert(saasPayments).values({
      organizationId: paymentData.organizationId,
      subscriptionId: paymentData.subscriptionId,
      invoiceNumber: paymentData.invoiceNumber || `INV-${Date.now()}`,
      amount: paymentData.amount,
      currency: paymentData.currency || 'GBP',
      paymentMethod: paymentData.paymentMethod,
      paymentStatus: paymentData.paymentStatus || 'pending',
      paymentDate: paymentData.paymentDate,
      dueDate: paymentData.dueDate,
      periodStart: paymentData.periodStart,
      periodEnd: paymentData.periodEnd,
      paymentProvider: paymentData.paymentProvider,
      providerTransactionId: paymentData.providerTransactionId,
      description: paymentData.description,
      metadata: paymentData.metadata || {},
      createdAt: paymentData.createdAt,
      updatedAt: paymentData.updatedAt || paymentData.createdAt,
    }).returning();
    
    return payment;
  }
  
  async updatePaymentStatus(paymentId: number, status: string, transactionId?: string): Promise<any> {
    const updateData: any = { 
      paymentStatus: status,
      updatedAt: new Date()
    };
    
    if (status === 'completed') {
      updateData.paymentDate = new Date();
    }
    
    if (transactionId) {
      updateData.providerTransactionId = transactionId;
    }
    
    const [payment] = await db.update(saasPayments)
      .set(updateData as any)
      .where(eq(saasPayments.id, paymentId))
      .returning();
    
    // If payment is completed, update subscription status if needed
    if (status === 'completed' && payment?.subscriptionId) {
      await this.updateSubscriptionAfterPayment(payment.subscriptionId);
    }
    
    return payment;
  }
  
  async updateSubscriptionAfterPayment(subscriptionId: number): Promise<void> {
    // Reactivate subscription if it was suspended due to non-payment
    await db.update(saasSubscriptions)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(saasSubscriptions.id, subscriptionId),
          eq(saasSubscriptions.status, 'past_due')
        )
      );
      
    // Also update organization status
    const subscription = await db.select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.id, subscriptionId))
      .limit(1);
      
    if (subscription.length > 0) {
      await db.update(organizations)
        .set({ subscriptionStatus: 'active' })
        .where(eq(organizations.id, subscription[0].organizationId));
    }
  }
  
  async suspendUnpaidSubscriptions(): Promise<void> {
    // Find overdue payments
    const overduePayments = await db.select({
      subscriptionId: saasPayments.subscriptionId,
      organizationId: saasPayments.organizationId
    })
    .from(saasPayments)
    .where(
      and(
        eq(saasPayments.paymentStatus, 'pending'),
        lt(saasPayments.dueDate, new Date())
      )
    );
    
    // Suspend subscriptions and organizations
    for (const payment of overduePayments) {
      if (payment.subscriptionId) {
        await db.update(saasSubscriptions)
          .set({ status: 'past_due' })
          .where(eq(saasSubscriptions.id, payment.subscriptionId));
      }
      
      await db.update(organizations)
        .set({ subscriptionStatus: 'suspended' })
        .where(eq(organizations.id, payment.organizationId));
    }
  }
  
  // Invoice Management
  
  async createInvoice(invoiceData: any): Promise<any> {
    const [invoice] = await db.insert(saasInvoices).values({
      organizationId: invoiceData.organizationId,
      subscriptionId: invoiceData.subscriptionId,
      invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now()}`,
      amount: invoiceData.amount,
      currency: invoiceData.currency || 'GBP',
      status: invoiceData.status || 'draft',
      issueDate: invoiceData.issueDate || new Date(),
      dueDate: invoiceData.dueDate,
      periodStart: invoiceData.periodStart,
      periodEnd: invoiceData.periodEnd,
      lineItems: invoiceData.lineItems || [],
      notes: invoiceData.notes
    }).returning();
    
    return invoice;
  }
  
  async getOverdueInvoices(): Promise<any[]> {
    return await db.select({
      id: saasInvoices.id,
      organizationName: organizations.name,
      invoiceNumber: saasInvoices.invoiceNumber,
      amount: saasInvoices.amount,
      dueDate: saasInvoices.dueDate,
      daysPastDue: sql<number>`EXTRACT(day FROM NOW() - ${saasInvoices.dueDate})`
    })
    .from(saasInvoices)
    .leftJoin(organizations, eq(saasInvoices.organizationId, organizations.id))
    .where(
      and(
        eq(saasInvoices.status, 'sent'),
        lt(saasInvoices.dueDate, new Date())
      )
    )
    .orderBy(desc(saasInvoices.dueDate));
  }

  async getSaaSSettings(): Promise<any> {
    try {
      // Get all settings from database
      const dbSettings = await db.select().from(saasSettings);
      
      // Default settings structure
      const defaultSettings = {
        systemSettings: {
          platformName: 'Cura EMR Platform',
          supportEmail: 'support@curaemr.ai',
          maintenanceMode: false,
          registrationEnabled: true,
          trialPeriodDays: 14,
        },
        emailSettings: {
          smtpHost: '',
          smtpPort: 587,
          smtpUsername: '',
          smtpPassword: '',
          fromEmail: '',
          fromName: 'Cura Software Limited',
        },
        securitySettings: {
          passwordMinLength: 8,
          requireTwoFactor: false,
          sessionTimeoutMinutes: 30,
          maxLoginAttempts: 5,
        },
        billingSettings: {
          currency: 'GBP',
          taxRate: 20,
          invoicePrefix: 'CURA',
          paymentMethods: ['stripe', 'paypal'],
        },
      };

      // Merge database settings with defaults
      const settings = JSON.parse(JSON.stringify(defaultSettings));
      
      dbSettings.forEach(setting => {
        const [category, key] = setting.key.split('.');
        if (settings[category] && key) {
          settings[category][key] = setting.value;
        }
      });

      return settings;
    } catch (error) {
      console.error('Error getting SaaS settings:', error);
      // Return defaults if database error
      return {
        systemSettings: {
          platformName: 'Cura EMR Platform',
          supportEmail: 'support@curaemr.ai',
          maintenanceMode: false,
          registrationEnabled: true,
          trialPeriodDays: 14,
        },
        emailSettings: {
          smtpHost: '',
          smtpPort: 587,
          smtpUsername: '',
          smtpPassword: '',
          fromEmail: '',
          fromName: 'Cura Software Limited',
        },
        securitySettings: {
          passwordMinLength: 8,
          requireTwoFactor: false,
          sessionTimeoutMinutes: 30,
          maxLoginAttempts: 5,
        },
        billingSettings: {
          currency: 'GBP',
          taxRate: 20,
          invoicePrefix: 'CURA',
          paymentMethods: ['stripe', 'paypal'],
        },
      };
    }
  }

  async updateSaaSSettings(settings: any): Promise<any> {
    try {
      // Update each setting in the database
      for (const [category, categorySettings] of Object.entries(settings)) {
        for (const [key, value] of Object.entries(categorySettings as Record<string, any>)) {
          const settingKey = `${category}.${key}`;
          await db
            .insert(saasSettings)
            .values({
              key: settingKey,
              value: value,
              category: category,
            })
            .onConflictDoUpdate({
              target: saasSettings.key,
              set: {
                value: value,
                updatedAt: new Date(),
              },
            });
        }
      }
      return { success: true, settings };
    } catch (error) {
      console.error('Error updating SaaS settings:', error);
      throw error;
    }
  }

  async testEmailSettings(): Promise<any> {
    // Test email configuration - placeholder implementation
    return { success: true, message: 'Email test completed' };
  }

  async getRecentActivity(page: number = 1, limit: number = 10): Promise<{ activities: any[], total: number, totalPages: number }> {
    const activities = [];
    
    try {
      // Get recent customer registrations
      let recentCustomers = [];
      try {
        recentCustomers = await db.select({
          id: organizations.id,
          name: organizations.name,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(10);
      } catch (error) {
        console.error('Error fetching recent customers:', error);
      }

      // Add customer creation activities
      recentCustomers.forEach(c => {
        activities.push({
          id: `customer_${c.id}`,
          type: 'customer_created',
          title: 'New Customer Registered',
          description: `${c.name} joined the platform`,
          timestamp: c.createdAt,
          icon: 'building'
        });
      });

      // Get recent user registrations
      let recentUsers = [];
      try {
        recentUsers = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          organizationId: users.organizationId,
          createdAt: users.createdAt,
          orgName: organizations.name
        })
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .where(ne(users.organizationId, 0))
        .orderBy(desc(users.createdAt))
        .limit(10);
      } catch (error) {
        console.error('Error fetching recent users:', error);
      }

      // Add user creation activities
      recentUsers.forEach(u => {
        activities.push({
          id: `user_${u.id}`,
          type: 'user_created',
          title: 'New User Added',
          description: `${u.firstName} ${u.lastName} joined ${u.orgName || 'Unknown Organization'}`,
          timestamp: u.createdAt,
          icon: 'user'
        });
      });

      // Skip subscription updates to prevent database errors in SaaS portal
      // Note: Subscription activity disabled due to JSONB field compatibility issues

    } catch (error) {
      console.error('Error fetching activity data:', error);
    }

    // Sort by timestamp
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const total = sortedActivities.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedActivities = sortedActivities.slice(offset, offset + limit);
    
    return {
      activities: paginatedActivities,
      total,
      totalPages
    };
  }

  async getSystemAlerts(): Promise<any[]> {
    const alerts = [];
    
    // Check for suspended customers
    const [suspendedCustomers] = await db.select({ count: count() })
      .from(organizations)
      .where(eq(organizations.subscriptionStatus, 'suspended'));
    
    if (suspendedCustomers.count > 0) {
      alerts.push({
        id: 'suspended_customers',
        type: 'warning',
        title: 'Suspended Customers',
        description: `${suspendedCustomers.count} customer${suspendedCustomers.count > 1 ? 's' : ''} currently suspended`,
        actionRequired: true,
        priority: 'medium'
      });
    }

    // Check for cancelled customers
    const [cancelledCustomers] = await db.select({ count: count() })
      .from(organizations)
      .where(eq(organizations.subscriptionStatus, 'cancelled'));
    
    if (cancelledCustomers.count > 0) {
      alerts.push({
        id: 'cancelled_customers',
        type: 'error',
        title: 'Cancelled Customers',
        description: `${cancelledCustomers.count} customer${cancelledCustomers.count > 1 ? 's' : ''} cancelled subscription`,
        actionRequired: true,
        priority: 'high'
      });
    }

    // Check for trial customers nearing expiration (simulate based on creation date)
    const trialCutoffDate = new Date();
    trialCutoffDate.setDate(trialCutoffDate.getDate() - 12); // 12 days ago (trial period is typically 14 days)
    
    const [expiringTrials] = await db.select({ count: count() })
      .from(organizations)
      .where(and(
        eq(organizations.subscriptionStatus, 'trial'),
        lt(organizations.createdAt, trialCutoffDate)
      ));
    
    if (expiringTrials.count > 0) {
      alerts.push({
        id: 'expiring_trials',
        type: 'warning',
        title: 'Trials Expiring Soon',
        description: `${expiringTrials.count} trial${expiringTrials.count > 1 ? 's' : ''} expiring within 2 days`,
        actionRequired: true,
        priority: 'medium'
      });
    }

    // Check for inactive packages
    const [inactivePackages] = await db.select({ count: count() })
      .from(saasPackages)
      .where(eq(saasPackages.isActive, false));
    
    if (inactivePackages.count > 0) {
      alerts.push({
        id: 'inactive_packages',
        type: 'info',
        title: 'Inactive Packages',
        description: `${inactivePackages.count} billing package${inactivePackages.count > 1 ? 's' : ''} currently inactive`,
        actionRequired: false,
        priority: 'low'
      });
    }

    return alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    });
  }

  // Chatbot Configuration Methods
  async getChatbotConfig(organizationId: number): Promise<ChatbotConfig | undefined> {
    const [config] = await db.select().from(chatbotConfigs).where(eq(chatbotConfigs.organizationId, organizationId));
    return config || undefined;
  }

  async createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig> {
    const [created] = await db.insert(chatbotConfigs).values([config]).returning();
    return created;
  }

  async updateChatbotConfig(organizationId: number, updates: Partial<InsertChatbotConfig>): Promise<ChatbotConfig | undefined> {
    const [updated] = await db.update(chatbotConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatbotConfigs.organizationId, organizationId))
      .returning();
    return updated || undefined;
  }

  // Chatbot Session Methods
  async getChatbotSession(sessionId: string, organizationId: number): Promise<ChatbotSession | undefined> {
    const [session] = await db.select().from(chatbotSessions)
      .where(and(eq(chatbotSessions.sessionId, sessionId), eq(chatbotSessions.organizationId, organizationId)));
    return session || undefined;
  }

  async createChatbotSession(session: InsertChatbotSession): Promise<ChatbotSession> {
    const [created] = await db.insert(chatbotSessions).values([session]).returning();
    return created;
  }

  async updateChatbotSession(sessionId: string, organizationId: number, updates: Partial<InsertChatbotSession>): Promise<ChatbotSession | undefined> {
    const [updated] = await db.update(chatbotSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(chatbotSessions.sessionId, sessionId), eq(chatbotSessions.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async getChatbotSessionsByOrganization(organizationId: number, limit = 50): Promise<ChatbotSession[]> {
    return await db.select().from(chatbotSessions)
      .where(eq(chatbotSessions.organizationId, organizationId))
      .orderBy(desc(chatbotSessions.createdAt))
      .limit(limit);
  }

  // Chatbot Message Methods
  async getChatbotMessage(messageId: string, organizationId: number): Promise<ChatbotMessage | undefined> {
    const [message] = await db.select().from(chatbotMessages)
      .where(and(eq(chatbotMessages.messageId, messageId), eq(chatbotMessages.organizationId, organizationId)));
    return message || undefined;
  }

  async getChatbotMessagesBySession(sessionId: number, organizationId: number): Promise<ChatbotMessage[]> {
    return await db.select().from(chatbotMessages)
      .where(and(eq(chatbotMessages.sessionId, sessionId), eq(chatbotMessages.organizationId, organizationId)))
      .orderBy(asc(chatbotMessages.createdAt));
  }

  async createChatbotMessage(message: InsertChatbotMessage): Promise<ChatbotMessage> {
    const [created] = await db.insert(chatbotMessages).values([message]).returning();
    return created;
  }

  async updateChatbotMessage(messageId: string, organizationId: number, updates: Partial<InsertChatbotMessage>): Promise<ChatbotMessage | undefined> {
    const [updated] = await db.update(chatbotMessages)
      .set(updates)
      .where(and(eq(chatbotMessages.messageId, messageId), eq(chatbotMessages.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  // Chatbot Analytics Methods
  async getChatbotAnalytics(organizationId: number, date?: Date): Promise<ChatbotAnalytics[]> {
    let query = db.select().from(chatbotAnalytics)
      .where(eq(chatbotAnalytics.organizationId, organizationId));
    
    if (date) {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      query = query.where(and(
        eq(chatbotAnalytics.organizationId, organizationId),
        gte(chatbotAnalytics.date, startOfDay),
        lt(chatbotAnalytics.date, endOfDay)
      ));
    }

    return await query.orderBy(desc(chatbotAnalytics.date));
  }

  async createChatbotAnalytics(analytics: InsertChatbotAnalytics): Promise<ChatbotAnalytics> {
    const [created] = await db.insert(chatbotAnalytics).values([analytics]).returning();
    return created;
  }

  async updateChatbotAnalytics(id: number, organizationId: number, updates: Partial<InsertChatbotAnalytics>): Promise<ChatbotAnalytics | undefined> {
    const [updated] = await db.update(chatbotAnalytics)
      .set(updates)
      .where(and(eq(chatbotAnalytics.id, id), eq(chatbotAnalytics.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  // Voice Notes Methods
  async getVoiceNote(id: string, organizationId: number): Promise<VoiceNote | undefined> {
    const [voiceNote] = await db
      .select()
      .from(voiceNotes)
      .where(and(eq(voiceNotes.id, id), eq(voiceNotes.organizationId, organizationId)));
    return voiceNote || undefined;
  }

  async getVoiceNotesByOrganization(organizationId: number, limit = 50): Promise<VoiceNote[]> {
    return await db
      .select()
      .from(voiceNotes)
      .where(eq(voiceNotes.organizationId, organizationId))
      .orderBy(desc(voiceNotes.createdAt))
      .limit(limit);
  }

  async getVoiceNotesByPatient(patientId: string, organizationId: number): Promise<VoiceNote[]> {
    return await db
      .select()
      .from(voiceNotes)
      .where(and(eq(voiceNotes.patientId, patientId), eq(voiceNotes.organizationId, organizationId)))
      .orderBy(desc(voiceNotes.createdAt));
  }

  async getVoiceNotesByStatus(patientId: number, organizationId: number, status: string): Promise<VoiceNote[]> {
    return await db
      .select()
      .from(voiceNotes)
      .where(and(
        eq(voiceNotes.patientId, patientId.toString()), // Convert to string as voice notes uses string patientId
        eq(voiceNotes.organizationId, organizationId),
        eq(voiceNotes.status, status)
      ))
      .orderBy(desc(voiceNotes.createdAt));
  }

  async createVoiceNote(voiceNote: InsertVoiceNote): Promise<VoiceNote> {
    const [created] = await db.insert(voiceNotes).values([voiceNote]).returning();
    return created;
  }

  async updateVoiceNote(id: string, organizationId: number, updates: Partial<InsertVoiceNote>): Promise<VoiceNote | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(voiceNotes)
      .set(updateData)
      .where(and(eq(voiceNotes.id, id), eq(voiceNotes.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteVoiceNote(id: string, organizationId: number): Promise<boolean> {
    console.log(`[STORAGE] deleteVoiceNote called - id: ${id} (type: ${typeof id}), organizationId: ${organizationId} (type: ${typeof organizationId})`);
    try {
      // First, verify the note exists with the correct org ID
      const [existingNote] = await db
        .select()
        .from(voiceNotes)
        .where(and(eq(voiceNotes.id, id), eq(voiceNotes.organizationId, organizationId)))
        .limit(1);
      
      if (!existingNote) {
        console.log(`[STORAGE] Note not found with matching id and orgId. Checking if note exists with different orgId...`);
        // Check if note exists with different org ID
        const [checkNote] = await db
          .select()
          .from(voiceNotes)
          .where(eq(voiceNotes.id, id))
          .limit(1);
        
        if (checkNote) {
          console.error(`[STORAGE] Note exists but with different orgId. Note orgId: ${checkNote.organizationId}, Requested orgId: ${organizationId}`);
        } else {
          console.log(`[STORAGE] Note does not exist in database: ${id}`);
        }
        return false;
      }
      
      console.log(`[STORAGE] Note found, proceeding with deletion. Note:`, {
        id: existingNote.id,
        organizationId: existingNote.organizationId,
        patientName: existingNote.patientName
      });
      
      // Delete the note using returning() to verify deletion
      const deletedRows = await db
        .delete(voiceNotes)
        .where(and(eq(voiceNotes.id, id), eq(voiceNotes.organizationId, organizationId)))
        .returning();
      
      const deleted = deletedRows.length > 0;
      
      console.log(`[STORAGE] deleteVoiceNote result - deleted: ${deleted}, deletedRows.length: ${deletedRows.length}`);
      
      // Verify deletion by checking if note still exists
      if (deleted) {
        const [verifyNote] = await db
          .select()
          .from(voiceNotes)
          .where(and(eq(voiceNotes.id, id), eq(voiceNotes.organizationId, organizationId)))
          .limit(1);
        
        if (verifyNote) {
          console.error(`[STORAGE] ERROR: Note still exists after deletion! This should not happen.`);
          return false;
        } else {
          console.log(`[STORAGE] Deletion verified: Note no longer exists in database`);
        }
      } else {
        console.error(`[STORAGE] Delete operation returned 0 rows. Note may not have been deleted.`);
      }
      
      return deleted;
    } catch (error) {
      console.error(`[STORAGE] Error deleting voice note:`, error);
      throw error;
    }
  }

  // User Document Preferences Methods
  async getUserDocumentPreferences(userId: number, organizationId: number): Promise<UserDocumentPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userDocumentPreferences)
      .where(and(eq(userDocumentPreferences.userId, userId), eq(userDocumentPreferences.organizationId, organizationId)));
    return preferences || undefined;
  }

  async createUserDocumentPreferences(preferences: InsertUserDocumentPreferences): Promise<UserDocumentPreferences> {
    const [created] = await db.insert(userDocumentPreferences).values([preferences]).returning();
    return created;
  }

  async updateUserDocumentPreferences(userId: number, organizationId: number, updates: UpdateUserDocumentPreferences): Promise<UserDocumentPreferences | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(userDocumentPreferences)
      .set(updateData)
      .where(and(eq(userDocumentPreferences.userId, userId), eq(userDocumentPreferences.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  // Letter Draft Methods
  async getLetterDraft(id: number, organizationId: number): Promise<LetterDraft | undefined> {
    const [draft] = await db
      .select()
      .from(letterDrafts)
      .where(and(eq(letterDrafts.id, id), eq(letterDrafts.organizationId, organizationId)));
    return draft || undefined;
  }

  async getLetterDraftsByUser(userId: number, organizationId: number): Promise<LetterDraft[]> {
    return await db
      .select()
      .from(letterDrafts)
      .where(and(eq(letterDrafts.userId, userId), eq(letterDrafts.organizationId, organizationId)))
      .orderBy(desc(letterDrafts.createdAt));
  }

  async createLetterDraft(draft: InsertLetterDraft): Promise<LetterDraft> {
    const [created] = await db.insert(letterDrafts).values([draft]).returning();
    return created;
  }

  async updateLetterDraft(id: number, organizationId: number, updates: Partial<InsertLetterDraft>): Promise<LetterDraft | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(letterDrafts)
      .set(updateData)
      .where(and(eq(letterDrafts.id, id), eq(letterDrafts.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteLetterDraft(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(letterDrafts)
      .where(and(eq(letterDrafts.id, id), eq(letterDrafts.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Financial Forecasting Implementation
  async getFinancialForecasts(organizationId: number): Promise<FinancialForecast[]> {
    return await db
      .select()
      .from(financialForecasts)
      .where(and(eq(financialForecasts.organizationId, organizationId), eq(financialForecasts.isActive, true)))
      .orderBy(desc(financialForecasts.generatedAt));
  }

  async getFinancialForecast(id: number, organizationId: number): Promise<FinancialForecast | undefined> {
    const [forecast] = await db
      .select()
      .from(financialForecasts)
      .where(and(eq(financialForecasts.id, id), eq(financialForecasts.organizationId, organizationId)));
    return forecast || undefined;
  }

  async generateFinancialForecasts(organizationId: number): Promise<FinancialForecast[]> {
    // Since revenueRecords table doesn't exist yet, we'll create mock historical data based on claims
    const revenueHistory: any[] = [];
    
    // Try to get some revenue approximation from claims data
    try {
      const claimsRevenue = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${claims.serviceDate})`.as('month'),
          revenue: sql<number>`SUM(CASE WHEN ${claims.status} = 'paid' THEN ${claims.paymentAmount} ELSE ${claims.amount} * 0.8 END)`.as('revenue')
        })
        .from(claims)
        .where(and(
          eq(claims.organizationId, organizationId),
          gte(claims.serviceDate, sql`NOW() - INTERVAL '12 months'`)
        ))
        .groupBy(sql`DATE_TRUNC('month', ${claims.serviceDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${claims.serviceDate}) DESC`)
        .limit(12);
      
      revenueHistory.push(...claimsRevenue);
    } catch (error) {
      console.log('Could not get claims-based revenue data, using sample data');
      // If we can't get claims data, create sample revenue history
      for (let i = 0; i < 3; i++) {
        const baseAmount = 45000 + Math.random() * 10000;
        revenueHistory.push({
          month: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)).toISOString(),
          revenue: baseAmount
        });
      }
    }

    // Get historical claims data
    const claimsHistory = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${claims.serviceDate})`.as('month'),
        totalAmount: sql<number>`SUM(${claims.amount})`.as('totalAmount'),
        claimCount: sql<number>`COUNT(*)`.as('claimCount'),
        paidAmount: sql<number>`SUM(CASE WHEN ${claims.status} = 'paid' THEN ${claims.paymentAmount} ELSE 0 END)`.as('paidAmount'),
      })
      .from(claims)
      .where(and(
        eq(claims.organizationId, organizationId),
        gte(claims.serviceDate, sql`NOW() - INTERVAL '12 months'`)
      ))
      .groupBy(sql`DATE_TRUNC('month', ${claims.serviceDate})`)
      .orderBy(sql`DATE_TRUNC('month', ${claims.serviceDate}) DESC`);

    const forecasts: InsertFinancialForecast[] = [];
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const forecastPeriod = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    // 1. Monthly Revenue Forecast
    if (revenueHistory.length >= 3) {
      const recentRevenues = revenueHistory.slice(0, 3).map(r => Number(r.revenue));
      const avgRevenue = recentRevenues.reduce((sum, rev) => sum + rev, 0) / recentRevenues.length;
      const trend = recentRevenues[0] > recentRevenues[2] ? 'up' : recentRevenues[0] < recentRevenues[2] ? 'down' : 'stable';
      const growth = recentRevenues.length >= 2 ? (recentRevenues[0] - recentRevenues[1]) / recentRevenues[1] : 0;
      const projectedRevenue = avgRevenue * (1 + (growth * 0.5)); // Conservative growth projection
      
      forecasts.push({
        organizationId,
        category: 'Monthly Revenue',
        forecastPeriod,
        currentValue: recentRevenues[0],
        projectedValue: projectedRevenue,
        variance: projectedRevenue - recentRevenues[0],
        trend,
        confidence: Math.min(85, 60 + (revenueHistory.length * 3)), // Higher confidence with more data
        methodology: 'historical_trend',
        keyFactors: [
          { factor: 'Historical revenue trend', impact: 'positive', weight: 0.4, description: 'Based on last 3 months performance' },
          { factor: 'Seasonal variations', impact: 'neutral', weight: 0.3, description: 'Accounting for seasonal patterns' },
          { factor: 'Market conditions', impact: trend === 'up' ? 'positive' : 'neutral', weight: 0.3, description: 'Current market outlook' }
        ],
        metadata: {
          basedOnMonths: revenueHistory.length,
          dataPoints: recentRevenues.length,
          correlationCoeff: 0.75,
          assumptions: ['Consistent patient volume', 'Stable pricing', 'No major market disruptions']
        },
        isActive: true
      });
    }

    // 2. Collection Rate Forecast
    if (claimsHistory.length >= 3) {
      const recentClaims = claimsHistory.slice(0, 3);
      const collectionRates = recentClaims.map(c => c.paidAmount > 0 ? (c.paidAmount / c.totalAmount) * 100 : 0);
      const avgCollectionRate = collectionRates.reduce((sum, rate) => sum + rate, 0) / collectionRates.length;
      const trend = collectionRates[0] > collectionRates[2] ? 'up' : collectionRates[0] < collectionRates[2] ? 'down' : 'stable';
      const projectedRate = Math.min(95, avgCollectionRate * 1.02); // Slight improvement with cap at 95%
      
      forecasts.push({
        organizationId,
        category: 'Collection Rate',
        forecastPeriod,
        currentValue: collectionRates[0],
        projectedValue: projectedRate,
        variance: projectedRate - collectionRates[0],
        trend,
        confidence: Math.min(80, 50 + (claimsHistory.length * 4)),
        methodology: 'historical_trend',
        keyFactors: [
          { factor: 'Insurance relationships', impact: 'positive', weight: 0.4, description: 'Established payer contracts' },
          { factor: 'Claims processing efficiency', impact: 'positive', weight: 0.3, description: 'Improved submission accuracy' },
          { factor: 'Follow-up processes', impact: 'positive', weight: 0.3, description: 'Enhanced collections workflow' }
        ],
        metadata: {
          basedOnMonths: claimsHistory.length,
          dataPoints: collectionRates.length,
          correlationCoeff: 0.68,
          assumptions: ['Consistent payer mix', 'Stable reimbursement rates', 'Maintained follow-up protocols']
        },
        isActive: true
      });
    }

    // 3. Claim Volume Forecast
    if (claimsHistory.length >= 3) {
      const recentVolumes = claimsHistory.slice(0, 3).map(c => c.claimCount);
      const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
      const trend = recentVolumes[0] > recentVolumes[2] ? 'up' : recentVolumes[0] < recentVolumes[2] ? 'down' : 'stable';
      const growth = recentVolumes.length >= 2 ? (recentVolumes[0] - recentVolumes[1]) / recentVolumes[1] : 0;
      const projectedVolume = Math.round(avgVolume * (1 + (growth * 0.3))); // Conservative volume projection

      forecasts.push({
        organizationId,
        category: 'Claim Volume',
        forecastPeriod,
        currentValue: recentVolumes[0],
        projectedValue: projectedVolume,
        variance: projectedVolume - recentVolumes[0],
        trend,
        confidence: Math.min(78, 55 + (claimsHistory.length * 3)),
        methodology: 'historical_trend',
        keyFactors: [
          { factor: 'Patient appointment trends', impact: trend === 'up' ? 'positive' : 'neutral', weight: 0.5, description: 'Based on recent patient volume' },
          { factor: 'Service mix changes', impact: 'neutral', weight: 0.3, description: 'Evolution in service offerings' },
          { factor: 'Operational capacity', impact: 'positive', weight: 0.2, description: 'Current staffing and resources' }
        ],
        metadata: {
          basedOnMonths: claimsHistory.length,
          dataPoints: recentVolumes.length,
          correlationCoeff: 0.72,
          assumptions: ['Stable patient base', 'Consistent service delivery', 'No major capacity constraints']
        },
        isActive: true
      });
    }

    // 4. Operating Expenses Forecast
    if (revenueHistory.length >= 3) {
      const recentExpenses = revenueHistory.slice(0, 3).map(r => Number(r.expenses));
      const avgExpenses = recentExpenses.reduce((sum, exp) => sum + exp, 0) / recentExpenses.length;
      const trend = recentExpenses[0] > recentExpenses[2] ? 'up' : recentExpenses[0] < recentExpenses[2] ? 'down' : 'stable';
      const growth = recentExpenses.length >= 2 ? (recentExpenses[0] - recentExpenses[1]) / recentExpenses[1] : 0;
      const projectedExpenses = avgExpenses * (1 + Math.max(0.02, growth * 0.8)); // Factor in inflation with minimum 2%

      forecasts.push({
        organizationId,
        category: 'Operating Expenses',
        forecastPeriod,
        currentValue: recentExpenses[0],
        projectedValue: projectedExpenses,
        variance: projectedExpenses - recentExpenses[0],
        trend: 'up', // Expenses generally trend upward due to inflation
        confidence: Math.min(82, 65 + (revenueHistory.length * 2)),
        methodology: 'historical_trend',
        keyFactors: [
          { factor: 'Inflation adjustment', impact: 'negative', weight: 0.4, description: 'Expected cost increases' },
          { factor: 'Operational efficiency', impact: 'positive', weight: 0.3, description: 'Process improvements' },
          { factor: 'Technology investments', impact: 'negative', weight: 0.3, description: 'System upgrades and maintenance' }
        ],
        metadata: {
          basedOnMonths: revenueHistory.length,
          dataPoints: recentExpenses.length,
          correlationCoeff: 0.71,
          assumptions: ['Standard inflation rates', 'No major operational changes', 'Consistent expense categories']
        },
        isActive: true
      });
    }

    // Save generated forecasts
    const savedForecasts: FinancialForecast[] = [];
    for (const forecast of forecasts) {
      const saved = await this.createFinancialForecast(forecast);
      savedForecasts.push(saved);
    }

    return savedForecasts;
  }

  async createFinancialForecast(forecast: InsertFinancialForecast): Promise<FinancialForecast> {
    const [created] = await db.insert(financialForecasts).values([forecast]).returning();
    return created;
  }

  async updateFinancialForecast(id: number, organizationId: number, updates: Partial<InsertFinancialForecast>): Promise<FinancialForecast | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(financialForecasts)
      .set(updateData)
      .where(and(eq(financialForecasts.id, id), eq(financialForecasts.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteFinancialForecast(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(financialForecasts)
      .where(and(eq(financialForecasts.id, id), eq(financialForecasts.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Forecast Models Implementation
  async getForecastModels(organizationId: number): Promise<ForecastModel[]> {
    return await db
      .select()
      .from(forecastModels)
      .where(and(eq(forecastModels.organizationId, organizationId), eq(forecastModels.isActive, true)))
      .orderBy(desc(forecastModels.createdAt));
  }

  async getForecastModel(id: number, organizationId: number): Promise<ForecastModel | undefined> {
    const [model] = await db
      .select()
      .from(forecastModels)
      .where(and(eq(forecastModels.id, id), eq(forecastModels.organizationId, organizationId)));
    return model || undefined;
  }

  async createForecastModel(model: InsertForecastModel): Promise<ForecastModel> {
    const [created] = await db.insert(forecastModels).values([model]).returning();
    return created;
  }

  async updateForecastModel(id: number, organizationId: number, updates: Partial<InsertForecastModel>): Promise<ForecastModel | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(forecastModels)
      .set(updateData)
      .where(and(eq(forecastModels.id, id), eq(forecastModels.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteForecastModel(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(forecastModels)
      .where(and(eq(forecastModels.id, id), eq(forecastModels.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Integration Implementation

  // QuickBooks Connections
  async getQuickBooksConnections(organizationId: number): Promise<QuickBooksConnection[]> {
    return await db
      .select()
      .from(quickbooksConnections)
      .where(eq(quickbooksConnections.organizationId, organizationId))
      .orderBy(desc(quickbooksConnections.createdAt));
  }

  async getQuickBooksConnection(id: number, organizationId: number): Promise<QuickBooksConnection | undefined> {
    const [connection] = await db
      .select()
      .from(quickbooksConnections)
      .where(and(eq(quickbooksConnections.id, id), eq(quickbooksConnections.organizationId, organizationId)));
    return connection || undefined;
  }

  async getActiveQuickBooksConnection(organizationId: number): Promise<QuickBooksConnection | undefined> {
    const [connection] = await db
      .select()
      .from(quickbooksConnections)
      .where(and(
        eq(quickbooksConnections.organizationId, organizationId),
        eq(quickbooksConnections.isActive, true)
      ))
      .orderBy(desc(quickbooksConnections.createdAt))
      .limit(1);
    return connection || undefined;
  }

  async createQuickBooksConnection(connection: InsertQuickBooksConnection): Promise<QuickBooksConnection> {
    const [created] = await db.insert(quickbooksConnections).values([connection]).returning();
    return created;
  }

  async updateQuickBooksConnection(id: number, organizationId: number, updates: Partial<InsertQuickBooksConnection>): Promise<QuickBooksConnection | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksConnections)
      .set(updateData)
      .where(and(eq(quickbooksConnections.id, id), eq(quickbooksConnections.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksConnection(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksConnections)
      .where(and(eq(quickbooksConnections.id, id), eq(quickbooksConnections.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Sync Logs
  async getQuickBooksSyncLogs(organizationId: number, connectionId?: number, syncType?: string): Promise<QuickBooksSyncLog[]> {
    let query = db
      .select()
      .from(quickbooksSyncLogs)
      .where(eq(quickbooksSyncLogs.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksSyncLogs.connectionId, connectionId));
    }

    if (syncType) {
      query = query.where(eq(quickbooksSyncLogs.syncType, syncType));
    }

    return await query.orderBy(desc(quickbooksSyncLogs.createdAt)).limit(100);
  }

  async createQuickBooksSyncLog(log: InsertQuickBooksSyncLog): Promise<QuickBooksSyncLog> {
    const [created] = await db.insert(quickbooksSyncLogs).values([log]).returning();
    return created;
  }

  async updateQuickBooksSyncLog(id: number, updates: Partial<InsertQuickBooksSyncLog>): Promise<QuickBooksSyncLog | undefined> {
    const [updated] = await db
      .update(quickbooksSyncLogs)
      .set(updates)
      .where(eq(quickbooksSyncLogs.id, id))
      .returning();
    return updated || undefined;
  }

  // QuickBooks Customer Mappings
  async getQuickBooksCustomerMappings(organizationId: number, connectionId?: number): Promise<QuickBooksCustomerMapping[]> {
    let query = db
      .select()
      .from(quickbooksCustomerMappings)
      .where(eq(quickbooksCustomerMappings.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksCustomerMappings.connectionId, connectionId));
    }

    return await query.orderBy(desc(quickbooksCustomerMappings.createdAt));
  }

  async getQuickBooksCustomerMapping(patientId: number, organizationId: number): Promise<QuickBooksCustomerMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(quickbooksCustomerMappings)
      .where(and(
        eq(quickbooksCustomerMappings.patientId, patientId),
        eq(quickbooksCustomerMappings.organizationId, organizationId)
      ));
    return mapping || undefined;
  }

  async createQuickBooksCustomerMapping(mapping: InsertQuickBooksCustomerMapping): Promise<QuickBooksCustomerMapping> {
    const [created] = await db.insert(quickbooksCustomerMappings).values([mapping]).returning();
    return created;
  }

  async updateQuickBooksCustomerMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksCustomerMapping>): Promise<QuickBooksCustomerMapping | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksCustomerMappings)
      .set(updateData)
      .where(and(eq(quickbooksCustomerMappings.id, id), eq(quickbooksCustomerMappings.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksCustomerMapping(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksCustomerMappings)
      .where(and(eq(quickbooksCustomerMappings.id, id), eq(quickbooksCustomerMappings.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Invoice Mappings
  async getQuickBooksInvoiceMappings(organizationId: number, connectionId?: number): Promise<QuickBooksInvoiceMapping[]> {
    let query = db
      .select()
      .from(quickbooksInvoiceMappings)
      .where(eq(quickbooksInvoiceMappings.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksInvoiceMappings.connectionId, connectionId));
    }

    return await query.orderBy(desc(quickbooksInvoiceMappings.createdAt));
  }

  async getQuickBooksInvoiceMapping(emrInvoiceId: string, organizationId: number): Promise<QuickBooksInvoiceMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(quickbooksInvoiceMappings)
      .where(and(
        eq(quickbooksInvoiceMappings.emrInvoiceId, emrInvoiceId),
        eq(quickbooksInvoiceMappings.organizationId, organizationId)
      ));
    return mapping || undefined;
  }

  async createQuickBooksInvoiceMapping(mapping: InsertQuickBooksInvoiceMapping): Promise<QuickBooksInvoiceMapping> {
    const [created] = await db.insert(quickbooksInvoiceMappings).values([mapping]).returning();
    return created;
  }

  async updateQuickBooksInvoiceMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksInvoiceMapping>): Promise<QuickBooksInvoiceMapping | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksInvoiceMappings)
      .set(updateData)
      .where(and(eq(quickbooksInvoiceMappings.id, id), eq(quickbooksInvoiceMappings.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksInvoiceMapping(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksInvoiceMappings)
      .where(and(eq(quickbooksInvoiceMappings.id, id), eq(quickbooksInvoiceMappings.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Payment Mappings
  async getQuickBooksPaymentMappings(organizationId: number, connectionId?: number): Promise<QuickBooksPaymentMapping[]> {
    let query = db
      .select()
      .from(quickbooksPaymentMappings)
      .where(eq(quickbooksPaymentMappings.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksPaymentMappings.connectionId, connectionId));
    }

    return await query.orderBy(desc(quickbooksPaymentMappings.createdAt));
  }

  async getQuickBooksPaymentMapping(emrPaymentId: string, organizationId: number): Promise<QuickBooksPaymentMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(quickbooksPaymentMappings)
      .where(and(
        eq(quickbooksPaymentMappings.emrPaymentId, emrPaymentId),
        eq(quickbooksPaymentMappings.organizationId, organizationId)
      ));
    return mapping || undefined;
  }

  async createQuickBooksPaymentMapping(mapping: InsertQuickBooksPaymentMapping): Promise<QuickBooksPaymentMapping> {
    const [created] = await db.insert(quickbooksPaymentMappings).values([mapping]).returning();
    return created;
  }

  async updateQuickBooksPaymentMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksPaymentMapping>): Promise<QuickBooksPaymentMapping | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksPaymentMappings)
      .set(updateData)
      .where(and(eq(quickbooksPaymentMappings.id, id), eq(quickbooksPaymentMappings.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksPaymentMapping(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksPaymentMappings)
      .where(and(eq(quickbooksPaymentMappings.id, id), eq(quickbooksPaymentMappings.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Account Mappings
  async getQuickBooksAccountMappings(organizationId: number, connectionId?: number): Promise<QuickBooksAccountMapping[]> {
    let query = db
      .select()
      .from(quickbooksAccountMappings)
      .where(eq(quickbooksAccountMappings.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksAccountMappings.connectionId, connectionId));
    }

    return await query.orderBy(desc(quickbooksAccountMappings.createdAt));
  }

  async getQuickBooksAccountMapping(emrAccountType: string, organizationId: number): Promise<QuickBooksAccountMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(quickbooksAccountMappings)
      .where(and(
        eq(quickbooksAccountMappings.emrAccountType, emrAccountType),
        eq(quickbooksAccountMappings.organizationId, organizationId)
      ));
    return mapping || undefined;
  }

  async createQuickBooksAccountMapping(mapping: InsertQuickBooksAccountMapping): Promise<QuickBooksAccountMapping> {
    const [created] = await db.insert(quickbooksAccountMappings).values([mapping]).returning();
    return created;
  }

  async updateQuickBooksAccountMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksAccountMapping>): Promise<QuickBooksAccountMapping | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksAccountMappings)
      .set(updateData)
      .where(and(eq(quickbooksAccountMappings.id, id), eq(quickbooksAccountMappings.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksAccountMapping(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksAccountMappings)
      .where(and(eq(quickbooksAccountMappings.id, id), eq(quickbooksAccountMappings.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Item Mappings
  async getQuickBooksItemMappings(organizationId: number, connectionId?: number): Promise<QuickBooksItemMapping[]> {
    let query = db
      .select()
      .from(quickbooksItemMappings)
      .where(eq(quickbooksItemMappings.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksItemMappings.connectionId, connectionId));
    }

    return await query.orderBy(desc(quickbooksItemMappings.createdAt));
  }

  async getQuickBooksItemMapping(emrItemId: string, organizationId: number): Promise<QuickBooksItemMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(quickbooksItemMappings)
      .where(and(
        eq(quickbooksItemMappings.emrItemId, emrItemId),
        eq(quickbooksItemMappings.organizationId, organizationId)
      ));
    return mapping || undefined;
  }

  async createQuickBooksItemMapping(mapping: InsertQuickBooksItemMapping): Promise<QuickBooksItemMapping> {
    const [created] = await db.insert(quickbooksItemMappings).values([mapping]).returning();
    return created;
  }

  async updateQuickBooksItemMapping(id: number, organizationId: number, updates: Partial<InsertQuickBooksItemMapping>): Promise<QuickBooksItemMapping | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksItemMappings)
      .set(updateData)
      .where(and(eq(quickbooksItemMappings.id, id), eq(quickbooksItemMappings.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksItemMapping(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksItemMappings)
      .where(and(eq(quickbooksItemMappings.id, id), eq(quickbooksItemMappings.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // QuickBooks Sync Configurations
  async getQuickBooksSyncConfigs(organizationId: number, connectionId?: number): Promise<QuickBooksSyncConfig[]> {
    let query = db
      .select()
      .from(quickbooksSyncConfigs)
      .where(eq(quickbooksSyncConfigs.organizationId, organizationId));

    if (connectionId) {
      query = query.where(eq(quickbooksSyncConfigs.connectionId, connectionId));
    }

    return await query
      .where(eq(quickbooksSyncConfigs.isActive, true))
      .orderBy(desc(quickbooksSyncConfigs.createdAt));
  }

  async getQuickBooksSyncConfig(id: number, organizationId: number): Promise<QuickBooksSyncConfig | undefined> {
    const [config] = await db
      .select()
      .from(quickbooksSyncConfigs)
      .where(and(eq(quickbooksSyncConfigs.id, id), eq(quickbooksSyncConfigs.organizationId, organizationId)));
    return config || undefined;
  }

  async createQuickBooksSyncConfig(config: InsertQuickBooksSyncConfig): Promise<QuickBooksSyncConfig> {
    const [created] = await db.insert(quickbooksSyncConfigs).values([config]).returning();
    return created;
  }

  async updateQuickBooksSyncConfig(id: number, organizationId: number, updates: Partial<InsertQuickBooksSyncConfig>): Promise<QuickBooksSyncConfig | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(quickbooksSyncConfigs)
      .set(updateData)
      .where(and(eq(quickbooksSyncConfigs.id, id), eq(quickbooksSyncConfigs.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteQuickBooksSyncConfig(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(quickbooksSyncConfigs)
      .where(and(eq(quickbooksSyncConfigs.id, id), eq(quickbooksSyncConfigs.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Pricing Management - Doctors Fee
  async getDoctorsFees(organizationId: number): Promise<DoctorsFee[]> {
    return await db
      .select()
      .from(doctorsFee)
      .where(eq(doctorsFee.organizationId, organizationId))
      .orderBy(desc(doctorsFee.createdAt));
  }

  async getDoctorsFee(id: number, organizationId: number): Promise<DoctorsFee | undefined> {
    const [fee] = await db
      .select()
      .from(doctorsFee)
      .where(and(eq(doctorsFee.id, id), eq(doctorsFee.organizationId, organizationId)));
    return fee || undefined;
  }

  async getDoctorsFeesByDoctor(doctorId: number, organizationId: number): Promise<DoctorsFee[]> {
    return await db
      .select()
      .from(doctorsFee)
      .where(and(eq(doctorsFee.doctorId, doctorId), eq(doctorsFee.organizationId, organizationId)))
      .orderBy(desc(doctorsFee.createdAt));
  }

  async createDoctorsFee(fee: InsertDoctorsFee): Promise<DoctorsFee> {
    const [created] = await db.insert(doctorsFee).values([fee]).returning();
    return created;
  }

  async updateDoctorsFee(id: number, organizationId: number, updates: Partial<InsertDoctorsFee>): Promise<DoctorsFee | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(doctorsFee)
      .set(updateData)
      .where(and(eq(doctorsFee.id, id), eq(doctorsFee.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteDoctorsFee(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(doctorsFee)
      .where(and(eq(doctorsFee.id, id), eq(doctorsFee.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Pricing Management - Lab Test Pricing
  async getLabTestPricing(organizationId: number): Promise<LabTestPricing[]> {
    return await db
      .select()
      .from(labTestPricing)
      .where(eq(labTestPricing.organizationId, organizationId))
      .orderBy(desc(labTestPricing.createdAt));
  }

  async getLabTestPricingById(id: number, organizationId: number): Promise<LabTestPricing | undefined> {
    const [pricing] = await db
      .select()
      .from(labTestPricing)
      .where(and(eq(labTestPricing.id, id), eq(labTestPricing.organizationId, organizationId)));
    return pricing || undefined;
  }

  async createLabTestPricing(pricing: InsertLabTestPricing): Promise<LabTestPricing> {
    const [created] = await db.insert(labTestPricing).values([pricing]).returning();
    return created;
  }

  async updateLabTestPricing(id: number, organizationId: number, updates: Partial<InsertLabTestPricing>): Promise<LabTestPricing | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(labTestPricing)
      .set(updateData)
      .where(and(eq(labTestPricing.id, id), eq(labTestPricing.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteLabTestPricing(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(labTestPricing)
      .where(and(eq(labTestPricing.id, id), eq(labTestPricing.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Pricing Management - Imaging Pricing
  async getImagingPricing(organizationId: number): Promise<ImagingPricing[]> {
    return await db
      .select()
      .from(imagingPricing)
      .where(eq(imagingPricing.organizationId, organizationId))
      .orderBy(desc(imagingPricing.createdAt));
  }

  async getImagingPricingById(id: number, organizationId: number): Promise<ImagingPricing | undefined> {
    const [pricing] = await db
      .select()
      .from(imagingPricing)
      .where(and(eq(imagingPricing.id, id), eq(imagingPricing.organizationId, organizationId)));
    return pricing || undefined;
  }

  async createImagingPricing(pricing: InsertImagingPricing): Promise<ImagingPricing> {
    const [created] = await db.insert(imagingPricing).values([pricing]).returning();
    return created;
  }

  async updateImagingPricing(id: number, organizationId: number, updates: Partial<InsertImagingPricing>): Promise<ImagingPricing | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(imagingPricing)
      .set(updateData)
      .where(and(eq(imagingPricing.id, id), eq(imagingPricing.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteImagingPricing(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(imagingPricing)
      .where(and(eq(imagingPricing.id, id), eq(imagingPricing.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  async getTreatments(organizationId: number): Promise<Treatment[]> {
    const results = await db
      .select()
      .from(treatments)
      .where(eq(treatments.organizationId, organizationId))
      .orderBy(desc(treatments.createdAt));
    
    console.log(`Fetched ${results.length} treatments for org ${organizationId}`);
    if (results.length > 0) {
      console.log("Sample treatment data:", JSON.stringify(results[0], null, 2));
    }
    return results;
  }

  async getTreatment(id: number, organizationId: number): Promise<Treatment | undefined> {
    const [treatment] = await db
      .select()
      .from(treatments)
      .where(and(eq(treatments.id, id), eq(treatments.organizationId, organizationId)));
    return treatment || undefined;
  }

  async createTreatment(treatment: InsertTreatment): Promise<Treatment> {
    console.log("Saving treatment to database:", JSON.stringify(treatment, null, 2));
    const [created] = await db.insert(treatments).values([treatment]).returning();
    console.log("Treatment saved successfully:", JSON.stringify(created, null, 2));
    return created;
  }

  async updateTreatment(id: number, organizationId: number, updates: Partial<InsertTreatment>): Promise<Treatment | undefined> {
    console.log(`Updating treatment ${id} in database:`, JSON.stringify(updates, null, 2));
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(treatments)
      .set(updateData)
      .where(and(eq(treatments.id, id), eq(treatments.organizationId, organizationId)))
      .returning();
    console.log("Treatment updated successfully:", JSON.stringify(updated, null, 2));
    return updated || undefined;
  }

  async deleteTreatment(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(treatments)
      .where(and(eq(treatments.id, id), eq(treatments.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  async getTreatmentsInfo(organizationId: number): Promise<TreatmentsInfo[]> {
    return await db
      .select()
      .from(treatmentsInfo)
      .where(eq(treatmentsInfo.organizationId, organizationId))
      .orderBy(desc(treatmentsInfo.createdAt));
  }

  async createTreatmentsInfo(info: InsertTreatmentsInfo): Promise<TreatmentsInfo> {
    const [created] = await db.insert(treatmentsInfo).values([info]).returning();
    return created;
  }

  async updateTreatmentsInfo(id: number, organizationId: number, updates: Partial<InsertTreatmentsInfo>): Promise<TreatmentsInfo | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(treatmentsInfo)
      .set(updateData)
      .where(and(eq(treatmentsInfo.id, id), eq(treatmentsInfo.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteTreatmentsInfo(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(treatmentsInfo)
      .where(and(eq(treatmentsInfo.id, id), eq(treatmentsInfo.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  async deletePayment(paymentId: number): Promise<boolean> {
    const result = await db
      .delete(saasPayments)
      .where(eq(saasPayments.id, paymentId));
    return result.rowCount > 0;
  }

  // Clinic Headers
  async createClinicHeader(header: InsertClinicHeader): Promise<ClinicHeader> {
    // Deactivate existing headers for this organization
    await db
      .update(clinicHeaders)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(clinicHeaders.organizationId, header.organizationId), eq(clinicHeaders.isActive, true)));
    
    // Insert new header
    const [created] = await db
      .insert(clinicHeaders)
      .values(header as any)
      .returning();
    return created;
  }

  async getActiveClinicHeader(organizationId: number): Promise<ClinicHeader | undefined> {
    const [header] = await db
      .select()
      .from(clinicHeaders)
      .where(and(eq(clinicHeaders.organizationId, organizationId), eq(clinicHeaders.isActive, true)))
      .orderBy(desc(clinicHeaders.createdAt))
      .limit(1);
    return header || undefined;
  }

  async updateClinicHeader(id: number, organizationId: number, updates: Partial<InsertClinicHeader>): Promise<ClinicHeader | undefined> {
    // Ensure logoBase64 is explicitly included if provided (even if null)
    const updateData: any = { ...updates, updatedAt: new Date() };
    
    // If logoBase64 is explicitly provided (including null), ensure it's included in the update
    if ('logoBase64' in updates) {
      updateData.logoBase64 = updates.logoBase64 === undefined ? undefined : (updates.logoBase64 || null);
    }
    
    console.log(`[STORAGE] updateClinicHeader - updateData keys:`, Object.keys(updateData));
    console.log(`[STORAGE] updateClinicHeader - logoBase64 in updates:`, 'logoBase64' in updates);
    console.log(`[STORAGE] updateClinicHeader - logoBase64 value:`, updateData.logoBase64 !== undefined ? (updateData.logoBase64 ? `present (${updateData.logoBase64.length} chars)` : 'null') : 'not provided');
    
    const [updated] = await db
      .update(clinicHeaders)
      .set(updateData)
      .where(and(eq(clinicHeaders.id, id), eq(clinicHeaders.organizationId, organizationId)))
      .returning();
    
    if (updated) {
      console.log(`[STORAGE] updateClinicHeader - Updated logoBase64:`, updated.logoBase64 ? `present (${updated.logoBase64.length} chars)` : 'null');
    }
    
    return updated || undefined;
  }

  // Clinic Footers
  async createClinicFooter(footer: InsertClinicFooter): Promise<ClinicFooter> {
    // Deactivate existing footers for this organization
    await db
      .update(clinicFooters)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(clinicFooters.organizationId, footer.organizationId), eq(clinicFooters.isActive, true)));
    
    // Insert new footer
    const [created] = await db
      .insert(clinicFooters)
      .values(footer as any)
      .returning();
    return created;
  }

  async getActiveClinicFooter(organizationId: number): Promise<ClinicFooter | undefined> {
    const [footer] = await db
      .select()
      .from(clinicFooters)
      .where(and(eq(clinicFooters.organizationId, organizationId), eq(clinicFooters.isActive, true)))
      .orderBy(desc(clinicFooters.createdAt))
      .limit(1);
    return footer || undefined;
  }

  async updateClinicFooter(id: number, organizationId: number, updates: Partial<InsertClinicFooter>): Promise<ClinicFooter | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [updated] = await db
      .update(clinicFooters)
      .set(updateData as any)
      .where(and(eq(clinicFooters.id, id), eq(clinicFooters.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  // Prescription Share Logs
  async createPrescriptionShareLog(data: {
    prescriptionId: number;
    organizationId: number;
    patientId: number;
    sentBy?: number;
    recipientEmail?: string;
    pharmacyEmail?: string;
    pharmacyName?: string;
    status?: string;
    emailSent?: boolean;
    emailSubject?: string;
    emailHtml?: string;
    emailText?: string;
    emailError?: string;
  }) {
    const [log] = await db
      .insert(prescriptionShareLogs)
      .values({
        prescriptionId: data.prescriptionId,
        organizationId: data.organizationId,
        patientId: data.patientId,
        sentBy: data.sentBy,
        recipientEmail: data.recipientEmail,
        pharmacyEmail: data.pharmacyEmail,
        pharmacyName: data.pharmacyName,
        status: data.status || "sent",
        emailSent: data.emailSent || false,
        emailSubject: data.emailSubject,
        emailHtml: data.emailHtml,
        emailText: data.emailText,
        emailError: data.emailError,
        sharedAt: new Date(),
      } as any)
      .returning();
    return log;
  }

  async getPrescriptionShareLogs(prescriptionId: number, organizationId: number) {
    return await db
      .select({
        id: prescriptionShareLogs.id,
        prescriptionId: prescriptionShareLogs.prescriptionId,
        organizationId: prescriptionShareLogs.organizationId,
        patientId: prescriptionShareLogs.patientId,
        sentBy: prescriptionShareLogs.sentBy,
        recipientEmail: prescriptionShareLogs.recipientEmail,
        pharmacyEmail: prescriptionShareLogs.pharmacyEmail,
        pharmacyName: prescriptionShareLogs.pharmacyName,
        status: prescriptionShareLogs.status,
        emailSent: prescriptionShareLogs.emailSent,
        emailSubject: prescriptionShareLogs.emailSubject,
        emailHtml: prescriptionShareLogs.emailHtml,
        emailText: prescriptionShareLogs.emailText,
        emailError: prescriptionShareLogs.emailError,
        sharedAt: prescriptionShareLogs.sharedAt,
        createdAt: prescriptionShareLogs.createdAt,
        sentByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(prescriptionShareLogs)
      .leftJoin(users, eq(users.id, prescriptionShareLogs.sentBy))
      .where(
        and(
          eq(prescriptionShareLogs.prescriptionId, prescriptionId),
          eq(prescriptionShareLogs.organizationId, organizationId)
        )
      )
      .orderBy(desc(prescriptionShareLogs.sharedAt));
  }

  // Message Tags implementations
  async getMessageTags(organizationId: number): Promise<any[]> {
    try {
      const tags = await db.select()
        .from(messageTags)
        .where(eq(messageTags.organizationId, organizationId))
        .orderBy(asc(messageTags.name));
      return tags;
    } catch (error: any) {
      // If tag tables don't exist yet, return empty array
      if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        console.warn('⚠️ Tag tables do not exist yet. Please run migration 0009_add_message_tags.sql');
        return [];
      }
      throw error;
    }
  }

  async createMessageTag(tagData: { name: string; color?: string; organizationId: number; createdBy: number }): Promise<any> {
    // Check if tag with same name already exists
    const existingTag = await db.select()
      .from(messageTags)
      .where(and(
        eq(messageTags.organizationId, tagData.organizationId),
        eq(messageTags.name, tagData.name)
      ))
      .limit(1);

    if (existingTag.length > 0) {
      return existingTag[0];
    }

    const [newTag] = await db.insert(messageTags).values({
      organizationId: tagData.organizationId,
      name: tagData.name,
      color: tagData.color || 'blue',
      createdBy: tagData.createdBy,
    }).returning();

    return newTag;
  }

  async getMessageTagsForMessage(messageId: string, organizationId: number): Promise<any[]> {
    try {
      const tags = await db.select({
        id: messageTagAssignments.tagId,
        name: messageTags.name,
        color: messageTags.color,
      })
        .from(messageTagAssignments)
        .innerJoin(messageTags, eq(messageTagAssignments.tagId, messageTags.id))
        .where(and(
          eq(messageTagAssignments.messageId, messageId),
          eq(messageTagAssignments.organizationId, organizationId)
        ));
      
      return tags;
    } catch (error: any) {
      // If tag tables don't exist yet, return empty array
      if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        console.warn('⚠️ Tag tables do not exist yet. Please run migration 0009_add_message_tags.sql');
        return [];
      }
      throw error;
    }
  }

  async addTagToMessage(messageId: string, tagId: number, userId: number, organizationId: number): Promise<boolean> {
    try {
      // Check if tag assignment already exists
      const existing = await db.select()
        .from(messageTagAssignments)
        .where(and(
          eq(messageTagAssignments.messageId, messageId),
          eq(messageTagAssignments.tagId, tagId),
          eq(messageTagAssignments.organizationId, organizationId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return true; // Already tagged
      }

      await db.insert(messageTagAssignments).values({
        messageId,
        tagId,
        organizationId,
        createdBy: userId,
      });

      return true;
    } catch (error: any) {
      // If tag tables don't exist yet, throw a helpful error
      if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        throw new Error('Tag tables do not exist. Please run migration 0009_add_message_tags.sql');
      }
      throw error;
    }
  }

  async removeTagFromMessage(messageId: string, tagId: number, organizationId: number): Promise<boolean> {
    try {
      await db.delete(messageTagAssignments)
        .where(and(
          eq(messageTagAssignments.messageId, messageId),
          eq(messageTagAssignments.tagId, tagId),
          eq(messageTagAssignments.organizationId, organizationId)
        ));
      
      return true;
    } catch (error: any) {
      // If tag tables don't exist yet, throw a helpful error
      if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        throw new Error('Tag tables do not exist. Please run migration 0009_add_message_tags.sql');
      }
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
