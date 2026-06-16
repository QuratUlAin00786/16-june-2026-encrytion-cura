-- Analytics Queries for Organization ID 20
-- Run these queries directly in your database to get results for each graph

-- ============================================================================
-- 1. TREATMENT POPULARITY (All Statuses)
-- ============================================================================
SELECT 
  COALESCE(ti.name, t.name, 'Unknown Treatment') as name,
  COUNT(a.id)::integer as total_sessions
FROM appointments a
LEFT JOIN treatments t ON t.id = a.treatment_id
LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
GROUP BY COALESCE(ti.name, t.name, 'Unknown Treatment')
HAVING COUNT(a.id) > 0
ORDER BY total_sessions DESC
LIMIT 20;

-- ============================================================================
-- 2. TREATMENT POPULARITY (Completed Only)
-- ============================================================================
SELECT 
  COALESCE(ti.name, t.name, 'Unknown Treatment') as name,
  COUNT(a.id)::integer as total_sessions
FROM appointments a
LEFT JOIN treatments t ON t.id = a.treatment_id
LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
WHERE a.organization_id = 20
  AND LOWER(TRIM(a.status)) = 'completed'
  AND a.treatment_id IS NOT NULL
GROUP BY COALESCE(ti.name, t.name, 'Unknown Treatment')
HAVING COUNT(a.id) > 0
ORDER BY total_sessions DESC
LIMIT 20;

-- ============================================================================
-- 3. MONTHLY TRENDS (All Statuses)
-- ============================================================================
SELECT 
  TO_CHAR(a.scheduled_at, 'YYYY-MM') as month,
  COUNT(*)::integer as total_sessions
FROM appointments a
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
GROUP BY TO_CHAR(a.scheduled_at, 'YYYY-MM')
ORDER BY month;

-- ============================================================================
-- 4. REVENUE PER TREATMENT (All Statuses)
-- ============================================================================
SELECT 
  COALESCE(ti.name, t.name, 'Unknown Treatment') as name,
  COALESCE(SUM(i.total_amount), 0)::numeric as revenue
FROM appointments a
LEFT JOIN treatments t ON t.id = a.treatment_id
LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
GROUP BY COALESCE(ti.name, t.name, 'Unknown Treatment')
ORDER BY revenue DESC
LIMIT 20;

-- ============================================================================
-- 5. CATEGORY DISTRIBUTION (All Statuses)
-- ============================================================================
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
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
GROUP BY category_name
ORDER BY total DESC;

-- ============================================================================
-- 6. DAILY ANALYTICS (Last 30 Days, All Statuses)
-- ============================================================================
SELECT 
  DATE(a.scheduled_at) as date,
  COUNT(a.id)::integer as total_treatments,
  COUNT(DISTINCT a.patient_id)::integer as total_patients,
  COUNT(DISTINCT a.provider_id)::integer as total_practitioners,
  COALESCE(SUM(i.total_amount), 0)::numeric as revenue
FROM appointments a
LEFT JOIN treatments t ON t.id = a.treatment_id
LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
  AND a.scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(a.scheduled_at)
ORDER BY date DESC;

-- ============================================================================
-- 7. MONTHLY ANALYTICS (Last 12 Months, All Statuses)
-- ============================================================================
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
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
  AND a.scheduled_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
GROUP BY TO_CHAR(a.scheduled_at, 'YYYY-MM'), TO_CHAR(a.scheduled_at, 'Mon YYYY')
ORDER BY month DESC;

-- ============================================================================
-- 8. YEARLY ANALYTICS (Last 5 Years, All Statuses)
-- ============================================================================
SELECT 
  TO_CHAR(a.scheduled_at, 'YYYY') as year,
  COUNT(a.id)::integer as total_treatments,
  COUNT(DISTINCT a.patient_id)::integer as total_patients,
  COUNT(DISTINCT a.provider_id)::integer as total_practitioners,
  COALESCE(SUM(i.total_amount), 0)::numeric as revenue
FROM appointments a
LEFT JOIN treatments t ON t.id = a.treatment_id
LEFT JOIN invoices i ON i.appointment_id = a.id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
  AND a.scheduled_at >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '5 years'
GROUP BY TO_CHAR(a.scheduled_at, 'YYYY')
ORDER BY year DESC;

-- ============================================================================
-- 9. TREATMENT SUMMARY
-- ============================================================================
SELECT 
  COUNT(DISTINCT a.patient_id)::integer as total_patients,
  COUNT(a.id)::integer as total_treatments,
  COALESCE(SUM(i.total_amount), 0)::numeric as revenue_this_month,
  (
    SELECT COALESCE(ti2.name, t2.name, 'Unknown')
    FROM appointments a2
    LEFT JOIN treatments t2 ON t2.id = a2.treatment_id
    LEFT JOIN treatments_info ti2 ON ti2.id = a2.treatment_id
    WHERE a2.organization_id = 20
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
WHERE a.organization_id = 20
  AND TRIM(LOWER(a.status)) = 'completed'
  AND a.treatment_id IS NOT NULL;

-- ============================================================================
-- 10. STATUS BREAKDOWN
-- ============================================================================
SELECT 
  LOWER(TRIM(a.status)) as status,
  COUNT(a.id)::integer as count
FROM appointments a
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
GROUP BY LOWER(TRIM(a.status))
ORDER BY count DESC;

-- ============================================================================
-- 11. TREATMENT SESSIONS (Sample - First 10)
-- ============================================================================
SELECT 
  a.id,
  a.patient_id,
  a.treatment_id,
  a.provider_id,
  a.scheduled_at as session_date,
  LOWER(TRIM(a.status)) as status,
  COALESCE(ti.name, t.name, 'Unknown Treatment') as treatment_name
--  COALESCE(i.total_amount, 0) as price
FROM curauser24nov25.appointments a
LEFT JOIN treatments t ON t.id = a.treatment_id
LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
LEFT JOIN invoices i ON i.service_id = a.appointment_id AND LOWER(TRIM(i.status)) IN ('paid', 'completed')
WHERE a.organization_id = 20
  AND a.treatment_id IS NOT NULL
ORDER BY a.scheduled_at DESC
LIMIT 10;
