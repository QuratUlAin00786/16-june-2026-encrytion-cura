# Subscription Management Implementation Plan

## Overview
This document provides a detailed step-by-step implementation plan for subscription management features including upgrade, downgrade, cancel, and billing cycle changes.

---

## Step 1: Complete Usage Validation Functions

### Location: `server/services/stripe-subscription.ts`

### Current Status:
- Function `validateUsageBeforeDowngrade` exists but has TODOs for actual usage counting

### Implementation Steps:

#### 1.1 Add Helper Functions to Get Usage Statistics

```typescript
// Add these functions to server/services/stripe-subscription.ts

import { users, patients } from "@shared/schema";
import { and, eq, count } from "drizzle-orm";

/**
 * Get current user count for an organization
 */
export async function getUserCount(organizationId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true)
      )
    );
  return result[0]?.count || 0;
}

/**
 * Get current patient count for an organization
 */
export async function getPatientCount(organizationId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(patients)
    .where(eq(patients.organizationId, organizationId));
  return result[0]?.count || 0;
}

/**
 * Get storage usage for an organization (in GB)
 * TODO: Implement actual storage calculation based on file uploads
 */
export async function getStorageUsage(organizationId: number): Promise<number> {
  // Placeholder - implement based on your file storage system
  // This might query a files table or use a storage service API
  return 0;
}
```

#### 1.2 Complete `validateUsageBeforeDowngrade` Function

```typescript
// Update the existing function in server/services/stripe-subscription.ts

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
  const currentUserCount = await getUserCount(organizationId);
  const currentPatientCount = await getPatientCount(organizationId);
  const currentStorageGB = await getStorageUsage(organizationId);

  // Validate users
  if (features.maxUsers !== undefined && features.maxUsers > 0) {
    if (currentUserCount > features.maxUsers) {
      const usersToDelete = currentUserCount - features.maxUsers;
      requiredDeletions.users = usersToDelete;
      errors.push(
        `You have ${currentUserCount} active users, but the new plan allows only ${features.maxUsers}. ` +
        `You need to delete ${usersToDelete} user(s) before downgrading.`
      );
    }
  }

  // Validate patients
  if (features.maxPatients !== undefined && features.maxPatients > 0) {
    if (currentPatientCount > features.maxPatients) {
      const patientsToDelete = currentPatientCount - features.maxPatients;
      requiredDeletions.patients = patientsToDelete;
      errors.push(
        `You have ${currentPatientCount} patients, but the new plan allows only ${features.maxPatients}. ` +
        `You need to delete ${patientsToDelete} patient(s) before downgrading.`
      );
    }
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
```

---

## Step 2: Implement Backend API Endpoints

### Location: `server/saas-routes.ts`

### 2.1 Upgrade Subscription Endpoint

**POST** `/api/saas/billing/upgrade`

```typescript
// Add to server/saas-routes.ts inside registerSaaSRoutes function

app.post("/api/saas/billing/upgrade", async (req, res) => {
  try {
    const { subscriptionId, newPackageId, billingCycle } = req.body;
    const organizationId = req.organizationId; // From auth middleware

    if (!subscriptionId || !newPackageId || !billingCycle) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get current subscription
    const [currentSubscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.id, subscriptionId),
          eq(saasSubscriptions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!currentSubscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    if (!currentSubscription.stripeSubscriptionId) {
      return res.status(400).json({ error: "Subscription does not have Stripe ID" });
    }

    // Get new package and price ID
    const newPriceId = await getStripePriceId(newPackageId, billingCycle);

    // Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId
    );

    // Update Stripe subscription with proration (immediate upgrade)
    const updatedSubscription = await stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Immediate upgrade with credit
      }
    );

    // Update database
    await db
      .update(saasSubscriptions)
      .set({
        packageId: newPackageId,
        stripePriceId: newPriceId,
        billingCycle: billingCycle,
        currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(saasSubscriptions.id, subscriptionId));

    // Create invoice record for the prorated charge
    // Stripe automatically creates an invoice, but we should sync it
    const latestInvoice = updatedSubscription.latest_invoice;
    if (latestInvoice && typeof latestInvoice === 'object' && 'id' in latestInvoice) {
      // Sync invoice to database (implement invoice sync logic)
    }

    res.json({
      success: true,
      message: "Subscription upgraded successfully. New features are now active.",
      subscription: {
        packageId: newPackageId,
        billingCycle: billingCycle,
        currentPeriodEnd: updatedSubscription.current_period_end * 1000,
      },
    });
  } catch (error: any) {
    console.error("Upgrade subscription error:", error);
    res.status(500).json({
      error: "Failed to upgrade subscription",
      message: error.message,
    });
  }
});
```

