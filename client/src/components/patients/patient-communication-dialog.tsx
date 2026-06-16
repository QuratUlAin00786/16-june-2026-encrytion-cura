import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Flag, Bell, Mail, MessageSquare, Phone, Clock, 
  AlertTriangle, CheckCircle, XCircle, Send, Calendar,
  History, Settings
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Patient, PatientCommunication } from "@shared/schema";

interface PatientCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  mode: "flag" | "reminder";
}

const COMMUNICATION_TYPES = {
  appointment_reminder: "Appointment Reminder",
  medication_reminder: "Medication Reminder", 
  follow_up_reminder: "Follow-up Reminder",
  billing_notice: "Billing Notice",
  health_check: "Health Check-in",
  emergency_alert: "Emergency Alert",
  preventive_care: "Preventive Care Reminder"
};

const COMMUNICATION_METHODS = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  phone: { label: "Phone Call", icon: Phone }
};

const FLAG_TYPES = {
  medical_alert: "Medical Alert",
  allergy_warning: "Allergy Warning",
  medication_interaction: "Medication Interaction",
  high_risk: "High Risk Patient",
  special_needs: "Special Needs",
  insurance_issue: "Insurance Issue",
  payment_overdue: "Payment Overdue",
  follow_up_required: "Follow-up Required"
};

const VOICE_CALL_SCRIPTS: Record<string, string> = {
  appointment_reminder: "Hello, this is a friendly reminder from Cura about your upcoming appointment. Please contact us if you need to reschedule or have any questions. Thank you!",
  medication_reminder: "Hello, this is a reminder from Cura to take your medication as prescribed. Please follow your doctor's instructions carefully. If you have any concerns, please contact your healthcare provider. Stay healthy!",
  follow_up_reminder: "Hello, this is a follow-up reminder from Cura. We want to check in with you regarding your recent appointment or treatment. Please feel free to contact us if you have any questions or need further assistance.",
  billing_notice: "Hello, this is a billing notice from Cura. Your payment for the recent service is due soon. Please ensure timely payment to avoid any interruptions in service. Thank you for your prompt attention.",
  health_check: "Hello, this is a health check-in call from Cura. We are reaching out to see how you are doing and to offer any support you may need. Please contact us if you have any health concerns or require assistance.",
  emergency_alert: "Attention, this is an important emergency alert from Cura. Please take immediate action as advised by your healthcare provider. If you require urgent assistance, call emergency services or contact us right away.",
  preventive_care: "Hello, this is a preventive care reminder from Cura. It's time to schedule your regular health screening or check-up. Please contact us to book an appointment and stay proactive about your health."
};

const SMS_MESSAGE_TEMPLATES: Record<string, string> = {
  appointment_reminder: "Hello [Patient Name], this is a friendly reminder from Cura Healthcare EMR about your upcoming appointment on [Date] at [Time]. Please contact us at [Contact Number] if you need to reschedule or have any questions. Thank you!",
  medication_reminder: "Hello [Patient Name], this is a reminder from Cura Healthcare EMR to take your medication as prescribed. Please follow your doctor's instructions carefully. If you have any concerns, please contact your healthcare provider at [Contact Number]. Stay healthy!",
  follow_up_reminder: "Hello [Patient Name], this is a follow-up reminder from Cura Healthcare EMR regarding your recent appointment or treatment. Please feel free to contact us at [Contact Number] if you have any questions or need further assistance.",
  billing_notice: "Hello [Patient Name], this is a billing notice from Cura Healthcare EMR. Your payment for the recent service is due on [Due Date]. Please ensure timely payment to avoid any interruptions in service. Contact us at [Contact Number] for assistance.",
  health_check: "Hello [Patient Name], this is a health check-in call from Cura Healthcare EMR. We are reaching out to see how you are doing and to offer any support you may need. Please contact us at [Contact Number] if you have any health concerns or require assistance.",
  emergency_alert: "Attention [Patient Name], this is an important emergency alert from Cura Healthcare EMR. Please take immediate action as advised by your healthcare provider. If you require urgent assistance, call emergency services or contact us at [Contact Number] immediately.",
  preventive_care: "Hello [Patient Name], this is a preventive care reminder from Cura Healthcare EMR. It's time to schedule your regular health screening or check-up. Please contact us at [Contact Number] to book an appointment and stay proactive about your health."
};

