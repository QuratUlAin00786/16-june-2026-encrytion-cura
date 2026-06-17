import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authService, type AuthTokenPayload } from "../services/auth";

export interface TenantRequest extends Request {
  tenant?: {
    id: number;
    name: string;
    subdomain: string;
    region: string;
    brandName: string;
    settings: any;
  };
  organizationId?: number;
  user?: {
    id: number;
    email: string;
    role: string;
    organizationId: number;
  };
}

export async function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    // DEBUG: Log all incoming requests
    console.log(`[TENANT-MIDDLEWARE] 🔍 Request: ${req.method} ${req.path} | originalUrl: ${req.originalUrl} | url: ${req.url}`);
    
    // CRITICAL: Skip tenant middleware for SaaS admin routes - they use separate authentication
    // BUT: Regular user SaaS billing routes (/api/saas/billing/*) need organizationId, so don't skip them
    const originalUrl = req.originalUrl || req.url || '';
    
    if (req.path.startsWith('/saas/') && !req.path.startsWith('/api/saas/billing/')) {
      console.log(`[TENANT-MIDDLEWARE] ✅ Skipping SaaS admin route: ${req.path}`);
      return next();
    }
    
    // Also check originalUrl in case path is stripped
    if (originalUrl.startsWith('/saas/') && !originalUrl.startsWith('/api/saas/billing/')) {
      console.log(`[TENANT-MIDDLEWARE] ✅ Skipping SaaS admin route (from originalUrl): ${originalUrl}`);
      return next();
    }
    
    // Skip subscription checks for admin endpoints - they need to bypass subscription validation
    if (req.path.startsWith('/api/admin/')) {
      console.log(`[TENANT-MIDDLEWARE] ✅ Skipping subscription check for admin endpoint: ${req.path}`);
      return next();
    }
    
    // Skip subscription checks for login endpoints - they handle their own subscription validation
    // Universal login determines organization from user, regular login uses subdomain but handles subscription check
    // Check both /api/auth/... and /auth/... paths (depending on how Express mounts routes)
    const authPath = req.path;
    if (authPath === '/api/auth/universal-login' || authPath === '/auth/universal-login' ||
        authPath === '/api/auth/login' || authPath === '/auth/login' ||
        originalUrl.includes('/auth/universal-login') || originalUrl.includes('/auth/login') ||
        authPath.startsWith('/api/auth/forgot-password') || authPath.startsWith('/auth/forgot-password') ||
        authPath.startsWith('/api/auth/reset-password') || authPath.startsWith('/auth/reset-password')) {
      console.log(`[TENANT-MIDDLEWARE] ✅ Skipping subscription check for auth endpoint: path=${authPath}, originalUrl=${originalUrl}`);
      return next();
    }
    
    if (req.path.startsWith("/forms/share/")) {
      console.log(`[TENANT-MIDDLEWARE] Skipping tenant lookup for share endpoint: ${req.path}`);
      return next();
    }
    
    // Skip subscription checks for /tenant/info endpoint - it's called without auth and needed for app initialization
    if (req.path === "/tenant/info" || req.path.startsWith("/tenant/info")) {
      console.log(`[TENANT-MIDDLEWARE] Allowing /tenant/info endpoint without subscription checks: ${req.path}`);
      // Continue to set tenant context but skip subscription validation
    }
    
    // Skip tenant middleware for public organization check, create-trial, and check-subscription endpoints
    if (req.path.startsWith("/organizations/check-name") || 
        req.path.startsWith("/create-trial") ||
        req.path.startsWith("/check-subscription") ||
        req.path === "/patient-import/health") {
      console.log(`[TENANT-MIDDLEWARE] Skipping tenant lookup for public endpoint: ${req.path}`);
      return next();
    }
    
    console.log(`[TENANT-MIDDLEWARE] Processing request: ${req.method} ${req.path} ${req.url}`);
    
    // Skip tenant middleware for static assets and development files to prevent DB calls
    // NOTE: Do NOT skip `/public` here because `/api/public/:subdomain/...` booking endpoints
    // rely on tenant context (organizationId) being resolved by this middleware.
    const skipPaths = [
      '/assets', '/@vite', '/src', '/node_modules', '/__vite_hmr',
      '/favicon.ico', '/robots.txt', '/sitemap.xml', '/.vite'
    ];
    
    if (skipPaths.some(path => req.path.startsWith(path))) {
      console.log(`[TENANT-MIDDLEWARE] Skipping static path: ${req.path}`);
      return next();
    }

    
    // Path is already stripped by Express mounting at /api, so we process all paths
    console.log(`[TENANT-MIDDLEWARE] Processing API path: ${req.path} (original URL: ${req.originalUrl})`);

    // Extract subdomain from header/query/referrer (priority order)
    // DO NOT use hostname extraction in Replit environment as it extracts replit subdomain instead of tenant.
    let subdomain = req.get("X-Tenant-Subdomain") || req.query.subdomain as string || "";

    if (!subdomain) {
      const referer = req.get("referer") || req.get("origin");
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const pathParts = refererUrl.pathname.split("/").filter(Boolean);
          const reservedPaths = new Set([
            "api", "saas", "forms", "assets", "public",
            "client", "landing", "auth", "legal", "subscriptions",
            "subscription", "billing", "dashboard", "patients",
            "appointments", "prescriptions", "imaging", "messaging",
            "settings"
          ]);

          if (pathParts.length >= 2) {
            const candidate = pathParts[0];
            if (candidate && !reservedPaths.has(candidate.toLowerCase())) {
              subdomain = candidate;
              console.log(`[TENANT-MIDDLEWARE] Inferred subdomain from referer: ${subdomain}`);
            }
          }
        } catch (error) {
          console.log("[TENANT-MIDDLEWARE] Failed to parse referer for subdomain:", error);
        }
      }
    }

    if (!subdomain) {
      subdomain = "cura";
      console.log(`[TENANT-MIDDLEWARE] Defaulting subdomain to cura (no header/query/referrer)`);
    } else {
      console.log(`[TENANT-MIDDLEWARE] Detected subdomain: ${subdomain} from header/query/referrer`);
    }
    
    let organization = await storage.getOrganizationBySubdomain(subdomain);
    
    // FORCE fallback organization for all environments
    if (!organization) {
      try {
        const { organizations } = await import("@shared/schema");
        const { db } = await import("../db");
        const orgs = await db.select({
          id: organizations.id,
          name: organizations.name,
          subdomain: organizations.subdomain,
          email: organizations.email,
          region: organizations.region,
          brandName: organizations.brandName,
          settings: organizations.settings,
          features: organizations.features,
          accessLevel: organizations.accessLevel,
          subscriptionStatus: organizations.subscriptionStatus,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        }).from(organizations).limit(1);
        organization = orgs[0];
        
        console.log(`FORCE USING fallback organization: ${organization?.name}`);
      } catch (error) {
        console.log("Error fetching fallback organization:", error);
      }
    }
    
    // FORCE create demo org if none exists
    if (!organization) {
      organization = {
        id: 1,
        name: "Cura Healthcare",
        email: "admin@cura.global",
        subdomain: "cura",
        region: "UK",
        brandName: "Cura",
        settings: {},
        features: {
          maxUsers: 50,
          maxPatients: 500,
          aiEnabled: true,
          telemedicineEnabled: true,
          billingEnabled: true,
          analyticsEnabled: true
        },
        accessLevel: "full",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log("FORCE CREATED demo organization");
    }

    // Check subscription status (ensure organization exists)
    if (!organization) {
      return res.status(500).json({ error: "Failed to initialize organization" });
    }
    
    // Allow /tenant/info endpoint to pass through without subscription checks
    // This endpoint is called without authentication and is needed for app initialization
    // Login endpoints will handle blocking expired subscriptions
    const isTenantInfoEndpoint = 
      req.path === "/tenant/info" || 
      req.path.startsWith("/tenant/info") ||
      req.originalUrl?.includes("/tenant/info") ||
      req.url?.includes("/tenant/info");
    
    console.log(`[TENANT-MIDDLEWARE] Path check - path: ${req.path}, originalUrl: ${req.originalUrl}, url: ${req.url}, isTenantInfo: ${isTenantInfoEndpoint}`);
    
    if (!isTenantInfoEndpoint) {
      // Skip subscription check for admin endpoints
      const isAdminEndpoint = req.path.startsWith('/api/admin/');
      if (!isAdminEndpoint) {
        // Check subscription expiration - get from saas_subscriptions table
        const subscription = await storage.getOrganizationSubscription(organization.id);
        if (subscription) {
          // Check if subscription status is valid (case-insensitive)
          const normalizedStatus = subscription.status?.toLowerCase() || '';
          if (!["trial", "active"].includes(normalizedStatus)) {
            console.log(`[TENANT-MIDDLEWARE] ❌ Subscription inactive for org ${organization.id}, status: ${subscription.status} (normalized: ${normalizedStatus})`);
            return res.status(403).json({ error: "Subscription inactive" });
          }
        
          // Check if subscription has expired based on expiresAt
          // Only check expiration for authenticated requests (login endpoints handle unauthenticated)
          const hasAuthToken = req.get("Authorization")?.startsWith("Bearer ");
          
          if (hasAuthToken && subscription.expiresAt) {
          // Parse expiresAt - handle both Date objects and ISO strings
          let expiresAt: Date;
          if (subscription.expiresAt instanceof Date) {
            expiresAt = subscription.expiresAt;
          } else if (typeof subscription.expiresAt === 'string') {
            expiresAt = new Date(subscription.expiresAt);
          } else {
            expiresAt = new Date(subscription.expiresAt);
          }
          
          // Validate date parsing
          if (isNaN(expiresAt.getTime())) {
            console.log(`[TENANT-MIDDLEWARE] ⚠️ Invalid expiresAt date for org ${organization.id}: ${subscription.expiresAt}`);
            return res.status(403).json({ 
              error: `Invalid subscription expiration date. Please contact support.` 
            });
          }
          
          const now = new Date();
          
          // Compare timestamps directly for accurate comparison
          const expiresAtTimestamp = expiresAt.getTime();
          const nowTimestamp = now.getTime();
          
          console.log(`[TENANT-MIDDLEWARE] Comparing dates - Now: ${now.toISOString()} (${nowTimestamp}), ExpiresAt: ${expiresAt.toISOString()} (${expiresAtTimestamp})`);
          console.log(`[TENANT-MIDDLEWARE] Time difference (ms): ${nowTimestamp - expiresAtTimestamp}, Is expired: ${expiresAtTimestamp < nowTimestamp}`);
          
          // Compare current datetime with expires_at - if it's past, block access
          if (expiresAtTimestamp < nowTimestamp) {
            // Format expiration date/time for display
            const expirationDate = expiresAt.toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });
            
            console.log(`[TENANT-MIDDLEWARE] ❌ Subscription expired for org ${organization.id}, expiresAt: ${expiresAt.toISOString()}`);
            return res.status(403).json({ 
              error: `Your subscription has expired. Please renew. Subscription expired on: ${expirationDate}` 
            });
          }
        }
      }
      }
    } else {
      console.log(`[TENANT-MIDDLEWARE] ✅ Allowing /tenant/info endpoint without subscription checks`);
    }

    req.tenant = {
      id: organization.id,
      name: organization.name,
      subdomain: organization.subdomain,
      region: organization.region,
      brandName: organization.brandName || organization.name,
      settings: organization.settings || {}
    };
    req.organizationId = organization.id;

    console.log(`[TENANT-MIDDLEWARE] Set organizationId: ${req.organizationId} for path: ${req.path}`);
    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export function resolveOrganizationId(req: TenantRequest): number {
  if (req.user?.organizationId != null) {
    return Number(req.user.organizationId);
  }
  const orgId = req.tenant?.id;
  if (orgId == null || Number.isNaN(Number(orgId))) {
    throw new Error("Organization context required");
  }
  return Number(orgId);
}

