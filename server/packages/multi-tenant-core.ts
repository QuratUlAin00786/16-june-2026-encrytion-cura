/**
 * Multi-Tenant Core Package
 * Comprehensive multi-tenancy enforcement across the entire Cura EMR system
 */

import type { Express, Request, Response, NextFunction } from "express";
import { tenantMiddleware, authMiddleware, type TenantRequest } from "../middleware/tenant";
import { multiTenantEnforcer } from "../middleware/multi-tenant-enforcer";
import { createTenantValidator } from "../utils/tenant-validator";
import { createTenantAwareStorage, MultiTenantStorageWrapper } from "../utils/storage-wrapper";
import type { IStorage } from "../storage";

export interface MultiTenantPackageConfig {
  enforceStrictTenantIsolation: boolean;
  auditAllDataAccess: boolean;
  validateCrossTenantOperations: boolean;
  logUnauthorizedAccess: boolean;
  enablePerformanceMonitoring: boolean;
}

export class MultiTenantCorePackage {
  private config: MultiTenantPackageConfig;
  private tenantStorage: MultiTenantStorageWrapper;

  constructor(
    private storage: IStorage,
    config: Partial<MultiTenantPackageConfig> = {}
  ) {
    this.config = {
      enforceStrictTenantIsolation: true,
      auditAllDataAccess: true,
      validateCrossTenantOperations: true,
      logUnauthorizedAccess: true,
      enablePerformanceMonitoring: true,
      ...config
    };

    this.tenantStorage = createTenantAwareStorage(storage);
    console.log('[MULTI-TENANT-CORE] Package initialized with config:', this.config);
  }

  /**
   * Initialize multi-tenant middleware stack for Express app
   */
  initializeMiddleware(app: Express): void {
    console.log('[MULTI-TENANT-CORE] Initializing middleware stack...');

    // Custom middleware to exclude SaaS routes and public routes from multi-tenant enforcement
    const excludeSaaSRoutes = (middleware: any) => {
      return (req: any, res: any, next: any) => {
        // Skip SaaS routes entirely - they operate system-wide
        // Skip public routes for trial creation and organization name checking
        // Note: req.path is already stripped of /api prefix by app.use("/api", ...)
      console.log(`[EXCLUDE-SAAS-CHECK] Path: ${req.path}, Original URL: ${req.originalUrl}`);
      if (req.path.startsWith('/saas/') || 
          req.path.startsWith('/forms/share/') ||
          req.path.startsWith('/organizations/check-name') ||
          req.path.startsWith('/create-trial') ||
          req.path === '/auth/universal-login' || req.path === '/auth/login' ||
          req.path.startsWith('/auth/forgot-password') || req.path.startsWith('/auth/reset-password')) {
        console.log(`[EXCLUDE-SAAS] ✅ Skipping middleware for exempt route: ${req.path}`);
        return next();
      }
        console.log(`[EXCLUDE-SAAS] ❌ NOT skipping - executing middleware for: ${req.path}`);
        return middleware(req, res, next);
      };
    };

    // 1. Tenant identification and organization loading (excluding SaaS routes)
    app.use("/api", excludeSaaSRoutes(tenantMiddleware as any));

    // 2. Multi-tenant enforcement with comprehensive validation (excluding SaaS routes)
    app.use("/api", excludeSaaSRoutes(multiTenantEnforcer({
      enforceOrganizationId: this.config.enforceStrictTenantIsolation,
      auditDataAccess: this.config.auditAllDataAccess,
      validateTenantAccess: this.config.validateCrossTenantOperations,
      logUnauthorizedAccess: this.config.logUnauthorizedAccess
    }) as any));

    console.log('[MULTI-TENANT-CORE] Middleware stack initialized successfully');
  }

  /**
   * Get tenant-aware storage instance
   */
  getTenantStorage(): MultiTenantStorageWrapper {
    return this.tenantStorage;
  }

  /**
   * Create tenant validator for specific resource types
   */
  createResourceValidator(resourceExtractor?: (req: any) => Array<{ type: any; id: number }>) {
    return createTenantValidator(resourceExtractor);
  }

