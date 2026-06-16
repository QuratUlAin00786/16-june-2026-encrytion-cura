import { UserPlus, CalendarPlus, Bot, Pill, FileText, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const quickActions = [
  {
    title: "Add New Patient",
    icon: UserPlus,
    color: "text-medical-blue",
    action: "Add New Patient"
  },
  {
    title: "Schedule Appointment", 
    icon: CalendarPlus,
    color: "text-medical-green",
    action: "Schedule Appointment"
  },
  {
    title: "Create Prescription",
    icon: Pill,
    color: "text-medical-orange",
    action: "Create Prescription"
  },
  {
    title: "Medical Records",
    icon: FileText,
    color: "text-blue-600",
    action: "Medical Records"
  },
  {
    title: "AI Assistant",
    icon: Bot,
    color: "text-purple-600", 
    action: "AI Assistant"
  },
  {
    title: "Start Consultation",
    icon: MessageSquare,
    color: "text-green-600",
    action: "consultation"
  }
];

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action);
    } else {
      // Default navigation behavior
      switch (action) {
        case "Add New Patient":
          setLocation("/patients");
          toast({
            title: "Patient Management",
            description: "Opening patient registration",
          });
          break;
        case "Schedule Appointment":
          setLocation("/calendar");
          toast({
            title: "Appointment Calendar",
            description: "Opening appointment scheduler",
          });
          break;
        case "Create Prescription":
          setLocation("/prescriptions");
          toast({
            title: "Prescription Manager",
            description: "Opening prescription system",
          });
          break;
        case "Medical Records":
          setLocation("/patients");
          toast({
            title: "Medical Records",
            description: "Opening patient records",
          });
          break;
        case "AI Assistant":
          setLocation("/ai-insights");
          toast({
            title: "AI Assistant",
            description: "Opening AI insights panel",
          });
          break;
        case "consultation":
          // This will be handled by the parent component
          break;
        default:
          console.log(`Quick action: ${action}`);
      }
    }
  };

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => (
          <Button
            key={action.action}
            variant="outline"
            className="w-full justify-start space-x-3 h-auto p-3 hover:bg-medical-blue hover:text-white transition-colors"
            onClick={() => handleAction(action.action)}
          >
            <action.icon className={`h-5 w-5 ${action.color}`} />
            <span className="text-sm font-medium">
              {action.title}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
