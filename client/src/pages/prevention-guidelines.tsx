import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield,
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  Target
} from "lucide-react";
import { useLocation } from "wouter";

export default function PreventionGuidelines() {
  const [location, setLocation] = useLocation();

  const screeningGuidelines = [
    {
      id: 1,
      condition: "Breast Cancer",
      ageRange: "50-74 years",
      frequency: "Every 2 years",
      method: "Mammography",
      riskFactors: ["Family history", "BRCA mutations", "Previous breast cancer"],
      compliance: 78
    },
    {
      id: 2,
      condition: "Cervical Cancer",
      ageRange: "25-64 years",
      frequency: "Every 3 years",
      method: "Pap smear",
      riskFactors: ["HPV infection", "Multiple partners", "Smoking"],
      compliance: 82
    },
    {
      id: 3,
      condition: "Colorectal Cancer",
      ageRange: "60-74 years",
      frequency: "Every 2 years",
      method: "FIT test",
      riskFactors: ["Family history", "IBD", "Previous polyps"],
      compliance: 65
    },
    {
      id: 4,
      condition: "Cardiovascular Disease",
      ageRange: "40+ years",
      frequency: "Every 5 years",
      method: "Cholesterol check",
      riskFactors: ["Hypertension", "Diabetes", "Smoking", "Family history"],
      compliance: 71
    }
  ];

  const vaccinations = [
    {
      vaccine: "Influenza",
      schedule: "Annual",
      ageGroup: "All ages 6 months+",
      effectiveness: "40-60%",
      priority: "high"
    },
    {
      vaccine: "COVID-19",
      schedule: "As recommended",
      ageGroup: "All ages 6 months+",
      effectiveness: "70-95%",
      priority: "high"
    },
    {
      vaccine: "Pneumococcal",
      schedule: "65+ years",
      ageGroup: "Adults 65+",
      effectiveness: "50-85%",
      priority: "medium"
    },
    {
      vaccine: "Shingles (Zoster)",
      schedule: "50+ years",
      ageGroup: "Adults 50+",
      effectiveness: "90%+",
      priority: "medium"
    }
  ];

  const lifestyleRecommendations = [
    {
      category: "Physical Activity",
      recommendations: [
        "150 minutes moderate exercise per week",
        "Muscle strengthening 2+ days per week",
        "Reduce sedentary time",
        "Include balance training for older adults"
      ],
      impact: "Reduces risk of heart disease, diabetes, and some cancers by 30-50%"
    },
    {
      category: "Nutrition",
      recommendations: [
        "5 portions of fruit and vegetables daily",
        "Limit processed foods and sugar",
        "Choose whole grains over refined",
        "Reduce sodium intake to <2.3g/day"
      ],
      impact: "Can prevent up to 80% of premature heart disease and stroke"
    },
    {
      category: "Tobacco & Alcohol",
      recommendations: [
        "Complete smoking cessation",
        "Limit alcohol to recommended guidelines",
        "Avoid secondhand smoke exposure",
        "Seek support for addiction services"
      ],
      impact: "Smoking cessation reduces cancer risk by 50% within 5 years"
    }
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
            <Shield className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Prevention Guidelines
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Preventive care recommendations and screening protocols
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="screening" className="space-y-6">
          <TabsList>
            <TabsTrigger value="screening">Screening Programs</TabsTrigger>
            <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
            <TabsTrigger value="lifestyle">Lifestyle Medicine</TabsTrigger>
          </TabsList>

          <TabsContent value="screening" className="space-y-4">
            <div className="grid gap-4">
              {screeningGuidelines.map((guideline) => (
                <Card key={guideline.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        {guideline.condition} Screening
                      </CardTitle>
                      <Badge 
                        variant={guideline.compliance >= 75 ? "default" : "secondary"}
                      >
                        {guideline.compliance}% Compliance
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Age Range</h4>
                        <p className="text-gray-900 dark:text-white font-medium">{guideline.ageRange}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Frequency</h4>
                        <p className="text-gray-900 dark:text-white font-medium">{guideline.frequency}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Method</h4>
                        <p className="text-gray-900 dark:text-white font-medium">{guideline.method}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Compliance</h4>
                        <Progress value={guideline.compliance} className="mt-1" />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Risk Factors</h4>
                      <div className="flex flex-wrap gap-2">
                        {guideline.riskFactors.map((factor, index) => (
                          <Badge key={index} variant="outline">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vaccinations" className="space-y-4">
            <div className="grid gap-4">
              {vaccinations.map((vaccination, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        {vaccination.vaccine} Vaccine
                      </CardTitle>
                      <Badge 
                        variant={vaccination.priority === 'high' ? 'destructive' : 'default'}
                      >
                        {vaccination.priority.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold mb-1">Schedule</h4>
                        <p className="text-gray-600 dark:text-gray-300">{vaccination.schedule}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Age Group</h4>
                        <p className="text-gray-600 dark:text-gray-300">{vaccination.ageGroup}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Effectiveness</h4>
                        <p className="text-gray-600 dark:text-gray-300">{vaccination.effectiveness}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Vaccination Schedule Reminder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Flu vaccination season: September - February</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span>COVID-19 boosters: Follow current NHS guidance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Travel vaccinations: Book 4-6 weeks before travel</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lifestyle" className="space-y-4">
            <div className="grid gap-4">
              {lifestyleRecommendations.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {category.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600 dark:text-gray-300">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Health Impact</h4>
                        <p className="text-blue-800 dark:text-blue-200 text-sm">{category.impact}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}