### 2.2 Downgrade Subscription Endpoint

**POST** `/api/saas/billing/downgrade`

```typescript
// Add to server/saas-routes.ts

app.post("/api/saas/billing/downgrade", async (req, res) => {
  try {
    const { subscriptionId, newPackageId, billingCycle, immediate } = req.body;
    const organizationId = req.organizationId;

    if (!subscriptionId || !newPackageId || !billingCycle) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate usage before downgrade
    const validation = await validateUsageBeforeDowngrade(organizationId, newPackageId);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: "Cannot downgrade: usage exceeds plan limits",
        errors: validation.errors,
        requiredDeletions: validation.requiredDeletions,
      });
    }

    // Get current subscription
    const [currentSubscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.id, subscriptionId),
          eq(saasSubscriptions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!currentSubscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // Get new package and price ID
    const newPriceId = await getStripePriceId(newPackageId, billingCycle);

    // Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId
    );

    if (immediate === true) {
      // Immediate downgrade: cancel current, refund, create new subscription
      // This is complex - consider if you really need this
      return res.status(400).json({
        error: "Immediate downgrade requires manual processing. Please contact support.",
      });
    }

    // Standard downgrade: takes effect at next billing cycle
    const updatedSubscription = await stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'none', // No immediate charge
        billing_cycle_anchor: 'unchanged', // Keep current billing date
      }
    );

    // Update database
    await db
      .update(saasSubscriptions)
      .set({
        packageId: newPackageId,
        stripePriceId: newPriceId,
        billingCycle: billingCycle,
        // Keep current period end - downgrade happens at renewal
        updatedAt: new Date(),
      })
      .where(eq(saasSubscriptions.id, subscriptionId));

    res.json({
      success: true,
      message: "Subscription will be downgraded at the next billing cycle. Current features remain active until then.",
      subscription: {
        packageId: newPackageId,
        billingCycle: billingCycle,
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        effectiveDate: currentSubscription.currentPeriodEnd,
      },
    });
  } catch (error: any) {
    console.error("Downgrade subscription error:", error);
    res.status(500).json({
      error: "Failed to downgrade subscription",
      message: error.message,
    });
  }
});
```

### 2.3 Cancel Subscription Endpoint

**POST** `/api/saas/billing/cancel`

```typescript
// Add to server/saas-routes.ts

app.post("/api/saas/billing/cancel", async (req, res) => {
  try {
    const { subscriptionId, immediate } = req.body;
    const organizationId = req.organizationId;

    if (!subscriptionId) {
      return res.status(400).json({ error: "Missing subscription ID" });
    }

    // Get current subscription
    const [currentSubscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.id, subscriptionId),
          eq(saasSubscriptions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!currentSubscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    if (!currentSubscription.stripeSubscriptionId) {
      return res.status(400).json({ error: "Subscription does not have Stripe ID" });
    }

    if (immediate === true) {
      // Immediate cancellation
      await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId);

      // Update database - downgrade to Basic (free) plan
      // Find Basic plan (usually packageId = 1 or name = "Basic")
      const [basicPlan] = await db
        .select()
        .from(saasPackages)
        .where(eq(saasPackages.name, "Basic"))
        .limit(1);

      if (basicPlan) {
        await db
          .update(saasSubscriptions)
          .set({
            packageId: basicPlan.id,
            status: "cancelled",
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(saasSubscriptions.id, subscriptionId));
      }

      res.json({
        success: true,
        message: "Subscription cancelled immediately. Account downgraded to Basic plan.",
        immediate: true,
      });
    } else {
      // Cancel at period end (recommended)
      await stripe.subscriptions.update(
        currentSubscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      // Update database
      await db
        .update(saasSubscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(saasSubscriptions.id, subscriptionId));

      res.json({
        success: true,
        message: "Subscription will be cancelled at the end of the current billing period.",
        immediate: false,
        expiresAt: currentSubscription.currentPeriodEnd,
      });
    }
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({
      error: "Failed to cancel subscription",
      message: error.message,
    });
  }
});
```