  /**
   * Validate tenant access for API endpoints
   */
  validateTenantAccess() {
    return async (req: TenantRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.organizationId) {
          return res.status(400).json({
            error: "Organization context required",
            code: "MISSING_TENANT_CONTEXT"
          });
        }

        if (!req.user) {
          return res.status(401).json({
            error: "Authentication required",
            code: "AUTH_REQUIRED"
          });
        }

        // Validate user belongs to organization
        if (req.user.organizationId !== req.organizationId) {
          console.error(`[MULTI-TENANT-CORE] User ${req.user.id} attempted to access organization ${req.organizationId} but belongs to ${req.user.organizationId}`);
          
          return res.status(403).json({
            error: "Organization access denied",
            code: "TENANT_ACCESS_DENIED"
          });
        }

        next();
      } catch (error) {
        console.error('[MULTI-TENANT-CORE] Tenant validation error:', error);
        res.status(500).json({
          error: "Tenant validation failed",
          code: "TENANT_VALIDATION_ERROR"
        });
      }
    };
  }

  /**
   * Create organization-scoped route handler
   */
  createTenantScopedRoute<T = any>(
    handler: (req: TenantRequest, res: Response, organizationId: number, tenantStorage: MultiTenantStorageWrapper) => Promise<T>
  ) {
    return async (req: TenantRequest, res: Response) => {
      try {
        if (!req.organizationId) {
          return res.status(400).json({
            error: "Organization context required",
            code: "MISSING_TENANT_CONTEXT"
          });
        }

        const result = await handler(req, res, req.organizationId, this.tenantStorage);
        return result;
      } catch (error) {
        console.error('[MULTI-TENANT-CORE] Route handler error:', error);
        
        if (error instanceof Error && error.message.includes('Tenant validation failed')) {
          return res.status(403).json({
            error: error.message,
            code: "TENANT_VALIDATION_FAILED"
          });
        }

        return res.status(500).json({
          error: "Internal server error",
          code: "INTERNAL_ERROR"
        });
      }
    };
  }

  /**
   * Get tenant-specific configuration
   */
  getTenantConfig(organizationId: number) {
    return {
      organizationId,
      enforceStrictIsolation: this.config.enforceStrictTenantIsolation,
      auditEnabled: this.config.auditAllDataAccess,
      validationEnabled: this.config.validateCrossTenantOperations
    };
  }

  /**
   * Audit tenant operation
   */
  async auditTenantOperation(
    organizationId: number,
    userId: number,
    operation: string,
    resourceType: string,
    resourceId?: number,
    details?: any
  ) {
    if (!this.config.auditAllDataAccess) {
      return;
    }

    try {
      console.log(`[MULTI-TENANT-AUDIT] Org ${organizationId}, User ${userId}, Operation: ${operation}, Resource: ${resourceType}:${resourceId || 'N/A'}`);
      
      // Log to audit trail if available
      // This would typically write to gdpr_audit_trail table
      await this.storage.createGdprAuditTrail({
        organizationId,
        userId,
        action: operation,
        dataType: resourceType,
        details: JSON.stringify({
          resourceId,
          operation,
          timestamp: new Date().toISOString(),
          ...details
        }),
        status: 'success'
      });
    } catch (error) {
      console.error('[MULTI-TENANT-AUDIT] Failed to audit operation:', error);
    }
  }
}

/**
 * Global multi-tenant package instance
 */
let multiTenantPackage: MultiTenantCorePackage | null = null;

/**
 * Initialize the multi-tenant package
 */
export function initializeMultiTenantPackage(
  storage: IStorage,
  config?: Partial<MultiTenantPackageConfig>
): MultiTenantCorePackage {
  if (!multiTenantPackage) {
    multiTenantPackage = new MultiTenantCorePackage(storage, config);
    console.log('[MULTI-TENANT-CORE] Global package instance created');
  }
  return multiTenantPackage;
}

/**
 * Get the initialized multi-tenant package
 */
export function getMultiTenantPackage(): MultiTenantCorePackage {
  if (!multiTenantPackage) {
    throw new Error('Multi-tenant package not initialized. Call initializeMultiTenantPackage first.');
  }
  return multiTenantPackage;
}

/**
 * Multi-tenant route decorator
 */
export function tenantRoute(resourceValidator?: (req: any) => Array<{ type: any; id: number }>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: TenantRequest, res: Response, ...args: any[]) {
      try {
        const mtPackage = getMultiTenantPackage();
        
        // Validate tenant access
        if (!req.organizationId || !req.user) {
          return res.status(401).json({
            error: "Tenant authentication required",
            code: "TENANT_AUTH_REQUIRED"
          });
        }

        // Validate resource access if specified
        if (resourceValidator) {
          const resources = resourceValidator(req);
          // Additional validation logic here
        }

        // Execute original method with tenant context
        return await method.call(this, req, res, ...args);
      } catch (error) {
        console.error(`[MULTI-TENANT-ROUTE] Error in ${propertyName}:`, error);
        return res.status(500).json({
          error: "Multi-tenant route error",
          code: "TENANT_ROUTE_ERROR"
        });
      }
    };
    
    return descriptor;
  };
}

/**
 * Tenant-aware database query builder
 */
export class TenantQueryBuilder {
  constructor(private organizationId: number) {}

  /**
   * Build where clause with organization filter
   */
  withOrganizationFilter(additionalConditions?: any) {
    const orgFilter = { organizationId: this.organizationId };
    return additionalConditions 
      ? { ...orgFilter, ...additionalConditions }
      : orgFilter;
  }

  /**
   * Build insert data with organization ID
   */
  withOrganizationData<T extends Record<string, any>>(data: T): T & { organizationId: number } {
    return {
      ...data,
      organizationId: this.organizationId
    };
  }

  /**
   * Validate organization ownership of resource
   */
  async validateOwnership(resourceType: string, resourceId: number, storage: IStorage): Promise<boolean> {
    try {
      // This would need to be implemented based on specific resource types
      console.log(`[TENANT-QUERY] Validating ownership: ${resourceType}:${resourceId} for org ${this.organizationId}`);
      return true; // Placeholder
    } catch (error) {
      console.error('[TENANT-QUERY] Ownership validation error:', error);
      return false;
    }
  }
}

/**
 * Create tenant query builder
 */
export function createTenantQueryBuilder(organizationId: number): TenantQueryBuilder {
  return new TenantQueryBuilder(organizationId);
}

export default MultiTenantCorePackage;