// db-config loads project .env from disk first (overrides shell DATABASE_URL / DB_USER)
import { formatDatabaseConfigLog, getDatabaseConfig } from "./db-config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { registerSaaSRoutes } from "./saas-routes";
import { ensurePatientImportSchema } from "./patient-import-routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed-data";
import { smsScheduler } from "./services/sms-scheduler";
import { startSubscriptionReminderScheduler } from "./services/subscription-reminders";
import { logEnvSmtpConfigStatus } from "./services/email";

/** Append to CSP connect-src for LiveKit validate + WebSocket (self-hosted IP, LiveKit Cloud, mk1). */
function getLiveKitCspConnectExtras(): string {
  const explicit = process.env.CSP_EXTRA_CONNECT_SRC?.trim();
  if (explicit) {
    return explicit.startsWith(" ") ? explicit : ` ${explicit}`;
  }
  const parts = new Set<string>([
    "wss://*.livekit.cloud",
    "https://*.livekit.cloud",
  ]);
  for (const key of [
    "APP_URL",
    "BASE_URL",
    "VITE_API_URL",
    "LIVEKIT_SERVER_URL",
    "VITE_LIVEKIT_SERVER_URL",
  ] as const) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      const normalized = raw.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
      const u = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
      if (u.hostname) {
        parts.add(`https://${u.hostname}`);
        parts.add(`http://${u.hostname}`);
        parts.add(`wss://${u.hostname}`);
        parts.add(`ws://${u.hostname}`);
        if (u.port) {
          parts.add(`https://${u.hostname}:${u.port}`);
          parts.add(`http://${u.hostname}:${u.port}`);
          parts.add(`wss://${u.hostname}:${u.port}`);
          parts.add(`ws://${u.hostname}:${u.port}`);
        }
      }
    } catch {
      /* ignore bad URL */
    }
  }
  return ` ${Array.from(parts).join(" ")}`;
}

console.log("🔐 ENVIRONMENT CHECK:");
console.log("  - FILE_SECRET exists:", !!process.env.FILE_SECRET);
console.log("  - NODE_ENV:", process.env.NODE_ENV);
console.log("  - DATABASE_URL exists:", !!process.env.DATABASE_URL);
try {
  console.log("  -", formatDatabaseConfigLog(getDatabaseConfig()));
} catch (e: any) {
  console.error("  - Database config error:", e?.message || e);
}

const app = express();
app.use(
  cors({
    origin: process.env.VITE_API_URL || "http://localhost:1100",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Tenant-Subdomain",
      "X-CSRF-Token",
    ],
    credentials: true,
  }),
);

// Content Security Policy for Stripe Connect support
// This allows Stripe Connect onboarding to work properly
app.use((req, res, next) => {
  // Only set CSP for HTML pages, not API routes
  if (!req.path.startsWith('/api/') && req.accepts('text/html')) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect-js.stripe.com https://*.stripe.com https://cdnjs.cloudflare.com",
        `connect-src 'self' https://api.stripe.com https://connect.stripe.com https://connect-js.stripe.com https://*.stripe.com https://*.hcaptcha.com https://c.increment.com https://c.stripe.dev https://c.stripe.global https://c.stripe.partners https://edge-api.stripe.com https://edge-billing.stripe.com https://edge-connect.stripe.com https://edge-dashboard.stripe.com https://edge-docs.stripe.com https://edge-marketplace.stripe.com https://edge-site-admin.stripe.com https://edge-support.stripe.com https://issuing-key.stripe.com https://t.stripe.com https://b.stripecdn.com https://billing.stripe.com https://dashboard.stripe.com https://dataconnectors-dashboard-upload-us-west-2-prod.s3.us-west-2.amazonaws.com https://docs.stripe.com https://edge-support-conversations.stripe.com https://edge.stripe.com https://errors.stripe.com https://files.stripe.com https://hcaptcha.com https://marketplace.stripe.com https://qr.stripe.com https://r.stripe.com https://sourcemaps.corp.stripe.com https://site-admin.stripe.com https://stripe.com https://support-conversations.stripe.com https://support.stripe.com https://access.stripe.com wss://stripe-cli-ws-nw.stripe.com wss://stripe-cli.stripe.com wss://stripecli-ws-nw.stripe.com wss://stripecli.stripe.com wss://*.glance.net:* wss://mk1.averox.com https://mk1.averox.com${getLiveKitCspConnectExtras()}`,
        "frame-src 'self' blob: https://js.stripe.com https://connect.stripe.com https://*.stripe.com",
        "frame-ancestors 'self' https://app.contentful.com",
        "img-src 'self' data: https: blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://*.stripe.com",
        "upgrade-insecure-requests"
      ].join('; ')
    );
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Font serving no longer needed - using Google Fonts direct

