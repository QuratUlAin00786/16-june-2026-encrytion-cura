import { storage } from "../storage";
import { messagingService } from "../messaging-service";
import type { PatientCommunication } from "@shared/schema";

class SmsScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.intervalId) {
      return;
    }

    console.log("[SMS Scheduler] Starting scheduler - checking every 30 seconds");
    
    this.intervalId = setInterval(() => {
      this.processScheduledMessages();
    }, 30000);

    this.processScheduledMessages();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[SMS Scheduler] Stopped");
    }
  }

  async processScheduledMessages() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const scheduledMessages = await storage.getScheduledCommunications();
      
      if (scheduledMessages.length > 0) {
        console.log(`[SMS Scheduler] Found ${scheduledMessages.length} scheduled message(s) to process`);
      }

      for (const message of scheduledMessages) {
        await this.sendScheduledMessage(message);
      }
    } catch (error) {
      console.error("[SMS Scheduler] Error processing scheduled messages:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async sendScheduledMessage(communication: PatientCommunication) {
    try {
      console.log(`[SMS Scheduler] Processing scheduled message ID: ${communication.id}`);

      const patient = await storage.getPatient(communication.patientId, communication.organizationId);
      
      if (!patient) {
        console.error(`[SMS Scheduler] Patient not found for communication ID: ${communication.id}`);
        await storage.updatePatientCommunication(communication.id, communication.organizationId, {
          status: "failed",
          errorMessage: "Patient not found"
        });
        return;
      }

      if (!patient.phone) {
        console.error(`[SMS Scheduler] No phone number for patient ${patient.firstName} ${patient.lastName}`);
        await storage.updatePatientCommunication(communication.id, communication.organizationId, {
          status: "failed",
          errorMessage: "No phone number available"
        });
        return;
      }

      let result;
      
      if (communication.method === 'phone') {
        // Voice call via Twilio TTS
        console.log(`[SMS Scheduler] Initiating voice call for message ID: ${communication.id}`);
        result = await messagingService.makeVoiceCall(patient.phone, communication.message);
      } else {
        // SMS or WhatsApp
        result = await messagingService.sendMessage({
          to: patient.phone,
          message: communication.message,
          type: communication.method as 'sms' | 'whatsapp'
        });
      }

      if (result.success) {
        const actionType = communication.method === 'phone' ? 'voice call' : 'message';
        console.log(`[SMS Scheduler] Successfully sent scheduled ${actionType} ID: ${communication.id} to ${patient.phone}`);
        
        await storage.updatePatientCommunication(communication.id, communication.organizationId, {
          status: "sent",
          sentAt: new Date(),
          metadata: {
            ...(communication.metadata as object || {}),
            messageSent: true,
            messageId: result.messageId,
            provider: "Twilio"
          }
        });
      } else {
        console.error(`[SMS Scheduler] Failed to send scheduled message ID: ${communication.id} - ${result.error}`);
        
        await storage.updatePatientCommunication(communication.id, communication.organizationId, {
          status: "failed",
          errorMessage: result.error || "Failed to send message"
        });
      }
    } catch (error) {
      console.error(`[SMS Scheduler] Error sending scheduled message ID: ${communication.id}:`, error);
      
      await storage.updatePatientCommunication(communication.id, communication.organizationId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}

export const smsScheduler = new SmsScheduler();
