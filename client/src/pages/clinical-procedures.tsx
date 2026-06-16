import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText,
  ArrowLeft,
  Search,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Video
} from "lucide-react";
import { useLocation } from "wouter";

export default function ClinicalProcedures() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const procedures = [
    {
      id: 1,
      name: "Central Venous Catheter Insertion",
      category: "Invasive",
      duration: "30-45 minutes",
      complexity: "high",
      prerequisites: ["Sterile technique training", "Ultrasound guidance"],
      steps: [
        "Obtain informed consent and verify indications",
        "Position patient in Trendelenburg position",
        "Apply sterile draping and prepare insertion site",
        "Use ultrasound guidance to locate vein",
        "Insert needle and advance guidewire",
        "Make skin incision and dilate tract",
        "Insert catheter over guidewire",
        "Secure catheter and obtain chest X-ray"
      ],
      complications: ["Pneumothorax", "Arterial puncture", "Infection", "Thrombosis"]
    },
    {
      id: 2,
      name: "Lumbar Puncture",
      category: "Diagnostic",
      duration: "20-30 minutes",
      complexity: "medium",
      prerequisites: ["Anatomy knowledge", "Sterile technique"],
      steps: [
        "Explain procedure and obtain consent",
        "Position patient lateral or sitting",
        "Identify L3-L4 or L4-L5 interspace",
        "Clean and drape in sterile fashion",
        "Administer local anesthesia",
        "Insert spinal needle with stylet",
        "Advance until CSF flows",
        "Collect samples and measure pressure"
      ],
      complications: ["Headache", "Bleeding", "Infection", "Nerve injury"]
    },
    {
      id: 3,
      name: "Endotracheal Intubation",
      category: "Emergency",
      duration: "5-10 minutes",
      complexity: "high",
      prerequisites: ["Airway assessment", "Emergency training"],
      steps: [
        "Pre-oxygenate patient with 100% oxygen",
        "Prepare equipment and medications",
        "Position patient with neck extension",
        "Administer sedation and paralytic",
        "Insert laryngoscope and visualize cords",
        "Insert endotracheal tube through cords",
        "Inflate cuff and confirm placement",
        "Secure tube and connect ventilator"
      ],
      complications: ["Aspiration", "Esophageal intubation", "Dental trauma", "Hypoxia"]
    },
    {
      id: 4,
      name: "Joint Aspiration",
      category: "Diagnostic",
      duration: "15-20 minutes",
      complexity: "low",
      prerequisites: ["Aseptic technique", "Anatomy knowledge"],
      steps: [
        "Confirm indication and obtain consent",
        "Position joint for optimal access",
        "Identify anatomical landmarks",
        "Clean skin with antiseptic solution",
        "Inject local anesthetic",
        "Insert needle into joint space",
        "Aspirate synovial fluid",
        "Apply pressure and dressing"
      ],
      complications: ["Infection", "Bleeding", "Nerve injury", "Dry tap"]
    }
  ];

  const emergencyProcedures = [
    {
      name: "Cardiopulmonary Resuscitation (CPR)",
      indication: "Cardiac arrest",
      steps: ["Check responsiveness", "Call for help", "Chest compressions", "Rescue breathing"],
      timeframe: "Immediate"
    },
    {
      name: "Chest Decompression",
      indication: "Tension pneumothorax",
      steps: ["Identify 2nd intercostal space", "Insert large bore needle", "Listen for air release"],
      timeframe: "Within 2 minutes"
    },
    {
      name: "Emergency Cricothyroidotomy",
      indication: "Cannot intubate/ventilate",
      steps: ["Identify cricothyroid membrane", "Make horizontal incision", "Insert trach tube"],
      timeframe: "Within 5 minutes"
    }
  ];

  const filteredProcedures = procedures.filter(proc =>
    proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Clinical Procedures
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Step-by-step clinical procedure guides and protocols
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="procedures" className="space-y-6">
          <TabsList>
            <TabsTrigger value="procedures">Procedure Database</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Procedures</TabsTrigger>
            <TabsTrigger value="training">Training Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="procedures" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search procedures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button>Filter by Category</Button>
            </div>

            <div className="grid gap-4">
              {filteredProcedures.map((procedure) => (
                <Card key={procedure.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {procedure.name}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{procedure.category}</Badge>
                        <Badge 
                          variant={
                            procedure.complexity === 'high' ? 'destructive' : 
                            procedure.complexity === 'medium' ? 'default' : 'outline'
                          }
                        >
                          {procedure.complexity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <div className="mb-4">
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {procedure.duration}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {procedure.complexity} complexity
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Prerequisites</h4>
                          <div className="space-y-1">
                            {procedure.prerequisites.map((prereq, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">{prereq}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Potential Complications</h4>
                          <div className="space-y-1">
                            {procedure.complications.map((complication, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">{complication}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Procedure Steps</h4>
                        <ol className="space-y-3">
                          {procedure.steps.map((step, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 text-sm">{step}</span>
                            </li>
                          ))}
                        </ol>
                        
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="outline">
                            <Video className="w-4 h-4 mr-2" />
                            Watch Demo
                          </Button>
                          <Button size="sm" variant="outline">
                            Download Guide
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Emergency Procedures</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Time-critical procedures for emergency situations
              </p>
            </div>

            <div className="grid gap-4">
              {emergencyProcedures.map((procedure, index) => (
                <Card key={index} className="border-red-200 dark:border-red-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-5 h-5" />
                        {procedure.name}
                      </CardTitle>
                      <Badge variant="destructive">
                        {procedure.timeframe}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <h4 className="font-semibold text-sm">Indication</h4>
                      <p className="text-gray-600 dark:text-gray-300">{procedure.indication}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Key Steps</h4>
                      <ol className="space-y-1">
                        {procedure.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {stepIndex + 1}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Video Training Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Access comprehensive video demonstrations of clinical procedures
                  </p>
                  <Button className="w-full">Browse Videos</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Competency Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Track your procedure competencies and certification status
                  </p>
                  <Button className="w-full">View Progress</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Simulation Training
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Book simulation sessions for hands-on practice
                  </p>
                  <Button className="w-full">Schedule Session</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documentation Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Download procedure documentation templates
                  </p>
                  <Button className="w-full">Download Templates</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}