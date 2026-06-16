import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Eye, Calendar, Bell, FileText, AlertTriangle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@/types";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

interface RecentPatientsProps {
  onStartConsultation?: (patient: any) => void;
}

function getPatientInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return date.toLocaleDateString();
}

function getRiskLevelColor(riskLevel: string) {
  switch (riskLevel) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
    default:
      return "bg-green-100 text-green-800";
  }
}

function getConditionColor(condition?: string) {
  if (!condition) return "bg-gray-100 text-gray-800";
  
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("diabetes")) return "bg-yellow-100 text-yellow-800";
  if (lowerCondition.includes("hypertension")) return "bg-green-100 text-green-800";
  if (lowerCondition.includes("pain")) return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

export function RecentPatients({ onStartConsultation }: RecentPatientsProps = {}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleViewAllPatients = () => {
    console.log("View All button clicked - navigating to /patients");
    setLocation("/patients");
  };
  
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { limit: 10 }],
    queryFn: async () => {
      const response = await fetch("/api/patients?limit=10", {
        headers: {
          "X-Tenant-Subdomain": getActiveSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.status}`);
      }
      return response.json();
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest('POST', `/api/patients/${patientId}/send-reminder`, {
        type: 'appointment_reminder',
        message: 'Please remember your upcoming appointment'
      });
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "Patient has been notified about their appointment",
      });
    }
  });

  const flagPatientMutation = useMutation({
    mutationFn: async ({ patientId, flag }: { patientId: number; flag: string }) => {
      return apiRequest('PATCH', `/api/patients/${patientId}`, {
        flags: [flag]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient flagged",
        description: "Flag has been added to patient record",
      });
    }
  });

  const handleViewPatient = (patient: any) => {
    setLocation(`/patients?view=${patient.id}`);
    toast({
      title: "Patient Profile",
      description: `Opening profile for ${patient.firstName} ${patient.lastName}`,
    });
  };

  const handleBookAppointment = (patient: any) => {
    setLocation(`/calendar?patientId=${patient.id}`);
    toast({
      title: "Book Appointment",
      description: `Booking appointment for ${patient.firstName} ${patient.lastName}`,
    });
  };

  const handleSendReminder = (patient: any) => {
    sendReminderMutation.mutate(patient.id);
  };

  const handleViewRecords = (patient: any) => {
    setLocation(`/patients/${patient.id}/records`);
    toast({
      title: "Medical Records",
      description: `Opening medical records for ${patient.firstName} ${patient.lastName}`,
    });
  };

  const handleFlagPatient = (patient: any) => {
    const flagOptions = ['follow-up', 'high-priority', 'insurance-issue', 'non-compliant', 'requires-attention'];
    const selectedFlag = flagOptions[Math.floor(Math.random() * flagOptions.length)]; // In real app, would be user-selected
    flagPatientMutation.mutate({ patientId: patient.id, flag: selectedFlag });
  };

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Patients
            <Button variant="link" size="sm" onClick={handleViewAllPatients}>View All</Button>
          </CardTitle>
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
          <CardTitle className="flex items-center justify-between">
            Recent Patients
            <Button variant="link" size="sm" onClick={handleViewAllPatients}>View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 dark:text-neutral-300 text-center py-8">
            Unable to load patient data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Patients
            <Button variant="link" size="sm" onClick={handleViewAllPatients}>View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 dark:text-neutral-300 text-center py-8">
            No patients found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Recent Patients
          <Button 
            variant="link" 
            size="sm" 
            onClick={handleViewAllPatients}
            className="text-medical-blue hover:text-blue-700"
          >
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="medical-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Last Visit</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 5).map((patient) => {
                const primaryCondition = patient.medicalHistory?.chronicConditions?.[0];
                
                return (
                  <tr key={patient.id} className="hover:bg-neutral-50 dark:hover:bg-gray-700">
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarContent className="bg-blue-100 text-medical-blue font-semibold">
                            {getPatientInitials(patient.firstName, patient.lastName)}
                          </AvatarContent>
                          <AvatarFallback>
                            {getPatientInitials(patient.firstName, patient.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300">
                            ID: #{patient.patientId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-neutral-600 dark:text-neutral-300">
                      {formatDate(patient.updatedAt)}
                    </td>
                    <td className="py-4">
                      {primaryCondition ? (
                        <Badge 
                          variant="secondary" 
                          className={getConditionColor(primaryCondition)}
                        >
                          {primaryCondition}
                        </Badge>
                      ) : (
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">No conditions</span>
                      )}
                    </td>
                    <td className="py-4">
                      <Badge 
                        variant="secondary"
                        className={getRiskLevelColor(patient.riskLevel)}
                      >
                        {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
                      </Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-1 flex-wrap">
                        {patient.flags && patient.flags.length > 0 ? (
                          patient.flags.map((flag: string, index: number) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                            >
                              {flag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">No flags</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-1 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewPatient(patient)}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleBookAppointment(patient)}
                          className="h-7 px-2 text-xs bg-medical-blue hover:bg-blue-700"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Book
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleSendReminder(patient)}
                          disabled={sendReminderMutation.isPending}
                          className="h-7 px-2 text-xs"
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Remind
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewRecords(patient)}
                          className="h-7 px-2 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Records
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleFlagPatient(patient)}
                          disabled={flagPatientMutation.isPending}
                          className="h-7 px-2 text-xs"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Flag
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
