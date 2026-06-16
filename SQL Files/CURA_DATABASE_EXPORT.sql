-- =====================================================
-- CURA EMR SYSTEM - COMPLETE DATABASE EXPORT
-- =====================================================
-- Database: PostgreSQL (Neon Serverless)
-- Generated: October 17, 2025
-- Total Tables: 71
-- Multi-Tenant Architecture with Organization Isolation
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP EXISTING TABLES (Cascade to handle dependencies)
-- =====================================================

DROP TABLE IF EXISTS chatbot_analytics CASCADE;
DROP TABLE IF EXISTS chatbot_messages CASCADE;
DROP TABLE IF EXISTS chatbot_sessions CASCADE;
DROP TABLE IF EXISTS chatbot_configs CASCADE;
DROP TABLE IF EXISTS financial_forecasts CASCADE;
DROP TABLE IF EXISTS forecast_models CASCADE;
DROP TABLE IF EXISTS gdpr_audit_trail CASCADE;
DROP TABLE IF EXISTS gdpr_data_requests CASCADE;
DROP TABLE IF EXISTS gdpr_consents CASCADE;
DROP TABLE IF EXISTS gdpr_processing_activities CASCADE;
DROP TABLE IF EXISTS patient_drug_interactions CASCADE;
DROP TABLE IF EXISTS symptom_checks CASCADE;
DROP TABLE IF EXISTS patient_communications CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS medical_images CASCADE;
DROP TABLE IF EXISTS clinical_photos CASCADE;
DROP TABLE IF EXISTS muscles_position CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS insurance_verifications CASCADE;
DROP TABLE IF EXISTS revenue_records CASCADE;
DROP TABLE IF EXISTS imaging_pricing CASCADE;
DROP TABLE IF EXISTS lab_test_pricing CASCADE;
DROP TABLE IF EXISTS doctors_fee CASCADE;
DROP TABLE IF EXISTS inventory_stock_movements CASCADE;
DROP TABLE IF EXISTS inventory_stock_alerts CASCADE;
DROP TABLE IF EXISTS inventory_sale_items CASCADE;
DROP TABLE IF EXISTS inventory_sales CASCADE;
DROP TABLE IF EXISTS inventory_purchase_order_items CASCADE;
DROP TABLE IF EXISTS inventory_purchase_orders CASCADE;
DROP TABLE IF EXISTS inventory_batches CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;
DROP TABLE IF EXISTS inventory_suppliers CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS voice_notes CASCADE;
DROP TABLE IF EXISTS letter_drafts CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS user_document_preferences CASCADE;
DROP TABLE IF EXISTS staff_shifts CASCADE;
DROP TABLE IF EXISTS doctor_default_shifts CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS medications_database CASCADE;
DROP TABLE IF EXISTS emergency_protocols CASCADE;
DROP TABLE IF EXISTS clinical_procedures CASCADE;
DROP TABLE IF EXISTS saas_invoices CASCADE;
DROP TABLE IF EXISTS saas_payments CASCADE;
DROP TABLE IF EXISTS saas_subscriptions CASCADE;
DROP TABLE IF EXISTS saas_packages CASCADE;
DROP TABLE IF EXISTS saas_settings CASCADE;
DROP TABLE IF EXISTS saas_owners CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS quickbooks_sync_logs CASCADE;
DROP TABLE IF EXISTS quickbooks_payment_mappings CASCADE;
DROP TABLE IF EXISTS quickbooks_invoice_mappings CASCADE;
DROP TABLE IF EXISTS quickbooks_item_mappings CASCADE;
DROP TABLE IF EXISTS quickbooks_customer_mappings CASCADE;
DROP TABLE IF EXISTS quickbooks_account_mappings CASCADE;
DROP TABLE IF EXISTS quickbooks_sync_configs CASCADE;
DROP TABLE IF EXISTS quickbooks_connections CASCADE;

-- =====================================================
-- SAAS PLATFORM TABLES
-- =====================================================