// Force deployment refresh  
console.log("🚀 FULL CASCADE DELETE - v20 - deleting ALL related data (notifications, prescriptions, appointments)");

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { dbReady } = await import("./db");
  await dbReady;

  const server = await registerRoutes(app);
  registerSaaSRoutes(app);
  void ensurePatientImportSchema().catch((error) => {
    console.error("[PATIENT-IMPORT] Startup schema check failed:", error);
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Don't re-throw the error to prevent process crashes
    console.error('[EXPRESS_ERROR_HANDLER]', err.message || err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isDev =
    process.env.NODE_ENV === "development" || app.get("env") === "development";
  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment (Replit deployment) or default to 5000 for local dev
  // In production, Replit provides the PORT environment variable
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log("🚀 Server is ready for health checks!");
    logEnvSmtpConfigStatus();
    
    // Start the SMS scheduler for automatic scheduled message sending
    smsScheduler.start();
    log("📱 SMS Scheduler started - checking for scheduled messages every 30 seconds");
    startSubscriptionReminderScheduler();
    log("⏰ Subscription reminder scheduler started (hourly)");
  });

  // Run database seeding in background AFTER server is listening.
  // IMPORTANT: default is OFF to avoid blocking/locking DB during normal app usage.
  // Enable explicitly with FORCE_SEED=true when you really need reseeding.
  if (process.env.FORCE_SEED === 'true') {
    console.log("🚀 BACKGROUND SEEDING: Starting database seeding process...");
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Run seeding in background without blocking the server
    setImmediate(async () => {
      try {
        // Step 0: Create missing tables that might not exist in the external database
        console.log("🔧 Step 0: Ensuring required tables exist...");
        const { pool, dbReady } = await import("./db");
        await dbReady;
        try {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_tax_rates (
              id SERIAL PRIMARY KEY,
              organization_id INTEGER NOT NULL,
              name VARCHAR(100) NOT NULL,
              code VARCHAR(20) NOT NULL,
              rate DECIMAL(5, 2) NOT NULL,
              description TEXT,
              is_default BOOLEAN DEFAULT false,
              is_active BOOLEAN DEFAULT true,
              applies_to VARCHAR(50) DEFAULT 'all',
              effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
              effective_to TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          console.log("✅ Step 0a: inventory_tax_rates table verified!");
        } catch (schemaError: any) {
          if (!schemaError.message?.includes('already exists')) {
            console.log("⚠️ inventory_tax_rates:", schemaError.message);
          }
        }
        
        // Add missing columns to inventory_sale_items if they don't exist
        try {
          await pool.query(`
            ALTER TABLE inventory_sale_items 
            ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
            ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS prescription_item_id INTEGER
          `);
          console.log("✅ Step 0b: inventory_sale_items columns verified!");
        } catch (alterError: any) {
          console.log("⚠️ inventory_sale_items alter:", alterError.message);
        }
        
        // Create organization_integrations table if it doesn't exist
        try {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS organization_integrations (
              id SERIAL PRIMARY KEY,
              organization_id INTEGER NOT NULL,
              integration_type VARCHAR(50) NOT NULL,
              is_enabled BOOLEAN DEFAULT false,
              is_configured BOOLEAN DEFAULT false,
              status VARCHAR(20) DEFAULT 'disconnected',
              last_tested_at TIMESTAMP,
              last_error TEXT,
              webhook_url TEXT,
              webhook_secret TEXT,
              settings JSONB DEFAULT '{}',
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          console.log("✅ Step 0c: organization_integrations table verified!");
        } catch (integrationsError: any) {
          console.log("⚠️ organization_integrations:", integrationsError.message);
        }
        
        console.log("✅ Step 0: Required database schema verified!");
        
        console.log("📊 Step 1: Running seedDatabase()...");
        await seedDatabase();
        console.log("✅ Step 1: seedDatabase() completed successfully!");
        
        console.log("📦 Step 2: Running inventory seeding...");
        const { seedAllOrganizations } = await import("./seed-inventory");
        await seedAllOrganizations();
        console.log("✅ Step 2: Inventory seeding completed successfully!");
        
        console.log("🏥 Step 3: Running production medical records seeding...");
        const { seedProductionMedicalRecords } = await import("./production-medical-records");
        await seedProductionMedicalRecords();
        console.log("✅ Step 3: Production medical records seeding completed successfully!");
        
        console.log("🔍 Step 4: Verifying medical records are accessible...");
        // Force verify that Patient 158 medical records exist
        const { verifyMedicalRecordsExist } = await import("./production-medical-records");
        await verifyMedicalRecordsExist();
        console.log("✅ Step 4: Medical records verification completed!");
        
        console.log("🎉 DATABASE SEEDING COMPLETED - ALL PATIENT DATA AVAILABLE!");
      } catch (error: any) {
        console.error("❌ SEEDING FAILED - This will cause problems:");
        console.error("Error details:", error);
        console.error("Stack trace:", error.stack);
        // Don't stop the app, but make the error very visible
        console.log("⚠️  App will continue but database may be empty");
      }
    });
  } else {
    console.log("🚀 SEEDING DISABLED: Skipping automatic database seeding for faster startup");
    console.log("💡 Set FORCE_SEED=true to run seeding manually at startup");
    
    if (process.env.DISABLE_PRODUCTION_DEMO_SETUP === "true") {
      console.log("⏭️ PRODUCTION DEMO: Skipped (DISABLE_PRODUCTION_DEMO_SETUP=true)");
    } else {
      // PRODUCTION DEMO USERS: Ensure demo credentials work when seeding is disabled
      console.log("🎯 PRODUCTION DEMO: Creating essential demo users for login screen...");
      setImmediate(async () => {
        try {
          const apiPort = process.env.PORT || 5000;
          const response = await fetch(`http://localhost:${apiPort}/api/production-demo-setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const result = await response.json();
          if (result.success) {
            console.log("✅ PRODUCTION DEMO: Demo users created successfully!");
            console.log(`📋 Created/Updated: ${result.createdUsers?.length || 0} users, Updated: ${result.updatedUsers?.length || 0} users`);
          } else {
            console.log("⚠️ PRODUCTION DEMO: Setup had issues:", result.message);
          }
        } catch (error) {
          console.error("❌ PRODUCTION DEMO: Failed to create demo users:", error);
          console.log("🔧 You can manually create demo users by calling: POST /api/production-demo-setup");
        }
      });
    }
  }
})();
