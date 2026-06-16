import { db } from "./db.js";
import { organizations, users, patients, appointments, medicalRecords, notifications, prescriptions, subscriptions, aiInsights, roles, saasSubscriptions, saasPackages } from "@shared/schema.js";
import {
  ensureSystemRolesForAllOrganizations,
  ensureSystemRolesForOrganization,
} from "./default-system-roles.js";
import { authService } from "./services/auth.js";
import { storage } from "./storage.js";
import { preparePatientForStorage, assertEncryptedPatientInsertRow } from "./utils/encryption-sdk.js";
import { eq, inArray, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");
    
    // Fix sequence for users table to prevent duplicate key errors
    try {
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1) + 1, false)`);
      console.log("Reset users sequence to prevent duplicate key errors");
    } catch (seqError) {
      console.log("Could not reset users sequence (may not be needed)");
    }

    // Get or create sample organization
    let [org] = await db.select().from(organizations).where(eq(organizations.subdomain, "cura"));
    
    if (!org) {
      [org] = await db.insert(organizations).values([{
      name: "Cura Healthcare",
      subdomain: "cura",
      email: "admin@curaemr.ai",
      region: "UK",
      brandName: "Cura EMR",
      settings: {
        theme: { primaryColor: "#3b82f6", logoUrl: "" },
        compliance: { gdprEnabled: true, dataResidency: "UK" },
        features: { aiEnabled: true, billingEnabled: true }
      },
      subscriptionStatus: "active"
    }]).returning();
      console.log(`Created organization: ${org.name} (ID: ${org.id})`);
    } else {
      console.log(`Using existing organization: ${org.name} (ID: ${org.id})`);
    }

    // Seed all default system roles for this org first (idempotent)
    const orgRoleResult = await ensureSystemRolesForOrganization(org.id);
    console.log(
      `System roles for "${org.name}": ${orgRoleResult.created} created, ${orgRoleResult.existing} already present`,
    );

    // Create sample users - only create if they don't exist
    const existingUsers = await db.select().from(users).where(eq(users.organizationId, org.id));
    
    console.log(`Found ${existingUsers.length} existing users - preserving credentials (database-driven authentication)`);
    
    let createdUsers = existingUsers;
    
    // Only create default users if no users exist
    if (existingUsers.length === 0) {
      const hashedAdminPassword = await authService.hashPassword("467fe887");
      const hashedDoctorPassword = await authService.hashPassword("doctor123");
      const hashedNursePassword = await authService.hashPassword("nurse123");
      const hashedPatientPassword = await authService.hashPassword("patient123");
      const hashedLabTechPassword = await authService.hashPassword("lab123");
      const hashedSampleTakerPassword = await authService.hashPassword("sample123");
      const hashedPharmacistPassword = await authService.hashPassword("pharma123");
      
      const sampleUsers = [
        {
          organizationId: org.id,
          email: "james@curaemr.ai",
          username: "james",
          passwordHash: hashedAdminPassword,
          firstName: "James",
          lastName: "Administrator",
          role: "admin",
          department: "Administration",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "09:00", end: "17:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "paul@curaemr.ai",
          username: "paul",
          passwordHash: hashedDoctorPassword,
          firstName: "Paul",
          lastName: "Smith",
          role: "doctor",
          department: "Cardiology",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "08:00", end: "17:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "nurse@curaemr.ai",
          username: "nurse",
          passwordHash: hashedNursePassword,
          firstName: "Emma",
          lastName: "Johnson",
          role: "nurse",
          department: "General Medicine",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          workingHours: { start: "07:00", end: "19:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "john@curaemr.ai",
          username: "john",
          passwordHash: hashedPatientPassword,
          firstName: "John",
          lastName: "Patient",
          role: "patient",
          department: null,
          isActive: true
        },
        {
          organizationId: org.id,
          email: "amelia@curaemr.ai",
          username: "amelia",
          passwordHash: hashedLabTechPassword,
          firstName: "Amelia",
          lastName: "Rodriguez",
          role: "lab_technician",
          department: "Laboratory",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "06:00", end: "14:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "sampletaker@curaemr.ai",
          username: "sampletaker",
          passwordHash: hashedSampleTakerPassword,
          firstName: "James",
          lastName: "Wilson",
          role: "sample_taker",
          department: "Laboratory",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "06:00", end: "14:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "pharmacist@cura.com",
          username: "pharmacist",
          passwordHash: hashedPharmacistPassword,
          firstName: "Sarah",
          lastName: "Thompson",
          role: "pharmacist",
          department: "Pharmacy",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          workingHours: { start: "08:00", end: "18:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "doctor2@cura.com",
          username: "doctor2",
          passwordHash: hashedDoctorPassword,
          firstName: "Michael",
          lastName: "Johnson",
          role: "doctor",
          department: "Neurology",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "09:00", end: "18:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "doctor3@cura.com",
          username: "doctor3",
          passwordHash: hashedDoctorPassword,
          firstName: "David",
          lastName: "Wilson",
          role: "doctor",
          department: "Orthopedics",
          workingDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          workingHours: { start: "08:30", end: "16:30" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "doctor4@cura.com",
          username: "doctor4",
          passwordHash: hashedDoctorPassword,
          firstName: "Lisa",
          lastName: "Anderson",
          role: "doctor",
          department: "Pediatrics",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "08:00", end: "16:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "doctor5@cura.com",
          username: "doctor5",
          passwordHash: hashedDoctorPassword,
          firstName: "Robert",
          lastName: "Brown",
          role: "doctor",
          department: "Dermatology",
          workingDays: ["Monday", "Wednesday", "Friday"],
          workingHours: { start: "10:00", end: "18:00" },
          isActive: true
        },
        {
          organizationId: org.id,
          email: "receptionist@cura.com",
          username: "receptionist",
          passwordHash: hashedAdminPassword,
          firstName: "Jane",
          lastName: "Thompson",
          role: "receptionist",
          department: "Front Desk",
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "08:00", end: "17:00" },
          isActive: true
        }
      ];

      createdUsers = await db.insert(users).values(sampleUsers).returning();
      console.log(`Created ${sampleUsers.length} initial users`);
    } else {
      console.log(`Preserving existing ${existingUsers.length} users including any manually created ones`);
    }

    // Create patient user accounts (role: patient) if they don't exist
    const existingPatientUsers = await db.select().from(users).where(
      and(eq(users.organizationId, org.id), eq(users.role, "patient"))
    );
    
    let patientUsers = existingPatientUsers;
    
    if (existingPatientUsers.length === 0) {
      const patientPassword = await bcrypt.hash("patient123", 12);
      const samplePatientUsers = [
        {
          organizationId: org.id,
          email: "john.patient@email.com",
          username: "john.patient",
          passwordHash: patientPassword,
          firstName: "John",
          lastName: "Patient",
          role: "patient",
          department: "Patient",
          workingDays: [],
          workingHours: {},
          isActive: true
        },
        {
          organizationId: org.id,
          email: "alice.williams@email.com",
          username: "alice.williams",
          passwordHash: patientPassword,
          firstName: "Alice",
          lastName: "Williams",
          role: "patient",
          department: "Patient",
          workingDays: [],
          workingHours: {},
          isActive: true
        },
        {
          organizationId: org.id,
          email: "robert.davis@email.com",
          username: "robert.davis",
          passwordHash: patientPassword,
          firstName: "Robert",
          lastName: "Davis",
          role: "patient",
          department: "Patient",
          workingDays: [],
          workingHours: {},
          isActive: true
        }
      ];
      
      patientUsers = await db.insert(users).values(samplePatientUsers).returning();
      console.log(`Created ${patientUsers.length} patient user accounts`);
    } else {
      console.log(`Using existing ${existingPatientUsers.length} patient users`);
    }

    // Create sample patients only if they don't exist
    const existingPatients = await db.select().from(patients).where(eq(patients.organizationId, org.id));
    
    let createdPatients = existingPatients;
    
    if (existingPatients.length === 0) {
      // Find the patient user IDs
      const johnUser = patientUsers.find(u => u.email === "john.patient@email.com");
      const aliceUser = patientUsers.find(u => u.email === "alice.williams@email.com");
      const robertUser = patientUsers.find(u => u.email === "robert.davis@email.com");
      
      const samplePatients = [
        {
          organizationId: org.id,
          userId: johnUser?.id,
          patientId: "P001",
          firstName: "John",
          lastName: "Patient",
          dateOfBirth: new Date("1990-06-15"),
          email: "john.patient@email.com",
          phone: "+44 7700 900120",
          nhsNumber: "111 222 3333",
          address: {
            street: "10 Healthcare Lane",
            city: "London",
            state: "Greater London",
            postcode: "EC1A 1BB",
            country: "UK"
          },
          emergencyContact: {
            name: "Jane Patient",
            relationship: "Spouse",
            phone: "+44 7700 900121"
          },
          medicalHistory: {
            allergies: ["Aspirin"],
            chronicConditions: ["Asthma"],
            medications: ["Salbutamol inhaler"]
          },
          riskLevel: "low",
          isActive: true
        },
        {
          organizationId: org.id,
          userId: aliceUser?.id,
          patientId: "P002",
          firstName: "Alice",
          lastName: "Williams",
          dateOfBirth: new Date("1985-03-15"),
          email: "alice.williams@email.com",
          phone: "+44 7700 900123",
          nhsNumber: "123 456 7890",
          address: {
            street: "123 Main Street",
            city: "London",
            state: "Greater London",
            postcode: "SW1A 1AA",
            country: "UK"
          },
          emergencyContact: {
            name: "Bob Williams",
            relationship: "Spouse",
            phone: "+44 7700 900124"
          },
          medicalHistory: {
            allergies: ["Penicillin", "Nuts"],
            chronicConditions: ["Hypertension"],
            medications: ["Lisinopril 10mg"]
          },
          riskLevel: "medium",
          isActive: true
        },
        {
          organizationId: org.id,
          userId: robertUser?.id,
          patientId: "P003",
          firstName: "Robert",
          lastName: "Davis",
          dateOfBirth: new Date("1970-07-22"),
          email: "robert.davis@email.com",
          phone: "+44 7700 900125",
          nhsNumber: "234 567 8901",
          address: {
            street: "456 Oak Avenue",
            city: "Manchester",
            state: "Greater Manchester",
            postcode: "M1 1AA",
            country: "UK"
          },
          emergencyContact: {
            name: "Susan Davis",
            relationship: "Spouse",
            phone: "+44 7700 900126"
          },
          medicalHistory: {
            allergies: ["Shellfish"],
            chronicConditions: ["Diabetes Type 2", "High Cholesterol"],
            medications: ["Metformin 500mg", "Simvastatin 20mg"]
          },
          riskLevel: "high",
          isActive: true
        }
      ];

      const encryptedSamplePatients = await Promise.all(
        samplePatients.map(async (row) => {
          const insertData = await preparePatientForStorage(row as Record<string, unknown>);
          assertEncryptedPatientInsertRow(insertData);
          return insertData;
        }),
      );
      createdPatients = await db.insert(patients).values(encryptedSamplePatients as any).returning();
      console.log(`Created ${createdPatients.length} encrypted patients linked to user accounts`);
    } else {
      console.log(`Using existing ${existingPatients.length} patients`);
      
      // Link existing patients to user accounts if not already linked
      for (const rawExisting of existingPatients) {
        const existingPatient = await storage.normalizePatientFromRow(rawExisting);
        if (!existingPatient) continue;
        if (!rawExisting.userId && existingPatient.email) {
          // Find or create a patient user for this patient
          const existingPatientUser = patientUsers.find(u => u.email === existingPatient.email);
          if (existingPatientUser) {
            // Link the patient to the existing user
            await db.update(patients)
              .set({ userId: existingPatientUser.id })
              .where(eq(patients.id, rawExisting.id));
            console.log(`Linked patient ${existingPatient.firstName} ${existingPatient.lastName} to user account`);
          } else {
            // Check if a user with this email already exists
            const [existingUserWithEmail] = await db.select().from(users).where(eq(users.email, existingPatient.email)).limit(1);
            
            if (existingUserWithEmail) {
              // Link to existing user
              await db.update(patients)
                .set({ userId: existingUserWithEmail.id })
                .where(eq(patients.id, rawExisting.id));
              console.log(`Linked patient ${existingPatient.firstName} ${existingPatient.lastName} to existing user account`);
            } else {
              // Create a new patient user and link
              try {
                const patientPassword = await bcrypt.hash("patient123", 12);
                const [newPatientUser] = await db.insert(users).values({
                  organizationId: org.id,
                  email: existingPatient.email,
                  username: existingPatient.email.split('@')[0],
                  passwordHash: patientPassword,
                  firstName: existingPatient.firstName,
                  lastName: existingPatient.lastName,
                  role: "patient",
                  department: "Patient",
                  workingDays: [],
                  workingHours: {},
                  isActive: true
                }).returning();
                
                await db.update(patients)
                  .set({ userId: newPatientUser.id })
                  .where(eq(patients.id, rawExisting.id));
                console.log(`Created user account and linked patient ${existingPatient.firstName} ${existingPatient.lastName}`);
              } catch (error: any) {
                console.log(`Could not create user for patient ${existingPatient.firstName} ${existingPatient.lastName}: ${error.message}`);
              }
            }
          }
        }
      }
    }

    // Skip appointment seeding - system is now fully database-driven
    console.log(`[SEED] Appointments are now database-driven - no seed data created`);

    // Create sample medical records
    const sampleRecords = [
      {
        organizationId: org.id,
        patientId: createdPatients[0].id,
        providerId: createdUsers[1].id,
        type: "consultation",
        title: "Initial Cardiac Assessment",
        notes: "Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.",
        diagnosis: "Essential Hypertension (I10)",
        treatment: "Continue current medication, dietary consultation recommended",
        prescription: {
          medications: [
            {
              name: "Lisinopril",
              dosage: "10mg",
              frequency: "Once daily",
              duration: "30 days"
            }
          ]
        },
        attachments: [],
        aiSuggestions: {
          riskAssessment: "Moderate cardiovascular risk",
          recommendations: ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"],
          drugInteractions: []
        }
      }
    ];

    await db.insert(medicalRecords).values(sampleRecords);
    console.log("Created sample medical records");

    // Create sample notifications - only if none exist
    const existingNotifications = await db.select().from(notifications).where(eq(notifications.organizationId, org.id)).limit(1);
    
    if (existingNotifications.length === 0) {
      const sampleNotifications = [
      {
        organizationId: org.id,
        userId: createdUsers[1].id, // Dr. Smith
        title: "Lab Results Available",
        message: "Blood work results for Sarah Johnson are now available for review.",
        type: "lab_result",
        priority: "normal" as const,
        status: "unread" as const,
        isActionable: true,
        actionUrl: "/patients/1/lab-results",
        relatedEntityType: "patient",
        relatedEntityId: createdPatients[0].id,
        metadata: {
          patientId: createdPatients[0].id,
          patientName: "Sarah Johnson",
          urgency: "medium" as const,
          department: "Laboratory",
          icon: "Activity",
          color: "blue"
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[1].id, // Dr. Smith
        title: "Appointment Reminder",
        message: "Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.",
        type: "appointment_reminder",
        priority: "high" as const,
        status: "unread" as const,
        isActionable: true,
        actionUrl: "/calendar",
        relatedEntityType: "appointment",
        relatedEntityId: 912, // Use existing appointment ID
        metadata: {
          patientId: createdPatients[0].id,
          patientName: "Sarah Johnson",
          appointmentId: 912, // Use existing appointment ID
          urgency: "high" as const,
          department: "Cardiology",
          icon: "Calendar",
          color: "orange"
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[0].id, // Admin
        title: "Critical Drug Interaction Alert",
        message: "Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.",
        type: "prescription_alert",
        priority: "critical" as const,
        status: "unread" as const,
        isActionable: true,
        actionUrl: "/patients/2/prescriptions",
        relatedEntityType: "patient",
        relatedEntityId: createdPatients[1].id,
        metadata: {
          patientId: createdPatients[1].id,
          patientName: "Robert Davis",
          urgency: "critical" as const,
          department: "Pharmacy",
          icon: "AlertTriangle",
          color: "red",
          requiresResponse: true
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[2].id, // Nurse Williams
        title: "Patient Message",
        message: "Sarah Johnson has sent a message regarding her medication side effects.",
        type: "message",
        priority: "normal" as const,
        status: "read" as const,
        isActionable: true,
        actionUrl: "/messaging/conversations/1",
        relatedEntityType: "patient",
        relatedEntityId: createdPatients[0].id,
        readAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Read 2 hours ago
        metadata: {
          patientId: createdPatients[0].id,
          patientName: "Sarah Johnson",
          urgency: "medium" as const,
          department: "General",
          icon: "MessageSquare",
          color: "green"
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[1].id, // Dr. Smith
        title: "System Maintenance Alert",
        message: "Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.",
        type: "system_alert",
        priority: "low" as const,
        status: "unread" as const,
        isActionable: false,
        metadata: {
          urgency: "low" as const,
          department: "IT",
          icon: "Settings",
          color: "gray",
          autoMarkAsRead: true
        }
      }
      ];

      await db.insert(notifications).values(sampleNotifications);
      console.log(`Created ${sampleNotifications.length} sample notifications`);
    } else {
      console.log(`Notifications already exist for organization ${org.id}, skipping notification seed`);
    }

    // Create sample prescriptions - only if none exist
    const existingPrescriptions = await db.select().from(prescriptions).where(eq(prescriptions.organizationId, org.id));
    
    if (existingPrescriptions.length === 0) {
      const samplePrescriptions = [
        {
          organizationId: org.id,
          patientId: createdPatients[0].id, // Sarah Johnson
          doctorId: createdUsers[1].id, // Dr. Smith
          prescriptionNumber: `RX-${Date.now()}-001`,
          status: "active" as const,
          diagnosis: "Hypertension",
          // Legacy columns (for backward compatibility)
          medicationName: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          duration: "30 days",
          instructions: "Take with or without food. Monitor blood pressure.",
          // Modern JSONB columns
          medications: [
            {
              name: "Lisinopril",
              dosage: "10mg",
              frequency: "Once daily",
              duration: "30 days",
              quantity: 30,
              refills: 5,
              instructions: "Take with or without food. Monitor blood pressure.",
              genericAllowed: true
            }
          ],
          pharmacy: {
            name: "City Pharmacy",
            address: "123 Main St, London",
            phone: "+44 20 7946 0958"
          },
          notes: "Patient tolerates ACE inhibitors well"
        },
        {
          organizationId: org.id,
          patientId: createdPatients[1].id, // Robert Davis
          doctorId: createdUsers[1].id, // Dr. Smith
          prescriptionNumber: `RX-${Date.now()}-002`,
          status: "active" as const,
          diagnosis: "Type 2 Diabetes",
          // Legacy columns (for backward compatibility)
          medicationName: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily with meals",
          duration: "90 days",
          instructions: "Take with breakfast and dinner",
          // Modern JSONB columns
          medications: [
            {
              name: "Metformin",
              dosage: "500mg",
              frequency: "Twice daily with meals",
              duration: "90 days",
              quantity: 180,
              refills: 3,
              instructions: "Take with breakfast and dinner",
              genericAllowed: true
            }
          ],
          pharmacy: {
            name: "Local Pharmacy",
            address: "456 High St, London",
            phone: "+44 20 7946 0959"
          },
          notes: "Monitor blood glucose levels"
        }
      ];

      const createdPrescriptions = await db.insert(prescriptions).values(samplePrescriptions).returning();
      console.log(`Created ${createdPrescriptions.length} sample prescriptions`);
    } else {
      console.log(`Prescriptions already exist for organization ${org.id}, skipping prescription seed`);
    }

    // Create sample AI insights
    const sampleAiInsights = [
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        type: "risk_alert",
        title: "Cardiovascular Risk Assessment",
        description: "Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.",
        severity: "medium" as const,
        actionRequired: true,
        confidence: "0.85",
        metadata: {
          relatedConditions: ["Hypertension", "Family History CVD"],
          suggestedActions: ["Diet consultation", "Exercise program", "Medication review"],
          references: ["AHA Guidelines 2023", "ESC Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[1].id, // Robert Davis
        type: "drug_interaction",
        title: "Potential Drug Interaction Alert",
        description: "Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.",
        severity: "high" as const,
        actionRequired: true,
        confidence: "0.92",
        metadata: {
          relatedConditions: ["Type 2 Diabetes", "Drug Interaction"],
          suggestedActions: ["Monitor blood glucose", "Review medication timing", "Patient education"],
          references: ["Drug Interaction Database", "FDA Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        type: "treatment_suggestion",
        title: "Hypertension Management Optimization",
        description: "Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.",
        severity: "low" as const,
        actionRequired: false,
        confidence: "0.78",
        metadata: {
          relatedConditions: ["Hypertension", "ACE Inhibitor Therapy"],
          suggestedActions: ["DASH diet counseling", "Regular exercise program", "Weight management"],
          references: ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[1].id, // Robert Davis
        type: "preventive_care",
        title: "Diabetic Screening Recommendations",
        description: "Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.",
        severity: "medium" as const,
        actionRequired: true,
        confidence: "0.95",
        metadata: {
          relatedConditions: ["Type 2 Diabetes", "Preventive Care"],
          suggestedActions: ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"],
          references: ["ADA Standards of Care", "Diabetic Complications Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        type: "risk_alert",
        title: "Medication Adherence Concern",
        description: "AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.",
        severity: "medium" as const,
        actionRequired: true,
        confidence: "0.73",
        metadata: {
          relatedConditions: ["Medication Adherence", "Hypertension"],
          suggestedActions: ["Adherence counseling", "Pill organizer", "Follow-up call"],
          references: ["Medication Adherence Guidelines", "Patient Education Resources"]
        },
        status: "active" as const
      }
    ];

    const createdAiInsights = await db.insert(aiInsights).values(sampleAiInsights).returning();
    console.log(`Created ${createdAiInsights.length} sample AI insights`);

    // Create sample subscription if it doesn't exist
    const existingSubscription = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, org.id));
    
    if (existingSubscription.length === 0) {
      const sampleSubscription = {
        organizationId: org.id,
        planName: "Professional Plan",
        plan: "professional",
        status: "active",
        currentUsers: 3,
        userLimit: 25,
        monthlyPrice: "79.00",
        nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        trialEndsAt: null,
        features: {
          aiInsights: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: false
        }
      };

      const createdSubscription = await db.insert(subscriptions).values([sampleSubscription]).returning();
      console.log(`Created subscription for organization: ${createdSubscription[0].plan}`);
    } else {
      console.log("Subscription already exists for this organization");
    }

    // Seed lab results data
    await storage.seedLabResults(org.id);
    console.log("Created sample lab results");

    // Ensure all default system roles exist for every organization (insert missing only)
    const roleSeedSummary = await ensureSystemRolesForAllOrganizations();
    console.log(
      `System roles: ${roleSeedSummary.created} created, ${roleSeedSummary.existing} already present (${roleSeedSummary.expectedPerOrg} roles per org, ${roleSeedSummary.organizations} orgs)`,
    );

    // CRITICAL: Ensure SaaS admin user exists for administration portal
    console.log("🔐 Creating/updating SaaS admin user for administration portal...");
    
    try {
      const existingSaaSUser = await storage.getUserByUsername('saas_admin', 0);
      const hashedSaaSPassword = await authService.hashPassword('admin123');
      
      if (!existingSaaSUser) {
        const saasUser = await storage.createUser({
          username: 'saas_admin',
          email: 'saas_admin@curaemr.ai',
          passwordHash: hashedSaaSPassword,
          firstName: 'SaaS',
          lastName: 'Administrator',
          organizationId: 0, // System-wide SaaS owner
          role: 'admin',
          isActive: true,
          isSaaSOwner: true
        });
        console.log(`✅ Created SaaS admin user with ID: ${saasUser.id}`);
      } else {
        // Update existing SaaS user to ensure proper credentials
        await storage.updateUser(existingSaaSUser.id, 0, {
          passwordHash: hashedSaaSPassword,
          isActive: true,
          isSaaSOwner: true
        });
        console.log(`✅ Updated existing SaaS admin user with ID: ${existingSaaSUser.id}`);
      }
    } catch (saasError) {
      console.error('❌ Failed to create/update SaaS admin user:', saasError);
      // Don't fail the entire seeding - SaaS admin can be created via emergency endpoint
    }

    // Create SaaS subscriptions for organizations without subscriptions
    console.log("💳 Creating SaaS subscriptions for organizations...");
    
    try {
      // Get all organizations (excluding system org with id 0)
      const allOrgs = await db.select({
        id: organizations.id,
        name: organizations.name
      }).from(organizations).where(eq(organizations.id, org.id));

      if (allOrgs.length > 0) {
        const orgIds = allOrgs.map(o => o.id);
        
        // Check which organizations already have subscriptions
        const existingSubscriptions = await db.select({
          organizationId: saasSubscriptions.organizationId
        }).from(saasSubscriptions).where(inArray(saasSubscriptions.organizationId, orgIds));
        
        const existingOrgIds = new Set(existingSubscriptions.map(s => s.organizationId));
        const orgsWithoutSubscriptions = allOrgs.filter(o => !existingOrgIds.has(o.id));

        if (orgsWithoutSubscriptions.length > 0) {
          // Get the default package (gold plan)
          const [defaultPackage] = await db.select({
            id: saasPackages.id
          }).from(saasPackages).where(eq(saasPackages.id, 1));

          if (defaultPackage) {
            const now = new Date();
            const oneMonthLater = new Date(now);
            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

            const subscriptionsToCreate = orgsWithoutSubscriptions.map(o => ({
              organizationId: o.id,
              packageId: defaultPackage.id,
              status: "active",
              paymentStatus: "paid",
              currentPeriodStart: now,
              currentPeriodEnd: oneMonthLater,
              cancelAtPeriodEnd: false,
              maxUsers: 50,
              maxPatients: 1000,
              details: "Initial subscription created during seeding",
              expiresAt: oneMonthLater,
              metadata: {
                paymentProvider: "stripe",
                lastPaymentDate: now.toISOString(),
                nextPaymentDate: oneMonthLater.toISOString()
              }
            }));

            await db.insert(saasSubscriptions).values(subscriptionsToCreate);
            console.log(`✅ Created ${subscriptionsToCreate.length} SaaS subscriptions for organizations: ${orgsWithoutSubscriptions.map(o => o.name).join(', ')}`);
          } else {
            console.log("⚠️ No default package found - skipping subscription creation");
          }
        } else {
          console.log("✅ All organizations already have subscriptions");
        }
      }
    } catch (subscriptionError) {
      console.error('❌ Failed to create SaaS subscriptions:', subscriptionError);
      // Don't fail the entire seeding - subscriptions can be created manually
    }

    console.log("🎉 Database seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}