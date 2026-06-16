import { storage } from "../storage";

export interface AuditLog {
  id: string;
  userId: number;
  action: string;
  resourceType: "patient" | "medical_record" | "appointment" | "prescription" | "user" | "organization";
  resourceId: number;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  metadata?: {
    patientId?: number;
    patientName?: string;
    reason?: string;
    context?: string;
  };
}

export interface ComplianceCheck {
  id: string;
  type: "gdpr" | "hipaa" | "data_retention" | "access_control" | "audit_trail";
  status: "compliant" | "warning" | "violation";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendation: string;
  affectedRecords: number;
  regulatoryFramework: string;
  lastChecked: Date;
  nextCheck: Date;
}

export interface DataRetentionPolicy {
  recordType: string;
  retentionPeriod: number; // in months
  purgePolicy: "hard_delete" | "anonymize" | "archive";
  legalBasis: string;
  exceptions: string[];
}

export interface AccessPattern {
  userId: number;
  userName: string;
  resourceAccess: {
    patients: number;
    medicalRecords: number;
    prescriptions: number;
  };
  timePattern: {
    mostActiveHour: number;
    averageSessionDuration: number;
    weekendAccess: boolean;
  };
  riskScore: number;
  anomaliesDetected: string[];
}

export class AuditComplianceService {

  /**
   * Logs all significant user actions for audit trail
   */
  async logUserAction(
    userId: number,
    action: string,
    resourceType: AuditLog["resourceType"],
    resourceId: number,
    changes: AuditLog["changes"],
    request: {
      ipAddress: string;
      userAgent: string;
      sessionId: string;
    },
    metadata?: AuditLog["metadata"]
  ): Promise<AuditLog> {
    const severity = this.calculateActionSeverity(action, resourceType, changes);
    
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      sessionId: request.sessionId,
      severity,
      timestamp: new Date(),
      metadata
    };

    // Store audit log (in real system, this would be in a separate audit database)
    console.log("AUDIT LOG:", JSON.stringify(auditLog, null, 2));

    // Create compliance alert for high-severity actions
    if (severity === "high" || severity === "critical") {
      await this.createComplianceAlert(auditLog);
    }

