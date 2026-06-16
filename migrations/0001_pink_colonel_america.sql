CREATE TABLE "clinic_footers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"footer_text" text NOT NULL,
	"background_color" varchar(7) DEFAULT '#4A7DFF' NOT NULL,
	"text_color" varchar(7) DEFAULT '#FFFFFF' NOT NULL,
	"show_social" boolean DEFAULT false NOT NULL,
	"facebook" text,
	"twitter" text,
	"linkedin" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clinic_headers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"logo_base64" text,
	"logo_position" varchar(20) DEFAULT 'center' NOT NULL,
	"clinic_name" text NOT NULL,
	"address" text,
	"phone" varchar(50),
	"email" text,
	"website" text,
	"clinic_name_font_size" varchar(20) DEFAULT '24pt' NOT NULL,
	"font_size" varchar(20) DEFAULT '12pt' NOT NULL,
	"font_family" varchar(50) DEFAULT 'verdana' NOT NULL,
	"font_weight" varchar(20) DEFAULT 'normal' NOT NULL,
	"font_style" varchar(20) DEFAULT 'normal' NOT NULL,
	"text_decoration" varchar(20) DEFAULT 'none' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "doctor_default_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"start_time" varchar(5) DEFAULT '09:00' NOT NULL,
	"end_time" varchar(5) DEFAULT '17:00' NOT NULL,
	"working_days" text[] DEFAULT '{"Monday","Tuesday","Wednesday","Thursday","Friday"}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors_fee" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"doctor_id" integer,
	"doctor_name" text,
	"doctor_role" varchar(50),
	"service_name" text NOT NULL,
	"service_code" varchar(50),
	"category" varchar(100),
	"base_price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"imaging_type" text NOT NULL,
	"imaging_code" varchar(50),
	"modality" varchar(50),
	"body_part" varchar(100),
	"category" varchar(100),
	"base_price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"claim_number" varchar(100),
	"amount_paid" numeric(10, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"insurance_provider" text NOT NULL,
	"payment_reference" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insurance_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(50) NOT NULL,
	"contact_person" varchar(200),
	"phone" varchar(20),
	"email" varchar(200),
	"address" text,
	"default_coverage_percent" numeric(5, 2) DEFAULT '80.00',
	"max_coverage_amount" numeric(12, 2),
	"api_endpoint" varchar(500),
	"api_key" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_credit_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"credit_note_number" varchar(100) NOT NULL,
	"credit_note_type" varchar(30) NOT NULL,
	"return_id" integer,
	"original_invoice_number" varchar(100),
	"patient_id" integer,
	"supplier_id" integer,
	"recipient_name" varchar(200),
	"original_amount" numeric(12, 2) NOT NULL,
	"used_amount" numeric(12, 2) DEFAULT '0.00',
	"remaining_amount" numeric(12, 2) NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"issued_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_credit_notes_credit_note_number_unique" UNIQUE("credit_note_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_return_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"return_id" integer NOT NULL,
	"approval_level" integer DEFAULT 1 NOT NULL,
	"approver_role" varchar(50) NOT NULL,
	"approver_id" integer,
	"decision" varchar(20),
	"decision_notes" text,
	"decision_at" timestamp,
	"escalated_to" integer,
	"escalation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"return_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"original_sale_item_id" integer,
	"original_po_item_id" integer,
	"batch_id" integer NOT NULL,
	"batch_number" varchar(100),
	"expiry_date" timestamp,
	"returned_quantity" integer NOT NULL,
	"accepted_quantity" integer DEFAULT 0,
	"rejected_quantity" integer DEFAULT 0,
	"unit_price" numeric(10, 2) NOT NULL,
	"cost_price" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"line_total" numeric(12, 2) NOT NULL,
	"condition_on_return" varchar(30),
	"is_restockable" boolean DEFAULT false,
	"inspection_notes" text,
	"inspected_by" integer,
	"inspected_at" timestamp,
	"disposition" varchar(30),
	"disposition_notes" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"return_number" varchar(100) NOT NULL,
	"return_type" varchar(20) NOT NULL,
	"original_sale_id" integer,
	"original_purchase_order_id" integer,
	"original_invoice_number" varchar(100),
	"patient_id" integer,
	"customer_name" varchar(200),
	"customer_phone" varchar(20),
	"supplier_id" integer,
	"supplier_rma_number" varchar(100),
	"subtotal_amount" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"total_amount" numeric(12, 2) NOT NULL,
	"restocking_fee" numeric(10, 2) DEFAULT '0.00',
	"net_refund_amount" numeric(12, 2) NOT NULL,
	"settlement_type" varchar(20),
	"credit_note_number" varchar(100),
	"credit_note_amount" numeric(12, 2),
	"refund_transaction_id" varchar(100),
	"return_reason" varchar(100) NOT NULL,
	"return_reason_details" text,
	"internal_notes" text,
	"shift_id" integer,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"requires_approval" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"approval_notes" text,
	"rejected_by" integer,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"shipped_at" timestamp,
	"shipped_by" integer,
	"carrier_name" varchar(100),
	"tracking_number" varchar(100),
	"received_by_supplier_at" timestamp,
	"initiated_by" integer NOT NULL,
	"processed_by" integer,
	"return_date" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_sale_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"sale_id" integer NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"card_last_4" varchar(4),
	"card_type" varchar(20),
	"authorization_code" varchar(50),
	"transaction_reference" varchar(100),
	"insurance_provider_id" integer,
	"claim_number" varchar(100),
	"claim_status" varchar(20),
	"status" varchar(20) DEFAULT 'completed',
	"processed_by" integer NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_stock_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"adjustment_number" varchar(100) NOT NULL,
	"adjustment_type" varchar(30) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" integer,
	"item_id" integer NOT NULL,
	"batch_id" integer,
	"previous_quantity" integer NOT NULL,
	"adjustment_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"unit_cost" numeric(10, 2),
	"total_cost_impact" numeric(12, 2),
	"reason" varchar(200) NOT NULL,
	"notes" text,
	"requires_approval" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"adjusted_by" integer NOT NULL,
	"adjustment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_stock_adjustments_adjustment_number_unique" UNIQUE("adjustment_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"applies_to" varchar(50) DEFAULT 'all',
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"nhs_number" varchar(50),
	"service_type" varchar(50),
	"service_id" text,
	"date_of_service" timestamp NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"invoice_type" varchar(50) DEFAULT 'payment' NOT NULL,
	"payment_method" varchar(50),
	"insurance_provider" varchar(100),
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"items" jsonb NOT NULL,
	"insurance" jsonb,
	"payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "lab_test_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"doctor_id" integer,
	"doctor_name" text,
	"doctor_role" varchar(50),
	"test_name" text NOT NULL,
	"test_code" varchar(50),
	"category" varchar(100),
	"base_price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" varchar(20) DEFAULT 'email' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"template" varchar(50) DEFAULT 'default' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"open_rate" integer DEFAULT 0 NOT NULL,
	"click_rate" integer DEFAULT 0 NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"integration_type" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"is_configured" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'disconnected',
	"last_tested_at" timestamp,
	"last_error" text,
	"webhook_url" text,
	"webhook_secret" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"patient_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_provider" varchar(50),
	"payment_status" varchar(20) DEFAULT 'completed' NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"entity_name" varchar(200),
	"details" jsonb,
	"ip_address" varchar(45),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacy_dashboard_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_sales" numeric(12, 2) DEFAULT '0.00',
	"total_sales_count" integer DEFAULT 0,
	"average_sale_value" numeric(10, 2) DEFAULT '0.00',
	"total_returns" numeric(12, 2) DEFAULT '0.00',
	"total_returns_count" integer DEFAULT 0,
	"low_stock_items_count" integer DEFAULT 0,
	"near_expiry_items_count" integer DEFAULT 0,
	"out_of_stock_items_count" integer DEFAULT 0,
	"pending_insurance_amount" numeric(12, 2) DEFAULT '0.00',
	"pending_credit_amount" numeric(12, 2) DEFAULT '0.00',
	"pending_insurance_count" integer DEFAULT 0,
	"pending_credit_count" integer DEFAULT 0,
	"top_selling_items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacy_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"role_name" varchar(50) NOT NULL,
	"permission_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacy_shift_closings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"pharmacist_id" integer NOT NULL,
	"shift_date" timestamp NOT NULL,
	"shift_start_time" timestamp NOT NULL,
	"shift_end_time" timestamp,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"total_sales_count" integer DEFAULT 0,
	"total_sales_amount" numeric(12, 2) DEFAULT '0.00',
	"total_returns_count" integer DEFAULT 0,
	"total_returns_amount" numeric(12, 2) DEFAULT '0.00',
	"cash_sales" numeric(12, 2) DEFAULT '0.00',
	"card_sales" numeric(12, 2) DEFAULT '0.00',
	"insurance_sales" numeric(12, 2) DEFAULT '0.00',
	"credit_sales" numeric(12, 2) DEFAULT '0.00',
	"opening_cash" numeric(12, 2) DEFAULT '0.00',
	"closing_cash" numeric(12, 2) DEFAULT '0.00',
	"expected_cash" numeric(12, 2) DEFAULT '0.00',
	"cash_discrepancy" numeric(12, 2) DEFAULT '0.00',
	"discrepancy_notes" text,
	"approved_by" integer,
	"approved_at" timestamp,
	"approval_notes" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacy_user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" varchar(500) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"login_at" timestamp DEFAULT now() NOT NULL,
	"logout_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pharmacy_user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"category" text NOT NULL,
	"risk_score" numeric(5, 2) NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"based_on_lab_results" jsonb DEFAULT '[]'::jsonb,
	"has_critical_values" boolean DEFAULT false NOT NULL,
	"assessment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symptom_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"patient_id" integer,
	"user_id" integer NOT NULL,
	"symptoms" text[] NOT NULL,
	"symptom_description" text NOT NULL,
	"duration" text,
	"severity" varchar(20),
	"ai_analysis" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"appointment_created" boolean DEFAULT false NOT NULL,
	"appointment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ALTER COLUMN "batch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "date_of_birth" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "appointment_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "assigned_role" varchar(50);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "batch_number" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "returned_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "cost_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "discount_percent" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "tax_percent" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "tax_amount" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "prescription_item_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_sale_items" ADD COLUMN "status" varchar(20) DEFAULT 'sold';--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "invoice_number" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "sale_type" varchar(20) DEFAULT 'walk_in' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "customer_name" varchar(200);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "customer_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "subtotal_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "discount_type" varchar(20);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "discount_reason" varchar(200);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "amount_paid" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "amount_due" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "change_given" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "insurance_provider_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "insurance_claim_number" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "insurance_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "copay_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "shift_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "status" varchar(20) DEFAULT 'completed';--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "voided_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "voided_by" integer;--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "void_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "inventory_sales" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "report_status" varchar(50);--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "Lab_Request_Generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "Sample_Collected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "Lab_Report_Generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "Reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "signature_data" text;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "image_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "prescription_file_path" text;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "order_study_created" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "order_study_ready_to_generate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "order_study_generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "order_study_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "signature_data" text;--> statement-breakpoint
ALTER TABLE "medical_images" ADD COLUMN "signature_date" timestamp;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "gender_at_birth" varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "prescription_created_by" integer;--> statement-breakpoint
ALTER TABLE "saas_subscriptions" ADD COLUMN "payment_status" varchar(20) DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "saas_subscriptions" ADD COLUMN "max_users" integer;--> statement-breakpoint
ALTER TABLE "saas_subscriptions" ADD COLUMN "max_patients" integer;--> statement-breakpoint
ALTER TABLE "saas_subscriptions" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "saas_subscriptions" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "doctors_fee" ADD CONSTRAINT "doctors_fee_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors_fee" ADD CONSTRAINT "doctors_fee_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors_fee" ADD CONSTRAINT "doctors_fee_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_pricing" ADD CONSTRAINT "imaging_pricing_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_pricing" ADD CONSTRAINT "imaging_pricing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_pricing" ADD CONSTRAINT "lab_test_pricing_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_pricing" ADD CONSTRAINT "lab_test_pricing_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_pricing" ADD CONSTRAINT "lab_test_pricing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_activity_logs" ADD CONSTRAINT "pharmacy_activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_activity_logs" ADD CONSTRAINT "pharmacy_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_activity_logs" ADD CONSTRAINT "pharmacy_activity_logs_session_id_pharmacy_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pharmacy_user_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_dashboard_snapshots" ADD CONSTRAINT "pharmacy_dashboard_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_role_permissions" ADD CONSTRAINT "pharmacy_role_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_shift_closings" ADD CONSTRAINT "pharmacy_shift_closings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_shift_closings" ADD CONSTRAINT "pharmacy_shift_closings_pharmacist_id_users_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_shift_closings" ADD CONSTRAINT "pharmacy_shift_closings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_user_sessions" ADD CONSTRAINT "pharmacy_user_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_user_sessions" ADD CONSTRAINT "pharmacy_user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescription_created_by_users_id_fk" FOREIGN KEY ("prescription_created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointment_id_unique" UNIQUE("appointment_id");--> statement-breakpoint
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_image_id_unique" UNIQUE("image_id");