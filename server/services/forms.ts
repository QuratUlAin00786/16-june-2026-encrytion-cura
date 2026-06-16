import { db, pool, activeDbSchema } from "../db";
import { storage } from "../storage";
import {
  clinicFooters,
  clinicHeaders,
  documents,
  forms,
  formFields,
  formResponses,
  formResponseValues,
  formSections,
  formShares,
  formShareLogs,
  organizations,
  patients,
  users,
  type Patient,
} from "@shared/schema";
import { emailService } from "./email";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { decryptPatientField, patientEnvelopeJsonFromUnknown } from "../utils/encryption-sdk";
import {
  ensureFormShareRecipientSupport,
  fixFormForeignKeysForActiveSchema,
  repointFormSharePatientForeignKeys,
} from "../ensure-db-schema";

/** Plaintext for email/PDF when `patient` may still carry per-column envelopes (decrypt here as a safety net). */
async function patientScalarForEmail(
  fieldName: "firstName" | "lastName",
  raw: unknown,
): Promise<string> {
  const envJson = patientEnvelopeJsonFromUnknown(raw);
  if (envJson) {
    try {
      return (await decryptPatientField(fieldName, envJson)).trim();
    } catch {
      return "";
    }
  }
  if (typeof raw === "string") {
    return raw.trim();
  }
  return "";
}

async function patientFirstNameForEmail(patient: Patient): Promise<string> {
  return (await patientScalarForEmail("firstName", patient.firstName as unknown)) || "Patient";
}

interface FormFieldInput {
  label: string;
  fieldType: string;
  required?: boolean;
  placeholder?: string;
  fieldOptions?: string[];
  metadata?: Record<string, unknown>;
}

interface FormSectionInput {
  title: string;
  order?: number;
  metadata?: Record<string, unknown>;
  fields?: FormFieldInput[];
}

interface CreateFormInput {
  organizationId: number;
  createdBy: number;
  title: string;
  description?: string;
  status?: "draft" | "published" | "archived";
  metadata?: Record<string, unknown>;
  sections?: FormSectionInput[];
}

interface ShareFormInput {
  formId: number;
  organizationId: number;
  patientId: number | null;
  sentById: number;
  /** Recipient inbox — may be any address, not required to exist in this organization. */
  recipientEmail: string;
}

export interface FormSharePayload {
  share: {
    id: number;
    formId: number;
    patientId: number;
    expiresAt: Date;
    status: string;
  };
  form: FormStructure;
}

interface FormStructure {
  id: number;
  title: string;
  description?: string;
  status: string;
  metadata: Record<string, unknown>;
  createdBy?: number;
  sections: Array<{
    id: number;
    title: string;
    order: number;
    metadata: Record<string, unknown>;
    fields: Array<{
      id: number;
      label: string;
      fieldType: string;
      required: boolean;
      placeholder?: string;
      fieldOptions: string[];
      order: number;
      metadata: Record<string, unknown>;
    }>;
  }>;
}

interface AnswerPayload {
  fieldId: number;
  value: string | number | boolean | Record<string, any> | Array<any>;
}

interface ShareEmailResult {
  sent: boolean;
  subject: string;
  html: string;
  text: string;
  error?: string;
}

export class FormService {
  private readonly secret =
    process.env.FORM_SHARE_SECRET || process.env.JWT_SECRET || "cura-form-secret";
  private readonly defaultExpiryDays = Number(process.env.FORM_SHARE_EXPIRY_DAYS || "7");
  private readonly frontendUrl = FormService.resolvePublicFormsBaseUrl();

  /** Patient-facing app origin for form fill links (never the /api/... share endpoint). */
  private static resolvePublicFormsBaseUrl(): string {
    const candidates = [
      process.env.APP_FORMS_URL,
      process.env.FRONTEND_URL,
      process.env.APP_URL,
      process.env.BASE_URL,
      process.env.VITE_APP_BASE_URL,
    ];
    for (const raw of candidates) {
      if (!raw?.trim()) continue;
      const normalized = raw.trim().replace(/\/$/, "");
      if (/\/api(?:\/|$)/i.test(normalized)) continue;
      return normalized;
    }
    const port = process.env.FRONTEND_PORT || process.env.APP_PORT || process.env.PORT || "1100";
    return `http://localhost:${port}`;
  }

  private emailErrorColumnEnsured = false;

  private async ensureEmailErrorColumnExists() {
    if (this.emailErrorColumnEnsured) return;
    try {
      await db.execute(sql`ALTER TABLE form_share_logs ADD COLUMN IF NOT EXISTS email_error text`);
    } catch (error) {
      console.warn("[FORMS] Failed to ensure form_share_logs.email_error column exists:", error);
    }
    this.emailErrorColumnEnsured = true;
  }

  private buildShareLink(subdomain: string, token: string) {
    const normalizedSubdomain = subdomain?.trim() || "demo";
    const baseUrl = this.frontendUrl.replace(/\/$/, "");
    return `${baseUrl}/${normalizedSubdomain}/forms/fill?token=${encodeURIComponent(token)}`;
  }

  private async getOrganizationSubdomain(organizationId: number): Promise<string> {
    const [organization] = await db
      .select({ subdomain: organizations.subdomain })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return organization?.subdomain || "demo";
  }

