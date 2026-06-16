import { storage } from "../storage";
import type { Appointment, Patient, User } from "@shared/schema";

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  providerId: number;
  reason?: string; // if not available
}

export interface SchedulingConflict {
  type: "double_booking" | "provider_unavailable" | "room_conflict" | "equipment_conflict";
  description: string;
  conflictingAppointment?: Appointment;
  severity: "low" | "medium" | "high";
}

export interface OptimalTimeRecommendation {
  timeSlot: TimeSlot;
  score: number; // 0-100
  reasons: string[];
  patientPreference: "morning" | "afternoon" | "evening" | "flexible";
  providerEfficiency: number;
  travelTime?: number;
}

export interface AppointmentReminder {
  appointmentId: number;
  patientId: number;
  reminderType: "24_hour" | "2_hour" | "30_minute";
  method: "email" | "sms" | "push" | "call";
  sent: boolean;
  scheduledFor: Date;
  content: string;
}

export class AppointmentScheduler {

  /**
   * Finds optimal time slots for appointment scheduling
   */
  async findOptimalTimeSlots(
    providerId: number,
    organizationId: number,
    duration: number,
    preferredDate: Date,
    patientId?: number
  ): Promise<OptimalTimeRecommendation[]> {
    const provider = await storage.getUser(providerId, organizationId);
    if (!provider) throw new Error("Provider not found");

    const existingAppointments = await storage.getAppointmentsByProvider(providerId, organizationId, preferredDate);
    const recommendations: OptimalTimeRecommendation[] = [];

    // Generate time slots for the day (9 AM to 5 PM)
    const dayStart = new Date(preferredDate);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(preferredDate);
    dayEnd.setHours(17, 0, 0, 0);

    let currentTime = new Date(dayStart);
    
    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
      
      // Check if slot conflicts with existing appointments
      const conflict = this.checkTimeSlotConflict(currentTime, slotEnd, existingAppointments);
      
      if (!conflict) {
        const score = await this.calculateTimeSlotScore(currentTime, providerId, patientId, organizationId);
        const patientPreference = await this.getPatientTimePreference(patientId, organizationId);
        
        recommendations.push({
          timeSlot: {
            start: new Date(currentTime),
            end: new Date(slotEnd),
            available: true,
            providerId
          },
          score,
          reasons: this.getScoreReasons(currentTime, score),
          patientPreference,
          providerEfficiency: await this.getProviderEfficiency(providerId, currentTime)
        });
      }
      
      // Move to next 15-minute slot
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Detects and resolves scheduling conflicts
   */
  async detectSchedulingConflicts(
    appointmentData: {
      providerId: number;
      scheduledAt: Date;
      duration: number;
      location?: string;
    },
    organizationId: number
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];
    const appointmentEnd = new Date(appointmentData.scheduledAt.getTime() + appointmentData.duration * 60 * 1000);

    // Check for provider double booking
    const providerAppointments = await storage.getAppointmentsByProvider(
      appointmentData.providerId, 
      organizationId, 
      appointmentData.scheduledAt
    );

    for (const existing of providerAppointments) {
      const existingEnd = new Date(existing.scheduledAt.getTime() + existing.duration * 60 * 1000);
      
      if (this.timeRangesOverlap(appointmentData.scheduledAt, appointmentEnd, existing.scheduledAt, existingEnd)) {
        conflicts.push({
          type: "double_booking",
          description: `Provider is already scheduled with another patient at this time`,
          conflictingAppointment: existing,
          severity: "high"
        });
      }
    }

    // Check for room/location conflicts
    if (appointmentData.location) {
      const locationAppointments = await this.getAppointmentsByLocation(appointmentData.location, organizationId, appointmentData.scheduledAt);
      
      for (const existing of locationAppointments) {
        const existingEnd = new Date(existing.scheduledAt.getTime() + existing.duration * 60 * 1000);
        
        if (this.timeRangesOverlap(appointmentData.scheduledAt, appointmentEnd, existing.scheduledAt, existingEnd)) {
          conflicts.push({
            type: "room_conflict",
            description: `Room ${appointmentData.location} is already booked at this time`,
            conflictingAppointment: existing,
            severity: "medium"
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Automatically reschedules appointments when conflicts arise
   */
  async autoReschedule(appointmentId: number, organizationId: number, reason: string): Promise<TimeSlot | null> {
    const appointment = await storage.getAppointment(appointmentId, organizationId);
    if (!appointment) return null;

    // Find next available slot within the next 7 days
    const searchStart = new Date();
    searchStart.setDate(searchStart.getDate() + 1); // Start from tomorrow

    for (let day = 0; day < 7; day++) {
      const searchDate = new Date(searchStart);
      searchDate.setDate(searchDate.getDate() + day);

      const recommendations = await this.findOptimalTimeSlots(
        appointment.providerId,
        organizationId,
        appointment.duration,
        searchDate,
        appointment.patientId
      );

      if (recommendations.length > 0) {
        const bestSlot = recommendations[0].timeSlot;
        
        // Update the appointment
        await storage.updateAppointment(appointmentId, organizationId, {
          scheduledAt: bestSlot.start,
          notes: `${appointment.notes || ""}\nRescheduled: ${reason}`
        });

        // Send notification about rescheduling
        await this.sendRescheduleNotification(appointment, bestSlot.start, reason, organizationId);
        
        return bestSlot;
      }
    }

    return null; // No available slots found
  }

  /**
   * Manages automated appointment reminders
   */
  async scheduleAutomatedReminders(appointmentId: number, organizationId: number): Promise<AppointmentReminder[]> {
    const appointment = await storage.getAppointment(appointmentId, organizationId);
    if (!appointment) return [];

    const patient = await storage.getPatient(appointment.patientId, organizationId);
    if (!patient) return [];

    const reminders: AppointmentReminder[] = [];
    const appointmentTime = new Date(appointment.scheduledAt);

    // 24-hour reminder
    const reminder24h: AppointmentReminder = {
      appointmentId,
      patientId: appointment.patientId,
      reminderType: "24_hour",
      method: "email",
      sent: false,
      scheduledFor: new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000),
      content: this.generateReminderContent(appointment, patient, "24_hour")
    };

    // 2-hour reminder
    const reminder2h: AppointmentReminder = {
      appointmentId,
      patientId: appointment.patientId,
      reminderType: "2_hour",
      method: "sms",
      sent: false,
      scheduledFor: new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000),
      content: this.generateReminderContent(appointment, patient, "2_hour")
    };

    reminders.push(reminder24h, reminder2h);

    // Send notifications about scheduled reminders
    for (const reminder of reminders) {
      if (reminder.scheduledFor > new Date()) {
        await storage.createNotification({
          organizationId,
          userId: appointment.providerId,
          title: "Appointment Reminder Scheduled",
          message: `Automated reminder scheduled for ${patient.firstName} ${patient.lastName}'s appointment`,
          type: "appointment_reminder",
          priority: "low",
          status: "unread",
          isActionable: false,
          relatedEntityType: "appointment",
          relatedEntityId: appointmentId,
          scheduledFor: reminder.scheduledFor,
          metadata: {
            patientId: appointment.patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            appointmentId,
            reminderType: reminder.reminderType,
            department: "Administrative"
          }
        });
      }
    }

    return reminders;
  }

  /**
   * Optimizes provider schedules for maximum efficiency
   */
  async optimizeProviderSchedule(providerId: number, organizationId: number, date: Date): Promise<Appointment[]> {
    const appointments = await storage.getAppointmentsByProvider(providerId, organizationId, date);
    if (appointments.length <= 1) return appointments;

    // Sort appointments by type priority (urgent first, then by appointment type)
    const prioritizedAppointments = appointments.sort((a, b) => {
      const priorityA = this.getAppointmentPriority(a);
      const priorityB = this.getAppointmentPriority(b);
      return priorityB - priorityA;
    });

    // Suggest schedule optimizations
    const optimizations = this.generateScheduleOptimizations(prioritizedAppointments);
    
    if (optimizations.length > 0) {
      await storage.createNotification({
        organizationId,
        userId: providerId,
        title: "Schedule Optimization Available",
        message: `${optimizations.length} potential improvements found for your schedule`,
        type: "schedule_optimization",
        priority: "low",
        status: "unread",
        isActionable: true,
        actionUrl: `/calendar/optimize/${date.toISOString().split('T')[0]}`,
        metadata: {
          providerId,
          optimizationDate: date.toISOString(),
          optimizationCount: optimizations.length,
          department: "Scheduling"
        }
      });
    }

    return prioritizedAppointments;
  }

  /**
   * Analyzes appointment patterns and suggests improvements
   */
  async analyzeAppointmentPatterns(organizationId: number): Promise<any> {
    const allAppointments = await storage.getAppointmentsByOrganization(organizationId);
    
    const patterns = {
      averageDuration: this.calculateAverageDuration(allAppointments),
      peakHours: this.identifyPeakHours(allAppointments),
      noShowRate: this.calculateNoShowRate(allAppointments),
      cancellationRate: this.calculateCancellationRate(allAppointments),
      mostCommonTypes: this.getMostCommonAppointmentTypes(allAppointments),
      recommendations: []
    };

    // Generate recommendations based on patterns
    if (patterns.noShowRate > 0.15) {
      patterns.recommendations.push("High no-show rate detected. Consider implementing reminder systems and deposit policies.");
    }

    if (patterns.cancellationRate > 0.20) {
      patterns.recommendations.push("High cancellation rate. Review booking policies and implement waitlist management.");
    }

    return patterns;
  }

  private checkTimeSlotConflict(start: Date, end: Date, existingAppointments: Appointment[]): boolean {
    return existingAppointments.some(appointment => {
      const appointmentEnd = new Date(appointment.scheduledAt.getTime() + appointment.duration * 60 * 1000);
      return this.timeRangesOverlap(start, end, appointment.scheduledAt, appointmentEnd);
    });
  }

  private timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  private async calculateTimeSlotScore(time: Date, providerId: number, patientId: number | undefined, organizationId: number): Promise<number> {
    let score = 50; // Base score

    const hour = time.getHours();
    
    // Morning slots generally preferred
    if (hour >= 9 && hour <= 11) score += 20;
    // Early afternoon
    else if (hour >= 13 && hour <= 15) score += 15;
    // Late morning
    else if (hour >= 11 && hour <= 13) score += 10;
    // Late afternoon
    else score += 5;

    // Avoid lunch time
    if (hour === 12) score -= 15;

    // Consider patient preference if available
    if (patientId) {
      const patientPreference = await this.getPatientTimePreference(patientId, organizationId);
      if (patientPreference === "morning" && hour < 12) score += 10;
      else if (patientPreference === "afternoon" && hour >= 12 && hour < 17) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async getPatientTimePreference(patientId: number | undefined, organizationId: number): Promise<"morning" | "afternoon" | "evening" | "flexible"> {
    // In a real system, this would be based on patient preference data
    return "flexible";
  }

  private getScoreReasons(time: Date, score: number): string[] {
    const reasons: string[] = [];
    const hour = time.getHours();

    if (hour >= 9 && hour <= 11) reasons.push("Optimal morning time slot");
    if (hour === 12) reasons.push("Lunch time - may cause delays");
    if (score > 70) reasons.push("High efficiency time slot");
    
    return reasons;
  }

  private async getProviderEfficiency(providerId: number, time: Date): Promise<number> {
    // Simulate provider efficiency based on time of day
    const hour = time.getHours();
    if (hour >= 9 && hour <= 11) return 95;
    if (hour >= 14 && hour <= 16) return 90;
    if (hour >= 11 && hour <= 14) return 85;
    return 80;
  }

  private async getAppointmentsByLocation(location: string, organizationId: number, date: Date): Promise<Appointment[]> {
    const allAppointments = await storage.getAppointmentsByOrganization(organizationId, date);
    return allAppointments.filter(apt => apt.location === location);
  }

  private async sendRescheduleNotification(appointment: Appointment, newTime: Date, reason: string, organizationId: number): Promise<void> {
    const patient = await storage.getPatient(appointment.patientId, organizationId);
    if (!patient) return;

    await storage.createNotification({
      organizationId,
      userId: appointment.providerId,
      title: "Appointment Rescheduled",
      message: `Appointment with ${patient.firstName} ${patient.lastName} rescheduled to ${newTime.toLocaleString()}. Reason: ${reason}`,
      type: "appointment_update",
      priority: "normal",
      status: "unread",
      isActionable: true,
      actionUrl: `/appointments/${appointment.id}`,
      relatedEntityType: "appointment",
      relatedEntityId: appointment.id,
      metadata: {
        patientId: appointment.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        appointmentId: appointment.id,
        newTime: newTime.toISOString(),
        rescheduleReason: reason,
        department: "Scheduling"
      }
    });
  }

  private generateReminderContent(appointment: Appointment, patient: Patient, reminderType: string): string {
    const timeStr = new Date(appointment.scheduledAt).toLocaleString();
    
    switch (reminderType) {
      case "24_hour":
        return `Dear ${patient.firstName}, this is a reminder that you have an appointment tomorrow at ${timeStr} for ${appointment.title}. Please arrive 15 minutes early.`;
      case "2_hour":
        return `Hi ${patient.firstName}, your appointment is in 2 hours at ${timeStr}. Location: ${appointment.location || "Main clinic"}`;
      default:
        return `Appointment reminder: ${timeStr}`;
    }
  }

  private getAppointmentPriority(appointment: Appointment): number {
    if (appointment.type === "emergency") return 100;
    if (appointment.type === "urgent") return 80;
    if (appointment.type === "follow_up") return 60;
    if (appointment.type === "consultation") return 50;
    if (appointment.type === "routine") return 30;
    return 40;
  }

  private generateScheduleOptimizations(appointments: Appointment[]): string[] {
    const optimizations: string[] = [];
    
    // Check for gaps that could be consolidated
    for (let i = 0; i < appointments.length - 1; i++) {
      const current = appointments[i];
      const next = appointments[i + 1];
      const gap = next.scheduledAt.getTime() - (current.scheduledAt.getTime() + current.duration * 60 * 1000);
      
      if (gap > 30 * 60 * 1000) { // More than 30 minutes gap
        optimizations.push(`Large gap between appointments ${i + 1} and ${i + 2}`);
      }
    }

    return optimizations;
  }

  private calculateAverageDuration(appointments: Appointment[]): number {
    if (appointments.length === 0) return 0;
    const total = appointments.reduce((sum, apt) => sum + apt.duration, 0);
    return total / appointments.length;
  }

  private identifyPeakHours(appointments: Appointment[]): number[] {
    const hourCounts: { [hour: number]: number } = {};
    
    appointments.forEach(apt => {
      const hour = new Date(apt.scheduledAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private calculateNoShowRate(appointments: Appointment[]): number {
    const noShows = appointments.filter(apt => apt.status === "no_show").length;
    return appointments.length > 0 ? noShows / appointments.length : 0;
  }

  private calculateCancellationRate(appointments: Appointment[]): number {
    const cancelled = appointments.filter(apt => apt.status === "cancelled").length;
    return appointments.length > 0 ? cancelled / appointments.length : 0;
  }

  private getMostCommonAppointmentTypes(appointments: Appointment[]): string[] {
    const typeCounts: { [type: string]: number } = {};
    
    appointments.forEach(apt => {
      typeCounts[apt.type] = (typeCounts[apt.type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);
  }
}

export const appointmentScheduler = new AppointmentScheduler();