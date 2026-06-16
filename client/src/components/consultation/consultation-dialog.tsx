import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Stethoscope, 
  Pill, 
  Calendar, 
  AlertTriangle,
  Save,
  Printer,
  Send,
  Clock,
  User,
  Heart,
  Activity,
  Plus,
  Minus,
  CheckCircle,
  X,
  Thermometer,
  Scale,
  Ruler,
  Eye,
  Ear,
  Brain,
  HeartPulse
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface ConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
}

export function ConsultationDialog({ open, onOpenChange, patient }: ConsultationDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("vitals");
  const [consultationStartTime] = useState(new Date());
  
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: ""
  });

  const [consultationData, setConsultationData] = useState({
    chiefComplaint: "",
    historyPresentingComplaint: "",
    reviewOfSystems: {
      cardiovascular: "",
      respiratory: "",
      gastrointestinal: "",
      genitourinary: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      psychiatric: ""
    },
    examination: {
      general: "",
      cardiovascular: "",
      respiratory: "",
      abdomen: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      head_neck: "",
      ears_nose_throat: ""
    },
    assessment: "",
    plan: "",
    prescriptions: [] as Array<{
      medication: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>,
    followUp: {
      required: false,
      timeframe: "",
      reason: ""
    },
    referrals: [] as Array<{
      specialty: string;
      urgency: "routine" | "urgent" | "2ww";
      reason: string;
    }>,
    investigations: [] as Array<{
      type: string;
      urgency: "routine" | "urgent";
      reason: string;
    }>
  });

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const addPrescription = () => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: ""
      }]
    }));
  };

  const addReferral = () => {
    setConsultationData(prev => ({
      ...prev,
      referrals: [...prev.referrals, {
        specialty: "",
        urgency: "routine",
        reason: ""
      }]
    }));
  };

  const addInvestigation = () => {
    setConsultationData(prev => ({
      ...prev,
      investigations: [...prev.investigations, {
        type: "",
        urgency: "routine",
        reason: ""
      }]
    }));
  };

  const saveConsultation = () => {
    // Here you would save the consultation data to the backend
    console.log("Saving consultation:", consultationData);
    onOpenChange(false);
  };

  // Allow consultation dialog without a patient for general consultations

  console.log('ConsultationDialog render:', { open, patient });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            {patient ? `NHS Consultation - ${patient.firstName} ${patient.lastName}` : "New Patient Consultation"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-6">
          {/* Patient Info Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  {patient ? (
                    <>
                      <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                      <p className="text-sm text-gray-600">Age: {calculateAge(patient.dateOfBirth)} years</p>
                      <p className="text-sm text-gray-600">DOB: {format(new Date(patient.dateOfBirth), 'dd/MM/yyyy')}</p>
                      {patient.nhsNumber && (
                        <p className="text-sm text-gray-600">NHS: {patient.nhsNumber}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No patient selected - General consultation</p>
                  )}
                </div>

                {/* Vitals */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Vital Signs</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">BP (mmHg)</Label>
                      <Input
                        placeholder="120/80"
                        value={vitals.bloodPressure}
                        onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">HR (bpm)</Label>
                      <Input
                        placeholder="72"
                        value={vitals.heartRate}
                        onChange={(e) => setVitals(prev => ({ ...prev, heartRate: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Temp (°C)</Label>
                      <Input
                        placeholder="36.5"
                        value={vitals.temperature}
                        onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">SpO2 (%)</Label>
                      <Input
                        placeholder="98"
                        value={vitals.oxygenSaturation}
                        onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Allergies & Medications */}
                {patient?.allergies && patient.allergies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700">Allergies</h4>
                    <div className="space-y-1">
                      {patient.allergies.map((allergy: any, index: number) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {patient?.currentMedications && patient.currentMedications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Current Medications</h4>
                    <div className="space-y-1">
                      {patient.currentMedications.map((med: any, index: number) => (
                        <p key={index} className="text-xs text-gray-600">{med}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Consultation Area */}
          <div className="col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="examination">Examination</TabsTrigger>
                <TabsTrigger value="assessment">Assessment & Plan</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions & Follow-up</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">History Taking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Presenting Complaint</Label>
                      <Textarea
                        placeholder="Chief complaint and reason for visit..."
                        value={consultationData.chiefComplaint}
                        onChange={(e) => setConsultationData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                        className="min-h-[80px]"
                      />
                    </div>
                    
                    <div>
                      <Label>History of Presenting Complaint</Label>
                      <Textarea
                        placeholder="Detailed history including onset, duration, character, associated symptoms, relieving/exacerbating factors..."
                        value={consultationData.historyPresentingComplaint}
                        onChange={(e) => setConsultationData(prev => ({ ...prev, historyPresentingComplaint: e.target.value }))}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div>
                      <Label>Review of Systems</Label>
                      <Textarea
                        placeholder="Systematic review including cardiovascular, respiratory, gastrointestinal, genitourinary, neurological symptoms..."
                        value={typeof consultationData.reviewOfSystems === 'string' ? consultationData.reviewOfSystems : JSON.stringify(consultationData.reviewOfSystems)}
                        onChange={(e) => setConsultationData(prev => ({ ...prev, reviewOfSystems: e.target.value }))}
                        className="min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="examination" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Physical Examination</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>General Appearance</Label>
                        <Textarea
                          placeholder="General appearance, demeanor, distress level..."
                          value={consultationData.examination.general}
                          onChange={(e) => setConsultationData(prev => ({
                            ...prev,
                            examination: { ...prev.examination, general: e.target.value }
                          }))}
                          className="min-h-[80px]"
                        />
                      </div>
                      
                      <div>
                        <Label>Cardiovascular</Label>
                        <Textarea
                          placeholder="Heart sounds, murmurs, peripheral pulses, JVP..."
                          value={consultationData.examination.cardiovascular}
                          onChange={(e) => setConsultationData(prev => ({
                            ...prev,
                            examination: { ...prev.examination, cardiovascular: e.target.value }
                          }))}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label>Respiratory</Label>
                        <Textarea
                          placeholder="Inspection, palpation, percussion, auscultation..."
                          value={consultationData.examination.respiratory}
                          onChange={(e) => setConsultationData(prev => ({
                            ...prev,
                            examination: { ...prev.examination, respiratory: e.target.value }
                          }))}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label>Abdominal</Label>
                        <Textarea
                          placeholder="Inspection, auscultation, palpation, percussion..."
                          value={consultationData.examination.abdomen}
                          onChange={(e) => setConsultationData(prev => ({
                            ...prev,
                            examination: { ...prev.examination, abdomen: e.target.value }
                          }))}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label>Neurological</Label>
                        <Textarea
                          placeholder="Mental state, cranial nerves, motor, sensory, reflexes..."
                          value={consultationData.examination.neurological}
                          onChange={(e) => setConsultationData(prev => ({
                            ...prev,
                            examination: { ...prev.examination, neurological: e.target.value }
                          }))}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label>Musculoskeletal</Label>
                        <Textarea
                          placeholder="Joints, movement, deformities, gait..."
                          value={consultationData.examination.musculoskeletal}
                          onChange={(e) => setConsultationData(prev => ({
                            ...prev,
                            examination: { ...prev.examination, musculoskeletal: e.target.value }
                          }))}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assessment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assessment & Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Clinical Assessment & Differential Diagnosis</Label>
                      <Textarea
                        placeholder="Primary diagnosis, differential diagnoses, clinical reasoning..."
                        value={consultationData.assessment}
                        onChange={(e) => setConsultationData(prev => ({ ...prev, assessment: e.target.value }))}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div>
                      <Label>Management Plan</Label>
                      <Textarea
                        placeholder="Treatment plan, lifestyle advice, safety netting, follow-up arrangements..."
                        value={consultationData.plan}
                        onChange={(e) => setConsultationData(prev => ({ ...prev, plan: e.target.value }))}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div>
                      <Label>Investigations Required</Label>
                      <div className="space-y-2">
                        {consultationData.investigations.map((investigation, index) => (
                          <div key={index} className="grid grid-cols-3 gap-2 p-2 border rounded">
                            <Select
                              value={investigation.type}
                              onValueChange={(value) => {
                                const newInvestigations = [...consultationData.investigations];
                                newInvestigations[index].type = value;
                                setConsultationData(prev => ({ ...prev, investigations: newInvestigations }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Investigation type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="blood_tests">Blood Tests</SelectItem>
                                <SelectItem value="urine_tests">Urine Tests</SelectItem>
                                <SelectItem value="imaging">Imaging</SelectItem>
                                <SelectItem value="ecg">ECG</SelectItem>
                                <SelectItem value="spirometry">Spirometry</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={investigation.urgency}
                              onValueChange={(value: "routine" | "urgent") => {
                                const newInvestigations = [...consultationData.investigations];
                                newInvestigations[index].urgency = value;
                                setConsultationData(prev => ({ ...prev, investigations: newInvestigations }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="routine">Routine</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Reason/details"
                              value={investigation.reason}
                              onChange={(e) => {
                                const newInvestigations = [...consultationData.investigations];
                                newInvestigations[index].reason = e.target.value;
                                setConsultationData(prev => ({ ...prev, investigations: newInvestigations }));
                              }}
                            />
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addInvestigation}>
                          Add Investigation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prescriptions" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Prescriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {consultationData.prescriptions.map((prescription, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded">
                          <Input
                            placeholder="Medication name"
                            value={prescription.medication}
                            onChange={(e) => {
                              const newPrescriptions = [...consultationData.prescriptions];
                              newPrescriptions[index].medication = e.target.value;
                              setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                            }}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Dosage"
                              value={prescription.dosage}
                              onChange={(e) => {
                                const newPrescriptions = [...consultationData.prescriptions];
                                newPrescriptions[index].dosage = e.target.value;
                                setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                              }}
                            />
                            <Input
                              placeholder="Frequency"
                              value={prescription.frequency}
                              onChange={(e) => {
                                const newPrescriptions = [...consultationData.prescriptions];
                                newPrescriptions[index].frequency = e.target.value;
                                setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                              }}
                            />
                            <Input
                              placeholder="Duration"
                              value={prescription.duration}
                              onChange={(e) => {
                                const newPrescriptions = [...consultationData.prescriptions];
                                newPrescriptions[index].duration = e.target.value;
                                setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                              }}
                            />
                          </div>
                          <Textarea
                            placeholder="Instructions for patient"
                            value={prescription.instructions}
                            onChange={(e) => {
                              const newPrescriptions = [...consultationData.prescriptions];
                              newPrescriptions[index].instructions = e.target.value;
                              setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                            }}
                            className="min-h-[60px]"
                          />
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addPrescription}>
                        Add Prescription
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Follow-up & Referrals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Follow-up Required</Label>
                        <Select
                          value={consultationData.followUp.required ? "yes" : "no"}
                          onValueChange={(value) => setConsultationData(prev => ({
                            ...prev,
                            followUp: { ...prev.followUp, required: value === "yes" }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No follow-up required</SelectItem>
                            <SelectItem value="yes">Follow-up required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {consultationData.followUp.required && (
                        <div className="space-y-2">
                          <Select
                            value={consultationData.followUp.timeframe}
                            onValueChange={(value) => setConsultationData(prev => ({
                              ...prev,
                              followUp: { ...prev.followUp, timeframe: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Timeframe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1_week">1 week</SelectItem>
                              <SelectItem value="2_weeks">2 weeks</SelectItem>
                              <SelectItem value="1_month">1 month</SelectItem>
                              <SelectItem value="3_months">3 months</SelectItem>
                              <SelectItem value="6_months">6 months</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Reason for follow-up"
                            value={consultationData.followUp.reason}
                            onChange={(e) => setConsultationData(prev => ({
                              ...prev,
                              followUp: { ...prev.followUp, reason: e.target.value }
                            }))}
                          />
                        </div>
                      )}

                      <div>
                        <Label>Referrals</Label>
                        <div className="space-y-2">
                          {consultationData.referrals.map((referral, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2 p-2 border rounded">
                              <Select
                                value={referral.specialty}
                                onValueChange={(value) => {
                                  const newReferrals = [...consultationData.referrals];
                                  newReferrals[index].specialty = value;
                                  setConsultationData(prev => ({ ...prev, referrals: newReferrals }));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Specialty" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cardiology">Cardiology</SelectItem>
                                  <SelectItem value="dermatology">Dermatology</SelectItem>
                                  <SelectItem value="endocrinology">Endocrinology</SelectItem>
                                  <SelectItem value="gastroenterology">Gastroenterology</SelectItem>
                                  <SelectItem value="orthopaedics">Orthopaedics</SelectItem>
                                  <SelectItem value="neurology">Neurology</SelectItem>
                                  <SelectItem value="oncology">Oncology</SelectItem>
                                  <SelectItem value="psychiatry">Psychiatry</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={referral.urgency}
                                onValueChange={(value: "routine" | "urgent" | "2ww") => {
                                  const newReferrals = [...consultationData.referrals];
                                  newReferrals[index].urgency = value;
                                  setConsultationData(prev => ({ ...prev, referrals: newReferrals }));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="routine">Routine</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                  <SelectItem value="2ww">2 Week Wait</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Reason for referral"
                                value={referral.reason}
                                onChange={(e) => {
                                  const newReferrals = [...consultationData.referrals];
                                  newReferrals[index].reason = e.target.value;
                                  setConsultationData(prev => ({ ...prev, referrals: newReferrals }));
                                }}
                                className="col-span-2"
                              />
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={addReferral}>
                            Add Referral
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Consultation started: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button onClick={saveConsultation}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Consultation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}