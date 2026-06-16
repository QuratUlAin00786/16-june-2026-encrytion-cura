import Stripe from "stripe";
import { db } from "../db";
import { organizations, saasSubscriptions, saasPackages, users, patients } from "@shared/schema";
import { eq, and, count, ne } from "drizzle-orm";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    })
  : null;

if (!stripe) {
  console.warn("⚠️ Stripe is not configured. Subscription management features will not work.");
}

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateStripeCustomer(organizationId: number): Promise<string> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  // Get organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  // If customer already exists, return it
  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: org.email || undefined,
    name: org.name,
    metadata: {
      organization_id: organizationId.toString(),
      organization_subdomain: org.subdomain || "",
    },
  });

  // Save customer ID to database
  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id })
    .where(eq(organizations.id, organizationId));

  return customer.id;
}

/**
 * Get Stripe Price ID for a package and billing cycle
 */
export async function getStripePriceId(
  packageId: number,
  billingCycle: "monthly" | "annual"
): Promise<string> {
  const [pkg] = await db
    .select()
    .from(saasPackages)
    .where(eq(saasPackages.id, packageId))
    .limit(1);

  if (!pkg) {
    throw new Error(`Package ${packageId} not found`);
  }

  // If package has stripePriceId, use it (assuming it matches the billing cycle)
  // In production, you might want separate price IDs for monthly/annual
  if (pkg.stripePriceId) {
    return pkg.stripePriceId;
  }

  throw new Error(
    `Package ${packageId} does not have a Stripe Price ID configured. Please configure stripe_price_id in saas_packages table.`
  );
}

/**
 * Get current user count for an organization (active users only, excluding SaaS owners and patient role)
 */
export async function getUserCount(organizationId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
        eq(users.isSaaSOwner, false),
        ne(users.role, 'patient') // Exclude patient role - patients are counted separately
      )
    );
  return result[0]?.count || 0;
}

/**
 * Get current patient count for an organization (active patients only)
 */
export async function getPatientCount(organizationId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(patients)
    .where(
      and(
        eq(patients.organizationId, organizationId),
        eq(patients.isActive, true)
      )
    );
  return result[0]?.count || 0;
}

/**
 * Get storage usage for an organization (in GB)
 * TODO: Implement actual storage calculation based on file uploads
 * This is a placeholder - implement based on your file storage system
 */
export async function getStorageUsage(organizationId: number): Promise<number> {
  // Placeholder - implement based on your file storage system
  // This might query a files table or use a storage service API
  // For now, return 0 to allow downgrades (storage validation can be added later)
  return 0;
}

/**
 * Validate usage before downgrade
 */
export async function validateUsageBeforeDowngrade(
  organizationId: number,
  newPackageId: number
): Promise<{ valid: boolean; errors: string[]; requiredDeletions?: { users: number; patients: number } }> {
  const errors: string[] = [];
  const requiredDeletions: { users: number; patients: number } = { users: 0, patients: 0 };

  // Get current organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    return { valid: false, errors: ["Organization not found"] };
  }

  // Get new package limits
  const [newPackage] = await db
    .select()
    .from(saasPackages)
    .where(eq(saasPackages.id, newPackageId))
    .limit(1);

  if (!newPackage) {
    return { valid: false, errors: ["New package not found"] };
  }

  const features = newPackage.features as {
    maxUsers?: number;
    maxPatients?: number;
    storageGB?: number;
  } || {};

  // Get current usage
  let currentUserCount = 0;
  let currentPatientCount = 0;
  let currentStorageGB = 0;
  
  try {
    currentUserCount = await getUserCount(organizationId);
  } catch (error: any) {
    console.error('[VALIDATE] Error getting user count:', error);
    errors.push(`Failed to retrieve current user count: ${error.message || 'Database error'}`);
  }
  
  try {
    currentPatientCount = await getPatientCount(organizationId);
  } catch (error: any) {
    console.error('[VALIDATE] Error getting patient count:', error);
    errors.push(`Failed to retrieve current patient count: ${error.message || 'Database error'}`);
  }
  
  try {
    currentStorageGB = await getStorageUsage(organizationId);
  } catch (error: any) {
    console.error('[VALIDATE] Error getting storage usage:', error);
    // Storage validation is optional, so we don't add to errors
  }

  // Get target package limits
  const targetMaxUsers = features.maxUsers ?? 0;
  const targetMaxPatients = features.maxPatients ?? 0;

  // Calculate required removals using max(0, current - target) to ensure no negative values
  // usersToRemove = max(0, currentUsers - targetMaxUsers)
  // patientsToRemove = max(0, currentPatients - targetMaxPatients)
  const usersToRemove = Math.max(0, currentUserCount - targetMaxUsers);
  const patientsToRemove = Math.max(0, currentPatientCount - targetMaxPatients);

  console.log('[VALIDATE] Downgrade validation calculation:', {
    currentUserCount,
    targetMaxUsers,
    usersToRemove,
    currentPatientCount,
    targetMaxPatients,
    patientsToRemove,
  });

  // Validate users - if current usage exceeds target limits, block downgrade
  if (usersToRemove > 0) {
    requiredDeletions.users = usersToRemove;
    errors.push(
      `You have ${currentUserCount} active user${currentUserCount !== 1 ? 's' : ''}, but the new plan allows only ${targetMaxUsers}. ` +
      `You need to remove ${usersToRemove} user${usersToRemove !== 1 ? 's' : ''} before downgrading.`
    );
  }

  // Validate patients - if current usage exceeds target limits, block downgrade
  if (patientsToRemove > 0) {
    requiredDeletions.patients = patientsToRemove;
    errors.push(
      `You have ${currentPatientCount} patient${currentPatientCount !== 1 ? 's' : ''}, but the new plan allows only ${targetMaxPatients}. ` +
      `You need to remove ${patientsToRemove} patient${patientsToRemove !== 1 ? 's' : ''} before downgrading.`
    );
  }

  // Validate storage
  if (features.storageGB !== undefined && features.storageGB > 0) {
    if (currentStorageGB > features.storageGB) {
      errors.push(
        `You are using ${currentStorageGB}GB of storage, but the new plan allows only ${features.storageGB}GB. ` +
        `Please reduce your storage usage before downgrading.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    requiredDeletions: errors.length > 0 ? requiredDeletions : undefined,
  };
}

/**
 * Update subscription in database from Stripe subscription object
 */
export async function updateSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  organizationId: number
): Promise<void> {
  const subscriptionItem = stripeSubscription.items.data[0];
  const priceId = subscriptionItem?.price?.id;

  // Find subscription by stripe_subscription_id
  const [existing] = await db
    .select()
    .from(saasSubscriptions)
    .where(eq(saasSubscriptions.stripeSubscriptionId, stripeSubscription.id))
    .limit(1);

  if (!existing) {
    console.warn(`Subscription ${stripeSubscription.id} not found in database`);
    return;
  }

  // Determine billing cycle from price
  // In production, you might want to store this mapping or check price metadata
  const billingCycle = stripeSubscription.items.data[0]?.price?.recurring?.interval === "year"
    ? "annual"
    : "monthly";

  // Update subscription
  await db
    .update(saasSubscriptions)
    .set({
      status: stripeSubscription.status === "active" ? "active" : 
              stripeSubscription.status === "trialing" ? "trial" :
              stripeSubscription.status === "canceled" ? "cancelled" : "expired",
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripePriceId: priceId || existing.stripePriceId,
      billingCycle: billingCycle,
      updatedAt: new Date(),
    })
    .where(eq(saasSubscriptions.id, existing.id));
}
