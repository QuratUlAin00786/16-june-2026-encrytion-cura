import { db } from "../db";
import { saasSubscriptionHistory, saasSubscriptions, saasPackages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface LogSubscriptionHistoryParams {
  organizationId: number;
  subscriptionId: number;
  action: "upgrade" | "downgrade" | "cancel" | "renew" | "change_cycle" | "create" | "update";
  performedBy?: number; // User ID
  performedByType?: "saas_admin" | "org_admin";
  oldPackageId?: number;
  newPackageId?: number;
  oldBillingCycle?: "monthly" | "annual";
  newBillingCycle?: "monthly" | "annual";
  oldStatus?: string;
  newStatus?: string;
  oldPrice?: number;
  newPrice?: number;
  details?: {
    prorationAmount?: number;
    reason?: string;
    immediate?: boolean;
    effectiveDate?: string;
    stripeSubscriptionId?: string;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log subscription history/audit trail
 */
export async function logSubscriptionHistory(params: LogSubscriptionHistoryParams): Promise<void> {
  try {
    await db.insert(saasSubscriptionHistory).values({
      organizationId: params.organizationId,
      subscriptionId: params.subscriptionId,
      action: params.action,
      performedBy: params.performedBy || null,
      performedByType: params.performedByType || "org_admin",
      oldPackageId: params.oldPackageId || null,
      newPackageId: params.newPackageId || null,
      oldBillingCycle: params.oldBillingCycle || null,
      newBillingCycle: params.newBillingCycle || null,
      oldStatus: params.oldStatus || null,
      newStatus: params.newStatus || null,
      oldPrice: params.oldPrice ? params.oldPrice.toString() : null,
      newPrice: params.newPrice ? params.newPrice.toString() : null,
      details: params.details || {},
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (error) {
    console.error("Failed to log subscription history:", error);
    // Don't throw - history logging should not break the main operation
  }
}

/**
 * Get subscription history for an organization
 */
export async function getSubscriptionHistory(organizationId?: number) {
  let baseQuery = db
    .select({
      id: saasSubscriptionHistory.id,
      organizationId: saasSubscriptionHistory.organizationId,
      subscriptionId: saasSubscriptionHistory.subscriptionId,
      action: saasSubscriptionHistory.action,
      performedBy: saasSubscriptionHistory.performedBy,
      performedByType: saasSubscriptionHistory.performedByType,
      oldPackageId: saasSubscriptionHistory.oldPackageId,
      newPackageId: saasSubscriptionHistory.newPackageId,
      oldBillingCycle: saasSubscriptionHistory.oldBillingCycle,
      newBillingCycle: saasSubscriptionHistory.newBillingCycle,
      oldStatus: saasSubscriptionHistory.oldStatus,
      newStatus: saasSubscriptionHistory.newStatus,
      oldPrice: saasSubscriptionHistory.oldPrice,
      newPrice: saasSubscriptionHistory.newPrice,
      details: saasSubscriptionHistory.details,
      ipAddress: saasSubscriptionHistory.ipAddress,
      userAgent: saasSubscriptionHistory.userAgent,
      createdAt: saasSubscriptionHistory.createdAt,
    })
    .from(saasSubscriptionHistory);

  if (organizationId) {
    baseQuery = baseQuery.where(eq(saasSubscriptionHistory.organizationId, organizationId));
  }

  const results = await baseQuery.orderBy(desc(saasSubscriptionHistory.createdAt));

  // Get package names separately
  const historyWithPackageNames = await Promise.all(
    results.map(async (row) => {
      let oldPackageName = null;
      let newPackageName = null;

      if (row.oldPackageId) {
        const [oldPkg] = await db
          .select({ name: saasPackages.name })
          .from(saasPackages)
          .where(eq(saasPackages.id, row.oldPackageId))
          .limit(1);
        oldPackageName = oldPkg?.name || null;
      }

      if (row.newPackageId) {
        const [newPkg] = await db
          .select({ name: saasPackages.name })
          .from(saasPackages)
          .where(eq(saasPackages.id, row.newPackageId))
          .limit(1);
        newPackageName = newPkg?.name || null;
      }

      return {
        ...row,
        oldPackageName,
        newPackageName,
      };
    })
  );

  return historyWithPackageNames;
}
