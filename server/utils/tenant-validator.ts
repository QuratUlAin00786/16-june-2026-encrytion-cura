import { eq, and } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

/**
 * Tenant Validation Utilities
 * Ensures all database operations are properly scoped to the organization
 */

export interface TenantValidationResult {
  isValid: boolean;
  organizationId: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate that a resource belongs to the specified organization
 */
export async function validateResourceOwnership(
  resourceType: keyof typeof schema,
  resourceId: number,
  organizationId: number
): Promise<TenantValidationResult> {
  try {
    const table = (schema as any)[resourceType];
    if (!table) {
      return {
        isValid: false,
        organizationId,
        errors: [`Unknown resource type: ${resourceType}`]
      };
    }

    const result = await db
      .select({ organizationId: table.organizationId })
      .from(table)
      .where(eq(table.id, resourceId))
      .limit(1);

    if (result.length === 0) {
      return {
        isValid: false,
        organizationId,
        errors: [`Resource ${resourceType}:${resourceId} not found`]
      };
    }

    if (result[0].organizationId !== organizationId) {
      return {
        isValid: false,
        organizationId,
        errors: [`Resource ${resourceType}:${resourceId} belongs to organization ${result[0].organizationId}, not ${organizationId}`]
      };
    }

    return {
      isValid: true,
      organizationId
    };
  } catch (error) {
    console.error('Resource ownership validation error:', error);
    return {
      isValid: false,
      organizationId,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate tenant access for multiple resources at once
 */
export async function validateBulkResourceOwnership(
  resources: Array<{ type: keyof typeof schema; id: number }>,
  organizationId: number
): Promise<TenantValidationResult> {
  const results = await Promise.all(
    resources.map(resource => 
      validateResourceOwnership(resource.type, resource.id, organizationId)
    )
  );

  const errors: string[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    if (!result.isValid) {
      errors.push(...(result.errors || []));
    }
    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  });

  return {
    isValid: errors.length === 0,
    organizationId,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Ensure patient belongs to organization before medical operations
 */
export async function validatePatientAccess(
  patientId: number,
  organizationId: number
): Promise<TenantValidationResult> {
  return validateResourceOwnership('patients', patientId, organizationId);
}

/**
 * Ensure user belongs to organization
 */
export async function validateUserAccess(
  userId: number,
  organizationId: number
): Promise<TenantValidationResult> {
  return validateResourceOwnership('users', userId, organizationId);
}

/**
 * Validate cross-tenant relationships (e.g., appointment with patient and provider)
 */
export async function validateCrossTenantRelationship(
  relationships: Array<{
    resourceType: keyof typeof schema;
    resourceId: number;
  }>,
  organizationId: number
): Promise<TenantValidationResult> {
  const validationResults = await Promise.all(
    relationships.map(rel => 
      validateResourceOwnership(rel.resourceType, rel.resourceId, organizationId)
    )
  );

  const errors: string[] = [];
  validationResults.forEach((result, index) => {
    if (!result.isValid) {
      errors.push(`${relationships[index].resourceType}:${relationships[index].resourceId} - ${result.errors?.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    organizationId,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Auto-inject organizationId into insert operations
 */
export function withOrganizationId<T extends Record<string, any>>(
  data: T,
  organizationId: number
): T & { organizationId: number } {
  return {
    ...data,
    organizationId
  };
}

/**
 * Auto-inject organizationId filter into where clauses
 */
export function withOrganizationFilter(organizationId: number) {
  return (table: any) => eq(table.organizationId, organizationId);
}

/**
 * Combined filter for ID and organization
 */
export function withIdAndOrganizationFilter(id: number, organizationId: number) {
  return (table: any) => and(
    eq(table.id, id),
    eq(table.organizationId, organizationId)
  );
}

/**
 * Validate organization exists and is active
 */
export async function validateOrganization(organizationId: number): Promise<TenantValidationResult> {
  try {
    const organization = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, organizationId))
      .limit(1);

    if (organization.length === 0) {
      return {
        isValid: false,
        organizationId,
        errors: [`Organization ${organizationId} not found`]
      };
    }

    const org = organization[0];
    const warnings: string[] = [];

    if (org.subscriptionStatus === 'suspended') {
      warnings.push('Organization subscription is suspended');
    } else if (org.subscriptionStatus === 'cancelled') {
      return {
        isValid: false,
        organizationId,
        errors: ['Organization subscription is cancelled']
      };
    }

    return {
      isValid: true,
      organizationId,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    console.error('Organization validation error:', error);
    return {
      isValid: false,
      organizationId,
      errors: [`Organization validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Comprehensive tenant validation for API endpoints
 */
export async function validateApiAccess(
  userId: number,
  organizationId: number,
  resourceAccess?: Array<{ type: keyof typeof schema; id: number }>
): Promise<TenantValidationResult> {
  // Validate organization
  const orgValidation = await validateOrganization(organizationId);
  if (!orgValidation.isValid) {
    return orgValidation;
  }

  // Validate user belongs to organization
  const userValidation = await validateUserAccess(userId, organizationId);
  if (!userValidation.isValid) {
    return userValidation;
  }

  // Validate resource access if specified
  if (resourceAccess && resourceAccess.length > 0) {
    const resourceValidation = await validateBulkResourceOwnership(resourceAccess, organizationId);
    if (!resourceValidation.isValid) {
      return resourceValidation;
    }
  }

  return {
    isValid: true,
    organizationId,
    warnings: orgValidation.warnings
  };
}

/**
 * Middleware helper to validate tenant access for express routes
 */
export function createTenantValidator(
  resourceExtractor?: (req: any) => Array<{ type: keyof typeof schema; id: number }>
) {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.user || !req.organizationId) {
        return res.status(401).json({ 
          error: "Authentication required for tenant validation",
          code: "TENANT_AUTH_REQUIRED"
        });
      }

      const resourceAccess = resourceExtractor ? resourceExtractor(req) : undefined;
      
      const validation = await validateApiAccess(
        req.user.id,
        req.organizationId,
        resourceAccess
      );

      if (!validation.isValid) {
        console.error('[TENANT-VALIDATOR] Validation failed:', validation.errors);
        return res.status(403).json({
          error: "Tenant access validation failed",
          code: "TENANT_ACCESS_DENIED",
          details: validation.errors
        });
      }

      if (validation.warnings) {
        console.warn('[TENANT-VALIDATOR] Validation warnings:', validation.warnings);
      }

      next();
    } catch (error) {
      console.error('[TENANT-VALIDATOR] Validation error:', error);
      res.status(500).json({
        error: "Tenant validation failed",
        code: "TENANT_VALIDATION_ERROR"
      });
    }
  };
}