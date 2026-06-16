import { pool } from './server/db';
import { sql } from 'drizzle-orm';

const organizationId = 20;

async function testAnalytics() {
  console.log(`\n🔍 Testing Analytics for Organization ID: ${organizationId}\n`);
  console.log('='.repeat(80));

  try {
    // 1. Treatment Popularity
    console.log('\n📊 1. TREATMENT POPULARITY (All Statuses)');
    console.log('-'.repeat(80));
    const popularityResult = await pool.query(sql`
      SELECT 
        COALESCE(ti.name, t.name, 'Unknown Treatment') as name,
        COUNT(a.id)::integer as total_sessions
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
      GROUP BY COALESCE(ti.name, t.name, 'Unknown Treatment')
      HAVING COUNT(a.id) > 0
      ORDER BY total_sessions DESC
      LIMIT 20
    `);
    console.log(`Found ${popularityResult.rows.length} treatments:`);
    popularityResult.rows.forEach((row: any, idx: number) => {
      console.log(`  ${idx + 1}. ${row.name}: ${row.total_sessions} sessions`);
    });

    // 2. Treatment Popularity (Completed Only)
    console.log('\n📊 1b. TREATMENT POPULARITY (Completed Only)');
    console.log('-'.repeat(80));
    const popularityCompletedResult = await pool.query(sql`
      SELECT 
        COALESCE(ti.name, t.name, 'Unknown Treatment') as name,
        COUNT(a.id)::integer as total_sessions
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
      WHERE a.organization_id = ${organizationId}
        AND LOWER(TRIM(a.status)) = 'completed'
        AND a.treatment_id IS NOT NULL
      GROUP BY COALESCE(ti.name, t.name, 'Unknown Treatment')
      HAVING COUNT(a.id) > 0
      ORDER BY total_sessions DESC
      LIMIT 20
    `);
    console.log(`Found ${popularityCompletedResult.rows.length} treatments:`);
    popularityCompletedResult.rows.forEach((row: any, idx: number) => {
      console.log(`  ${idx + 1}. ${row.name}: ${row.total_sessions} sessions`);
    });

    // 3. Monthly Trends
    console.log('\n📊 2. MONTHLY TRENDS (All Statuses)');
    console.log('-'.repeat(80));
    const monthlyTrendsResult = await pool.query(sql`
      SELECT 
        TO_CHAR(a.scheduled_at, 'YYYY-MM') as month,
        COUNT(*)::integer as total_sessions
      FROM appointments a
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
      GROUP BY TO_CHAR(a.scheduled_at, 'YYYY-MM')
      ORDER BY month
    `);
    console.log(`Found ${monthlyTrendsResult.rows.length} months:`);
    monthlyTrendsResult.rows.forEach((row: any) => {
      console.log(`  ${row.month}: ${row.total_sessions} sessions`);
    });

    // 4. Revenue Per Treatment
    console.log('\n📊 3. REVENUE PER TREATMENT (All Statuses)');
    console.log('-'.repeat(80));
    const revenueResult = await pool.query(sql`
      SELECT 
        COALESCE(ti.name, t.name, 'Unknown Treatment') as name,
        COALESCE(SUM(i.total_amount), 0)::numeric as revenue
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
      LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
      GROUP BY COALESCE(ti.name, t.name, 'Unknown Treatment')
      ORDER BY revenue DESC
      LIMIT 20
    `);
    console.log(`Found ${revenueResult.rows.length} treatments:`);
    revenueResult.rows.forEach((row: any, idx: number) => {
      console.log(`  ${idx + 1}. ${row.name}: £${parseFloat(row.revenue || 0).toFixed(2)}`);
    });

    // 5. Category Distribution
    console.log('\n📊 4. CATEGORY DISTRIBUTION (All Statuses)');
    console.log('-'.repeat(80));
    const categoryResult = await pool.query(sql`
      SELECT 
        CASE 
          WHEN LOWER(COALESCE(ti.name, t.name, '')) LIKE '%iv%' OR LOWER(COALESCE(ti.name, t.name, '')) LIKE '%therapy%' THEN 'IV Therapy'
          WHEN LOWER(COALESCE(ti.name, t.name, '')) LIKE '%prp%' THEN 'PRP'
          WHEN LOWER(COALESCE(ti.name, t.name, '')) LIKE '%facial%' OR LOWER(COALESCE(ti.name, t.name, '')) LIKE '%hydro%' THEN 'Facial'
          WHEN LOWER(COALESCE(ti.name, t.name, '')) LIKE '%light%' THEN 'Light Therapy'
          WHEN LOWER(COALESCE(ti.name, t.name, '')) LIKE '%compression%' THEN 'Compression Therapy'
          WHEN LOWER(COALESCE(ti.name, t.name, '')) LIKE '%blood%' OR LOWER(COALESCE(ti.name, t.name, '')) LIKE '%test%' THEN 'Blood Testing'
          ELSE 'Other'
        END as category_name,
        COUNT(a.id)::integer as total
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
      GROUP BY category_name
      ORDER BY total DESC
    `);
    console.log(`Found ${categoryResult.rows.length} categories:`);
    categoryResult.rows.forEach((row: any, idx: number) => {
      console.log(`  ${idx + 1}. ${row.category_name}: ${row.total} treatments`);
    });

    // 6. Treatment Sessions (Sample)
    console.log('\n📊 5. TREATMENT SESSIONS (Sample - First 10)');
    console.log('-'.repeat(80));
    const sessionsResult = await pool.query(sql`
      SELECT 
        a.id,
        a.patient_id,
        a.treatment_id,
        a.provider_id,
        a.scheduled_at as session_date,
        LOWER(TRIM(a.status)) as status,
        COALESCE(ti.name, t.name, 'Unknown Treatment') as treatment_name,
        COALESCE(i.total_amount, 0) as price
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
      LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
      ORDER BY a.scheduled_at DESC
      LIMIT 10
    `);
    console.log(`Found ${sessionsResult.rows.length} sessions (showing first 10):`);
    sessionsResult.rows.forEach((row: any, idx: number) => {
      console.log(`  ${idx + 1}. ${row.treatment_name} - ${row.status} - ${row.session_date} - £${parseFloat(row.price || 0).toFixed(2)}`);
    });

    // 7. Daily Analytics (Last 30 days)
    console.log('\n📊 6. DAILY ANALYTICS (Last 30 Days, All Statuses)');
    console.log('-'.repeat(80));
    const dailyResult = await pool.query(sql`
      SELECT 
        DATE(a.scheduled_at) as date,
        COUNT(a.id)::integer as total_treatments,
        COUNT(DISTINCT a.patient_id)::integer as total_patients,
        COUNT(DISTINCT a.provider_id)::integer as total_practitioners,
        COALESCE(SUM(i.total_amount), 0)::numeric as revenue
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
        AND a.scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(a.scheduled_at)
      ORDER BY date DESC
    `);
    console.log(`Found ${dailyResult.rows.length} days:`);
    dailyResult.rows.slice(0, 10).forEach((row: any) => {
      console.log(`  ${row.date}: ${row.total_treatments} treatments, ${row.total_patients} patients, £${parseFloat(row.revenue || 0).toFixed(2)} revenue`);
    });
    if (dailyResult.rows.length > 10) {
      console.log(`  ... and ${dailyResult.rows.length - 10} more days`);
    }

    // 8. Monthly Analytics (Last 12 months)
    console.log('\n📊 7. MONTHLY ANALYTICS (Last 12 Months, All Statuses)');
    console.log('-'.repeat(80));
    const monthlyResult = await pool.query(sql`
      SELECT 
        TO_CHAR(a.scheduled_at, 'YYYY-MM') as month,
        TO_CHAR(a.scheduled_at, 'Mon YYYY') as month_label,
        COUNT(a.id)::integer as total_treatments,
        COUNT(DISTINCT a.patient_id)::integer as total_patients,
        COUNT(DISTINCT a.provider_id)::integer as total_practitioners,
        COALESCE(SUM(i.total_amount), 0)::numeric as revenue
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
        AND a.scheduled_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
      GROUP BY TO_CHAR(a.scheduled_at, 'YYYY-MM'), TO_CHAR(a.scheduled_at, 'Mon YYYY')
      ORDER BY month DESC
    `);
    console.log(`Found ${monthlyResult.rows.length} months:`);
    monthlyResult.rows.forEach((row: any) => {
      console.log(`  ${row.month_label}: ${row.total_treatments} treatments, ${row.total_patients} patients, £${parseFloat(row.revenue || 0).toFixed(2)} revenue`);
    });

    // 9. Yearly Analytics (Last 5 years)
    console.log('\n📊 8. YEARLY ANALYTICS (Last 5 Years, All Statuses)');
    console.log('-'.repeat(80));
    const yearlyResult = await pool.query(sql`
      SELECT 
        TO_CHAR(a.scheduled_at, 'YYYY') as year,
        COUNT(a.id)::integer as total_treatments,
        COUNT(DISTINCT a.patient_id)::integer as total_patients,
        COUNT(DISTINCT a.provider_id)::integer as total_practitioners,
        COALESCE(SUM(i.total_amount), 0)::numeric as revenue
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
        AND a.scheduled_at >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '5 years'
      GROUP BY TO_CHAR(a.scheduled_at, 'YYYY')
      ORDER BY year DESC
    `);
    console.log(`Found ${yearlyResult.rows.length} years:`);
    yearlyResult.rows.forEach((row: any) => {
      console.log(`  ${row.year}: ${row.total_treatments} treatments, ${row.total_patients} patients, £${parseFloat(row.revenue || 0).toFixed(2)} revenue`);
    });

    // 10. Treatment Summary
    console.log('\n📊 9. TREATMENT SUMMARY');
    console.log('-'.repeat(80));
    const summaryResult = await pool.query(sql`
      SELECT 
        COUNT(DISTINCT a.patient_id)::integer as total_patients,
        COUNT(a.id)::integer as total_treatments,
        COALESCE(SUM(i.total_amount), 0)::numeric as revenue_this_month,
        (
          SELECT COALESCE(ti2.name, t2.name, 'Unknown')
          FROM appointments a2
          LEFT JOIN treatments t2 ON t2.id = a2.treatment_id
          LEFT JOIN treatments_info ti2 ON ti2.id = a2.treatment_id
          WHERE a2.organization_id = ${organizationId}
            AND LOWER(TRIM(a2.status)) = 'completed'
            AND a2.treatment_id IS NOT NULL
          GROUP BY COALESCE(ti2.name, t2.name, 'Unknown')
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as most_popular_treatment
      FROM appointments a
      LEFT JOIN invoices i ON i.appointment_id = a.id 
        AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
        AND DATE_TRUNC('month', i.invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
      WHERE a.organization_id = ${organizationId}
        AND TRIM(LOWER(a.status)) = 'completed'
        AND a.treatment_id IS NOT NULL
    `);
    const summary = summaryResult.rows[0] || {};
    console.log(`  Total Patients: ${summary.total_patients || 0}`);
    console.log(`  Total Treatments: ${summary.total_treatments || 0}`);
    console.log(`  Revenue This Month: £${parseFloat(summary.revenue_this_month || 0).toFixed(2)}`);
    console.log(`  Most Popular Treatment: ${summary.most_popular_treatment || 'N/A'}`);

    // 11. Status Breakdown
    console.log('\n📊 10. STATUS BREAKDOWN');
    console.log('-'.repeat(80));
    const statusResult = await pool.query(sql`
      SELECT 
        LOWER(TRIM(a.status)) as status,
        COUNT(a.id)::integer as count
      FROM appointments a
      WHERE a.organization_id = ${organizationId}
        AND a.treatment_id IS NOT NULL
      GROUP BY LOWER(TRIM(a.status))
      ORDER BY count DESC
    `);
    console.log(`Status distribution:`);
    statusResult.rows.forEach((row: any) => {
      console.log(`  ${row.status || 'null'}: ${row.count} appointments`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analytics test completed!\n');

  } catch (error) {
    console.error('❌ Error running analytics test:', error);
  } finally {
    await pool.end();
  }
}

testAnalytics();
