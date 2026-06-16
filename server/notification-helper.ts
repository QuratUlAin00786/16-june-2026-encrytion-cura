import { InsertNotification, notifications } from "@shared/schema";
import { db } from "./db";

export interface CreateNotificationParams {
  organizationId: number;
  userId: number;
  title: string;
  message: string;
  type: "appointment_reminder" | "lab_result" | "prescription_alert" | "system_alert" | "payment_due" | "message" | "patient_update";
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string;
  metadata?: {
    patientId?: number;
    patientName?: string;
    appointmentId?: number;
    prescriptionId?: number;
    urgency?: "low" | "medium" | "high" | "critical";
    department?: string;
    icon?: string;
    color?: string;
  };
  scheduledFor?: Date;
  expiresAt?: Date;
}

/**
 * Creates a notification with CURRENT LOCAL TIME (no UTC conversion)
 * 
 * EXPLANATION:
 * - We explicitly set createdAt to new Date() which gives us the CURRENT LOCAL TIME
 * - This ensures notifications show "just now" or "0 seconds ago" when created
 * - No timezone conversion is applied - we use the actual current time
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // Get CURRENT TIME (local time, not UTC)
    const currentTime = new Date();
    
    const notificationData: InsertNotification = {
      organizationId: params.organizationId,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority || "normal",
      status: "unread",
      isActionable: !!params.actionUrl,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      scheduledFor: params.scheduledFor,
      expiresAt: params.expiresAt,
      // EXPLICITLY set createdAt to CURRENT TIME (local time)
      // This ensures the notification shows "just now" when created
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    const result = await db.insert(notifications).values(notificationData).returning();
    const createdNotification = result[0];
    
    // Log the datetime format being inserted/returned
    console.log(`[Notification Created] Type: ${params.type}, User: ${params.userId}, Title: ${params.title}`);
    console.log(`[Notification DateTime] Created at: ${currentTime.toISOString()} (Local: ${currentTime.toString()})`);
    console.log(`[Notification DateTime] Database returned: ${createdNotification?.createdAt}`);
  } catch (error) {
    console.error("[Notification Error] Failed to create notification:", error);
  }
}

/**
 * Creates multiple notifications with CURRENT LOCAL TIME (no UTC conversion)
 * 
 * EXPLANATION:
 * - Same as createNotification but for bulk operations
 * - Each notification gets the CURRENT TIME when created
 */
export async function createBulkNotifications(notificationsList: CreateNotificationParams[]): Promise<void> {
  try {
    // Get CURRENT TIME (local time, not UTC) - same time for all in this batch
    const currentTime = new Date();
    
    const notificationDataList: InsertNotification[] = notificationsList.map(params => ({
      organizationId: params.organizationId,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority || "normal",
      status: "unread",
      isActionable: !!params.actionUrl,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      scheduledFor: params.scheduledFor,
      expiresAt: params.expiresAt,
      // EXPLICITLY set createdAt to CURRENT TIME (local time)
      createdAt: currentTime,
      updatedAt: currentTime,
    }));

    await db.insert(notifications).values(notificationDataList);
    console.log(`[Bulk Notifications Created] Count: ${notificationsList.length} at ${currentTime.toISOString()}`);
  } catch (error) {
    console.error("[Notification Error] Failed to create bulk notifications:", error);
  }
}

export function getAppointmentReminderDate(appointmentDate: Date, hoursBefore: number = 24): Date {
  const reminderDate = new Date(appointmentDate);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);
  return reminderDate;
}
