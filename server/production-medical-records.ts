// Production Medical Records Export - Specific records for Patient 158 (Imran Mubashir)
// This ensures development medical records are available in production

import { db } from "./db.js";
import { medicalRecords } from "@shared/schema.js";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage.js";

interface SeedOptions {
  orgSubdomain?: string;
  maxPatients?: number;
  minRecordsPerPatient?: number;
}

export async function seedProductionMedicalRecords(options: SeedOptions = {}) {
  try {
    const { orgSubdomain = "demo", maxPatients = 1, minRecordsPerPatient = 2 } = options;
    
    console.log(`🏥 Seeding production medical records for organization: ${orgSubdomain}...`);
    
    // Get the specified organization
    const { organizations, patients } = await import("@shared/schema.js");
    const [org] = await db.select().from(organizations).where(eq(organizations.subdomain, orgSubdomain));
    
    if (!org) {
      console.log(`⚠️  Organization '${orgSubdomain}' not found - cannot seed medical records`);
      return { success: false, error: "Organization not found", createdCount: 0 };
    }
    
    // Get patients in the organization (limited by maxPatients)
    const allPatients = await db.select().from(patients)
      .where(eq(patients.organizationId, org.id))
      .limit(maxPatients);
    
    console.log(`🔍 Found ${allPatients.length} patients in ${orgSubdomain} organization`);
    
    if (allPatients.length === 0) {
      console.log("⚠️  No patients found - cannot seed medical records");
      return { success: false, error: "No patients found", createdCount: 0 };
    }
    
    let totalCreated = 0;
    const results = [];
    
    // Process each patient (up to maxPatients)
    for (const rawPatient of allPatients) {
      const targetPatient = await storage.normalizePatientFromRow(rawPatient);
      if (!targetPatient) {
        console.log(`⚠️  Skipping patient id=${rawPatient.id}: could not decrypt/normalize row`);
        continue;
      }
      console.log(`🎯 Processing patient: ID ${targetPatient.id}, Name: ${targetPatient.firstName} ${targetPatient.lastName}`);
      
      // Check if medical records already exist for this patient
      const existingRecords = await db.select().from(medicalRecords)
        .where(and(
          eq(medicalRecords.patientId, targetPatient.id), 
          eq(medicalRecords.organizationId, org.id)
        ));
      
      if (existingRecords.length >= minRecordsPerPatient) {
        console.log(`✅ Patient ${targetPatient.id} already has ${existingRecords.length} records (minimum: ${minRecordsPerPatient}), skipping`);
        results.push({ patientId: targetPatient.id, createdCount: 0, skipped: true });
        continue;
      }
    
      console.log(`🔍 Patient ${targetPatient.id} needs more medical records (has ${existingRecords.length}, minimum: ${minRecordsPerPatient})`);
      
      // Get the first provider for this organization
      const { users } = await import("@shared/schema.js");
      const providers = await db.select().from(users)
        .where(and(eq(users.organizationId, org.id), eq(users.role, "doctor")));
      
      if (providers.length === 0) {
        console.log(`❌ No doctor found in organization ${orgSubdomain} - cannot create medical records`);
        return { success: false, error: "No provider found in organization", createdCount: totalCreated };
      }
      
      const targetProvider = providers[0];
      console.log(`🩺 Using provider: ID ${targetProvider.id}`);
      
      // Production medical records data - universal for any patient
      const recordsToCreate = minRecordsPerPatient - existingRecords.length;
      const productionRecords = [
      {
        organizationId: org.id,
        patientId: targetPatient.id,
        providerId: targetProvider.id,
        type: "consultation",
        title: "Anatomical Analysis - Orbicularis Oris",
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${targetPatient.firstName} ${targetPatient.lastName}
Date: August 25, 2025

ANALYSIS DETAILS:
• Target Muscle Group: Orbicularis Oris
• Analysis Type: Nerve Function
• Primary Treatment: Botox Injection

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied


TREATMENT PLAN:

COMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN

Patient: ${targetPatient.firstName} ${targetPatient.lastName}
Date: August 25, 2025

TARGET ANALYSIS:
• Muscle Group: Orbicularis Oris
• Analysis Type: Nerve Function
• Primary Treatment: Botox Injection

TREATMENT PROTOCOL:
1. Initial Assessment & Baseline Documentation
2. Pre-treatment Preparation & Patient Consultation
3. Botox Injection Implementation
4. Post-treatment Monitoring & Assessment
5. Follow-up Care & Progress Evaluation

EXPECTED OUTCOMES:
• Improved muscle function and symmetry
• Reduced symptoms and enhanced patient comfort
• Optimized aesthetic and functional results
• Long-term maintenance planning

NEXT STEPS:
• Schedule follow-up appointment in 1-2 weeks
• Monitor patient response and adjust treatment as needed
• Document progress with photographic evidence
• Review treatment effectiveness and make modifications if required

Generated on: Aug 25, 2025, 1:17:04 PM


Analysis completed on: Aug 25, 2025, 1:17:24 PM`,
        diagnosis: "Anatomical analysis of orbicularis oris - nerve function",
        treatment: "Botox Injection",
        prescription: {},
        attachments: [],
        aiSuggestions: {}
      },
      {
        organizationId: org.id,
        patientId: targetPatient.id,
        providerId: targetProvider.id,
        type: "consultation",
        title: "Anatomical Analysis - Temporalis",
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${targetPatient.firstName} ${targetPatient.lastName}
Date: August 21, 2025

ANALYSIS DETAILS:
• Target Muscle Group: Temporalis
• Analysis Type: Movement Range
• Primary Treatment: Dermal Fillers

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied



Analysis completed on: Aug 21, 2025, 9:59:28 PM`,
        diagnosis: "Anatomical analysis of temporalis - movement range",
        treatment: "Dermal Fillers",
        prescription: {},
        attachments: [],
        aiSuggestions: {}
      },
      {
        organizationId: org.id,
        patientId: targetPatient.id,
        providerId: targetProvider.id,
        type: "consultation",
        title: "General Medical Consultation",
        notes: "The Patient has come to the hospital with headache, Nausea and high fever.",
        diagnosis: "Acute viral syndrome with neurological symptoms",
        treatment: "Symptomatic treatment and monitoring",
        prescription: { medications: [] },
        attachments: [],
        aiSuggestions: {}
      }
    ].slice(0, recordsToCreate); // Only create the needed number of records

      // Insert the records with better error handling
      const insertedRecords = await db.insert(medicalRecords).values(productionRecords).returning();
      
      console.log(`✅ Successfully created ${insertedRecords.length} medical records for Patient ${targetPatient.id}`);
      insertedRecords.forEach(record => {
        console.log(`   • ID ${record.id}: ${record.title || 'Untitled consultation'}`);
      });
      
      totalCreated += insertedRecords.length;
      results.push({ 
        patientId: targetPatient.id, 
        createdCount: insertedRecords.length, 
        skipped: false 
      });
    }
    
    console.log(`🎉 Seeding completed: ${totalCreated} total medical records created`);
    return { 
      success: true, 
      createdCount: totalCreated, 
      results,
      organizationId: org.id,
      orgSubdomain
    };
    
  } catch (error) {
    console.error("❌ Failed to seed production medical records:", error);
    return { 
      success: false, 
      error: (error as Error).message, 
      createdCount: 0 
    };
  }
}

