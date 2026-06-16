CREATE TABLE "ai_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer,
	"type" varchar(30) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(10) DEFAULT 'medium' NOT NULL,
	"action_required" boolean DEFAULT false NOT NULL,
	"confidence" varchar(10),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"ai_status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"type" varchar(20) DEFAULT 'consultation' NOT NULL,
	"location" text,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"total_sessions" integer DEFAULT 0,
	"completed_sessions" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"appointments_booked" integer DEFAULT 0,
	"prescription_requests" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text DEFAULT 'Healthcare Assistant' NOT NULL,
	"description" text DEFAULT 'AI-powered healthcare assistant',
	"is_active" boolean DEFAULT true NOT NULL,
	"primary_color" text DEFAULT '#4A7DFF',
	"welcome_message" text DEFAULT 'Hello! I can help with appointments and prescriptions.',
	"appointment_booking_enabled" boolean DEFAULT true NOT NULL,
	"prescription_requests_enabled" boolean DEFAULT true NOT NULL,
	"api_key" text NOT NULL,
	"embed_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"message_id" text NOT NULL,
	"sender" varchar(10) NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"intent" text,
	"confidence" real,
	"ai_processed" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chatbot_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "chatbot_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"visitor_id" text,
	"patient_id" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_intent" text,
	"extracted_patient_name" text,
	"extracted_phone" text,
	"extracted_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chatbot_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"claim_number" varchar(50) NOT NULL,
	"service_date" timestamp NOT NULL,
	"submission_date" timestamp NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_amount" numeric(10, 2),
	"payment_date" timestamp,
	"denial_reason" text,
	"insurance_provider" text NOT NULL,
	"procedures" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claims_claim_number_unique" UNIQUE("claim_number")
);
--> statement-breakpoint
CREATE TABLE "clinical_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"captured_by" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) DEFAULT 'image/png' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ai_analysis" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"duration" text NOT NULL,
	"complexity" varchar(20) NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"complications" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"appointment_id" integer,
	"patient_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"consultation_type" varchar(20) NOT NULL,
	"chief_complaint" text,
	"history_of_present_illness" text,
	"vitals" jsonb DEFAULT '{}'::jsonb,
	"physical_exam" text,
	"assessment" text,
	"diagnosis" text[],
	"treatment_plan" text,
	"prescriptions" text[],
	"follow_up_instructions" text,
	"consultation_notes" text,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"participants" jsonb NOT NULL,
	"last_message" jsonb,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"is_patient_conversation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) DEFAULT 'medical_form' NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_protocols" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" text NOT NULL,
	"priority" varchar(20) NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"category" text NOT NULL,
	"forecast_period" varchar(7) NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"current_value" numeric(12, 2) NOT NULL,
	"projected_value" numeric(12, 2) NOT NULL,
	"variance" numeric(12, 2) NOT NULL,
	"trend" varchar(10) NOT NULL,
	"confidence" integer NOT NULL,
	"methodology" varchar(30) DEFAULT 'historical_trend' NOT NULL,
	"key_factors" jsonb DEFAULT '[]'::jsonb,
	"model_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forecast_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" varchar(30) NOT NULL,
	"algorithm" varchar(20) DEFAULT 'linear' NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"accuracy" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gdpr_audit_trail" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer,
	"patient_id" integer,
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(30) NOT NULL,
	"resource_id" integer,
	"data_categories" jsonb DEFAULT '[]'::jsonb,
	"legal_basis" varchar(50),
	"purpose" text,
	"changes" jsonb DEFAULT '[]'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(100),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "gdpr_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"consent_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"granted_at" timestamp,
	"withdrawn_at" timestamp,
	"expires_at" timestamp,
	"purpose" text NOT NULL,
	"legal_basis" varchar(50) NOT NULL,
	"data_categories" jsonb DEFAULT '[]'::jsonb,
	"retention_period" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"consent_method" varchar(30) DEFAULT 'digital' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_data_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"request_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"request_reason" text,
	"identity_verified" boolean DEFAULT false NOT NULL,
	"processed_by" integer,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"due_date" timestamp NOT NULL,
	"response_data" jsonb DEFAULT '{}'::jsonb,
	"rejection_reason" text,
	"communication_log" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_processing_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"activity_name" text NOT NULL,
	"purpose" text NOT NULL,
	"legal_basis" varchar(50) NOT NULL,
	"data_categories" jsonb DEFAULT '[]'::jsonb,
	"data_subjects" jsonb DEFAULT '[]'::jsonb,
	"recipients" jsonb DEFAULT '[]'::jsonb,
	"international_transfers" jsonb DEFAULT '[]'::jsonb,
	"retention_period" integer,
	"security_measures" jsonb DEFAULT '[]'::jsonb,
	"dpia_required" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"review_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"patient_name" text NOT NULL,
	"provider" text NOT NULL,
	"policy_number" text NOT NULL,
	"group_number" text,
	"member_number" text,
	"nhs_number" text,
	"plan_type" text,
	"coverage_type" varchar(20) DEFAULT 'primary' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"eligibility_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"effective_date" date,
	"expiration_date" date,
	"last_verified" date,
	"benefits" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"batch_number" varchar(100) NOT NULL,
	"expiry_date" timestamp,
	"manufacture_date" timestamp,
	"quantity" integer NOT NULL,
	"remaining_quantity" integer DEFAULT 0 NOT NULL,
	"purchase_price" numeric(10, 2) NOT NULL,
	"supplier_id" integer,
	"received_date" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_expired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_category_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(100),
	"generic_name" text,
	"brand_name" text,
	"manufacturer" text,
	"unit_of_measurement" varchar(20) DEFAULT 'pieces' NOT NULL,
	"pack_size" integer DEFAULT 1 NOT NULL,
	"purchase_price" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"mrp" numeric(10, 2),
	"tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 10 NOT NULL,
	"maximum_stock" integer DEFAULT 1000 NOT NULL,
	"reorder_point" integer DEFAULT 20 NOT NULL,
	"expiry_tracking" boolean DEFAULT false NOT NULL,
	"batch_tracking" boolean DEFAULT false NOT NULL,
	"prescription_required" boolean DEFAULT false NOT NULL,
	"storage_conditions" text,
	"side_effects" text,
	"contraindications" text,
	"dosage_instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_discontinued" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"po_number" varchar(100) NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"created_by" integer NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"sale_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"batch_id" integer,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer,
	"sale_number" varchar(100) NOT NULL,
	"sale_date" timestamp DEFAULT now() NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'cash' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'paid' NOT NULL,
	"prescription_id" integer,
	"sold_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_sales_sale_number_unique" UNIQUE("sale_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_stock_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"alert_type" varchar(20) NOT NULL,
	"threshold_value" integer NOT NULL,
	"current_value" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"batch_id" integer,
	"movement_type" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"unit_cost" numeric(10, 2),
	"reference_type" varchar(50),
	"reference_id" integer,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" varchar(20),
	"address" text,
	"city" text,
	"country" text DEFAULT 'UK' NOT NULL,
	"tax_id" varchar(50),
	"payment_terms" varchar(100) DEFAULT 'Net 30',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"test_id" varchar(50) NOT NULL,
	"test_type" text NOT NULL,
	"ordered_by" integer NOT NULL,
	"doctor_name" text,
	"main_specialty" text,
	"sub_specialty" text,
	"priority" varchar(20) DEFAULT 'routine',
	"ordered_at" timestamp NOT NULL,
	"collected_at" timestamp,
	"completed_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb,
	"critical_values" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "letter_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"subject" text NOT NULL,
	"recipient" text NOT NULL,
	"doctor_email" text,
	"location" text,
	"copied_recipients" text,
	"header" text,
	"document_content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"uploaded_by" integer NOT NULL,
	"study_type" text NOT NULL,
	"modality" varchar(50) NOT NULL,
	"body_part" text,
	"indication" text,
	"priority" varchar(20) DEFAULT 'routine' NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"image_data" text,
	"status" varchar(20) DEFAULT 'uploaded' NOT NULL,
	"findings" text,
	"impression" text,
	"radiologist" text,
	"report_file_name" text,
	"report_file_path" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"scheduled_at" timestamp,
	"performed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"diagnosis" text,
	"treatment" text,
	"prescription" jsonb DEFAULT '{}'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"ai_suggestions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications_database" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"dosage" text NOT NULL,
	"interactions" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"severity" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"conversation_id" varchar(50) NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_name" text NOT NULL,
	"sender_role" varchar(20) NOT NULL,
	"recipient_id" text,
	"recipient_name" text,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"priority" varchar(10) DEFAULT 'normal' NOT NULL,
	"type" varchar(20) DEFAULT 'internal' NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"phone_number" varchar(20),
	"message_type" varchar(10),
	"delivery_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"external_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muscles_position" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"consultation_id" integer,
	"position" integer NOT NULL,
	"value" text NOT NULL,
	"coordinates" jsonb,
	"is_detected" boolean DEFAULT false NOT NULL,
	"detected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(20) DEFAULT 'unread' NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"action_url" text,
	"is_actionable" boolean DEFAULT false NOT NULL,
	"scheduled_for" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"read_at" timestamp,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subdomain" varchar(50) NOT NULL,
	"email" text NOT NULL,
	"region" varchar(10) DEFAULT 'UK' NOT NULL,
	"brand_name" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"features" jsonb DEFAULT '{}'::jsonb,
	"access_level" varchar(50) DEFAULT 'full',
	"subscription_status" varchar(20) DEFAULT 'trial' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "patient_communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"sent_by" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"method" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"message" text NOT NULL,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_drug_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"medication1_name" text NOT NULL,
	"medication1_dosage" text NOT NULL,
	"medication1_frequency" text,
	"medication2_name" text NOT NULL,
	"medication2_dosage" text NOT NULL,
	"medication2_frequency" text,
	"interaction_type" varchar(50),
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"description" text,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"reported_by" integer,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"email" text,
	"phone" text,
	"nhs_number" text,
	"address" jsonb DEFAULT '{}'::jsonb,
	"insurance_info" jsonb DEFAULT '{}'::jsonb,
	"emergency_contact" jsonb DEFAULT '{}'::jsonb,
	"medical_history" jsonb DEFAULT '{}'::jsonb,
	"risk_level" varchar(10) DEFAULT 'low' NOT NULL,
	"flags" text[] DEFAULT '{}',
	"communication_preferences" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_insured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"consultation_id" integer,
	"prescription_number" varchar(50),
	"status" text DEFAULT 'active' NOT NULL,
	"diagnosis" text,
	"medication_name" text NOT NULL,
	"dosage" text,
	"frequency" text,
	"duration" text,
	"instructions" text,
	"issued_date" timestamp DEFAULT now(),
	"medications" jsonb DEFAULT '[]'::jsonb,
	"pharmacy" jsonb DEFAULT '{}'::jsonb,
	"prescribed_at" timestamp DEFAULT now(),
	"valid_until" timestamp,
	"notes" text,
	"is_electronic" boolean DEFAULT true NOT NULL,
	"interactions" jsonb DEFAULT '[]'::jsonb,
	"signature" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quickbooks_account_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"emr_account_type" varchar(50) NOT NULL,
	"emr_account_name" text NOT NULL,
	"quickbooks_account_id" text NOT NULL,
	"quickbooks_account_name" text NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"account_sub_type" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_sync_at" timestamp,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"company_id" text NOT NULL,
	"company_name" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" timestamp NOT NULL,
	"realm_id" text NOT NULL,
	"base_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"sync_settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_customer_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"quickbooks_customer_id" text NOT NULL,
	"quickbooks_display_name" text,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_sync_at" timestamp,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_invoice_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"emr_invoice_id" text NOT NULL,
	"quickbooks_invoice_id" text NOT NULL,
	"quickbooks_invoice_number" text,
	"patient_id" integer NOT NULL,
	"customer_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) NOT NULL,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_sync_at" timestamp,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_item_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"emr_item_type" varchar(50) NOT NULL,
	"emr_item_id" text NOT NULL,
	"emr_item_name" text NOT NULL,
	"quickbooks_item_id" text NOT NULL,
	"quickbooks_item_name" text NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"unit_price" numeric(10, 2),
	"description" text,
	"income_account_id" text,
	"expense_account_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_sync_at" timestamp,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_payment_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"emr_payment_id" text NOT NULL,
	"quickbooks_payment_id" text NOT NULL,
	"invoice_mapping_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_sync_at" timestamp,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_sync_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"config_type" varchar(50) NOT NULL,
	"config_name" text NOT NULL,
	"config_value" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quickbooks_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"operation" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_successful" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"error_message" text,
	"error_details" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"month" varchar(7) NOT NULL,
	"revenue" numeric(12, 2) NOT NULL,
	"expenses" numeric(12, 2) NOT NULL,
	"profit" numeric(12, 2) NOT NULL,
	"collections" numeric(12, 2) NOT NULL,
	"target" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"subscription_id" integer NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "saas_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "saas_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "saas_owners_username_unique" UNIQUE("username"),
	CONSTRAINT "saas_owners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "saas_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_on_website" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saas_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"subscription_id" integer,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_date" timestamp,
	"due_date" timestamp NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"payment_provider" varchar(50),
	"provider_transaction_id" text,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "saas_payments_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "saas_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb,
	"description" text,
	"category" varchar(50) DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "saas_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "saas_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_end" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"shift_type" varchar(20) DEFAULT 'regular' NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"plan_name" text NOT NULL,
	"plan" varchar(20),
	"status" varchar(20) DEFAULT 'trial' NOT NULL,
	"user_limit" integer DEFAULT 5 NOT NULL,
	"current_users" integer DEFAULT 0 NOT NULL,
	"monthly_price" numeric(10, 2),
	"trial_ends_at" timestamp,
	"next_billing_at" timestamp,
	"features" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_document_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"clinic_info" jsonb DEFAULT '{}'::jsonb,
	"header_preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" varchar(20) DEFAULT 'doctor' NOT NULL,
	"department" text,
	"medical_specialty_category" text,
	"sub_specialty" text,
	"working_days" jsonb DEFAULT '[]'::jsonb,
	"working_hours" jsonb DEFAULT '{}'::jsonb,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_saas_owner" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" varchar PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" varchar NOT NULL,
	"patient_name" text NOT NULL,
	"provider_id" varchar NOT NULL,
	"provider_name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"recording_duration" integer,
	"transcript" text,
	"confidence" real,
	"medical_terms" jsonb DEFAULT '[]'::jsonb,
	"structured_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chatbot_analytics" ADD CONSTRAINT "chatbot_analytics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_analytics" ADD CONSTRAINT "chatbot_analytics_config_id_chatbot_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."chatbot_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD CONSTRAINT "chatbot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_chatbot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chatbot_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_config_id_chatbot_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."chatbot_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_photos" ADD CONSTRAINT "clinical_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_photos" ADD CONSTRAINT "clinical_photos_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_photos" ADD CONSTRAINT "clinical_photos_captured_by_users_id_fk" FOREIGN KEY ("captured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_procedures" ADD CONSTRAINT "clinical_procedures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_protocols" ADD CONSTRAINT "emergency_protocols_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_forecasts" ADD CONSTRAINT "financial_forecasts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_forecasts" ADD CONSTRAINT "financial_forecasts_model_id_forecast_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."forecast_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_models" ADD CONSTRAINT "forecast_models_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_audit_trail" ADD CONSTRAINT "gdpr_audit_trail_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_audit_trail" ADD CONSTRAINT "gdpr_audit_trail_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_audit_trail" ADD CONSTRAINT "gdpr_audit_trail_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_consents" ADD CONSTRAINT "gdpr_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_consents" ADD CONSTRAINT "gdpr_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_data_requests" ADD CONSTRAINT "gdpr_data_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_data_requests" ADD CONSTRAINT "gdpr_data_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_data_requests" ADD CONSTRAINT "gdpr_data_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_processing_activities" ADD CONSTRAINT "gdpr_processing_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_verifications" ADD CONSTRAINT "insurance_verifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_verifications" ADD CONSTRAINT "insurance_verifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications_database" ADD CONSTRAINT "medications_database_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communications" ADD CONSTRAINT "patient_communications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communications" ADD CONSTRAINT "patient_communications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communications" ADD CONSTRAINT "patient_communications_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_drug_interactions" ADD CONSTRAINT "patient_drug_interactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_drug_interactions" ADD CONSTRAINT "patient_drug_interactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_drug_interactions" ADD CONSTRAINT "patient_drug_interactions_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_document_preferences" ON "user_document_preferences" USING btree ("user_id","organization_id");