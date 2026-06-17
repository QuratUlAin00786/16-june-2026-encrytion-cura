import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { pool } from "./db";
import {
  requireRole,
  type TenantRequest,
} from "./middleware/tenant";
import {
  backfillPatientSearchHashes,
  encryptExistingPlainPatients,
  getDuplicateStagingRows,
  getImportBatchSummary,
  getImportReportRows,
  getStagingPreview,
  countStagingRows,
  importValidatedBatch,
  rowsToCsv,
  updateStagingRow,
  uploadLegacyPatientSql,
  validateImportBatch,
  validateStagingRowById,
} from "./services/patient-import";
import {
  getUserPatientPairPreview,
  getUserPatientSqlTemplates,
  importUserPatientBatch,
  uploadUserPatientSqlPair,
  validateUserPatientBatch,
} from "./services/user-patient-import";
import {
  exportPatientsSql,
  exportUsersSql,
  resolveLegacyExportFormat,
} from "./services/legacy-data-export";

const ALLOWED_SQL_EXTENSIONS = [".sql", ".txt", ".dump", ".backup", ".bak"];

function isAllowedPatientImportFile(file: Express.Multer.File): boolean {
  const name = file.originalname.toLowerCase();
  if (ALLOWED_SQL_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return true;
  }
  const mime = (file.mimetype || "").toLowerCase();
  return (
    mime === "application/sql" ||
    mime === "text/plain" ||
    mime === "text/x-sql" ||
    mime === "application/octet-stream"
  );
}

const uploadSql = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedPatientImportFile(file)) {
      cb(null, true);
      return;
    }
    cb(
      new Error(
        "Unsupported file type. Upload a .sql patient script (INSERT or PostgreSQL COPY dump).",
      ),
    );
  },
});

function uploadSqlMiddleware(req: Request, res: Response, next: NextFunction) {
  uploadSql.single("file")(req, res, (error) => {
    if (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return res.status(400).json({ error: message });
    }
    next();
  });
}

const uploadPair = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedPatientImportFile(file)) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported file type for SQL upload"));
  },
});

function uploadPairMiddleware(req: Request, res: Response, next: NextFunction) {
  uploadPair.fields([
    { name: "usersFile", maxCount: 1 },
    { name: "patientsFile", maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return res.status(400).json({ error: message });
    }
    next();
  });
}

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

function resolveOrganizationId(req: TenantRequest): number {
  const orgId = req.tenant?.id ?? req.user?.organizationId;
  if (!orgId) {
    throw new Error("Organization context is required");
  }
  return orgId;
}

