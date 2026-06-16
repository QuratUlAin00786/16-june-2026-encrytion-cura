import OpenAI from "openai";
import { storage } from "../storage";
import type { Patient, MedicalRecord } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ClinicalAlert {
  id: string;
  type: "drug_interaction" | "allergy_conflict" | "dosage_concern" | "contraindication" | "lab_value_alert";
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  description: string;
  recommendation: string;
  evidence: string[];
  patientId: number;
  relatedMedications?: string[];
  relatedConditions?: string[];
  requiresAction: boolean;
  createdAt: Date;
}

export interface RiskAssessment {
  overallRisk: "low" | "moderate" | "high" | "critical";
  cardiovascularRisk: number; // 0-100 percentage
  diabeticComplications: number; // 0-100 percentage
  fallRisk: number; // 0-100 percentage
  riskFactors: string[];
  recommendations: string[];
  nextReviewDate: Date;
}

export interface DiagnosticSuggestion {
  icd10Code: string;
  description: string;
  confidence: number; // 0-100 percentage
  supportingEvidence: string[];
  differentialDiagnoses: string[];
  recommendedTests: string[];
  urgencyLevel: "routine" | "urgent" | "emergent";
}

export class ClinicalDecisionSupport {

  /**
   * Analyzes patient medications for potential drug interactions
   */
  async analyzeDrugInteractions(patientId: number, organizationId: number, newMedications: string[] = []): Promise<ClinicalAlert[]> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) throw new Error("Patient not found");

    const currentMedications = patient.medicalHistory?.medications || [];
    const allMedications = [...currentMedications, ...newMedications];

    if (allMedications.length < 2) return [];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical pharmacist AI specializing in drug interaction analysis. Analyze the provided medications for potential interactions, contraindications, and safety concerns. Consider patient age, allergies, and medical conditions. Return a JSON array of clinical alerts.`
          },
          {
            role: "user",
            content: `Patient Information:
- Age: ${this.calculateAge(patient.dateOfBirth)}
- Allergies: ${patient.medicalHistory?.allergies?.join(", ") || "None reported"}
- Chronic Conditions: ${patient.medicalHistory?.chronicConditions?.join(", ") || "None reported"}
- Current Medications: ${allMedications.join(", ")}

