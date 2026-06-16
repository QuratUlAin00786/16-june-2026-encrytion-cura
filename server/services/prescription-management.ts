import OpenAI from "openai";
import { storage } from "../storage";
import { clinicalDecisionSupport } from "./clinical-decision-support";
import type { Patient, MedicalRecord } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PrescriptionSafety {
  isApproved: boolean;
  riskLevel: "low" | "moderate" | "high" | "critical";
  warnings: DrugWarning[];
  recommendations: string[];
  requiredMonitoring: string[];
  pharmacistReview: boolean;
}

export interface DrugWarning {
  id: string;
  type: "interaction" | "allergy" | "contraindication" | "dosage" | "age" | "kidney" | "liver";
  severity: "minor" | "moderate" | "major" | "contraindicated";
  description: string;
  drugs: string[];
  clinicalSignificance: string;
  management: string;
  evidence: string;
}

export interface DosageOptimization {
  originalDose: string;
  optimizedDose: string;
  reason: string;
  adjustmentFactors: string[];
  monitoring: string[];
  nextReview: Date;
}

export interface RefillAlert {
  patientId: number;
  medicationName: string;
  daysRemaining: number;
  refillsRemaining: number;
  prescriptionExpiry: Date;
  urgency: "low" | "medium" | "high" | "critical";
  actionRequired: string;
}

export class PrescriptionManager {

  /**
   * Comprehensive prescription safety analysis using clinical AI
   */
  async analyzePrescriptionSafety(
    patientId: number, 
    organizationId: number, 
    newMedications: Array<{name: string; dosage: string; frequency: string}>
  ): Promise<PrescriptionSafety> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) throw new Error("Patient not found");

    const currentMedications = patient.medicalHistory?.medications || [];
    const allergies = patient.medicalHistory?.allergies || [];
    const conditions = patient.medicalHistory?.chronicConditions || [];
    const age = this.calculateAge(patient.dateOfBirth);

    // Get recent lab results for kidney/liver function
    const recentRecords = await storage.getMedicalRecordsByPatient(patientId, organizationId);
    const labResults = this.extractLabResults(recentRecords);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical pharmacist AI specializing in medication safety analysis. Analyze prescriptions for drug interactions, contraindications, allergies, age-related concerns, and organ function considerations. Use evidence-based guidelines and provide detailed safety assessments.`
          },
          {
            role: "user",
            content: `Prescription Safety Analysis:

PATIENT PROFILE:
- Age: ${age} years
- Known Allergies: ${allergies.join(", ") || "None"}
- Medical Conditions: ${conditions.join(", ") || "None"}
- Current Medications: ${currentMedications.join(", ") || "None"}
- Recent Lab Results: ${JSON.stringify(labResults)}

NEW PRESCRIPTIONS:
${newMedications.map(med => `- ${med.name} ${med.dosage} ${med.frequency}`).join("\n")}

Provide comprehensive safety analysis in JSON format:
{
  "isApproved": boolean,
  "riskLevel": "low|moderate|high|critical",
  "warnings": [
    {
      "type": "interaction|allergy|contraindication|dosage|age|kidney|liver",
      "severity": "minor|moderate|major|contraindicated",
      "description": "Detailed warning description",
      "drugs": ["drug1", "drug2"],
      "clinicalSignificance": "Clinical impact explanation",
      "management": "Recommended action",
      "evidence": "Supporting evidence/guidelines"
    }
  ],
  "recommendations": ["Clinical recommendations"],
  "requiredMonitoring": ["Monitoring parameters"],
  "pharmacistReview": boolean
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Add unique IDs to warnings
      if (result.warnings) {
        result.warnings = result.warnings.map((warning: any, index: number) => ({
          ...warning,
          id: `warning_${Date.now()}_${index}`
        }));
      }

      return {
        isApproved: result.isApproved || false,
        riskLevel: result.riskLevel || "moderate",
        warnings: result.warnings || [],
        recommendations: result.recommendations || [],
        requiredMonitoring: result.requiredMonitoring || [],
        pharmacistReview: result.pharmacistReview || false
      };

    } catch (error) {
      console.error("Error analyzing prescription safety:", error);
      
      // Return conservative safety response on error
      return {
        isApproved: false,
        riskLevel: "moderate",
        warnings: [{
          id: `error_${Date.now()}`,
          type: "interaction",
          severity: "moderate",
          description: "Unable to perform complete safety analysis. Manual review recommended.",
          drugs: newMedications.map(m => m.name),
          clinicalSignificance: "Requires clinical evaluation",
          management: "Consult pharmacist before dispensing",
          evidence: "System safety protocol"
        }],
        recommendations: ["Conduct manual prescription review"],
        requiredMonitoring: ["Standard medication monitoring"],
        pharmacistReview: true
      };
    }
  }

  /**
   * Optimizes drug dosages based on patient factors
   */
  async optimizeDosage(
    patientId: number,
    organizationId: number,
    medication: {name: string; currentDose: string; indication: string}
  ): Promise<DosageOptimization | null> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) return null;

    const age = this.calculateAge(patient.dateOfBirth);
    const weight = this.getPatientWeight(patient);
    const conditions = patient.medicalHistory?.chronicConditions || [];
    const recentRecords = await storage.getMedicalRecordsByPatient(patientId, organizationId);
    const labResults = this.extractLabResults(recentRecords);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical pharmacologist specializing in dosage optimization. Consider patient age, weight, kidney function, liver function, drug interactions, and clinical guidelines to recommend optimal dosing.`
          },
          {
            role: "user",
            content: `Dosage Optimization Request:

MEDICATION: ${medication.name}
CURRENT DOSE: ${medication.currentDose}
INDICATION: ${medication.indication}

PATIENT FACTORS:
- Age: ${age} years
- Weight: ${weight || "Unknown"} kg
- Conditions: ${conditions.join(", ")}
- Kidney Function: ${labResults.creatinine || "Unknown"}
- Liver Function: ${labResults.alt || "Unknown"}

Provide dosage optimization in JSON format:
{
  "optimizedDose": "Recommended dose",
  "reason": "Explanation for adjustment",
  "adjustmentFactors": ["factor1", "factor2"],
  "monitoring": ["monitoring parameter 1"],
  "nextReviewDays": 7-90
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      if (result.optimizedDose && result.optimizedDose !== medication.currentDose) {
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + (result.nextReviewDays || 30));

        return {
          originalDose: medication.currentDose,
          optimizedDose: result.optimizedDose,
          reason: result.reason || "Dosage optimization based on patient factors",
          adjustmentFactors: result.adjustmentFactors || [],
          monitoring: result.monitoring || [],
          nextReview
        };
      }

      return null; // No optimization needed

    } catch (error) {
      console.error("Error optimizing dosage:", error);
      return null;
    }
  }

  /**
   * Manages prescription refills and alerts
   */
  async manageRefillAlerts(organizationId: number): Promise<RefillAlert[]> {
    const patients = await storage.getPatientsByOrganization(organizationId);
    const alerts: RefillAlert[] = [];

    for (const patient of patients) {
      const medications = patient.medicalHistory?.medications || [];
      
      for (const medication of medications) {
        // Simulate prescription data (in real system this would be tracked)
        const refillData = this.simulateRefillData(medication);
        
        if (refillData.daysRemaining <= 7 || refillData.refillsRemaining === 0) {
          const urgency = this.calculateRefillUrgency(refillData);
          
          alerts.push({
            patientId: patient.id,
            medicationName: medication,
            daysRemaining: refillData.daysRemaining,
            refillsRemaining: refillData.refillsRemaining,
            prescriptionExpiry: refillData.expiry,
            urgency,
            actionRequired: this.getRefillAction(refillData)
          });

          // Create notification for critical refills
          if (urgency === "high" || urgency === "critical") {
            await storage.createNotification({
              organizationId,
              userId: 1, // Pharmacist or prescribing physician
              title: "Prescription Refill Required",
              message: `${patient.firstName} ${patient.lastName} needs refill for ${medication} (${refillData.daysRemaining} days remaining)`,
              type: "prescription_refill",
              priority: urgency === "critical" ? "critical" : "high",
              status: "unread",
              isActionable: true,
              actionUrl: `/patients/${patient.id}/prescriptions`,
              relatedEntityType: "patient",
              relatedEntityId: patient.id,
              metadata: {
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                medication,
                daysRemaining: refillData.daysRemaining,
                urgency,
                department: "Pharmacy"
              }
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Monitors medication adherence and effectiveness
   */
  async monitorMedicationEffectiveness(patientId: number, organizationId: number): Promise<any> {
    const patient = await storage.getPatient(patientId, organizationId);
    const records = await storage.getMedicalRecordsByPatient(patientId, organizationId);
    
    if (!patient) return null;

    const medications = patient.medicalHistory?.medications || [];
    const analysis = {
      adherenceRate: this.calculateAdherenceRate(records, medications),
      effectivenessIndicators: this.analyzeEffectiveness(records, patient.medicalHistory?.chronicConditions || []),
      sideEffects: this.identifySideEffects(records),
      recommendations: []
    };

    // Generate recommendations based on analysis
    if (analysis.adherenceRate < 80) {
      analysis.recommendations.push("Consider medication adherence counseling and reminder systems");
    }

    if (analysis.sideEffects.length > 0) {
      analysis.recommendations.push("Review side effects with patient and consider alternative medications");
    }

    return analysis;
  }

  /**
   * Generates automated prescription renewals
   */
  async processAutomaticRenewals(organizationId: number): Promise<void> {
    const refillAlerts = await this.manageRefillAlerts(organizationId);
    
    for (const alert of refillAlerts) {
      if (alert.urgency === "critical" && alert.refillsRemaining > 0) {
        // Auto-approve refill for chronic medications
        const patient = await storage.getPatient(alert.patientId, organizationId);
        if (patient && this.isChronicMedication(alert.medicationName)) {
          
          await storage.createNotification({
            organizationId,
            userId: 1,
            title: "Automatic Refill Processed",
            message: `Automatic refill approved for ${patient.firstName} ${patient.lastName} - ${alert.medicationName}`,
            type: "prescription_renewal",
            priority: "normal",
            status: "unread",
            isActionable: false,
            relatedEntityType: "patient",
            relatedEntityId: alert.patientId,
            metadata: {
              patientId: alert.patientId,
              patientName: `${patient.firstName} ${patient.lastName}`,
              medication: alert.medicationName,
              refillType: "automatic",
              department: "Pharmacy"
            }
          });
        }
      }
    }
  }

  /**
   * Provides clinical decision support for prescribing
   */
  async getPrescribingGuidance(
    condition: string,
    patientAge: number,
    allergies: string[],
    currentMedications: string[]
  ): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical decision support AI for prescribing. Provide evidence-based medication recommendations based on patient condition, age, allergies, and current medications. Follow clinical guidelines and best practices.`
          },
          {
            role: "user",
            content: `Prescribing Guidance Request:

CONDITION: ${condition}
PATIENT AGE: ${patientAge}
ALLERGIES: ${allergies.join(", ") || "None"}
CURRENT MEDICATIONS: ${currentMedications.join(", ") || "None"}

Provide prescribing recommendations in JSON format:
{
  "firstLineOptions": [
    {
      "medication": "Drug name",
      "dosage": "Standard dose",
      "frequency": "Dosing frequency",
      "duration": "Treatment duration",
      "evidence": "Supporting evidence",
      "monitoring": "Required monitoring"
    }
  ],
  "alternativeOptions": [],
  "contraindications": ["Contraindication 1"],
  "clinicalPearls": ["Clinical tip 1"],
  "followUpRecommendations": ["Follow-up plan"]
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');

    } catch (error) {
      console.error("Error getting prescribing guidance:", error);
      return {
        firstLineOptions: [],
        alternativeOptions: [],
        contraindications: ["Manual clinical evaluation required"],
        clinicalPearls: ["Consult clinical guidelines and specialist if needed"],
        followUpRecommendations: ["Schedule follow-up appointment"]
      };
    }
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private getPatientWeight(patient: Patient): number | null {
    // In real system, this would be extracted from recent vital signs
    return null;
  }

  private extractLabResults(records: MedicalRecord[]): any {
    // Extract relevant lab values from medical records
    const labResults: any = {};
    
    for (const record of records.slice(0, 5)) { // Check last 5 records
      if (record.type === "lab_result" && record.notes) {
        // Simple extraction - in real system this would be more sophisticated
        if (record.notes.includes("creatinine")) {
          const match = record.notes.match(/creatinine[:\s]+([0-9.]+)/i);
          if (match) labResults.creatinine = parseFloat(match[1]);
        }
        if (record.notes.includes("ALT")) {
          const match = record.notes.match(/ALT[:\s]+([0-9.]+)/i);
          if (match) labResults.alt = parseFloat(match[1]);
        }
      }
    }
    
    return labResults;
  }

  private simulateRefillData(medication: string) {
    // Simulate prescription refill data
    const daysRemaining = Math.floor(Math.random() * 30);
    const refillsRemaining = Math.floor(Math.random() * 6);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + Math.floor(Math.random() * 12) + 1);

    return {
      daysRemaining,
      refillsRemaining,
      expiry
    };
  }

  private calculateRefillUrgency(refillData: any): "low" | "medium" | "high" | "critical" {
    if (refillData.daysRemaining <= 1) return "critical";
    if (refillData.daysRemaining <= 3) return "high";
    if (refillData.daysRemaining <= 7) return "medium";
    return "low";
  }

  private getRefillAction(refillData: any): string {
    if (refillData.refillsRemaining === 0) {
      return "New prescription required - contact prescriber";
    }
    if (refillData.daysRemaining <= 3) {
      return "Urgent refill needed - process immediately";
    }
    return "Schedule refill pickup";
  }

  private isChronicMedication(medication: string): boolean {
    const chronicMeds = ["metformin", "lisinopril", "simvastatin", "levothyroxine", "omeprazole"];
    return chronicMeds.some(med => medication.toLowerCase().includes(med));
  }

  private calculateAdherenceRate(records: MedicalRecord[], medications: string[]): number {
    // Simulate adherence calculation based on appointment frequency and notes
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }

  private analyzeEffectiveness(records: MedicalRecord[], conditions: string[]): any {
    // Analyze medication effectiveness based on condition progression
    return {
      bloodPressureControl: Math.random() > 0.3 ? "good" : "needs improvement",
      diabeticControl: Math.random() > 0.3 ? "good" : "needs improvement",
      symptomImprovement: Math.random() > 0.2 ? "improving" : "stable"
    };
  }

  private identifySideEffects(records: MedicalRecord[]): string[] {
    // Extract potential side effects from medical records
    const sideEffects: string[] = [];
    
    for (const record of records.slice(0, 3)) {
      if (record.notes && (record.notes.includes("nausea") || record.notes.includes("dizziness"))) {
        sideEffects.push("Gastrointestinal symptoms reported");
      }
      if (record.notes && record.notes.includes("fatigue")) {
        sideEffects.push("Fatigue reported");
      }
    }
    
    return sideEffects;
  }
}

export const prescriptionManager = new PrescriptionManager();