import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().trim().min(1, "Please select a patient"),
  providerId: z.string().trim().min(1, "Please select a provider"),
  title: z.string().trim().min(1, "Appointment title is required"),
  description: z.string().trim().optional(),
  date: z.string().trim().min(1, "Date is required").refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" }
  ),
  time: z.string().trim().min(1, "Time is required").regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Please enter a valid time (HH:MM format)"
  ),
  duration: z.string().trim().min(1, "Duration is required").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    { message: "Duration must be a positive number" }
  ),
  type: z.string().trim().min(1, "Appointment type is required"),
  department: z.string().trim().min(1, "Department is required"),
  location: z.string().trim().optional(),
  isVirtual: z.boolean(),
  appointmentType: z.enum(["consultation", "treatment"]).default("consultation"),
  treatmentId: z.string().optional(),
  consultationId: z.string().optional(),
  providerRole: z.string().optional()
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;