// Verification function to ensure medical records exist
export async function verifyMedicalRecordsExist() {
  try {
    console.log("🔍 Verifying medical records exist for production patients...");
    
    // Get the main organization (Demo Healthcare Clinic)
    const { organizations, patients } = await import("@shared/schema.js");
    const [org] = await db.select().from(organizations).where(eq(organizations.subdomain, "demo"));
    
    if (!org) {
      console.log("⚠️  No organization found for verification");
      return;
    }
    
    // Get all patients in production to verify
    const allPatients = await db.select().from(patients).where(eq(patients.organizationId, org.id));
    console.log(`🔍 Found ${allPatients.length} patients to verify`);
    
    if (allPatients.length === 0) {
      console.log("⚠️  No patients found for verification");
      return;
    }
    
    // Get first patient for verification (dynamic approach)
    const firstPatient = allPatients[0];
    
    const patientId = firstPatient.id;
    const patientRecords = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.organizationId, org.id)));
    
    console.log(`📊 Found ${patientRecords.length} medical records for Patient ${patientId}:`);
    patientRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID ${record.id}: "${record.title}" (${record.type})`);
    });
    
    // Check for specific Anatomical Analysis records
    const anatomicalCount = patientRecords.filter(r => r.title?.includes("Anatomical Analysis")).length;
    console.log(`🎯 Found ${anatomicalCount} Anatomical Analysis records`);
    
    if (anatomicalCount === 0 && process.env.NODE_ENV !== 'production') {
      console.log("⚠️  NO ANATOMICAL ANALYSIS RECORDS FOUND - FORCE CREATING...");
      // Force create the records if they don't exist (only in development)
      await seedProductionMedicalRecords();
    } else {
      console.log("✅ Anatomical Analysis records confirmed present OR in production mode");
    }
    
  } catch (error) {
    console.error("❌ Failed to verify medical records:", error);
  }
}