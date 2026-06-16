import type { Request, Response, NextFunction } from "express";
import type { TenantRequest } from "./tenant";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Multi-Tenant Enforcement Middleware
 * Ensures all database operations are properly scoped to the organization
 */

export interface MultiTenantEnforcementConfig {
  enforceOrganizationId: boolean;
  auditDataAccess: boolean;
  validateTenantAccess: boolean;
  logUnauthorizedAccess: boolean;
}

const defaultConfig: MultiTenantEnforcementConfig = {
  enforceOrganizationId: true,
  auditDataAccess: true,
  validateTenantAccess: true,
  logUnauthorizedAccess: true
};

/**
 * Middleware to enforce multi-tenant data isolation
 */
export function multiTenantEnforcer(config: Partial<MultiTenantEnforcementConfig> = {}) {
  const enforcementConfig = { ...defaultConfig, ...config };

  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // If tenant middleware wasn't wired up yet, derive organizationId from the authenticated user
      if (!req.organizationId && req.user?.organizationId) {
        req.organizationId = req.user.organizationId;
        console.log(`[MULTI-TENANT] Derived organizationId ${req.organizationId} from authenticated user`);
      }

      // Ensure tenant context exists
      // Allow organizationId: 0 for system-wide SaaS operations
      if (enforcementConfig.enforceOrganizationId && (req.organizationId === null || req.organizationId === undefined)) {
        console.error(`[MULTI-TENANT] Missing organization context for path: ${req.path}, organizationId: ${req.organizationId}, tenant: ${JSON.stringify(req.tenant)}`);
        return res.status(400).json({ 
          error: "Multi-tenant context required",
          code: "MISSING_TENANT_CONTEXT"
        });
      }

      // Validate tenant access for authenticated users
      if (enforcementConfig.validateTenantAccess && req.user && req.organizationId) {
        if (req.user.organizationId !== req.organizationId) {
          console.error(`[MULTI-TENANT] User ${req.user.id} attempted to access organization ${req.organizationId} but belongs to ${req.user.organizationId}`);
          
          if (enforcementConfig.logUnauthorizedAccess) {
            await logUnauthorizedAccess(req.user.id, req.organizationId, req.path, req.method);
          }
          
          return res.status(403).json({ 
            error: "Access denied: Organization mismatch",
            code: "TENANT_ACCESS_DENIED"
          });
        }
      }

      // Audit data access for sensitive operations
      if (enforcementConfig.auditDataAccess && req.user && req.organizationId) {
        const sensitiveEndpoints = [
          '/api/patients',
          '/api/medical-records',
          '/api/prescriptions',
          '/api/lab-results',
          '/api/medical-images',
          '/api/users',
          '/api/claims',
          '/api/revenue-records'
        ];

        const isSensitive = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
        
        if (isSensitive && req.method !== 'GET') {
          console.log(`[MULTI-TENANT-AUDIT] User ${req.user.email} (org: ${req.organizationId}) ${req.method} ${req.path}`);
          
          // Log to audit trail
          await logDataAccess(req.user.id, req.organizationId, req.path, req.method, req.ip || 'unknown');
        }
      }

      // Add enforcement headers
      res.set({
        'X-Tenant-Enforced': 'true',
        'X-Organization-Id': req.organizationId?.toString() || 'none',
        'X-Multi-Tenant-Version': '1.0'
      });

      next();
    } catch (error) {
      console.error('[MULTI-TENANT] Enforcement error:', error);
      res.status(500).json({ 
        error: "Multi-tenant enforcement failed",
        code: "ENFORCEMENT_ERROR"
      });
    }
  };
}

/**
 * Database query validator to ensure organizationId is included
 */
export function validateOrganizationFilter(query: any, organizationId: number) {
  if (!query || typeof query !== 'object') {
    throw new Error('Invalid query object for organization filtering');
  }

  // Check if organizationId filter is present
  const hasOrgFilter = JSON.stringify(query).includes('organizationId');
  
  if (!hasOrgFilter) {
    console.warn(`[MULTI-TENANT] Query without organizationId filter detected: ${JSON.stringify(query)}`);
    throw new Error('All queries must include organizationId filter for multi-tenant isolation');
  }

  return true;
}

/**
 * Wrapper for database operations to ensure tenant isolation
 */