### 2.4 Change Billing Cycle Endpoint

**POST** `/api/saas/billing/change-cycle`

```typescript
// Add to server/saas-routes.ts

app.post("/api/saas/billing/change-cycle", async (req, res) => {
  try {
    const { subscriptionId, newBillingCycle } = req.body;
    const organizationId = req.organizationId;

    if (!subscriptionId || !newBillingCycle) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["monthly", "annual"].includes(newBillingCycle)) {
      return res.status(400).json({ error: "Invalid billing cycle" });
    }

    // Get current subscription
    const [currentSubscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(
        and(
          eq(saasSubscriptions.id, subscriptionId),
          eq(saasSubscriptions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!currentSubscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // Check if already on this cycle
    if (currentSubscription.billingCycle === newBillingCycle) {
      return res.status(400).json({ error: "Already on this billing cycle" });
    }

    // Get new price ID for same package but different cycle
    const newPriceId = await getStripePriceId(currentSubscription.packageId, newBillingCycle);

    // Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId
    );

    if (currentSubscription.billingCycle === "monthly" && newBillingCycle === "annual") {
      // Monthly → Annual: Immediate change with proration
      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.stripeSubscriptionId,
        {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'create_prorations', // Credit unused monthly portion
        }
      );

      await db
        .update(saasSubscriptions)
        .set({
          billingCycle: newBillingCycle,
          stripePriceId: newPriceId,
          currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(saasSubscriptions.id, subscriptionId));

      res.json({
        success: true,
        message: "Billing cycle changed to annual. Unused monthly credit applied.",
        effectiveImmediately: true,
      });
    } else {
      // Annual → Monthly: Change at next renewal
      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.stripeSubscriptionId,
        {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged',
        }
      );

      await db
        .update(saasSubscriptions)
        .set({
          billingCycle: newBillingCycle,
          stripePriceId: newPriceId,
          updatedAt: new Date(),
        })
        .where(eq(saasSubscriptions.id, subscriptionId));

      res.json({
        success: true,
        message: "Billing cycle will change to monthly at the next renewal date.",
        effectiveImmediately: false,
        effectiveDate: currentSubscription.currentPeriodEnd,
      });
    }
  } catch (error: any) {
    console.error("Change billing cycle error:", error);
    res.status(500).json({
      error: "Failed to change billing cycle",
      message: error.message,
    });
  }
});
```

### 2.5 Get Usage Statistics Endpoint (Helper)

**GET** `/api/saas/billing/usage`

```typescript
// Add to server/saas-routes.ts

app.get("/api/saas/billing/usage", async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const userCount = await getUserCount(organizationId);
    const patientCount = await getPatientCount(organizationId);
    const storageGB = await getStorageUsage(organizationId);

    res.json({
      users: userCount,
      patients: patientCount,
      storageGB: storageGB,
    });
  } catch (error: any) {
    console.error("Get usage error:", error);
    res.status(500).json({
      error: "Failed to get usage statistics",
      message: error.message,
    });
  }
});
```

---

## Step 3: Update Frontend - Add Upgrade/Downgrade UI

### Location: `client/src/pages/subscription.tsx`

### 3.1 Add State Management

```typescript
// Add to existing state declarations in subscription.tsx

const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
const [downgradeLoading, setDowngradeLoading] = useState<string | null>(null);
const [cancelLoading, setCancelLoading] = useState(false);
const [changeCycleLoading, setChangeCycleLoading] = useState(false);
const [usageStats, setUsageStats] = useState<{ users: number; patients: number; storageGB: number } | null>(null);
const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
const [selectedPlanForDowngrade, setSelectedPlanForDowngrade] = useState<any>(null);
const [downgradeErrors, setDowngradeErrors] = useState<string[]>([]);
const [showCancelDialog, setShowCancelDialog] = useState(false);
const [showChangeCycleDialog, setShowChangeCycleDialog] = useState(false);
```

