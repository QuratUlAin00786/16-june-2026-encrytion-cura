import { db } from "../db";
import { saasSubscriptions, organizations, users } from "@shared/schema";
import { eq, and, gte, isNotNull, not, desc, lte } from "drizzle-orm";
import { emailService } from "./email";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type ReminderLevel = {
  key: string;
  daysBefore: number;
  subject: string;
  template: (ctx: { organization: string; daysRemaining: number }) => string;
};

const REMINDER_LEVELS: Array<ReminderLevel & { label: string }> = [
  {
    key: "reminder_7d",
    label: "7-day notice",
    daysBefore: 7,
    subject: "Your Cura EMR subscription expires in 7 days",
    template: ({ organization, daysRemaining }) =>
      `Hello,\n\nYour organization ${organization} has ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} of access remaining. Please renew before it expires to avoid disruption.\n\nRenew Now → https://app.curaemr.ai/saas/renew\n\nThanks,\nCura EMR`,
  },
  {
    key: "reminder_1d",
    label: "1-day notice",
    daysBefore: 1,
    subject: "Reminder: Your Cura EMR subscription expires tomorrow",
    template: ({ organization, daysRemaining }) =>
      `Hi,\n\nJust a heads-up: ${organization} will lose access in ${daysRemaining} day. Renew now to keep using Cura EMR uninterrupted.\n\nRenew Now → https://app.curaemr.ai/saas/renew\n\nBest,\nCura EMR Billing`,
  },
  {
    key: "reminder_day_of",
    label: "Day-of notice",
    daysBefore: 0,
    subject: "Final notice: Your Cura EMR subscription expires today",
    template: ({ organization }) =>
      `Important: ${organization}'s subscription expires today. Renew immediately to restore access.\n\nRenew Now → https://app.curaemr.ai/saas/renew\n\nSupport is here if you need help.`,
  },
];

async function fetchAdminEmail(organizationId: number): Promise<string | null> {
  const [admin] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
    })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.role, "admin"),
        eq(users.isActive, true),
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(1);

  return admin?.email || null;
}

async function sendReminderForLevel(
  subscription: {
    id: number;
    organizationId: number;
    organizationName: string | null;
    expiresAt: string | null;
    metadata: Record<string, any> | null | undefined;
  },
  levelKey: string,
  daysRemaining?: number,
): Promise<void> {
  const level = REMINDER_LEVELS.find((item) => item.key === levelKey);
  if (!level) {
    throw new Error("Invalid reminder level");
  }

  const metadata = subscription.metadata ? { ...subscription.metadata } : {};
  const reminders = metadata.expiryReminders || {};
  const computedDaysRemaining =
    typeof daysRemaining === "number"
      ? daysRemaining
      : subscription.expiresAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.expiresAt).getTime() - Date.now()) /
              MS_PER_DAY,
          ),
        )
      : 0;

  const adminEmail = await fetchAdminEmail(subscription.organizationId);
  if (!adminEmail) {
    throw new Error("No admin email configured for this organization");
  }

  await emailService.sendEmail({
    to: adminEmail,
    subject: level.subject,
    text: level.template({
      organization: subscription.organizationName || "your organization",
      daysRemaining: computedDaysRemaining,
    }),
  });

  const updatedMetadata = {
    ...metadata,
    expiryReminders: {
      ...reminders,
      [level.key]: new Date().toISOString(),
    },
    expiryAlertLevel: level.key,
  };

  await db
    .update(saasSubscriptions)
    .set({ metadata: updatedMetadata })
    .where(eq(saasSubscriptions.id, subscription.id));
}

export async function runSubscriptionExpiryReminders(): Promise<void> {
  const now = new Date();
  const subscriptions = await db.select({
    id: saasSubscriptions.id,
    organizationId: saasSubscriptions.organizationId,
    organizationName: organizations.name,
    expiresAt: saasSubscriptions.expiresAt,
    status: saasSubscriptions.status,
    metadata: saasSubscriptions.metadata,
  })
    .from(saasSubscriptions)
    .leftJoin(organizations, eq(saasSubscriptions.organizationId, organizations.id))
    .where(
      and(
        isNotNull(saasSubscriptions.expiresAt),
        gte(saasSubscriptions.expiresAt, now),
        not(eq(saasSubscriptions.status, "cancelled")),
      ),
    );

  for (const subscription of subscriptions) {
    if (!subscription.expiresAt) continue;
    const expiresAtDate = new Date(subscription.expiresAt);
    const diffMs = expiresAtDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / MS_PER_DAY);
    const metadata = (subscription.metadata as Record<string, any>) || {};
    const reminders = metadata.expiryReminders || {};

    for (const level of REMINDER_LEVELS) {
      const shouldSend =
        (level.daysBefore === 0 && daysRemaining <= 0) ||
        (level.daysBefore > 0 && daysRemaining === level.daysBefore);

      if (!shouldSend) continue;
      if (reminders[level.key]) continue;

      try {
        await sendReminderForLevel(subscription, level.key, daysRemaining);
        console.log(`✅ Sent ${level.key} reminder for organization ${subscription.organizationId}`);
      } catch (error) {
        console.error(
          `❌ Failed to send ${level.key} reminder for org ${subscription.organizationId}:`,
          error,
        );
      }

      break;
    }
  }
}

export async function sendReminderForSubscription(
  subscriptionId: number,
  levelKey: string,
): Promise<void> {
  const level = REMINDER_LEVELS.find((rl) => rl.key === levelKey);
  if (!level) {
    throw new Error("Invalid reminder level");
  }

  const [subscription] = await db
    .select({
      id: saasSubscriptions.id,
      organizationId: saasSubscriptions.organizationId,
      organizationName: organizations.name,
      expiresAt: saasSubscriptions.expiresAt,
      metadata: saasSubscriptions.metadata,
    })
    .from(saasSubscriptions)
    .leftJoin(organizations, eq(saasSubscriptions.organizationId, organizations.id))
    .where(eq(saasSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  await sendReminderForLevel(subscription, levelKey);
}

export async function runSubscriptionExpiryAutomation(): Promise<void> {
  const now = new Date();
  const expiringSubscriptions = await db.select({
    id: saasSubscriptions.id,
    organizationId: saasSubscriptions.organizationId,
  })
    .from(saasSubscriptions)
    .where(
      and(
        isNotNull(saasSubscriptions.expiresAt),
        lte(saasSubscriptions.expiresAt, now),
        not(eq(saasSubscriptions.status, "expired")),
        not(eq(saasSubscriptions.status, "cancelled")),
      ),
    );

  for (const subscription of expiringSubscriptions) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(saasSubscriptions)
          .set({ status: "expired", paymentStatus: "expired", updatedAt: new Date() })
          .where(eq(saasSubscriptions.id, subscription.id));

        await tx
          .update(organizations)
          .set({ subscriptionStatus: "expired", paymentStatus: "expired", updatedAt: new Date() })
          .where(eq(organizations.id, subscription.organizationId));
      });

      console.log(`🚨 Subscription ${subscription.id} expired automatically`);
    } catch (error) {
      console.error("Error expiring subscription:", error);
    }
  }
}

export function startSubscriptionReminderScheduler(): void {
  const task = async () => {
    try {
      await runSubscriptionExpiryReminders();
      await runSubscriptionExpiryAutomation();
    } catch (error) {
      console.error("Error running subscription reminders:", error);
    }
  };

  task();
  setInterval(task, 60 * 60 * 1000); // hourly
}

