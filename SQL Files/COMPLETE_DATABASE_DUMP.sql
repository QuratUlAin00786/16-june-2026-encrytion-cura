--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_insights (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer,
    type character varying(30) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    action_required boolean DEFAULT false NOT NULL,
    confidence character varying(10),
    metadata jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    ai_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_insights OWNER TO neondb_owner;

--
-- Name: ai_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ai_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_insights_id_seq OWNER TO neondb_owner;

--
-- Name: ai_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ai_insights_id_seq OWNED BY public.ai_insights.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    assigned_role character varying(50),
    title text NOT NULL,
    description text,
    scheduled_at timestamp without time zone NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    type character varying(20) DEFAULT 'consultation'::character varying NOT NULL,
    location text,
    is_virtual boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.appointments OWNER TO neondb_owner;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO neondb_owner;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: chatbot_analytics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_analytics (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    config_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    total_sessions integer DEFAULT 0,
    completed_sessions integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    appointments_booked integer DEFAULT 0,
    prescription_requests integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_analytics OWNER TO neondb_owner;

--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_analytics_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_analytics_id_seq OWNED BY public.chatbot_analytics.id;


--
-- Name: chatbot_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_configs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text DEFAULT 'Healthcare Assistant'::text NOT NULL,
    description text DEFAULT 'AI-powered healthcare assistant'::text,
    is_active boolean DEFAULT true NOT NULL,
    primary_color text DEFAULT '#4A7DFF'::text,
    welcome_message text DEFAULT 'Hello! I can help with appointments and prescriptions.'::text,
    appointment_booking_enabled boolean DEFAULT true NOT NULL,
    prescription_requests_enabled boolean DEFAULT true NOT NULL,
    api_key text NOT NULL,
    embed_code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_configs OWNER TO neondb_owner;

--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_configs_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_configs_id_seq OWNED BY public.chatbot_configs.id;


--
-- Name: chatbot_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_messages (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    session_id integer NOT NULL,
    message_id text NOT NULL,
    sender character varying(10) NOT NULL,
    message_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    content text NOT NULL,
    intent text,
    confidence real,
    ai_processed boolean DEFAULT false NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_messages OWNER TO neondb_owner;

--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_messages_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_messages_id_seq OWNED BY public.chatbot_messages.id;


--
-- Name: chatbot_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_sessions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    config_id integer NOT NULL,
    session_id text NOT NULL,
    visitor_id text,
    patient_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    current_intent text,
    extracted_patient_name text,
    extracted_phone text,
    extracted_email text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_sessions OWNER TO neondb_owner;

--
-- Name: chatbot_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_sessions_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_sessions_id_seq OWNED BY public.chatbot_sessions.id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.claims (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    claim_number character varying(50) NOT NULL,
    service_date timestamp without time zone NOT NULL,
    submission_date timestamp without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_amount numeric(10,2),
    payment_date timestamp without time zone,
    denial_reason text,
    insurance_provider text NOT NULL,
    procedures jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.claims OWNER TO neondb_owner;

--
-- Name: claims_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claims_id_seq OWNER TO neondb_owner;

--
-- Name: claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.claims_id_seq OWNED BY public.claims.id;


--
-- Name: clinical_photos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clinical_photos (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    captured_by integer NOT NULL,
    type character varying(50) NOT NULL,
    description text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) DEFAULT 'image/png'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ai_analysis jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clinical_photos OWNER TO neondb_owner;

--
-- Name: clinical_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clinical_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_photos_id_seq OWNER TO neondb_owner;

--
-- Name: clinical_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clinical_photos_id_seq OWNED BY public.clinical_photos.id;


--
-- Name: clinical_procedures; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clinical_procedures (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    category character varying(50) NOT NULL,
    duration text NOT NULL,
    complexity character varying(20) NOT NULL,
    prerequisites jsonb DEFAULT '[]'::jsonb,
    steps jsonb DEFAULT '[]'::jsonb,
    complications jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clinical_procedures OWNER TO neondb_owner;

--
-- Name: clinical_procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clinical_procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_procedures_id_seq OWNER TO neondb_owner;

--
-- Name: clinical_procedures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clinical_procedures_id_seq OWNED BY public.clinical_procedures.id;


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.consultations (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    appointment_id integer,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    consultation_type character varying(20) NOT NULL,
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
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.consultations OWNER TO neondb_owner;

--
-- Name: consultations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.consultations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consultations_id_seq OWNER TO neondb_owner;

--
-- Name: consultations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.consultations_id_seq OWNED BY public.consultations.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.conversations (
    id character varying(50) NOT NULL,
    organization_id integer NOT NULL,
    participants jsonb NOT NULL,
    last_message jsonb,
    unread_count integer DEFAULT 0 NOT NULL,
    is_patient_conversation boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.conversations OWNER TO neondb_owner;

--
-- Name: doctor_default_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctor_default_shifts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    start_time character varying(5) DEFAULT '09:00'::character varying NOT NULL,
    end_time character varying(5) DEFAULT '17:00'::character varying NOT NULL,
    working_days text[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.doctor_default_shifts OWNER TO neondb_owner;

--
-- Name: doctor_default_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.doctor_default_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_default_shifts_id_seq OWNER TO neondb_owner;

--
-- Name: doctor_default_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.doctor_default_shifts_id_seq OWNED BY public.doctor_default_shifts.id;


--
-- Name: doctors_fee; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctors_fee (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    doctor_id integer,
    doctor_name text,
    doctor_role character varying(50),
    service_name text NOT NULL,
    service_code character varying(50),
    category character varying(100),
    base_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.doctors_fee OWNER TO neondb_owner;

--
-- Name: doctors_fee_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.doctors_fee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctors_fee_id_seq OWNER TO neondb_owner;

--
-- Name: doctors_fee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.doctors_fee_id_seq OWNED BY public.doctors_fee.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    type character varying(50) DEFAULT 'medical_form'::character varying NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_template boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: emergency_protocols; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.emergency_protocols (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    title text NOT NULL,
    priority character varying(20) NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.emergency_protocols OWNER TO neondb_owner;

--
-- Name: emergency_protocols_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.emergency_protocols_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergency_protocols_id_seq OWNER TO neondb_owner;

--
-- Name: emergency_protocols_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.emergency_protocols_id_seq OWNED BY public.emergency_protocols.id;


--
-- Name: financial_forecasts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.financial_forecasts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    category text NOT NULL,
    forecast_period character varying(7) NOT NULL,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    current_value numeric(12,2) NOT NULL,
    projected_value numeric(12,2) NOT NULL,
    variance numeric(12,2) NOT NULL,
    trend character varying(10) NOT NULL,
    confidence integer NOT NULL,
    methodology character varying(30) DEFAULT 'historical_trend'::character varying NOT NULL,
    key_factors jsonb DEFAULT '[]'::jsonb,
    model_id integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.financial_forecasts OWNER TO neondb_owner;

--
-- Name: financial_forecasts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.financial_forecasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.financial_forecasts_id_seq OWNER TO neondb_owner;

--
-- Name: financial_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.financial_forecasts_id_seq OWNED BY public.financial_forecasts.id;


--
-- Name: forecast_models; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.forecast_models (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    type character varying(30) NOT NULL,
    algorithm character varying(20) DEFAULT 'linear'::character varying NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb,
    accuracy numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.forecast_models OWNER TO neondb_owner;

--
-- Name: forecast_models_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.forecast_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forecast_models_id_seq OWNER TO neondb_owner;

--
-- Name: forecast_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.forecast_models_id_seq OWNED BY public.forecast_models.id;


--
-- Name: gdpr_audit_trail; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_audit_trail (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer,
    patient_id integer,
    action character varying(50) NOT NULL,
    resource_type character varying(30) NOT NULL,
    resource_id integer,
    data_categories jsonb DEFAULT '[]'::jsonb,
    legal_basis character varying(50),
    purpose text,
    changes jsonb DEFAULT '[]'::jsonb,
    ip_address character varying(45),
    user_agent text,
    session_id character varying(100),
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.gdpr_audit_trail OWNER TO neondb_owner;

--
-- Name: gdpr_audit_trail_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_audit_trail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_audit_trail_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_audit_trail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_audit_trail_id_seq OWNED BY public.gdpr_audit_trail.id;


--
-- Name: gdpr_consents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_consents (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    consent_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    granted_at timestamp without time zone,
    withdrawn_at timestamp without time zone,
    expires_at timestamp without time zone,
    purpose text NOT NULL,
    legal_basis character varying(50) NOT NULL,
    data_categories jsonb DEFAULT '[]'::jsonb,
    retention_period integer,
    ip_address character varying(45),
    user_agent text,
    consent_method character varying(30) DEFAULT 'digital'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gdpr_consents OWNER TO neondb_owner;

--
-- Name: gdpr_consents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_consents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_consents_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_consents_id_seq OWNED BY public.gdpr_consents.id;


--
-- Name: gdpr_data_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_data_requests (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    request_type character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    request_reason text,
    identity_verified boolean DEFAULT false NOT NULL,
    processed_by integer,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    due_date timestamp without time zone NOT NULL,
    response_data jsonb DEFAULT '{}'::jsonb,
    rejection_reason text,
    communication_log jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gdpr_data_requests OWNER TO neondb_owner;

--
-- Name: gdpr_data_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_data_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_data_requests_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_data_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_data_requests_id_seq OWNED BY public.gdpr_data_requests.id;


--
-- Name: gdpr_processing_activities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_processing_activities (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    activity_name text NOT NULL,
    purpose text NOT NULL,
    legal_basis character varying(50) NOT NULL,
    data_categories jsonb DEFAULT '[]'::jsonb,
    data_subjects jsonb DEFAULT '[]'::jsonb,
    recipients jsonb DEFAULT '[]'::jsonb,
    international_transfers jsonb DEFAULT '[]'::jsonb,
    retention_period integer,
    security_measures jsonb DEFAULT '[]'::jsonb,
    dpia_required boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    review_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gdpr_processing_activities OWNER TO neondb_owner;

--
-- Name: gdpr_processing_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_processing_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_processing_activities_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_processing_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_processing_activities_id_seq OWNED BY public.gdpr_processing_activities.id;


--
-- Name: imaging_pricing; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.imaging_pricing (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    imaging_type text NOT NULL,
    imaging_code character varying(50),
    modality character varying(50),
    body_part character varying(100),
    category character varying(100),
    base_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.imaging_pricing OWNER TO neondb_owner;

--
-- Name: imaging_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.imaging_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imaging_pricing_id_seq OWNER TO neondb_owner;

--
-- Name: imaging_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.imaging_pricing_id_seq OWNED BY public.imaging_pricing.id;


--
-- Name: insurance_verifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.insurance_verifications (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    patient_name text NOT NULL,
    provider text NOT NULL,
    policy_number text NOT NULL,
    group_number text,
    member_number text,
    nhs_number text,
    plan_type text,
    coverage_type character varying(20) DEFAULT 'primary'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    eligibility_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    effective_date date,
    expiration_date date,
    last_verified date,
    benefits jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.insurance_verifications OWNER TO neondb_owner;

--
-- Name: insurance_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.insurance_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurance_verifications_id_seq OWNER TO neondb_owner;

--
-- Name: insurance_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.insurance_verifications_id_seq OWNED BY public.insurance_verifications.id;


--
-- Name: inventory_batches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_batches (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_number character varying(100) NOT NULL,
    expiry_date timestamp without time zone,
    manufacture_date timestamp without time zone,
    quantity integer NOT NULL,
    remaining_quantity integer DEFAULT 0 NOT NULL,
    purchase_price numeric(10,2) NOT NULL,
    supplier_id integer,
    received_date timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_expired boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_batches OWNER TO neondb_owner;

--
-- Name: inventory_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_batches_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_batches_id_seq OWNED BY public.inventory_batches.id;


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_categories (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    description text,
    parent_category_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_categories OWNER TO neondb_owner;

--
-- Name: inventory_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_categories_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_categories_id_seq OWNED BY public.inventory_categories.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    category_id integer NOT NULL,
    name text NOT NULL,
    description text,
    sku character varying(100) NOT NULL,
    barcode character varying(100),
    generic_name text,
    brand_name text,
    manufacturer text,
    unit_of_measurement character varying(20) DEFAULT 'pieces'::character varying NOT NULL,
    pack_size integer DEFAULT 1 NOT NULL,
    purchase_price numeric(10,2) NOT NULL,
    sale_price numeric(10,2) NOT NULL,
    mrp numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 0.00 NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    minimum_stock integer DEFAULT 10 NOT NULL,
    maximum_stock integer DEFAULT 1000 NOT NULL,
    reorder_point integer DEFAULT 20 NOT NULL,
    expiry_tracking boolean DEFAULT false NOT NULL,
    batch_tracking boolean DEFAULT false NOT NULL,
    prescription_required boolean DEFAULT false NOT NULL,
    storage_conditions text,
    side_effects text,
    contraindications text,
    dosage_instructions text,
    is_active boolean DEFAULT true NOT NULL,
    is_discontinued boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO neondb_owner;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_items_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: inventory_purchase_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_purchase_order_items (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_purchase_order_items OWNER TO neondb_owner;

--
-- Name: inventory_purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_purchase_order_items_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_purchase_order_items_id_seq OWNED BY public.inventory_purchase_order_items.id;


--
-- Name: inventory_purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_purchase_orders (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    po_number character varying(100) NOT NULL,
    supplier_id integer NOT NULL,
    order_date timestamp without time zone DEFAULT now() NOT NULL,
    expected_delivery_date timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    notes text,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    email_sent boolean DEFAULT false NOT NULL,
    email_sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_purchase_orders OWNER TO neondb_owner;

--
-- Name: inventory_purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_purchase_orders_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_purchase_orders_id_seq OWNED BY public.inventory_purchase_orders.id;


--
-- Name: inventory_sale_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_sale_items (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    sale_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_sale_items OWNER TO neondb_owner;

--
-- Name: inventory_sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sale_items_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_sale_items_id_seq OWNED BY public.inventory_sale_items.id;


--
-- Name: inventory_sales; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_sales (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer,
    sale_number character varying(100) NOT NULL,
    sale_date timestamp without time zone DEFAULT now() NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying NOT NULL,
    payment_status character varying(20) DEFAULT 'paid'::character varying NOT NULL,
    prescription_id integer,
    sold_by integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_sales OWNER TO neondb_owner;

--
-- Name: inventory_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sales_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_sales_id_seq OWNED BY public.inventory_sales.id;


--
-- Name: inventory_stock_alerts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_stock_alerts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    alert_type character varying(20) NOT NULL,
    threshold_value integer NOT NULL,
    current_value integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    message text,
    is_read boolean DEFAULT false NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_by integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_stock_alerts OWNER TO neondb_owner;

--
-- Name: inventory_stock_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_stock_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_stock_alerts_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_stock_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_stock_alerts_id_seq OWNED BY public.inventory_stock_alerts.id;


--
-- Name: inventory_stock_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_stock_movements (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    unit_cost numeric(10,2),
    reference_type character varying(50),
    reference_id integer,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_stock_movements OWNER TO neondb_owner;

--
-- Name: inventory_stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_stock_movements_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_stock_movements_id_seq OWNED BY public.inventory_stock_movements.id;


--
-- Name: inventory_suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_suppliers (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone character varying(20),
    address text,
    city text,
    country text DEFAULT 'UK'::text NOT NULL,
    tax_id character varying(50),
    payment_terms character varying(100) DEFAULT 'Net 30'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_suppliers OWNER TO neondb_owner;

--
-- Name: inventory_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_suppliers_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_suppliers_id_seq OWNED BY public.inventory_suppliers.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    patient_id text NOT NULL,
    patient_name text NOT NULL,
    nhs_number character varying(10),
    date_of_service timestamp without time zone NOT NULL,
    invoice_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    invoice_type character varying(50) DEFAULT 'payment'::character varying NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    items jsonb NOT NULL,
    insurance jsonb,
    payments jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_results (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    test_id character varying(50) NOT NULL,
    test_type text NOT NULL,
    ordered_by integer NOT NULL,
    doctor_name text,
    main_specialty text,
    sub_specialty text,
    priority character varying(20) DEFAULT 'routine'::character varying,
    ordered_at timestamp without time zone NOT NULL,
    collected_at timestamp without time zone,
    completed_at timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    results jsonb DEFAULT '[]'::jsonb,
    critical_values boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_results OWNER TO neondb_owner;

--
-- Name: lab_results_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.lab_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_results_id_seq OWNER TO neondb_owner;

--
-- Name: lab_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;


--
-- Name: lab_test_pricing; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_test_pricing (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    doctor_id integer,
    doctor_name text,
    doctor_role character varying(50),
    test_name text NOT NULL,
    test_code character varying(50),
    category character varying(100),
    base_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_test_pricing OWNER TO neondb_owner;

--
-- Name: lab_test_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.lab_test_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_test_pricing_id_seq OWNER TO neondb_owner;

--
-- Name: lab_test_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.lab_test_pricing_id_seq OWNED BY public.lab_test_pricing.id;


--
-- Name: letter_drafts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.letter_drafts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    subject text NOT NULL,
    recipient text NOT NULL,
    doctor_email text,
    location text,
    copied_recipients text,
    header text,
    document_content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.letter_drafts OWNER TO neondb_owner;

--
-- Name: letter_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.letter_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.letter_drafts_id_seq OWNER TO neondb_owner;

--
-- Name: letter_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.letter_drafts_id_seq OWNED BY public.letter_drafts.id;


--
-- Name: medical_images; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medical_images (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    study_type text NOT NULL,
    modality character varying(50) NOT NULL,
    body_part text,
    indication text,
    priority character varying(20) DEFAULT 'routine'::character varying NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    image_data text,
    status character varying(20) DEFAULT 'uploaded'::character varying NOT NULL,
    findings text,
    impression text,
    radiologist text,
    report_file_name text,
    report_file_path text,
    metadata jsonb DEFAULT '{}'::jsonb,
    scheduled_at timestamp without time zone,
    performed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    image_id text NOT NULL
);


ALTER TABLE public.medical_images OWNER TO neondb_owner;

--
-- Name: medical_images_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medical_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medical_images_id_seq OWNER TO neondb_owner;

--
-- Name: medical_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medical_images_id_seq OWNED BY public.medical_images.id;


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medical_records (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    type character varying(20) NOT NULL,
    title text NOT NULL,
    notes text,
    diagnosis text,
    treatment text,
    prescription jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    ai_suggestions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medical_records OWNER TO neondb_owner;

--
-- Name: medical_records_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medical_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medical_records_id_seq OWNER TO neondb_owner;

--
-- Name: medical_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.id;


--
-- Name: medications_database; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medications_database (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    dosage text NOT NULL,
    interactions jsonb DEFAULT '[]'::jsonb,
    warnings jsonb DEFAULT '[]'::jsonb,
    severity character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medications_database OWNER TO neondb_owner;

--
-- Name: medications_database_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medications_database_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medications_database_id_seq OWNER TO neondb_owner;

--
-- Name: medications_database_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medications_database_id_seq OWNED BY public.medications_database.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id character varying(50) NOT NULL,
    organization_id integer NOT NULL,
    conversation_id character varying(50) NOT NULL,
    sender_id integer NOT NULL,
    sender_name text NOT NULL,
    sender_role character varying(20) NOT NULL,
    recipient_id text,
    recipient_name text,
    subject text NOT NULL,
    content text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    priority character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    type character varying(20) DEFAULT 'internal'::character varying NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    phone_number character varying(20),
    message_type character varying(10),
    delivery_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    external_message_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: muscles_position; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.muscles_position (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    consultation_id integer,
    "position" integer NOT NULL,
    value text NOT NULL,
    coordinates jsonb,
    is_detected boolean DEFAULT false NOT NULL,
    detected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.muscles_position OWNER TO neondb_owner;

--
-- Name: muscles_position_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.muscles_position_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.muscles_position_id_seq OWNER TO neondb_owner;

--
-- Name: muscles_position_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.muscles_position_id_seq OWNED BY public.muscles_position.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    status character varying(20) DEFAULT 'unread'::character varying NOT NULL,
    related_entity_type character varying(50),
    related_entity_id integer,
    action_url text,
    is_actionable boolean DEFAULT false NOT NULL,
    scheduled_for timestamp without time zone,
    expires_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    read_at timestamp without time zone,
    dismissed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    subdomain character varying(50) NOT NULL,
    email text NOT NULL,
    region character varying(10) DEFAULT 'UK'::character varying NOT NULL,
    brand_name text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    features jsonb DEFAULT '{}'::jsonb,
    access_level character varying(50) DEFAULT 'full'::character varying,
    subscription_status character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: patient_communications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patient_communications (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    sent_by integer NOT NULL,
    type character varying(50) NOT NULL,
    method character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    message text NOT NULL,
    scheduled_for timestamp without time zone,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_communications OWNER TO neondb_owner;

--
-- Name: patient_communications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patient_communications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_communications_id_seq OWNER TO neondb_owner;

--
-- Name: patient_communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patient_communications_id_seq OWNED BY public.patient_communications.id;


--
-- Name: patient_drug_interactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patient_drug_interactions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    medication1_name text NOT NULL,
    medication1_dosage text NOT NULL,
    medication1_frequency text,
    medication2_name text NOT NULL,
    medication2_dosage text NOT NULL,
    medication2_frequency text,
    interaction_type character varying(50),
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    description text,
    warnings jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    reported_by integer,
    reported_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_drug_interactions OWNER TO neondb_owner;

--
-- Name: patient_drug_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patient_drug_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_drug_interactions_id_seq OWNER TO neondb_owner;

--
-- Name: patient_drug_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patient_drug_interactions_id_seq OWNED BY public.patient_drug_interactions.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer,
    patient_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    gender_at_birth character varying(20),
    email text,
    phone text,
    nhs_number text,
    address jsonb DEFAULT '{}'::jsonb,
    insurance_info jsonb DEFAULT '{}'::jsonb,
    emergency_contact jsonb DEFAULT '{}'::jsonb,
    medical_history jsonb DEFAULT '{}'::jsonb,
    risk_level character varying(10) DEFAULT 'low'::character varying NOT NULL,
    flags text[] DEFAULT '{}'::text[],
    communication_preferences jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_insured boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    invoice_id integer NOT NULL,
    patient_id text NOT NULL,
    transaction_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_provider character varying(50),
    payment_status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    payment_date timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prescriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    prescription_created_by integer,
    consultation_id integer,
    prescription_number character varying(50),
    status text DEFAULT 'active'::text NOT NULL,
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
    is_electronic boolean DEFAULT true NOT NULL,
    interactions jsonb DEFAULT '[]'::jsonb,
    signature jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.prescriptions OWNER TO neondb_owner;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescriptions_id_seq OWNER TO neondb_owner;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;


--
-- Name: quickbooks_account_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_account_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_account_type character varying(50) NOT NULL,
    emr_account_name text NOT NULL,
    quickbooks_account_id text NOT NULL,
    quickbooks_account_name text NOT NULL,
    account_type character varying(50) NOT NULL,
    account_sub_type character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_account_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_account_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_account_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_account_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_account_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_account_mappings_id_seq OWNED BY public.quickbooks_account_mappings.id;


--
-- Name: quickbooks_connections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_connections (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    company_id text NOT NULL,
    company_name text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expiry timestamp without time zone NOT NULL,
    realm_id text NOT NULL,
    base_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp without time zone,
    sync_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_connections OWNER TO neondb_owner;

--
-- Name: quickbooks_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_connections_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_connections_id_seq OWNED BY public.quickbooks_connections.id;


--
-- Name: quickbooks_customer_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_customer_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    patient_id integer NOT NULL,
    quickbooks_customer_id text NOT NULL,
    quickbooks_display_name text,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_customer_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_customer_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_customer_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_customer_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_customer_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_customer_mappings_id_seq OWNED BY public.quickbooks_customer_mappings.id;


--
-- Name: quickbooks_invoice_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_invoice_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_invoice_id text NOT NULL,
    quickbooks_invoice_id text NOT NULL,
    quickbooks_invoice_number text,
    patient_id integer NOT NULL,
    customer_id integer,
    amount numeric(10,2) NOT NULL,
    status character varying(20) NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_invoice_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_invoice_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_invoice_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_invoice_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_invoice_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_invoice_mappings_id_seq OWNED BY public.quickbooks_invoice_mappings.id;


--
-- Name: quickbooks_item_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_item_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_item_type character varying(50) NOT NULL,
    emr_item_id text NOT NULL,
    emr_item_name text NOT NULL,
    quickbooks_item_id text NOT NULL,
    quickbooks_item_name text NOT NULL,
    item_type character varying(20) NOT NULL,
    unit_price numeric(10,2),
    description text,
    income_account_id text,
    expense_account_id text,
    is_active boolean DEFAULT true NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_item_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_item_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_item_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_item_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_item_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_item_mappings_id_seq OWNED BY public.quickbooks_item_mappings.id;


--
-- Name: quickbooks_payment_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_payment_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_payment_id text NOT NULL,
    quickbooks_payment_id text NOT NULL,
    invoice_mapping_id integer,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_payment_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_payment_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_payment_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_payment_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_payment_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_payment_mappings_id_seq OWNED BY public.quickbooks_payment_mappings.id;


--
-- Name: quickbooks_sync_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_sync_configs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    config_type character varying(50) NOT NULL,
    config_name text NOT NULL,
    config_value jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_sync_configs OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_sync_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_sync_configs_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_sync_configs_id_seq OWNED BY public.quickbooks_sync_configs.id;


--
-- Name: quickbooks_sync_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_sync_logs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    sync_type character varying(50) NOT NULL,
    operation character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    records_processed integer DEFAULT 0,
    records_successful integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    error_message text,
    error_details jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_sync_logs OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_sync_logs_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_sync_logs_id_seq OWNED BY public.quickbooks_sync_logs.id;


--
-- Name: revenue_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.revenue_records (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    month character varying(7) NOT NULL,
    revenue numeric(12,2) NOT NULL,
    expenses numeric(12,2) NOT NULL,
    profit numeric(12,2) NOT NULL,
    collections numeric(12,2) NOT NULL,
    target numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.revenue_records OWNER TO neondb_owner;

--
-- Name: revenue_records_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.revenue_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revenue_records_id_seq OWNER TO neondb_owner;

--
-- Name: revenue_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.revenue_records_id_seq OWNED BY public.revenue_records.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name text NOT NULL,
    description text NOT NULL,
    permissions jsonb NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: saas_invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_invoices (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    subscription_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    issue_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    paid_date timestamp without time zone,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_invoices OWNER TO neondb_owner;

--
-- Name: saas_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_invoices_id_seq OWNER TO neondb_owner;

--
-- Name: saas_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_invoices_id_seq OWNED BY public.saas_invoices.id;


--
-- Name: saas_owners; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_owners (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_owners OWNER TO neondb_owner;

--
-- Name: saas_owners_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_owners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_owners_id_seq OWNER TO neondb_owner;

--
-- Name: saas_owners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_owners_id_seq OWNED BY public.saas_owners.id;


--
-- Name: saas_packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_packages (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    features jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    show_on_website boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_packages OWNER TO neondb_owner;

--
-- Name: saas_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_packages_id_seq OWNER TO neondb_owner;

--
-- Name: saas_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_packages_id_seq OWNED BY public.saas_packages.id;


--
-- Name: saas_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_payments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    subscription_id integer,
    invoice_number character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_date timestamp without time zone,
    due_date timestamp without time zone NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    payment_provider character varying(50),
    provider_transaction_id text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_payments OWNER TO neondb_owner;

--
-- Name: saas_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_payments_id_seq OWNER TO neondb_owner;

--
-- Name: saas_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_payments_id_seq OWNED BY public.saas_payments.id;


--
-- Name: saas_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb,
    description text,
    category character varying(50) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_settings OWNER TO neondb_owner;

--
-- Name: saas_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_settings_id_seq OWNER TO neondb_owner;

--
-- Name: saas_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_settings_id_seq OWNED BY public.saas_settings.id;


--
-- Name: saas_subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_subscriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    package_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    current_period_start timestamp without time zone NOT NULL,
    current_period_end timestamp without time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    trial_end timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_subscriptions OWNER TO neondb_owner;

--
-- Name: saas_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: saas_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_subscriptions_id_seq OWNED BY public.saas_subscriptions.id;


--
-- Name: staff_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.staff_shifts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    staff_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    shift_type character varying(20) DEFAULT 'regular'::character varying NOT NULL,
    start_time character varying(5) NOT NULL,
    end_time character varying(5) NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    notes text,
    is_available boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_shifts OWNER TO neondb_owner;

--
-- Name: staff_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.staff_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_shifts_id_seq OWNER TO neondb_owner;

--
-- Name: staff_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.staff_shifts_id_seq OWNED BY public.staff_shifts.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    plan_name text NOT NULL,
    plan character varying(20),
    status character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    user_limit integer DEFAULT 5 NOT NULL,
    current_users integer DEFAULT 0 NOT NULL,
    monthly_price numeric(10,2),
    trial_ends_at timestamp without time zone,
    next_billing_at timestamp without time zone,
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO neondb_owner;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: symptom_checks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.symptom_checks (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    user_id integer,
    symptoms text[] NOT NULL,
    symptom_description text NOT NULL,
    duration text,
    severity character varying(20),
    ai_analysis jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    appointment_created boolean DEFAULT false NOT NULL,
    appointment_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.symptom_checks OWNER TO neondb_owner;

--
-- Name: symptom_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.symptom_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.symptom_checks_id_seq OWNER TO neondb_owner;

--
-- Name: symptom_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.symptom_checks_id_seq OWNED BY public.symptom_checks.id;


--
-- Name: user_document_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_document_preferences (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    clinic_info jsonb DEFAULT '{}'::jsonb,
    header_preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_document_preferences OWNER TO neondb_owner;

--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_document_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_document_preferences_id_seq OWNER TO neondb_owner;

--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_document_preferences_id_seq OWNED BY public.user_document_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role character varying(20) DEFAULT 'doctor'::character varying NOT NULL,
    department text,
    medical_specialty_category text,
    sub_specialty text,
    working_days jsonb DEFAULT '[]'::jsonb,
    working_hours jsonb DEFAULT '{}'::jsonb,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_saas_owner boolean DEFAULT false NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voice_notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.voice_notes (
    id character varying NOT NULL,
    organization_id integer NOT NULL,
    patient_id character varying NOT NULL,
    patient_name text NOT NULL,
    provider_id character varying NOT NULL,
    provider_name text NOT NULL,
    type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    recording_duration integer,
    transcript text,
    confidence real,
    medical_terms jsonb DEFAULT '[]'::jsonb,
    structured_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.voice_notes OWNER TO neondb_owner;

--
-- Name: ai_insights id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights ALTER COLUMN id SET DEFAULT nextval('public.ai_insights_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: chatbot_analytics id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics ALTER COLUMN id SET DEFAULT nextval('public.chatbot_analytics_id_seq'::regclass);


--
-- Name: chatbot_configs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_configs ALTER COLUMN id SET DEFAULT nextval('public.chatbot_configs_id_seq'::regclass);


--
-- Name: chatbot_messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages ALTER COLUMN id SET DEFAULT nextval('public.chatbot_messages_id_seq'::regclass);


--
-- Name: chatbot_sessions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions ALTER COLUMN id SET DEFAULT nextval('public.chatbot_sessions_id_seq'::regclass);


--
-- Name: claims id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims ALTER COLUMN id SET DEFAULT nextval('public.claims_id_seq'::regclass);


--
-- Name: clinical_photos id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos ALTER COLUMN id SET DEFAULT nextval('public.clinical_photos_id_seq'::regclass);


--
-- Name: clinical_procedures id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_procedures ALTER COLUMN id SET DEFAULT nextval('public.clinical_procedures_id_seq'::regclass);


--
-- Name: consultations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.consultations ALTER COLUMN id SET DEFAULT nextval('public.consultations_id_seq'::regclass);


--
-- Name: doctor_default_shifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_default_shifts ALTER COLUMN id SET DEFAULT nextval('public.doctor_default_shifts_id_seq'::regclass);


--
-- Name: doctors_fee id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee ALTER COLUMN id SET DEFAULT nextval('public.doctors_fee_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: emergency_protocols id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.emergency_protocols ALTER COLUMN id SET DEFAULT nextval('public.emergency_protocols_id_seq'::regclass);


--
-- Name: financial_forecasts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts ALTER COLUMN id SET DEFAULT nextval('public.financial_forecasts_id_seq'::regclass);


--
-- Name: forecast_models id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.forecast_models ALTER COLUMN id SET DEFAULT nextval('public.forecast_models_id_seq'::regclass);


--
-- Name: gdpr_audit_trail id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail ALTER COLUMN id SET DEFAULT nextval('public.gdpr_audit_trail_id_seq'::regclass);


--
-- Name: gdpr_consents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents ALTER COLUMN id SET DEFAULT nextval('public.gdpr_consents_id_seq'::regclass);


--
-- Name: gdpr_data_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests ALTER COLUMN id SET DEFAULT nextval('public.gdpr_data_requests_id_seq'::regclass);


--
-- Name: gdpr_processing_activities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_processing_activities ALTER COLUMN id SET DEFAULT nextval('public.gdpr_processing_activities_id_seq'::regclass);


--
-- Name: imaging_pricing id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing ALTER COLUMN id SET DEFAULT nextval('public.imaging_pricing_id_seq'::regclass);


--
-- Name: insurance_verifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications ALTER COLUMN id SET DEFAULT nextval('public.insurance_verifications_id_seq'::regclass);


--
-- Name: inventory_batches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_batches ALTER COLUMN id SET DEFAULT nextval('public.inventory_batches_id_seq'::regclass);


--
-- Name: inventory_categories id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_categories ALTER COLUMN id SET DEFAULT nextval('public.inventory_categories_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: inventory_purchase_order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_purchase_order_items_id_seq'::regclass);


--
-- Name: inventory_purchase_orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.inventory_purchase_orders_id_seq'::regclass);


--
-- Name: inventory_sale_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sale_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_sale_items_id_seq'::regclass);


--
-- Name: inventory_sales id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sales ALTER COLUMN id SET DEFAULT nextval('public.inventory_sales_id_seq'::regclass);


--
-- Name: inventory_stock_alerts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_alerts ALTER COLUMN id SET DEFAULT nextval('public.inventory_stock_alerts_id_seq'::regclass);


--
-- Name: inventory_stock_movements id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_stock_movements_id_seq'::regclass);


--
-- Name: inventory_suppliers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_suppliers ALTER COLUMN id SET DEFAULT nextval('public.inventory_suppliers_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);


--
-- Name: lab_test_pricing id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing ALTER COLUMN id SET DEFAULT nextval('public.lab_test_pricing_id_seq'::regclass);


--
-- Name: letter_drafts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.letter_drafts ALTER COLUMN id SET DEFAULT nextval('public.letter_drafts_id_seq'::regclass);


--
-- Name: medical_images id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images ALTER COLUMN id SET DEFAULT nextval('public.medical_images_id_seq'::regclass);


--
-- Name: medical_records id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records ALTER COLUMN id SET DEFAULT nextval('public.medical_records_id_seq'::regclass);


--
-- Name: medications_database id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications_database ALTER COLUMN id SET DEFAULT nextval('public.medications_database_id_seq'::regclass);


--
-- Name: muscles_position id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.muscles_position ALTER COLUMN id SET DEFAULT nextval('public.muscles_position_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: patient_communications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications ALTER COLUMN id SET DEFAULT nextval('public.patient_communications_id_seq'::regclass);


--
-- Name: patient_drug_interactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions ALTER COLUMN id SET DEFAULT nextval('public.patient_drug_interactions_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);


--
-- Name: quickbooks_account_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_account_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_account_mappings_id_seq'::regclass);


--
-- Name: quickbooks_connections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_connections ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_connections_id_seq'::regclass);


--
-- Name: quickbooks_customer_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_customer_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_customer_mappings_id_seq'::regclass);


--
-- Name: quickbooks_invoice_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_invoice_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_invoice_mappings_id_seq'::regclass);


--
-- Name: quickbooks_item_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_item_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_item_mappings_id_seq'::regclass);


--
-- Name: quickbooks_payment_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_payment_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_payment_mappings_id_seq'::regclass);


--
-- Name: quickbooks_sync_configs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_configs ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_sync_configs_id_seq'::regclass);


--
-- Name: quickbooks_sync_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_sync_logs_id_seq'::regclass);


--
-- Name: revenue_records id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records ALTER COLUMN id SET DEFAULT nextval('public.revenue_records_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: saas_invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_invoices ALTER COLUMN id SET DEFAULT nextval('public.saas_invoices_id_seq'::regclass);


--
-- Name: saas_owners id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners ALTER COLUMN id SET DEFAULT nextval('public.saas_owners_id_seq'::regclass);


--
-- Name: saas_packages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_packages ALTER COLUMN id SET DEFAULT nextval('public.saas_packages_id_seq'::regclass);


--
-- Name: saas_payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_payments ALTER COLUMN id SET DEFAULT nextval('public.saas_payments_id_seq'::regclass);


--
-- Name: saas_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_settings ALTER COLUMN id SET DEFAULT nextval('public.saas_settings_id_seq'::regclass);


--
-- Name: saas_subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.saas_subscriptions_id_seq'::regclass);


--
-- Name: staff_shifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_shifts ALTER COLUMN id SET DEFAULT nextval('public.staff_shifts_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: symptom_checks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks ALTER COLUMN id SET DEFAULT nextval('public.symptom_checks_id_seq'::regclass);


--
-- Name: user_document_preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_document_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_document_preferences_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_insights; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.ai_insights VALUES (1, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 13:17:28.318226');
INSERT INTO public.ai_insights VALUES (2, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 13:17:28.318226');
INSERT INTO public.ai_insights VALUES (3, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 13:17:28.318226');
INSERT INTO public.ai_insights VALUES (4, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 13:17:28.318226');
INSERT INTO public.ai_insights VALUES (5, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 13:17:28.318226');
INSERT INTO public.ai_insights VALUES (6, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 13:49:29.917753');
INSERT INTO public.ai_insights VALUES (7, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 13:49:29.917753');
INSERT INTO public.ai_insights VALUES (8, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 13:49:29.917753');
INSERT INTO public.ai_insights VALUES (9, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 13:49:29.917753');
INSERT INTO public.ai_insights VALUES (10, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 13:49:29.917753');
INSERT INTO public.ai_insights VALUES (11, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 14:02:56.46925');
INSERT INTO public.ai_insights VALUES (12, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 14:02:56.46925');
INSERT INTO public.ai_insights VALUES (13, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 14:02:56.46925');
INSERT INTO public.ai_insights VALUES (14, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 14:02:56.46925');
INSERT INTO public.ai_insights VALUES (15, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 14:02:56.46925');
INSERT INTO public.ai_insights VALUES (16, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 14:10:30.701985');
INSERT INTO public.ai_insights VALUES (17, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 14:10:30.701985');
INSERT INTO public.ai_insights VALUES (18, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 14:10:30.701985');
INSERT INTO public.ai_insights VALUES (19, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 14:10:30.701985');
INSERT INTO public.ai_insights VALUES (20, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 14:10:30.701985');
INSERT INTO public.ai_insights VALUES (21, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 14:17:23.788279');
INSERT INTO public.ai_insights VALUES (22, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 14:17:23.788279');
INSERT INTO public.ai_insights VALUES (23, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 14:17:23.788279');
INSERT INTO public.ai_insights VALUES (24, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 14:17:23.788279');
INSERT INTO public.ai_insights VALUES (25, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 14:17:23.788279');
INSERT INTO public.ai_insights VALUES (26, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 14:22:02.794828');
INSERT INTO public.ai_insights VALUES (27, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 14:22:02.794828');
INSERT INTO public.ai_insights VALUES (28, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 14:22:02.794828');
INSERT INTO public.ai_insights VALUES (29, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 14:22:02.794828');
INSERT INTO public.ai_insights VALUES (30, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 14:22:02.794828');
INSERT INTO public.ai_insights VALUES (31, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 14:28:35.686366');
INSERT INTO public.ai_insights VALUES (32, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 14:28:35.686366');
INSERT INTO public.ai_insights VALUES (33, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 14:28:35.686366');
INSERT INTO public.ai_insights VALUES (34, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 14:28:35.686366');
INSERT INTO public.ai_insights VALUES (35, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 14:28:35.686366');
INSERT INTO public.ai_insights VALUES (36, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 14:50:56.862352');
INSERT INTO public.ai_insights VALUES (37, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 14:50:56.862352');
INSERT INTO public.ai_insights VALUES (38, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 14:50:56.862352');
INSERT INTO public.ai_insights VALUES (39, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 14:50:56.862352');
INSERT INTO public.ai_insights VALUES (40, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 14:50:56.862352');
INSERT INTO public.ai_insights VALUES (41, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 15:13:47.833646');
INSERT INTO public.ai_insights VALUES (42, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 15:13:47.833646');
INSERT INTO public.ai_insights VALUES (43, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 15:13:47.833646');
INSERT INTO public.ai_insights VALUES (44, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 15:13:47.833646');
INSERT INTO public.ai_insights VALUES (45, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 15:13:47.833646');
INSERT INTO public.ai_insights VALUES (46, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 17:47:56.098444');
INSERT INTO public.ai_insights VALUES (47, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 17:47:56.098444');
INSERT INTO public.ai_insights VALUES (48, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 17:47:56.098444');
INSERT INTO public.ai_insights VALUES (49, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 17:47:56.098444');
INSERT INTO public.ai_insights VALUES (50, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 17:47:56.098444');
INSERT INTO public.ai_insights VALUES (51, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 17:55:17.421601');
INSERT INTO public.ai_insights VALUES (52, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 17:55:17.421601');
INSERT INTO public.ai_insights VALUES (53, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 17:55:17.421601');
INSERT INTO public.ai_insights VALUES (54, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 17:55:17.421601');
INSERT INTO public.ai_insights VALUES (55, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 17:55:17.421601');
INSERT INTO public.ai_insights VALUES (56, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:10:28.265874');
INSERT INTO public.ai_insights VALUES (57, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:10:28.265874');
INSERT INTO public.ai_insights VALUES (58, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:10:28.265874');
INSERT INTO public.ai_insights VALUES (59, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:10:28.265874');
INSERT INTO public.ai_insights VALUES (60, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:10:28.265874');
INSERT INTO public.ai_insights VALUES (61, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:13:54.646034');
INSERT INTO public.ai_insights VALUES (62, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:13:54.646034');
INSERT INTO public.ai_insights VALUES (63, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:13:54.646034');
INSERT INTO public.ai_insights VALUES (64, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:13:54.646034');
INSERT INTO public.ai_insights VALUES (65, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:13:54.646034');
INSERT INTO public.ai_insights VALUES (66, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:19:41.136618');
INSERT INTO public.ai_insights VALUES (67, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:19:41.136618');
INSERT INTO public.ai_insights VALUES (68, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:19:41.136618');
INSERT INTO public.ai_insights VALUES (69, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:19:41.136618');
INSERT INTO public.ai_insights VALUES (70, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:19:41.136618');
INSERT INTO public.ai_insights VALUES (71, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:27:58.539956');
INSERT INTO public.ai_insights VALUES (72, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:27:58.539956');
INSERT INTO public.ai_insights VALUES (73, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:27:58.539956');
INSERT INTO public.ai_insights VALUES (74, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:27:58.539956');
INSERT INTO public.ai_insights VALUES (75, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:27:58.539956');
INSERT INTO public.ai_insights VALUES (76, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:38:28.548246');
INSERT INTO public.ai_insights VALUES (77, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:38:28.548246');
INSERT INTO public.ai_insights VALUES (78, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:38:28.548246');
INSERT INTO public.ai_insights VALUES (79, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:38:28.548246');
INSERT INTO public.ai_insights VALUES (80, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:38:28.548246');
INSERT INTO public.ai_insights VALUES (81, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:45:59.517509');
INSERT INTO public.ai_insights VALUES (82, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:45:59.517509');
INSERT INTO public.ai_insights VALUES (83, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:45:59.517509');
INSERT INTO public.ai_insights VALUES (84, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:45:59.517509');
INSERT INTO public.ai_insights VALUES (85, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:45:59.517509');
INSERT INTO public.ai_insights VALUES (86, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:50:14.054672');
INSERT INTO public.ai_insights VALUES (87, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:50:14.054672');
INSERT INTO public.ai_insights VALUES (88, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:50:14.054672');
INSERT INTO public.ai_insights VALUES (89, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:50:14.054672');
INSERT INTO public.ai_insights VALUES (90, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:50:14.054672');
INSERT INTO public.ai_insights VALUES (91, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:53:42.792361');
INSERT INTO public.ai_insights VALUES (92, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:53:42.792361');
INSERT INTO public.ai_insights VALUES (93, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:53:42.792361');
INSERT INTO public.ai_insights VALUES (94, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:53:42.792361');
INSERT INTO public.ai_insights VALUES (95, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:53:42.792361');
INSERT INTO public.ai_insights VALUES (96, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 18:59:03.895407');
INSERT INTO public.ai_insights VALUES (97, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 18:59:03.895407');
INSERT INTO public.ai_insights VALUES (98, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 18:59:03.895407');
INSERT INTO public.ai_insights VALUES (99, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 18:59:03.895407');
INSERT INTO public.ai_insights VALUES (100, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 18:59:03.895407');
INSERT INTO public.ai_insights VALUES (101, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:03:34.07647');
INSERT INTO public.ai_insights VALUES (102, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:03:34.07647');
INSERT INTO public.ai_insights VALUES (103, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:03:34.07647');
INSERT INTO public.ai_insights VALUES (104, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:03:34.07647');
INSERT INTO public.ai_insights VALUES (105, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:03:34.07647');
INSERT INTO public.ai_insights VALUES (106, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:12:31.951364');
INSERT INTO public.ai_insights VALUES (107, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:12:31.951364');
INSERT INTO public.ai_insights VALUES (108, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:12:31.951364');
INSERT INTO public.ai_insights VALUES (109, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:12:31.951364');
INSERT INTO public.ai_insights VALUES (110, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:12:31.951364');
INSERT INTO public.ai_insights VALUES (111, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:15:36.451449');
INSERT INTO public.ai_insights VALUES (112, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:15:36.451449');
INSERT INTO public.ai_insights VALUES (113, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:15:36.451449');
INSERT INTO public.ai_insights VALUES (114, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:15:36.451449');
INSERT INTO public.ai_insights VALUES (115, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:15:36.451449');
INSERT INTO public.ai_insights VALUES (116, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:20:37.271096');
INSERT INTO public.ai_insights VALUES (117, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:20:37.271096');
INSERT INTO public.ai_insights VALUES (118, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:20:37.271096');
INSERT INTO public.ai_insights VALUES (119, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:20:37.271096');
INSERT INTO public.ai_insights VALUES (120, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:20:37.271096');
INSERT INTO public.ai_insights VALUES (121, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:24:02.250182');
INSERT INTO public.ai_insights VALUES (122, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:24:02.250182');
INSERT INTO public.ai_insights VALUES (123, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:24:02.250182');
INSERT INTO public.ai_insights VALUES (124, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:24:02.250182');
INSERT INTO public.ai_insights VALUES (125, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:24:02.250182');
INSERT INTO public.ai_insights VALUES (126, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:51:49.976807');
INSERT INTO public.ai_insights VALUES (127, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:51:49.976807');
INSERT INTO public.ai_insights VALUES (128, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:51:49.976807');
INSERT INTO public.ai_insights VALUES (129, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:51:49.976807');
INSERT INTO public.ai_insights VALUES (130, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:51:49.976807');
INSERT INTO public.ai_insights VALUES (131, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 19:56:31.660953');
INSERT INTO public.ai_insights VALUES (132, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 19:56:31.660953');
INSERT INTO public.ai_insights VALUES (133, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 19:56:31.660953');
INSERT INTO public.ai_insights VALUES (134, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 19:56:31.660953');
INSERT INTO public.ai_insights VALUES (135, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 19:56:31.660953');
INSERT INTO public.ai_insights VALUES (136, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 20:04:22.299701');
INSERT INTO public.ai_insights VALUES (137, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 20:04:22.299701');
INSERT INTO public.ai_insights VALUES (138, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 20:04:22.299701');
INSERT INTO public.ai_insights VALUES (139, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 20:04:22.299701');
INSERT INTO public.ai_insights VALUES (140, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 20:04:22.299701');
INSERT INTO public.ai_insights VALUES (141, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 20:14:13.801204');
INSERT INTO public.ai_insights VALUES (142, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 20:14:13.801204');
INSERT INTO public.ai_insights VALUES (143, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 20:14:13.801204');
INSERT INTO public.ai_insights VALUES (144, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 20:14:13.801204');
INSERT INTO public.ai_insights VALUES (145, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 20:14:13.801204');
INSERT INTO public.ai_insights VALUES (146, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-16 20:39:41.832709');
INSERT INTO public.ai_insights VALUES (147, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-16 20:39:41.832709');
INSERT INTO public.ai_insights VALUES (148, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-16 20:39:41.832709');
INSERT INTO public.ai_insights VALUES (149, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-16 20:39:41.832709');
INSERT INTO public.ai_insights VALUES (150, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-16 20:39:41.832709');
INSERT INTO public.ai_insights VALUES (151, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 03:30:30.875279');
INSERT INTO public.ai_insights VALUES (152, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 03:30:30.875279');
INSERT INTO public.ai_insights VALUES (153, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 03:30:30.875279');
INSERT INTO public.ai_insights VALUES (154, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 03:30:30.875279');
INSERT INTO public.ai_insights VALUES (155, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 03:30:30.875279');
INSERT INTO public.ai_insights VALUES (156, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 04:11:58.88578');
INSERT INTO public.ai_insights VALUES (157, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 04:11:58.88578');
INSERT INTO public.ai_insights VALUES (158, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 04:11:58.88578');
INSERT INTO public.ai_insights VALUES (159, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 04:11:58.88578');
INSERT INTO public.ai_insights VALUES (160, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 04:11:58.88578');
INSERT INTO public.ai_insights VALUES (161, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 04:41:58.720884');
INSERT INTO public.ai_insights VALUES (162, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 04:41:58.720884');
INSERT INTO public.ai_insights VALUES (163, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 04:41:58.720884');
INSERT INTO public.ai_insights VALUES (164, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 04:41:58.720884');
INSERT INTO public.ai_insights VALUES (165, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 04:41:58.720884');
INSERT INTO public.ai_insights VALUES (166, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:00:09.795864');
INSERT INTO public.ai_insights VALUES (167, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:00:09.795864');
INSERT INTO public.ai_insights VALUES (168, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:00:09.795864');
INSERT INTO public.ai_insights VALUES (169, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:00:09.795864');
INSERT INTO public.ai_insights VALUES (170, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:00:09.795864');
INSERT INTO public.ai_insights VALUES (171, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:16:30.31561');
INSERT INTO public.ai_insights VALUES (172, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:16:30.31561');
INSERT INTO public.ai_insights VALUES (173, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:16:30.31561');
INSERT INTO public.ai_insights VALUES (174, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:16:30.31561');
INSERT INTO public.ai_insights VALUES (175, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:16:30.31561');
INSERT INTO public.ai_insights VALUES (176, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:23:32.193586');
INSERT INTO public.ai_insights VALUES (177, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:23:32.193586');
INSERT INTO public.ai_insights VALUES (178, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:23:32.193586');
INSERT INTO public.ai_insights VALUES (179, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:23:32.193586');
INSERT INTO public.ai_insights VALUES (180, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:23:32.193586');
INSERT INTO public.ai_insights VALUES (181, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:27:35.684598');
INSERT INTO public.ai_insights VALUES (182, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:27:35.684598');
INSERT INTO public.ai_insights VALUES (183, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:27:35.684598');
INSERT INTO public.ai_insights VALUES (184, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:27:35.684598');
INSERT INTO public.ai_insights VALUES (185, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:27:35.684598');
INSERT INTO public.ai_insights VALUES (186, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:34:40.263045');
INSERT INTO public.ai_insights VALUES (187, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:34:40.263045');
INSERT INTO public.ai_insights VALUES (188, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:34:40.263045');
INSERT INTO public.ai_insights VALUES (189, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:34:40.263045');
INSERT INTO public.ai_insights VALUES (190, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:34:40.263045');
INSERT INTO public.ai_insights VALUES (191, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:43:30.387891');
INSERT INTO public.ai_insights VALUES (192, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:43:30.387891');
INSERT INTO public.ai_insights VALUES (193, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:43:30.387891');
INSERT INTO public.ai_insights VALUES (194, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:43:30.387891');
INSERT INTO public.ai_insights VALUES (195, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:43:30.387891');
INSERT INTO public.ai_insights VALUES (196, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:49:55.002937');
INSERT INTO public.ai_insights VALUES (197, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:49:55.002937');
INSERT INTO public.ai_insights VALUES (198, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:49:55.002937');
INSERT INTO public.ai_insights VALUES (199, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:49:55.002937');
INSERT INTO public.ai_insights VALUES (200, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:49:55.002937');
INSERT INTO public.ai_insights VALUES (201, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 05:56:44.157762');
INSERT INTO public.ai_insights VALUES (202, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 05:56:44.157762');
INSERT INTO public.ai_insights VALUES (203, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 05:56:44.157762');
INSERT INTO public.ai_insights VALUES (204, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 05:56:44.157762');
INSERT INTO public.ai_insights VALUES (205, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 05:56:44.157762');
INSERT INTO public.ai_insights VALUES (206, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:01:38.975823');
INSERT INTO public.ai_insights VALUES (207, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:01:38.975823');
INSERT INTO public.ai_insights VALUES (208, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:01:38.975823');
INSERT INTO public.ai_insights VALUES (209, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:01:38.975823');
INSERT INTO public.ai_insights VALUES (210, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:01:38.975823');
INSERT INTO public.ai_insights VALUES (211, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:08:03.56219');
INSERT INTO public.ai_insights VALUES (212, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:08:03.56219');
INSERT INTO public.ai_insights VALUES (213, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:08:03.56219');
INSERT INTO public.ai_insights VALUES (214, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:08:03.56219');
INSERT INTO public.ai_insights VALUES (215, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:08:03.56219');
INSERT INTO public.ai_insights VALUES (216, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:16:57.041021');
INSERT INTO public.ai_insights VALUES (217, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:16:57.041021');
INSERT INTO public.ai_insights VALUES (218, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:16:57.041021');
INSERT INTO public.ai_insights VALUES (219, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:16:57.041021');
INSERT INTO public.ai_insights VALUES (220, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:16:57.041021');
INSERT INTO public.ai_insights VALUES (221, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:28:54.706549');
INSERT INTO public.ai_insights VALUES (222, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:28:54.706549');
INSERT INTO public.ai_insights VALUES (223, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:28:54.706549');
INSERT INTO public.ai_insights VALUES (224, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:28:54.706549');
INSERT INTO public.ai_insights VALUES (225, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:28:54.706549');
INSERT INTO public.ai_insights VALUES (226, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:34:36.685559');
INSERT INTO public.ai_insights VALUES (227, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:34:36.685559');
INSERT INTO public.ai_insights VALUES (228, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:34:36.685559');
INSERT INTO public.ai_insights VALUES (229, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:34:36.685559');
INSERT INTO public.ai_insights VALUES (230, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:34:36.685559');
INSERT INTO public.ai_insights VALUES (231, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:42:29.291349');
INSERT INTO public.ai_insights VALUES (232, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:42:29.291349');
INSERT INTO public.ai_insights VALUES (233, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:42:29.291349');
INSERT INTO public.ai_insights VALUES (234, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:42:29.291349');
INSERT INTO public.ai_insights VALUES (235, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:42:29.291349');
INSERT INTO public.ai_insights VALUES (236, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 06:50:19.53379');
INSERT INTO public.ai_insights VALUES (237, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 06:50:19.53379');
INSERT INTO public.ai_insights VALUES (238, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 06:50:19.53379');
INSERT INTO public.ai_insights VALUES (239, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 06:50:19.53379');
INSERT INTO public.ai_insights VALUES (240, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 06:50:19.53379');
INSERT INTO public.ai_insights VALUES (241, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 07:26:58.194795');
INSERT INTO public.ai_insights VALUES (242, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 07:26:58.194795');
INSERT INTO public.ai_insights VALUES (243, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 07:26:58.194795');
INSERT INTO public.ai_insights VALUES (244, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 07:26:58.194795');
INSERT INTO public.ai_insights VALUES (245, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 07:26:58.194795');
INSERT INTO public.ai_insights VALUES (246, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 09:04:46.541692');
INSERT INTO public.ai_insights VALUES (247, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 09:04:46.541692');
INSERT INTO public.ai_insights VALUES (248, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 09:04:46.541692');
INSERT INTO public.ai_insights VALUES (249, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 09:04:46.541692');
INSERT INTO public.ai_insights VALUES (250, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 09:04:46.541692');
INSERT INTO public.ai_insights VALUES (251, 1, 1, 'risk_alert', 'Cardiovascular Risk Assessment', 'Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.', 'medium', true, '0.85', '{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}', 'active', 'pending', '2025-10-17 12:55:33.289538');
INSERT INTO public.ai_insights VALUES (252, 1, 2, 'drug_interaction', 'Potential Drug Interaction Alert', 'Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.', 'high', true, '0.92', '{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}', 'active', 'pending', '2025-10-17 12:55:33.289538');
INSERT INTO public.ai_insights VALUES (253, 1, 1, 'treatment_suggestion', 'Hypertension Management Optimization', 'Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.', 'low', false, '0.78', '{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}', 'active', 'pending', '2025-10-17 12:55:33.289538');
INSERT INTO public.ai_insights VALUES (254, 1, 2, 'preventive_care', 'Diabetic Screening Recommendations', 'Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.', 'medium', true, '0.95', '{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}', 'active', 'pending', '2025-10-17 12:55:33.289538');
INSERT INTO public.ai_insights VALUES (255, 1, 1, 'risk_alert', 'Medication Adherence Concern', 'AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.', 'medium', true, '0.73', '{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}', 'active', 'pending', '2025-10-17 12:55:33.289538');


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: chatbot_analytics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: chatbot_configs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: chatbot_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: chatbot_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: claims; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: clinical_photos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: clinical_procedures; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: doctor_default_shifts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: doctors_fee; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.doctors_fee VALUES (1, 1, NULL, NULL, NULL, 'General Consultation', 'GC001', 'Standard visit for diagnosis or follow-up', 50.00, 'GBP', 1, '2025-10-16 14:10:56.244233', NULL, true, 1, NULL, '{}', '2025-10-16 14:10:56.244233', '2025-10-16 14:10:56.244233');
INSERT INTO public.doctors_fee VALUES (2, 1, NULL, NULL, NULL, 'Specialist Consultation', 'SC001', 'Visit with a specialist doctor (e.g., Cardiologist)', 120.00, 'GBP', 1, '2025-10-16 14:10:57.348518', NULL, true, 1, NULL, '{}', '2025-10-16 14:10:57.348518', '2025-10-16 14:10:57.348518');
INSERT INTO public.doctors_fee VALUES (3, 1, NULL, NULL, NULL, 'Follow-up Visit', 'FV001', 'Follow-up within a certain time period', 30.00, 'GBP', 1, '2025-10-16 14:10:58.440245', NULL, true, 1, NULL, '{}', '2025-10-16 14:10:58.440245', '2025-10-16 14:10:58.440245');
INSERT INTO public.doctors_fee VALUES (4, 1, NULL, NULL, NULL, 'Teleconsultation', 'TC001', 'Online or phone consultation', 40.00, 'GBP', 1, '2025-10-16 14:10:59.539619', NULL, true, 1, NULL, '{}', '2025-10-16 14:10:59.539619', '2025-10-16 14:10:59.539619');
INSERT INTO public.doctors_fee VALUES (5, 1, NULL, NULL, NULL, 'Emergency Visit', 'EV001', 'Immediate or off-hours consultation', 150.00, 'GBP', 1, '2025-10-16 14:11:00.630761', NULL, true, 1, NULL, '{}', '2025-10-16 14:11:00.630761', '2025-10-16 14:11:00.630761');
INSERT INTO public.doctors_fee VALUES (6, 1, NULL, NULL, NULL, 'Home Visit', 'HV001', 'Doctor visits patient''s home', 100.00, 'GBP', 1, '2025-10-16 14:11:01.722813', NULL, true, 1, NULL, '{}', '2025-10-16 14:11:01.722813', '2025-10-16 14:11:01.722813');
INSERT INTO public.doctors_fee VALUES (8, 1, NULL, NULL, NULL, 'Specialist Consultation', 'SC001', 'Visit with a specialist doctor (e.g., Cardiologist)', 120.00, 'GBP', 1, '2025-10-16 14:24:35.64478', NULL, true, 1, NULL, '{}', '2025-10-16 14:24:35.64478', '2025-10-16 14:24:35.64478');
INSERT INTO public.doctors_fee VALUES (9, 1, NULL, NULL, NULL, 'Follow-up Visit', 'FV001', 'Follow-up within a certain time period', 30.00, 'GBP', 1, '2025-10-16 14:24:36.654725', NULL, true, 1, NULL, '{}', '2025-10-16 14:24:36.654725', '2025-10-16 14:24:36.654725');
INSERT INTO public.doctors_fee VALUES (10, 1, NULL, NULL, NULL, 'Teleconsultation', 'TC001', 'Online or phone consultation', 40.00, 'GBP', 1, '2025-10-16 14:24:37.667962', NULL, true, 1, NULL, '{}', '2025-10-16 14:24:37.667962', '2025-10-16 14:24:37.667962');
INSERT INTO public.doctors_fee VALUES (11, 1, NULL, NULL, NULL, 'Emergency Visit', 'EV001', 'Immediate or off-hours consultation', 150.00, 'GBP', 1, '2025-10-16 14:24:38.677821', NULL, true, 1, NULL, '{}', '2025-10-16 14:24:38.677821', '2025-10-16 14:24:38.677821');
INSERT INTO public.doctors_fee VALUES (12, 1, NULL, NULL, NULL, 'Home Visit', 'HV001', 'Doctor visits patient''s home', 1200.00, 'GBP', 1, '2025-10-16 14:24:39.688135', NULL, true, 1, NULL, '{}', '2025-10-16 14:24:39.688135', '2025-10-16 19:24:43.319');
INSERT INTO public.doctors_fee VALUES (7, 1, 3, 'Emily Johnson', 'nurse', 'General Consultation', 'GC001', 'Standard visit for diagnosis or follow-up', 50.00, 'GBP', 1, '2025-10-16 14:24:34.632055', NULL, true, 1, NULL, '{}', '2025-10-16 14:24:34.632055', '2025-10-16 19:24:51.61');


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.documents VALUES (1, 1, 1, 'Document_2025-10-17_11-53', 'medical_form', 'Document_2025-10-17_11-53_1760684022846.json', '{"header": "your-clinic", "subject": "Medical Form Template", "location": "Your Clinic", "recipient": "Patient", "practitioner": "Dr. Provider", "templateUsed": "Custom Form"}', true, '2025-10-17 06:53:42.965749', '2025-10-17 06:53:42.965749');


--
-- Data for Name: emergency_protocols; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: financial_forecasts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: forecast_models; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: gdpr_audit_trail; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: gdpr_consents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: gdpr_data_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: gdpr_processing_activities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: imaging_pricing; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.imaging_pricing VALUES (1, 1, 'X-ray (Radiography)', 'XRAY7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:22:56.950978', NULL, true, 1, NULL, '{}', '2025-10-16 19:22:56.950978', '2025-10-16 19:22:56.950978');
INSERT INTO public.imaging_pricing VALUES (2, 1, 'CT (Computed Tomography)', 'CT7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:22:57.974943', NULL, true, 1, NULL, '{}', '2025-10-16 19:22:57.974943', '2025-10-16 19:22:57.974943');
INSERT INTO public.imaging_pricing VALUES (3, 1, 'MRI (Magnetic Resonance Imaging)', 'MRI7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:22:58.993552', NULL, true, 1, NULL, '{}', '2025-10-16 19:22:58.993552', '2025-10-16 19:22:58.993552');
INSERT INTO public.imaging_pricing VALUES (4, 1, 'Ultrasound (Sonography)', 'US7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:00.009906', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:00.009906', '2025-10-16 19:23:00.009906');
INSERT INTO public.imaging_pricing VALUES (5, 1, 'Mammography', 'MAMMO7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:01.022894', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:01.022894', '2025-10-16 19:23:01.022894');
INSERT INTO public.imaging_pricing VALUES (6, 1, 'Fluoroscopy', 'FLUORO7921', '', NULL, NULL, 0.92, 'GBP', 1, '2025-10-16 19:23:02.044151', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:02.044151', '2025-10-16 19:23:02.044151');
INSERT INTO public.imaging_pricing VALUES (7, 1, 'PET (Positron Emission Tomography)', 'PET7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:03.068535', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:03.068535', '2025-10-16 19:23:03.068535');
INSERT INTO public.imaging_pricing VALUES (8, 1, 'SPECT (Single Photon Emission CT)', 'SPECT7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:04.081494', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:04.081494', '2025-10-16 19:23:04.081494');
INSERT INTO public.imaging_pricing VALUES (9, 1, 'Nuclear Medicine Scans', 'NM7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:05.095277', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:05.095277', '2025-10-16 19:23:05.095277');
INSERT INTO public.imaging_pricing VALUES (10, 1, 'DEXA (Bone Densitometry)', 'DEXA7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:06.112654', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:06.112654', '2025-10-16 19:23:06.112654');
INSERT INTO public.imaging_pricing VALUES (11, 1, 'Angiography', 'ANGIO7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:07.131829', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:07.131829', '2025-10-16 19:23:07.131829');
INSERT INTO public.imaging_pricing VALUES (12, 1, 'Interventional Radiology (IR)', 'IR7921', '', NULL, NULL, 1.00, 'GBP', 1, '2025-10-16 19:23:08.145704', NULL, true, 1, NULL, '{}', '2025-10-16 19:23:08.145704', '2025-10-16 19:23:32.686');


--
-- Data for Name: insurance_verifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_batches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.inventory_categories VALUES (1, 1, 'Tablets', 'Oral solid dosage forms including tablets and capsules', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (2, 1, 'Syrups', 'Liquid medications in syrup form', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (3, 1, 'Pharmaceuticals', 'General pharmaceutical products', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (4, 1, 'Beauty Products', 'Cosmetic and beauty care items', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (5, 1, 'Vitamins', 'Vitamin supplements and nutritional products', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (6, 1, 'Minerals', 'Mineral supplements and health products', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (7, 1, 'Medical Supplies', 'General medical supplies and equipment', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (8, 1, 'First Aid', 'First aid supplies and emergency medications', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (9, 1, 'Injections', 'Injectable medications and vaccines', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');
INSERT INTO public.inventory_categories VALUES (10, 1, 'Topical', 'Creams, ointments, and topical applications', NULL, true, '2025-10-16 13:17:32.565397', '2025-10-16 13:17:32.565397');


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.inventory_items VALUES (1, 1, 1, 'Paracetamol 500mg', 'Pain relief and fever reducer', 'TAB-PARA500-001', '1234567890123', 'Paracetamol', 'Panadol', 'GSK', 'tablets', 100, 15.50, 22.99, 25.99, 20.00, 500, 50, 2000, 100, false, false, false, 'Store in cool, dry place', NULL, NULL, '1-2 tablets every 4-6 hours as needed', true, false, '2025-10-16 13:17:33.035149', '2025-10-16 13:17:33.035149');
INSERT INTO public.inventory_items VALUES (2, 1, 1, 'Ibuprofen 400mg', 'Anti-inflammatory pain relief', 'TAB-IBU400-002', '2345678901234', 'Ibuprofen', 'Nurofen', 'Reckitt Benckiser', 'tablets', 84, 12.75, 18.99, 21.99, 20.00, 300, 30, 1500, 75, false, false, false, 'Store below 25°C', NULL, NULL, '1 tablet every 4-6 hours with food', true, false, '2025-10-16 13:17:33.035149', '2025-10-16 13:17:33.035149');
INSERT INTO public.inventory_items VALUES (3, 1, 2, 'Children''s Paracetamol Suspension', 'Liquid paracetamol for children', 'SYR-CHPARA-003', '3456789012345', 'Paracetamol', 'Calpol', 'Johnson & Johnson', 'bottles', 1, 8.25, 12.49, 14.99, 20.00, 150, 20, 500, 40, false, false, false, 'Store below 25°C, do not freeze', NULL, NULL, 'As per age and weight guidelines', true, false, '2025-10-16 13:17:33.035149', '2025-10-16 13:17:33.035149');
INSERT INTO public.inventory_items VALUES (4, 1, 5, 'Vitamin D3 1000IU', 'Vitamin D supplement', 'VIT-D3-1000-004', '4567890123456', 'Cholecalciferol', 'VitaD3', 'Holland & Barrett', 'tablets', 60, 9.99, 15.99, 18.99, 20.00, 200, 25, 800, 50, false, false, false, 'Store in cool, dry place', NULL, NULL, '1 tablet daily with food', true, false, '2025-10-16 13:17:33.035149', '2025-10-16 13:17:33.035149');
INSERT INTO public.inventory_items VALUES (5, 1, 7, 'Digital Thermometer', 'Digital oral/axillary thermometer', 'MED-THERM-005', '5678901234567', NULL, 'OmniTemp', 'Medical Devices Ltd', 'pieces', 1, 12.50, 19.99, 24.99, 20.00, 75, 10, 200, 25, false, false, false, 'Store at room temperature', NULL, NULL, NULL, true, false, '2025-10-16 13:17:33.035149', '2025-10-16 13:17:33.035149');
INSERT INTO public.inventory_items VALUES (6, 1, 7, 'Disposable Gloves (Nitrile)', 'Powder-free nitrile examination gloves', 'MED-GLOVE-006', '6789012345678', NULL, 'SafeGuard', 'MedProtect', 'boxes', 100, 18.75, 28.99, 32.99, 20.00, 50, 10, 300, 20, false, false, false, 'Store in cool, dry place away from direct sunlight', NULL, NULL, NULL, true, false, '2025-10-16 13:17:33.035149', '2025-10-16 13:17:33.035149');


--
-- Data for Name: inventory_purchase_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_sale_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_sales; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_stock_alerts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_stock_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: inventory_suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.inventory_suppliers VALUES (1, 1, 'Halo Pharmacy', 'David Wilson', 'orders@halopharmacy.co.uk', '+44 20 7946 0958', '123 Health Street', 'London', 'UK', 'GB123456789', 'Net 30', true, '2025-10-16 13:17:32.799852', '2025-10-16 13:17:32.799852');
INSERT INTO public.inventory_suppliers VALUES (2, 1, 'MedSupply UK', 'Sarah Johnson', 'procurement@medsupplyuk.com', '+44 161 234 5678', '456 Medical Ave', 'Manchester', 'UK', 'GB987654321', 'Net 30', true, '2025-10-16 13:17:32.799852', '2025-10-16 13:17:32.799852');
INSERT INTO public.inventory_suppliers VALUES (3, 1, 'Healthcare Direct', 'Michael Brown', 'orders@healthcaredirect.co.uk', '+44 121 345 6789', '789 Pharma Road', 'Birmingham', 'UK', 'GB456789123', 'Net 15', true, '2025-10-16 13:17:32.799852', '2025-10-16 13:17:32.799852');


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.invoices VALUES (1, 1, 'INV-1760622612474-6TPM8S', '1', 'Alice Williams', NULL, '2025-10-16 00:00:00', '2025-10-16 00:00:00', '2025-11-15 00:00:00', 'paid', 'payment', 23.00, 0.00, 0.00, 23.00, 23.00, '[{"code": "LAB-001", "total": 23, "quantity": 1, "unitPrice": "23.00", "description": "Complete Blood Count (CBC)"}]', NULL, '[{"id": "PAY-1760622612474", "date": "2025-10-16T13:50:12.474Z", "amount": 23, "method": "cash", "reference": "INV-1760622612474-6TPM8S"}]', NULL, 1, '2025-10-16 13:50:12.594248', '2025-10-16 13:50:12.594248');
INSERT INTO public.invoices VALUES (2, 1, 'INV-1760626553143-3PIBV', '1', 'Alice Williams', NULL, '2025-10-16 00:00:00', '2025-10-16 00:00:00', '2025-11-15 00:00:00', 'paid', 'payment', 679.00, 0.00, 0.00, 679.00, 679.00, '[{"code": "LAB-001", "total": 69, "quantity": 1, "unitPrice": "69.00", "description": "Hemoglobin A1C (HbA1c)"}, {"code": "LAB-002", "total": 230, "quantity": 1, "unitPrice": "230.00", "description": "Thyroid Function Tests (TSH, Free T4, Free T3)"}, {"code": "LAB-003", "total": 300, "quantity": 1, "unitPrice": "300.00", "description": "Kidney Function Tests (Creatinine, BUN, eGFR)"}, {"code": "LAB-004", "total": 80, "quantity": 1, "unitPrice": "80.00", "description": "Basic Metabolic Panel (BMP) / Chem-7"}]', NULL, '[{"id": "PAY-1760626553143", "date": "2025-10-16T14:55:53.143Z", "amount": 679, "method": "cash", "reference": "INV-1760626553143-3PIBV"}]', NULL, 1, '2025-10-16 14:55:53.262627', '2025-10-16 14:55:53.262627');
INSERT INTO public.invoices VALUES (3, 1, 'INV-1760626853669-XSCLQ', '1', 'Alice Williams', NULL, '2025-10-16 00:00:00', '2025-10-16 00:00:00', '2025-11-15 00:00:00', 'paid', 'payment', 70.00, 0.00, 0.00, 70.00, 70.00, '[{"code": "LAB-001", "total": 70, "quantity": 1, "unitPrice": "70.00", "description": "Complete Blood Count (CBC)"}]', NULL, '[{"id": "PAY-1760626853669", "date": "2025-10-16T15:00:53.669Z", "amount": 70, "method": "cash", "reference": "INV-1760626853669-XSCLQ"}]', NULL, 1, '2025-10-16 15:00:53.799227', '2025-10-16 15:00:53.799227');
INSERT INTO public.invoices VALUES (4, 1, 'INV-1760636912372-JML38F', '1', 'Alice Williams', NULL, '2025-10-16 00:00:00', '2025-10-16 00:00:00', '2025-11-15 00:00:00', 'paid', 'payment', 910.00, 0.00, 0.00, 910.00, 910.00, '[{"code": "LAB-001", "total": 80, "quantity": 1, "unitPrice": "80.00", "description": "Basic Metabolic Panel (BMP) / Chem-7"}, {"code": "LAB-002", "total": 200, "quantity": 1, "unitPrice": "200.00", "description": "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)"}, {"code": "LAB-003", "total": 400, "quantity": 1, "unitPrice": "400.00", "description": "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)"}, {"code": "LAB-004", "total": 230, "quantity": 1, "unitPrice": "230.00", "description": "Thyroid Function Tests (TSH, Free T4, Free T3)"}]', NULL, '[{"id": "PAY-1760636912373", "date": "2025-10-16T17:48:32.373Z", "amount": 910, "method": "cash", "reference": "INV-1760636912372-JML38F"}]', NULL, 1, '2025-10-16 17:48:32.497678', '2025-10-16 17:48:32.497678');
INSERT INTO public.invoices VALUES (5, 1, 'INV-387752', 'P002', 'Robert Davis', '2345678901', '2025-10-16 00:00:00', '2025-10-16 00:00:00', '2025-11-15 00:00:00', 'paid', 'payment', 1.20, 0.00, 0.00, 1.20, 0.00, '[{"code": "XRAY7921", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - X-ray (Radiography)"}]', NULL, '[]', 'Imaging study: X-ray (Radiography), Modality: X-Ray, Body Part: Chest X-Ray (PA / Lateral)', 1, '2025-10-16 20:26:27.86875', '2025-10-16 20:26:29.425');
INSERT INTO public.invoices VALUES (6, 1, 'INV-404386', 'P002', 'Robert Davis', '2345678901', '2025-10-17 00:00:00', '2025-10-17 00:00:00', '2025-11-16 00:00:00', 'paid', 'payment', 1.20, 0.00, 0.00, 1.20, 0.00, '[{"code": "XRAY7921", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - X-ray (Radiography)"}]', NULL, '[]', 'Imaging study: X-ray (Radiography), Modality: X-Ray, Body Part: Chest X-Ray (PA / Lateral)', 1, '2025-10-17 04:13:24.500761', '2025-10-17 04:13:26.009');
INSERT INTO public.invoices VALUES (7, 1, 'INV-771702', 'P001', 'Alice Williams', '1234567890', '2025-10-17 00:00:00', '2025-10-17 00:00:00', '2025-11-16 00:00:00', 'paid', 'payment', 1.20, 0.00, 0.00, 1.20, 0.00, '[{"code": "DEXA7921", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - DEXA (Bone Densitometry)"}]', NULL, '[]', 'Imaging study: DEXA (Bone Densitometry), Modality: CT, Body Part: CT Chest', 1, '2025-10-17 04:19:31.81714', '2025-10-17 04:19:33.248');
INSERT INTO public.invoices VALUES (8, 1, 'INV-773635', 'P001', 'Alice Williams', '1234567890', '2025-10-17 00:00:00', '2025-10-17 00:00:00', '2025-11-16 00:00:00', 'paid', 'payment', 1.20, 0.00, 0.00, 1.20, 0.00, '[{"code": "DEXA7921", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - DEXA (Bone Densitometry)"}]', NULL, '[]', 'Imaging study: DEXA (Bone Densitometry), Modality: CT, Body Part: CT Chest', 1, '2025-10-17 04:19:33.749074', '2025-10-17 04:19:35.909');
INSERT INTO public.invoices VALUES (9, 1, 'INV-252387', 'P001', 'Alice Williams', '1234567890', '2025-10-17 00:00:00', '2025-10-17 00:00:00', '2025-11-16 00:00:00', 'paid', 'payment', 1.20, 0.00, 0.00, 1.20, 0.00, '[{"code": "ANGIO7921", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - Angiography"}]', NULL, '[]', 'Imaging study: Angiography, Modality: X-Ray, Body Part: Abdomen X-Ray', 1, '2025-10-17 04:27:32.507414', '2025-10-17 04:27:33.993');
INSERT INTO public.invoices VALUES (10, 1, 'INV-780354', 'P001', 'Alice Williams', '1234567890', '2025-10-17 00:00:00', '2025-10-17 00:00:00', '2025-11-16 00:00:00', 'paid', 'payment', 1.20, 0.00, 0.00, 1.20, 0.00, '[{"code": "ANGIO7921", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - Angiography"}]', NULL, '[]', 'Imaging study: Angiography, Modality: X-Ray, Body Part: Spine X-Ray (Cervical / Lumbar)', 1, '2025-10-17 04:36:20.47294', '2025-10-17 04:36:21.972');


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.lab_results VALUES (1, 1, 1, 'CBC001', 'Complete Blood Count (CBC)', 2, NULL, NULL, NULL, 'routine', '2025-10-14 13:17:29.887', '2025-10-14 15:17:29.887', '2025-10-15 13:17:29.887', 'completed', '[{"name": "White Blood Cell Count", "unit": "×10³/µL", "value": "7.2", "status": "normal", "referenceRange": "4.0-11.0"}, {"name": "Red Blood Cell Count", "unit": "×10⁶/µL", "value": "4.5", "status": "normal", "referenceRange": "4.2-5.4"}, {"name": "Hemoglobin", "unit": "g/dL", "value": "14.2", "status": "normal", "referenceRange": "12.0-16.0"}]', false, 'All values within normal limits', '2025-10-16 13:17:30.003835');
INSERT INTO public.lab_results VALUES (2, 1, 2, 'GLU002', 'Blood Glucose', 2, NULL, NULL, NULL, 'routine', '2025-10-15 13:17:29.887', '2025-10-15 14:17:29.887', '2025-10-16 01:17:29.887', 'completed', '[{"flag": "HIGH", "name": "Glucose", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "referenceRange": "70-99"}]', true, 'High glucose levels - follow up required, critical value', '2025-10-16 13:17:30.23856');
INSERT INTO public.lab_results VALUES (3, 1, 1, 'LIP003', 'Lipid Panel', 6, NULL, NULL, NULL, 'routine', '2025-10-16 13:17:29.887', NULL, NULL, 'pending', '[]', false, 'Fasting required', '2025-10-16 13:17:30.471731');
INSERT INTO public.lab_results VALUES (4, 1, 1, 'A1C004', 'Hemoglobin A1C', 2, NULL, NULL, NULL, 'routine', '2025-10-13 13:17:29.887', '2025-10-13 13:47:29.887', '2025-10-14 13:17:29.887', 'completed', '[{"flag": "HIGH", "name": "Hemoglobin A1C", "unit": "%", "value": "8.5", "status": "abnormal_high", "referenceRange": "< 7.0"}]', true, 'Elevated A1C indicates poor diabetes control', '2025-10-16 13:17:30.704722');
INSERT INTO public.lab_results VALUES (5, 1, 1, 'LAB17606221125063CV1L', 'Complete Blood Count (CBC)', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-16 13:41:52.506', NULL, NULL, 'pending', '[]', false, 'none', '2025-10-16 13:41:52.633336');
INSERT INTO public.lab_results VALUES (6, 1, 1, 'LAB1760622329800JBVWU', 'Complete Blood Count (CBC)', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-16 13:45:29.8', NULL, NULL, 'pending', '[]', false, 'none', '2025-10-16 13:45:29.919153');
INSERT INTO public.lab_results VALUES (7, 1, 1, 'LAB17606226010346TREC', 'Complete Blood Count (CBC)', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-16 13:50:01.034', NULL, NULL, 'pending', '[]', false, 'none', '2025-10-16 13:50:01.153554');
INSERT INTO public.lab_results VALUES (9, 1, 1, 'LAB1760626842590T75ME', 'Complete Blood Count (CBC)', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-16 15:00:42.59', NULL, NULL, 'pending', '[]', false, NULL, '2025-10-16 15:00:42.739135');
INSERT INTO public.lab_results VALUES (8, 1, 1, 'LAB1760626542373PK673', 'Hemoglobin A1C (HbA1c) | Thyroid Function Tests (TSH, Free T4, Free T3) | Kidney Function Tests (Creatinine, BUN, eGFR) | Basic Metabolic Panel (BMP) / Chem-7', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-16 14:55:42.373', NULL, NULL, 'pending', '[]', false, 'none', '2025-10-16 14:55:42.492002');
INSERT INTO public.lab_results VALUES (10, 1, 1, 'LAB1760636902921I2ONC', 'Basic Metabolic Panel (BMP) / Chem-7 | Lipid Profile (Cholesterol, LDL, HDL, Triglycerides) | Electrolytes (Sodium, Potassium, Chloride, Bicarbonate) | Thyroid Function Tests (TSH, Free T4, Free T3)', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-16 17:48:22.921', NULL, NULL, 'completed', '[{"name": "Basic Metabolic Panel (BMP) / Chem-7 - Glucose", "unit": "mg/dL", "value": "78", "status": "normal", "referenceRange": "70 - 100"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - Calcium", "unit": "mg/dL", "value": "9", "status": "normal", "referenceRange": "8.5 - 10.5"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - Sodium", "unit": "mmol/L", "value": "87", "status": "normal", "referenceRange": "136 - 145"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - Potassium", "unit": "mmol/L", "value": "97", "status": "normal", "referenceRange": "3.5 - 5.0"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - Chloride", "unit": "mmol/L", "value": "897", "status": "normal", "referenceRange": "98 - 107"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - CO2", "unit": "mmol/L", "value": "97", "status": "normal", "referenceRange": "23 - 29"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - BUN", "unit": "mg/dL", "value": "897", "status": "normal", "referenceRange": "7 - 20"}, {"name": "Basic Metabolic Panel (BMP) / Chem-7 - Creatinine", "unit": "mg/dL", "value": "97", "status": "normal", "referenceRange": "0.6 - 1.2"}, {"name": "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides) - Total Cholesterol", "unit": "mg/dL", "value": "97", "status": "normal", "referenceRange": "<200"}, {"name": "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides) - LDL Cholesterol", "unit": "mg/dL", "value": "7", "status": "normal", "referenceRange": "<100"}, {"name": "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides) - HDL Cholesterol", "unit": "mg/dL", "value": "97", "status": "normal", "referenceRange": ">40"}, {"name": "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides) - Triglycerides", "unit": "mg/dL", "value": "7", "status": "normal", "referenceRange": "<150"}, {"name": "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides) - VLDL Cholesterol", "unit": "mg/dL", "value": "97", "status": "normal", "referenceRange": "5 - 40"}, {"name": "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate) - Sodium (Na+)", "unit": "mmol/L", "value": "97", "status": "normal", "referenceRange": "136 - 145"}, {"name": "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate) - Potassium (K+)", "unit": "mmol/L", "value": "987", "status": "normal", "referenceRange": "3.5 - 5.0"}, {"name": "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate) - Chloride (Cl-)", "unit": "mmol/L", "value": "897", "status": "normal", "referenceRange": "98 - 107"}, {"name": "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate) - Bicarbonate (HCO3-)", "unit": "mmol/L", "value": "897", "status": "normal", "referenceRange": "23 - 29"}, {"name": "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate) - Anion Gap", "unit": "mmol/L", "value": "9", "status": "normal", "referenceRange": "8 - 16"}, {"name": "Thyroid Function Tests (TSH, Free T4, Free T3) - TSH", "unit": "mIU/L", "value": "77", "status": "normal", "referenceRange": "0.4 - 4.0"}, {"name": "Thyroid Function Tests (TSH, Free T4, Free T3) - Free T4", "unit": "ng/dL", "value": "97", "status": "normal", "referenceRange": "0.8 - 1.8"}, {"name": "Thyroid Function Tests (TSH, Free T4, Free T3) - Free T3", "unit": "pg/mL", "value": "7", "status": "normal", "referenceRange": "2.3 - 4.2"}, {"name": "Thyroid Function Tests (TSH, Free T4, Free T3) - Total T4", "unit": "μg/dL", "value": "7", "status": "normal", "referenceRange": "5.0 - 12.0"}, {"name": "Thyroid Function Tests (TSH, Free T4, Free T3) - Total T3", "unit": "ng/dL", "value": "97", "status": "normal", "referenceRange": "80 - 200"}]', false, '', '2025-10-16 17:48:23.040634');
INSERT INTO public.lab_results VALUES (11, 1, 1, 'LAB17606740867539ZFFL', 'Thyroid Function Tests (TSH, Free T4, Free T3) | Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)', 1, 'Emily Johnson', NULL, NULL, 'routine', '2025-10-17 04:08:06.753', NULL, NULL, 'pending', '[]', false, NULL, '2025-10-17 04:08:06.873441');


--
-- Data for Name: lab_test_pricing; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.lab_test_pricing VALUES (1, 1, 3, 'Emily Johnson', 'nurse', 'Complete Blood Count (CBC)', 'VA323', '3', 23.00, 'GBP', 1, '2025-10-16 13:40:51.599136', NULL, true, 1, 'none', '{}', '2025-10-16 13:40:51.599136', '2025-10-16 13:40:51.599136');
INSERT INTO public.lab_test_pricing VALUES (2, 1, NULL, NULL, NULL, 'Complete Blood Count (CBC)', 'CBC001', 'Hematology', 70.00, 'GBP', 1, '2025-10-16 14:54:25.230563', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:25.230563', '2025-10-16 14:54:25.230563');
INSERT INTO public.lab_test_pricing VALUES (3, 1, NULL, NULL, NULL, 'Basic Metabolic Panel (BMP) / Chem-7', 'BMP001', 'Chemistry', 80.00, 'GBP', 1, '2025-10-16 14:54:26.250023', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:26.250023', '2025-10-16 14:54:26.250023');
INSERT INTO public.lab_test_pricing VALUES (4, 1, NULL, NULL, NULL, 'Comprehensive Metabolic Panel (CMP)', 'CMP001', 'Chemistry', 90.00, 'GBP', 1, '2025-10-16 14:54:27.26926', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:27.26926', '2025-10-16 14:54:27.26926');
INSERT INTO public.lab_test_pricing VALUES (5, 1, NULL, NULL, NULL, 'Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)', 'LP001', 'Chemistry', 200.00, 'GBP', 1, '2025-10-16 14:54:28.285256', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:28.285256', '2025-10-16 14:54:28.285256');
INSERT INTO public.lab_test_pricing VALUES (6, 1, NULL, NULL, NULL, 'Thyroid Function Tests (TSH, Free T4, Free T3)', 'TFT001', 'Endocrinology', 230.00, 'GBP', 1, '2025-10-16 14:54:29.326479', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:29.326479', '2025-10-16 14:54:29.326479');
INSERT INTO public.lab_test_pricing VALUES (7, 1, NULL, NULL, NULL, 'Liver Function Tests (AST, ALT, ALP, Bilirubin)', 'LFT001', 'Chemistry', 250.00, 'GBP', 1, '2025-10-16 14:54:30.344597', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:30.344597', '2025-10-16 14:54:30.344597');
INSERT INTO public.lab_test_pricing VALUES (8, 1, NULL, NULL, NULL, 'Kidney Function Tests (Creatinine, BUN, eGFR)', 'KFT001', 'Chemistry', 300.00, 'GBP', 1, '2025-10-16 14:54:31.379752', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:31.379752', '2025-10-16 14:54:31.379752');
INSERT INTO public.lab_test_pricing VALUES (9, 1, NULL, NULL, NULL, 'Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)', 'E001', 'Chemistry', 400.00, 'GBP', 1, '2025-10-16 14:54:32.408762', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:32.408762', '2025-10-16 14:54:32.408762');
INSERT INTO public.lab_test_pricing VALUES (10, 1, NULL, NULL, NULL, 'Blood Glucose (Fasting / Random / Postprandial)', 'BG001', 'Chemistry', 59.00, 'GBP', 1, '2025-10-16 14:54:33.438562', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:33.438562', '2025-10-16 14:54:33.438562');
INSERT INTO public.lab_test_pricing VALUES (11, 1, NULL, NULL, NULL, 'Hemoglobin A1C (HbA1c)', 'HA001', 'Chemistry', 69.00, 'GBP', 1, '2025-10-16 14:54:34.472752', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:34.472752', '2025-10-16 14:54:34.472752');
INSERT INTO public.lab_test_pricing VALUES (12, 1, NULL, NULL, NULL, 'C-Reactive Protein (CRP)', 'CRP001', 'Immunology', 79.00, 'GBP', 1, '2025-10-16 14:54:35.510652', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:35.510652', '2025-10-16 14:54:35.510652');
INSERT INTO public.lab_test_pricing VALUES (13, 1, NULL, NULL, NULL, 'Erythrocyte Sedimentation Rate (ESR)', 'ESR001', 'Hematology', 89.00, 'GBP', 1, '2025-10-16 14:54:36.562717', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:36.562717', '2025-10-16 14:54:36.562717');
INSERT INTO public.lab_test_pricing VALUES (14, 1, NULL, NULL, NULL, 'Coagulation Tests (PT, PTT, INR)', 'CT001', 'Hematology', 99.00, 'GBP', 1, '2025-10-16 14:54:37.593213', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:37.593213', '2025-10-16 14:54:37.593213');
INSERT INTO public.lab_test_pricing VALUES (15, 1, NULL, NULL, NULL, 'Urinalysis (UA)', 'UA001', 'Urinalysis', 109.00, 'GBP', 1, '2025-10-16 14:54:38.626332', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:38.626332', '2025-10-16 14:54:38.626332');
INSERT INTO public.lab_test_pricing VALUES (16, 1, NULL, NULL, NULL, 'Albumin / Total Protein', 'ATP001', 'Chemistry', 120.00, 'GBP', 1, '2025-10-16 14:54:39.669698', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:39.669698', '2025-10-16 14:54:39.669698');
INSERT INTO public.lab_test_pricing VALUES (17, 1, NULL, NULL, NULL, 'Iron Studies (Serum Iron, TIBC, Ferritin)', 'IS001', 'Hematology', 130.00, 'GBP', 1, '2025-10-16 14:54:40.703616', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:40.703616', '2025-10-16 14:54:40.703616');
INSERT INTO public.lab_test_pricing VALUES (18, 1, NULL, NULL, NULL, 'Vitamin D', 'VD001', 'Chemistry', 140.00, 'GBP', 1, '2025-10-16 14:54:41.736375', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:41.736375', '2025-10-16 14:54:41.736375');
INSERT INTO public.lab_test_pricing VALUES (19, 1, NULL, NULL, NULL, 'Vitamin B12 / Folate', 'VBF001', 'Chemistry', 150.00, 'GBP', 1, '2025-10-16 14:54:42.772929', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:42.772929', '2025-10-16 14:54:42.772929');
INSERT INTO public.lab_test_pricing VALUES (20, 1, NULL, NULL, NULL, 'Hormone Panels (e.g., LH, FSH, Testosterone, Estrogen)', 'HP001', 'Endocrinology', 160.00, 'GBP', 1, '2025-10-16 14:54:43.810834', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:43.810834', '2025-10-16 14:54:43.810834');
INSERT INTO public.lab_test_pricing VALUES (21, 1, NULL, NULL, NULL, 'Prostate-Specific Antigen (PSA)', 'PSA001', 'Oncology', 170.00, 'GBP', 1, '2025-10-16 14:54:44.839785', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:44.839785', '2025-10-16 14:54:44.839785');
INSERT INTO public.lab_test_pricing VALUES (22, 1, NULL, NULL, NULL, 'Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)', 'TA001', 'Immunology', 180.00, 'GBP', 1, '2025-10-16 14:54:45.877066', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:45.877066', '2025-10-16 14:54:45.877066');
INSERT INTO public.lab_test_pricing VALUES (23, 1, NULL, NULL, NULL, 'Creatine Kinase (CK)', 'CK001', 'Chemistry', 190.00, 'GBP', 1, '2025-10-16 14:54:46.904058', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:46.904058', '2025-10-16 14:54:46.904058');
INSERT INTO public.lab_test_pricing VALUES (24, 1, NULL, NULL, NULL, 'Cardiac Biomarkers (Troponin, CK-MB, BNP)', 'CB001', 'Cardiology', 200.00, 'GBP', 1, '2025-10-16 14:54:47.935369', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:47.935369', '2025-10-16 14:54:47.935369');
INSERT INTO public.lab_test_pricing VALUES (25, 1, NULL, NULL, NULL, 'Electrolyte Panel', 'EP001', 'Chemistry', 210.00, 'GBP', 1, '2025-10-16 14:54:48.968589', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:48.968589', '2025-10-16 14:54:48.968589');
INSERT INTO public.lab_test_pricing VALUES (26, 1, NULL, NULL, NULL, 'Uric Acid', 'UA002', 'Chemistry', 221.00, 'GBP', 1, '2025-10-16 14:54:50.006189', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:50.006189', '2025-10-16 14:54:50.006189');
INSERT INTO public.lab_test_pricing VALUES (27, 1, NULL, NULL, NULL, 'Lipase / Amylase (Pancreatic enzymes)', 'LA001', 'Chemistry', 231.00, 'GBP', 1, '2025-10-16 14:54:51.035701', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:51.035701', '2025-10-16 14:54:51.035701');
INSERT INTO public.lab_test_pricing VALUES (28, 1, NULL, NULL, NULL, 'Hepatitis B / C Serologies', 'HBC001', 'Serology', 241.00, 'GBP', 1, '2025-10-16 14:54:52.074996', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:52.074996', '2025-10-16 14:54:52.074996');
INSERT INTO public.lab_test_pricing VALUES (29, 1, NULL, NULL, NULL, 'HIV Antibody / Viral Load', 'HIV001', 'Serology', 55.00, 'GBP', 1, '2025-10-16 14:54:53.110182', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:53.110182', '2025-10-16 14:54:53.110182');
INSERT INTO public.lab_test_pricing VALUES (30, 1, NULL, NULL, NULL, 'HCG (Pregnancy / Quantitative)', 'HCG001', 'Endocrinology', 66.00, 'GBP', 1, '2025-10-16 14:54:54.140551', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:54.140551', '2025-10-16 14:54:54.140551');
INSERT INTO public.lab_test_pricing VALUES (31, 1, NULL, NULL, NULL, 'Autoimmune Panels (ANA, ENA, Rheumatoid Factor)', 'AP001', 'Immunology', 99.00, 'GBP', 1, '2025-10-16 14:54:55.184181', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:55.184181', '2025-10-16 14:54:55.184181');
INSERT INTO public.lab_test_pricing VALUES (32, 1, NULL, NULL, NULL, 'Tumor Markers (e.g. CA-125, CEA, AFP)', 'TM001', 'Oncology', 10.00, 'GBP', 1, '2025-10-16 14:54:56.212733', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:56.212733', '2025-10-16 14:54:56.212733');
INSERT INTO public.lab_test_pricing VALUES (33, 1, NULL, NULL, NULL, 'Blood Culture & Sensitivity', 'BCS001', 'Microbiology', 22.00, 'GBP', 1, '2025-10-16 14:54:57.242408', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:57.242408', '2025-10-16 14:54:57.242408');
INSERT INTO public.lab_test_pricing VALUES (34, 1, NULL, NULL, NULL, 'Stool Culture / Ova & Parasites', 'SCOP001', 'Microbiology', 30.00, 'GBP', 1, '2025-10-16 14:54:58.288039', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:58.288039', '2025-10-16 14:54:58.288039');
INSERT INTO public.lab_test_pricing VALUES (35, 1, NULL, NULL, NULL, 'Sputum Culture', 'SC001', 'Microbiology', 40.00, 'GBP', 1, '2025-10-16 14:54:59.322424', NULL, true, 1, NULL, '{}', '2025-10-16 14:54:59.322424', '2025-10-16 14:54:59.322424');
INSERT INTO public.lab_test_pricing VALUES (36, 1, NULL, NULL, NULL, 'Viral Panels / PCR Tests (e.g. COVID-19, Influenza)', 'VP001', 'Microbiology', 50.00, 'GBP', 1, '2025-10-16 14:55:00.366506', NULL, true, 1, NULL, '{}', '2025-10-16 14:55:00.366506', '2025-10-16 14:55:00.366506');
INSERT INTO public.lab_test_pricing VALUES (37, 1, NULL, NULL, NULL, 'Hormonal tests (Cortisol, ACTH)', 'HT001', 'Endocrinology', 70.00, 'GBP', 1, '2025-10-16 14:55:01.4012', NULL, true, 1, NULL, '{}', '2025-10-16 14:55:01.4012', '2025-10-16 19:23:43.062');


--
-- Data for Name: letter_drafts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: medical_images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.medical_images VALUES (1, 1, 2, 1, 'Chest X-ray', 'X-Ray', 'dcd', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 19:25:41.606', '2025-10-16 19:25:41.606', 'IMG1760647135I1ONC');
INSERT INTO public.medical_images VALUES (2, 1, 2, 1, 'Chest X-ray', 'X-Ray', 'dcd', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 19:29:38.208', '2025-10-16 19:29:38.208', 'IMG1760647135I2ONC');
INSERT INTO public.medical_images VALUES (3, 1, 2, 1, 'Chest X-ray', 'X-Ray', 'dcd', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 19:29:38.465', '2025-10-16 19:29:38.465', 'IMG1760647135I3ONC');
INSERT INTO public.medical_images VALUES (4, 1, 2, 1, 'Chest X-ray', 'X-Ray', 'dcd', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 19:29:39.337', '2025-10-16 19:29:39.337', 'IMG1760647135I4ONC');
INSERT INTO public.medical_images VALUES (5, 1, 2, 1, 'Chest X-ray', 'X-Ray', 'dcd', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 19:29:39.758', '2025-10-16 19:29:39.758', 'IMG1760647135I5ONC');
INSERT INTO public.medical_images VALUES (6, 1, 2, 1, 'X-ray (Radiography)', 'CT', 'CT Chest', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 20:15:19.019', '2025-10-16 20:15:19.019', 'IMG1760647135I6ONC');
INSERT INTO public.medical_images VALUES (7, 1, 2, 1, 'X-ray (Radiography)', 'CT', 'CT Chest', '', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 20:15:36.139', '2025-10-16 20:15:36.139', 'IMG1760647135I7ONC');
INSERT INTO public.medical_images VALUES (8, 1, 2, 1, 'Nuclear Medicine Scans', 'CT', 'CT Abdomen & Pelvis', 'mome', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 20:16:11.067', '2025-10-16 20:16:11.067', 'IMG1760647135I8ONC');
INSERT INTO public.medical_images VALUES (9, 1, 2, 1, 'Nuclear Medicine Scans', 'CT', 'CT Abdomen & Pelvis', 'mome', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 20:20:04.189', '2025-10-16 20:20:04.189', 'IMG1760647135I9ONC');
INSERT INTO public.medical_images VALUES (11, 1, 2, 1, 'X-ray (Radiography)', 'X-Ray', 'Chest X-Ray (PA / Lateral)', 'none', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 20:26:06.704', '2025-10-16 20:26:06.704', 'IMG1760647135I11ONC');
INSERT INTO public.medical_images VALUES (10, 1, 2, 1, 'Nuclear Medicine Scans', 'CT', 'CT Abdomen & Pelvis', 'mome', 'routine', 'P002_Images.png', 78456, 'image/png', NULL, 'uploaded', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2025-10-16 20:20:05.734', '2025-10-16 20:35:54.996', 'IMG1760647135I10ONC');
INSERT INTO public.medical_images VALUES (12, 1, 2, 1, 'Angiography', 'X-Ray', 'Chest X-Ray (PA / Lateral)', 'none', 'routine', 'P002_Images.png', 30909, 'image/png', NULL, 'uploaded', 'Medical image uploaded: P002_Images.png', 'File: P002_Images.png (0.03 MB)', 'John Administrator', 'P002_12_2025-10-17T03-32-02.pdf', '/home/runner/workspace/uploads/Imaging_Reports/1/patients/P002/P002_12_2025-10-17T03-32-02.pdf', '{}', NULL, NULL, '2025-10-16 20:38:22.286', '2025-10-17 03:32:03.481', 'IMG1760647135I12ONC');
INSERT INTO public.medical_images VALUES (26, 1, 2, 1, 'X-ray (Radiography)', 'X-Ray', 'Chest X-Ray (PA / Lateral)', '', 'routine', 'IMG1760674391245I26ONC.png', 78456, 'image/png', NULL, 'uploaded', 'Medical image uploaded: IMG1760674391245I26ONC.png', 'File: IMG1760674391245I26ONC.png (0.07 MB)', 'John Administrator', 'P002_26_2025-10-17T04-18-26.pdf', '/home/runner/workspace/uploads/Imaging_Reports/1/patients/P002/P002_26_2025-10-17T04-18-26.pdf', '{}', NULL, NULL, '2025-10-17 04:13:11.245', '2025-10-17 04:18:28.171', 'IMG1760674391245I26ONC');
INSERT INTO public.medical_images VALUES (25, 1, 2, 1, 'X-ray (Radiography)', 'X-Ray', 'Chest X-Ray (PA / Lateral)', '', 'routine', 'IMG1760674379968I25ONC.png', 78456, 'image/png', NULL, 'uploaded', 'Medical image uploaded: IMG1760674379968I25ONC.png', 'File: IMG1760674379968I25ONC.png (0.07 MB)', 'John Administrator', 'P002_25_2025-10-17T04-18-48.pdf', '/home/runner/workspace/uploads/Imaging_Reports/1/patients/P002/P002_25_2025-10-17T04-18-48.pdf', '{}', NULL, NULL, '2025-10-17 04:12:59.968', '2025-10-17 04:18:49.429', 'IMG1760674379968I25ONC');
INSERT INTO public.medical_images VALUES (27, 1, 1, 1, 'DEXA (Bone Densitometry)', 'CT', 'CT Chest', 'none', 'routine', 'IMG1760674762540I27ONC.png', 30909, 'image/png', NULL, 'uploaded', 'Medical image uploaded: IMG1760674762540I27ONC.png', 'File: IMG1760674762540I27ONC.png (0.03 MB)', 'John Administrator', 'P001_27_2025-10-17T04-19-46.pdf', '/home/runner/workspace/uploads/Imaging_Reports/1/patients/P001/P001_27_2025-10-17T04-19-46.pdf', '{}', NULL, NULL, '2025-10-17 04:19:22.54', '2025-10-17 04:19:46.244', 'IMG1760674762540I27ONC');
INSERT INTO public.medical_images VALUES (29, 1, 1, 1, 'Angiography', 'X-Ray', 'Spine X-Ray (Cervical / Lumbar)', 'none', 'routine', 'IMG1760675771097I29ONC.png', 29677, 'image/jpeg', NULL, 'uploaded', 'Medical image uploaded: IMG1760675771097I29ONC.png', 'File: IMG1760675771097I29ONC.png (0.03 MB)', 'John Administrator', 'IMG1760675771097I29ONC.pdf', '/home/runner/workspace/uploads/Imaging_Reports/1/patients/1/IMG1760675771097I29ONC.pdf', '{}', NULL, NULL, '2025-10-17 04:36:11.097', '2025-10-17 06:47:19.714', 'IMG1760675771097I29ONC');
INSERT INTO public.medical_images VALUES (28, 1, 1, 1, 'Angiography', 'X-Ray', 'Abdomen X-Ray', '', 'routine', 'IMG1760675245195I28ONC.png', 30909, 'image/png', NULL, 'uploaded', 'Medical image uploaded: IMG1760675245195I28ONC.png', 'File: IMG1760675245195I28ONC.png (0.03 MB)', 'John Administrator', 'IMG1760675245195I28ONC.pdf', '/home/runner/workspace/uploads/Imaging_Reports/1/patients/1/IMG1760675245195I28ONC.pdf', '{}', NULL, NULL, '2025-10-17 04:27:25.195', '2025-10-17 06:22:39.442', 'IMG1760675245195I28ONC');


--
-- Data for Name: medical_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.medical_records VALUES (1, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 13:17:26.819254');
INSERT INTO public.medical_records VALUES (2, 1, 1, 2, 'consultation', 'Anatomical Analysis - Orbicularis Oris', 'FACIAL MUSCLE ANALYSIS REPORT

Patient: Alice Williams
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

Patient: Alice Williams
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


Analysis completed on: Aug 25, 2025, 1:17:24 PM', 'Anatomical analysis of orbicularis oris - nerve function', 'Botox Injection', '{}', '[]', '{}', '2025-10-16 13:17:34.209235');
INSERT INTO public.medical_records VALUES (3, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 13:49:28.866425');
INSERT INTO public.medical_records VALUES (4, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 14:02:55.532479');
INSERT INTO public.medical_records VALUES (5, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 14:10:29.619551');
INSERT INTO public.medical_records VALUES (6, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 14:17:22.807267');
INSERT INTO public.medical_records VALUES (7, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 14:22:01.703048');
INSERT INTO public.medical_records VALUES (8, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 14:28:34.603374');
INSERT INTO public.medical_records VALUES (9, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 14:50:55.60469');
INSERT INTO public.medical_records VALUES (10, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 15:13:40.488749');
INSERT INTO public.medical_records VALUES (11, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 17:47:48.144387');
INSERT INTO public.medical_records VALUES (12, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 17:55:16.602018');
INSERT INTO public.medical_records VALUES (13, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:10:27.282202');
INSERT INTO public.medical_records VALUES (14, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:13:53.426744');
INSERT INTO public.medical_records VALUES (15, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:19:40.199431');
INSERT INTO public.medical_records VALUES (16, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:27:57.58573');
INSERT INTO public.medical_records VALUES (17, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:38:27.320871');
INSERT INTO public.medical_records VALUES (18, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:45:58.196438');
INSERT INTO public.medical_records VALUES (19, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:50:12.783175');
INSERT INTO public.medical_records VALUES (20, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:53:41.84184');
INSERT INTO public.medical_records VALUES (21, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 18:59:02.772663');
INSERT INTO public.medical_records VALUES (22, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:03:32.79179');
INSERT INTO public.medical_records VALUES (23, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:12:30.962666');
INSERT INTO public.medical_records VALUES (24, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:15:35.4387');
INSERT INTO public.medical_records VALUES (25, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:20:36.293154');
INSERT INTO public.medical_records VALUES (26, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:24:01.173228');
INSERT INTO public.medical_records VALUES (27, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:51:48.896792');
INSERT INTO public.medical_records VALUES (28, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 19:56:30.677898');
INSERT INTO public.medical_records VALUES (29, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 20:04:21.188535');
INSERT INTO public.medical_records VALUES (30, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 20:14:12.977243');
INSERT INTO public.medical_records VALUES (31, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-16 20:39:33.51049');
INSERT INTO public.medical_records VALUES (32, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 03:30:30.160135');
INSERT INTO public.medical_records VALUES (33, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 04:11:45.588303');
INSERT INTO public.medical_records VALUES (34, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 04:41:56.939162');
INSERT INTO public.medical_records VALUES (35, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:00:04.316274');
INSERT INTO public.medical_records VALUES (36, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:16:28.32177');
INSERT INTO public.medical_records VALUES (37, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:23:31.232113');
INSERT INTO public.medical_records VALUES (38, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:27:34.661659');
INSERT INTO public.medical_records VALUES (39, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:34:38.779553');
INSERT INTO public.medical_records VALUES (40, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:43:28.294228');
INSERT INTO public.medical_records VALUES (41, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:49:52.688244');
INSERT INTO public.medical_records VALUES (42, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 05:56:43.031662');
INSERT INTO public.medical_records VALUES (43, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 06:01:37.274524');
INSERT INTO public.medical_records VALUES (44, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 06:08:02.348337');
INSERT INTO public.medical_records VALUES (45, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 06:16:55.86012');
INSERT INTO public.medical_records VALUES (47, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 06:34:34.381768');
INSERT INTO public.medical_records VALUES (48, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 06:42:28.130309');
INSERT INTO public.medical_records VALUES (49, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 06:50:18.64841');
INSERT INTO public.medical_records VALUES (50, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 07:26:47.055342');
INSERT INTO public.medical_records VALUES (51, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 09:04:38.358634');
INSERT INTO public.medical_records VALUES (52, 1, 1, 2, 'consultation', 'Initial Cardiac Assessment', 'Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.', 'Essential Hypertension (I10)', 'Continue current medication, dietary consultation recommended', '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}', '[]', '{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}', '2025-10-17 12:55:29.481152');


--
-- Data for Name: medications_database; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: muscles_position; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.notifications VALUES (1, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 13:17:27.401713', '2025-10-16 13:17:27.401713');
INSERT INTO public.notifications VALUES (2, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 13:17:27.401713', '2025-10-16 13:17:27.401713');
INSERT INTO public.notifications VALUES (3, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 13:17:27.401713', '2025-10-16 13:17:27.401713');
INSERT INTO public.notifications VALUES (4, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 11:17:27.101', NULL, '2025-10-16 13:17:27.401713', '2025-10-16 13:17:27.401713');
INSERT INTO public.notifications VALUES (5, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 13:17:27.401713', '2025-10-16 13:17:27.401713');
INSERT INTO public.notifications VALUES (6, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 13:49:29.213359', '2025-10-16 13:49:29.213359');
INSERT INTO public.notifications VALUES (7, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 13:49:29.213359', '2025-10-16 13:49:29.213359');
INSERT INTO public.notifications VALUES (8, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 13:49:29.213359', '2025-10-16 13:49:29.213359');
INSERT INTO public.notifications VALUES (9, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 11:49:29.073', NULL, '2025-10-16 13:49:29.213359', '2025-10-16 13:49:29.213359');
INSERT INTO public.notifications VALUES (10, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 13:49:29.213359', '2025-10-16 13:49:29.213359');
INSERT INTO public.notifications VALUES (11, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 14:02:55.850143', '2025-10-16 14:02:55.850143');
INSERT INTO public.notifications VALUES (12, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 14:02:55.850143', '2025-10-16 14:02:55.850143');
INSERT INTO public.notifications VALUES (13, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 14:02:55.850143', '2025-10-16 14:02:55.850143');
INSERT INTO public.notifications VALUES (14, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 12:02:55.729', NULL, '2025-10-16 14:02:55.850143', '2025-10-16 14:02:55.850143');
INSERT INTO public.notifications VALUES (15, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 14:02:55.850143', '2025-10-16 14:02:55.850143');
INSERT INTO public.notifications VALUES (16, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 14:10:30.034111', '2025-10-16 14:10:30.034111');
INSERT INTO public.notifications VALUES (17, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 14:10:30.034111', '2025-10-16 14:10:30.034111');
INSERT INTO public.notifications VALUES (18, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 14:10:30.034111', '2025-10-16 14:10:30.034111');
INSERT INTO public.notifications VALUES (19, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 12:10:29.816', NULL, '2025-10-16 14:10:30.034111', '2025-10-16 14:10:30.034111');
INSERT INTO public.notifications VALUES (20, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 14:10:30.034111', '2025-10-16 14:10:30.034111');
INSERT INTO public.notifications VALUES (21, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 14:17:23.076433', '2025-10-16 14:17:23.076433');
INSERT INTO public.notifications VALUES (22, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 14:17:23.076433', '2025-10-16 14:17:23.076433');
INSERT INTO public.notifications VALUES (23, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 14:17:23.076433', '2025-10-16 14:17:23.076433');
INSERT INTO public.notifications VALUES (24, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 12:17:22.934', NULL, '2025-10-16 14:17:23.076433', '2025-10-16 14:17:23.076433');
INSERT INTO public.notifications VALUES (25, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 14:17:23.076433', '2025-10-16 14:17:23.076433');
INSERT INTO public.notifications VALUES (26, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 14:22:02.032293', '2025-10-16 14:22:02.032293');
INSERT INTO public.notifications VALUES (27, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 14:22:02.032293', '2025-10-16 14:22:02.032293');
INSERT INTO public.notifications VALUES (28, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 14:22:02.032293', '2025-10-16 14:22:02.032293');
INSERT INTO public.notifications VALUES (29, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 12:22:01.888', NULL, '2025-10-16 14:22:02.032293', '2025-10-16 14:22:02.032293');
INSERT INTO public.notifications VALUES (30, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 14:22:02.032293', '2025-10-16 14:22:02.032293');
INSERT INTO public.notifications VALUES (31, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 14:28:34.924642', '2025-10-16 14:28:34.924642');
INSERT INTO public.notifications VALUES (32, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 14:28:34.924642', '2025-10-16 14:28:34.924642');
INSERT INTO public.notifications VALUES (33, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 14:28:34.924642', '2025-10-16 14:28:34.924642');
INSERT INTO public.notifications VALUES (34, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 12:28:34.789', NULL, '2025-10-16 14:28:34.924642', '2025-10-16 14:28:34.924642');
INSERT INTO public.notifications VALUES (35, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 14:28:34.924642', '2025-10-16 14:28:34.924642');
INSERT INTO public.notifications VALUES (36, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 14:50:56.29364', '2025-10-16 14:50:56.29364');
INSERT INTO public.notifications VALUES (37, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 14:50:56.29364', '2025-10-16 14:50:56.29364');
INSERT INTO public.notifications VALUES (38, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 14:50:56.29364', '2025-10-16 14:50:56.29364');
INSERT INTO public.notifications VALUES (39, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 12:50:56.169', NULL, '2025-10-16 14:50:56.29364', '2025-10-16 14:50:56.29364');
INSERT INTO public.notifications VALUES (40, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 14:50:56.29364', '2025-10-16 14:50:56.29364');
INSERT INTO public.notifications VALUES (41, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 15:13:46.977515', '2025-10-16 15:13:46.977515');
INSERT INTO public.notifications VALUES (42, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 15:13:46.977515', '2025-10-16 15:13:46.977515');
INSERT INTO public.notifications VALUES (43, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 15:13:46.977515', '2025-10-16 15:13:46.977515');
INSERT INTO public.notifications VALUES (44, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 13:13:46.852', NULL, '2025-10-16 15:13:46.977515', '2025-10-16 15:13:46.977515');
INSERT INTO public.notifications VALUES (45, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 15:13:46.977515', '2025-10-16 15:13:46.977515');
INSERT INTO public.notifications VALUES (46, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 17:47:50.439269', '2025-10-16 17:47:50.439269');
INSERT INTO public.notifications VALUES (47, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 17:47:50.439269', '2025-10-16 17:47:50.439269');
INSERT INTO public.notifications VALUES (48, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 17:47:50.439269', '2025-10-16 17:47:50.439269');
INSERT INTO public.notifications VALUES (49, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 15:47:49.334', NULL, '2025-10-16 17:47:50.439269', '2025-10-16 17:47:50.439269');
INSERT INTO public.notifications VALUES (50, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 17:47:50.439269', '2025-10-16 17:47:50.439269');
INSERT INTO public.notifications VALUES (51, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 17:55:16.889811', '2025-10-16 17:55:16.889811');
INSERT INTO public.notifications VALUES (52, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 17:55:16.889811', '2025-10-16 17:55:16.889811');
INSERT INTO public.notifications VALUES (53, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 17:55:16.889811', '2025-10-16 17:55:16.889811');
INSERT INTO public.notifications VALUES (54, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 15:55:16.768', NULL, '2025-10-16 17:55:16.889811', '2025-10-16 17:55:16.889811');
INSERT INTO public.notifications VALUES (55, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 17:55:16.889811', '2025-10-16 17:55:16.889811');
INSERT INTO public.notifications VALUES (56, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:10:27.602252', '2025-10-16 18:10:27.602252');
INSERT INTO public.notifications VALUES (57, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:10:27.602252', '2025-10-16 18:10:27.602252');
INSERT INTO public.notifications VALUES (58, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:10:27.602252', '2025-10-16 18:10:27.602252');
INSERT INTO public.notifications VALUES (59, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:10:27.417', NULL, '2025-10-16 18:10:27.602252', '2025-10-16 18:10:27.602252');
INSERT INTO public.notifications VALUES (60, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:10:27.602252', '2025-10-16 18:10:27.602252');
INSERT INTO public.notifications VALUES (61, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:13:53.8187', '2025-10-16 18:13:53.8187');
INSERT INTO public.notifications VALUES (62, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:13:53.8187', '2025-10-16 18:13:53.8187');
INSERT INTO public.notifications VALUES (63, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:13:53.8187', '2025-10-16 18:13:53.8187');
INSERT INTO public.notifications VALUES (64, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:13:53.698', NULL, '2025-10-16 18:13:53.8187', '2025-10-16 18:13:53.8187');
INSERT INTO public.notifications VALUES (65, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:13:53.8187', '2025-10-16 18:13:53.8187');
INSERT INTO public.notifications VALUES (66, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:19:40.53656', '2025-10-16 18:19:40.53656');
INSERT INTO public.notifications VALUES (67, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:19:40.53656', '2025-10-16 18:19:40.53656');
INSERT INTO public.notifications VALUES (68, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:19:40.53656', '2025-10-16 18:19:40.53656');
INSERT INTO public.notifications VALUES (69, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:19:40.418', NULL, '2025-10-16 18:19:40.53656', '2025-10-16 18:19:40.53656');
INSERT INTO public.notifications VALUES (70, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:19:40.53656', '2025-10-16 18:19:40.53656');
INSERT INTO public.notifications VALUES (71, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:27:57.920751', '2025-10-16 18:27:57.920751');
INSERT INTO public.notifications VALUES (72, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:27:57.920751', '2025-10-16 18:27:57.920751');
INSERT INTO public.notifications VALUES (73, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:27:57.920751', '2025-10-16 18:27:57.920751');
INSERT INTO public.notifications VALUES (74, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:27:57.785', NULL, '2025-10-16 18:27:57.920751', '2025-10-16 18:27:57.920751');
INSERT INTO public.notifications VALUES (75, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:27:57.920751', '2025-10-16 18:27:57.920751');
INSERT INTO public.notifications VALUES (76, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:38:27.714125', '2025-10-16 18:38:27.714125');
INSERT INTO public.notifications VALUES (77, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:38:27.714125', '2025-10-16 18:38:27.714125');
INSERT INTO public.notifications VALUES (78, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:38:27.714125', '2025-10-16 18:38:27.714125');
INSERT INTO public.notifications VALUES (79, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:38:27.593', NULL, '2025-10-16 18:38:27.714125', '2025-10-16 18:38:27.714125');
INSERT INTO public.notifications VALUES (80, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:38:27.714125', '2025-10-16 18:38:27.714125');
INSERT INTO public.notifications VALUES (81, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:45:58.833947', '2025-10-16 18:45:58.833947');
INSERT INTO public.notifications VALUES (82, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:45:58.833947', '2025-10-16 18:45:58.833947');
INSERT INTO public.notifications VALUES (83, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:45:58.833947', '2025-10-16 18:45:58.833947');
INSERT INTO public.notifications VALUES (84, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:45:58.714', NULL, '2025-10-16 18:45:58.833947', '2025-10-16 18:45:58.833947');
INSERT INTO public.notifications VALUES (85, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:45:58.833947', '2025-10-16 18:45:58.833947');
INSERT INTO public.notifications VALUES (86, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:50:13.196346', '2025-10-16 18:50:13.196346');
INSERT INTO public.notifications VALUES (87, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:50:13.196346', '2025-10-16 18:50:13.196346');
INSERT INTO public.notifications VALUES (88, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:50:13.196346', '2025-10-16 18:50:13.196346');
INSERT INTO public.notifications VALUES (89, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:50:13.035', NULL, '2025-10-16 18:50:13.196346', '2025-10-16 18:50:13.196346');
INSERT INTO public.notifications VALUES (90, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:50:13.196346', '2025-10-16 18:50:13.196346');
INSERT INTO public.notifications VALUES (91, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:53:42.082919', '2025-10-16 18:53:42.082919');
INSERT INTO public.notifications VALUES (92, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:53:42.082919', '2025-10-16 18:53:42.082919');
INSERT INTO public.notifications VALUES (93, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:53:42.082919', '2025-10-16 18:53:42.082919');
INSERT INTO public.notifications VALUES (94, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:53:41.966', NULL, '2025-10-16 18:53:42.082919', '2025-10-16 18:53:42.082919');
INSERT INTO public.notifications VALUES (95, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:53:42.082919', '2025-10-16 18:53:42.082919');
INSERT INTO public.notifications VALUES (96, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 18:59:03.266202', '2025-10-16 18:59:03.266202');
INSERT INTO public.notifications VALUES (97, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 18:59:03.266202', '2025-10-16 18:59:03.266202');
INSERT INTO public.notifications VALUES (98, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 18:59:03.266202', '2025-10-16 18:59:03.266202');
INSERT INTO public.notifications VALUES (99, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 16:59:03.145', NULL, '2025-10-16 18:59:03.266202', '2025-10-16 18:59:03.266202');
INSERT INTO public.notifications VALUES (100, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 18:59:03.266202', '2025-10-16 18:59:03.266202');
INSERT INTO public.notifications VALUES (101, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:03:33.231552', '2025-10-16 19:03:33.231552');
INSERT INTO public.notifications VALUES (102, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:03:33.231552', '2025-10-16 19:03:33.231552');
INSERT INTO public.notifications VALUES (103, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:03:33.231552', '2025-10-16 19:03:33.231552');
INSERT INTO public.notifications VALUES (104, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:03:33.113', NULL, '2025-10-16 19:03:33.231552', '2025-10-16 19:03:33.231552');
INSERT INTO public.notifications VALUES (105, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:03:33.231552', '2025-10-16 19:03:33.231552');
INSERT INTO public.notifications VALUES (190, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:34:39.209334', '2025-10-17 05:34:39.209334');
INSERT INTO public.notifications VALUES (106, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:12:31.239797', '2025-10-16 19:12:31.239797');
INSERT INTO public.notifications VALUES (107, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:12:31.239797', '2025-10-16 19:12:31.239797');
INSERT INTO public.notifications VALUES (108, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:12:31.239797', '2025-10-16 19:12:31.239797');
INSERT INTO public.notifications VALUES (109, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:12:31.121', NULL, '2025-10-16 19:12:31.239797', '2025-10-16 19:12:31.239797');
INSERT INTO public.notifications VALUES (110, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:12:31.239797', '2025-10-16 19:12:31.239797');
INSERT INTO public.notifications VALUES (111, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:15:35.71378', '2025-10-16 19:15:35.71378');
INSERT INTO public.notifications VALUES (112, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:15:35.71378', '2025-10-16 19:15:35.71378');
INSERT INTO public.notifications VALUES (113, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:15:35.71378', '2025-10-16 19:15:35.71378');
INSERT INTO public.notifications VALUES (114, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:15:35.593', NULL, '2025-10-16 19:15:35.71378', '2025-10-16 19:15:35.71378');
INSERT INTO public.notifications VALUES (115, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:15:35.71378', '2025-10-16 19:15:35.71378');
INSERT INTO public.notifications VALUES (116, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:20:36.657431', '2025-10-16 19:20:36.657431');
INSERT INTO public.notifications VALUES (117, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:20:36.657431', '2025-10-16 19:20:36.657431');
INSERT INTO public.notifications VALUES (118, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:20:36.657431', '2025-10-16 19:20:36.657431');
INSERT INTO public.notifications VALUES (119, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:20:36.535', NULL, '2025-10-16 19:20:36.657431', '2025-10-16 19:20:36.657431');
INSERT INTO public.notifications VALUES (120, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:20:36.657431', '2025-10-16 19:20:36.657431');
INSERT INTO public.notifications VALUES (121, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:24:01.604223', '2025-10-16 19:24:01.604223');
INSERT INTO public.notifications VALUES (122, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:24:01.604223', '2025-10-16 19:24:01.604223');
INSERT INTO public.notifications VALUES (123, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:24:01.604223', '2025-10-16 19:24:01.604223');
INSERT INTO public.notifications VALUES (124, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:24:01.47', NULL, '2025-10-16 19:24:01.604223', '2025-10-16 19:24:01.604223');
INSERT INTO public.notifications VALUES (125, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:24:01.604223', '2025-10-16 19:24:01.604223');
INSERT INTO public.notifications VALUES (126, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:51:49.25173', '2025-10-16 19:51:49.25173');
INSERT INTO public.notifications VALUES (127, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:51:49.25173', '2025-10-16 19:51:49.25173');
INSERT INTO public.notifications VALUES (128, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:51:49.25173', '2025-10-16 19:51:49.25173');
INSERT INTO public.notifications VALUES (129, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:51:49.132', NULL, '2025-10-16 19:51:49.25173', '2025-10-16 19:51:49.25173');
INSERT INTO public.notifications VALUES (130, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:51:49.25173', '2025-10-16 19:51:49.25173');
INSERT INTO public.notifications VALUES (131, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 19:56:30.986044', '2025-10-16 19:56:30.986044');
INSERT INTO public.notifications VALUES (132, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 19:56:30.986044', '2025-10-16 19:56:30.986044');
INSERT INTO public.notifications VALUES (133, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 19:56:30.986044', '2025-10-16 19:56:30.986044');
INSERT INTO public.notifications VALUES (134, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 17:56:30.866', NULL, '2025-10-16 19:56:30.986044', '2025-10-16 19:56:30.986044');
INSERT INTO public.notifications VALUES (135, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 19:56:30.986044', '2025-10-16 19:56:30.986044');
INSERT INTO public.notifications VALUES (136, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 20:04:21.522542', '2025-10-16 20:04:21.522542');
INSERT INTO public.notifications VALUES (137, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 20:04:21.522542', '2025-10-16 20:04:21.522542');
INSERT INTO public.notifications VALUES (138, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 20:04:21.522542', '2025-10-16 20:04:21.522542');
INSERT INTO public.notifications VALUES (139, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 18:04:21.406', NULL, '2025-10-16 20:04:21.522542', '2025-10-16 20:04:21.522542');
INSERT INTO public.notifications VALUES (140, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 20:04:21.522542', '2025-10-16 20:04:21.522542');
INSERT INTO public.notifications VALUES (141, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 20:14:13.264481', '2025-10-16 20:14:13.264481');
INSERT INTO public.notifications VALUES (142, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 20:14:13.264481', '2025-10-16 20:14:13.264481');
INSERT INTO public.notifications VALUES (143, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 20:14:13.264481', '2025-10-16 20:14:13.264481');
INSERT INTO public.notifications VALUES (144, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 18:14:13.141', NULL, '2025-10-16 20:14:13.264481', '2025-10-16 20:14:13.264481');
INSERT INTO public.notifications VALUES (145, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 20:14:13.264481', '2025-10-16 20:14:13.264481');
INSERT INTO public.notifications VALUES (146, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-16 20:39:40.645894', '2025-10-16 20:39:40.645894');
INSERT INTO public.notifications VALUES (147, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-16 20:39:40.645894', '2025-10-16 20:39:40.645894');
INSERT INTO public.notifications VALUES (148, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-16 20:39:40.645894', '2025-10-16 20:39:40.645894');
INSERT INTO public.notifications VALUES (149, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-16 18:39:40.526', NULL, '2025-10-16 20:39:40.645894', '2025-10-16 20:39:40.645894');
INSERT INTO public.notifications VALUES (150, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-16 20:39:40.645894', '2025-10-16 20:39:40.645894');
INSERT INTO public.notifications VALUES (151, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 03:30:30.403086', '2025-10-17 03:30:30.403086');
INSERT INTO public.notifications VALUES (152, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 03:30:30.403086', '2025-10-17 03:30:30.403086');
INSERT INTO public.notifications VALUES (153, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 03:30:30.403086', '2025-10-17 03:30:30.403086');
INSERT INTO public.notifications VALUES (154, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 01:30:30.29', NULL, '2025-10-17 03:30:30.403086', '2025-10-17 03:30:30.403086');
INSERT INTO public.notifications VALUES (155, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 03:30:30.403086', '2025-10-17 03:30:30.403086');
INSERT INTO public.notifications VALUES (156, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 04:11:46.657362', '2025-10-17 04:11:46.657362');
INSERT INTO public.notifications VALUES (157, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 04:11:46.657362', '2025-10-17 04:11:46.657362');
INSERT INTO public.notifications VALUES (158, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 04:11:46.657362', '2025-10-17 04:11:46.657362');
INSERT INTO public.notifications VALUES (159, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 02:11:46.538', NULL, '2025-10-17 04:11:46.657362', '2025-10-17 04:11:46.657362');
INSERT INTO public.notifications VALUES (160, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 04:11:46.657362', '2025-10-17 04:11:46.657362');
INSERT INTO public.notifications VALUES (161, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 04:41:57.464552', '2025-10-17 04:41:57.464552');
INSERT INTO public.notifications VALUES (162, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 04:41:57.464552', '2025-10-17 04:41:57.464552');
INSERT INTO public.notifications VALUES (163, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 04:41:57.464552', '2025-10-17 04:41:57.464552');
INSERT INTO public.notifications VALUES (164, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 02:41:57.343', NULL, '2025-10-17 04:41:57.464552', '2025-10-17 04:41:57.464552');
INSERT INTO public.notifications VALUES (165, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 04:41:57.464552', '2025-10-17 04:41:57.464552');
INSERT INTO public.notifications VALUES (166, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:00:05.078995', '2025-10-17 05:00:05.078995');
INSERT INTO public.notifications VALUES (167, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:00:05.078995', '2025-10-17 05:00:05.078995');
INSERT INTO public.notifications VALUES (168, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:00:05.078995', '2025-10-17 05:00:05.078995');
INSERT INTO public.notifications VALUES (169, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:00:04.953', NULL, '2025-10-17 05:00:05.078995', '2025-10-17 05:00:05.078995');
INSERT INTO public.notifications VALUES (170, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:00:05.078995', '2025-10-17 05:00:05.078995');
INSERT INTO public.notifications VALUES (171, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:16:28.78744', '2025-10-17 05:16:28.78744');
INSERT INTO public.notifications VALUES (172, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:16:28.78744', '2025-10-17 05:16:28.78744');
INSERT INTO public.notifications VALUES (173, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:16:28.78744', '2025-10-17 05:16:28.78744');
INSERT INTO public.notifications VALUES (174, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:16:28.643', NULL, '2025-10-17 05:16:28.78744', '2025-10-17 05:16:28.78744');
INSERT INTO public.notifications VALUES (175, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:16:28.78744', '2025-10-17 05:16:28.78744');
INSERT INTO public.notifications VALUES (176, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:23:31.580068', '2025-10-17 05:23:31.580068');
INSERT INTO public.notifications VALUES (177, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:23:31.580068', '2025-10-17 05:23:31.580068');
INSERT INTO public.notifications VALUES (178, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:23:31.580068', '2025-10-17 05:23:31.580068');
INSERT INTO public.notifications VALUES (179, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:23:31.465', NULL, '2025-10-17 05:23:31.580068', '2025-10-17 05:23:31.580068');
INSERT INTO public.notifications VALUES (180, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:23:31.580068', '2025-10-17 05:23:31.580068');
INSERT INTO public.notifications VALUES (181, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:27:34.948912', '2025-10-17 05:27:34.948912');
INSERT INTO public.notifications VALUES (182, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:27:34.948912', '2025-10-17 05:27:34.948912');
INSERT INTO public.notifications VALUES (183, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:27:34.948912', '2025-10-17 05:27:34.948912');
INSERT INTO public.notifications VALUES (184, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:27:34.826', NULL, '2025-10-17 05:27:34.948912', '2025-10-17 05:27:34.948912');
INSERT INTO public.notifications VALUES (185, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:27:34.948912', '2025-10-17 05:27:34.948912');
INSERT INTO public.notifications VALUES (186, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:34:39.209334', '2025-10-17 05:34:39.209334');
INSERT INTO public.notifications VALUES (187, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:34:39.209334', '2025-10-17 05:34:39.209334');
INSERT INTO public.notifications VALUES (188, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:34:39.209334', '2025-10-17 05:34:39.209334');
INSERT INTO public.notifications VALUES (189, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:34:39.091', NULL, '2025-10-17 05:34:39.209334', '2025-10-17 05:34:39.209334');
INSERT INTO public.notifications VALUES (191, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:43:29.501341', '2025-10-17 05:43:29.501341');
INSERT INTO public.notifications VALUES (192, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:43:29.501341', '2025-10-17 05:43:29.501341');
INSERT INTO public.notifications VALUES (193, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:43:29.501341', '2025-10-17 05:43:29.501341');
INSERT INTO public.notifications VALUES (194, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:43:29.386', NULL, '2025-10-17 05:43:29.501341', '2025-10-17 05:43:29.501341');
INSERT INTO public.notifications VALUES (195, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:43:29.501341', '2025-10-17 05:43:29.501341');
INSERT INTO public.notifications VALUES (196, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:49:53.868237', '2025-10-17 05:49:53.868237');
INSERT INTO public.notifications VALUES (197, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:49:53.868237', '2025-10-17 05:49:53.868237');
INSERT INTO public.notifications VALUES (198, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:49:53.868237', '2025-10-17 05:49:53.868237');
INSERT INTO public.notifications VALUES (199, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:49:53.742', NULL, '2025-10-17 05:49:53.868237', '2025-10-17 05:49:53.868237');
INSERT INTO public.notifications VALUES (200, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:49:53.868237', '2025-10-17 05:49:53.868237');
INSERT INTO public.notifications VALUES (201, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 05:56:43.562318', '2025-10-17 05:56:43.562318');
INSERT INTO public.notifications VALUES (202, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 05:56:43.562318', '2025-10-17 05:56:43.562318');
INSERT INTO public.notifications VALUES (203, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 05:56:43.562318', '2025-10-17 05:56:43.562318');
INSERT INTO public.notifications VALUES (204, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 03:56:43.309', NULL, '2025-10-17 05:56:43.562318', '2025-10-17 05:56:43.562318');
INSERT INTO public.notifications VALUES (205, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 05:56:43.562318', '2025-10-17 05:56:43.562318');
INSERT INTO public.notifications VALUES (206, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:01:38.193158', '2025-10-17 06:01:38.193158');
INSERT INTO public.notifications VALUES (207, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:01:38.193158', '2025-10-17 06:01:38.193158');
INSERT INTO public.notifications VALUES (208, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:01:38.193158', '2025-10-17 06:01:38.193158');
INSERT INTO public.notifications VALUES (209, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:01:38.073', NULL, '2025-10-17 06:01:38.193158', '2025-10-17 06:01:38.193158');
INSERT INTO public.notifications VALUES (210, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:01:38.193158', '2025-10-17 06:01:38.193158');
INSERT INTO public.notifications VALUES (211, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:08:02.855114', '2025-10-17 06:08:02.855114');
INSERT INTO public.notifications VALUES (212, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:08:02.855114', '2025-10-17 06:08:02.855114');
INSERT INTO public.notifications VALUES (213, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:08:02.855114', '2025-10-17 06:08:02.855114');
INSERT INTO public.notifications VALUES (214, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:08:02.737', NULL, '2025-10-17 06:08:02.855114', '2025-10-17 06:08:02.855114');
INSERT INTO public.notifications VALUES (215, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:08:02.855114', '2025-10-17 06:08:02.855114');
INSERT INTO public.notifications VALUES (216, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:16:56.459091', '2025-10-17 06:16:56.459091');
INSERT INTO public.notifications VALUES (217, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:16:56.459091', '2025-10-17 06:16:56.459091');
INSERT INTO public.notifications VALUES (218, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:16:56.459091', '2025-10-17 06:16:56.459091');
INSERT INTO public.notifications VALUES (219, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:16:56.345', NULL, '2025-10-17 06:16:56.459091', '2025-10-17 06:16:56.459091');
INSERT INTO public.notifications VALUES (220, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:16:56.459091', '2025-10-17 06:16:56.459091');
INSERT INTO public.notifications VALUES (221, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:28:53.897336', '2025-10-17 06:28:53.897336');
INSERT INTO public.notifications VALUES (222, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:28:53.897336', '2025-10-17 06:28:53.897336');
INSERT INTO public.notifications VALUES (223, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:28:53.897336', '2025-10-17 06:28:53.897336');
INSERT INTO public.notifications VALUES (224, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:28:53.779', NULL, '2025-10-17 06:28:53.897336', '2025-10-17 06:28:53.897336');
INSERT INTO public.notifications VALUES (225, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:28:53.897336', '2025-10-17 06:28:53.897336');
INSERT INTO public.notifications VALUES (226, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:34:34.746263', '2025-10-17 06:34:34.746263');
INSERT INTO public.notifications VALUES (227, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:34:34.746263', '2025-10-17 06:34:34.746263');
INSERT INTO public.notifications VALUES (228, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:34:34.746263', '2025-10-17 06:34:34.746263');
INSERT INTO public.notifications VALUES (229, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:34:34.603', NULL, '2025-10-17 06:34:34.746263', '2025-10-17 06:34:34.746263');
INSERT INTO public.notifications VALUES (230, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:34:34.746263', '2025-10-17 06:34:34.746263');
INSERT INTO public.notifications VALUES (231, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:42:28.619803', '2025-10-17 06:42:28.619803');
INSERT INTO public.notifications VALUES (232, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:42:28.619803', '2025-10-17 06:42:28.619803');
INSERT INTO public.notifications VALUES (233, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:42:28.619803', '2025-10-17 06:42:28.619803');
INSERT INTO public.notifications VALUES (234, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:42:28.499', NULL, '2025-10-17 06:42:28.619803', '2025-10-17 06:42:28.619803');
INSERT INTO public.notifications VALUES (235, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:42:28.619803', '2025-10-17 06:42:28.619803');
INSERT INTO public.notifications VALUES (236, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 06:50:18.961541', '2025-10-17 06:50:18.961541');
INSERT INTO public.notifications VALUES (237, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 06:50:18.961541', '2025-10-17 06:50:18.961541');
INSERT INTO public.notifications VALUES (238, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 06:50:18.961541', '2025-10-17 06:50:18.961541');
INSERT INTO public.notifications VALUES (239, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 04:50:18.787', NULL, '2025-10-17 06:50:18.961541', '2025-10-17 06:50:18.961541');
INSERT INTO public.notifications VALUES (240, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 06:50:18.961541', '2025-10-17 06:50:18.961541');
INSERT INTO public.notifications VALUES (241, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 07:26:54.496494', '2025-10-17 07:26:54.496494');
INSERT INTO public.notifications VALUES (242, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 07:26:54.496494', '2025-10-17 07:26:54.496494');
INSERT INTO public.notifications VALUES (243, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 07:26:54.496494', '2025-10-17 07:26:54.496494');
INSERT INTO public.notifications VALUES (244, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 05:26:49.186', NULL, '2025-10-17 07:26:54.496494', '2025-10-17 07:26:54.496494');
INSERT INTO public.notifications VALUES (245, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 07:26:54.496494', '2025-10-17 07:26:54.496494');
INSERT INTO public.notifications VALUES (246, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 09:04:38.905311', '2025-10-17 09:04:38.905311');
INSERT INTO public.notifications VALUES (247, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 09:04:38.905311', '2025-10-17 09:04:38.905311');
INSERT INTO public.notifications VALUES (248, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 09:04:38.905311', '2025-10-17 09:04:38.905311');
INSERT INTO public.notifications VALUES (249, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 07:04:38.787', NULL, '2025-10-17 09:04:38.905311', '2025-10-17 09:04:38.905311');
INSERT INTO public.notifications VALUES (250, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 09:04:38.905311', '2025-10-17 09:04:38.905311');
INSERT INTO public.notifications VALUES (251, 1, 2, 'Lab Results Available', 'Blood work results for Sarah Johnson are now available for review.', 'lab_result', 'normal', 'unread', 'patient', 1, '/patients/1/lab-results', true, NULL, NULL, '{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}', NULL, NULL, '2025-10-17 12:55:31.823245', '2025-10-17 12:55:31.823245');
INSERT INTO public.notifications VALUES (252, 1, 2, 'Appointment Reminder', 'Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.', 'appointment_reminder', 'high', 'unread', 'appointment', 912, '/calendar', true, NULL, NULL, '{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}', NULL, NULL, '2025-10-17 12:55:31.823245', '2025-10-17 12:55:31.823245');
INSERT INTO public.notifications VALUES (253, 1, 1, 'Critical Drug Interaction Alert', 'Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.', 'prescription_alert', 'critical', 'unread', 'patient', 2, '/patients/2/prescriptions', true, NULL, NULL, '{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}', NULL, NULL, '2025-10-17 12:55:31.823245', '2025-10-17 12:55:31.823245');
INSERT INTO public.notifications VALUES (254, 1, 3, 'Patient Message', 'Sarah Johnson has sent a message regarding her medication side effects.', 'message', 'normal', 'read', 'patient', 1, '/messaging/conversations/1', true, NULL, NULL, '{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}', '2025-10-17 10:55:31.563', NULL, '2025-10-17 12:55:31.823245', '2025-10-17 12:55:31.823245');
INSERT INTO public.notifications VALUES (255, 1, 2, 'System Maintenance Alert', 'Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.', 'system_alert', 'low', 'unread', NULL, NULL, NULL, false, NULL, NULL, '{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}', NULL, NULL, '2025-10-17 12:55:31.823245', '2025-10-17 12:55:31.823245');


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.organizations VALUES (1, 'Averox Healthcare', 'demo', 'admin@averox-healthcare.com', 'UK', 'MediCore Demo', '{"theme": {"logoUrl": "", "primaryColor": "#3b82f6"}, "features": {"aiEnabled": true, "billingEnabled": true}, "compliance": {"gdprEnabled": true, "dataResidency": "UK"}}', '{}', 'full', 'active', '2025-10-16 13:17:17.127069', '2025-10-16 13:17:17.127069');


--
-- Data for Name: patient_communications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: patient_drug_interactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.patients VALUES (1, 1, NULL, 'P001', 'Alice', 'Williams', '1985-03-15', NULL, 'alice.williams@email.com', '+44 7700 900123', '123 456 7890', '{"city": "London", "state": "Greater London", "street": "123 Main Street", "country": "UK", "postcode": "SW1A 1AA"}', '{}', '{"name": "Bob Williams", "phone": "+44 7700 900124", "relationship": "Spouse"}', '{"allergies": ["Penicillin", "Nuts"], "medications": ["Lisinopril 10mg"], "chronicConditions": ["Hypertension"]}', 'medium', '{}', '{}', true, false, NULL, '2025-10-16 13:17:26.525401', '2025-10-16 13:17:26.525401');
INSERT INTO public.patients VALUES (2, 1, NULL, 'P002', 'Robert', 'Davis', '1970-07-22', NULL, 'robert.davis@email.com', '+44 7700 900125', '234 567 8901', '{"city": "Manchester", "state": "Greater Manchester", "street": "456 Oak Avenue", "country": "UK", "postcode": "M1 1AA"}', '{}', '{"name": "Susan Davis", "phone": "+44 7700 900126", "relationship": "Spouse"}', '{"allergies": ["Shellfish"], "medications": ["Metformin 500mg", "Simvastatin 20mg"], "chronicConditions": ["Diabetes Type 2", "High Cholesterol"]}', 'high', '{}', '{}', true, false, NULL, '2025-10-16 13:17:26.525401', '2025-10-16 13:17:26.525401');


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.payments VALUES (1, 1, 1, '1', 'CASH-1760622612715-AAN6A', 23.00, 'GBP', 'cash', 'manual', 'completed', '2025-10-16 13:50:12.715', '{"patientName": "Alice Williams"}', '2025-10-16 13:50:12.834304', '2025-10-16 13:50:12.834304');
INSERT INTO public.payments VALUES (2, 1, 2, '1', 'CASH-1760626553381-SMV8O', 679.00, 'GBP', 'cash', 'manual', 'completed', '2025-10-16 14:55:53.381', '{"patientName": "Alice Williams"}', '2025-10-16 14:55:53.500161', '2025-10-16 14:55:53.500161');
INSERT INTO public.payments VALUES (3, 1, 3, '1', 'CASH-1760626853932-4K65LT', 70.00, 'GBP', 'cash', 'manual', 'completed', '2025-10-16 15:00:53.932', '{"patientName": "Alice Williams"}', '2025-10-16 15:00:54.061005', '2025-10-16 15:00:54.061005');
INSERT INTO public.payments VALUES (4, 1, 4, '1', 'CASH-1760636912629-TB5ZKH', 910.00, 'GBP', 'cash', 'manual', 'completed', '2025-10-16 17:48:32.629', '{"patientName": "Alice Williams"}', '2025-10-16 17:48:32.753863', '2025-10-16 17:48:32.753863');
INSERT INTO public.payments VALUES (5, 1, 5, 'P002', 'TXN-1760646387917-wfsp8a71i', 1.20, 'GBP', 'cash', 'cash', 'completed', '2025-10-16 20:26:27.917', '{}', '2025-10-16 20:26:28.705757', '2025-10-16 20:26:28.705757');
INSERT INTO public.payments VALUES (6, 1, 6, 'P002', 'TXN-1760674404134-fiqbz444l', 1.20, 'GBP', 'cash', 'cash', 'completed', '2025-10-17 04:13:24.134', '{}', '2025-10-17 04:13:25.314244', '2025-10-17 04:13:25.314244');
INSERT INTO public.payments VALUES (7, 1, 7, 'P001', 'TXN-1760674771439-kzspnehan', 1.20, 'GBP', 'cash', 'cash', 'completed', '2025-10-17 04:19:31.439', '{}', '2025-10-17 04:19:32.588711', '2025-10-17 04:19:32.588711');
INSERT INTO public.payments VALUES (8, 1, 8, 'P001', 'TXN-1760674773376-7w644qmnc', 1.20, 'GBP', 'cash', 'cash', 'completed', '2025-10-17 04:19:33.376', '{}', '2025-10-17 04:19:34.533823', '2025-10-17 04:19:34.533823');
INSERT INTO public.payments VALUES (9, 1, 9, 'P001', 'TXN-1760675252128-8e3frvp4d', 1.20, 'GBP', 'cash', 'cash', 'completed', '2025-10-17 04:27:32.129', '{}', '2025-10-17 04:27:33.312606', '2025-10-17 04:27:33.312606');
INSERT INTO public.payments VALUES (10, 1, 10, 'P001', 'TXN-1760675780123-htcjuk5f2', 1.20, 'GBP', 'cash', 'cash', 'completed', '2025-10-17 04:36:20.123', '{}', '2025-10-17 04:36:21.300199', '2025-10-17 04:36:21.300199');


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.prescriptions VALUES (1, 1, 1, 2, NULL, NULL, 'RX-1760620647877-001', 'active', 'Hypertension', 'Lisinopril', '10mg', 'Once daily', '30 days', 'Take with or without food. Monitor blood pressure.', '2025-10-16 13:17:27.994886', '[{"name": "Lisinopril", "dosage": "10mg", "refills": 5, "duration": "30 days", "quantity": 30, "frequency": "Once daily", "instructions": "Take with or without food. Monitor blood pressure.", "genericAllowed": true}]', '{"name": "City Pharmacy", "phone": "+44 20 7946 0958", "address": "123 Main St, London"}', '2025-10-16 13:17:27.994886', NULL, 'Patient tolerates ACE inhibitors well', true, '[]', '{}', '2025-10-16 13:17:27.994886', '2025-10-16 13:17:27.994886');
INSERT INTO public.prescriptions VALUES (2, 1, 2, 2, NULL, NULL, 'RX-1760620647877-002', 'active', 'Type 2 Diabetes', 'Metformin', '500mg', 'Twice daily with meals', '90 days', 'Take with breakfast and dinner', '2025-10-16 13:17:27.994886', '[{"name": "Metformin", "dosage": "500mg", "refills": 3, "duration": "90 days", "quantity": 180, "frequency": "Twice daily with meals", "instructions": "Take with breakfast and dinner", "genericAllowed": true}]', '{"name": "Local Pharmacy", "phone": "+44 20 7946 0959", "address": "456 High St, London"}', '2025-10-16 13:17:27.994886', NULL, 'Monitor blood glucose levels', true, '[]', '{}', '2025-10-16 13:17:27.994886', '2025-10-16 13:17:27.994886');


--
-- Data for Name: quickbooks_account_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_connections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_customer_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_invoice_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_item_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_payment_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_sync_configs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: quickbooks_sync_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: revenue_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.roles VALUES (1, 1, 'admin', 'Administrator', 'Full system access with all permissions', '{"fields": {"financialData": {"edit": true, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": true, "view": true, "create": true, "delete": true}, "patients": {"edit": true, "view": true, "create": true, "delete": true}, "settings": {"edit": true, "view": true, "create": true, "delete": true}, "analytics": {"edit": true, "view": true, "create": true, "delete": true}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": true}, "userManagement": {"edit": true, "view": true, "create": true, "delete": true}}}', true, '2025-10-16 13:17:31.170727', '2025-10-16 13:17:31.170727');
INSERT INTO public.roles VALUES (2, 1, 'physician', 'Physician', 'Medical professional with clinical access', '{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}', true, '2025-10-16 13:17:31.170727', '2025-10-16 13:17:31.170727');
INSERT INTO public.roles VALUES (3, 1, 'nurse', 'Nurse', 'Nursing staff with patient care access', '{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}', true, '2025-10-16 13:17:31.170727', '2025-10-16 13:17:31.170727');


--
-- Data for Name: saas_invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: saas_owners; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: saas_packages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: saas_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: saas_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: saas_subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: staff_shifts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.subscriptions VALUES (1, 1, 'Professional Plan', 'professional', 'active', 25, 3, 79.00, NULL, '2025-11-15 13:17:28.953', '{"apiAccess": true, "aiInsights": true, "whiteLabel": false, "advancedReporting": true}', '2025-10-16 13:17:29.070766', '2025-10-16 13:17:29.070766');


--
-- Data for Name: symptom_checks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: user_document_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.users VALUES (1, 1, 'admin@cura.com', 'admin', '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', 'John', 'Administrator', 'admin', 'Administration', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"end": "17:00", "start": "09:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (2, 1, 'doctor@cura.com', 'doctor', '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae', 'Sarah', 'Smith', 'doctor', 'Cardiology', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"end": "17:00", "start": "08:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (3, 1, 'nurse@cura.com', 'nurse', '$2b$12$ICMbdvIDvWPNpCJ6VmpASOm6DP3kpetC/h5A6Bgg/ucSjzMGgASJe', 'Emily', 'Johnson', 'nurse', 'General Medicine', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '{"end": "19:00", "start": "07:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (4, 1, 'patient@cura.com', 'patient', '$2b$12$.f8QJZ5CKKpv0kQ1ljMwZusOKuUrmI/II6F7xhH7eyw49Kt3xOK26', 'Michael', 'Patient', 'patient', NULL, NULL, NULL, '[]', '{}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (5, 1, 'labtech@cura.com', 'labtech', '$2b$12$p9M56FsvliatdGowZmgmMOjVl8cR5S9mEMRrNbM1hOYbxfkCP/q1.', 'Maria', 'Rodriguez', 'lab_technician', 'Laboratory', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"end": "14:00", "start": "06:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (6, 1, 'doctor2@cura.com', 'doctor2', '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae', 'Michael', 'Johnson', 'doctor', 'Neurology', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"end": "18:00", "start": "09:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (7, 1, 'doctor3@cura.com', 'doctor3', '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae', 'David', 'Wilson', 'doctor', 'Orthopedics', NULL, NULL, '["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '{"end": "16:30", "start": "08:30"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (8, 1, 'doctor4@cura.com', 'doctor4', '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae', 'Lisa', 'Anderson', 'doctor', 'Pediatrics', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"end": "16:00", "start": "08:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (9, 1, 'doctor5@cura.com', 'doctor5', '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae', 'Robert', 'Brown', 'doctor', 'Dermatology', NULL, NULL, '["Monday", "Wednesday", "Friday"]', '{"end": "18:00", "start": "10:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (10, 1, 'receptionist@cura.com', 'receptionist', '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', 'Jane', 'Thompson', 'receptionist', 'Front Desk', NULL, NULL, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"end": "17:00", "start": "08:00"}', '{}', true, false, NULL, '2025-10-16 13:17:25.803017');
INSERT INTO public.users VALUES (11, 0, 'saas_admin@curaemr.ai', 'saas_admin', '$2b$12$/USTCBuSxOsEkdKnayCfK.oN9tp/04A5X9GMkPvYLNS4S5SqBNRLu', 'SaaS', 'Administrator', 'admin', NULL, NULL, NULL, '[]', '{}', '{}', true, true, NULL, '2025-10-16 13:17:31.858515');


--
-- Data for Name: voice_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Name: ai_insights_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.ai_insights_id_seq', 255, true);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.appointments_id_seq', 1, false);


--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_analytics_id_seq', 1, false);


--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_configs_id_seq', 1, false);


--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_messages_id_seq', 1, false);


--
-- Name: chatbot_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_sessions_id_seq', 1, false);


--
-- Name: claims_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.claims_id_seq', 1, false);


--
-- Name: clinical_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clinical_photos_id_seq', 1, false);


--
-- Name: clinical_procedures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clinical_procedures_id_seq', 1, false);


--
-- Name: consultations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.consultations_id_seq', 1, false);


--
-- Name: doctor_default_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.doctor_default_shifts_id_seq', 1, false);


--
-- Name: doctors_fee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.doctors_fee_id_seq', 12, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, true);


--
-- Name: emergency_protocols_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.emergency_protocols_id_seq', 1, false);


--
-- Name: financial_forecasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.financial_forecasts_id_seq', 1, false);


--
-- Name: forecast_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.forecast_models_id_seq', 1, false);


--
-- Name: gdpr_audit_trail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_audit_trail_id_seq', 1, false);


--
-- Name: gdpr_consents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_consents_id_seq', 1, false);


--
-- Name: gdpr_data_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_data_requests_id_seq', 1, false);


--
-- Name: gdpr_processing_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_processing_activities_id_seq', 1, false);


--
-- Name: imaging_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.imaging_pricing_id_seq', 12, true);


--
-- Name: insurance_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.insurance_verifications_id_seq', 1, false);


--
-- Name: inventory_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_batches_id_seq', 1, false);


--
-- Name: inventory_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_categories_id_seq', 10, true);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 6, true);


--
-- Name: inventory_purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_purchase_order_items_id_seq', 1, false);


--
-- Name: inventory_purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_purchase_orders_id_seq', 1, false);


--
-- Name: inventory_sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_sale_items_id_seq', 1, false);


--
-- Name: inventory_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_sales_id_seq', 1, false);


--
-- Name: inventory_stock_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_stock_alerts_id_seq', 1, false);


--
-- Name: inventory_stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_stock_movements_id_seq', 1, false);


--
-- Name: inventory_suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_suppliers_id_seq', 3, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.invoices_id_seq', 10, true);


--
-- Name: lab_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.lab_results_id_seq', 11, true);


--
-- Name: lab_test_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.lab_test_pricing_id_seq', 37, true);


--
-- Name: letter_drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.letter_drafts_id_seq', 1, false);


--
-- Name: medical_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_images_id_seq', 29, true);


--
-- Name: medical_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_records_id_seq', 52, true);


--
-- Name: medications_database_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medications_database_id_seq', 1, false);


--
-- Name: muscles_position_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.muscles_position_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notifications_id_seq', 255, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- Name: patient_communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patient_communications_id_seq', 1, false);


--
-- Name: patient_drug_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patient_drug_interactions_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patients_id_seq', 2, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.payments_id_seq', 10, true);


--
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 2, true);


--
-- Name: quickbooks_account_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_account_mappings_id_seq', 1, false);


--
-- Name: quickbooks_connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_connections_id_seq', 1, false);


--
-- Name: quickbooks_customer_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_customer_mappings_id_seq', 1, false);


--
-- Name: quickbooks_invoice_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_invoice_mappings_id_seq', 1, false);


--
-- Name: quickbooks_item_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_item_mappings_id_seq', 1, false);


--
-- Name: quickbooks_payment_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_payment_mappings_id_seq', 1, false);


--
-- Name: quickbooks_sync_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_sync_configs_id_seq', 1, false);


--
-- Name: quickbooks_sync_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_sync_logs_id_seq', 1, false);


--
-- Name: revenue_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.revenue_records_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: saas_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_invoices_id_seq', 1, false);


--
-- Name: saas_owners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_owners_id_seq', 1, false);


--
-- Name: saas_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_packages_id_seq', 1, false);


--
-- Name: saas_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_payments_id_seq', 1, false);


--
-- Name: saas_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_settings_id_seq', 1, false);


--
-- Name: saas_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_subscriptions_id_seq', 1, false);


--
-- Name: staff_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.staff_shifts_id_seq', 1, false);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, true);


--
-- Name: symptom_checks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.symptom_checks_id_seq', 1, false);


--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_document_preferences_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 11, true);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: chatbot_analytics chatbot_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics
    ADD CONSTRAINT chatbot_analytics_pkey PRIMARY KEY (id);


--
-- Name: chatbot_configs chatbot_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_configs
    ADD CONSTRAINT chatbot_configs_pkey PRIMARY KEY (id);


--
-- Name: chatbot_messages chatbot_messages_message_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_message_id_unique UNIQUE (message_id);


--
-- Name: chatbot_messages chatbot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_pkey PRIMARY KEY (id);


--
-- Name: chatbot_sessions chatbot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_pkey PRIMARY KEY (id);


--
-- Name: chatbot_sessions chatbot_sessions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_session_id_unique UNIQUE (session_id);


--
-- Name: claims claims_claim_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_claim_number_unique UNIQUE (claim_number);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: clinical_photos clinical_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_pkey PRIMARY KEY (id);


--
-- Name: clinical_procedures clinical_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_procedures
    ADD CONSTRAINT clinical_procedures_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: doctor_default_shifts doctor_default_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_default_shifts
    ADD CONSTRAINT doctor_default_shifts_pkey PRIMARY KEY (id);


--
-- Name: doctors_fee doctors_fee_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: emergency_protocols emergency_protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.emergency_protocols
    ADD CONSTRAINT emergency_protocols_pkey PRIMARY KEY (id);


--
-- Name: financial_forecasts financial_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts
    ADD CONSTRAINT financial_forecasts_pkey PRIMARY KEY (id);


--
-- Name: forecast_models forecast_models_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_pkey PRIMARY KEY (id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: gdpr_consents gdpr_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_pkey PRIMARY KEY (id);


--
-- Name: gdpr_data_requests gdpr_data_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_pkey PRIMARY KEY (id);


--
-- Name: gdpr_processing_activities gdpr_processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_processing_activities
    ADD CONSTRAINT gdpr_processing_activities_pkey PRIMARY KEY (id);


--
-- Name: imaging_pricing imaging_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing
    ADD CONSTRAINT imaging_pricing_pkey PRIMARY KEY (id);


--
-- Name: insurance_verifications insurance_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications
    ADD CONSTRAINT insurance_verifications_pkey PRIMARY KEY (id);


--
-- Name: inventory_batches inventory_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT inventory_batches_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_order_items inventory_purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_order_items
    ADD CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_orders inventory_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_orders
    ADD CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_orders inventory_purchase_orders_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_orders
    ADD CONSTRAINT inventory_purchase_orders_po_number_unique UNIQUE (po_number);


--
-- Name: inventory_sale_items inventory_sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sale_items
    ADD CONSTRAINT inventory_sale_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_sales inventory_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_pkey PRIMARY KEY (id);


--
-- Name: inventory_sales inventory_sales_sale_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_sale_number_unique UNIQUE (sale_number);


--
-- Name: inventory_stock_alerts inventory_stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_alerts
    ADD CONSTRAINT inventory_stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: inventory_stock_movements inventory_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory_suppliers inventory_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_suppliers
    ADD CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_test_pricing lab_test_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_pkey PRIMARY KEY (id);


--
-- Name: letter_drafts letter_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.letter_drafts
    ADD CONSTRAINT letter_drafts_pkey PRIMARY KEY (id);


--
-- Name: medical_images medical_images_image_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_image_id_unique UNIQUE (image_id);


--
-- Name: medical_images medical_images_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: medications_database medications_database_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications_database
    ADD CONSTRAINT medications_database_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: muscles_position muscles_position_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.muscles_position
    ADD CONSTRAINT muscles_position_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_subdomain_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain);


--
-- Name: patient_communications patient_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_pkey PRIMARY KEY (id);


--
-- Name: patient_drug_interactions patient_drug_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_unique UNIQUE (transaction_id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_account_mappings quickbooks_account_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_account_mappings
    ADD CONSTRAINT quickbooks_account_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_connections quickbooks_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_connections
    ADD CONSTRAINT quickbooks_connections_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_customer_mappings quickbooks_customer_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_customer_mappings
    ADD CONSTRAINT quickbooks_customer_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_invoice_mappings quickbooks_invoice_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_invoice_mappings
    ADD CONSTRAINT quickbooks_invoice_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_item_mappings quickbooks_item_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_item_mappings
    ADD CONSTRAINT quickbooks_item_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_payment_mappings quickbooks_payment_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_payment_mappings
    ADD CONSTRAINT quickbooks_payment_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_sync_configs quickbooks_sync_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_configs
    ADD CONSTRAINT quickbooks_sync_configs_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_sync_logs quickbooks_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_logs
    ADD CONSTRAINT quickbooks_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: revenue_records revenue_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records
    ADD CONSTRAINT revenue_records_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: saas_invoices saas_invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_invoices
    ADD CONSTRAINT saas_invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: saas_invoices saas_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_invoices
    ADD CONSTRAINT saas_invoices_pkey PRIMARY KEY (id);


--
-- Name: saas_owners saas_owners_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners
    ADD CONSTRAINT saas_owners_email_unique UNIQUE (email);


--
-- Name: saas_owners saas_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners
    ADD CONSTRAINT saas_owners_pkey PRIMARY KEY (id);


--
-- Name: saas_owners saas_owners_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners
    ADD CONSTRAINT saas_owners_username_unique UNIQUE (username);


--
-- Name: saas_packages saas_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_packages
    ADD CONSTRAINT saas_packages_pkey PRIMARY KEY (id);


--
-- Name: saas_payments saas_payments_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_payments
    ADD CONSTRAINT saas_payments_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: saas_payments saas_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_payments
    ADD CONSTRAINT saas_payments_pkey PRIMARY KEY (id);


--
-- Name: saas_settings saas_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_settings
    ADD CONSTRAINT saas_settings_key_unique UNIQUE (key);


--
-- Name: saas_settings saas_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_settings
    ADD CONSTRAINT saas_settings_pkey PRIMARY KEY (id);


--
-- Name: saas_subscriptions saas_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_subscriptions
    ADD CONSTRAINT saas_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: staff_shifts staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: symptom_checks symptom_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_pkey PRIMARY KEY (id);


--
-- Name: user_document_preferences user_document_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_document_preferences
    ADD CONSTRAINT user_document_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voice_notes voice_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voice_notes
    ADD CONSTRAINT voice_notes_pkey PRIMARY KEY (id);


--
-- Name: unique_user_document_preferences; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX unique_user_document_preferences ON public.user_document_preferences USING btree (user_id, organization_id);


--
-- Name: chatbot_analytics chatbot_analytics_config_id_chatbot_configs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics
    ADD CONSTRAINT chatbot_analytics_config_id_chatbot_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.chatbot_configs(id);


--
-- Name: chatbot_analytics chatbot_analytics_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics
    ADD CONSTRAINT chatbot_analytics_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_configs chatbot_configs_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_configs
    ADD CONSTRAINT chatbot_configs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_messages chatbot_messages_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_messages chatbot_messages_session_id_chatbot_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_session_id_chatbot_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.chatbot_sessions(id);


--
-- Name: chatbot_sessions chatbot_sessions_config_id_chatbot_configs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_config_id_chatbot_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.chatbot_configs(id);


--
-- Name: chatbot_sessions chatbot_sessions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_sessions chatbot_sessions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: claims claims_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: claims claims_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_photos clinical_photos_captured_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_captured_by_users_id_fk FOREIGN KEY (captured_by) REFERENCES public.users(id);


--
-- Name: clinical_photos clinical_photos_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_photos clinical_photos_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_procedures clinical_procedures_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_procedures
    ADD CONSTRAINT clinical_procedures_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: doctors_fee doctors_fee_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: doctors_fee doctors_fee_doctor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: doctors_fee doctors_fee_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: emergency_protocols emergency_protocols_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.emergency_protocols
    ADD CONSTRAINT emergency_protocols_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: financial_forecasts financial_forecasts_model_id_forecast_models_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts
    ADD CONSTRAINT financial_forecasts_model_id_forecast_models_id_fk FOREIGN KEY (model_id) REFERENCES public.forecast_models(id);


--
-- Name: financial_forecasts financial_forecasts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts
    ADD CONSTRAINT financial_forecasts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: forecast_models forecast_models_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gdpr_consents gdpr_consents_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_consents gdpr_consents_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gdpr_data_requests gdpr_data_requests_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_data_requests gdpr_data_requests_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gdpr_data_requests gdpr_data_requests_processed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_processed_by_users_id_fk FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: gdpr_processing_activities gdpr_processing_activities_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_processing_activities
    ADD CONSTRAINT gdpr_processing_activities_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: imaging_pricing imaging_pricing_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing
    ADD CONSTRAINT imaging_pricing_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: imaging_pricing imaging_pricing_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing
    ADD CONSTRAINT imaging_pricing_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: insurance_verifications insurance_verifications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications
    ADD CONSTRAINT insurance_verifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: insurance_verifications insurance_verifications_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications
    ADD CONSTRAINT insurance_verifications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_results lab_results_ordered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_ordered_by_users_id_fk FOREIGN KEY (ordered_by) REFERENCES public.users(id);


--
-- Name: lab_results lab_results_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: lab_results lab_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_test_pricing lab_test_pricing_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lab_test_pricing lab_test_pricing_doctor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: lab_test_pricing lab_test_pricing_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: medical_images medical_images_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: medical_images medical_images_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_images medical_images_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: medications_database medications_database_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications_database
    ADD CONSTRAINT medications_database_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notifications notifications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: patient_communications patient_communications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_communications patient_communications_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_communications patient_communications_sent_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_sent_by_users_id_fk FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: patient_drug_interactions patient_drug_interactions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_drug_interactions patient_drug_interactions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_drug_interactions patient_drug_interactions_reported_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_reported_by_users_id_fk FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- Name: patients patients_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: patients patients_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_consultation_id_consultations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_consultation_id_consultations_id_fk FOREIGN KEY (consultation_id) REFERENCES public.consultations(id);


--
-- Name: prescriptions prescriptions_doctor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: prescriptions prescriptions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: prescriptions prescriptions_prescription_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_prescription_created_by_users_id_fk FOREIGN KEY (prescription_created_by) REFERENCES public.users(id);


--
-- Name: revenue_records revenue_records_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records
    ADD CONSTRAINT revenue_records_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: staff_shifts staff_shifts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: symptom_checks symptom_checks_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: symptom_checks symptom_checks_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: symptom_checks symptom_checks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