const EMAIL_MESSAGE_TEMPLATES: Record<string, string> = {
  appointment_reminder: "Dear [Patient Name],\n\nThis is a friendly reminder from Cura Healthcare EMR about your upcoming appointment scheduled on [Date] at [Time].\n\nPlease contact us at [Contact Number] if you need to reschedule or have any questions.\n\nThank you for choosing Cura Healthcare.\n\nBest regards,\nCura Healthcare Team",
  medication_reminder: "Dear [Patient Name],\n\nThis is a reminder from Cura Healthcare EMR to take your medication as prescribed by your doctor.\n\nPlease follow your doctor's instructions carefully. If you have any concerns or questions about your medication, please contact your healthcare provider at [Contact Number].\n\nStay healthy!\n\nBest regards,\nCura Healthcare Team",
  follow_up_reminder: "Dear [Patient Name],\n\nThis is a follow-up reminder from Cura Healthcare EMR regarding your recent appointment or treatment.\n\nWe want to ensure your recovery is progressing well. Please feel free to contact us at [Contact Number] if you have any questions or need further assistance.\n\nBest regards,\nCura Healthcare Team",
  billing_notice: "Dear [Patient Name],\n\nThis is a billing notice from Cura Healthcare EMR.\n\nYour payment for the recent service is due on [Due Date]. Please ensure timely payment to avoid any interruptions in service.\n\nFor any billing queries or assistance, please contact us at [Contact Number].\n\nThank you for your prompt attention.\n\nBest regards,\nCura Healthcare Billing Team",
  health_check: "Dear [Patient Name],\n\nThis is a health check-in from Cura Healthcare EMR.\n\nWe are reaching out to see how you are doing and to offer any support you may need. Your wellbeing is important to us.\n\nPlease contact us at [Contact Number] if you have any health concerns or require assistance.\n\nBest regards,\nCura Healthcare Team",
  emergency_alert: "URGENT - Dear [Patient Name],\n\nThis is an important emergency alert from Cura Healthcare EMR.\n\nPlease take immediate action as advised by your healthcare provider. If you require urgent assistance, call emergency services immediately or contact us at [Contact Number].\n\nYour health and safety are our priority.\n\nBest regards,\nCura Healthcare Team",
  preventive_care: "Dear [Patient Name],\n\nThis is a preventive care reminder from Cura Healthcare EMR.\n\nIt's time to schedule your regular health screening or check-up. Preventive care is essential for maintaining good health and detecting potential issues early.\n\nPlease contact us at [Contact Number] to book an appointment and stay proactive about your health.\n\nBest regards,\nCura Healthcare Team"
};

const WHATSAPP_MESSAGE_TEMPLATES: Record<string, string> = {
  appointment_reminder: "Hello [Patient Name], this is a WhatsApp reminder from Cura Healthcare about your upcoming appointment on [Date] at [Time]. Please reply to this message or contact us at [Contact Number] if you need to reschedule. Thank you!",
  medication_reminder: "Hello [Patient Name], this is a WhatsApp reminder from Cura Healthcare to take your medication as prescribed. If you have any concerns, please contact your healthcare provider at [Contact Number]. Stay healthy!",
  follow_up_reminder: "Hello [Patient Name], this is a follow-up message from Cura Healthcare regarding your recent appointment or treatment. Please reply to this message or contact us at [Contact Number] if you have any questions.",
  billing_notice: "Hello [Patient Name], this is a billing notice from Cura Healthcare. Your payment for the recent service is due on [Due Date]. Please contact us at [Contact Number] for assistance.",
  health_check: "Hello [Patient Name], this is a health check-in from Cura Healthcare. We are reaching out to see how you are doing. Please reply to this message or contact us at [Contact Number] if you need any assistance.",
  emergency_alert: "URGENT [Patient Name]: This is an important alert from Cura Healthcare. Please take immediate action as advised by your healthcare provider. If you require urgent assistance, call emergency services or contact us at [Contact Number] immediately.",
  preventive_care: "Hello [Patient Name], this is a preventive care reminder from Cura Healthcare. It's time to schedule your regular health screening or check-up. Please contact us at [Contact Number] to book an appointment."
};


const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)", offset: 0 },
  { value: "Europe/London", label: "London (GMT/BST)", offset: 0 },
  { value: "Europe/Paris", label: "Paris (CET/CEST)", offset: 1 },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)", offset: 1 },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: 4 },
  { value: "Asia/Karachi", label: "Pakistan (PKT)", offset: 5 },
  { value: "Asia/Kolkata", label: "India (IST)", offset: 5.5 },
  { value: "Asia/Dhaka", label: "Bangladesh (BST)", offset: 6 },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)", offset: 7 },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: 8 },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: 9 },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", offset: 10 },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", offset: 12 },
  { value: "America/New_York", label: "New York (EST/EDT)", offset: -5 },
  { value: "America/Chicago", label: "Chicago (CST/CDT)", offset: -6 },
  { value: "America/Denver", label: "Denver (MST/MDT)", offset: -7 },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)", offset: -8 },
];