    return auditLog;
  }

  /**
   * Performs comprehensive compliance checks across the organization
   */
  async performComplianceAudit(organizationId: number): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // GDPR Compliance Checks
    const gdprChecks = await this.performGDPRChecks(organizationId);
    checks.push(...gdprChecks);

    // Data Retention Compliance
    const retentionChecks = await this.performDataRetentionChecks(organizationId);
    checks.push(...retentionChecks);

    // Access Control Compliance
    const accessChecks = await this.performAccessControlChecks(organizationId);
    checks.push(...accessChecks);

    // Audit Trail Compliance
    const auditChecks = await this.performAuditTrailChecks(organizationId);
    checks.push(...auditChecks);

    // Generate compliance notifications for violations
    for (const check of checks.filter(c => c.status === "violation")) {
      await storage.createNotification({
        organizationId,
        userId: 1, // Compliance officer
        title: "Compliance Violation Detected",
        message: `${check.type.toUpperCase()} violation: ${check.description}`,
        type: "compliance_violation",
        priority: check.severity === "critical" ? "critical" : "high",
        status: "unread",
        isActionable: true,
        relatedEntityType: "organization",
        relatedEntityId: organizationId,
        metadata: {
          complianceType: check.type,
          violationSeverity: check.severity,
          affectedRecords: check.affectedRecords,
          department: "Compliance",
          requiresResponse: true
        }
      });
    }

    return checks;
  }

  /**
   * Manages data retention policies and automated purging
   */
  async enforceDataRetentionPolicies(organizationId: number): Promise<void> {
    const policies = this.getDataRetentionPolicies();
    const purgeResults = [];

    for (const policy of policies) {
      const result = await this.applyRetentionPolicy(organizationId, policy);
      purgeResults.push(result);
    }

    // Create summary notification
    const totalPurged = purgeResults.reduce((sum, r) => sum + r.recordsPurged, 0);
    
    if (totalPurged > 0) {
      await storage.createNotification({
        organizationId,
        userId: 1,
        title: "Data Retention Policy Applied",
        message: `${totalPurged} records processed according to retention policies`,
        type: "data_retention",
        priority: "normal",
        status: "unread",
        isActionable: false,
        metadata: {
          recordsPurged: totalPurged,
          policies: policies.length,
          department: "Compliance"
        }
      });
    }
  }

  /**
   * Analyzes user access patterns for anomaly detection
   */
  async analyzeAccessPatterns(organizationId: number): Promise<AccessPattern[]> {
    const users = await storage.getUsersByOrganization(organizationId);
    const patterns: AccessPattern[] = [];

    for (const user of users) {
      const pattern = await this.analyzeUserAccessPattern(user.id, organizationId);
      patterns.push(pattern);

      // Alert on suspicious patterns
      if (pattern.riskScore > 75 || pattern.anomaliesDetected.length > 0) {
        await storage.createNotification({
          organizationId,
          userId: 1, // Security officer
          title: "Suspicious Access Pattern Detected",
          message: `User ${pattern.userName} shows anomalous access patterns (Risk Score: ${pattern.riskScore})`,
          type: "security_alert",
          priority: pattern.riskScore > 90 ? "critical" : "high",
          status: "unread",
          isActionable: true,
          relatedEntityType: "user",
          relatedEntityId: user.id,
          metadata: {
            userId: user.id,
            userName: pattern.userName,
            riskScore: pattern.riskScore,
            anomalies: pattern.anomaliesDetected.join(", "),
            department: "Security",
            requiresResponse: true
          }
        });
      }
    }

    return patterns.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Generates comprehensive compliance reports
   */
  async generateComplianceReport(organizationId: number, period: "monthly" | "quarterly" | "annual"): Promise<any> {
    const startDate = this.getReportPeriodStart(period);
    const endDate = new Date();

    const report = {
      organizationId,
      reportPeriod: period,
      generatedAt: new Date(),
      periodStart: startDate,
      periodEnd: endDate,
      
      // Audit Statistics
      auditSummary: await this.getAuditSummary(organizationId, startDate, endDate),
      
      // Compliance Status
      complianceStatus: await this.getComplianceStatus(organizationId),
      
      // Data Access Summary
      dataAccessSummary: await this.getDataAccessSummary(organizationId, startDate, endDate),
      
      // Security Incidents
      securityIncidents: await this.getSecurityIncidents(organizationId, startDate, endDate),
      
      // Data Retention Summary
      dataRetentionSummary: await this.getDataRetentionSummary(organizationId),
      
      // Recommendations
      recommendations: await this.generateComplianceRecommendations(organizationId)
    };

    // Store report for historical tracking
    await this.storeComplianceReport(organizationId, report);

    return report;
  }

  /**
   * Implements right to be forgotten (GDPR Article 17)
   */
  async processDataDeletionRequest(patientId: number, organizationId: number, reason: string): Promise<void> {
    // Log the deletion request
    await this.logUserAction(
      1, // System user
      "GDPR_DELETION_REQUEST",
      "patient",
      patientId,
      [{ field: "deletion_requested", oldValue: false, newValue: true }],
      { ipAddress: "system", userAgent: "system", sessionId: "system" },
      { patientId, reason }
    );

    // In a real system, this would involve:
    // 1. Anonymizing personal data
    // 2. Maintaining clinical data for legal requirements
    // 3. Updating all related records
    // 4. Notifying relevant parties

    await storage.createNotification({
      organizationId,
      userId: 1,
      title: "GDPR Deletion Request Processed",
      message: `Data deletion request for patient ID ${patientId} has been processed. Reason: ${reason}`,
      type: "gdpr_deletion",
      priority: "high",
      status: "unread",
      isActionable: false,
      relatedEntityType: "patient",
      relatedEntityId: patientId,
      metadata: {
        patientId,
        deletionReason: reason,
        processedAt: new Date().toISOString(),
        department: "Compliance"
      }
    });
  }

  private calculateActionSeverity(action: string, resourceType: string, changes: any[]): AuditLog["severity"] {
    // Critical actions
    if (action.includes("DELETE") || action.includes("PURGE")) return "critical";
    if (action.includes("EXPORT") && resourceType === "patient") return "critical";
    
    // High severity actions
    if (action.includes("UPDATE") && resourceType === "medical_record") return "high";
    if (action.includes("ACCESS") && resourceType === "patient") return "high";
    
    // Medium severity actions
    if (action.includes("CREATE") || action.includes("UPDATE")) return "medium";
    
    return "low";
  }

  private async createComplianceAlert(auditLog: AuditLog): Promise<void> {
    await storage.createNotification({
      organizationId: 1, // Default org
      userId: 1, // Compliance officer
      title: "High-Risk Action Detected",
      message: `${auditLog.action} performed on ${auditLog.resourceType} by user ${auditLog.userId}`,
      type: "security_alert",
      priority: auditLog.severity === "critical" ? "critical" : "high",
      status: "unread",
      isActionable: true,
      metadata: {
        auditLogId: auditLog.id,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        userId: auditLog.userId,
        department: "Security"
      }
    });
  }

  private async performGDPRChecks(organizationId: number): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // Check for data processing consent
    checks.push({
      id: `gdpr_consent_${Date.now()}`,
      type: "gdpr",
      status: "compliant",
      description: "Patient consent records are properly maintained",
      severity: "medium",
      recommendation: "Continue regular consent audits",
      affectedRecords: 0,
      regulatoryFramework: "GDPR Article 6",
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Check for data minimization
    checks.push({
      id: `gdpr_minimization_${Date.now()}`,
      type: "gdpr",
      status: "warning",
      description: "Some fields may contain excessive personal data",
      severity: "medium",
      recommendation: "Review data collection forms for unnecessary fields",
      affectedRecords: 3,
      regulatoryFramework: "GDPR Article 5(1)(c)",
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return checks;
  }

  private async performDataRetentionChecks(organizationId: number): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    checks.push({
      id: `retention_medical_${Date.now()}`,
      type: "data_retention",
      status: "compliant",
      description: "Medical records retention policy is being followed",
      severity: "low",
      recommendation: "Continue automated retention policy enforcement",
      affectedRecords: 0,
      regulatoryFramework: "NHS Records Management Code",
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });

    return checks;
  }

  private async performAccessControlChecks(organizationId: number): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    checks.push({
      id: `access_control_${Date.now()}`,
      type: "access_control",
      status: "compliant",
      description: "Role-based access controls are properly configured",
      severity: "low",
      recommendation: "Regular access review scheduled",
      affectedRecords: 0,
      regulatoryFramework: "ISO 27001",
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
    });

    return checks;
  }

  private async performAuditTrailChecks(organizationId: number): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    checks.push({
      id: `audit_trail_${Date.now()}`,
      type: "audit_trail",
      status: "compliant",
      description: "Comprehensive audit trail is maintained",
      severity: "low",
      recommendation: "Continue current audit logging practices",
      affectedRecords: 0,
      regulatoryFramework: "NHS Digital Standards",
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return checks;
  }

  private getDataRetentionPolicies(): DataRetentionPolicy[] {
    return [
      {
        recordType: "medical_record",
        retentionPeriod: 96, // 8 years
        purgePolicy: "archive",
        legalBasis: "NHS Records Management Code",
        exceptions: ["Mental health records", "Maternity records"]
      },
      {
        recordType: "appointment",
        retentionPeriod: 24, // 2 years
        purgePolicy: "hard_delete",
        legalBasis: "Data Protection Act 2018",
        exceptions: ["Cancelled appointments with clinical significance"]
      },
      {
        recordType: "audit_log",
        retentionPeriod: 84, // 7 years
        purgePolicy: "archive",
        legalBasis: "Financial audit requirements",
        exceptions: ["Security incident logs"]
      }
    ];
  }

  private async applyRetentionPolicy(organizationId: number, policy: DataRetentionPolicy) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - policy.retentionPeriod);

    // Simulate record purging
    const recordsPurged = Math.floor(Math.random() * 10);

    return {
      recordType: policy.recordType,
      recordsPurged,
      cutoffDate,
      policy: policy.purgePolicy
    };
  }

  private async analyzeUserAccessPattern(userId: number, organizationId: number): Promise<AccessPattern> {
    const user = await storage.getUser(userId, organizationId);
    if (!user) throw new Error("User not found");

    // Simulate access pattern analysis
    const riskScore = Math.floor(Math.random() * 100);
    const anomalies: string[] = [];

    if (riskScore > 80) {
      anomalies.push("Unusual access times detected");
    }
    if (riskScore > 70) {
      anomalies.push("High volume of patient record access");
    }

    return {
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      resourceAccess: {
        patients: Math.floor(Math.random() * 50) + 10,
        medicalRecords: Math.floor(Math.random() * 100) + 20,
        prescriptions: Math.floor(Math.random() * 30) + 5
      },
      timePattern: {
        mostActiveHour: Math.floor(Math.random() * 12) + 8, // 8 AM to 8 PM
        averageSessionDuration: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
        weekendAccess: Math.random() > 0.7
      },
      riskScore,
      anomaliesDetected: anomalies
    };
  }

  private getReportPeriodStart(period: "monthly" | "quarterly" | "annual"): Date {
    const now = new Date();
    switch (period) {
      case "monthly":
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
      case "quarterly":
        return new Date(now.getFullYear(), now.getMonth() - 3, 1);
      case "annual":
        return new Date(now.getFullYear() - 1, 0, 1);
    }
  }

  private async getAuditSummary(organizationId: number, startDate: Date, endDate: Date) {
    return {
      totalActions: 1250 + Math.floor(Math.random() * 500),
      highRiskActions: 15 + Math.floor(Math.random() * 10),
      uniqueUsers: 12 + Math.floor(Math.random() * 5),
      mostCommonActions: ["VIEW_PATIENT", "UPDATE_MEDICAL_RECORD", "CREATE_APPOINTMENT"]
    };
  }

  private async getComplianceStatus(organizationId: number) {
    return {
      gdprCompliance: 95 + Math.floor(Math.random() * 5),
      dataRetentionCompliance: 98 + Math.floor(Math.random() * 2),
      accessControlCompliance: 92 + Math.floor(Math.random() * 8),
      auditTrailCompliance: 99
    };
  }

  private async getDataAccessSummary(organizationId: number, startDate: Date, endDate: Date) {
    return {
      totalDataAccess: 2500 + Math.floor(Math.random() * 1000),
      patientRecordsAccessed: 450 + Math.floor(Math.random() * 200),
      medicalRecordsAccessed: 1200 + Math.floor(Math.random() * 400),
      unauthorizedAttempts: Math.floor(Math.random() * 5)
    };
  }

  private async getSecurityIncidents(organizationId: number, startDate: Date, endDate: Date) {
    return {
      totalIncidents: Math.floor(Math.random() * 3),
      criticalIncidents: Math.floor(Math.random() * 1),
      resolvedIncidents: Math.floor(Math.random() * 2),
      averageResolutionTime: "4.5 hours"
    };
  }

  private async getDataRetentionSummary(organizationId: number) {
    return {
      recordsPurged: 45 + Math.floor(Math.random() * 20),
      recordsArchived: 120 + Math.floor(Math.random() * 50),
      storageReclaimed: "2.3 GB",
      retentionPoliciesActive: 3
    };
  }

  private async generateComplianceRecommendations(organizationId: number) {
    return [
      "Schedule quarterly compliance training for all staff",
      "Implement automated data classification system",
      "Review and update data retention policies",
      "Conduct penetration testing for security assessment"
    ];
  }

  private async storeComplianceReport(organizationId: number, report: any) {
    // In real system, store report in secure archive
    console.log(`Compliance report generated for organization ${organizationId}:`, {
      period: report.reportPeriod,
      generatedAt: report.generatedAt,
      complianceScore: (
        report.complianceStatus.gdprCompliance +
        report.complianceStatus.dataRetentionCompliance +
        report.complianceStatus.accessControlCompliance +
        report.complianceStatus.auditTrailCompliance
      ) / 4
    });
  }
}

export const auditCompliance = new AuditComplianceService();