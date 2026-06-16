import { db } from "./db";
import { appointments, users, notifications } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createBulkNotifications } from "./notification-helper";
import { storage } from "./storage";

export async function sendUpcomingAppointmentReminders() {
  try {
    console.log("[Appointment Reminders] Checking for upcoming appointments...");
    
    // Get appointments in the next 24-48 hours (that haven't been reminded yet)
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    // Query appointments that need reminders
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "scheduled"),
          sql`${appointments.scheduledAt} >= ${twentyFourHoursFromNow.toISOString()}`,
          sql`${appointments.scheduledAt} <= ${fortyEightHoursFromNow.toISOString()}`
        )
      );
    
    if (upcomingAppointments.length === 0) {
      console.log("[Appointment Reminders] No upcoming appointments found.");
      return;
    }
    
    console.log(`[Appointment Reminders] Found ${upcomingAppointments.length} upcoming appointments.`);
    
    // Create notifications for each appointment
    const notificationsToCreate = [];
    
    for (const appointment of upcomingAppointments) {
      // Check if reminder notification already exists for this appointment
      const existingReminder = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.organizationId, appointment.organizationId),
            eq(notifications.type, "appointment_reminder")
          )
        )
        .then(results => 
          results.find(n => 
            n.metadata && 
            typeof n.metadata === 'object' && 
            'appointmentId' in n.metadata && 
            n.metadata.appointmentId === appointment.id &&
            n.title.includes("Reminder")
          )
        );
      
      if (existingReminder) {
        console.log(`[Appointment Reminders] Reminder already sent for appointment ${appointment.id}`);
        continue;
      }
      
      // Get patient and provider details (decrypt PHI from patients table)
      const patient = await storage.getPatient(appointment.patientId, appointment.organizationId);
      
      const provider = await db
        .select()
        .from(users)
        .where(eq(users.id, appointment.providerId))
        .limit(1)
        .then(results => results[0]);
      
      if (!patient || !provider) {
        console.log(`[Appointment Reminders] Missing patient or provider for appointment ${appointment.id}`);
        continue;
      }
      
      const appointmentDate = new Date(appointment.scheduledAt);
      const formattedDate = appointmentDate.toLocaleDateString('en-GB', { 
        weekday: 'long',
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      const formattedTime = appointmentDate.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Notify patient
      if (patient.userId) {
        notificationsToCreate.push({
          organizationId: appointment.organizationId,
          userId: patient.userId,
          title: "Upcoming Appointment Reminder",
          message: `You have an appointment with Dr. ${provider.firstName} ${provider.lastName} tomorrow (${formattedDate}) at ${formattedTime}.`,
          type: "appointment_reminder" as const,
          priority: "normal" as const,
          actionUrl: `/calendar`,
          metadata: {
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            appointmentId: appointment.id,
            department: "Appointments",
          }
        });
      }
      
      // Notify provider
      notificationsToCreate.push({
        organizationId: appointment.organizationId,
        userId: appointment.providerId,
        title: "Appointment Reminder",
        message: `Upcoming appointment with ${patient.firstName} ${patient.lastName} tomorrow (${formattedDate}) at ${formattedTime}.`,
        type: "appointment_reminder" as const,
        priority: "normal" as const,
        actionUrl: `/calendar`,
        metadata: {
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentId: appointment.id,
          department: "Appointments",
        }
      });
    }
    
    if (notificationsToCreate.length > 0) {
      await createBulkNotifications(notificationsToCreate);
      console.log(`[Appointment Reminders] Created ${notificationsToCreate.length} reminder notifications.`);
    }
  } catch (error) {
    console.error("[Appointment Reminders] Error sending reminders:", error);
  }
}

// Run the reminder check every hour
export function startAppointmentReminderScheduler() {
  console.log("[Appointment Reminders] Starting appointment reminder scheduler...");
  
  // Run immediately on startup
  sendUpcomingAppointmentReminders();
  
  // Then run every hour
  setInterval(() => {
    sendUpcomingAppointmentReminders();
  }, 60 * 60 * 1000); // 1 hour in milliseconds
}