  async createForm(payload: CreateFormInput) {
    const [createdForm] = await db
      .insert(forms)
      .values({
        organizationId: payload.organizationId,
        title: payload.title,
        description: payload.description,
        status: payload.status ?? "draft",
        metadata: payload.metadata ?? {},
        createdBy: payload.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (payload.sections && payload.sections.length) {
      for (const section of payload.sections) {
        const [createdSection] = await db
          .insert(formSections)
          .values({
            formId: createdForm.id,
            organizationId: payload.organizationId,
            title: section.title,
            order: section.order ?? 0,
            metadata: section.metadata ?? {},
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (section.fields && section.fields.length) {
          const fieldInserts = section.fields.map((field, index) => ({
            sectionId: createdSection.id,
            organizationId: payload.organizationId,
            label: field.label,
            fieldType: field.fieldType,
            required: field.required ?? false,
            placeholder: field.placeholder,
            fieldOptions: field.fieldOptions ?? [],
            order: field.order ?? index,
            metadata: field.metadata ?? {},
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          await db.insert(formFields).values(fieldInserts);
        }
      }
    }

    return this.getFormStructure(createdForm.id, payload.organizationId);
  }

  async getForms(organizationId: number) {
    const records = await db
      .select()
      .from(forms)
      .where(eq(forms.organizationId, organizationId))
      .orderBy(desc(forms.createdAt));

    const formIds = records.map((record) => record.id);
    const sections =
      formIds.length > 0
        ? await db
            .select()
            .from(formSections)
            .where(and(eq(formSections.organizationId, organizationId), inArray(formSections.formId, formIds)))
            .orderBy(asc(formSections.order))
        : [];

    const sectionIds = sections.map((section) => section.id);
    const fields =
      sectionIds.length > 0
        ? await db
            .select()
            .from(formFields)
            .where(and(eq(formFields.organizationId, organizationId), inArray(formFields.sectionId, sectionIds)))
            .orderBy(asc(formFields.order))
        : [];

    const fieldMap = new Map<number, any>();
    for (const field of fields) {
      if (!fieldMap.has(field.sectionId)) {
        fieldMap.set(field.sectionId, []);
      }
      fieldMap.get(field.sectionId)!.push(field);
    }

    const sectionsByForm = new Map<number, Array<any>>();
    for (const section of sections) {
      const list = sectionsByForm.get(section.formId) ?? [];
      list.push(section);
      sectionsByForm.set(section.formId, list);
    }

    return records.map((form) => ({
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      metadata: form.metadata,
      createdBy: form.createdBy,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      sections: (sectionsByForm.get(form.id) ?? []).map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        metadata: section.metadata,
        fields: (fieldMap.get(section.id) ?? []).map((field) => ({
          id: field.id,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          placeholder: field.placeholder ?? undefined,
          fieldOptions: field.fieldOptions ?? [],
          order: field.order,
          metadata: field.metadata ?? {},
        })),
      })),
    }));
  }

  private async assertPatientExistsForShare(
    patientId: number,
    organizationId: number,
  ): Promise<void> {
    const row = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
      .limit(1);
    if (row.length === 0) {
      throw new Error(
        `Patient ${patientId} not found in organization ${organizationId} (schema ${activeDbSchema})`,
      );
    }
  }

  /**
   * Validates recipient email for form share. No org patient lookup or creation —
   * external addresses are stored on the share row (recipient_email).
   */
  async resolvePatientForFormShare(
    _organizationId: number,
    recipientEmail: string,
  ): Promise<{ patientId: null; recipientEmail: string }> {
    const email = this.normalizeRecipientEmail(recipientEmail);
    if (!email) {
      throw new Error("A valid recipient email address is required");
    }

    return { patientId: null, recipientEmail: email };
  }

  private async ensureFormShareDatabaseReady(): Promise<void> {
    try {
      await ensureFormShareRecipientSupport(pool, activeDbSchema);
      await fixFormForeignKeysForActiveSchema(pool, activeDbSchema);
      await repointFormSharePatientForeignKeys(pool, activeDbSchema);
    } catch (err: unknown) {
      console.warn(
        "[FORMS] Form-share FK repair skipped (share may still fail if constraints point at the wrong schema):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  async shareForm(input: ShareFormInput) {
    await this.ensureFormShareDatabaseReady();
    if (input.patientId != null) {
      await this.assertPatientExistsForShare(input.patientId, input.organizationId);
    }

    const [shared] = await db
      .insert(formShares)
      .values({
        formId: input.formId,
        organizationId: input.organizationId,
        patientId: input.patientId,
        recipientEmail: input.recipientEmail,
        sentBy: input.sentById,
        token: "",
        expiresAt: new Date(Date.now() + this.defaultExpiryDays * 24 * 60 * 60 * 1000),
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const expiresAt = new Date(Date.now() + this.defaultExpiryDays * 24 * 60 * 60 * 1000);
    const token = uuidv4();
    const tokenHash = crypto.createHmac("sha256", this.secret).update(token).digest("hex");

    await db
      .update(formShares)
      .set({ token: tokenHash, expiresAt, updatedAt: new Date() })
      .where(eq(formShares.id, shared.id));

    const subdomain = await this.getOrganizationSubdomain(input.organizationId);
    const link = this.buildShareLink(subdomain, token);
    const formStructure = await this.getFormStructure(input.formId, input.organizationId);
    const emailPrepared = await this.prepareFormLinkEmail({
      token,
      patientId: input.patientId,
      formId: input.formId,
      organizationId: input.organizationId,
      subdomain,
      recipientEmail: input.recipientEmail,
      formTitle: formStructure?.title,
    });

    await this.ensureEmailErrorColumnExists();
    const [shareLog] = await db
      .insert(formShareLogs)
      .values({
        formId: input.formId,
        organizationId: input.organizationId,
        patientId: input.patientId,
        recipientEmail: input.recipientEmail,
        sentBy: input.sentById,
        link,
        emailSent: false,
        emailSubject: emailPrepared.subject,
        emailHtml: emailPrepared.html,
        emailText: emailPrepared.text,
        emailError: emailPrepared.toEmail ? null : (emailPrepared.error ?? "No recipient email"),
        createdAt: new Date(),
      })
      .returning({ id: formShareLogs.id });

    let emailSent = false;
    let emailDeliveryError: string | undefined;
    if (!emailPrepared.toEmail) {
      emailDeliveryError = emailPrepared.error ?? "No recipient email address";
    } else if (shareLog?.id) {
      const delivery = await this.deliverFormShareEmail(shareLog.id, {
        to: emailPrepared.toEmail,
        subject: emailPrepared.subject,
        html: emailPrepared.html,
        text: emailPrepared.text,
        formId: input.formId,
      });
      emailSent = delivery.success;
      emailDeliveryError = delivery.success ? undefined : delivery.error;
    }

    const form = formStructure ?? (await this.getFormStructure(input.formId, input.organizationId));

    return {
      share: {
        id: shared.id,
        formId: shared.formId,
        patientId: shared.patientId,
        expiresAt,
        status: shared.status,
      },
      form,
      link,
      emailSent,
      emailQueued: false,
      emailError: emailDeliveryError,
      emailPreview: {
        subject: emailPrepared.subject,
        html: emailPrepared.html,
        text: emailPrepared.text,
      },
    };
  }

  async getFormShareLogs(formId: number, organizationId: number) {
    const rows = await db
      .select({
        id: formShareLogs.id,
        link: formShareLogs.link,
        emailSent: formShareLogs.emailSent,
        emailSubject: formShareLogs.emailSubject,
        emailHtml: formShareLogs.emailHtml,
        emailText: formShareLogs.emailText,
        emailError: formShareLogs.emailError,
        createdAt: formShareLogs.createdAt,
        patientId: formShareLogs.patientId,
        recipientEmail: formShareLogs.recipientEmail,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientEmail: patients.email,
      })
      .from(formShareLogs)
      .leftJoin(patients, eq(patients.id, formShareLogs.patientId))
      .where(and(eq(formShareLogs.organizationId, organizationId), eq(formShareLogs.formId, formId)))
      .orderBy(desc(formShareLogs.createdAt));

    const patientIds = [...new Set(rows.map((r) => r.patientId).filter((id): id is number => id != null))];
    const byId = new Map<number, Patient>();
    await Promise.all(
      patientIds.map(async (id) => {
        const p = await storage.getPatient(id, organizationId);
        if (p) byId.set(id, p);
      }),
    );

    return rows.map((row) => {
      const p = row.patientId != null ? byId.get(row.patientId) : undefined;
      if (!p) {
        return {
          ...row,
          patientEmail: row.recipientEmail ?? row.patientEmail,
        };
      }
      return {
        ...row,
        patientFirstName: p.firstName ?? row.patientFirstName,
        patientLastName: p.lastName ?? row.patientLastName,
        patientEmail: p.email ?? row.patientEmail,
      };
    });
  }

  async resendShareEmail(logId: number, organizationId: number, sentById?: number) {
    const [logEntry] = await db
      .select({
        id: formShareLogs.id,
        formId: formShareLogs.formId,
        patientId: formShareLogs.patientId,
        link: formShareLogs.link,
        emailSubject: formShareLogs.emailSubject,
        emailHtml: formShareLogs.emailHtml,
        emailText: formShareLogs.emailText,
      })
      .from(formShareLogs)
      .where(
        and(
          eq(formShareLogs.id, logId),
          eq(formShareLogs.organizationId, organizationId),
        ),
      );

    if (!logEntry) {
      throw new Error("Share log entry not found");
    }

    let token: string | null = null;
    let parsedSubdomain = "demo";
    try {
      const parsed = new URL(logEntry.link);
      token = parsed.searchParams.get("token");
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2 && pathParts[1] === "forms") {
        parsedSubdomain = pathParts[0];
      }
    } catch (error) {
      console.warn("[FORMS] could not parse token from link", logEntry.link, error);
    }

    if (!token) {
      throw new Error("Invalid share link stored in log");
    }

    const emailResult = await this.sendFormLinkEmail({
      token,
      patientId: logEntry.patientId,
      formId: logEntry.formId,
      organizationId,
      subdomain: parsedSubdomain,
    });

    await this.ensureEmailErrorColumnExists();
    await db.insert(formShareLogs).values({
      formId: logEntry.formId,
      organizationId,
      patientId: logEntry.patientId,
      sentBy: sentById ?? null,
      link: logEntry.link,
      emailSent: emailResult.sent,
      emailSubject: emailResult.subject,
      emailHtml: emailResult.html,
      emailText: emailResult.text,
      emailError: emailResult.error ?? null,
      createdAt: new Date(),
    });

    return {
      emailSent: emailResult.sent,
      link: logEntry.link,
    };
  }

  async getShareByToken(token: string) {
    try {
      const hashed = crypto.createHmac("sha256", this.secret).update(token).digest("hex");
      const [share] = await db.select().from(formShares).where(eq(formShares.token, hashed));
      if (!share) {
        throw new Error("Share not found");
      }
      if (share.expiresAt < new Date()) {
        await db
          .update(formShares)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(formShares.id, share.id));
        throw new Error("Share link expired");
      }
      const form = await this.getFormStructure(share.formId, share.organizationId);
      if (!form) {
        throw new Error("Form schema not found");
      }
      return { share, form };
    } catch (error) {
      throw error;
    }
  }

  async getShareMetadata(token: string) {
    const { share } = await this.getShareByToken(token);
    const [header] = await db
      .select()
      .from(clinicHeaders)
      .where(eq(clinicHeaders.organizationId, share.organizationId))
      .orderBy(desc(clinicHeaders.id))
      .limit(1);
    const [footer] = await db
      .select()
      .from(clinicFooters)
      .where(eq(clinicFooters.organizationId, share.organizationId))
      .orderBy(desc(clinicFooters.id))
      .limit(1);
    return {
      header,
      footer,
      share,
    };
  }

  async submitResponse(token: string, answers: AnswerPayload[]) {
    const { share, form } = await this.getShareByToken(token);
    if (share.status === "submitted") {
      throw new Error("Form already submitted");
    }

    const { header, footer } = await this.loadClinicBranding(share.organizationId);

    const [response] = await db
      .insert(formResponses)
      .values({
        shareId: share.id,
        organizationId: share.organizationId,
        patientId: share.patientId ?? null,
        submittedAt: new Date(),
        metadata: {},
      })
      .returning();

    const valueInserts = answers.map((answer) => {
      const isPrimitive = typeof answer.value === "string" || typeof answer.value === "number" || typeof answer.value === "boolean";
      return {
        responseId: response.id,
        fieldId: answer.fieldId,
        value: isPrimitive ? String(answer.value) : JSON.stringify(answer.value),
        valueJson: isPrimitive ? null : answer.value,
        createdAt: new Date(),
      };
    });
    if (valueInserts.length > 0) {
      await db.insert(formResponseValues).values(valueInserts);
    }

    await db
      .update(formShares)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(eq(formShares.id, share.id));

    await this.persistResponseDocument(response, share, form, answers, header, footer);

    return response;
  }

  async deleteForm(formId: number, organizationId: number) {
    const sectionIds = await db
      .select({ id: formSections.id })
      .from(formSections)
      .where(and(eq(formSections.formId, formId), eq(formSections.organizationId, organizationId)));

    const sectionIdValues = sectionIds.map((section) => section.id);

    const fieldIds = sectionIdValues.length
      ? await db
          .select({ id: formFields.id })
          .from(formFields)
          .where(and(inArray(formFields.sectionId, sectionIdValues), eq(formFields.organizationId, organizationId)))
      : [];

    const fieldIdValues = fieldIds.map((field) => field.id);

    const shareIds = await db
      .select({ id: formShares.id })
      .from(formShares)
      .where(and(eq(formShares.formId, formId), eq(formShares.organizationId, organizationId)));

    const shareIdValues = shareIds.map((share) => share.id);

    const responseIds = shareIdValues.length
      ? await db
          .select({ id: formResponses.id })
          .from(formResponses)
          .where(and(inArray(formResponses.shareId, shareIdValues), eq(formResponses.organizationId, organizationId)))
      : [];

    const responseIdValues = responseIds.map((response) => response.id);

    if (responseIdValues.length) {
      await db.delete(formResponseValues).where(inArray(formResponseValues.responseId, responseIdValues));
    }

    if (responseIdValues.length) {
      await db.delete(formResponses).where(inArray(formResponses.id, responseIdValues));
    }

    await db.delete(formShareLogs).where(
      and(eq(formShareLogs.formId, formId), eq(formShareLogs.organizationId, organizationId)),
    );

    if (shareIdValues.length) {
      await db.delete(formShares).where(inArray(formShares.id, shareIdValues));
    }

    if (fieldIdValues.length) {
      await db.delete(formFields).where(inArray(formFields.id, fieldIdValues));
    }

    if (sectionIdValues.length) {
      await db.delete(formSections).where(inArray(formSections.id, sectionIdValues));
    }

    await db.delete(forms).where(and(eq(forms.id, formId), eq(forms.organizationId, organizationId)));
  }

  private async persistResponseDocument(
    response: { id: number; submittedAt: Date },
    share: {
      id: number;
      organizationId: number;
      formId: number;
      sentBy: number | null;
      patientId: number | null;
      recipientEmail?: string | null;
    },
    form: FormStructure,
    answers: AnswerPayload[],
    header?: typeof clinicHeaders[number] | null,
    footer?: typeof clinicFooters[number] | null,
  ) {
    const patient =
      share.patientId != null
        ? await storage.getPatient(share.patientId, share.organizationId)
        : undefined;
    const externalEmail = this.normalizeRecipientEmail(share.recipientEmail ?? undefined);
    let patientName = "Form respondent";
    if (patient) {
      patientName =
        `${await patientScalarForEmail("firstName", patient.firstName as unknown)} ${await patientScalarForEmail("lastName", patient.lastName as unknown)}`.trim() ||
        `Patient ${share.patientId}`;
    } else if (externalEmail) {
      const local = externalEmail.split("@")[0]?.replace(/[._+]/g, " ").trim() || "";
      patientName = local.split(/\s+/).filter(Boolean)[0] || externalEmail;
    }
    const answersMap = this.buildAnswerMap(answers);
    const htmlContent = this.buildFormSummaryHtml(
      form,
      answersMap,
      patientName,
      response.submittedAt,
      header,
      footer,
    );
    const pdfBuffer = await this.buildFormPdfBuffer(
      form,
      answersMap,
      response,
      patientName,
      header,
      footer,
    );

    const patientFolder =
      share.patientId != null ? String(share.patientId) : `external-${share.id}`;
    const pdfDir = path.join(
      process.cwd(),
      "uploads",
      "patients_forms",
      String(share.organizationId),
      "patients",
      patientFolder,
      "forms",
    );
    await fs.ensureDir(pdfDir);
    const filename = `form-${form.id}-${patientFolder}-${response.id}.pdf`;
    const pdfPath = path.join(pdfDir, filename);
    await fs.writeFile(pdfPath, Buffer.from(pdfBuffer));
    const pdfUrlPath = path.posix.join(
      "uploads",
      "patients_forms",
      String(share.organizationId),
      "patients",
      patientFolder,
      "forms",
      filename,
    );

    await db.insert(documents).values({
      organizationId: share.organizationId,
      userId: share.sentBy ?? share.patientId ?? 0,
      name: `${form.title} Response ${response.id}`,
      type: "medical_form",
      content: htmlContent,
      metadata: {
        shareId: share.id,
        responseId: response.id,
        formId: share.formId,
        patientName,
        headerName: header?.clinicName,
        footerText: footer?.footerText,
        pdfPath: pdfUrlPath,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (patient) {
      await this.sendResponsePdfToPatient(patient, share.organizationId, form, pdfPath, response.id);
    } else if (externalEmail) {
      await this.sendResponsePdfToRecipientEmail(externalEmail, form, pdfPath);
    }
  }

  private buildAnswerMap(answers: AnswerPayload[]) {
    const map = new Map<number, any>();
    answers.forEach((answer) => {
      map.set(answer.fieldId, answer.value);
    });
    return map;
  }

  private formatAnswerValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private buildFormSummaryHtml(
    form: FormStructure,
    answersMap: Map<number, any>,
    patientName: string,
    submittedAt: Date,
    header?: typeof clinicHeaders[number] | null,
    footer?: typeof clinicFooters[number] | null,
  ) {
    let html = "<div>";

    if (header) {
      html += `
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px;">
          ${header.logoBase64 ? `<img src="${header.logoBase64}" alt="Clinic Logo" style="max-height:60px; display:block; margin-bottom:8px;" />` : ""}
          <h1 style="margin:0; font-size:22px;">${header.clinicName}</h1>
          <p style="margin:4px 0 0 0; color:#475569;">${header.address || ""}</p>
          <p style="margin:4px 0 0 0; color:#475569;">
            ${header.phone ? `Phone: ${header.phone}` : ""} ${header.email ? `| Email: ${header.email}` : ""}
          </p>
        </div>
      `;
    }

    html += `
      <h2>${form.title}</h2>
      <p>Patient: ${patientName}</p>
      <p>Submitted: ${submittedAt.toISOString()}</p>
    `;

    form.sections.forEach((section) => {
      html += `<h2>${section.title}</h2><ul>`;
      section.fields.forEach((field) => {
        const answerValue = answersMap.get(field.id);
        const displayValue = this.formatAnswerValue(answerValue);
        html += `<li><strong>${field.label}:</strong> ${displayValue || "<em>–</em>"}</li>`;
      });
      html += `</ul>`;
    });

    html += `</div>`;

    if (footer) {
      html += `
        <div style="margin-top: 18px; padding: 10px; border-top: 1px solid #e2e8f0; color:#475569;">
          <p style="margin:0; font-weight:600;">${footer.footerText}</p>
        </div>
      `;
    }

    return html;
  }

  private async buildFormPdfBuffer(
    form: FormStructure,
    answersMap: Map<number, any>,
    response: { id: number; submittedAt: Date },
    patientName: string,
    header?: typeof clinicHeaders[number] | null,
    footer?: typeof clinicFooters[number] | null,
  ) {
    const pdfDoc = await PDFDocument.create();
    const pageSize = [595, 842];
    const pageWidth = pageSize[0];
    const pageHeight = pageSize[1];
    const pageMargin = 40;
    const footerReservedSpace = 80;
    const bottomThreshold = pageMargin + footerReservedSpace;
    let page = pdfDoc.addPage(pageSize);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let yPosition = pageHeight - pageMargin;

    const moveToNextPage = () => {
      page = pdfDoc.addPage(pageSize);
      yPosition = pageHeight - pageMargin;
    };

    const drawText = (text: string, size = 12, x = pageMargin, color = rgb(0.1, 0.1, 0.1)) => {
      if (yPosition < bottomThreshold) {
        moveToNextPage();
      }
      page.drawText(text, {
        x,
        y: yPosition,
        size,
        font,
        color,
      });
      yPosition -= size + 4;
    };

    const wrapTextLines = (
      text: string,
      size: number,
      maxWidth: number,
      measureFont = font,
    ) => {
      const normalized = text.replace(/\r\n/g, "\n");
      const paragraphs = normalized.split("\n");
      const lines: string[] = [];

      const breakOversizedWord = (word: string): string[] => {
        if (measureFont.widthOfTextAtSize(word, size) <= maxWidth) {
          return [word];
        }
        const parts: string[] = [];
        let chunk = "";
        for (const char of word) {
          const candidate = chunk + char;
          if (measureFont.widthOfTextAtSize(candidate, size) <= maxWidth) {
            chunk = candidate;
          } else {
            if (chunk) {
              parts.push(chunk);
            }
            chunk = char;
          }
        }
        if (chunk) {
          parts.push(chunk);
        }
        return parts.length > 0 ? parts : [""];
      };

      for (const paragraph of paragraphs) {
        if (paragraph === "") {
          lines.push("");
          continue;
        }
        const words = paragraph.split(/\s+/).filter(Boolean);
        let current = "";
        for (const word of words) {
          const wordParts = breakOversizedWord(word);
          for (const part of wordParts) {
            const test = current ? `${current} ${part}` : part;
            if (measureFont.widthOfTextAtSize(test, size) <= maxWidth) {
              current = test;
            } else {
              if (current) {
                lines.push(current);
              }
              current = part;
            }
          }
        }
        if (current) {
          lines.push(current);
        }
      }

      return lines.length > 0 ? lines : [""];
    };

    let headerTop = yPosition;
    let headerTextX = pageMargin;
    let logoMetrics: { image: any; width: number; height: number; x: number; y: number } | null = null;
    if (header) {
      const embeddedLogo = await this.embedLogoImage(pdfDoc, header.logoBase64);
      if (embeddedLogo) {
        const leftWidth = Math.min(embeddedLogo.width, 120);
        const leftScale = leftWidth / embeddedLogo.width;
        const leftHeight = embeddedLogo.height * leftScale;
        const logoX = pageMargin;
        const logoY = headerTop - leftHeight + 12;
        logoMetrics = {
          image: embeddedLogo,
          width: leftWidth,
          height: leftHeight,
          x: logoX,
          y: logoY,
        };
        headerTextX = logoX + leftWidth + 12;
      }

      headerTop = yPosition;
      drawText(header.clinicName, 18, headerTextX);
      if (header.address) drawText(header.address, 12, headerTextX);
      if (header.phone || header.email) {
        drawText(
          `${header.phone ? `Phone: ${header.phone}` : ""}${header.phone && header.email ? " | " : ""}${header.email ? `Email: ${header.email}` : ""}`,
          10,
          headerTextX,
        );
      }
      drawText(" ", 6, headerTextX);
      yPosition = Math.min(yPosition, headerTop - (logoMetrics?.height ?? 0) - 12);
    }

    if (logoMetrics) {
      page.drawImage(logoMetrics.image, {
        x: logoMetrics.x,
        y: logoMetrics.y,
        width: logoMetrics.width,
        height: logoMetrics.height,
      });
    }

    const heroPadding = 24;
    const heroInfoMaxWidth =
      pageWidth - pageMargin * 2 - heroPadding * 2 - 100;
    const detailLineSpecs = [
      { text: `Form: ${form.title}`, size: 12 },
      { text: `Patient: ${patientName}`, size: 12 },
      { text: `Submitted: ${response.submittedAt.toISOString()}`, size: 11 },
    ];
    const detailLines = detailLineSpecs.flatMap((spec) =>
      wrapTextLines(spec.text, spec.size, heroInfoMaxWidth).map((line) => ({
        text: line,
        size: spec.size,
      })),
    );
    const heroHeight =
      heroPadding * 2 +
      42 +
      detailLines.reduce((sum, line) => sum + line.size + 6, 0);
    const heroMargin = 14;
    const heroWidth = pageWidth - pageMargin * 2 - 100;
    const heroX = pageMargin + 50;
    const heroY = yPosition - heroHeight - heroMargin;
    page.drawRectangle({
      x: heroX,
      y: heroY,
      width: heroWidth,
      height: heroHeight,
      color: rgb(0.98, 0.98, 1),
    });
    const heroTitleY = heroY + heroHeight - heroPadding - 8;
    page.drawText("Cura Healthcare — Form Submission", {
      x: heroX + heroPadding,
      y: heroTitleY,
      size: 12,
      font: boldFont,
      color: rgb(0.08, 0.08, 0.13),
    });

    let infoY = heroTitleY - 28;
    for (const info of detailLines) {
      page.drawText(info.text, {
        x: heroX + heroPadding,
        y: infoY,
        size: info.size,
        font,
        color: rgb(0.18, 0.18, 0.26),
      });
      infoY -= info.size + 6;
    }

    yPosition = heroY - heroMargin;

    const columnsX = heroX + heroPadding;
    const labelColumnWidth = 140;
    const columnGap = 18;
    const valueColumnX = columnsX + labelColumnWidth + columnGap;
    const maxValueWidth =
      heroX + heroWidth - heroPadding - valueColumnX - columnGap;

    const ensureYSpace = (requiredHeight: number) => {
      if (yPosition - requiredHeight < bottomThreshold) {
        moveToNextPage();
        yPosition = pageHeight - pageMargin;
      }
    };

    for (const section of form.sections) {
      const sectionSpacing = section.title === "General" ? 6 : 16;
      ensureYSpace(sectionSpacing + 20);
      yPosition -= sectionSpacing;

      const sectionTitleLines = wrapTextLines(
        section.title,
        13,
        pageWidth - columnsX - pageMargin,
        boldFont,
      );
      let titleY = yPosition;
      for (const titleLine of sectionTitleLines) {
        if (titleY - 16 < bottomThreshold) {
          moveToNextPage();
          titleY = pageHeight - pageMargin;
        }
        page.drawText(titleLine, {
          x: columnsX,
          y: titleY,
          size: 13,
          font: boldFont,
          color: rgb(0.07, 0.07, 0.16),
        });
        titleY -= 16;
      }
      yPosition = titleY;

      for (const field of section.fields) {
        const valueRaw = this.formatAnswerValue(answersMap.get(field.id));
        const value = valueRaw || "—";
        const valueFontSize = 10;
        const labelFontSize = 12;
        const labelLineHeight = labelFontSize + 4;
        const wrappedValueLines = wrapTextLines(value, valueFontSize, maxValueWidth);
        const wrappedLabelLines = wrapTextLines(
          field.label,
          labelFontSize,
          labelColumnWidth - 4,
          boldFont,
        );
        const badgePaddingX = 6;
        const badgePaddingY = 4;
        const badgeHeight = valueFontSize + badgePaddingY * 2;
        const valueLineSpacing = badgeHeight + 3;
        const badgeColor = rgb(0.93, 0.94, 0.99);

        const maxLines = Math.max(
          wrappedLabelLines.length,
          wrappedValueLines.length,
        );
        ensureYSpace(
          maxLines * Math.max(labelLineHeight, valueLineSpacing) + 12,
        );

        let lineY = yPosition;
        for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
          const hasLabel = lineIndex < wrappedLabelLines.length;
          const hasValue = lineIndex < wrappedValueLines.length;
          const chunkHeight = Math.max(
            hasLabel ? labelLineHeight : 0,
            hasValue ? valueLineSpacing : 0,
          );

          if (lineY - chunkHeight < bottomThreshold) {
            moveToNextPage();
            lineY = pageHeight - pageMargin;
          }

          if (hasLabel) {
            page.drawText(wrappedLabelLines[lineIndex], {
              x: columnsX,
              y: lineY,
              size: labelFontSize,
              font: boldFont,
              color: rgb(0.15, 0.15, 0.27),
            });
          }

          if (hasValue) {
            const line = wrappedValueLines[lineIndex];
            const textWidth = font.widthOfTextAtSize(line, valueFontSize);
            const badgeWidth = Math.min(
              textWidth + badgePaddingX * 2,
              maxValueWidth + badgePaddingX * 2,
            );
            const badgeY = lineY - badgePaddingY;
            page.drawRectangle({
              x: valueColumnX - badgePaddingX,
              y: badgeY,
              width: badgeWidth,
              height: badgeHeight,
              color: badgeColor,
              borderRadius: 3,
            });
            page.drawText(line, {
              x: valueColumnX,
              y: lineY,
              size: valueFontSize,
              font,
              color: rgb(0.07, 0.07, 0.16),
            });
          }

          lineY -= chunkHeight;
        }

        yPosition = lineY - 10;
      }
      yPosition -= 10;
    }

    // Content rendered inside the hero area above; no further layout necessary

    if (footer) {
      const footerFontSize = 10;
      const footerLineHeight = footerFontSize + 4;
      const footerMaxWidth = pageWidth - pageMargin * 2;
      const footerLines = wrapTextLines(
        footer.footerText,
        footerFontSize,
        footerMaxWidth,
      );
      const footerBlockHeight = footerLines.length * footerLineHeight;
      if (yPosition < bottomThreshold + footerBlockHeight) {
        moveToNextPage();
      }
      let footerY = pageMargin;
      for (let i = footerLines.length - 1; i >= 0; i--) {
        const footerLine = footerLines[i];
        const textWidth = font.widthOfTextAtSize(footerLine, footerFontSize);
        const centerX = Math.max(pageMargin, (pageWidth - textWidth) / 2);
        page.drawText(footerLine, {
          x: centerX,
          y: footerY,
          size: footerFontSize,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        footerY += footerLineHeight;
      }
    }

    return pdfDoc.save();
  }

  private async embedLogoImage(pdfDoc: PDFDocument, logoBase64?: string | null) {
    if (!logoBase64) {
      return null;
    }

    const normalized = logoBase64.trim();
    const matches = normalized.match(/^data:(image\/(?:png|jpg|jpeg));base64,(.+)$/i);
    const mimeType = matches ? matches[1].toLowerCase() : "image/png";
    const base64Data = matches ? matches[2] : normalized;
    const buffer = Buffer.from(base64Data, "base64");

    try {
      if (mimeType.includes("png")) {
        return await pdfDoc.embedPng(buffer);
      }
      return await pdfDoc.embedJpg(buffer);
    } catch (error) {
      console.warn("[FORMS] Unable to embed clinic logo into PDF:", error);
      return null;
    }
  }

  private async sendResponsePdfToRecipientEmail(
    toEmail: string,
    form: FormStructure,
    pdfPath: string,
  ): Promise<void> {
    const local = toEmail.split("@")[0]?.replace(/[._+]/g, " ").trim() || "";
    const greeting = local.split(/\s+/).filter(Boolean)[0] || "there";
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(pdfPath);
    } catch (error) {
      console.error("[FORMS] Failed to read PDF for email attachment:", pdfPath, error);
      return;
    }

    const pdfBase64 = pdfBuffer.toString("base64");
    const filename = path.basename(pdfPath);
    const subject = `Your completed ${form.title}`;
    const html = `
      <p>Hi ${greeting},</p>
      <p>The form <strong>${form.title}</strong> you filled has been processed. You can find a PDF copy attached.</p>
      <p>Regards,<br/>The Cura EMR Team</p>
    `;

    const emailReport = await emailService.sendEmailWithReport({
      to: toEmail,
      from: process.env.DEFAULT_FROM_EMAIL || "no-reply@curaemr.ai",
      subject,
      html,
      attachments: [
        {
          content: pdfBase64,
          filename,
          type: "application/pdf",
          disposition: "attachment",
          encoding: "base64",
        },
      ],
    });

    if (!emailReport.success) {
      console.error("Failed to email completed form PDF to external recipient:", emailReport.error);
    }
  }

  private async sendResponsePdfToPatient(
    patient: Patient | undefined,
    organizationId: number,
    form: FormStructure,
    pdfPath: string,
    responseId: number,
  ) {
    if (!patient) return;
    const toEmail = await this.resolveRecipientEmail(patient, organizationId);
    if (!toEmail) return;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(pdfPath);
    } catch (error) {
      console.error("[FORMS] Failed to read PDF for email attachment:", pdfPath, error);
      return;
    }

    const pdfBase64 = pdfBuffer.toString("base64");
    const filename = path.basename(pdfPath);
    const subject = `Your completed ${form.title}`;
    const html = `
      <p>Hi ${await patientFirstNameForEmail(patient)},</p>
      <p>The form <strong>${form.title}</strong> you filled has been processed. You can find a PDF copy attached.</p>
      <p>Regards,<br/>The Cura EMR Team</p>
    `;

    const emailReport = await emailService.sendEmailWithReport({
      to: toEmail,
      from: process.env.DEFAULT_FROM_EMAIL || "no-reply@curaemr.ai",
      subject,
      html,
      attachments: [
        {
          content: pdfBase64,
          filename,
          type: "application/pdf",
          disposition: "attachment",
          encoding: "base64",
        },
      ],
    });

    if (!emailReport.success) {
      console.error("Failed to email completed form PDF:", emailReport.error);
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private formatEmailGreetingName(recipientEmail: string): string {
    const local = recipientEmail.split("@")[0]?.replace(/[._+]/g, " ").trim() || "";
    const first = local.split(/\s+/).filter(Boolean)[0] || "there";
    if (first === "there") return "there";
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  private buildShareEmailContentForRecipient(
    recipientEmail: string,
    link: string,
    formTitle?: string,
    displayName?: string,
  ) {
    const rawName =
      typeof displayName === "string" && displayName.trim()
        ? displayName.trim().split(/\s+/)[0] || ""
        : "";
    const greetingName =
      rawName && rawName.toLowerCase() !== "there"
        ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
        : this.formatEmailGreetingName(recipientEmail);
    const greeting = this.escapeHtml(greetingName);
    const safeLink = this.escapeHtml(link);
    const subject = formTitle?.trim()
      ? `Please complete: ${formTitle.trim()}`
      : "Your Cura Medical Form";
    const safeFormTitle = formTitle?.trim() ? this.escapeHtml(formTitle.trim()) : "";
    const introLine = safeFormTitle
      ? `Your care team has sent you <strong>${safeFormTitle}</strong> to complete online.`
      : "Your care team has sent you a secure form to complete online.";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#6366F1 100%);color:#ffffff;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Secure form</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.3;">Cura Medical Form</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hi ${greeting},</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#475569;">
                ${introLine} A PDF copy will be saved when you submit.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${safeLink}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 36px;border-radius:10px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
                      Complete your form
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px 28px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                Button not working?
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#64748b;">
                Copy and paste this link into your browser&apos;s address bar:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                <tr>
                  <td style="padding:14px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;line-height:1.55;word-break:break-all;font-family:ui-monospace,'Cascadia Code','Segoe UI Mono',Consolas,monospace;">
                    <a href="${safeLink}" style="color:#4F46E5;text-decoration:none;">${safeLink}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.55;color:#94a3b8;">
                If you did not expect this email, please contact your clinic and do not use the link above.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-top:4px;border-top:1px solid #e2e8f0;">
                    <p style="margin:16px 0 0;font-size:11px;line-height:1.4;color:#cbd5e1;">
                      Sent securely via Cura EMR
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    const text = `Hi ${greetingName},

Your care team sent you a secure medical form to complete.

Complete your form:
${link}

If the button does not work, copy and paste the link above into your browser.

If you did not expect this email, contact your clinic.`;
    return { subject, html, text };
  }

  private async buildShareEmailContent(
    patient: Patient,
    link: string,
    deliverToEmail?: string,
    formTitle?: string,
  ) {
    const deliverTo = this.normalizeRecipientEmail(deliverToEmail);
    const greeting = await patientFirstNameForEmail(patient);
    const emailForGreeting =
      deliverTo ||
      (typeof patient.email === "string" && patient.email.includes("@") ? patient.email : "");
    return this.buildShareEmailContentForRecipient(
      emailForGreeting || "patient@cura.local",
      link,
      formTitle,
      greeting,
    );
  }

  /** Plaintext inbox for form links: patient row after decrypt, else linked user account email. */
  private async resolveRecipientEmail(
    patient: Patient,
    organizationId: number,
  ): Promise<string | null> {
    let raw = typeof patient.email === "string" ? patient.email.trim() : "";
    const emailEnv = patientEnvelopeJsonFromUnknown(patient.email as unknown);
    if (emailEnv) {
      try {
        raw = (await decryptPatientField("email", emailEnv)).trim();
      } catch {
        raw = "";
      }
    }
    if (raw.includes("@") && !raw.startsWith("{")) {
      return raw;
    }
    if (patient.userId != null) {
      const [u] = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.id, patient.userId), eq(users.organizationId, organizationId)))
        .limit(1);
      const ue = u?.email?.trim();
      if (ue && ue.includes("@")) return ue;
    }
    return null;
  }

  private async getFormStructure(formId: number, organizationId: number): Promise<FormStructure | null> {
    const [formRecord] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.organizationId, organizationId)));

    if (!formRecord) {
      return null;
    }

    const sections = await db
      .select()
      .from(formSections)
      .where(and(eq(formSections.formId, formId), eq(formSections.organizationId, organizationId)))
      .orderBy(asc(formSections.order));

    const sectionIds = sections.map((section) => section.id);
    const fields =
      sectionIds.length > 0
        ? await db
            .select()
            .from(formFields)
            .where(and(eq(formFields.organizationId, organizationId), inArray(formFields.sectionId, sectionIds)))
            .orderBy(asc(formFields.order))
        : [];

    const fieldMap = new Map<number, any>();
    for (const field of fields) {
      if (!fieldMap.has(field.sectionId)) {
        fieldMap.set(field.sectionId, []);
      }
      fieldMap.get(field.sectionId)!.push(field);
    }

    return {
      id: formRecord.id,
      title: formRecord.title,
      description: formRecord.description ?? undefined,
      status: formRecord.status,
      metadata: formRecord.metadata ?? {},
      createdBy: formRecord.createdBy ?? undefined,
      sections: sections.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        metadata: section.metadata ?? {},
        fields: (fieldMap.get(section.id) ?? []).map((field) => ({
          id: field.id,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          placeholder: field.placeholder ?? undefined,
          fieldOptions: field.fieldOptions ?? [],
          order: field.order,
          metadata: field.metadata ?? {},
        })),
      })),
    };
  }

  async getFormResponses(formId: number, organizationId: number) {
    const form = await this.getFormStructure(formId, organizationId);
    if (!form) {
      throw new Error("Form not found");
    }

    const formFieldDefinitions = form.sections.flatMap((section) =>
      section.fields.map((field) => ({
        id: field.id,
        label: field.label || `Field ${field.id}`,
        fieldType: field.fieldType,
      })),
    );
    const fieldMap = new Map<number, { id: number; label: string; fieldType?: string }>();
    formFieldDefinitions.forEach((field) => fieldMap.set(field.id, field));

    const shareRecords = await db
      .select({ id: formShares.id })
      .from(formShares)
      .where(and(eq(formShares.organizationId, organizationId), eq(formShares.formId, formId)));

    const shareIds = shareRecords.map((share) => share.id);
    if (!shareIds.length) {
      return {
        formId,
        formTitle: form.title,
        fields: formFieldDefinitions,
        responses: [],
      };
    }

    const responses = await db
      .select({
        id: formResponses.id,
        shareId: formResponses.shareId,
        patientId: formResponses.patientId,
        submittedAt: formResponses.submittedAt,
      })
      .from(formResponses)
      .where(
        and(
          eq(formResponses.organizationId, organizationId),
          inArray(formResponses.shareId, shareIds),
        ),
      )
      .orderBy(desc(formResponses.submittedAt));

    const responseIds = responses.map((response) => response.id);
    const values = responseIds.length
      ? await db
          .select({
            responseId: formResponseValues.responseId,
            fieldId: formResponseValues.fieldId,
            value: formResponseValues.value,
            valueJson: formResponseValues.valueJson,
          })
          .from(formResponseValues)
          .where(inArray(formResponseValues.responseId, responseIds))
      : [];

    const patientIds = Array.from(new Set(responses.map((response) => response.patientId))).filter(
      Boolean,
    );
    const patientMap = new Map<number, Patient>();
    if (patientIds.length) {
      const rows = await Promise.all(
        patientIds.map((id) => storage.getPatient(id, organizationId)),
      );
      rows.forEach((p) => {
        if (p) patientMap.set(p.id, p);
      });
    }

    const valuesByResponse = new Map<number, typeof values[number][]>();
    values.forEach((valueRecord) => {
      const bucket = valuesByResponse.get(valueRecord.responseId) ?? [];
      bucket.push(valueRecord);
      valuesByResponse.set(valueRecord.responseId, bucket);
    });

    const responsesPayload = responses.map((response) => {
      const patient = response.patientId ? patientMap.get(response.patientId) ?? null : null;
      const answers = (valuesByResponse.get(response.id) ?? []).map((valueRecord) => ({
        fieldId: valueRecord.fieldId,
        label: fieldMap.get(valueRecord.fieldId)?.label || `Field ${valueRecord.fieldId}`,
        value: valueRecord.valueJson ?? valueRecord.value ?? "",
      }));
      return {
        responseId: response.id,
        shareId: response.shareId,
        submittedAt: response.submittedAt,
        patient: patient
          ? {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              phone: patient.phone,
              nhsNumber: patient.nhsNumber,
            }
          : null,
        answers,
      };
    });

    return {
      formId,
      formTitle: form.title,
      fields: formFieldDefinitions,
      responses: responsesPayload,
    };
  }

  private normalizeRecipientEmail(value: string | undefined): string | null {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed || !trimmed.includes("@") || trimmed.startsWith("{")) {
      return null;
    }
    return trimmed;
  }

  private async prepareFormLinkEmail(params: {
    token: string;
    patientId: number | null;
    formId: number;
    organizationId: number;
    subdomain: string;
    recipientEmail?: string;
    formTitle?: string;
  }): Promise<ShareEmailResult & { toEmail?: string }> {
    const link = this.buildShareLink(params.subdomain, params.token);
    const overrideEmail = this.normalizeRecipientEmail(params.recipientEmail);
    if (overrideEmail) {
      const { subject, html, text } = this.buildShareEmailContentForRecipient(
        overrideEmail,
        link,
        params.formTitle,
      );
      return { sent: false, subject, html, text, toEmail: overrideEmail };
    }

    if (params.patientId == null) {
      return {
        sent: false,
        subject: "",
        html: "",
        text: "",
        error: "Recipient email is required",
      };
    }

    const patient = await storage.getPatient(params.patientId, params.organizationId);
    if (!patient) {
      return {
        sent: false,
        subject: "",
        html: "",
        text: "",
        error: "Patient record not found",
      };
    }

    const { subject, html, text } = await this.buildShareEmailContent(
      patient,
      link,
      undefined,
      params.formTitle,
    );
    const toEmail = await this.resolveRecipientEmail(patient, params.organizationId);
    if (!toEmail) {
      return {
        sent: false,
        subject,
        html,
        text,
        error: "Patient does not have a usable email address",
      };
    }

    return { sent: false, subject, html, text, toEmail };
  }

  private async deliverFormShareEmail(
    shareLogId: number,
    params: { to: string; subject: string; html: string; text: string; formId: number },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { success, error } = await emailService.sendEmailWithReport({
        to: params.to,
        from: process.env.DEFAULT_FROM_EMAIL || "no-reply@curaemr.ai",
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      await db
        .update(formShareLogs)
        .set({
          emailSent: success,
          emailError: success ? null : (error ?? "Email delivery failed"),
        })
        .where(eq(formShareLogs.id, shareLogId));

      if (!success) {
        console.warn("[EMAIL] sendEmailWithReport failed for form share", {
          to: params.to,
          formId: params.formId,
          error,
        });
        return { success: false, error: error ?? "Email delivery failed" };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[EMAIL] Form-share email failed:", message);
      await db
        .update(formShareLogs)
        .set({ emailSent: false, emailError: message })
        .where(eq(formShareLogs.id, shareLogId))
        .catch(() => undefined);
      return { success: false, error: message };
    }
  }

  private async sendFormLinkEmail(params: {
    token: string;
    patientId: number;
    formId: number;
    organizationId: number;
    subdomain: string;
  }): Promise<ShareEmailResult> {
    const prepared = await this.prepareFormLinkEmail(params);
    if (!prepared.toEmail) {
      return prepared;
    }

    const { success, error } = await emailService.sendEmailWithReport({
      to: prepared.toEmail,
      from: process.env.DEFAULT_FROM_EMAIL || "no-reply@curaemr.ai",
      subject: prepared.subject,
      html: prepared.html,
      text: prepared.text,
    });

    if (!success) {
      console.warn("[EMAIL] sendEmailWithReport failed for form share", {
        to: prepared.toEmail,
        formId: params.formId,
        error,
      });
    }

    return { sent: success, subject: prepared.subject, html: prepared.html, text: prepared.text, error };
  }

  private async loadClinicBranding(organizationId: number) {
    const [header] = await db
      .select()
      .from(clinicHeaders)
      .where(eq(clinicHeaders.organizationId, organizationId))
      .orderBy(desc(clinicHeaders.id))
      .limit(1);
    const [footer] = await db
      .select()
      .from(clinicFooters)
      .where(eq(clinicFooters.organizationId, organizationId))
      .orderBy(desc(clinicFooters.id))
      .limit(1);
    return { header, footer };
  }

  async previewShareEmail(input: ShareFormInput) {
    const overrideEmail = this.normalizeRecipientEmail(input.recipientEmail);
    const previewToken = uuidv4();
    const subdomain = await this.getOrganizationSubdomain(input.organizationId);
    const link = this.buildShareLink(subdomain, previewToken);

    const formStructure = await this.getFormStructure(input.formId, input.organizationId);
    if (overrideEmail) {
      const { subject, html, text } = this.buildShareEmailContentForRecipient(
        overrideEmail,
        link,
        formStructure?.title,
      );
      return { subject, html, text, link };
    }

    if (input.patientId == null) {
      throw new Error("A valid recipient email address is required");
    }

    const patient = await storage.getPatient(input.patientId, input.organizationId);
    if (!patient) {
      throw new Error(`Patient with ID ${input.patientId} not found in this organization`);
    }
    const toEmail = await this.resolveRecipientEmail(patient, input.organizationId);
    if (!toEmail) {
      throw new Error("Patient must have an email address or provide a custom recipient email");
    }
    const { subject, html, text } = await this.buildShareEmailContent(
      patient,
      link,
      toEmail,
      formStructure?.title,
    );
    return { subject, html, text, link };
  }
}

export const formService = new FormService();