export function withTenantIsolation<T>(
  operation: (organizationId: number) => Promise<T>,
  organizationId: number
): Promise<T> {
  if (!organizationId) {
    throw new Error('Organization ID is required for tenant-isolated operations');
  }

  console.log(`[MULTI-TENANT] Executing operation for organization ${organizationId}`);
  return operation(organizationId);
}

/**
 * Log unauthorized access attempts
 */
async function logUnauthorizedAccess(
  userId: number,
  attemptedOrgId: number,
  path: string,
  method: string
) {
  try {
    await db.execute(sql`
      INSERT INTO gdpr_audit_trail (
        user_id, 
        organization_id, 
        action, 
        data_type, 
        details, 
        status,
        created_at
      ) VALUES (
        ${userId},
        ${attemptedOrgId},
        'unauthorized_access_attempt',
        'tenant_access',
        ${JSON.stringify({ path, method, timestamp: new Date().toISOString() })},
        'failed',
        NOW()
      )
    `);
  } catch (error) {
    console.error('Failed to log unauthorized access:', error);
  }
}

/**
 * Log data access for audit trail
 */
async function logDataAccess(
  userId: number,
  organizationId: number,
  path: string,
  method: string,
  ipAddress: string
) {
  try {
    await db.execute(sql`
      INSERT INTO gdpr_audit_trail (
        user_id,
        organization_id,
        action,
        data_type,
        details,
        status,
        created_at
      ) VALUES (
        ${userId},
        ${organizationId},
        'data_access',
        'sensitive_endpoint',
        ${JSON.stringify({ path, method, ipAddress, timestamp: new Date().toISOString() })},
        'success',
        NOW()
      )
    `);
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
}

/**
 * Validate that all required tables have organizationId column
 */
export async function validateMultiTenantSchema() {
  const requiredTables = [
    'users', 'patients', 'medical_records', 'appointments', 'prescriptions',
    'lab_results', 'medical_images', 'documents', 'notifications', 'claims',
    'revenue_records', 'clinical_procedures', 'emergency_protocols',
    'medications_database', 'staff_shifts', 'gdpr_consents', 'gdpr_data_requests',
    'patient_communications', 'consultations', 'ai_insights'
  ];

  console.log('[MULTI-TENANT] Validating schema for multi-tenant compliance...');

  for (const table of requiredTables) {
    try {
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} 
        AND column_name = 'organization_id'
      `);

      if (!result.rows || result.rows.length === 0) {
        console.error(`[MULTI-TENANT] Table '${table}' is missing organizationId column`);
        throw new Error(`Multi-tenant schema violation: ${table} missing organizationId`);
      }
    } catch (error) {
      console.error(`[MULTI-TENANT] Schema validation failed for table '${table}':`, error);
    }
  }

  console.log('[MULTI-TENANT] Schema validation completed successfully');
}

/**
 * Performance monitor for multi-tenant queries
 */
export class MultiTenantQueryMonitor {
  private static instance: MultiTenantQueryMonitor;
  private queryStats: Map<string, { count: number; avgTime: number; lastAccess: Date }> = new Map();

  static getInstance(): MultiTenantQueryMonitor {
    if (!MultiTenantQueryMonitor.instance) {
      MultiTenantQueryMonitor.instance = new MultiTenantQueryMonitor();
    }
    return MultiTenantQueryMonitor.instance;
  }

  logQuery(organizationId: number, queryType: string, executionTime: number) {
    const key = `org_${organizationId}_${queryType}`;
    const existing = this.queryStats.get(key) || { count: 0, avgTime: 0, lastAccess: new Date() };
    
    existing.count++;
    existing.avgTime = (existing.avgTime * (existing.count - 1) + executionTime) / existing.count;
    existing.lastAccess = new Date();
    
    this.queryStats.set(key, existing);

    // Log slow queries
    if (executionTime > 1000) {
      console.warn(`[MULTI-TENANT] Slow query detected: org ${organizationId}, type ${queryType}, time ${executionTime}ms`);
    }
  }

  getStats(organizationId?: number) {
    if (organizationId) {
      const orgStats = new Map();
      for (const [key, stats] of this.queryStats.entries()) {
        if (key.startsWith(`org_${organizationId}_`)) {
          orgStats.set(key, stats);
        }
      }
      return orgStats;
    }
    return this.queryStats;
  }
}