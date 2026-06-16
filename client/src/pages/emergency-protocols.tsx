import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity,
  ArrowLeft,
  AlertTriangle,
  Heart,
  Zap,
  Phone
} from "lucide-react";
import { useLocation } from "wouter";

export default function EmergencyProtocols() {
  const [location, setLocation] = useLocation();

  const protocols = [
    {
      id: 1,
      title: "Cardiac Arrest",
      priority: "critical",
      steps: [
        "Check responsiveness and breathing",
        "Call for help and AED",
        "Begin CPR (30:2 ratio)",
        "Apply AED when available",
        "Continue until emergency services arrive"
      ]
    },
    {
      id: 2,
      title: "Anaphylaxis",
      priority: "critical",
      steps: [
        "Assess airway, breathing, circulation",
        "Administer epinephrine immediately",
        "Position patient lying flat",
        "Call emergency services",
        "Monitor vital signs continuously"
      ]
    },
    {
      id: 3,
      title: "Stroke Recognition",
      priority: "high",
      steps: [
        "Use FAST assessment (Face, Arms, Speech, Time)",
        "Check blood glucose level",
        "Obtain CT scan immediately",
        "Do not give food or drink",
        "Prepare for potential thrombolysis"
      ]
    },
    {
      id: 4,
      title: "Severe Bleeding",
      priority: "high",
      steps: [
        "Apply direct pressure to wound",
        "Elevate injured area if possible",
        "Use pressure points if needed",
        "Apply tourniquet for severe limb bleeding",
        "Monitor for signs of shock"
      ]
    }
  ];

  const emergencyContacts = [
    { service: "Emergency Services", number: "999" },
    { service: "Poison Control", number: "111" },
    { service: "Hospital Coordinator", number: "020 7946 0958" },
    { service: "Trauma Team", number: "020 7946 0959" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-zoom-90">
      <div className="container mx-auto p-4">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/clinical-decision-support")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Emergency Protocols
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Quick access to critical care guidelines and emergency procedures
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emergency Protocols */}
          <div className="lg:col-span-2">
            <div className="grid gap-4">
              {protocols.map((protocol) => (
                <Card key={protocol.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {protocol.title}
                      </CardTitle>
                      <Badge 
                        variant={protocol.priority === "critical" ? "destructive" : "default"}
                      >
                        {protocol.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2">
                      {protocol.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Emergency Contacts */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emergencyContacts.map((contact, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {contact.service}
                      </span>
                      <span className="text-red-600 font-bold">
                        {contact.number}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full" variant="destructive">
                    <Zap className="w-4 h-4 mr-2" />
                    Activate Code Blue
                  </Button>
                  <Button className="w-full" variant="outline">
                    Call Emergency Services
                  </Button>
                  <Button className="w-full" variant="outline">
                    Notify Trauma Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}