Analyze for drug interactions and provide clinical alerts in this JSON format:
{
  "alerts": [
    {
      "type": "drug_interaction|allergy_conflict|dosage_concern|contraindication",
      "severity": "low|moderate|high|critical",
      "title": "Brief alert title",
      "description": "Detailed description",
      "recommendation": "Clinical recommendation",
      "evidence": ["Source 1", "Source 2"],
      "relatedMedications": ["Med1", "Med2"],
      "requiresAction": true/false
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"alerts": []}');

      return result.alerts.map((alert: any, index: number) => ({
        id: `alert_${Date.now()}_${index}`,
        ...alert,
        patientId,
        createdAt: new Date()
      }));

    } catch (error) {
      console.error("Error analyzing drug interactions:", error);
      return [];
    }
  }

  async generateDrugInteractionAnalysis(
    medication1: { name: string; dosage?: string; frequency?: string },
    medication2: { name: string; dosage?: string; frequency?: string }
  ): Promise<{
    severity: "low" | "medium" | "high";
    description: string;
    warnings: string[];
    recommendations: string[];
    notes: string;
  }> {
    const med1Str = [medication1.name, medication1.dosage, medication1.frequency].filter(Boolean).join(", ");
    const med2Str = [medication2.name, medication2.dosage, medication2.frequency].filter(Boolean).join(", ");

    try {
      // Validate API key before making request
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
      if (!apiKey || apiKey === "default_key") {
        throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY or OPENAI_API_KEY_ENV_VAR in your environment variables.");
      }
      
      // Validate API key format (OpenAI keys should start with "sk-")
      if (!apiKey.startsWith("sk-")) {
        throw new Error(`Invalid OpenAI API key format. The key should start with "sk-". Please check your OPENAI_API_KEY environment variable. Get a valid key from https://platform.openai.com/account/api-keys`);
      }

      // Uses same OpenAI client configuration as aiService (process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key")
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical pharmacist AI. Analyze the drug interaction between two medications. Your response must be a single JSON object."
          },
          {
            role: "user",
            content: `Medication 1: ${med1Str}
Medication 2: ${med2Str}

Analyze the potential drug interaction and return JSON only in this exact format:
{
  "severity": "low" | "medium" | "high",
  "description": "Full paragraph describing the interaction.",
  "warnings": ["Warning 1", "Warning 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "notes": "Any additional clinical notes."
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      let result;
      try {
        result = JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      }

      const severityMap: Record<string, "low" | "medium" | "high"> = {
        low: "low",
        moderate: "medium",
        medium: "medium",
        high: "high",
        critical: "high"
      };

      const severity = severityMap[String(result.severity || "").toLowerCase()] || "medium";

      return {
        severity,
        description: result.description || "No interaction description generated.",
        warnings: Array.isArray(result.warnings) ? result.warnings : (result.warnings ? [result.warnings] : []),
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : (result.recommendations ? [result.recommendations] : []),
        notes: result.notes || ""
      };
    } catch (error: any) {
      console.error("[ClinicalDecisionSupport] AI Error:", error);
      
      // Handle OpenAI API key errors specifically
      if (error?.status === 401 || error?.message?.includes("Incorrect API key") || error?.message?.includes("401")) {
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
        const maskedKey = apiKey ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : "not set";
        throw new Error(`OpenAI API key is invalid or incorrect. Please verify your OPENAI_API_KEY environment variable. Current key: ${maskedKey}. Get a valid key from https://platform.openai.com/account/api-keys`);
      }
      
      // Handle other OpenAI errors
      if (error?.message?.includes("API key") || error?.status === 401) {
        throw new Error(`OpenAI API authentication failed. Please check your API key configuration. Error: ${error.message || "Unknown error"}`);
      }
      
      throw error;
    }
  }

  /**
   * Performs comprehensive risk assessment for a patient
   */
  async performRiskAssessment(patientId: number, organizationId: number): Promise<RiskAssessment> {
    const patient = await storage.getPatient(patientId, organizationId);
    const records = await storage.getMedicalRecordsByPatient(patientId, organizationId);

    if (!patient) throw new Error("Patient not found");

    const age = this.calculateAge(patient.dateOfBirth);
    const conditions = patient.medicalHistory?.chronicConditions || [];
    const medications = patient.medicalHistory?.medications || [];
    const recentRecords = records.slice(0, 5); // Last 5 records

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical risk assessment specialist. Analyze patient data to determine cardiovascular risk, diabetic complications risk, fall risk, and overall health risk. Use evidence-based guidelines (ASCVD, HbA1c, Morse Fall Scale principles).`
          },
          {
            role: "user",
            content: `Patient Risk Assessment Data:
- Age: ${age}
- Chronic Conditions: ${conditions.join(", ")}
- Current Medications: ${medications.join(", ")}
- Recent Clinical Notes: ${recentRecords.map(r => r.notes).join(". ")}

Provide risk assessment in JSON format:
{
  "overallRisk": "low|moderate|high|critical",
  "cardiovascularRisk": 0-100,
  "diabeticComplications": 0-100,
  "fallRisk": 0-100,
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["rec1", "rec2"],
  "nextReviewMonths": 1-12
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + (result.nextReviewMonths || 6));

      return {
        overallRisk: result.overallRisk || "moderate",
        cardiovascularRisk: result.cardiovascularRisk || 0,
        diabeticComplications: result.diabeticComplications || 0,
        fallRisk: result.fallRisk || 0,
        riskFactors: result.riskFactors || [],
        recommendations: result.recommendations || [],
        nextReviewDate
      };

    } catch (error) {
      console.error("Error performing risk assessment:", error);
      return {
        overallRisk: "moderate",
        cardiovascularRisk: 0,
        diabeticComplications: 0,
        fallRisk: 0,
        riskFactors: [],
        recommendations: ["Schedule comprehensive health assessment"],
        nextReviewDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months
      };
    }
  }

  /**
   * Generates diagnostic suggestions based on symptoms and clinical data
   */
  async generateDiagnosticSuggestions(
    symptoms: string[],
    patientId: number,
    organizationId: number,
    clinicalFindings?: string
  ): Promise<DiagnosticSuggestion[]> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) throw new Error("Patient not found");

    const age = this.calculateAge(patient.dateOfBirth);
    const conditions = patient.medicalHistory?.chronicConditions || [];
    const allergies = patient.medicalHistory?.allergies || [];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a diagnostic AI assistant specializing in differential diagnosis. Analyze symptoms and patient history to suggest possible diagnoses with ICD-10 codes. Consider patient demographics, existing conditions, and clinical findings.`
          },
          {
            role: "user",
            content: `Diagnostic Analysis Request:
- Patient Age: ${age}
- Presenting Symptoms: ${symptoms.join(", ")}
- Medical History: ${conditions.join(", ")}
- Known Allergies: ${allergies.join(", ")}
- Clinical Findings: ${clinicalFindings || "None provided"}