export async function authMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    if (req.path.startsWith("/forms/share/")) {
      console.log(`[AUTH-MIDDLEWARE] Skipping auth for share endpoint: ${req.path}`);
      return next();
    }

    // Skip authentication for file view endpoints (handles their own token validation with FILE_SECRET)
    if (req.path.startsWith('/files/view/') || req.path.startsWith('files/view/') ||
        req.path.startsWith('/imaging-files/view/') || req.path.startsWith('imaging-files/view/') ||
        req.path.startsWith('/imaging/view-prescription/') || req.path.startsWith('imaging/view-prescription/')) {
      return next();
    }

    // Support both Authorization header and query parameter token (for iframe PDF viewing)
    const authHeader = req.get("Authorization");
    const originalUrl = req.originalUrl || req.url;
    console.log(`[AUTH-MIDDLEWARE] Path: ${req.path}, OriginalUrl: ${originalUrl}, Auth header: ${authHeader ? 'present' : 'missing'}`);
    if (authHeader) {
      console.log(`[AUTH-MIDDLEWARE] Auth header value: ${authHeader.substring(0, 20)}...`);
    }
    let token = authService.extractTokenFromHeader(authHeader);
    
    // If no header token, check query parameter (for iframe compatibility)
    if (!token && req.query.token) {
      token = req.query.token as string;
      console.log(`[AUTH-MIDDLEWARE] Using token from query parameter`);
    }
    
    if (!token) {
      console.error(`[AUTH-MIDDLEWARE] No token found for path: ${req.path}`);
      return res.status(401).json({ error: "Authentication required" });
    }
    
    console.log(`[AUTH-MIDDLEWARE] Token found, verifying...`);

    let payload: AuthTokenPayload | null = null;
    try {
      payload = authService.verifyToken(token);
    } catch (verifyError: any) {
      console.error(`[AUTH-MIDDLEWARE] Token verification threw exception:`, {
        message: verifyError?.message,
        name: verifyError?.name,
        path: req.path,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'missing',
        stack: verifyError?.stack,
      });
      
      // Provide more specific error messages
      let errorMessage = "Invalid token";
      if (verifyError?.name === 'TokenExpiredError') {
        errorMessage = "Token has expired. Please log in again.";
      } else if (verifyError?.name === 'JsonWebTokenError') {
        errorMessage = "Invalid token format or secret mismatch. Please log in again.";
      } else if (verifyError?.message) {
        errorMessage = verifyError.message;
      }
      
      return res.status(401).json({ 
        error: "Invalid token", 
        details: errorMessage,
        code: verifyError?.name || 'TOKEN_ERROR'
      });
    }
    if (!payload) {
      console.error(`[AUTH-MIDDLEWARE] Token verification returned null payload for path: ${req.path}`, {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? `${token.substring(0, 30)}...` : 'missing',
        jwtSecretConfigured: !!process.env.JWT_SECRET,
      });
      return res.status(401).json({ 
        error: "Invalid token",
        details: "Token verification failed. This may be due to: 1) Token expired, 2) Invalid token format, 3) JWT_SECRET mismatch. Please log in again.",
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }

    // If tenant header resolved a different org than the JWT (common on IP-based production URLs),
    // trust the authenticated user's organization from the token.
    if (req.tenant && payload.organizationId !== req.tenant.id) {
      console.warn(`[AUTH-MIDDLEWARE] Tenant/JWT org mismatch — using JWT org ${payload.organizationId}`, {
        tenantOrgId: req.tenant.id,
        tenantSubdomain: req.tenant.subdomain,
        headerSubdomain: req.get("X-Tenant-Subdomain"),
        path: req.path,
      });
      try {
        const org = await storage.getOrganization(Number(payload.organizationId));
        if (org) {
          req.tenant = {
            id: org.id,
            name: org.name,
            subdomain: org.subdomain,
            region: org.region,
            brandName: org.brandName || org.name,
            settings: org.settings || {},
          };
          req.organizationId = org.id;
        } else {
          return res.status(403).json({
            error: "Access denied for this organization",
            details: "Your organization could not be verified. Please log in again.",
          });
        }
      } catch (syncError) {
        console.error("[AUTH-MIDDLEWARE] Failed to sync tenant from JWT:", syncError);
        return res.status(403).json({
          error: "Access denied for this organization",
          details: `Your account belongs to organization ${payload.organizationId}, but the request targeted organization ${req.tenant.id}.`,
        });
      }
    }

    // Get user details (coerce to number - JWT decode can return strings in some runtimes)
    const userId = Number(payload.userId);
    const orgId = Number(payload.organizationId);
    if (Number.isNaN(userId) || Number.isNaN(orgId)) {
      console.error(`[AUTH-MIDDLEWARE] Invalid token payload: userId=${payload.userId}, organizationId=${payload.organizationId}`);
      return res.status(401).json({ error: "Invalid token" });
    }
    try {
      const user = await storage.getUser(userId, orgId);
      if (!user || !user.isActive) {
        console.error(`[AUTH-MIDDLEWARE] User not found or inactive: userId=${userId}, orgId=${orgId}`);
        return res.status(401).json({ error: "User not found or inactive" });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      };

      console.log(`[AUTH-MIDDLEWARE] User authenticated: id=${user.id}, role=${user.role}, email=${user.email}`);
      next();
    } catch (dbError: any) {
      console.error(`[AUTH-MIDDLEWARE] Database error getting user:`, dbError);
      console.error(`[AUTH-MIDDLEWARE] Database error stack:`, dbError?.stack);
      // Don't send response if already sent
      if (!res.headersSent) {
        // Return 401 for authentication errors, not 500
        return res.status(401).json({ error: "Authentication required", details: dbError?.message ?? "Failed to verify user" });
      }
    }
  } catch (error: any) {
    console.error("[AUTH-MIDDLEWARE] Auth middleware error:", error);
    console.error("[AUTH-MIDDLEWARE] Error stack:", error?.stack);
    console.error("[AUTH-MIDDLEWARE] Error message:", error?.message);
    // Don't send response if already sent
    if (!res.headersSent) {
      // Return 401 for authentication errors, not 500
      // Only return 500 for unexpected errors that aren't authentication-related
      if (error?.message?.includes('token') || error?.message?.includes('jwt') || error?.message?.includes('authentication')) {
        res.status(401).json({ error: "Authentication required", details: error?.message });
      } else {
        res.status(500).json({ error: "Internal server error", details: error?.message });
      }
    }
  }
}

