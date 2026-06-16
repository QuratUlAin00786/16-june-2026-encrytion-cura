import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Pill, 
  FlaskConical, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  User,
  X,
  Check,
  Eye
} from "lucide-react";
import { format, addDays, isAfter, isBefore } from "date-fns";

interface PatientAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'prescription_repeat' | 'lab_follow_up' | 'appointment_due' | 'medication_review' | 'chronic_disease_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  dueDate: string;
  actionRequired: boolean;
  dismissed: boolean;
  createdAt: string;
  metadata?: {
    medicationName?: string;
    testType?: string;
    lastReviewDate?: string;
    condition?: string;
  };
}

// Mock data for patient alerts
const mockAlerts: PatientAlert[] = [
  {
    id: "alert_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    type: "prescription_repeat",
    priority: "high",
    title: "Repeat Prescription Due",
    description: "Lisinopril prescription expires in 3 days",
    dueDate: addDays(new Date(), 3).toISOString(),
    actionRequired: true,
    dismissed: false,
    createdAt: new Date().toISOString(),
    metadata: {
      medicationName: "Lisinopril 10mg"
    }
  },
  {
    id: "alert_002", 
    patientId: "p_002",
    patientName: "Robert Davis",
    type: "lab_follow_up",
    priority: "medium",
    title: "Lab Results Follow-up",
    description: "HbA1c results require review and patient contact",
    dueDate: addDays(new Date(), 1).toISOString(),
    actionRequired: true,
    dismissed: false,
    createdAt: new Date().toISOString(),
    metadata: {
      testType: "HbA1c"
    }
  },
  {
    id: "alert_003",
    patientId: "p_003",
    patientName: "Emma Wilson",
    type: "chronic_disease_review",
    priority: "medium",
    title: "Diabetes Annual Review Due",
    description: "Annual diabetes review overdue by 2 weeks",
    dueDate: addDays(new Date(), -14).toISOString(),
    actionRequired: true,
    dismissed: false,
    createdAt: new Date().toISOString(),
    metadata: {
      condition: "Type 2 Diabetes",
      lastReviewDate: addDays(new Date(), -379).toISOString()
    }
  },
  {
    id: "alert_004",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    type: "appointment_due",
    priority: "low",
    title: "Blood Pressure Check Due",
    description: "Routine blood pressure monitoring appointment due",
    dueDate: addDays(new Date(), 7).toISOString(),
    actionRequired: false,
    dismissed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "alert_005",
    patientId: "p_004",
    patientName: "James Smith",
    type: "medication_review",
    priority: "urgent",
    title: "Medication Review Overdue",
    description: "Warfarin therapy review overdue - potential safety risk",
    dueDate: addDays(new Date(), -5).toISOString(),
    actionRequired: true,
    dismissed: false,
    createdAt: new Date().toISOString(),
    metadata: {
      medicationName: "Warfarin"
    }
  }
];

export function PatientAlerts() {
  const [alerts, setAlerts] = useState<PatientAlert[]>(mockAlerts);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'overdue' | 'today'>('all');

  // Mock query - in real implementation this would fetch from API
  const { data: alertsData = alerts, isLoading } = useQuery({
    queryKey: ["/api/patient-alerts", filter],
    enabled: true,
  });

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const markCompleted = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, actionRequired: false } : alert
    ));
  };

  const filteredAlerts = alertsData.filter(alert => {
    if (alert.dismissed) return false;
    
    const today = new Date();
    const dueDate = new Date(alert.dueDate);
    
    switch (filter) {
      case 'urgent':
        return alert.priority === 'urgent';
      case 'overdue':
        return isBefore(dueDate, today);
      case 'today':
        return format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      default:
        return true;
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prescription_repeat': return <Pill className="h-4 w-4" />;
      case 'lab_follow_up': return <FlaskConical className="h-4 w-4" />;
      case 'appointment_due': return <Calendar className="h-4 w-4" />;
      case 'medication_review': return <Pill className="h-4 w-4" />;
      case 'chronic_disease_review': return <User className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return isBefore(new Date(dueDate), new Date());
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Patient Alerts & Reminders
            </CardTitle>
            <div className="flex gap-2">
              {(['all', 'urgent', 'overdue', 'today'] as const).map((filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(filterOption)}
                  className="capitalize"
                >
                  {filterOption}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts</h3>
              <p className="text-gray-600">All caught up! No patient alerts at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const daysUntilDue = getDaysUntilDue(alert.dueDate);
                const overdue = isOverdue(alert.dueDate);
                
                return (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${getPriorityColor(alert.priority)} ${
                      overdue ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getTypeIcon(alert.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant="secondary" className={getPriorityColor(alert.priority)}>
                              {alert.priority}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm mb-2">{alert.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {alert.patientName}
                            </span>
                            
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {overdue ? (
                                <span className="text-red-600 font-medium">
                                  {Math.abs(daysUntilDue)} days overdue
                                </span>
                              ) : daysUntilDue === 0 ? (
                                <span className="text-orange-600 font-medium">Due today</span>
                              ) : (
                                <span>Due in {daysUntilDue} days</span>
                              )}
                            </span>
                            
                            {alert.metadata?.medicationName && (
                              <span className="text-blue-600">
                                {alert.metadata.medicationName}
                              </span>
                            )}
                            
                            {alert.metadata?.testType && (
                              <span className="text-purple-600">
                                {alert.metadata.testType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {alert.actionRequired && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markCompleted(alert.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}