Provide diagnostic suggestions in JSON format:
{
  "suggestions": [
    {
      "icd10Code": "A00.0",
      "description": "Condition name",
      "confidence": 0-100,
      "supportingEvidence": ["evidence1", "evidence2"],
      "differentialDiagnoses": ["diff1", "diff2"],
      "recommendedTests": ["test1", "test2"],
      "urgencyLevel": "routine|urgent|emergent"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
      return result.suggestions || [];

    } catch (error) {
      console.error("Error generating diagnostic suggestions:", error);
      return [];
    }
  }

  /**
   * Creates automated clinical notifications based on patient data
   */
  async generateClinicalNotifications(patientId: number, organizationId: number): Promise<void> {
    const alerts = await this.analyzeDrugInteractions(patientId, organizationId);
    const riskAssessment = await this.performRiskAssessment(patientId, organizationId);
    const patient = await storage.getPatient(patientId, organizationId);

    if (!patient) return;

    // Create notifications for high-severity alerts
    for (const alert of alerts.filter(a => a.severity === "high" || a.severity === "critical")) {
      await storage.createNotification({
        organizationId,
        userId: 1, // Should be assigned to patient's primary physician
        title: alert.title,
        message: alert.description,
        type: "clinical_alert",
        priority: alert.severity === "critical" ? "critical" : "high",
        status: "unread",
        isActionable: alert.requiresAction,
        relatedEntityType: "patient",
        relatedEntityId: patientId,
        metadata: {
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          alertType: alert.type,
          urgency: alert.severity,
          department: "Clinical",
          requiresResponse: alert.requiresAction
        }
      });
    }

    // Create notification for high overall risk
    if (riskAssessment.overallRisk === "high" || riskAssessment.overallRisk === "critical") {
      await storage.createNotification({
        organizationId,
        userId: 1, // Primary physician
        title: `High Risk Patient: ${patient.firstName} ${patient.lastName}`,
        message: `Patient assessed as ${riskAssessment.overallRisk} risk. Cardiovascular: ${riskAssessment.cardiovascularRisk}%, Fall risk: ${riskAssessment.fallRisk}%`,
        type: "risk_alert",
        priority: riskAssessment.overallRisk === "critical" ? "critical" : "high",
        status: "unread",
        isActionable: true,
        actionUrl: `/patients/${patientId}`,
        relatedEntityType: "patient",
        relatedEntityId: patientId,
        metadata: {
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          riskLevel: riskAssessment.overallRisk,
          urgency: riskAssessment.overallRisk,
          department: "Clinical",
          requiresResponse: true
        }
      });
    }
  }

  /**
   * Monitors lab values and creates alerts for abnormal results
   */
  async analyzeLabValues(labResults: any[], patientId: number, organizationId: number): Promise<ClinicalAlert[]> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) throw new Error("Patient not found");

    const alerts: ClinicalAlert[] = [];
    const age = this.calculateAge(patient.dateOfBirth);
    const conditions = patient.medicalHistory?.chronicConditions || [];

    // Critical lab value thresholds
    const criticalValues = {
      glucose: { low: 70, high: 400 },
      potassium: { low: 3.0, high: 5.5 },
      sodium: { low: 130, high: 150 },
      creatinine: { low: 0, high: 2.0 },
      hemoglobin: { low: 7.0, high: 18.0 },
      platelet: { low: 50000, high: 1000000 }
    };

    for (const result of labResults) {
      const testName = result.name?.toLowerCase();
      const value = parseFloat(result.value);

      if (isNaN(value)) continue;

      for (const [test, thresholds] of Object.entries(criticalValues)) {
        if (testName?.includes(test)) {
          if (value < thresholds.low || value > thresholds.high) {
            alerts.push({
              id: `lab_alert_${Date.now()}_${test}`,
              type: "lab_value_alert",
              severity: value < thresholds.low * 0.8 || value > thresholds.high * 1.2 ? "critical" : "high",
              title: `Abnormal ${test.charAt(0).toUpperCase() + test.slice(1)} Level`,
              description: `${test.charAt(0).toUpperCase() + test.slice(1)} level of ${value} is ${value < thresholds.low ? "below" : "above"} normal range (${thresholds.low}-${thresholds.high})`,
              recommendation: `Immediate clinical review required. Consider dose adjustments if on related medications.`,
              evidence: [`Lab result: ${result.name} = ${result.value}`, `Reference range: ${thresholds.low}-${thresholds.high}`],
              patientId,
              requiresAction: true,
              createdAt: new Date()
            });
          }
        }
      }
    }

    return alerts;
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
}

export const clinicalDecisionSupport = new ClinicalDecisionSupport();