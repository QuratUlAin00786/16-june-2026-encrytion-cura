import React from "react";
import { useAuth } from "@/hooks/use-auth";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import DoctorAppointments from "./doctor-appointments";
import PatientAppointments from "./patient-appointments";
import NurseAppointments from "./nurse-appointments";
import HRAppointments from "./hr-appointments";
import { isDoctorLike } from "@/lib/role-utils";

interface RoleBasedAppointmentsProps {
  onNewAppointment?: () => void;
}

export default function RoleBasedAppointmentRouter({ onNewAppointment }: RoleBasedAppointmentsProps) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500">Loading user information...</div>
        </div>
      </div>
    );
  }

  // Check for doctor-like roles first
  if (isDoctorLike(user.role)) {
    return <DoctorAppointments onNewAppointment={onNewAppointment} />;
  }

  // Route to appropriate view based on user role
  switch (user.role) {
    case 'admin':
      // Admin users get the full calendar view (appointment-calendar.tsx)
      return <AppointmentCalendar onNewAppointment={onNewAppointment} />;
    
    case 'patient':
      // Patients get their personal appointment view
      return <PatientAppointments onNewAppointment={onNewAppointment} />;
    
    case 'nurse':
      // Nurses get their care management view
      return <NurseAppointments onNewAppointment={onNewAppointment} />;
    
    case 'receptionist':
      // Receptionists get the HR management view
      return <HRAppointments onNewAppointment={onNewAppointment} />;
    
    default:
      // Default fallback for unknown roles
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">Access Restricted</div>
            <div className="text-gray-600">Your role ({user.role}) does not have appointment access.</div>
          </div>
        </div>
      );
  }
}