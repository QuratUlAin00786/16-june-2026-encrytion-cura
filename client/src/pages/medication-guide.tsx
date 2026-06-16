import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Pill,
  ArrowLeft,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";

export default function MedicationGuide() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const medications = [
    {
      id: 1,
      name: "Amoxicillin",
      category: "Antibiotic",
      dosage: "500mg every 8 hours",
      interactions: ["Methotrexate", "Warfarin"],
      warnings: ["Allergic reactions", "GI upset"],
      severity: "medium"
    },
    {
      id: 2,
      name: "Metformin",
      category: "Antidiabetic",
      dosage: "500mg twice daily",
      interactions: ["Contrast dye", "Alcohol"],
      warnings: ["Lactic acidosis", "Kidney function"],
      severity: "high"
    },
    {
      id: 3,
      name: "Lisinopril",
      category: "ACE Inhibitor",
      dosage: "10mg once daily",
      interactions: ["NSAIDs", "Potassium supplements"],
      warnings: ["Angioedema", "Hyperkalemia"],
      severity: "high"
    },
    {
      id: 4,
      name: "Simvastatin",
      category: "Statin",
      dosage: "20mg at bedtime",
      interactions: ["Grapefruit juice", "Amiodarone"],
      warnings: ["Muscle pain", "Liver function"],
      severity: "medium"
    }
  ];

  const drugInteractions = [
    {
      drug1: "Warfarin",
      drug2: "Aspirin",
      severity: "high",
      effect: "Increased bleeding risk",
      recommendation: "Monitor INR closely, consider dose adjustment"
    },
    {
      drug1: "ACE Inhibitors",
      drug2: "NSAIDs",
      severity: "medium",
      effect: "Reduced ACE inhibitor efficacy",
      recommendation: "Monitor blood pressure and kidney function"
    },
    {
      drug1: "Digoxin",
      drug2: "Amiodarone",
      severity: "high",
      effect: "Increased digoxin levels",
      recommendation: "Reduce digoxin dose by 50%, monitor levels"
    }
  ];

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
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
            <Pill className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Medication Guide
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Drug interaction checker and medication reference database
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="medications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="medications">Medication Database</TabsTrigger>
            <TabsTrigger value="interactions">Drug Interactions</TabsTrigger>
            <TabsTrigger value="calculator">Dosage Calculator</TabsTrigger>
          </TabsList>

          <TabsContent value="medications" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search medications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button>Advanced Search</Button>
            </div>

            <div className="grid gap-4">
              {filteredMedications.map((medication) => (
                <Card key={medication.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Pill className="w-5 h-5" />
                        {medication.name}
                      </CardTitle>
                      <Badge variant="secondary">{medication.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Dosage</h4>
                        <p className="text-gray-600 dark:text-gray-300">{medication.dosage}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Interactions</h4>
                        <div className="space-y-1">
                          {medication.interactions.map((interaction, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {interaction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Warnings</h4>
                        <div className="space-y-1">
                          {medication.warnings.map((warning, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm text-gray-600 dark:text-gray-300">{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4">
            <div className="grid gap-4">
              {drugInteractions.map((interaction, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className={`w-5 h-5 ${
                        interaction.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                      {interaction.drug1} + {interaction.drug2}
                    </CardTitle>
                    <Badge 
                      variant={interaction.severity === 'high' ? 'destructive' : 'default'}
                    >
                      {interaction.severity.toUpperCase()} RISK
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-1">Effect</h4>
                        <p className="text-gray-600 dark:text-gray-300">{interaction.effect}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Recommendation</h4>
                        <p className="text-gray-600 dark:text-gray-300">{interaction.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Dosage Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Patient Weight (kg)</label>
                    <Input placeholder="Enter weight..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Medication</label>
                    <Input placeholder="Select medication..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Age</label>
                    <Input placeholder="Enter age..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <Input placeholder="Times per day..." />
                  </div>
                </div>
                <Button className="mt-4 w-full">Calculate Dosage</Button>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold">Calculated Dosage</h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Enter patient information above to calculate appropriate dosage
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}