import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { Appointment } from "@/types";

function formatAppointmentTime(dateString: string): string {
  // Parse the UTC date and display it correctly in local timezone
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "scheduled":
      return "bg-medical-blue";
    case "completed":
      return "bg-medical-green";
    case "cancelled":
      return "bg-gray-300";
    default:
      return "bg-medical-orange";
  }
}

export function SchedulePanel() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: appointments, isLoading, error } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { date: today }],
  });

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-center py-8">
            Unable to load schedule. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-center py-8">
            No appointments scheduled for today.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.slice(0, 4).map((appointment) => (
          <div key={appointment.id} className="flex items-center space-x-3">
            <div className={`w-2 h-2 ${getStatusColor(appointment.status)} rounded-full`}></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {formatAppointmentTime(appointment.scheduledAt)}
              </p>
              <p className="text-sm text-neutral-600">
                {appointment.title} - {appointment.type}
              </p>
              {appointment.description && (
                <p className="text-xs text-neutral-500">
                  {appointment.description}
                </p>
              )}
            </div>
            <Button 
              variant="link" 
              size="sm"
              className={`p-0 h-auto ${
                appointment.status === "scheduled" 
                  ? "text-medical-blue hover:text-blue-700" 
                  : "text-neutral-400 cursor-not-allowed"
              }`}
              disabled={appointment.status !== "scheduled"}
              onClick={() => {
                if (appointment.status === "scheduled") {
                  // Start consultation or join meeting
                  console.log("Starting consultation for appointment:", appointment.id);
                }
              }}
            >
              {appointment.status === "scheduled" ? "Join" : "Completed"}
            </Button>
          </div>
        ))}
        
        {appointments.length > 4 && (
          <div className="text-center pt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Navigate to full calendar view
                window.location.href = "/calendar";
              }}
            >
              View Full Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