export function PatientCommunicationDialog({ open, onOpenChange, patient, mode }: PatientCommunicationDialogProps) {
  const [selectedType, setSelectedType] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [message, setMessage] = useState("");
  const [flagType, setFlagType] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [flagSeverity, setFlagSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState("Europe/London");
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert local time in selected timezone to UTC ISO string
  // Uses proper timezone handling to account for DST
  const convertToUTC = (localDateTime: string, timezone: string): string => {
    if (!localDateTime) return "";
    
    const tz = TIMEZONES.find(t => t.value === timezone);
    if (!tz) return localDateTime;
    
    try {
      // Parse the local datetime-local value (format: YYYY-MM-DDTHH:mm)
      const [datePart, timePart] = localDateTime.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Use iterative approach to find the correct UTC time
      // We want to find the UTC time that, when displayed in the target timezone, equals our input
      let candidateUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes));
      
      // Iterate to find the correct UTC time (usually converges in 1-2 iterations)
      for (let i = 0; i < 3; i++) {
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: tz.value,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const parts = formatter.formatToParts(candidateUTC);
        const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
        const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
        const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
        const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        
        // Check if we've found the correct time
        if (tzYear === year && tzMonth === month && tzDay === day && 
            tzHour === hours && tzMinute === minutes) {
          return candidateUTC.toISOString();
        }
        
        // Calculate the difference and adjust
        const targetLocal = new Date(year, month - 1, day, hours, minutes);
        const displayedLocal = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
        const diffMs = targetLocal.getTime() - displayedLocal.getTime();
        candidateUTC = new Date(candidateUTC.getTime() + diffMs);
      }
      
      return candidateUTC.toISOString();
    } catch (error) {
      console.error("Error converting timezone:", error);
      // Fallback: use offset-based calculation (may not handle DST perfectly)
      const [datePart, timePart] = localDateTime.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes);
      const utcTime = localDate.getTime() - (tz.offset * 60 * 60 * 1000);
      return new Date(utcTime).toISOString();
    }
  };

  // Get the display time info for the selected schedule
  const getScheduleInfo = (): string => {
    if (!scheduledFor) return "";
    const tz = TIMEZONES.find(t => t.value === selectedTimezone);
    if (!tz) return "";
    
    const utcTime = convertToUTC(scheduledFor, selectedTimezone);
    const utcDate = new Date(utcTime);
    const utcFormatted = `${utcDate.getUTCHours().toString().padStart(2, '0')}:${utcDate.getUTCMinutes().toString().padStart(2, '0')} UTC`;
    
    return `Will be sent at ${scheduledFor.split('T')[1]} ${tz.label.split(' ')[0]} (${utcFormatted})`;
  };

  // Get current date/time in the selected timezone for display
  // Uses actual timezone to handle DST automatically
  const getCurrentTimeInTimezone = (): string => {
    const tz = TIMEZONES.find(t => t.value === selectedTimezone);
    if (!tz) return "";
    
    try {
      const now = new Date();
      
      // Use Intl.DateTimeFormat to get accurate time in the selected timezone
      // This automatically handles DST (Daylight Saving Time)
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz.value,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const hours = parts.find(p => p.type === 'hour')?.value || '00';
      const minutes = parts.find(p => p.type === 'minute')?.value || '00';
      const day = parts.find(p => p.type === 'day')?.value || '01';
      const month = parts.find(p => p.type === 'month')?.value || '01';
      const year = parts.find(p => p.type === 'year')?.value || '2024';
      
      // Get timezone abbreviation (e.g., GMT, BST, PKT)
      const tzFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz.value,
        timeZoneName: 'short'
      });
      const tzParts = tzFormatter.formatToParts(now);
      const tzName = tzParts.find(p => p.type === 'timeZoneName')?.value || '';
      
      return `Current time in ${tz.label.split(' ')[0]}: ${hours}:${minutes} (${day}/${month}/${year}) ${tzName}`;
    } catch (error) {
      console.error("Error getting timezone time:", error);
      // Fallback to simple calculation if Intl fails
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const tzTime = new Date(utcTime + (tz.offset * 3600000));
      
      const hours = tzTime.getHours().toString().padStart(2, '0');
      const minutes = tzTime.getMinutes().toString().padStart(2, '0');
      const day = tzTime.getDate().toString().padStart(2, '0');
      const month = (tzTime.getMonth() + 1).toString().padStart(2, '0');
      const year = tzTime.getFullYear();
      
      return `Current time in ${tz.label.split(' ')[0]}: ${hours}:${minutes} (${day}/${month}/${year})`;
    }
  };

  // Get minimum datetime value for the selected timezone
  const getMinDatetimeValue = (): string => {
    const tz = TIMEZONES.find(t => t.value === selectedTimezone);
    if (!tz) return "";
    
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const tzTime = new Date(utcTime + (tz.offset * 3600000));
    
    const year = tzTime.getFullYear();
    const month = (tzTime.getMonth() + 1).toString().padStart(2, '0');
    const day = tzTime.getDate().toString().padStart(2, '0');
    const hours = tzTime.getHours().toString().padStart(2, '0');
    const minutes = tzTime.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Fetch patient communications history
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/communications`],
    enabled: !!patient?.id && open,
  });

  // Type-safe access to communications - filter out any invalid/null entries
  const communicationsList = Array.isArray(communications) 
    ? (communications as any[]).filter(comm => comm && comm.id && comm.type && comm.message)
    : [];

  // Check for recent reminders to prevent spam
  const { data: lastReminder } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'last-reminder', selectedType],
    enabled: false, // Disabled because endpoint doesn't exist yet
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/patients/${patient?.id}/send-reminder`, data);
    },
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Patient reminder has been sent successfully. Check Communication History below.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient?.id}/communications`] });
      resetForm();
      // Don't close the dialog so user can see the updated communication history
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    }
  });

  // Create flag mutation
  const createFlagMutation = useMutation({
    mutationFn: async (data: any) => {
      // Get patient ID - check both id and patientId fields
      const patientId = patient?.id || patient?.patientId;
      
      if (!patientId) {
        throw new Error("Patient ID is required");
      }
      
      // Ensure patientId is a number
      const numericPatientId = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
      
      if (isNaN(numericPatientId)) {
        throw new Error("Invalid patient ID format");
      }
      
      return apiRequest('POST', `/api/patients/${numericPatientId}/flags`, data);
    },
    onSuccess: () => {
      toast({
        title: "Flag Created",
        description: "Patient flag has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Flag creation error:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create flag. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedType("");
    setSelectedMethod("");
    setMessage("");
    setFlagType("");
    setFlagReason("");
    setFlagSeverity("medium");
    setScheduledFor("");
    setSelectedTimezone("Europe/London");
  };

  const handleSendReminder = () => {
    if (!selectedType || !selectedMethod || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Convert scheduled time to UTC if provided
    const scheduledForUTC = scheduledFor ? convertToUTC(scheduledFor, selectedTimezone) : null;
    
    sendReminderMutation.mutate({
      type: selectedType,
      method: selectedMethod,
      message: message.trim(),
      scheduledFor: scheduledForUTC,
      timezone: selectedTimezone,
      metadata: {
        urgency: getUrgencyLevel(selectedType),
        reminderType: selectedType,
        localTime: scheduledFor || null,
        timezone: selectedTimezone
      }
    });
  };

  // Check if a flag type already exists for this patient
  const checkFlagExists = (flagTypeToCheck: string): boolean => {
    if (!patient?.flags || !Array.isArray(patient.flags) || !flagTypeToCheck) {
      return false;
    }
    
    return patient.flags.some((flag: string) => {
      const flagParts = flag.split(":");
      const [category] = flagParts;
      return category === flagTypeToCheck;
    });
  };

  const handleCreateFlag = () => {
    // Get patient ID - check both id and patientId fields
    const patientId = patient?.id || patient?.patientId;
    
    if (!patientId) {
      toast({
        title: "Error",
        description: "Patient information is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!flagType || !flagReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select flag type and provide reason",
        variant: "destructive",
      });
      return;
    }

    // Check if flag type already exists
    if (checkFlagExists(flagType)) {
      toast({
        title: "Flag Already Exists",
        description: "This patient already has a flag of this type. Please select a different flag type.",
        variant: "destructive",
      });
      return;
    }

    createFlagMutation.mutate({
      type: flagType,
      reason: flagReason.trim(),
      severity: flagSeverity
    });
  };

  const getUrgencyLevel = (type: string): "low" | "medium" | "high" => {
    const highUrgency = ["emergency_alert", "medication_reminder"];
    const mediumUrgency = ["appointment_reminder", "follow_up_reminder"];
    return highUrgency.includes(type) ? "high" : mediumUrgency.includes(type) ? "medium" : "low";
  };

  const getFlagSeverity = (type: string): "low" | "medium" | "high" | "critical" => {
    const critical = ["medical_alert", "allergy_warning"];
    const high = ["medication_interaction", "high_risk"];
    const medium = ["special_needs", "follow_up_required"];
    return critical.includes(type) ? "critical" : high.includes(type) ? "high" : medium.includes(type) ? "medium" : "low";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "delivered": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "scheduled": return <Calendar className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "sent": return "Sent";
      case "delivered": return "Delivered";
      case "failed": return "Failed";
      case "pending": return "Pending";
      case "scheduled": return "Scheduled";
      default: return status;
    }
  };

  // Format date with timezone conversion - convert from UTC to the timezone stored in metadata
  const formatDateWithTimezone = (dateString: string, formatStr: string, metadata?: any) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Get timezone from metadata, or default to UTC if not available
      const timezone = (metadata && typeof metadata === 'object' && metadata.timezone) ? metadata.timezone : 'UTC';
      
      // Find the timezone info
      const tz = TIMEZONES.find(t => t.value === timezone);
      if (!tz) {
        // Fallback to simple format if timezone not found
        return format(date, formatStr);
      }
      
      // Use Intl.DateTimeFormat to convert UTC to the target timezone
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz.value,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
        year: formatStr.includes('yyyy') ? 'numeric' : undefined,
        hour12: false
      });
      
      const parts = formatter.formatToParts(date);
      const hours = parts.find(p => p.type === 'hour')?.value || '00';
      const minutes = parts.find(p => p.type === 'minute')?.value || '00';
      const day = parts.find(p => p.type === 'day')?.value || '01';
      const month = parts.find(p => p.type === 'month')?.value || 'Jan';
      const year = parts.find(p => p.type === 'year')?.value || '2024';
      
      if (formatStr === 'MMM dd, HH:mm') {
        return `${month} ${day}, ${hours}:${minutes}`;
      } else if (formatStr === 'MMM dd, yyyy HH:mm') {
        return `${month} ${day}, ${year} ${hours}:${minutes}`;
      }
      
      return format(date, formatStr);
    } catch (error) {
      console.error("Error formatting date with timezone:", error);
      // Fallback to original format function if parsing fails
      return format(new Date(dateString), formatStr);
    }
  };

  // Format date without timezone conversion - display exactly as stored (for backward compatibility)
  const formatDateWithoutTimezone = (dateString: string, formatStr: string) => {
    if (!dateString) return '';
    // Parse the date string and extract components without timezone conversion
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month, 10) - 1];
      
      if (formatStr === 'MMM dd, HH:mm') {
        return `${monthName} ${day}, ${hour}:${minute}`;
      } else if (formatStr === 'MMM dd, yyyy HH:mm') {
        return `${monthName} ${day}, ${year} ${hour}:${minute}`;
      }
    }
    // Fallback to original format function if parsing fails
    return format(new Date(dateString), formatStr);
  };

  const canSendReminder = () => {
    // Always allow sending reminders (rate limiting disabled until backend endpoint is implemented)
    return true;
  };

  // Auto-set severity based on flag type, but allow user to override
  useEffect(() => {
    if (flagType) {
      setFlagSeverity(getFlagSeverity(flagType));
    }
  }, [flagType]);

  // Auto-populate message templates based on communication method and reminder type
  useEffect(() => {
    if (selectedMethod === 'phone' && selectedType && VOICE_CALL_SCRIPTS[selectedType]) {
      setMessage(VOICE_CALL_SCRIPTS[selectedType]);
    } else if (selectedMethod === 'sms' && selectedType && SMS_MESSAGE_TEMPLATES[selectedType]) {
      // Replace [Patient Name] with actual patient name if available
      let template = SMS_MESSAGE_TEMPLATES[selectedType];
      if (patient) {
        template = template.replace('[Patient Name]', `${patient.firstName} ${patient.lastName}`);
      }
      setMessage(template);
    } else if (selectedMethod === 'whatsapp' && selectedType && WHATSAPP_MESSAGE_TEMPLATES[selectedType]) {
      // Replace [Patient Name] with actual patient name if available
      let template = WHATSAPP_MESSAGE_TEMPLATES[selectedType];
      if (patient) {
        template = template.replace('[Patient Name]', `${patient.firstName} ${patient.lastName}`);
      }
      setMessage(template);
    } else if (selectedMethod === 'email' && selectedType && EMAIL_MESSAGE_TEMPLATES[selectedType]) {
      // Replace [Patient Name] with actual patient name if available
      let template = EMAIL_MESSAGE_TEMPLATES[selectedType];
      if (patient) {
        template = template.replace('[Patient Name]', `${patient.firstName} ${patient.lastName}`);
      }
      setMessage(template);
    }
  }, [selectedMethod, selectedType, patient]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Update current time display when timezone changes and keep it live
  useEffect(() => {
    if (!open) return;
    
    // Update immediately
    const updateTime = () => {
      const tz = TIMEZONES.find(t => t.value === selectedTimezone);
      if (!tz) {
        setCurrentTimeDisplay("");
        return;
      }
      
      try {
        const now = new Date();
        
        // Use Intl.DateTimeFormat to get accurate time in the selected timezone
        // This automatically handles DST (Daylight Saving Time)
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz.value,
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const hours = parts.find(p => p.type === 'hour')?.value || '00';
        const minutes = parts.find(p => p.type === 'minute')?.value || '00';
        const day = parts.find(p => p.type === 'day')?.value || '01';
        const month = parts.find(p => p.type === 'month')?.value || '01';
        const year = parts.find(p => p.type === 'year')?.value || '2024';
        
        // Get timezone abbreviation (e.g., GMT, BST, PKT)
        const tzFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz.value,
          timeZoneName: 'short'
        });
        const tzParts = tzFormatter.formatToParts(now);
        const tzName = tzParts.find(p => p.type === 'timeZoneName')?.value || '';
        
        setCurrentTimeDisplay(`Current time in ${tz.label.split(' ')[0]}: ${hours}:${minutes} (${day}/${month}/${year}) ${tzName}`);
      } catch (error) {
        console.error("Error getting timezone time:", error);
        setCurrentTimeDisplay("");
      }
    };
    
    // Update immediately
    updateTime();
    
    // Update every second to show live time
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [selectedTimezone, open]);

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "flag" ? (
              <>
                <Flag className="h-5 w-5 text-red-500" />
                Flag Patient: {patient.firstName} {patient.lastName}
              </>
            ) : (
              <>
                <Bell className="h-5 w-5 text-blue-500" />
                Send Reminder: {patient.firstName} {patient.lastName}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Form */}
          <div className="space-y-4">
            {mode === "reminder" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reminder-type">Reminder Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reminder type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMUNICATION_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communication-method">Communication Method</Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMUNICATION_METHODS).map(([key, { label, icon: Icon }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    {selectedMethod === 'phone' ? 'Voice Call Script (Text-to-Speech)' : 'Message'}
                  </Label>
                  {selectedMethod === 'phone' && (
                    <Alert className="mb-2">
                      <Phone className="h-4 w-4" />
                      <AlertDescription>
                        This message will be read aloud via Text-to-Speech when the call connects.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={selectedMethod === 'phone' 
                      ? "Enter the voice call script to be read aloud..." 
                      : "Enter your reminder message..."}
                    rows={selectedMethod === 'phone' ? 6 : 4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-timezone">Recipient's Time Zone</Label>
                  <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value} data-testid={`option-tz-${tz.value}`}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-for">Schedule For (Optional)</Label>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                    {currentTimeDisplay || getCurrentTimeInTimezone()}
                  </p>
                  <input
                    type="datetime-local"
                    id="scheduled-for"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={getMinDatetimeValue()}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    data-testid="input-scheduled-for"
                  />
                  {scheduledFor && (
                    <p className="text-xs text-muted-foreground">
                      {getScheduleInfo()}
                    </p>
                  )}
                </div>

                {/* Message Preview */}
                {selectedType && selectedMethod && message && (
                  <div className="space-y-2">
                    <div className="p-3 border rounded-md space-y-2 border-l-4 border-l-purple-500">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-purple-500" />
                          <Badge variant="default" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Email
                          </Badge>
                          <span className="font-medium">
                            {COMMUNICATION_TYPES[selectedType as keyof typeof COMMUNICATION_TYPES] || selectedType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-500">
                            {scheduledFor ? (() => {
                              const tz = TIMEZONES.find(t => t.value === selectedTimezone);
                              if (!tz) return '';
                              try {
                                const date = new Date(scheduledFor);
                                const formatter = new Intl.DateTimeFormat('en-GB', {
                                  timeZone: tz.value,
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: 'short',
                                  hour12: false
                                });
                                return formatter.format(date);
                              } catch {
                                const [datePart, timePart] = scheduledFor.split('T');
                                const [year, month, day] = datePart.split('-');
                                const [hours, minutes] = timePart.split(':');
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${hours}:${minutes}`;
                              }
                            })() : (() => {
                              const tz = TIMEZONES.find(t => t.value === selectedTimezone);
                              if (!tz) return '';
                              const now = new Date();
                              try {
                                const formatter = new Intl.DateTimeFormat('en-GB', {
                                  timeZone: tz.value,
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: 'short',
                                  hour12: false
                                });
                                return formatter.format(now);
                              } catch {
                                return format(now, 'MMM dd, HH:mm');
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {(() => {
                          let formattedMessage = message;
                          const tz = TIMEZONES.find(t => t.value === selectedTimezone);
                          const countryName = tz ? tz.label.split(' ')[0] : '';
                          
                          // Replace [Date] and [Time] with actual scheduled date/time or current time
                          if (scheduledFor) {
                            try {
                              const date = new Date(scheduledFor);
                              const formatter = new Intl.DateTimeFormat('en-GB', {
                                timeZone: tz?.value || 'UTC',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                              const formatted = formatter.format(date);
                              const [datePart, timePart] = formatted.split(', ');
                              formattedMessage = formattedMessage.replace(/\[Date\]/g, datePart || '[Date]');
                              formattedMessage = formattedMessage.replace(/\[Time\]/g, timePart ? `${timePart} (${countryName})` : '[Time]');
                            } catch {
                              const [datePart, timePart] = scheduledFor.split('T');
                              const [year, month, day] = datePart.split('-');
                              const [hours, minutes] = timePart.split(':');
                              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                              formattedMessage = formattedMessage.replace(/\[Date\]/g, `${day} ${monthNames[parseInt(month) - 1]} ${year}`);
                              formattedMessage = formattedMessage.replace(/\[Time\]/g, `${hours}:${minutes} (${countryName})`);
                            }
                          } else {
                            const now = new Date();
                            try {
                              const formatter = new Intl.DateTimeFormat('en-GB', {
                                timeZone: tz?.value || 'UTC',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                              const formatted = formatter.format(now);
                              const [datePart, timePart] = formatted.split(', ');
                              formattedMessage = formattedMessage.replace(/\[Date\]/g, datePart || '[Date]');
                              formattedMessage = formattedMessage.replace(/\[Time\]/g, timePart ? `${timePart} (${countryName})` : '[Time]');
                            } catch {
                              formattedMessage = formattedMessage.replace(/\[Date\]/g, format(now, 'dd MMMM yyyy'));
                              formattedMessage = formattedMessage.replace(/\[Time\]/g, `${format(now, 'HH:mm')} (${countryName})`);
                            }
                          }
                          
                          // Replace [Patient Name] with actual patient name
                          formattedMessage = formattedMessage.replace(/\[Patient Name\]/g, patient ? `${patient.firstName} ${patient.lastName}` : '[Patient Name]');
                          
                          // Replace [Contact Number] with patient phone or default
                          formattedMessage = formattedMessage.replace(/\[Contact Number\]/g, patient?.phone || '[Contact Number]');
                          
                          return formattedMessage;
                        })()}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                          Sent
                        </Badge>
                        <span className="text-gray-500">
                          Sent: {scheduledFor ? (() => {
                            const tz = TIMEZONES.find(t => t.value === selectedTimezone);
                            if (!tz) return '';
                            try {
                              const date = new Date(scheduledFor);
                              const formatter = new Intl.DateTimeFormat('en-GB', {
                                timeZone: tz.value,
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                              return `${formatter.format(date)} (${tz.label.split(' ')[0]})`;
                            } catch {
                              const [datePart, timePart] = scheduledFor.split('T');
                              const [year, month, day] = datePart.split('-');
                              const [hours, minutes] = timePart.split(':');
                              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              return `${monthNames[parseInt(month) - 1]} ${day}, ${year} ${hours}:${minutes} (${tz.label.split(' ')[0]})`;
                            }
                          })() : (() => {
                            const tz = TIMEZONES.find(t => t.value === selectedTimezone);
                            if (!tz) return '';
                            const now = new Date();
                            try {
                              const formatter = new Intl.DateTimeFormat('en-GB', {
                                timeZone: tz.value,
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                              return `${formatter.format(now)} (${tz.label.split(' ')[0]})`;
                            } catch {
                              return `${format(now, 'MMM dd, yyyy HH:mm')} (${tz.label.split(' ')[0]})`;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate limiting alert removed - will be re-enabled when backend endpoint is implemented */}

                <Button 
                  onClick={handleSendReminder} 
                  disabled={sendReminderMutation.isPending || !canSendReminder()}
                  className="w-full"
                >
                  {selectedMethod === 'phone' ? (
                    <Phone className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {sendReminderMutation.isPending 
                    ? (selectedMethod === 'phone' ? "Calling..." : "Sending...") 
                    : (selectedMethod === 'phone' ? "Make Voice Call" : "Send Reminder")}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="flag-type">Flag Type</Label>
                  <Select value={flagType} onValueChange={setFlagType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select flag type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FLAG_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {flagType && checkFlagExists(flagType) && (
                    <div className="flex items-center gap-2 mt-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        Already exists this flag
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flag-reason">Reason for Flag</Label>
                  <Textarea
                    id="flag-reason"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe the reason for flagging this patient..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flag-severity">Flag Severity</Label>
                  <Select value={flagSeverity} onValueChange={(value: "low" | "medium" | "high" | "critical") => setFlagSeverity(value)}>
                    <SelectTrigger data-testid="select-flag-severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical" data-testid="option-critical">Critical</SelectItem>
                      <SelectItem value="high" data-testid="option-high">High</SelectItem>
                      <SelectItem value="medium" data-testid="option-medium">Medium</SelectItem>
                      <SelectItem value="low" data-testid="option-low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {flagSeverity && (
                    <div className="flex items-center gap-2">
                      <Badge variant={flagSeverity === "critical" || flagSeverity === "high" ? "destructive" : flagSeverity === "medium" ? "default" : "secondary"}>
                        {flagSeverity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">Current selection</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleCreateFlag} 
                  disabled={createFlagMutation.isPending || (flagType && checkFlagExists(flagType))}
                  className="w-full"
                  data-testid="button-create-flag"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {createFlagMutation.isPending ? "Creating..." : "Create Flag"}
                </Button>
              </>
            )}
          </div>

          {/* Communication History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h3 className="text-lg font-medium">Communication History</h3>
            </div>

            {communicationsLoading ? (
              <div className="text-center py-4">Loading history...</div>
            ) : (
              <Tabs defaultValue="sms" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="sms" data-testid="tab-sms-history" className="flex items-center gap-1 text-xs">
                    <MessageSquare className="h-3 w-3" />
                    SMS ({communicationsList.filter((c: any) => c.method === 'sms').length})
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" data-testid="tab-whatsapp-history" className="flex items-center gap-1 text-xs">
                    <SiWhatsapp className="h-3 w-3 text-green-500" />
                    WhatsApp ({communicationsList.filter((c: any) => c.method === 'whatsapp').length})
                  </TabsTrigger>
                  <TabsTrigger value="voice" data-testid="tab-voice-history" className="flex items-center gap-1 text-xs">
                    <Phone className="h-3 w-3" />
                    Voice ({communicationsList.filter((c: any) => c.method === 'phone').length})
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email-history" className="flex items-center gap-1 text-xs">
                    <Mail className="h-3 w-3" />
                    Email ({communicationsList.filter((c: any) => c.method === 'email').length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="sms" className="mt-4">
                  {communicationsList.filter((c: any) => c.method === 'sms').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No SMS history found
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {communicationsList.filter((c: any) => c.method === 'sms').map((comm: any) => (
                        <div key={comm.id} className="p-3 border rounded-md space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              <Badge variant="outline">SMS</Badge>
                              <span className="font-medium">
                                {COMMUNICATION_TYPES[comm.type as keyof typeof COMMUNICATION_TYPES] || comm.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(comm.status)}
                              <span className="text-sm text-gray-500">
                                {formatDateWithTimezone(comm.createdAt, 'MMM dd, HH:mm', comm.metadata)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {comm.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <Badge 
                              variant={comm.status === 'failed' ? 'destructive' : 
                                       comm.status === 'scheduled' ? 'secondary' : 'outline'}
                              className={comm.status === 'sent' || comm.status === 'delivered' 
                                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' 
                                : ''}
                            >
                              {getStatusLabel(comm.status)}
                            </Badge>
                            
                            {comm.status === 'scheduled' && comm.scheduledFor && (
                              <span className="text-blue-600 dark:text-blue-400">
                                Scheduled for: {formatDateWithTimezone(comm.scheduledFor, 'MMM dd, yyyy HH:mm', comm.metadata)}
                              </span>
                            )}
                            
                            {comm.sentAt && comm.status !== 'scheduled' && (
                              <span className="text-gray-500">
                                Sent: {formatDateWithTimezone(comm.sentAt, 'MMM dd, yyyy HH:mm', comm.metadata)}
                              </span>
                            )}
                          </div>
                          
                          {comm.errorMessage && (
                            <p className="text-xs text-red-500">
                              Error: {comm.errorMessage}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="whatsapp" className="mt-4">
                  {communicationsList.filter((c: any) => c.method === 'whatsapp').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No WhatsApp history found
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {communicationsList.filter((c: any) => c.method === 'whatsapp').map((comm: any) => (
                        <div key={comm.id} className="p-3 border rounded-md space-y-2 border-l-4 border-l-green-500">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <SiWhatsapp className="h-4 w-4 text-green-500" />
                              <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                WhatsApp
                              </Badge>
                              <span className="font-medium">
                                {COMMUNICATION_TYPES[comm.type as keyof typeof COMMUNICATION_TYPES] || comm.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(comm.status)}
                              <span className="text-sm text-gray-500">
                                {formatDateWithTimezone(comm.createdAt, 'MMM dd, HH:mm', comm.metadata)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {comm.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <Badge 
                              variant={comm.status === 'failed' ? 'destructive' : 
                                       comm.status === 'scheduled' ? 'secondary' : 'outline'}
                              className={comm.status === 'sent' || comm.status === 'delivered' 
                                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' 
                                : ''}
                            >
                              {getStatusLabel(comm.status)}
                            </Badge>
                            
                            {comm.status === 'scheduled' && comm.scheduledFor && (
                              <span className="text-blue-600 dark:text-blue-400">
                                Scheduled for: {formatDateWithTimezone(comm.scheduledFor, 'MMM dd, yyyy HH:mm', comm.metadata)}
                              </span>
                            )}
                            
                            {comm.sentAt && comm.status !== 'scheduled' && (
                              <span className="text-gray-500">
                                Sent: {formatDateWithTimezone(comm.sentAt, 'MMM dd, yyyy HH:mm', comm.metadata)}
                              </span>
                            )}
                          </div>
                          
                          {comm.errorMessage && (
                            <p className="text-xs text-red-500">
                              Error: {comm.errorMessage}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="voice" className="mt-4">
                  {communicationsList.filter((c: any) => c.method === 'phone').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No voice call history found
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {communicationsList.filter((c: any) => c.method === 'phone').map((comm: any) => (
                        <div key={comm.id} className="p-3 border rounded-md space-y-2 border-l-4 border-l-blue-500">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-blue-500" />
                              <Badge variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                Voice Call
                              </Badge>
                              <span className="font-medium">
                                {COMMUNICATION_TYPES[comm.type as keyof typeof COMMUNICATION_TYPES] || comm.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(comm.status)}
                              <span className="text-sm text-gray-500">
                                {formatDateWithTimezone(comm.createdAt, 'MMM dd, HH:mm', comm.metadata)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="text-xs text-blue-500 mr-1">[TTS Script]</span>
                            {comm.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <Badge 
                              variant={comm.status === 'failed' ? 'destructive' : 
                                       comm.status === 'scheduled' ? 'secondary' : 'outline'}
                              className={comm.status === 'sent' || comm.status === 'delivered' 
                                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' 
                                : ''}
                            >
                              {getStatusLabel(comm.status)}
                            </Badge>
                            
                            {comm.status === 'scheduled' && comm.scheduledFor && (
                              <span className="text-blue-600 dark:text-blue-400">
                                Scheduled for: {formatDateWithoutTimezone(comm.scheduledFor, 'MMM dd, yyyy HH:mm')}
                              </span>
                            )}
                            
                            {comm.sentAt && comm.status !== 'scheduled' && (
                              <span className="text-gray-500">
                                Called: {formatDateWithoutTimezone(comm.sentAt, 'MMM dd, yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                          
                          {comm.errorMessage && (
                            <p className="text-xs text-red-500">
                              Error: {comm.errorMessage}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="email" className="mt-4">
                  {communicationsList.filter((c: any) => c.method === 'email').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No email history found
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {communicationsList.filter((c: any) => c.method === 'email').map((comm: any) => (
                        <div key={comm.id} className="p-3 border rounded-md space-y-2 border-l-4 border-l-purple-500">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-purple-500" />
                              <Badge variant="default" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                Email
                              </Badge>
                              <span className="font-medium">
                                {COMMUNICATION_TYPES[comm.type as keyof typeof COMMUNICATION_TYPES] || comm.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(comm.status)}
                              <span className="text-sm text-gray-500">
                                {formatDateWithTimezone(comm.createdAt, 'MMM dd, HH:mm', comm.metadata)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {comm.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <Badge 
                              variant={comm.status === 'failed' ? 'destructive' : 
                                       comm.status === 'scheduled' ? 'secondary' : 'outline'}
                              className={comm.status === 'sent' || comm.status === 'delivered' 
                                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' 
                                : ''}
                            >
                              {getStatusLabel(comm.status)}
                            </Badge>
                            
                            {comm.status === 'scheduled' && comm.scheduledFor && (
                              <span className="text-blue-600 dark:text-blue-400">
                                Scheduled for: {formatDateWithTimezone(comm.scheduledFor, 'MMM dd, yyyy HH:mm', comm.metadata)}
                              </span>
                            )}
                            
                            {comm.sentAt && comm.status !== 'scheduled' && (
                              <span className="text-gray-500">
                                Sent: {formatDateWithTimezone(comm.sentAt, 'MMM dd, yyyy HH:mm', comm.metadata)}
                              </span>
                            )}
                          </div>
                          
                          {comm.errorMessage && (
                            <p className="text-xs text-red-500">
                              Error: {comm.errorMessage}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Patient Contact Information */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h4 className="font-medium mb-2">Patient Contact Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Email:</span> {patient.email || "Not provided"}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {patient.phone || "Not provided"}
            </div>
            <div>
              <span className="font-medium">Mobile:</span> {patient.phone || "Not provided"}
            </div>
            <div>
              <span className="font-medium">Preferred Contact:</span> {"Email"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}