export function requireRole(roles: string | string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    console.log('[REQUIRE-ROLE] Checking permissions:', {
      hasUser: !!req.user,
      userRole: req.user?.role,
      userEmail: req.user?.email,
      requiredRoles,
      hasPermission: req.user ? authService.hasPermission(req.user.role, requiredRoles) : false
    });

    if (!req.user) {
      console.log('[REQUIRE-ROLE] ❌ No user found - returning 401');
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!authService.hasPermission(req.user.role, requiredRoles)) {
      console.log('[REQUIRE-ROLE] ❌ Permission denied - User role:', req.user.role, 'Required roles:', requiredRoles);
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    console.log('[REQUIRE-ROLE] ✅ User is authorized (role:', req.user.role, ')');
    next();
  };
}

export function requireNonPatientRole() {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    console.log('[REQUIRE-NON-PATIENT] Checking permissions:', {
      hasUser: !!req.user,
      userRole: req.user?.role,
      userEmail: req.user?.email,
      isPatient: req.user?.role === "patient"
    });

    if (!req.user) {
      console.log('[REQUIRE-NON-PATIENT] ❌ No user found - returning 401');
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role === "patient") {
      console.log('[REQUIRE-NON-PATIENT] ❌ User is patient - returning 403');
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    console.log('[REQUIRE-NON-PATIENT] ✅ User is authorized (role:', req.user.role, ')');
    next();
  };
}