### 3.2 Add API Mutation Functions

```typescript
// Add these functions to subscription.tsx

const handleUpgrade = async (plan: any) => {
  if (!subscription) {
    // No subscription - use existing checkout flow
    return handleStripeCheckout(plan);
  }

  setUpgradeLoading(plan.id);
  try {
    const token = localStorage.getItem('auth_token');
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': subdomain
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/saas/billing/upgrade', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        subscriptionId: subscription.id,
        newPackageId: plan.id,
        billingCycle: subscription.billingCycle || 'monthly',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to upgrade subscription');
    }

    // Show success message
    setStripeAlertMessage(data.message || "Subscription upgraded successfully. Please log out and log back in to see new features.");
    setStripeAlertOpen(true);

    // Refresh subscription data
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
  } catch (error: any) {
    console.error('Upgrade error:', error);
    setStripeAlertMessage(error.message || 'Failed to upgrade subscription');
    setStripeAlertOpen(true);
  } finally {
    setUpgradeLoading(null);
  }
};

const handleDowngrade = async (plan: any) => {
  setSelectedPlanForDowngrade(plan);
  setDowngradeErrors([]);

  // First, validate usage
  try {
    const token = localStorage.getItem('auth_token');
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': subdomain
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/saas/billing/downgrade', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        subscriptionId: subscription?.id,
        newPackageId: plan.id,
        billingCycle: subscription?.billingCycle || 'monthly',
        immediate: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Show validation errors
      setDowngradeErrors(data.errors || [data.error || data.message]);
      setShowDowngradeDialog(true);
      return;
    }

    // Success
    setStripeAlertMessage(data.message || "Subscription will be downgraded at the next billing cycle.");
    setStripeAlertOpen(true);
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
  } catch (error: any) {
    console.error('Downgrade error:', error);
    setStripeAlertMessage(error.message || 'Failed to downgrade subscription');
    setStripeAlertOpen(true);
  }
};

const handleCancel = async (immediate: boolean) => {
  setCancelLoading(true);
  try {
    const token = localStorage.getItem('auth_token');
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': subdomain
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/saas/billing/cancel', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        subscriptionId: subscription?.id,
        immediate: immediate,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to cancel subscription');
    }

    setStripeAlertMessage(data.message || "Subscription cancelled successfully.");
    setStripeAlertOpen(true);
    setShowCancelDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
  } catch (error: any) {
    console.error('Cancel error:', error);
    setStripeAlertMessage(error.message || 'Failed to cancel subscription');
    setStripeAlertOpen(true);
  } finally {
    setCancelLoading(false);
  }
};

const handleChangeCycle = async (newCycle: 'monthly' | 'annual') => {
  setChangeCycleLoading(true);
  try {
    const token = localStorage.getItem('auth_token');
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': subdomain
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/saas/billing/change-cycle', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        subscriptionId: subscription?.id,
        newBillingCycle: newCycle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to change billing cycle');
    }

    setStripeAlertMessage(data.message || "Billing cycle changed successfully.");
    setStripeAlertOpen(true);
    setShowChangeCycleDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
  } catch (error: any) {
    console.error('Change cycle error:', error);
    setStripeAlertMessage(error.message || 'Failed to change billing cycle');
    setStripeAlertOpen(true);
  } finally {
    setChangeCycleLoading(false);
  }
};
```

### 3.3 Update Plan Card Buttons

