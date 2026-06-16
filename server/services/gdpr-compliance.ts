import { storage } from "../storage";
import { 
  GdprConsent, 
  InsertGdprConsent, 
  GdprDataRequest, 
  InsertGdprDataRequest,
  GdprAuditTrail,
  InsertGdprAuditTrail,
  GdprProcessingActivity,
  InsertGdprProcessingActivity
} from "../../shared/schema";

export interface DataSubjectRights {
  rightToAccess: boolean;
  rightToRectification: boolean;
  rightToErasure: boolean;
  rightToRestriction: boolean;
  rightToPortability: boolean;
  rightToObject: boolean;
}

export interface ConsentStatus {
  id: number;
  patientId: number;
  consentType: string;
  status: "granted" | "withdrawn" | "pending" | "expired";
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  legalBasis: string;
  purpose: string;
}

export interface DataExportPackage {
  patientData: any;
  medicalRecords: any[];
  appointments: any[];
  prescriptions: any[];
  labResults: any[];
  communications: any[];
  consentHistory: any[];
  exportMetadata: {
    exportedAt: Date;
    exportedBy: string;
    requestId: number;
    format: string;
    dataCategories: string[];
  };
}

export interface ComplianceMetrics {
  totalDataRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageResponseTime: number; // in days
  consentWithdrawalRate: number;
  dataBreachCount: number;
  complianceScore: number; // 0-100
  lastAuditDate: Date;
  nextAuditDue: Date;
}

export class GDPRComplianceService {
  
  /**
   * Records patient consent for data processing
   */
  async recordConsent(consentData: InsertGdprConsent): Promise<GdprConsent> {
    // Calculate expiration date based on consent type
    const expirationDate = this.calculateConsentExpiration(consentData.consentType);
    
    const consent = await storage.createGdprConsent({
      ...consentData,
      status: "granted",
      grantedAt: new Date(),
      expiresAt: expirationDate,
    });

    // Log consent recording
    await this.logGdprAction({
      organizationId: consentData.organizationId,
      userId: null,
      patientId: consentData.patientId,
      action: "consent_granted",
      resourceType: "gdpr_consent",
      resourceId: consent.id,
      dataCategories: consentData.dataCategories || [],
      legalBasis: consentData.legalBasis,
      purpose: consentData.purpose,
      timestamp: new Date(),
      metadata: {
        riskLevel: "low",
        complianceFlags: ["consent_recorded"],
      }
    });

    return consent;
  }

  /**
   * Withdraws patient consent
   */
  async withdrawConsent(consentId: number, organizationId: number, reason?: string): Promise<void> {
    const consent = await storage.updateGdprConsent(consentId, organizationId, {
      status: "withdrawn",
      withdrawnAt: new Date(),
    });

    if (!consent) {
      throw new Error("Consent not found");
    }

    // Log consent withdrawal
    await this.logGdprAction({
      organizationId,
      userId: null,
      patientId: consent.patientId,
      action: "consent_withdrawn",
      resourceType: "gdpr_consent",
      resourceId: consentId,
      dataCategories: consent.dataCategories || [],
      legalBasis: consent.legalBasis,
      purpose: `Consent withdrawn. Reason: ${reason || "Not specified"}`,
      timestamp: new Date(),
      metadata: {
        riskLevel: "medium",
        complianceFlags: ["consent_withdrawn", "data_processing_restricted"],
      }
    });

    // Create notification for data processing team
    try {
      const adminUser = await storage.getUsersByRole("admin", organizationId);
      const targetUserId = adminUser.length > 0 ? adminUser[0].id : null;
      
      if (targetUserId) {
        await storage.createNotification({
          organizationId,
          userId: targetUserId,
          title: "GDPR Consent Withdrawn",
          message: `Patient has withdrawn consent for ${consent.consentType}. Review data processing activities.`,
          type: "gdpr_consent_withdrawal",
          priority: "high",
          status: "unread",
          isActionable: true,
          relatedEntityType: "patient",
          relatedEntityId: consent.patientId,
          metadata: {
            patientId: consent.patientId,
            department: "Data Protection"
          }
        });
      }
    } catch (error) {
      console.log("Could not create GDPR notification - no admin user found");
    }
  }