-- SaaS Owners (Platform Administrators)
CREATE TABLE saas_owners (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Packages (Subscription Tiers)
CREATE TABLE saas_packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_on_website BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Settings (Global System Settings)
CREATE TABLE saas_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CORE ORGANIZATION TABLES
-- =====================================================

-- Organizations (Multi-Tenant Customers)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain VARCHAR(50) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    region VARCHAR(10) NOT NULL DEFAULT 'UK',
    brand_name TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    features JSONB DEFAULT '{}'::jsonb,
    access_level VARCHAR(50) DEFAULT 'full',
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Subscriptions (Organization Subscriptions)
CREATE TABLE saas_subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Payments
CREATE TABLE saas_payments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    subscription_id INTEGER,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    payment_provider VARCHAR(50),
    provider_transaction_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Invoices
CREATE TABLE saas_invoices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    issue_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    paid_date TIMESTAMP,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    line_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions (Organization Subscription Management)
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    tier VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    price DECIMAL(10,2) NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    usage_limits JSONB DEFAULT '{}'::jsonb,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Users (System Users with RBAC)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'doctor',
    department TEXT,
    medical_specialty_category TEXT,
    sub_specialty TEXT,
    working_days JSONB DEFAULT '[]'::jsonb,
    working_hours JSONB DEFAULT '{}'::jsonb,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_saas_owner BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Roles (Custom Organizational Roles)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    permissions JSONB NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Document Preferences
CREATE TABLE user_document_preferences (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    clinic_info JSONB DEFAULT '{}'::jsonb,
    header_preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Staff Shifts
CREATE TABLE staff_shifts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    shift_type VARCHAR(20) NOT NULL DEFAULT 'regular',
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Doctor Default Shifts
CREATE TABLE doctor_default_shifts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time VARCHAR(5) NOT NULL DEFAULT '09:00',
    end_time VARCHAR(5) NOT NULL DEFAULT '17:00',
    working_days TEXT[] NOT NULL DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PATIENT MANAGEMENT TABLES
-- =====================================================

-- Patients
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER,
    patient_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender_at_birth VARCHAR(20),
    email TEXT,
    phone TEXT,
    nhs_number TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    insurance_info JSONB DEFAULT '{}'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    medical_history JSONB DEFAULT '{}'::jsonb,
    risk_level VARCHAR(10) NOT NULL DEFAULT 'low',
    flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    communication_preferences JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_insured BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================
-- CLINICAL DATA TABLES
-- =====================================================

-- Medical Records
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription JSONB DEFAULT '{}'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    ai_suggestions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    assigned_role VARCHAR(50),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    type VARCHAR(20) NOT NULL DEFAULT 'consultation',
    location TEXT,
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Consultations
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    appointment_id INTEGER,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    consultation_type VARCHAR(20) NOT NULL,
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    vitals JSONB DEFAULT '{}'::jsonb,
    physical_exam TEXT,
    assessment TEXT,
    diagnosis TEXT[],
    treatment_plan TEXT,
    prescriptions TEXT[],
    follow_up_instructions TEXT,
    consultation_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    consultation_id INTEGER,
    prescription_created_by INTEGER,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    refills INTEGER DEFAULT 0,
    instructions TEXT,
    route VARCHAR(50),
    form VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (prescription_created_by) REFERENCES users(id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(id)
);

-- Medical Images
CREATE TABLE medical_images (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    image_id TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    imaging_type VARCHAR(50) NOT NULL,
    body_part TEXT,
    ordered_by INTEGER,
    uploaded_by INTEGER,
    ordered_at TIMESTAMP DEFAULT NOW(),
    performed_at TIMESTAMP,
    findings TEXT,
    impression TEXT,
    radiologist TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'routine',
    report_file_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Clinical Photos
CREATE TABLE clinical_photos (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    captured_by INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'image/png',
    metadata JSONB DEFAULT '{}'::jsonb,
    ai_analysis JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (captured_by) REFERENCES users(id)
);

-- Muscles Position (Facial Analysis)
CREATE TABLE muscles_position (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    coordinates JSONB,
    is_detected BOOLEAN NOT NULL DEFAULT false,
    detected_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lab Results
CREATE TABLE lab_results (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    ordered_by INTEGER,
    performed_by INTEGER,
    specimen_type TEXT,
    results JSONB NOT NULL,
    normal_range TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    ordered_at TIMESTAMP DEFAULT NOW(),
    collected_at TIMESTAMP,
    reported_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (ordered_by) REFERENCES users(id)
);

-- Voice Notes
CREATE TABLE voice_notes (
    id VARCHAR PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id VARCHAR NOT NULL,
    patient_name TEXT NOT NULL,
    provider_id VARCHAR NOT NULL,
    provider_name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    recording_duration INTEGER,
    transcript TEXT,
    confidence REAL,
    medical_terms JSONB DEFAULT '[]'::jsonb,
    structured_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL & BILLING TABLES
-- =====================================================

-- Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    nhs_number VARCHAR(10),
    date_of_service TIMESTAMP NOT NULL,
    invoice_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'payment',
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL,
    insurance JSONB,
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    patient_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    payment_method VARCHAR(20) NOT NULL,
    payment_provider VARCHAR(50),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'completed',
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Claims
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    service_date TIMESTAMP NOT NULL,
    submission_date TIMESTAMP NOT NULL,
    amount DECIMAL NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_amount DECIMAL,
    payment_date TIMESTAMP,
    denial_reason TEXT,
    insurance_provider TEXT NOT NULL,
    procedures JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Insurance Verifications
CREATE TABLE insurance_verifications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    group_number TEXT,
    member_number TEXT,
    nhs_number TEXT,
    plan_type TEXT,
    coverage_type VARCHAR(20) NOT NULL DEFAULT 'primary',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    eligibility_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    effective_date DATE,
    expiration_date DATE,
    last_verified DATE,
    benefits JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Revenue Records
CREATE TABLE revenue_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    month VARCHAR(7) NOT NULL,
    revenue DECIMAL(12,2) NOT NULL,
    expenses DECIMAL(12,2) NOT NULL,
    profit DECIMAL(12,2) NOT NULL,
    collections DECIMAL(12,2) NOT NULL,
    target DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Pricing Tables
CREATE TABLE imaging_pricing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    imaging_type VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE lab_test_pricing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    test_code VARCHAR(50),
    category VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    doctor_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE doctors_fee (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    doctor_id INTEGER,
    doctor_name TEXT,
    doctor_role VARCHAR(50),
    service_name TEXT NOT NULL,
    service_code VARCHAR(50),
    category VARCHAR(100),
    base_price DECIMAL NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    version INTEGER NOT NULL DEFAULT 1,
    effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================
-- INVENTORY MANAGEMENT TABLES
-- =====================================================

-- Inventory Categories
CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Suppliers
CREATE TABLE inventory_suppliers (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone VARCHAR(20),
    address TEXT,
    city TEXT,
    country TEXT NOT NULL DEFAULT 'UK',
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    unit_of_measurement VARCHAR(20) NOT NULL DEFAULT 'pieces',
    pack_size INTEGER NOT NULL DEFAULT 1,
    purchase_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    mrp DECIMAL(10,2),
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    maximum_stock INTEGER NOT NULL DEFAULT 1000,
    reorder_point INTEGER NOT NULL DEFAULT 20,
    expiry_tracking BOOLEAN NOT NULL DEFAULT false,
    batch_tracking BOOLEAN NOT NULL DEFAULT false,
    prescription_required BOOLEAN NOT NULL DEFAULT false,
    storage_conditions TEXT,
    side_effects TEXT,
    contraindications TEXT,
    dosage_instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_discontinued BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Batches
CREATE TABLE inventory_batches (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date TIMESTAMP,
    manufacture_date TIMESTAMP,
    quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10,2) NOT NULL,
    supplier_id INTEGER,
    received_date TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_expired BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Purchase Orders
CREATE TABLE inventory_purchase_orders (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    po_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_delivery_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Purchase Order Items
CREATE TABLE inventory_purchase_order_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    purchase_order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Sales
CREATE TABLE inventory_sales (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    sale_number VARCHAR(100) NOT NULL UNIQUE,
    sale_date TIMESTAMP NOT NULL DEFAULT NOW(),
    total_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'paid',
    prescription_id INTEGER,
    sold_by INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Sale Items
CREATE TABLE inventory_sale_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Stock Movements
CREATE TABLE inventory_stock_movements (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_id INTEGER,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Stock Alerts
CREATE TABLE inventory_stock_alerts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- COMMUNICATION & MESSAGING TABLES
-- =====================================================

-- Conversations
CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    participants JSONB NOT NULL,
    last_message JSONB,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_patient_conversation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id VARCHAR(50) PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    conversation_id VARCHAR(50) NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    recipient_id TEXT,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT false,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',
    type VARCHAR(20) NOT NULL DEFAULT 'internal',
    is_starred BOOLEAN NOT NULL DEFAULT false,
    phone_number VARCHAR(20),
    message_type VARCHAR(10),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_message_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Patient Communications
CREATE TABLE patient_communications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    sent_by INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_message_id TEXT,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_entity JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================================================
-- AI & ANALYTICS TABLES
-- =====================================================

-- AI Insights
CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'medium',
    action_required BOOLEAN NOT NULL DEFAULT false,
    confidence VARCHAR(10),
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    ai_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Symptom Checks
CREATE TABLE symptom_checks (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    user_id INTEGER,
    appointment_id INTEGER,
    symptoms JSONB NOT NULL,
    possible_conditions JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    urgency_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Financial Forecasts
CREATE TABLE financial_forecasts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    forecast_period VARCHAR(7) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    current_value DECIMAL(12,2) NOT NULL,
    projected_value DECIMAL(12,2) NOT NULL,
    variance DECIMAL(12,2) NOT NULL,
    trend VARCHAR(10) NOT NULL,
    confidence INTEGER NOT NULL,
    methodology VARCHAR(30) NOT NULL DEFAULT 'historical_trend',
    key_factors JSONB DEFAULT '[]'::jsonb,
    model_id INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (model_id) REFERENCES forecast_models(id)
);

-- Forecast Models
CREATE TABLE forecast_models (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(30) NOT NULL,
    algorithm VARCHAR(20) NOT NULL DEFAULT 'linear',
    parameters JSONB DEFAULT '{}'::jsonb,
    accuracy DECIMAL(5,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Clinical Procedures
CREATE TABLE clinical_procedures (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    duration TEXT NOT NULL,
    complexity VARCHAR(20) NOT NULL,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    steps JSONB DEFAULT '[]'::jsonb,
    complications JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Emergency Protocols
CREATE TABLE emergency_protocols (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    steps JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Medications Database
CREATE TABLE medications_database (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    dosage TEXT NOT NULL,
    interactions JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    severity VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Patient Drug Interactions
CREATE TABLE patient_drug_interactions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    medication1_name TEXT NOT NULL,
    medication1_dosage TEXT NOT NULL,
    medication1_frequency TEXT,
    medication2_name TEXT NOT NULL,
    medication2_dosage TEXT NOT NULL,
    medication2_frequency TEXT,
    interaction_type VARCHAR(50),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    description TEXT,
    warnings JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    reported_by INTEGER,
    reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (reported_by) REFERENCES users(id)
);

-- =====================================================
-- GDPR COMPLIANCE TABLES
-- =====================================================

-- GDPR Consents
CREATE TABLE gdpr_consents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    granted_at TIMESTAMP,
    withdrawn_at TIMESTAMP,
    expires_at TIMESTAMP,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories JSONB DEFAULT '[]'::jsonb,
    retention_period INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    consent_method VARCHAR(30) NOT NULL DEFAULT 'digital',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- GDPR Data Requests
CREATE TABLE gdpr_data_requests (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_reason TEXT,
    identity_verified BOOLEAN NOT NULL DEFAULT false,
    processed_by INTEGER,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    response_data JSONB DEFAULT '{}'::jsonb,
    rejection_reason TEXT,
    communication_log JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- GDPR Audit Trail
CREATE TABLE gdpr_audit_trail (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER,
    patient_id INTEGER,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(30) NOT NULL,
    resource_id INTEGER,
    data_categories JSONB DEFAULT '[]'::jsonb,
    legal_basis VARCHAR(50),
    purpose TEXT,
    changes JSONB DEFAULT '[]'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- GDPR Processing Activities
CREATE TABLE gdpr_processing_activities (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    activity_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories JSONB DEFAULT '[]'::jsonb,
    recipients JSONB DEFAULT '[]'::jsonb,
    retention_period TEXT NOT NULL,
    security_measures TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- =====================================================
-- CHATBOT TABLES
-- =====================================================

-- Chatbot Configs
CREATE TABLE chatbot_configs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Healthcare Assistant',
    description TEXT DEFAULT 'AI-powered healthcare assistant',
    is_active BOOLEAN NOT NULL DEFAULT true,
    primary_color TEXT DEFAULT '#4A7DFF',
    welcome_message TEXT DEFAULT 'Hello! I can help with appointments and prescriptions.',
    appointment_booking_enabled BOOLEAN NOT NULL DEFAULT true,
    prescription_requests_enabled BOOLEAN NOT NULL DEFAULT true,
    api_key TEXT NOT NULL,
    embed_code TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Chatbot Sessions
CREATE TABLE chatbot_sessions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    config_id INTEGER NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    visitor_id TEXT,
    patient_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_intent TEXT,
    extracted_patient_name TEXT,
    extracted_phone TEXT,
    extracted_email TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (config_id) REFERENCES chatbot_configs(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Chatbot Messages
CREATE TABLE chatbot_messages (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    sender VARCHAR(10) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    intent TEXT,
    confidence REAL,
    ai_processed BOOLEAN NOT NULL DEFAULT false,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (session_id) REFERENCES chatbot_sessions(id)
);

-- Chatbot Analytics
CREATE TABLE chatbot_analytics (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    config_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    prescription_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (config_id) REFERENCES chatbot_configs(id)
);

-- =====================================================
-- ADDITIONAL TABLES
-- =====================================================

-- Documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'medical_form',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_template BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Letter Drafts
CREATE TABLE letter_drafts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    recipient TEXT NOT NULL,
    doctor_email TEXT,
    location TEXT,
    copied_recipients TEXT,
    header TEXT,
    document_content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Integration Tables
CREATE TABLE quickbooks_connections (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    realm_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    refresh_token_expires_at TIMESTAMP NOT NULL,
    company_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_sync_configs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    sync_frequency VARCHAR(20) DEFAULT 'manual',
    sync_invoices BOOLEAN NOT NULL DEFAULT true,
    sync_payments BOOLEAN NOT NULL DEFAULT true,
    sync_customers BOOLEAN NOT NULL DEFAULT true,
    sync_items BOOLEAN NOT NULL DEFAULT true,
    default_income_account TEXT,
    default_expense_account TEXT,
    tax_code TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_customer_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    quickbooks_customer_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_invoice_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    quickbooks_invoice_id TEXT NOT NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_payment_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    quickbooks_payment_id TEXT NOT NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_item_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    service_id INTEGER,
    quickbooks_item_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_account_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    quickbooks_account_id TEXT NOT NULL,
    quickbooks_account_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quickbooks_sync_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patients_organization ON patients(organization_id);
CREATE INDEX idx_appointments_organization ON appointments(organization_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider ON appointments(provider_id);
CREATE INDEX idx_medical_records_organization ON medical_records(organization_id);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_payments_organization ON payments(organization_id);
CREATE INDEX idx_messages_organization ON messages(organization_id);
CREATE INDEX idx_conversations_organization ON conversations(organization_id);
CREATE INDEX idx_medical_images_organization ON medical_images(organization_id);
CREATE INDEX idx_medical_images_patient ON medical_images(patient_id);
CREATE INDEX idx_prescriptions_organization ON prescriptions(organization_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);

-- =====================================================
-- COMMENTS ON TABLES
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations (healthcare facilities)';
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE patients IS 'Patient demographic and medical information';
COMMENT ON TABLE appointments IS 'Patient appointments and scheduling';
COMMENT ON TABLE medical_records IS 'Patient medical records and consultations';
COMMENT ON TABLE prescriptions IS 'Patient prescriptions';
COMMENT ON TABLE medical_images IS 'Medical imaging studies (X-ray, CT, MRI, etc.)';
COMMENT ON TABLE invoices IS 'Patient invoices for medical services';
COMMENT ON TABLE payments IS 'Payment transactions';
COMMENT ON TABLE saas_owners IS 'Platform administrators';
COMMENT ON TABLE saas_packages IS 'Subscription packages';
COMMENT ON TABLE saas_subscriptions IS 'Organization subscriptions';
COMMENT ON TABLE chatbot_configs IS 'Chatbot configurations per organization';
COMMENT ON TABLE inventory_items IS 'Inventory items (medications, supplies, etc.)';
COMMENT ON TABLE gdpr_consents IS 'GDPR consent records';
COMMENT ON TABLE gdpr_audit_trail IS 'GDPR audit trail for data access';

-- =====================================================
-- END OF DATABASE EXPORT
-- =====================================================

-- To restore this database:
-- 1. Create a new PostgreSQL database
-- 2. Run: psql <database_url> < CURA_DATABASE_EXPORT.sql
-- 3. Verify tables: \dt
-- 4. Check constraints: \d <table_name>

-- Note: This export includes schema structure only.
-- For data export with INSERT statements, use:
-- pg_dump $DATABASE_URL --data-only --inserts > data_export.sql