export function registerPatientImportRoutes(app: Express): void {
  app.get("/api/patient-import/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "patient-import" });
  });

  // Static paths MUST be registered before /:batchId/* or "export" is captured as batchId.
  app.get(
    "/api/patient-import/export/patients.sql",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const format = resolveLegacyExportFormat(req.query as Record<string, unknown>);
        const organizationId = resolveOrganizationId(req);
        const result = await exportPatientsSql(organizationId, format);
        res.setHeader("Content-Type", "application/sql; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.setHeader("X-Export-Record-Count", String(result.recordCount));
        res.setHeader("X-Export-Format", result.format);
        res.send(result.sql);
      } catch (error) {
        console.error("[LEGACY-EXPORT] patients failed:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to export patients",
        });
      }
    },
  );

  app.get(
    "/api/patient-import/export/users.sql",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const format = resolveLegacyExportFormat(req.query as Record<string, unknown>);
        const organizationId = resolveOrganizationId(req);
        const result = await exportUsersSql(organizationId, format);
        res.setHeader("Content-Type", "application/sql; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.setHeader("X-Export-Record-Count", String(result.recordCount));
        res.setHeader("X-Export-Format", result.format);
        res.send(result.sql);
      } catch (error) {
        console.error("[LEGACY-EXPORT] users failed:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to export users",
        });
      }
    },
  );

  app.get(
    "/api/patient-import/user-patient/templates",
    requireRole(["admin"]),
    (_req: TenantRequest, res) => {
      res.json(getUserPatientSqlTemplates());
    },
  );

  app.post(
    "/api/patient-import/upload",
    requireRole(["admin"]),
    uploadSqlMiddleware,
    async (req: TenantRequest, res) => {
      try {
        await ensurePatientImportSchema();
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "script.sql file is required" });
        }

        const content = file.buffer.toString("utf8");
        const result = await uploadLegacyPatientSql({
          organizationId: resolveOrganizationId(req),
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
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await validateImportBatch(
          resolveOrganizationId(req),
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
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await getImportBatchSummary(resolveOrganizationId(req), req.params.batchId);
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: "Failed to load summary" });
      }
    },
  );

  app.get(
    "/api/patient-import/:batchId/preview",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const limitRaw = String(req.query.limit ?? "").toLowerCase();
        let limit: number | undefined;
        if (limitRaw === "all" || limitRaw === "0") {
          limit = undefined;
        } else {
          const parsed = Number(req.query.limit);
          limit = Number.isFinite(parsed) && parsed > 0
            ? Math.min(parsed, 10000)
            : undefined;
        }
        const rows = await getStagingPreview(resolveOrganizationId(req), req.params.batchId, limit);
        const total = await countStagingRows(resolveOrganizationId(req), req.params.batchId);
        res.json({ rows, total, returned: rows.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to load preview" });
      }
    },
  );

  app.get(
    "/api/patient-import/:batchId/duplicates",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const rows = await getDuplicateStagingRows(resolveOrganizationId(req), req.params.batchId);
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: "Failed to load duplicate rows" });
      }
    },
  );

  app.patch(
    "/api/patient-import/:batchId/staging/:rowId",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const row = await updateStagingRow({
          organizationId: resolveOrganizationId(req),
          batchId: req.params.batchId,
          rowId: Number(req.params.rowId),
          updates: req.body ?? {},
        });
        res.json(row);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Failed to update staging row",
        });
      }
    },
  );

  app.post(
    "/api/patient-import/:batchId/staging/:rowId/validate",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const row = await validateStagingRowById({
          organizationId: resolveOrganizationId(req),
          batchId: req.params.batchId,
          rowId: Number(req.params.rowId),
        });
        res.json(row);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Failed to validate staging row",
        });
      }
    },
  );

  app.post(
    "/api/patient-import/:batchId/import",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const preValidate = req.body?.preValidate !== false;
        const summary = await importValidatedBatch({
          organizationId: resolveOrganizationId(req),
          batchId: req.params.batchId,
          userId: req.user!.id,
          preValidate,
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
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const result = await encryptExistingPlainPatients({
          organizationId: resolveOrganizationId(req),
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
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const updated = await backfillPatientSearchHashes(resolveOrganizationId(req));
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
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const type = req.params.type === "errors" ? "errors" : "validation";
        const rows = await getImportReportRows(resolveOrganizationId(req), req.params.batchId, type);
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

  app.post(
    "/api/patient-import/upload-user-patient-pair",
    requireRole(["admin"]),
    uploadPairMiddleware,
    async (req: TenantRequest, res) => {
      try {
        await ensurePatientImportSchema();
        const files = req.files as {
          usersFile?: Express.Multer.File[];
          patientsFile?: Express.Multer.File[];
        };
        const usersFile = files?.usersFile?.[0];
        const patientsFile = files?.patientsFile?.[0];
        if (!usersFile || !patientsFile) {
          return res.status(400).json({
            error: "Both usersFile and patientsFile (.sql) are required",
          });
        }

        const result = await uploadUserPatientSqlPair({
          organizationId: resolveOrganizationId(req),
          userId: req.user!.id,
          usersFileName: usersFile.originalname,
          patientsFileName: patientsFile.originalname,
          usersContent: usersFile.buffer.toString("utf8"),
          patientsContent: patientsFile.buffer.toString("utf8"),
        });

        res.status(201).json(result);
      } catch (error) {
        console.error("[USER-PATIENT-IMPORT] upload failed:", error);
        res.status(400).json({
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
  );

  app.post(
    "/api/patient-import/:batchId/validate-user-patient",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await validateUserPatientBatch(resolveOrganizationId(req), req.params.batchId);
        res.json(summary);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Validation failed",
        });
      }
    },
  );

  app.get(
    "/api/patient-import/:batchId/user-patient-preview",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const pairs = await getUserPatientPairPreview(resolveOrganizationId(req), req.params.batchId);
        res.json({ pairs, total: pairs.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to load preview" });
      }
    },
  );

  app.post(
    "/api/patient-import/:batchId/import-user-patient",
    requireRole(["admin"]),
    async (req: TenantRequest, res) => {
      try {
        const summary = await importUserPatientBatch({
          organizationId: resolveOrganizationId(req),
          batchId: req.params.batchId,
          userId: req.user!.id,
        });
        res.json(summary);
      } catch (error) {
        console.error("[USER-PATIENT-IMPORT] import failed:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Import failed",
        });
      }
    },
  );
}