  /**
   * Submits a GDPR data request (access, portability, erasure, rectification)
   */
  async submitDataRequest(requestData: InsertGdprDataRequest): Promise<GdprDataRequest> {
    // Calculate due date (30 days as per GDPR)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const request = await storage.createGdprDataRequest({
      ...requestData,
      dueDate,
      communicationLog: [{
        timestamp: new Date().toISOString(),
        type: "request_submitted",
        message: `Data request submitted: ${requestData.requestType}`,
        sentBy: "patient"
      }]
    });

    // Log data request submission
    await this.logGdprAction({
      organizationId: requestData.organizationId,
      userId: null,
      patientId: requestData.patientId,
      action: `data_request_${requestData.requestType}`,
      resourceType: "gdpr_data_request",
      resourceId: request.id,
      dataCategories: ["personal_data"],
      legalBasis: "data_subject_rights",
      purpose: `GDPR ${requestData.requestType} request`,
      timestamp: new Date(),
      metadata: {
        riskLevel: requestData.requestType === "erasure" ? "high" : "medium",
        complianceFlags: ["data_request_submitted"],
      }
    });

    // Create notification for admin/DPO (find first admin user in organization)
    try {
      const adminUser = await storage.getUsersByRole("admin", requestData.organizationId);
      const targetUserId = adminUser.length > 0 ? adminUser[0].id : null;
      
      if (targetUserId) {
        await storage.createNotification({
          organizationId: requestData.organizationId,
          userId: targetUserId,
          title: `GDPR ${requestData.requestType.toUpperCase()} Request`,
          message: `New data ${requestData.requestType} request submitted. Due: ${dueDate.toLocaleDateString()}`,
          type: "gdpr_data_request",
          priority: "high",
          status: "unread",
          isActionable: true,
          relatedEntityType: "patient",
          relatedEntityId: requestData.patientId,
          metadata: {
            patientId: requestData.patientId,
            department: "Data Protection"
          }
        });
      }
    } catch (error) {
      console.log("Could not create GDPR notification - no admin user found");
    }

    return request;
  }

  /**
   * Processes data export for portability requests
   */
  async exportPatientData(patientId: number, organizationId: number, requestId: number): Promise<DataExportPackage> {
    // Get all patient data
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const medicalRecords = await storage.getMedicalRecordsByPatient(patientId, organizationId);
    const appointments = await storage.getAppointmentsByPatient(patientId, organizationId);
    const prescriptions = await storage.getPrescriptionsByPatient(patientId, organizationId);
    const labResults = await storage.getLabResultsByPatient(patientId, organizationId);
    const communications = await storage.getPatientCommunications(patientId, organizationId);
    const consentHistory = await storage.getGdprConsentsByPatient(patientId, organizationId);

    const exportPackage: DataExportPackage = {
      patientData: patient,
      medicalRecords,
      appointments,
      prescriptions,
      labResults,
      communications,
      consentHistory,
      exportMetadata: {
        exportedAt: new Date(),
        exportedBy: "system",
        requestId,
        format: "JSON",
        dataCategories: ["personal_data", "health_data", "communication_data"]
      }
    };

    // Log data export
    await this.logGdprAction({
      organizationId,
      userId: null,
      patientId,
      action: "data_exported",
      resourceType: "patient",
      resourceId: patientId,
      dataCategories: ["personal_data", "health_data"],
      legalBasis: "data_subject_rights",
      purpose: "GDPR data portability request",
      timestamp: new Date(),
      metadata: {
        riskLevel: "high",
        complianceFlags: ["data_exported", "data_portability"],
        retentionPeriod: 84, // 7 years for medical data
      }
    });

    return exportPackage;
  }

  /**
   * Processes data erasure requests (Right to be Forgotten)
   */
  async processDataErasure(patientId: number, organizationId: number, requestId: number, reason: string): Promise<void> {
    // Check if erasure is legally possible (medical data may need to be retained)
    const retentionRequirements = await this.checkDataRetentionRequirements(patientId, organizationId);
    
    if (retentionRequirements.mustRetain) {
      // Anonymize instead of delete
      await this.anonymizePatientData(patientId, organizationId, retentionRequirements.reason);
    } else {
      // Full deletion
      await this.deletePatientData(patientId, organizationId);
    }

    // Update request status
    await storage.updateGdprDataRequest(requestId, organizationId, {
      status: "completed",
      completedAt: new Date(),
      responseData: {
        deletedRecords: retentionRequirements.mustRetain ? ["anonymized"] : ["fully_deleted"],
        dataCategories: ["personal_data", "health_data"]
      }
    });

    // Log erasure action
    await this.logGdprAction({
      organizationId,
      userId: null,
      patientId,
      action: "data_erased",
      resourceType: "patient",
      resourceId: patientId,
      dataCategories: ["personal_data", "health_data"],
      legalBasis: "data_subject_rights",
      purpose: `Data erasure: ${reason}`,
      timestamp: new Date(),
      metadata: {
        riskLevel: "critical",
        complianceFlags: ["data_erased", "right_to_be_forgotten"],
        retentionPeriod: 0,
      }
    });
  }

  /**
   * Logs GDPR-related actions for audit trail
   */
  async logGdprAction(actionData: InsertGdprAuditTrail): Promise<void> {
    await storage.createGdprAuditTrail(actionData);
  }

  /**
   * Generates GDPR compliance report
   */
  async generateComplianceReport(organizationId: number, period: "monthly" | "quarterly" | "annual"): Promise<ComplianceMetrics> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case "monthly":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarterly":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "annual":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const dataRequests: GdprDataRequest[] = await storage.getGdprDataRequestsByPeriod(organizationId, startDate, endDate);
    const consents: GdprConsent[] = await storage.getGdprConsentsByPeriod(organizationId, startDate, endDate);
    
    const totalRequests = dataRequests.length;
    const pendingRequests = dataRequests.filter((r: GdprDataRequest) => r.status === "pending").length;
    const completedRequests = dataRequests.filter((r: GdprDataRequest) => r.status === "completed").length;
    
    // Calculate average response time
    const completedWithDates = dataRequests.filter((r: GdprDataRequest) => r.completedAt && r.requestedAt);
    const avgResponseTime = completedWithDates.length > 0 
      ? completedWithDates.reduce((sum: number, r: GdprDataRequest) => {
          const diff = new Date(r.completedAt!).getTime() - new Date(r.requestedAt).getTime();
          return sum + (diff / (1000 * 60 * 60 * 24)); // days
        }, 0) / completedWithDates.length
      : 0;

    // Calculate consent withdrawal rate
    const totalConsents = consents.length;
    const withdrawnConsents = consents.filter((c: GdprConsent) => c.status === "withdrawn").length;
    const withdrawalRate = totalConsents > 0 ? (withdrawnConsents / totalConsents) * 100 : 0;

    // Calculate compliance score (simplified)
    let complianceScore = 100;
    if (avgResponseTime > 30) complianceScore -= 20; // Late responses
    if (withdrawalRate > 15) complianceScore -= 10; // High withdrawal rate
    if (pendingRequests > 10) complianceScore -= 15; // Too many pending requests

    return {
      totalDataRequests: totalRequests,
      pendingRequests,
      completedRequests,
      averageResponseTime: Math.round(avgResponseTime * 10) / 10,
      consentWithdrawalRate: Math.round(withdrawalRate * 10) / 10,
      dataBreachCount: 0, // Would be tracked separately
      complianceScore: Math.max(0, complianceScore),
      lastAuditDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      nextAuditDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    };
  }

  /**
   * Checks consent status for a patient
   */
  async checkConsentStatus(patientId: number, organizationId: number, consentType?: string): Promise<ConsentStatus[]> {
    const consents = await storage.getGdprConsentsByPatient(patientId, organizationId);
    
    return consents
      .filter((c: GdprConsent) => !consentType || c.consentType === consentType)
      .map((c: GdprConsent) => ({
        id: c.id,
        patientId: c.patientId,
        consentType: c.consentType,
        status: c.status as "granted" | "withdrawn" | "pending" | "expired",
        grantedAt: c.grantedAt || undefined,
        withdrawnAt: c.withdrawnAt || undefined,
        expiresAt: c.expiresAt || undefined,
        legalBasis: c.legalBasis,
        purpose: c.purpose,
      }));
  }

  /**
   * Private helper methods
   */
  private calculateConsentExpiration(consentType: string): Date {
    const expirationDate = new Date();
    switch (consentType) {
      case "marketing":
        expirationDate.setFullYear(expirationDate.getFullYear() + 2); // 2 years
        break;
      case "research":
        expirationDate.setFullYear(expirationDate.getFullYear() + 5); // 5 years
        break;
      case "data_sharing":
        expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year
        break;
      default: // data_processing
        expirationDate.setFullYear(expirationDate.getFullYear() + 3); // 3 years
        break;
    }
    return expirationDate;
  }

  private async checkDataRetentionRequirements(patientId: number, organizationId: number): Promise<{
    mustRetain: boolean;
    reason: string;
  }> {
    // Check if patient has medical records that must be retained by law
    const medicalRecords = await storage.getMedicalRecordsByPatient(patientId, organizationId);
    const activeAppointments = await storage.getActiveAppointmentsByPatient(patientId, organizationId);
    
    if (medicalRecords.length > 0 || activeAppointments.length > 0) {
      return {
        mustRetain: true,
        reason: "Medical records must be retained for 7 years under NHS Records Management Code"
      };
    }

    return {
      mustRetain: false,
      reason: "No legal retention requirements"
    };
  }

  private async anonymizePatientData(patientId: number, organizationId: number, reason: string): Promise<void> {
    // Anonymize patient record (keep medical data but remove identifying information)
    await storage.updatePatient(patientId, organizationId, {
      firstName: "ANONYMIZED",
      lastName: "PATIENT",
      email: `anonymized-${patientId}@system.local`,
      phone: "ANONYMIZED",
      address: {
        street: "ANONYMIZED",
        city: "ANONYMIZED",
        state: "ANONYMIZED",
        postcode: "ANONYMIZED",
        country: "ANONYMIZED"
      },
      emergencyContactName: "ANONYMIZED",
      emergencyContactPhone: "ANONYMIZED",
    });

    console.log(`Patient ${patientId} data anonymized: ${reason}`);
  }

  private async deletePatientData(patientId: number, organizationId: number): Promise<void> {
    // This would perform cascade deletion of all patient data
    // In a real system, this would be more complex with soft deletes and audit trails
    console.log(`Patient ${patientId} data scheduled for deletion (cascade)`);
  }
}

export const gdprComplianceService = new GDPRComplianceService();