import type { Express, Request, Response } from "express";
import multer from "multer";
import { pool } from "./db";
import {
  authMiddleware,
  requireRole,
  type TenantRequest,
} from "./middleware/tenant";
import {
  backfillPatientSearchHashes,
  encryptExistingPlainPatients,
  getImportBatchSummary,
  getImportReportRows,
  getStagingPreview,
  importValidatedBatch,
  rowsToCsv,
  uploadLegacyPatientSql,
  validateImportBatch,
} from "./services/patient-import";

const uploadSql = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".sql")) {
      cb(new Error("Only .sql files are allowed"));
      return;
    }
    cb(null, true);
  },
});

let schemaReady: Promise<void> | null = null;

export async function ensurePatientImportSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        ALTER TABLE patients
          ADD COLUMN IF NOT EXISTS cnic_hash text,
          ADD COLUMN IF NOT EXISTS phone_hash text,
          ADD COLUMN IF NOT EXISTS email_hash text;
      `);
      await pool.query(`
        ALTER TABLE patients
          ADD COLUMN IF NOT EXISTS is_encrypted boolean NOT NULL DEFAULT true;
      `).catch(() => {
        /* column may already exist with NOT NULL */
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS patient_import_staging (
          id serial PRIMARY KEY,
          organization_id integer NOT NULL,
          import_batch_id text NOT NULL,
          full_name text,
          cnic text,
          phone text,
          email text,
          date_of_birth text,
          gender text,
          address text,
          import_status varchar(20) NOT NULL DEFAULT 'Pending',
          validation_status varchar(20) NOT NULL DEFAULT 'Pending',
          error_message text,
          duplicate_reason text,
          imported_patient_id integer,
          created_at timestamp NOT NULL DEFAULT now(),
          imported_at timestamp
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS patient_import_audit (
          id serial PRIMARY KEY,
          organization_id integer NOT NULL,
          user_id integer,
          action varchar(50) NOT NULL,
          file_name text,
          import_batch_id text,
          total_records integer DEFAULT 0,
          valid_records integer DEFAULT 0,
          invalid_records integer DEFAULT 0,
          duplicate_records integer DEFAULT 0,
          imported_records integer DEFAULT 0,
          failed_records integer DEFAULT 0,
          existing_records integer DEFAULT 0,
          details jsonb DEFAULT '{}',
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);
      console.log("[PATIENT-IMPORT] Schema verified");
    })().catch((error) => {
      schemaReady = null;
      console.error("[PATIENT-IMPORT] Schema setup failed:", error);
      throw error;
    });
  }
  return schemaReady;
}

export function registerPatientImportRoutes(app: Express): void {
  app.get("/api/patient-import/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "patient-import" });
  });

  app.post(
    "/api/patient-import/upload",
    authMiddleware,
    requireRole(["admin"]),
    uploadSql.single("file"),
    async (req: TenantRequest, res) => {
      try {
        await ensurePatientImportSchema();
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "script.sql file is required" });
        }

        const content = file.buffer.toString("utf8");
        const result = await uploadLegacyPatientSql({
          organizationId: req.tenant!.id,
          userId: req.user!.id,
          fileName: file.originalname,
          content,
        });

        res.status(201).json(result);
      } catch (error) {
        console.error("[PATIENT-IMPORT] upload failed:", error);
        res.status(400).json({
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
  );

  app.post(
    "/api/patient-import/:batchId/validate",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await validateImportBatch(
          req.tenant!.id,
          req.params.batchId,
          req.user!.id,
        );
        res.json(summary);
      } catch (error) {
        console.error("[PATIENT-IMPORT] validate failed:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Validation failed",
        });
      }
    },
  );

  app.get(
    "/api/patient-import/:batchId/summary",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await getImportBatchSummary(req.tenant!.id, req.params.batchId);
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: "Failed to load summary" });
      }
    },
  );

  app.get(
    "/api/patient-import/:batchId/preview",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const rows = await getStagingPreview(req.tenant!.id, req.params.batchId, limit);
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: "Failed to load preview" });
      }
    },
  );

  app.post(
    "/api/patient-import/:batchId/import",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await importValidatedBatch({
          organizationId: req.tenant!.id,
          batchId: req.params.batchId,
          userId: req.user!.id,
        });
        res.json(summary);
      } catch (error) {
        console.error("[PATIENT-IMPORT] import failed:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Import failed",
        });
      }
    },
  );

  app.post(
    "/api/patient-import/encrypt-existing",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const result = await encryptExistingPlainPatients({
          organizationId: req.tenant!.id,
          userId: req.user!.id,
        });
        res.json(result);
      } catch (error) {
        console.error("[PATIENT-IMPORT] encrypt-existing failed:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Encryption failed",
        });
      }
    },
  );

  app.post(
    "/api/patient-import/backfill-hashes",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const updated = await backfillPatientSearchHashes(req.tenant!.id);
        res.json({ updated });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Backfill failed",
        });
      }
    },
  );

  app.get(
    "/api/patient-import/:batchId/report/:type",
    authMiddleware,
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const type = req.params.type === "errors" ? "errors" : "validation";
        const rows = await getImportReportRows(req.tenant!.id, req.params.batchId, type);
        const columns = [
          "id",
          "fullName",
          "cnic",
          "phone",
          "email",
          "validationStatus",
          "importStatus",
          "errorMessage",
          "duplicateReason",
          "importedPatientId",
        ];
        const csv = rowsToCsv(rows as Array<Record<string, unknown>>, columns);
        const filename =
          type === "errors" ? "patient-import-errors.csv" : "patient-import-validation.csv";
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csv);
      } catch (error) {
        res.status(500).json({ error: "Failed to generate report" });
      }
    },
  );
}
