import { storage } from "../storage";
import { clinicalDecisionSupport } from "./clinical-decision-support";
import type { Patient, MedicalRecord } from "@shared/schema";

export interface VitalSigns {
  bloodPressure: { systolic: number; diastolic: number };
  heartRate: number;
  temperature: number; // Celsius
  respiratoryRate: number;
  oxygenSaturation: number;
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  painScale?: number; // 0-10
  recordedAt: Date;
  recordedBy: string;
}

export interface MedicationAdherence {
  medicationName: string;
  prescribedDosage: string;
  actualTaken: number;
  missedDoses: number;
  adherencePercentage: number;
  lastTaken?: Date;
  nextDue: Date;
  sideEffectsReported: string[];
}

export interface PatientTrend {
  metric: string;
  trend: "improving" | "stable" | "declining" | "critical";
  changePercentage: number;
  timeframe: string;
  values: Array<{ date: Date; value: number }>;
  recommendation: string;
}

export class PatientMonitoringService {
  
  /**
   * Analyzes vital signs and creates alerts for abnormal values
   */
  async analyzeVitalSigns(patientId: number, organizationId: number, vitals: VitalSigns): Promise<void> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) return;

    const alerts: string[] = [];
    const age = this.calculateAge(patient.dateOfBirth);

    // Critical vital sign thresholds based on age and conditions
    const criticalThresholds = this.getCriticalThresholds(age, patient.medicalHistory?.chronicConditions || []);

    // Blood pressure analysis
    if (vitals.bloodPressure.systolic > criticalThresholds.systolicHigh || 
        vitals.bloodPressure.systolic < criticalThresholds.systolicLow) {
      alerts.push(`Critical blood pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg`);
    }

    // Heart rate analysis
    if (vitals.heartRate > criticalThresholds.heartRateHigh || 
        vitals.heartRate < criticalThresholds.heartRateLow) {
      alerts.push(`Abnormal heart rate: ${vitals.heartRate} bpm`);
    }

    // Temperature analysis
    if (vitals.temperature > 38.5 || vitals.temperature < 35.0) {
      alerts.push(`Temperature concern: ${vitals.temperature}°C`);
    }

    // Oxygen saturation
    if (vitals.oxygenSaturation < 90) {
      alerts.push(`Low oxygen saturation: ${vitals.oxygenSaturation}%`);
    }

    // Create clinical notifications for critical values
    for (const alert of alerts) {
      await storage.createNotification({
        organizationId,
        userId: 1, // Primary physician
        title: `Critical Vital Signs Alert`,
        message: `${patient.firstName} ${patient.lastName}: ${alert}`,
        type: "vital_signs_alert",
        priority: "critical",
        status: "unread",
        isActionable: true,
        actionUrl: `/patients/${patientId}/vitals`,
        relatedEntityType: "patient",
        relatedEntityId: patientId,
        metadata: {
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          vitalSign: alert,
          urgency: "critical",
          department: "Nursing",
          requiresResponse: true
        }
      });
    }

    // Store vital signs in medical record
    await storage.createMedicalRecord({
      organizationId,
      patientId,
      providerId: 1, // System recorded
      type: "vital_signs",
      title: "Vital Signs Assessment",
      notes: `BP: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}, HR: ${vitals.heartRate}, Temp: ${vitals.temperature}°C, O2 Sat: ${vitals.oxygenSaturation}%`,
      metadata: {
        vitalSigns: vitals,
        alerts: alerts.length > 0 ? alerts : undefined
      }
    });
  }

  /**
   * Tracks medication adherence and identifies non-compliance
   */
  async trackMedicationAdherence(patientId: number, organizationId: number): Promise<MedicationAdherence[]> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) return [];

    const medications = patient.medicalHistory?.medications || [];
    const adherenceData: MedicationAdherence[] = [];

    for (const medication of medications) {
      // Simulate medication tracking data (in real system this would come from patient app/device)
      const adherence = this.calculateMedicationAdherence(medication);
      adherenceData.push(adherence);

      // Create alerts for poor adherence
      if (adherence.adherencePercentage < 80) {
        await storage.createNotification({
          organizationId,
          userId: 1, // Primary physician
          title: `Poor Medication Adherence`,
          message: `${patient.firstName} ${patient.lastName} has ${adherence.adherencePercentage}% adherence to ${adherence.medicationName}`,
          type: "medication_adherence",
          priority: adherence.adherencePercentage < 50 ? "high" : "normal",
          status: "unread",
          isActionable: true,
          actionUrl: `/patients/${patientId}/medications`,
          relatedEntityType: "patient",
          relatedEntityId: patientId,
          metadata: {
            patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            medication: adherence.medicationName,
            adherenceRate: adherence.adherencePercentage,
            urgency: adherence.adherencePercentage < 50 ? "high" : "medium",
            department: "Pharmacy"
          }
        });
      }
    }

    return adherenceData;
  }

  /**
   * Generates comprehensive patient health trends
   */
  async generateHealthTrends(patientId: number, organizationId: number): Promise<PatientTrend[]> {
    const records = await storage.getMedicalRecordsByPatient(patientId, organizationId);
    const trends: PatientTrend[] = [];

    // Analyze blood pressure trends
    const bpRecords = records.filter(r => r.metadata?.vitalSigns?.bloodPressure);
    if (bpRecords.length >= 3) {
      const bpTrend = this.analyzeTrend(
        bpRecords.map(r => ({
          date: new Date(r.createdAt),
          value: r.metadata.vitalSigns.bloodPressure.systolic
        }))
      );
      
      trends.push({
        metric: "Systolic Blood Pressure",
        trend: bpTrend.trend,
        changePercentage: bpTrend.changePercentage,
        timeframe: "30 days",
        values: bpTrend.values,
        recommendation: this.getBPRecommendation(bpTrend)
      });
    }

    // Analyze weight trends if available
    const weightRecords = records.filter(r => r.metadata?.vitalSigns?.weight);
    if (weightRecords.length >= 3) {
      const weightTrend = this.analyzeTrend(
        weightRecords.map(r => ({
          date: new Date(r.createdAt),
          value: r.metadata.vitalSigns.weight
        }))
      );
      
      trends.push({
        metric: "Weight",
        trend: weightTrend.trend,
        changePercentage: weightTrend.changePercentage,
        timeframe: "30 days",
        values: weightTrend.values,
        recommendation: this.getWeightRecommendation(weightTrend)
      });
    }

    return trends;
  }

  /**
   * Performs automated health screening based on patient age and risk factors
   */
  async performHealthScreening(patientId: number, organizationId: number): Promise<string[]> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) return [];

    const age = this.calculateAge(patient.dateOfBirth);
    const conditions = patient.medicalHistory?.chronicConditions || [];
    const screeningRecommendations: string[] = [];

    // Age-based screening recommendations
    if (age >= 50) {
      screeningRecommendations.push("Colorectal cancer screening (colonoscopy every 10 years)");
      screeningRecommendations.push("Annual mammography (if female)");
    }

    if (age >= 65) {
      screeningRecommendations.push("Annual influenza vaccination");
      screeningRecommendations.push("Pneumococcal vaccination");
      screeningRecommendations.push("Bone density screening");
    }

    // Condition-based recommendations
    if (conditions.includes("Diabetes") || conditions.includes("Diabetes Type 2")) {
      screeningRecommendations.push("HbA1c every 3-6 months");
      screeningRecommendations.push("Annual diabetic eye exam");
      screeningRecommendations.push("Annual foot examination");
    }

    if (conditions.includes("Hypertension") || conditions.includes("High Blood Pressure")) {
      screeningRecommendations.push("Blood pressure monitoring every 3 months");
      screeningRecommendations.push("Annual lipid panel");
    }

    // Create preventive care notifications
    for (const recommendation of screeningRecommendations) {
      await storage.createNotification({
        organizationId,
        userId: 1,
        title: "Preventive Care Reminder",
        message: `${patient.firstName} ${patient.lastName} is due for: ${recommendation}`,
        type: "preventive_care",
        priority: "normal",
        status: "unread",
        isActionable: true,
        actionUrl: `/patients/${patientId}/preventive-care`,
        relatedEntityType: "patient",
        relatedEntityId: patientId,
        metadata: {
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          screening: recommendation,
          urgency: "low",
          department: "Preventive Care"
        }
      });
    }

    return screeningRecommendations;
  }

  /**
   * Monitors patient's chronic conditions and progression
   */
  async monitorChronicConditions(patientId: number, organizationId: number): Promise<void> {
    const patient = await storage.getPatient(patientId, organizationId);
    if (!patient) return;

    const conditions = patient.medicalHistory?.chronicConditions || [];
    const recentRecords = await storage.getMedicalRecordsByPatient(patientId, organizationId);

    for (const condition of conditions) {
      const conditionRecords = recentRecords.filter(r => 
        r.diagnosis?.toLowerCase().includes(condition.toLowerCase()) ||
        r.notes?.toLowerCase().includes(condition.toLowerCase())
      );

      if (conditionRecords.length === 0) {
        // No recent documentation for chronic condition
        await storage.createNotification({
          organizationId,
          userId: 1,
          title: "Chronic Condition Follow-up Needed",
          message: `${patient.firstName} ${patient.lastName}: No recent documentation for ${condition}`,
          type: "chronic_condition",
          priority: "normal",
          status: "unread",
          isActionable: true,
          actionUrl: `/patients/${patientId}`,
          relatedEntityType: "patient",
          relatedEntityId: patientId,
          metadata: {
            patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            condition,
            urgency: "medium",
            department: "Clinical"
          }
        });
      }
    }
  }

  private getCriticalThresholds(age: number, conditions: string[]) {
    const baseThresholds = {
      systolicHigh: 180,
      systolicLow: 90,
      diastolicHigh: 110,
      diastolicLow: 60,
      heartRateHigh: 100,
      heartRateLow: 60
    };

    // Adjust for age
    if (age > 65) {
      baseThresholds.heartRateHigh = 90;
      baseThresholds.systolicHigh = 160;
    }

    // Adjust for conditions
    if (conditions.includes("Diabetes")) {
      baseThresholds.systolicHigh = 140;
    }

    return baseThresholds;
  }

  private calculateMedicationAdherence(medication: string): MedicationAdherence {
    // Simulated adherence data - in real system this would come from patient tracking
    const adherencePercentage = Math.floor(Math.random() * 40) + 60; // 60-100%
    const missedDoses = Math.floor((100 - adherencePercentage) / 10);
    
    return {
      medicationName: medication,
      prescribedDosage: "As prescribed",
      actualTaken: Math.floor(adherencePercentage / 10),
      missedDoses,
      adherencePercentage,
      lastTaken: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      nextDue: new Date(Date.now() + 12 * 60 * 60 * 1000),
      sideEffectsReported: adherencePercentage < 70 ? ["Mild nausea"] : []
    };
  }

  private analyzeTrend(values: Array<{ date: Date; value: number }>) {
    if (values.length < 2) return { trend: "stable" as const, changePercentage: 0, values };

    const sortedValues = values.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstValue = sortedValues[0].value;
    const lastValue = sortedValues[sortedValues.length - 1].value;
    const changePercentage = ((lastValue - firstValue) / firstValue) * 100;

    let trend: "improving" | "stable" | "declining" | "critical";
    
    if (Math.abs(changePercentage) < 5) {
      trend = "stable";
    } else if (changePercentage > 0) {
      trend = changePercentage > 20 ? "critical" : "declining";
    } else {
      trend = changePercentage < -20 ? "critical" : "improving";
    }

    return { trend, changePercentage, values: sortedValues };
  }

  private getBPRecommendation(trend: any): string {
    if (trend.trend === "declining") {
      return "Blood pressure is increasing. Consider medication adjustment and lifestyle modifications.";
    } else if (trend.trend === "improving") {
      return "Blood pressure is improving. Continue current treatment plan.";
    }
    return "Blood pressure is stable. Continue monitoring.";
  }

  private getWeightRecommendation(trend: any): string {
    if (Math.abs(trend.changePercentage) > 5) {
      return trend.changePercentage > 0 
        ? "Significant weight gain detected. Consider nutritional counseling."
        : "Significant weight loss detected. Evaluate for underlying causes.";
    }
    return "Weight is stable within normal variation.";
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

export const patientMonitoring = new PatientMonitoringService();