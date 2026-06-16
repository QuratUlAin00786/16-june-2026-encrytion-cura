/**
 * Diagnostic script to check analytics subject setup
 * Run with: npx tsx diagnose-analytics-subject.ts
 * 
 * This script checks:
 * 1. If the subject exists
 * 2. If treatments are linked
 * 3. If appointments exist with those treatments
 * 4. What data would be returned by the analytics endpoint
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { analyticsSubjects, analyticsSubjectTreatments } from './server/schema';

async function diagnoseAnalyticsSubject(organizationId: number, subjectTitle: string) {
  console.log(`\n🔍 Diagnosing Analytics Subject: "${subjectTitle}" for organization ${organizationId}\n`);

  // Step 1: Check if subject exists
  console.log('Step 1: Checking if subject exists...');
  const subjectResult = await db.execute(sql`
    SELECT id, subject_title, organization_id, created_at
    FROM analytics_subjects
    WHERE organization_id = ${organizationId}
      AND subject_title = ${subjectTitle}
  `);
  
  if (subjectResult.rows.length === 0) {
    console.log('❌ Subject not found!');
    console.log('\nAvailable subjects:');
    const allSubjects = await db.execute(sql`
      SELECT id, subject_title, organization_id
      FROM analytics_subjects
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
      LIMIT 10
    `);
    allSubjects.rows.forEach((s: any) => {
      console.log(`  - ID: ${s.id}, Title: "${s.subject_title}"`);
    });
    return;
  }
  
  const subject = subjectResult.rows[0] as any;
  const subjectId = subject.id;
  console.log(`✅ Subject found: ID ${subjectId}, Created: ${subject.created_at}`);

  // Step 2: Check linked treatments
  console.log('\nStep 2: Checking linked treatments...');
  const treatmentsResult = await db.execute(sql`
    SELECT 
      ast.treatment_id,
      ti.name as treatment_name,
      ti.color_code
    FROM analytics_subject_treatments ast
    LEFT JOIN treatments_info ti ON ti.id = ast.treatment_id
    WHERE ast.subject_id = ${subjectId}
    ORDER BY ti.name
  `);
  
  if (treatmentsResult.rows.length === 0) {
    console.log('❌ No treatments linked to this subject!');
    return;
  }
  
  const treatmentIds = treatmentsResult.rows.map((r: any) => r.treatment_id);
  console.log(`✅ Found ${treatmentsResult.rows.length} linked treatments:`);
  treatmentsResult.rows.forEach((t: any) => {
    console.log(`  - ID: ${t.treatment_id}, Name: "${t.treatment_name || 'Unknown'}"`);
  });
  console.log(`Treatment IDs: [${treatmentIds.join(', ')}]`);

  // Step 3: Check appointments with these treatments
  console.log('\nStep 3: Checking appointments with these treatments...');
  const appointmentsResult = await db.execute(sql`
    SELECT 
      COUNT(*)::integer as total_count,
      COUNT(DISTINCT a.patient_id)::integer as unique_patients,
      COUNT(DISTINCT a.provider_id)::integer as unique_providers
    FROM appointments a
    WHERE a.organization_id = ${organizationId}
      AND a.treatment_id = ANY(${treatmentIds})
      AND a.treatment_id IS NOT NULL
  `);
  
  const apptStats = appointmentsResult.rows[0] as any;
  console.log(`Total appointments: ${apptStats.total_count}`);
  console.log(`Unique patients: ${apptStats.unique_patients}`);
  console.log(`Unique providers: ${apptStats.unique_providers}`);

  if (apptStats.total_count === 0) {
    console.log('\n⚠️  No appointments found! This is why no data is displayed.');
    console.log('\nTo fix this, create appointments with these treatment IDs:');
    treatmentIds.forEach(id => {
      console.log(`  - Treatment ID: ${id}`);
    });
    return;
  }

  // Step 4: Check appointments by status
  console.log('\nStep 4: Checking appointments by status...');
  const statusResult = await db.execute(sql`
    SELECT 
      LOWER(TRIM(a.status)) as status,
      COUNT(*)::integer as count
    FROM appointments a
    WHERE a.organization_id = ${organizationId}
      AND a.treatment_id = ANY(${treatmentIds})
      AND a.treatment_id IS NOT NULL
    GROUP BY LOWER(TRIM(a.status))
    ORDER BY count DESC
  `);
  
  console.log('Appointments by status:');
  statusResult.rows.forEach((s: any) => {
    console.log(`  - ${s.status}: ${s.count}`);
  });

  // Step 5: Check invoices/revenue
  console.log('\nStep 5: Checking revenue data...');
  const revenueResult = await db.execute(sql`
    SELECT 
      COALESCE(SUM(i.total_amount), 0)::numeric as total_revenue,
      COUNT(i.id)::integer as invoice_count
    FROM appointments a
    LEFT JOIN invoices i ON i.service_id = a.appointment_id::text
      AND (i.service_type IS NULL OR LOWER(TRIM(i.service_type)) = 'appointments')
      AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
    WHERE a.organization_id = ${organizationId}
      AND a.treatment_id = ANY(${treatmentIds})
      AND a.treatment_id IS NOT NULL
  `);
  
  const revenue = revenueResult.rows[0] as any;
  console.log(`Total revenue: £${parseFloat(revenue.total_revenue || '0').toFixed(2)}`);
  console.log(`Invoices linked: ${revenue.invoice_count}`);

  // Step 6: Simulate what the analytics endpoint would return
  console.log('\nStep 6: Simulating analytics endpoint response...');
  
  // All statuses
  const allStatusResult = await db.execute(sql`
    SELECT COUNT(*)::integer as total
    FROM appointments a
    WHERE a.organization_id = ${organizationId}
      AND a.treatment_id = ANY(${treatmentIds})
      AND a.treatment_id IS NOT NULL
  `);
  
  // Completed only
  const completedResult = await db.execute(sql`
    SELECT COUNT(*)::integer as total
    FROM appointments a
    WHERE a.organization_id = ${organizationId}
      AND LOWER(TRIM(a.status)) = 'completed'
      AND a.treatment_id = ANY(${treatmentIds})
      AND a.treatment_id IS NOT NULL
  `);
  
  console.log(`\n📊 Analytics Summary:`);
  console.log(`  Total treatments (all statuses): ${allStatusResult.rows[0]?.total || 0}`);
  console.log(`  Total treatments (completed only): ${completedResult.rows[0]?.total || 0}`);
  console.log(`  Total revenue: £${parseFloat(revenue.total_revenue || '0').toFixed(2)}`);
  console.log(`  Total patients: ${apptStats.unique_patients}`);
  
  console.log('\n✅ Diagnosis complete!');
  console.log('\n💡 Tips:');
  console.log('  - If "Total treatments" is 0, create appointments with these treatment IDs');
  console.log('  - If revenue is 0, create invoices linked to those appointments');
  console.log('  - Make sure appointment status matches the filter (default: "completed")');
}

// Run diagnosis
// Replace these values with your actual organization ID and subject title
const ORG_ID = 20; // Change this
const SUBJECT_TITLE = 'Halo Treatments'; // Change this

diagnoseAnalyticsSubject(ORG_ID, SUBJECT_TITLE)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