```typescript
// Replace the button logic in the plan cards (around line 740-860)

{(() => {
  if (!subscription) {
    // No subscription - show subscribe button
    return (
      <Button
        className="w-full text-sm"
        variant={plan.popular ? "default" : "outline"}
        disabled={loadingPlanId === plan.id}
        onClick={() => handleStripeCheckout(plan)}
      >
        {loadingPlanId === plan.id ? "Loading..." : `Upgrade (${plan.name}) Package`}
      </Button>
    );
  }

  // Check if this is the current plan
  const isCurrentPlan = subscription.packageId === plan.id;
  const isHigherPlan = plan.price > (dbPackages.find(p => p.id === subscription.packageId)?.price || 0);
  const isLowerPlan = plan.price < (dbPackages.find(p => p.id === subscription.packageId)?.price || 0);

  if (isCurrentPlan) {
    // Current plan - show "Currently Subscribed" or "Cancel" button
    const status = subscription?.status?.toLowerCase();
    const isActive = status === "active" || status === "trial";
    const isNotCancelled = status !== "cancelled";
    
    // Check expiration (same logic as before)
    const now = new Date();
    let isNotExpired = true;
    if (subscription?.expiresAt) {
      // Parse as UTC (same logic as getCountdown)
      const expiresAtStr = String(subscription.expiresAt).trim();
      const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(expiresAtStr);
      let expiresDate: Date;
      if (hasTimezone) {
        expiresDate = new Date(expiresAtStr);
      } else {
        const isoMatch = expiresAtStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
        if (isoMatch) {
          const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
          expiresDate = new Date(Date.UTC(
            Number(y), Number(mo) - 1, Number(d),
            Number(hh), Number(mm), ss ? Number(ss) : 0,
            ms ? Number(ms.substring(0, 3)) : 0
          ));
        } else {
          expiresDate = new Date(expiresAtStr);
        }
      }
      isNotExpired = expiresDate.getTime() > now.getTime();
    }
    
    const isCurrentlySubscribed = isActive && isNotExpired && isNotCancelled;

    return (
      <div className="space-y-2">
        <Button
          className="w-full text-sm"
          variant="outline"
          disabled={isCurrentlySubscribed}
        >
          {isCurrentlySubscribed ? "Currently Subscribed" : "Expired"}
        </Button>
        {isCurrentlySubscribed && (
          <Button
            className="w-full text-sm"
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
          >
            Cancel Subscription
          </Button>
        )}
      </div>
    );
  }

  if (isHigherPlan) {
    // Upgrade button
    return (
      <Button
        className="w-full text-sm"
        variant={plan.popular ? "default" : "outline"}
        disabled={upgradeLoading === plan.id}
        onClick={() => handleUpgrade(plan)}
      >
        {upgradeLoading === plan.id ? "Processing..." : `Upgrade to ${plan.name}`}
      </Button>
    );
  }

  if (isLowerPlan) {
    // Downgrade button
    return (
      <Button
        className="w-full text-sm"
        variant="outline"
        disabled={downgradeLoading === plan.id}
        onClick={() => handleDowngrade(plan)}
      >
        {downgradeLoading === plan.id ? "Processing..." : `Downgrade to ${plan.name}`}
      </Button>
    );
  }

  // Fallback
  return (
    <Button
      className="w-full text-sm"
      variant="outline"
      onClick={() => handleStripeCheckout(plan)}
    >
      Switch to {plan.name}
    </Button>
  );
})()}
```

### 3.4 Add Downgrade Validation Dialog

```typescript
// Add this dialog component before the closing tag of the component

<Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cannot Downgrade</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTitle>Usage Exceeds Plan Limits</AlertTitle>
        <AlertDescription>
          Your current usage exceeds the limits of the selected plan. Please reduce your usage before downgrading.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        <h4 className="font-semibold">Required Actions:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {downgradeErrors.map((error, index) => (
            <li key={index} className="text-red-600">{error}</li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowDowngradeDialog(false)}>
          Close
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### 3.5 Add Cancel Subscription Dialog

```typescript
// Add this dialog component

<Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cancel Subscription</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Are you sure?</AlertTitle>
        <AlertDescription>
          Cancelling your subscription will downgrade your account to the Basic (free) plan.
          {subscription?.currentPeriodEnd && (
            <div className="mt-2">
              Your subscription will remain active until{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
            </div>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
          Keep Subscription
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleCancel(false)}
          disabled={cancelLoading}
        >
          {cancelLoading ? "Processing..." : "Cancel at Period End"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### 3.6 Add Billing Cycle Change UI

```typescript
// Add this in the "Current SaaS Subscription Snapshot" section

{subscription && (
  <div className="mt-4 p-4 border rounded-lg">
    <h4 className="font-semibold mb-2">Billing Cycle</h4>
    <div className="flex items-center gap-4">
      <span>Current: {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowChangeCycleDialog(true)}
        disabled={changeCycleLoading}
      >
        Change Cycle
      </Button>
    </div>
  </div>
)}

<Dialog open={showChangeCycleDialog} onOpenChange={setShowChangeCycleDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Change Billing Cycle</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <p>Current cycle: {subscription?.billingCycle === 'annual' ? 'Annual' : 'Monthly'}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {subscription?.billingCycle === 'monthly' 
            ? "Switching to annual billing will take effect immediately. Unused monthly credit will be applied."
            : "Switching to monthly billing will take effect at the next renewal date."}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowChangeCycleDialog(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => handleChangeCycle(subscription?.billingCycle === 'annual' ? 'monthly' : 'annual')}
          disabled={changeCycleLoading}
        >
          {changeCycleLoading ? "Processing..." : `Switch to ${subscription?.billingCycle === 'annual' ? 'Monthly' : 'Annual'}`}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## Step 4: Implement Webhook Handler

### Location: `server/saas-routes.ts`

### 4.1 Add Webhook Endpoint

```typescript
// Add to server/saas-routes.ts

app.post("/api/saas/webhooks/stripe", async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Missing signature or webhook secret');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        
        // Find organization by customer ID
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripeCustomerId, stripeSubscription.customer as string))
          .limit(1);

        if (org) {
          await updateSubscriptionFromStripe(stripeSubscription, org.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripeCustomerId, stripeSubscription.customer as string))
          .limit(1);

        if (org) {
          // Downgrade to Basic plan
          const [basicPlan] = await db
            .select()
            .from(saasPackages)
            .where(eq(saasPackages.name, "Basic"))
            .limit(1);

          if (basicPlan) {
            await db
              .update(saasSubscriptions)
              .set({
                packageId: basicPlan.id,
                status: "cancelled",
                cancelAtPeriodEnd: false,
                updatedAt: new Date(),
              })
              .where(eq(saasSubscriptions.organizationId, org.id));
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // Update payment status, extend subscription
        // Implement invoice sync logic
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Mark subscription as past_due, send notification
        // Implement failure handling
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 5: Testing Checklist

### 5.1 Upgrade Testing
- [ ] Upgrade from Basic to Gold (immediate effect)
- [ ] Verify proration is calculated correctly
- [ ] Verify new features are immediately available
- [ ] Verify invoice is generated
- [ ] Test upgrade from Gold to Enterprise

### 5.2 Downgrade Testing
- [ ] Attempt downgrade with usage exceeding limits (should fail)
- [ ] Reduce usage and retry downgrade (should succeed)
- [ ] Verify downgrade takes effect at next billing cycle
- [ ] Verify current features remain active until renewal

### 5.3 Cancel Testing
- [ ] Cancel subscription (at period end)
- [ ] Verify subscription remains active until expiration
- [ ] Verify account downgrades to Basic after expiration
- [ ] Test immediate cancellation (if implemented)

### 5.4 Billing Cycle Testing
- [ ] Change monthly → annual (immediate)
- [ ] Change annual → monthly (at renewal)
- [ ] Verify proration calculations
- [ ] Verify billing dates update correctly

### 5.5 Webhook Testing
- [ ] Test subscription.created webhook
- [ ] Test subscription.updated webhook
- [ ] Test subscription.deleted webhook
- [ ] Test invoice.paid webhook
- [ ] Test invoice.payment_failed webhook

---

## Summary

This implementation plan covers:
1. ✅ Usage validation with actual database queries
2. ✅ Upgrade endpoint with immediate proration
3. ✅ Downgrade endpoint with usage validation
4. ✅ Cancel endpoint (at period end and immediate)
5. ✅ Billing cycle change endpoint
6. ✅ Frontend UI for all operations
7. ✅ Webhook handler for Stripe events

**Next Steps:**
1. Implement Step 1 (Usage validation functions)
2. Implement Step 2 (Backend endpoints)
3. Implement Step 3 (Frontend UI)
4. Implement Step 4 (Webhook handler)
5. Test all scenarios (Step 5)