export function gdprComplianceMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  if (!req.tenant) {
    return next();
  }

  const compliance = authService.checkGDPRCompliance(req.tenant.region);
  
  // Add GDPR headers
  if (compliance.gdprRequired) {
    res.set({
      "X-GDPR-Compliant": "true",
      "X-Data-Retention": compliance.retentionPeriod.toString(),
      "X-Data-Residency": compliance.dataResidencyRules.join(",")
    });
  }

  // Log data access for audit trail
  if (req.method !== "GET" && req.user) {
    console.log(`[AUDIT] ${req.user.email} ${req.method} ${req.path} - Tenant: ${req.tenant.subdomain}`);
  }

  next();
}

function extractSubdomainFromHost(host: string | undefined): string | null {
  if (!host) return null;
  
  const parts = host.split(".");
  if (parts.length > 2) {
    return parts[0];
  }
  
  return null;
}

export type ModulePermissionAction = 'view' | 'create' | 'edit' | 'delete';

export function requireModulePermission(moduleName: string, action: ModulePermissionAction) {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    console.log(`[REQUIRE-MODULE-PERMISSION] Checking ${action} permission for module ${moduleName}:`, {
      hasUser: !!req.user,
      userRole: req.user?.role,
      userEmail: req.user?.email
    });

    if (!req.user) {
      console.log('[REQUIRE-MODULE-PERMISSION] ❌ No user found - returning 401');
      return res.status(401).json({ error: "Authentication required" });
    }

    // Admin role has ALL permissions to ALL modules
    if (req.user.role === 'admin') {
      console.log('[REQUIRE-MODULE-PERMISSION] ✅ Admin user - full access granted');
      return next();
    }

    try {
      // Fetch role permissions from database
      const role = await storage.getRoleByName(req.user.role, req.user.organizationId);
      
      if (!role) {
        console.log(`[REQUIRE-MODULE-PERMISSION] ❌ Role ${req.user.role} not found`);
        return res.status(403).json({ error: "Role not found" });
      }

      const permissions = role.permissions as any;
      const modulePerms = permissions?.modules?.[moduleName];

      if (!modulePerms) {
        console.log(`[REQUIRE-MODULE-PERMISSION] ❌ No permissions defined for module ${moduleName}`);
        return res.status(403).json({ error: `No access to ${moduleName} module` });
      }

      const hasPermission = modulePerms[action] === true;

      if (!hasPermission) {
        console.log(`[REQUIRE-MODULE-PERMISSION] ❌ User lacks ${action} permission for ${moduleName}`);
        return res.status(403).json({ 
          error: `You do not have ${action} permission for ${moduleName}`,
          requiredPermission: { module: moduleName, action }
        });
      }

      console.log(`[REQUIRE-MODULE-PERMISSION] ✅ User has ${action} permission for ${moduleName}`);
      next();
    } catch (error) {
      console.error('[REQUIRE-MODULE-PERMISSION] Error checking permissions:', error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  };
}
