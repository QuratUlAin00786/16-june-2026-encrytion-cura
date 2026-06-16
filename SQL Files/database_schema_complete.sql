-- PostgreSQL Database Schema Export
-- Generated: 2025-10-26T15:08:12.078Z
-- Database: Cura EMR System

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


-- Sequences
CREATE SEQUENCE public.ai_insights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.appointments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.chatbot_analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.chatbot_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.chatbot_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.chatbot_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.claims_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.clinic_footers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.clinic_headers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.clinical_photos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.clinical_procedures_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.consultations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.doctor_default_shifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.doctors_fee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.emergency_protocols_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.financial_forecasts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.forecast_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.gdpr_audit_trail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.gdpr_consents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.gdpr_data_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.gdpr_processing_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.imaging_pricing_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.insurance_verifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_batches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_purchase_order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_purchase_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_sale_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_sales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_stock_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_stock_movements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.inventory_suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.lab_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.lab_test_pricing_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.letter_drafts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.medical_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.medical_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.medications_database_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.message_campaigns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.message_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.muscles_position_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.patient_communications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.patient_drug_interactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.patients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.prescriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_account_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_customer_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_invoice_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_item_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_payment_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_sync_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quickbooks_sync_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.revenue_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.risk_assessments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.saas_invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.saas_owners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.saas_packages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.saas_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.saas_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.saas_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.staff_shifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.symptom_checks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.user_document_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- Table: ai_insights
CREATE TABLE public.ai_insights (
    id integer NOT NULL DEFAULT nextval('ai_insights_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer,
    type varchar(30) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity varchar(10) NOT NULL DEFAULT 'medium'::character varying,
    action_required boolean NOT NULL DEFAULT false,
    confidence varchar(10),
    metadata jsonb DEFAULT '{}'::jsonb,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    ai_status varchar(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: appointments
CREATE TABLE public.appointments (
    id integer NOT NULL DEFAULT nextval('appointments_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    assigned_role varchar(50),
    title text NOT NULL,
    description text,
    scheduled_at timestamp without time zone NOT NULL,
    duration integer NOT NULL DEFAULT 30,
    status varchar(20) NOT NULL DEFAULT 'scheduled'::character varying,
    type varchar(20) NOT NULL DEFAULT 'consultation'::character varying,
    location text,
    is_virtual boolean NOT NULL DEFAULT false,
    created_by integer,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: chatbot_analytics
CREATE TABLE public.chatbot_analytics (
    id integer NOT NULL DEFAULT nextval('chatbot_analytics_id_seq'::regclass),
    organization_id integer NOT NULL,
    config_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    total_sessions integer DEFAULT 0,
    completed_sessions integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    appointments_booked integer DEFAULT 0,
    prescription_requests integer DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: chatbot_configs
CREATE TABLE public.chatbot_configs (
    id integer NOT NULL DEFAULT nextval('chatbot_configs_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL DEFAULT 'Healthcare Assistant'::text,
    description text DEFAULT 'AI-powered healthcare assistant'::text,
    is_active boolean NOT NULL DEFAULT true,
    primary_color text DEFAULT '#4A7DFF'::text,
    welcome_message text DEFAULT 'Hello! I can help with appointments and prescriptions.'::text,
    appointment_booking_enabled boolean NOT NULL DEFAULT true,
    prescription_requests_enabled boolean NOT NULL DEFAULT true,
    api_key text NOT NULL,
    embed_code text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: chatbot_messages
CREATE TABLE public.chatbot_messages (
    id integer NOT NULL DEFAULT nextval('chatbot_messages_id_seq'::regclass),
    organization_id integer NOT NULL,
    session_id integer NOT NULL,
    message_id text NOT NULL,
    sender varchar(10) NOT NULL,
    message_type varchar(20) NOT NULL DEFAULT 'text'::character varying,
    content text NOT NULL,
    intent text,
    confidence real,
    ai_processed boolean NOT NULL DEFAULT false,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: chatbot_sessions
CREATE TABLE public.chatbot_sessions (
    id integer NOT NULL DEFAULT nextval('chatbot_sessions_id_seq'::regclass),
    organization_id integer NOT NULL,
    config_id integer NOT NULL,
    session_id text NOT NULL,
    visitor_id text,
    patient_id integer,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    current_intent text,
    extracted_patient_name text,
    extracted_phone text,
    extracted_email text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: claims
CREATE TABLE public.claims (
    id integer NOT NULL DEFAULT nextval('claims_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    claim_number varchar(50) NOT NULL,
    service_date timestamp without time zone NOT NULL,
    submission_date timestamp without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    payment_amount numeric(10,2),
    payment_date timestamp without time zone,
    denial_reason text,
    insurance_provider text NOT NULL,
    procedures jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: clinic_footers
CREATE TABLE public.clinic_footers (
    id integer NOT NULL DEFAULT nextval('clinic_footers_id_seq'::regclass),
    organization_id integer NOT NULL,
    footer_text text NOT NULL,
    background_color varchar(7) NOT NULL DEFAULT '#4A7DFF'::character varying,
    text_color varchar(7) NOT NULL DEFAULT '#FFFFFF'::character varying,
    show_social boolean NOT NULL DEFAULT false,
    facebook text,
    twitter text,
    linkedin text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: clinic_headers
CREATE TABLE public.clinic_headers (
    id integer NOT NULL DEFAULT nextval('clinic_headers_id_seq'::regclass),
    organization_id integer NOT NULL,
    logo_base64 text,
    logo_position varchar(20) NOT NULL DEFAULT 'center'::character varying,
    clinic_name text NOT NULL,
    address text,
    phone varchar(50),
    email text,
    website text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    font_size varchar(20) NOT NULL DEFAULT '12pt'::character varying,
    font_family varchar(50) NOT NULL DEFAULT 'verdana'::character varying,
    font_weight varchar(20) NOT NULL DEFAULT 'normal'::character varying,
    font_style varchar(20) NOT NULL DEFAULT 'normal'::character varying,
    text_decoration varchar(20) NOT NULL DEFAULT 'none'::character varying,
    clinic_name_font_size varchar(20) NOT NULL DEFAULT '24pt'::character varying
);

-- Table: clinical_photos
CREATE TABLE public.clinical_photos (
    id integer NOT NULL DEFAULT nextval('clinical_photos_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    captured_by integer NOT NULL,
    type varchar(50) NOT NULL,
    description text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type varchar(100) NOT NULL DEFAULT 'image/png'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    ai_analysis jsonb,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: clinical_procedures
CREATE TABLE public.clinical_procedures (
    id integer NOT NULL DEFAULT nextval('clinical_procedures_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL,
    category varchar(50) NOT NULL,
    duration text NOT NULL,
    complexity varchar(20) NOT NULL,
    prerequisites jsonb DEFAULT '[]'::jsonb,
    steps jsonb DEFAULT '[]'::jsonb,
    complications jsonb DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: consultations
CREATE TABLE public.consultations (
    id integer NOT NULL DEFAULT nextval('consultations_id_seq'::regclass),
    organization_id integer NOT NULL,
    appointment_id integer,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    consultation_type varchar(20) NOT NULL,
    chief_complaint text,
    history_of_present_illness text,
    vitals jsonb DEFAULT '{}'::jsonb,
    physical_exam text,
    assessment text,
    diagnosis text[],
    treatment_plan text,
    prescriptions text[],
    follow_up_instructions text,
    consultation_notes text,
    status varchar(20) NOT NULL DEFAULT 'in_progress'::character varying,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: conversations
CREATE TABLE public.conversations (
    id varchar(50) NOT NULL,
    organization_id integer NOT NULL,
    participants jsonb NOT NULL,
    last_message jsonb,
    unread_count integer NOT NULL DEFAULT 0,
    is_patient_conversation boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: doctor_default_shifts
CREATE TABLE public.doctor_default_shifts (
    id integer NOT NULL DEFAULT nextval('doctor_default_shifts_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    start_time varchar(5) NOT NULL DEFAULT '09:00'::character varying,
    end_time varchar(5) NOT NULL DEFAULT '17:00'::character varying,
    working_days text[] NOT NULL DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}'::text[],
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: doctors_fee
CREATE TABLE public.doctors_fee (
    id integer NOT NULL DEFAULT nextval('doctors_fee_id_seq'::regclass),
    organization_id integer NOT NULL,
    doctor_id integer,
    doctor_name text,
    doctor_role varchar(50),
    service_name text NOT NULL,
    service_code varchar(50),
    category varchar(100),
    base_price numeric(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'GBP'::character varying,
    version integer NOT NULL DEFAULT 1,
    effective_date timestamp without time zone NOT NULL DEFAULT now(),
    expiry_date timestamp without time zone,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: documents
CREATE TABLE public.documents (
    id integer NOT NULL DEFAULT nextval('documents_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    type varchar(50) NOT NULL DEFAULT 'medical_form'::character varying,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_template boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: emergency_protocols
CREATE TABLE public.emergency_protocols (
    id integer NOT NULL DEFAULT nextval('emergency_protocols_id_seq'::regclass),
    organization_id integer NOT NULL,
    title text NOT NULL,
    priority varchar(20) NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: financial_forecasts
CREATE TABLE public.financial_forecasts (
    id integer NOT NULL DEFAULT nextval('financial_forecasts_id_seq'::regclass),
    organization_id integer NOT NULL,
    category text NOT NULL,
    forecast_period varchar(7) NOT NULL,
    generated_at timestamp without time zone NOT NULL DEFAULT now(),
    current_value numeric(12,2) NOT NULL,
    projected_value numeric(12,2) NOT NULL,
    variance numeric(12,2) NOT NULL,
    trend varchar(10) NOT NULL,
    confidence integer NOT NULL,
    methodology varchar(30) NOT NULL DEFAULT 'historical_trend'::character varying,
    key_factors jsonb DEFAULT '[]'::jsonb,
    model_id integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: forecast_models
CREATE TABLE public.forecast_models (
    id integer NOT NULL DEFAULT nextval('forecast_models_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL,
    type varchar(30) NOT NULL,
    algorithm varchar(20) NOT NULL DEFAULT 'linear'::character varying,
    parameters jsonb DEFAULT '{}'::jsonb,
    accuracy numeric(5,2),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: gdpr_audit_trail
CREATE TABLE public.gdpr_audit_trail (
    id integer NOT NULL DEFAULT nextval('gdpr_audit_trail_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer,
    patient_id integer,
    action varchar(50) NOT NULL,
    resource_type varchar(30) NOT NULL,
    resource_id integer,
    data_categories jsonb DEFAULT '[]'::jsonb,
    legal_basis varchar(50),
    purpose text,
    changes jsonb DEFAULT '[]'::jsonb,
    ip_address varchar(45),
    user_agent text,
    session_id varchar(100),
    timestamp timestamp without time zone NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Table: gdpr_consents
CREATE TABLE public.gdpr_consents (
    id integer NOT NULL DEFAULT nextval('gdpr_consents_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    consent_type varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    granted_at timestamp without time zone,
    withdrawn_at timestamp without time zone,
    expires_at timestamp without time zone,
    purpose text NOT NULL,
    legal_basis varchar(50) NOT NULL,
    data_categories jsonb DEFAULT '[]'::jsonb,
    retention_period integer,
    ip_address varchar(45),
    user_agent text,
    consent_method varchar(30) NOT NULL DEFAULT 'digital'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: gdpr_data_requests
CREATE TABLE public.gdpr_data_requests (
    id integer NOT NULL DEFAULT nextval('gdpr_data_requests_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    request_type varchar(30) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    request_reason text,
    identity_verified boolean NOT NULL DEFAULT false,
    processed_by integer,
    requested_at timestamp without time zone NOT NULL DEFAULT now(),
    completed_at timestamp without time zone,
    due_date timestamp without time zone NOT NULL,
    response_data jsonb DEFAULT '{}'::jsonb,
    rejection_reason text,
    communication_log jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: gdpr_processing_activities
CREATE TABLE public.gdpr_processing_activities (
    id integer NOT NULL DEFAULT nextval('gdpr_processing_activities_id_seq'::regclass),
    organization_id integer NOT NULL,
    activity_name text NOT NULL,
    purpose text NOT NULL,
    legal_basis varchar(50) NOT NULL,
    data_categories jsonb DEFAULT '[]'::jsonb,
    data_subjects jsonb DEFAULT '[]'::jsonb,
    recipients jsonb DEFAULT '[]'::jsonb,
    international_transfers jsonb DEFAULT '[]'::jsonb,
    retention_period integer,
    security_measures jsonb DEFAULT '[]'::jsonb,
    dpia_required boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    review_date timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: imaging_pricing
CREATE TABLE public.imaging_pricing (
    id integer NOT NULL DEFAULT nextval('imaging_pricing_id_seq'::regclass),
    organization_id integer NOT NULL,
    imaging_type text NOT NULL,
    imaging_code varchar(50),
    modality varchar(50),
    body_part varchar(100),
    category varchar(100),
    base_price numeric(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'GBP'::character varying,
    version integer NOT NULL DEFAULT 1,
    effective_date timestamp without time zone NOT NULL DEFAULT now(),
    expiry_date timestamp without time zone,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: insurance_verifications
CREATE TABLE public.insurance_verifications (
    id integer NOT NULL DEFAULT nextval('insurance_verifications_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    patient_name text NOT NULL,
    provider text NOT NULL,
    policy_number text NOT NULL,
    group_number text,
    member_number text,
    nhs_number text,
    plan_type text,
    coverage_type varchar(20) NOT NULL DEFAULT 'primary'::character varying,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    eligibility_status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    effective_date date,
    expiration_date date,
    last_verified date,
    benefits jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: inventory_batches
CREATE TABLE public.inventory_batches (
    id integer NOT NULL DEFAULT nextval('inventory_batches_id_seq'::regclass),
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_number varchar(100) NOT NULL,
    expiry_date timestamp without time zone,
    manufacture_date timestamp without time zone,
    quantity integer NOT NULL,
    remaining_quantity integer NOT NULL DEFAULT 0,
    purchase_price numeric(10,2) NOT NULL,
    supplier_id integer,
    received_date timestamp without time zone NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    is_expired boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_categories
CREATE TABLE public.inventory_categories (
    id integer NOT NULL DEFAULT nextval('inventory_categories_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL,
    description text,
    parent_category_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_items
CREATE TABLE public.inventory_items (
    id integer NOT NULL DEFAULT nextval('inventory_items_id_seq'::regclass),
    organization_id integer NOT NULL,
    category_id integer NOT NULL,
    name text NOT NULL,
    description text,
    sku varchar(100) NOT NULL,
    barcode varchar(100),
    generic_name text,
    brand_name text,
    manufacturer text,
    unit_of_measurement varchar(20) NOT NULL DEFAULT 'pieces'::character varying,
    pack_size integer NOT NULL DEFAULT 1,
    purchase_price numeric(10,2) NOT NULL,
    sale_price numeric(10,2) NOT NULL,
    mrp numeric(10,2),
    tax_rate numeric(5,2) NOT NULL DEFAULT 0.00,
    current_stock integer NOT NULL DEFAULT 0,
    minimum_stock integer NOT NULL DEFAULT 10,
    maximum_stock integer NOT NULL DEFAULT 1000,
    reorder_point integer NOT NULL DEFAULT 20,
    expiry_tracking boolean NOT NULL DEFAULT false,
    batch_tracking boolean NOT NULL DEFAULT false,
    prescription_required boolean NOT NULL DEFAULT false,
    storage_conditions text,
    side_effects text,
    contraindications text,
    dosage_instructions text,
    is_active boolean NOT NULL DEFAULT true,
    is_discontinued boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_purchase_order_items
CREATE TABLE public.inventory_purchase_order_items (
    id integer NOT NULL DEFAULT nextval('inventory_purchase_order_items_id_seq'::regclass),
    organization_id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    received_quantity integer NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_purchase_orders
CREATE TABLE public.inventory_purchase_orders (
    id integer NOT NULL DEFAULT nextval('inventory_purchase_orders_id_seq'::regclass),
    organization_id integer NOT NULL,
    po_number varchar(100) NOT NULL,
    supplier_id integer NOT NULL,
    order_date timestamp without time zone NOT NULL DEFAULT now(),
    expected_delivery_date timestamp without time zone,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    total_amount numeric(12,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    discount_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    notes text,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    email_sent boolean NOT NULL DEFAULT false,
    email_sent_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_sale_items
CREATE TABLE public.inventory_sale_items (
    id integer NOT NULL DEFAULT nextval('inventory_sale_items_id_seq'::regclass),
    organization_id integer NOT NULL,
    sale_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_sales
CREATE TABLE public.inventory_sales (
    id integer NOT NULL DEFAULT nextval('inventory_sales_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer,
    sale_number varchar(100) NOT NULL,
    sale_date timestamp without time zone NOT NULL DEFAULT now(),
    total_amount numeric(12,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    discount_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    payment_method varchar(50) NOT NULL DEFAULT 'cash'::character varying,
    payment_status varchar(20) NOT NULL DEFAULT 'paid'::character varying,
    prescription_id integer,
    sold_by integer NOT NULL,
    notes text,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_stock_alerts
CREATE TABLE public.inventory_stock_alerts (
    id integer NOT NULL DEFAULT nextval('inventory_stock_alerts_id_seq'::regclass),
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    alert_type varchar(20) NOT NULL,
    threshold_value integer NOT NULL,
    current_value integer NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    message text,
    is_read boolean NOT NULL DEFAULT false,
    is_resolved boolean NOT NULL DEFAULT false,
    resolved_by integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_stock_movements
CREATE TABLE public.inventory_stock_movements (
    id integer NOT NULL DEFAULT nextval('inventory_stock_movements_id_seq'::regclass),
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer,
    movement_type varchar(20) NOT NULL,
    quantity integer NOT NULL,
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    unit_cost numeric(10,2),
    reference_type varchar(50),
    reference_id integer,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: inventory_suppliers
CREATE TABLE public.inventory_suppliers (
    id integer NOT NULL DEFAULT nextval('inventory_suppliers_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone varchar(20),
    address text,
    city text,
    country text NOT NULL DEFAULT 'UK'::text,
    tax_id varchar(50),
    payment_terms varchar(100) DEFAULT 'Net 30'::character varying,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: invoices
CREATE TABLE public.invoices (
    id integer NOT NULL DEFAULT nextval('invoices_id_seq'::regclass),
    organization_id integer NOT NULL,
    invoice_number varchar(50) NOT NULL,
    patient_id text NOT NULL,
    patient_name text NOT NULL,
    nhs_number varchar(10),
    date_of_service timestamp without time zone NOT NULL,
    invoice_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'draft'::character varying,
    invoice_type varchar(50) NOT NULL DEFAULT 'payment'::character varying,
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) NOT NULL DEFAULT '0'::numeric,
    discount numeric(10,2) NOT NULL DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) NOT NULL DEFAULT '0'::numeric,
    items jsonb NOT NULL,
    insurance jsonb,
    payments jsonb NOT NULL DEFAULT '[]'::jsonb,
    notes text,
    created_by integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    service_type varchar(50),
    service_id text
);

-- Table: lab_results
CREATE TABLE public.lab_results (
    id integer NOT NULL DEFAULT nextval('lab_results_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    test_id varchar(50) NOT NULL,
    test_type text NOT NULL,
    ordered_by integer NOT NULL,
    doctor_name text,
    main_specialty text,
    sub_specialty text,
    priority varchar(20) DEFAULT 'routine'::character varying,
    ordered_at timestamp without time zone NOT NULL,
    collected_at timestamp without time zone,
    completed_at timestamp without time zone,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    results jsonb DEFAULT '[]'::jsonb,
    critical_values boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    report_status varchar(50),
    Lab_Request_Generated boolean NOT NULL DEFAULT false,
    Sample_Collected boolean NOT NULL DEFAULT false,
    Lab_Report_Generated boolean NOT NULL DEFAULT false,
    Reviewed boolean NOT NULL DEFAULT false,
    signature_data text
);

-- Table: lab_test_pricing
CREATE TABLE public.lab_test_pricing (
    id integer NOT NULL DEFAULT nextval('lab_test_pricing_id_seq'::regclass),
    organization_id integer NOT NULL,
    doctor_id integer,
    doctor_name text,
    doctor_role varchar(50),
    test_name text NOT NULL,
    test_code varchar(50),
    category varchar(100),
    base_price numeric(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'GBP'::character varying,
    version integer NOT NULL DEFAULT 1,
    effective_date timestamp without time zone NOT NULL DEFAULT now(),
    expiry_date timestamp without time zone,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: letter_drafts
CREATE TABLE public.letter_drafts (
    id integer NOT NULL DEFAULT nextval('letter_drafts_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    subject text NOT NULL,
    recipient text NOT NULL,
    doctor_email text,
    location text,
    copied_recipients text,
    header text,
    document_content text NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: medical_images
CREATE TABLE public.medical_images (
    id integer NOT NULL DEFAULT nextval('medical_images_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    study_type text NOT NULL,
    modality varchar(50) NOT NULL,
    body_part text,
    indication text,
    priority varchar(20) NOT NULL DEFAULT 'routine'::character varying,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type varchar(100) NOT NULL,
    image_data text,
    status varchar(20) NOT NULL DEFAULT 'uploaded'::character varying,
    findings text,
    impression text,
    radiologist text,
    report_file_name text,
    report_file_path text,
    metadata jsonb DEFAULT '{}'::jsonb,
    scheduled_at timestamp without time zone,
    performed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    image_id text NOT NULL
);

-- Table: medical_records
CREATE TABLE public.medical_records (
    id integer NOT NULL DEFAULT nextval('medical_records_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    type varchar(20) NOT NULL,
    title text NOT NULL,
    notes text,
    diagnosis text,
    treatment text,
    prescription jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    ai_suggestions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: medications_database
CREATE TABLE public.medications_database (
    id integer NOT NULL DEFAULT nextval('medications_database_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    dosage text NOT NULL,
    interactions jsonb DEFAULT '[]'::jsonb,
    warnings jsonb DEFAULT '[]'::jsonb,
    severity varchar(20) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: message_campaigns
CREATE TABLE public.message_campaigns (
    id integer NOT NULL DEFAULT nextval('message_campaigns_id_seq'::regclass),
    organization_id integer NOT NULL,
    name text NOT NULL,
    type varchar(20) NOT NULL DEFAULT 'email'::character varying,
    status varchar(20) NOT NULL DEFAULT 'draft'::character varying,
    subject text NOT NULL,
    content text NOT NULL,
    template varchar(50) NOT NULL DEFAULT 'default'::character varying,
    recipient_count integer NOT NULL DEFAULT 0,
    sent_count integer NOT NULL DEFAULT 0,
    open_rate integer NOT NULL DEFAULT 0,
    click_rate integer NOT NULL DEFAULT 0,
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: message_templates
CREATE TABLE public.message_templates (
    id integer NOT NULL DEFAULT nextval('message_templates_id_seq'::regclass),
    organization_id integer NOT NULL,
    name varchar(255) NOT NULL,
    category varchar(100) NOT NULL DEFAULT 'general'::character varying,
    subject varchar(500) NOT NULL,
    content text NOT NULL,
    usage_count integer NOT NULL DEFAULT 0,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: messages
CREATE TABLE public.messages (
    id varchar(50) NOT NULL,
    organization_id integer NOT NULL,
    conversation_id varchar(50) NOT NULL,
    sender_id integer NOT NULL,
    sender_name text NOT NULL,
    sender_role varchar(20) NOT NULL,
    recipient_id text,
    recipient_name text,
    subject text NOT NULL,
    content text NOT NULL,
    timestamp timestamp without time zone NOT NULL DEFAULT now(),
    is_read boolean NOT NULL DEFAULT false,
    priority varchar(10) NOT NULL DEFAULT 'normal'::character varying,
    type varchar(20) NOT NULL DEFAULT 'internal'::character varying,
    is_starred boolean NOT NULL DEFAULT false,
    phone_number varchar(20),
    message_type varchar(10),
    delivery_status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    external_message_id text,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: muscles_position
CREATE TABLE public.muscles_position (
    id integer NOT NULL DEFAULT nextval('muscles_position_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    consultation_id integer,
    position integer NOT NULL,
    value text NOT NULL,
    coordinates jsonb,
    is_detected boolean NOT NULL DEFAULT false,
    detected_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: notifications
CREATE TABLE public.notifications (
    id integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type varchar(50) NOT NULL,
    priority varchar(20) NOT NULL DEFAULT 'normal'::character varying,
    status varchar(20) NOT NULL DEFAULT 'unread'::character varying,
    related_entity_type varchar(50),
    related_entity_id integer,
    action_url text,
    is_actionable boolean NOT NULL DEFAULT false,
    scheduled_for timestamp without time zone,
    expires_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    read_at timestamp without time zone,
    dismissed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: organizations
CREATE TABLE public.organizations (
    id integer NOT NULL DEFAULT nextval('organizations_id_seq'::regclass),
    name text NOT NULL,
    subdomain varchar(50) NOT NULL,
    email text NOT NULL,
    region varchar(10) NOT NULL DEFAULT 'UK'::character varying,
    brand_name text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    features jsonb DEFAULT '{}'::jsonb,
    access_level varchar(50) DEFAULT 'full'::character varying,
    subscription_status varchar(20) NOT NULL DEFAULT 'trial'::character varying,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: patient_communications
CREATE TABLE public.patient_communications (
    id integer NOT NULL DEFAULT nextval('patient_communications_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    sent_by integer NOT NULL,
    type varchar(50) NOT NULL,
    method varchar(20) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    message text NOT NULL,
    scheduled_for timestamp without time zone,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: patient_drug_interactions
CREATE TABLE public.patient_drug_interactions (
    id integer NOT NULL DEFAULT nextval('patient_drug_interactions_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    medication1_name text NOT NULL,
    medication1_dosage text NOT NULL,
    medication1_frequency text,
    medication2_name text NOT NULL,
    medication2_dosage text NOT NULL,
    medication2_frequency text,
    interaction_type varchar(50),
    severity varchar(20) NOT NULL DEFAULT 'medium'::character varying,
    description text,
    warnings jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    reported_by integer,
    reported_at timestamp without time zone NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: patients
CREATE TABLE public.patients (
    id integer NOT NULL DEFAULT nextval('patients_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer,
    patient_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    gender_at_birth varchar(20),
    email text,
    phone text,
    nhs_number text,
    address jsonb DEFAULT '{}'::jsonb,
    insurance_info jsonb DEFAULT '{}'::jsonb,
    emergency_contact jsonb DEFAULT '{}'::jsonb,
    medical_history jsonb DEFAULT '{}'::jsonb,
    risk_level varchar(10) NOT NULL DEFAULT 'low'::character varying,
    flags text[] DEFAULT '{}'::text[],
    communication_preferences jsonb DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    is_insured boolean NOT NULL DEFAULT false,
    created_by integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: payments
CREATE TABLE public.payments (
    id integer NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
    organization_id integer NOT NULL,
    invoice_id integer NOT NULL,
    patient_id text NOT NULL,
    transaction_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'GBP'::character varying,
    payment_method varchar(20) NOT NULL,
    payment_provider varchar(50),
    payment_status varchar(20) NOT NULL DEFAULT 'completed'::character varying,
    payment_date timestamp without time zone NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: prescriptions
CREATE TABLE public.prescriptions (
    id integer NOT NULL DEFAULT nextval('prescriptions_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    prescription_created_by integer,
    consultation_id integer,
    prescription_number varchar(50),
    status text NOT NULL DEFAULT 'active'::text,
    diagnosis text,
    medication_name text NOT NULL,
    dosage text,
    frequency text,
    duration text,
    instructions text,
    issued_date timestamp without time zone DEFAULT now(),
    medications jsonb DEFAULT '[]'::jsonb,
    pharmacy jsonb DEFAULT '{}'::jsonb,
    prescribed_at timestamp without time zone DEFAULT now(),
    valid_until timestamp without time zone,
    notes text,
    is_electronic boolean NOT NULL DEFAULT true,
    interactions jsonb DEFAULT '[]'::jsonb,
    signature jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: quickbooks_account_mappings
CREATE TABLE public.quickbooks_account_mappings (
    id integer NOT NULL DEFAULT nextval('quickbooks_account_mappings_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_account_type varchar(50) NOT NULL,
    emr_account_name text NOT NULL,
    quickbooks_account_id text NOT NULL,
    quickbooks_account_name text NOT NULL,
    account_type varchar(50) NOT NULL,
    account_sub_type varchar(50),
    is_active boolean NOT NULL DEFAULT true,
    sync_status varchar(20) NOT NULL DEFAULT 'synced'::character varying,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_connections
CREATE TABLE public.quickbooks_connections (
    id integer NOT NULL DEFAULT nextval('quickbooks_connections_id_seq'::regclass),
    organization_id integer NOT NULL,
    company_id text NOT NULL,
    company_name text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expiry timestamp without time zone NOT NULL,
    realm_id text NOT NULL,
    base_url text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_sync_at timestamp without time zone,
    sync_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_customer_mappings
CREATE TABLE public.quickbooks_customer_mappings (
    id integer NOT NULL DEFAULT nextval('quickbooks_customer_mappings_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    patient_id integer NOT NULL,
    quickbooks_customer_id text NOT NULL,
    quickbooks_display_name text,
    sync_status varchar(20) NOT NULL DEFAULT 'synced'::character varying,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_invoice_mappings
CREATE TABLE public.quickbooks_invoice_mappings (
    id integer NOT NULL DEFAULT nextval('quickbooks_invoice_mappings_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_invoice_id text NOT NULL,
    quickbooks_invoice_id text NOT NULL,
    quickbooks_invoice_number text,
    patient_id integer NOT NULL,
    customer_id integer,
    amount numeric(10,2) NOT NULL,
    status varchar(20) NOT NULL,
    sync_status varchar(20) NOT NULL DEFAULT 'synced'::character varying,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_item_mappings
CREATE TABLE public.quickbooks_item_mappings (
    id integer NOT NULL DEFAULT nextval('quickbooks_item_mappings_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_item_type varchar(50) NOT NULL,
    emr_item_id text NOT NULL,
    emr_item_name text NOT NULL,
    quickbooks_item_id text NOT NULL,
    quickbooks_item_name text NOT NULL,
    item_type varchar(20) NOT NULL,
    unit_price numeric(10,2),
    description text,
    income_account_id text,
    expense_account_id text,
    is_active boolean NOT NULL DEFAULT true,
    sync_status varchar(20) NOT NULL DEFAULT 'synced'::character varying,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_payment_mappings
CREATE TABLE public.quickbooks_payment_mappings (
    id integer NOT NULL DEFAULT nextval('quickbooks_payment_mappings_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_payment_id text NOT NULL,
    quickbooks_payment_id text NOT NULL,
    invoice_mapping_id integer,
    amount numeric(10,2) NOT NULL,
    payment_method varchar(50) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    sync_status varchar(20) NOT NULL DEFAULT 'synced'::character varying,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_sync_configs
CREATE TABLE public.quickbooks_sync_configs (
    id integer NOT NULL DEFAULT nextval('quickbooks_sync_configs_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    config_type varchar(50) NOT NULL,
    config_name text NOT NULL,
    config_value jsonb NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    description text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: quickbooks_sync_logs
CREATE TABLE public.quickbooks_sync_logs (
    id integer NOT NULL DEFAULT nextval('quickbooks_sync_logs_id_seq'::regclass),
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    sync_type varchar(50) NOT NULL,
    operation varchar(20) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    records_processed integer DEFAULT 0,
    records_successful integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    error_message text,
    error_details jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: revenue_records
CREATE TABLE public.revenue_records (
    id integer NOT NULL DEFAULT nextval('revenue_records_id_seq'::regclass),
    organization_id integer NOT NULL,
    month varchar(7) NOT NULL,
    revenue numeric(12,2) NOT NULL,
    expenses numeric(12,2) NOT NULL,
    profit numeric(12,2) NOT NULL,
    collections numeric(12,2) NOT NULL,
    target numeric(12,2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: risk_assessments
CREATE TABLE public.risk_assessments (
    id integer NOT NULL DEFAULT nextval('risk_assessments_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    category text NOT NULL,
    risk_score text NOT NULL,
    risk_level text NOT NULL,
    risk_factors jsonb,
    recommendations jsonb,
    based_on_lab_results jsonb,
    has_critical_values boolean,
    assessment_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Table: roles
CREATE TABLE public.roles (
    id integer NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
    organization_id integer NOT NULL,
    name varchar(50) NOT NULL,
    display_name text NOT NULL,
    description text NOT NULL,
    permissions jsonb NOT NULL,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: saas_invoices
CREATE TABLE public.saas_invoices (
    id integer NOT NULL DEFAULT nextval('saas_invoices_id_seq'::regclass),
    organization_id integer NOT NULL,
    subscription_id integer NOT NULL,
    invoice_number varchar(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'GBP'::character varying,
    status varchar(20) NOT NULL DEFAULT 'draft'::character varying,
    issue_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    paid_date timestamp without time zone,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: saas_owners
CREATE TABLE public.saas_owners (
    id integer NOT NULL DEFAULT nextval('saas_owners_id_seq'::regclass),
    username varchar(50) NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: saas_packages
CREATE TABLE public.saas_packages (
    id integer NOT NULL DEFAULT nextval('saas_packages_id_seq'::regclass),
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    billing_cycle varchar(20) NOT NULL DEFAULT 'monthly'::character varying,
    features jsonb DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    show_on_website boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: saas_payments
CREATE TABLE public.saas_payments (
    id integer NOT NULL DEFAULT nextval('saas_payments_id_seq'::regclass),
    organization_id integer NOT NULL,
    subscription_id integer,
    invoice_number varchar(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'GBP'::character varying,
    payment_method varchar(20) NOT NULL,
    payment_status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    payment_date timestamp without time zone,
    due_date timestamp without time zone NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    payment_provider varchar(50),
    provider_transaction_id text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: saas_settings
CREATE TABLE public.saas_settings (
    id integer NOT NULL DEFAULT nextval('saas_settings_id_seq'::regclass),
    key varchar(100) NOT NULL,
    value jsonb,
    description text,
    category varchar(50) NOT NULL DEFAULT 'system'::character varying,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: saas_subscriptions
CREATE TABLE public.saas_subscriptions (
    id integer NOT NULL DEFAULT nextval('saas_subscriptions_id_seq'::regclass),
    organization_id integer NOT NULL,
    package_id integer NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active'::character varying,
    current_period_start timestamp without time zone NOT NULL,
    current_period_end timestamp without time zone NOT NULL,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    trial_end timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: staff_shifts
CREATE TABLE public.staff_shifts (
    id integer NOT NULL DEFAULT nextval('staff_shifts_id_seq'::regclass),
    organization_id integer NOT NULL,
    staff_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    shift_type varchar(20) NOT NULL DEFAULT 'regular'::character varying,
    start_time varchar(5) NOT NULL,
    end_time varchar(5) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'scheduled'::character varying,
    notes text,
    is_available boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: subscriptions
CREATE TABLE public.subscriptions (
    id integer NOT NULL DEFAULT nextval('subscriptions_id_seq'::regclass),
    organization_id integer NOT NULL,
    plan_name text NOT NULL,
    plan varchar(20),
    status varchar(20) NOT NULL DEFAULT 'trial'::character varying,
    user_limit integer NOT NULL DEFAULT 5,
    current_users integer NOT NULL DEFAULT 0,
    monthly_price numeric(10,2),
    trial_ends_at timestamp without time zone,
    next_billing_at timestamp without time zone,
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: symptom_checks
CREATE TABLE public.symptom_checks (
    id integer NOT NULL DEFAULT nextval('symptom_checks_id_seq'::regclass),
    organization_id integer NOT NULL,
    patient_id integer,
    user_id integer NOT NULL,
    symptoms text[] NOT NULL,
    symptom_description text NOT NULL,
    duration text,
    severity varchar(20),
    ai_analysis jsonb DEFAULT '{}'::jsonb,
    status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
    appointment_created boolean NOT NULL DEFAULT false,
    appointment_id integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: user_document_preferences
CREATE TABLE public.user_document_preferences (
    id integer NOT NULL DEFAULT nextval('user_document_preferences_id_seq'::regclass),
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    clinic_info jsonb DEFAULT '{}'::jsonb,
    header_preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: users
CREATE TABLE public.users (
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    organization_id integer NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role varchar(20) NOT NULL DEFAULT 'doctor'::character varying,
    department text,
    medical_specialty_category text,
    sub_specialty text,
    working_days jsonb DEFAULT '[]'::jsonb,
    working_hours jsonb DEFAULT '{}'::jsonb,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    is_saas_owner boolean NOT NULL DEFAULT false,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: voice_notes
CREATE TABLE public.voice_notes (
    id character varying NOT NULL,
    organization_id integer NOT NULL,
    patient_id character varying NOT NULL,
    patient_name text NOT NULL,
    provider_id character varying NOT NULL,
    provider_name text NOT NULL,
    type varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'completed'::character varying,
    recording_duration integer,
    transcript text,
    confidence real,
    medical_terms jsonb DEFAULT '[]'::jsonb,
    structured_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Primary Keys
ALTER TABLE ONLY public.ai_insights ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.appointments ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chatbot_analytics ADD CONSTRAINT chatbot_analytics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chatbot_configs ADD CONSTRAINT chatbot_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chatbot_messages ADD CONSTRAINT chatbot_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chatbot_sessions ADD CONSTRAINT chatbot_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.claims ADD CONSTRAINT claims_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_footers ADD CONSTRAINT clinic_footers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_headers ADD CONSTRAINT clinic_headers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinical_photos ADD CONSTRAINT clinical_photos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinical_procedures ADD CONSTRAINT clinical_procedures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.consultations ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.doctor_default_shifts ADD CONSTRAINT doctor_default_shifts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.doctors_fee ADD CONSTRAINT doctors_fee_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.emergency_protocols ADD CONSTRAINT emergency_protocols_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.financial_forecasts ADD CONSTRAINT financial_forecasts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.forecast_models ADD CONSTRAINT forecast_models_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gdpr_audit_trail ADD CONSTRAINT gdpr_audit_trail_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gdpr_consents ADD CONSTRAINT gdpr_consents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gdpr_data_requests ADD CONSTRAINT gdpr_data_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gdpr_processing_activities ADD CONSTRAINT gdpr_processing_activities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.imaging_pricing ADD CONSTRAINT imaging_pricing_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.insurance_verifications ADD CONSTRAINT insurance_verifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_batches ADD CONSTRAINT inventory_batches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_categories ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_items ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_purchase_order_items ADD CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_purchase_orders ADD CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_sale_items ADD CONSTRAINT inventory_sale_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_sales ADD CONSTRAINT inventory_sales_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_stock_alerts ADD CONSTRAINT inventory_stock_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_stock_movements ADD CONSTRAINT inventory_stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_suppliers ADD CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_results ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_test_pricing ADD CONSTRAINT lab_test_pricing_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.letter_drafts ADD CONSTRAINT letter_drafts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medical_images ADD CONSTRAINT medical_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medical_records ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medications_database ADD CONSTRAINT medications_database_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.message_campaigns ADD CONSTRAINT message_campaigns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.message_templates ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.muscles_position ADD CONSTRAINT muscles_position_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.patient_communications ADD CONSTRAINT patient_communications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.patient_drug_interactions ADD CONSTRAINT patient_drug_interactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prescriptions ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_account_mappings ADD CONSTRAINT quickbooks_account_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_connections ADD CONSTRAINT quickbooks_connections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_customer_mappings ADD CONSTRAINT quickbooks_customer_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_invoice_mappings ADD CONSTRAINT quickbooks_invoice_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_item_mappings ADD CONSTRAINT quickbooks_item_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_payment_mappings ADD CONSTRAINT quickbooks_payment_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_sync_configs ADD CONSTRAINT quickbooks_sync_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quickbooks_sync_logs ADD CONSTRAINT quickbooks_sync_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.revenue_records ADD CONSTRAINT revenue_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.risk_assessments ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saas_invoices ADD CONSTRAINT saas_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saas_owners ADD CONSTRAINT saas_owners_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saas_packages ADD CONSTRAINT saas_packages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saas_payments ADD CONSTRAINT saas_payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saas_settings ADD CONSTRAINT saas_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saas_subscriptions ADD CONSTRAINT saas_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_shifts ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.symptom_checks ADD CONSTRAINT symptom_checks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_document_preferences ADD CONSTRAINT user_document_preferences_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.voice_notes ADD CONSTRAINT voice_notes_pkey PRIMARY KEY (id);

-- Foreign Keys
ALTER TABLE ONLY public.chatbot_analytics ADD CONSTRAINT chatbot_analytics_config_id_chatbot_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.chatbot_configs(id);
ALTER TABLE ONLY public.chatbot_analytics ADD CONSTRAINT chatbot_analytics_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.chatbot_configs ADD CONSTRAINT chatbot_configs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.chatbot_messages ADD CONSTRAINT chatbot_messages_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.chatbot_messages ADD CONSTRAINT chatbot_messages_session_id_chatbot_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.chatbot_sessions(id);
ALTER TABLE ONLY public.chatbot_sessions ADD CONSTRAINT chatbot_sessions_config_id_chatbot_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.chatbot_configs(id);
ALTER TABLE ONLY public.chatbot_sessions ADD CONSTRAINT chatbot_sessions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.chatbot_sessions ADD CONSTRAINT chatbot_sessions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.claims ADD CONSTRAINT claims_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.claims ADD CONSTRAINT claims_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.clinical_photos ADD CONSTRAINT clinical_photos_captured_by_users_id_fk FOREIGN KEY (captured_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.clinical_photos ADD CONSTRAINT clinical_photos_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.clinical_photos ADD CONSTRAINT clinical_photos_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.clinical_procedures ADD CONSTRAINT clinical_procedures_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.doctors_fee ADD CONSTRAINT doctors_fee_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.doctors_fee ADD CONSTRAINT doctors_fee_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.doctors_fee ADD CONSTRAINT doctors_fee_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.emergency_protocols ADD CONSTRAINT emergency_protocols_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.financial_forecasts ADD CONSTRAINT financial_forecasts_model_id_forecast_models_id_fk FOREIGN KEY (model_id) REFERENCES public.forecast_models(id);
ALTER TABLE ONLY public.financial_forecasts ADD CONSTRAINT financial_forecasts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.forecast_models ADD CONSTRAINT forecast_models_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.gdpr_audit_trail ADD CONSTRAINT gdpr_audit_trail_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.gdpr_audit_trail ADD CONSTRAINT gdpr_audit_trail_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.gdpr_audit_trail ADD CONSTRAINT gdpr_audit_trail_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.gdpr_consents ADD CONSTRAINT gdpr_consents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.gdpr_consents ADD CONSTRAINT gdpr_consents_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.gdpr_data_requests ADD CONSTRAINT gdpr_data_requests_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.gdpr_data_requests ADD CONSTRAINT gdpr_data_requests_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.gdpr_data_requests ADD CONSTRAINT gdpr_data_requests_processed_by_users_id_fk FOREIGN KEY (processed_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.gdpr_processing_activities ADD CONSTRAINT gdpr_processing_activities_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.imaging_pricing ADD CONSTRAINT imaging_pricing_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.imaging_pricing ADD CONSTRAINT imaging_pricing_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.insurance_verifications ADD CONSTRAINT insurance_verifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.insurance_verifications ADD CONSTRAINT insurance_verifications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.lab_results ADD CONSTRAINT lab_results_ordered_by_users_id_fk FOREIGN KEY (ordered_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.lab_results ADD CONSTRAINT lab_results_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.lab_results ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.lab_test_pricing ADD CONSTRAINT lab_test_pricing_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.lab_test_pricing ADD CONSTRAINT lab_test_pricing_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.lab_test_pricing ADD CONSTRAINT lab_test_pricing_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.medical_images ADD CONSTRAINT medical_images_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.medical_images ADD CONSTRAINT medical_images_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.medical_images ADD CONSTRAINT medical_images_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.medications_database ADD CONSTRAINT medications_database_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.message_templates ADD CONSTRAINT message_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.message_templates ADD CONSTRAINT message_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.patient_communications ADD CONSTRAINT patient_communications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.patient_communications ADD CONSTRAINT patient_communications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.patient_communications ADD CONSTRAINT patient_communications_sent_by_users_id_fk FOREIGN KEY (sent_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.patient_drug_interactions ADD CONSTRAINT patient_drug_interactions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.patient_drug_interactions ADD CONSTRAINT patient_drug_interactions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.patient_drug_interactions ADD CONSTRAINT patient_drug_interactions_reported_by_users_id_fk FOREIGN KEY (reported_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.prescriptions ADD CONSTRAINT prescriptions_consultation_id_consultations_id_fk FOREIGN KEY (consultation_id) REFERENCES public.consultations(id);
ALTER TABLE ONLY public.prescriptions ADD CONSTRAINT prescriptions_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.prescriptions ADD CONSTRAINT prescriptions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.prescriptions ADD CONSTRAINT prescriptions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.prescriptions ADD CONSTRAINT prescriptions_prescription_created_by_users_id_fk FOREIGN KEY (prescription_created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.revenue_records ADD CONSTRAINT revenue_records_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE ONLY public.staff_shifts ADD CONSTRAINT staff_shifts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.symptom_checks ADD CONSTRAINT symptom_checks_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);
ALTER TABLE ONLY public.symptom_checks ADD CONSTRAINT symptom_checks_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.symptom_checks ADD CONSTRAINT symptom_checks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Unique Constraints
ALTER TABLE ONLY public.chatbot_messages ADD CONSTRAINT chatbot_messages_message_id_unique UNIQUE (message_id);
ALTER TABLE ONLY public.chatbot_sessions ADD CONSTRAINT chatbot_sessions_session_id_unique UNIQUE (session_id);
ALTER TABLE ONLY public.claims ADD CONSTRAINT claims_claim_number_unique UNIQUE (claim_number);
ALTER TABLE ONLY public.inventory_purchase_orders ADD CONSTRAINT inventory_purchase_orders_po_number_unique UNIQUE (po_number);
ALTER TABLE ONLY public.inventory_sales ADD CONSTRAINT inventory_sales_sale_number_unique UNIQUE (sale_number);
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);
ALTER TABLE ONLY public.medical_images ADD CONSTRAINT medical_images_image_id_unique UNIQUE (image_id);
ALTER TABLE ONLY public.organizations ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_transaction_id_unique UNIQUE (transaction_id);
ALTER TABLE ONLY public.saas_invoices ADD CONSTRAINT saas_invoices_invoice_number_unique UNIQUE (invoice_number);
ALTER TABLE ONLY public.saas_owners ADD CONSTRAINT saas_owners_email_unique UNIQUE (email);
ALTER TABLE ONLY public.saas_owners ADD CONSTRAINT saas_owners_username_unique UNIQUE (username);
ALTER TABLE ONLY public.saas_payments ADD CONSTRAINT saas_payments_invoice_number_unique UNIQUE (invoice_number);
ALTER TABLE ONLY public.saas_settings ADD CONSTRAINT saas_settings_key_unique UNIQUE (key);

-- Indexes
CREATE UNIQUE INDEX chatbot_messages_message_id_unique ON public.chatbot_messages USING btree (message_id);
CREATE UNIQUE INDEX chatbot_sessions_session_id_unique ON public.chatbot_sessions USING btree (session_id);
CREATE UNIQUE INDEX claims_claim_number_unique ON public.claims USING btree (claim_number);
CREATE UNIQUE INDEX inventory_purchase_orders_po_number_unique ON public.inventory_purchase_orders USING btree (po_number);
CREATE UNIQUE INDEX inventory_sales_sale_number_unique ON public.inventory_sales USING btree (sale_number);
CREATE UNIQUE INDEX invoices_invoice_number_unique ON public.invoices USING btree (invoice_number);
CREATE UNIQUE INDEX medical_images_image_id_unique ON public.medical_images USING btree (image_id);
CREATE INDEX message_templates_created_by_idx ON public.message_templates USING btree (created_by);
CREATE INDEX message_templates_organization_id_idx ON public.message_templates USING btree (organization_id);
CREATE UNIQUE INDEX organizations_subdomain_unique ON public.organizations USING btree (subdomain);
CREATE UNIQUE INDEX payments_transaction_id_unique ON public.payments USING btree (transaction_id);
CREATE UNIQUE INDEX saas_invoices_invoice_number_unique ON public.saas_invoices USING btree (invoice_number);
CREATE UNIQUE INDEX saas_owners_email_unique ON public.saas_owners USING btree (email);
CREATE UNIQUE INDEX saas_owners_username_unique ON public.saas_owners USING btree (username);
CREATE UNIQUE INDEX saas_payments_invoice_number_unique ON public.saas_payments USING btree (invoice_number);
CREATE UNIQUE INDEX saas_settings_key_unique ON public.saas_settings USING btree (key);
CREATE UNIQUE INDEX unique_user_document_preferences ON public.user_document_preferences USING btree (user_id, organization_id);

-- Sequence Ownership
ALTER SEQUENCE public.ai_insights_id_seq OWNED BY public.ai_insights.id;
ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;
ALTER SEQUENCE public.chatbot_analytics_id_seq OWNED BY public.chatbot_analytics.id;
ALTER SEQUENCE public.chatbot_configs_id_seq OWNED BY public.chatbot_configs.id;
ALTER SEQUENCE public.chatbot_messages_id_seq OWNED BY public.chatbot_messages.id;
ALTER SEQUENCE public.chatbot_sessions_id_seq OWNED BY public.chatbot_sessions.id;
ALTER SEQUENCE public.claims_id_seq OWNED BY public.claims.id;
ALTER SEQUENCE public.clinic_footers_id_seq OWNED BY public.clinic_footers.id;
ALTER SEQUENCE public.clinic_headers_id_seq OWNED BY public.clinic_headers.id;
ALTER SEQUENCE public.clinical_photos_id_seq OWNED BY public.clinical_photos.id;
ALTER SEQUENCE public.clinical_procedures_id_seq OWNED BY public.clinical_procedures.id;
ALTER SEQUENCE public.consultations_id_seq OWNED BY public.consultations.id;
ALTER SEQUENCE public.doctor_default_shifts_id_seq OWNED BY public.doctor_default_shifts.id;
ALTER SEQUENCE public.doctors_fee_id_seq OWNED BY public.doctors_fee.id;
ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;
ALTER SEQUENCE public.emergency_protocols_id_seq OWNED BY public.emergency_protocols.id;
ALTER SEQUENCE public.financial_forecasts_id_seq OWNED BY public.financial_forecasts.id;
ALTER SEQUENCE public.forecast_models_id_seq OWNED BY public.forecast_models.id;
ALTER SEQUENCE public.gdpr_audit_trail_id_seq OWNED BY public.gdpr_audit_trail.id;
ALTER SEQUENCE public.gdpr_consents_id_seq OWNED BY public.gdpr_consents.id;
ALTER SEQUENCE public.gdpr_data_requests_id_seq OWNED BY public.gdpr_data_requests.id;
ALTER SEQUENCE public.gdpr_processing_activities_id_seq OWNED BY public.gdpr_processing_activities.id;
ALTER SEQUENCE public.imaging_pricing_id_seq OWNED BY public.imaging_pricing.id;
ALTER SEQUENCE public.insurance_verifications_id_seq OWNED BY public.insurance_verifications.id;
ALTER SEQUENCE public.inventory_batches_id_seq OWNED BY public.inventory_batches.id;
ALTER SEQUENCE public.inventory_categories_id_seq OWNED BY public.inventory_categories.id;
ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;
ALTER SEQUENCE public.inventory_purchase_order_items_id_seq OWNED BY public.inventory_purchase_order_items.id;
ALTER SEQUENCE public.inventory_purchase_orders_id_seq OWNED BY public.inventory_purchase_orders.id;
ALTER SEQUENCE public.inventory_sale_items_id_seq OWNED BY public.inventory_sale_items.id;
ALTER SEQUENCE public.inventory_sales_id_seq OWNED BY public.inventory_sales.id;
ALTER SEQUENCE public.inventory_stock_alerts_id_seq OWNED BY public.inventory_stock_alerts.id;
ALTER SEQUENCE public.inventory_stock_movements_id_seq OWNED BY public.inventory_stock_movements.id;
ALTER SEQUENCE public.inventory_suppliers_id_seq OWNED BY public.inventory_suppliers.id;
ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;
ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;
ALTER SEQUENCE public.lab_test_pricing_id_seq OWNED BY public.lab_test_pricing.id;
ALTER SEQUENCE public.letter_drafts_id_seq OWNED BY public.letter_drafts.id;
ALTER SEQUENCE public.medical_images_id_seq OWNED BY public.medical_images.id;
ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.id;
ALTER SEQUENCE public.medications_database_id_seq OWNED BY public.medications_database.id;
ALTER SEQUENCE public.message_campaigns_id_seq OWNED BY public.message_campaigns.id;
ALTER SEQUENCE public.message_templates_id_seq OWNED BY public.message_templates.id;
ALTER SEQUENCE public.muscles_position_id_seq OWNED BY public.muscles_position.id;
ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;
ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;
ALTER SEQUENCE public.patient_communications_id_seq OWNED BY public.patient_communications.id;
ALTER SEQUENCE public.patient_drug_interactions_id_seq OWNED BY public.patient_drug_interactions.id;
ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;
ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;
ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;
ALTER SEQUENCE public.quickbooks_account_mappings_id_seq OWNED BY public.quickbooks_account_mappings.id;
ALTER SEQUENCE public.quickbooks_connections_id_seq OWNED BY public.quickbooks_connections.id;
ALTER SEQUENCE public.quickbooks_customer_mappings_id_seq OWNED BY public.quickbooks_customer_mappings.id;
ALTER SEQUENCE public.quickbooks_invoice_mappings_id_seq OWNED BY public.quickbooks_invoice_mappings.id;
ALTER SEQUENCE public.quickbooks_item_mappings_id_seq OWNED BY public.quickbooks_item_mappings.id;
ALTER SEQUENCE public.quickbooks_payment_mappings_id_seq OWNED BY public.quickbooks_payment_mappings.id;
ALTER SEQUENCE public.quickbooks_sync_configs_id_seq OWNED BY public.quickbooks_sync_configs.id;
ALTER SEQUENCE public.quickbooks_sync_logs_id_seq OWNED BY public.quickbooks_sync_logs.id;
ALTER SEQUENCE public.revenue_records_id_seq OWNED BY public.revenue_records.id;
ALTER SEQUENCE public.risk_assessments_id_seq OWNED BY public.risk_assessments.id;
ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;
ALTER SEQUENCE public.saas_invoices_id_seq OWNED BY public.saas_invoices.id;
ALTER SEQUENCE public.saas_owners_id_seq OWNED BY public.saas_owners.id;
ALTER SEQUENCE public.saas_packages_id_seq OWNED BY public.saas_packages.id;
ALTER SEQUENCE public.saas_payments_id_seq OWNED BY public.saas_payments.id;
ALTER SEQUENCE public.saas_settings_id_seq OWNED BY public.saas_settings.id;
ALTER SEQUENCE public.saas_subscriptions_id_seq OWNED BY public.saas_subscriptions.id;
ALTER SEQUENCE public.staff_shifts_id_seq OWNED BY public.staff_shifts.id;
ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;
ALTER SEQUENCE public.symptom_checks_id_seq OWNED BY public.symptom_checks.id;
ALTER SEQUENCE public.user_document_preferences_id_seq OWNED BY public.user_document_preferences.id;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
