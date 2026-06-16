import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSymptomCheckSchema } from "@shared/schema";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Stethoscope, 
  Brain,
  FileText,
  Plus,
  X,
  ArrowRight,
  AlertCircle,
  Home,
  Clock,
  User,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const symptomFormSchema = insertSymptomCheckSchema.omit({
  organizationId: true,
  userId: true,
  aiAnalysis: true,
  status: true,
  appointmentCreated: true,
  appointmentId: true,
}).extend({
  symptoms: z.array(z.string()).min(1, "At least one symptom is required"),
  symptomDescription: z.string().min(10, "Please provide a detailed description (at least 10 characters)"),
  duration: z.string().optional(),
  severity: z.string().optional(),
});

type SymptomFormValues = z.infer<typeof symptomFormSchema>;

interface SymptomAnalysis {
  potentialDiagnoses: Array<{
    condition: string;
    probability: string;
    description: string;
    severity: string;
  }>;
  recommendedSpecialists: Array<{
    specialty: string;
    reason: string;
    urgency: string;
  }>;
  redFlags: string[];
  homeCareTips: string[];
  whenToSeekCare: string;
  confidence: number;
}

// Predefined symptoms list
const PREDEFINED_SYMPTOMS = [
  "Headache",
  "Dizziness / Vertigo",
  "Fever / Chills",
  "Fatigue / Tiredness",
  "Cough",
  "Shortness of Breath",
  "Chest Pain / Tightness",
  "Palpitations / Irregular Heartbeat",
  "Nausea / Vomiting",
  "Abdominal Pain",
  "Diarrhea",
  "Constipation",
  "Heartburn / Acid Reflux",
  "Loss of Appetite",
  "Increased Thirst",
  "Frequent Urination",
  "Back Pain",
  "Joint Pain / Swelling",
  "Muscle Weakness",
  "Numbness / Tingling",
  "Insomnia / Sleep Problems",
  "Anxiety / Nervousness",
  "Depression / Low Mood",
  "Rash / Skin Itching",
  "Itchy Eyes / Watery Eyes",
  "Runny / Stuffy Nose",
  "Sore Throat / Hoarseness",
  "Sneezing",
  "Ear Pain / Ear Infection",
  "Blurred Vision",
  "Ringing in Ears (Tinnitus)",
  "Weight Loss",
  "Weight Gain",
  "Memory Problems / Confusion",
  "Mood Swings",
  "Swollen Lymph Nodes",
  "Sweats / Night Sweats",
  "Dizziness on Standing",
  "Hair Loss"
];

// Predefined duration list
const PREDEFINED_DURATIONS = [
  "Less than 1 hour",
  "1–6 hours",
  "6–12 hours",
  "12–24 hours",
  "1–2 days",
  "3–7 days",
  "1–2 weeks",
  "3–4 weeks",
  "1–3 months",
  "3–6 months",
  "6–12 months",
  "More than 1 year",
  "Chronic / Persistent"
];

export default function SymptomCheckerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState("");
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [symptomSearchOpen, setSymptomSearchOpen] = useState(false);
  const [symptomSearchValue, setSymptomSearchValue] = useState("");
  const [durationSearchOpen, setDurationSearchOpen] = useState(false);
  const [durationSearchValue, setDurationSearchValue] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  const form = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomFormSchema),
    defaultValues: {
      patientId: user?.id || 0,
      symptoms: [],
      symptomDescription: "",
      duration: "",
      severity: "",
    },
  });

  const addSymptom = () => {
    if (currentSymptom.trim() && !symptoms.includes(currentSymptom.trim())) {
      const updatedSymptoms = [...symptoms, currentSymptom.trim()];
      setSymptoms(updatedSymptoms);
      form.setValue("symptoms", updatedSymptoms);
      setCurrentSymptom("");
    }
  };

  const removeSymptom = (symptom: string) => {
    const updatedSymptoms = symptoms.filter(s => s !== symptom);
    setSymptoms(updatedSymptoms);
    form.setValue("symptoms", updatedSymptoms);
  };

  const analyzeMutation = useMutation({
    mutationFn: async (data: SymptomFormValues) => {
      try {
        const response = await apiRequest('POST', '/api/symptom-checker/analyze', {
          ...data,
          duration: data.duration || undefined,
          severity: data.severity || undefined,
          patientId: selectedPatientId || undefined
        });
        
        // apiRequest throws if response is not OK, so if we get here, response is OK
        const result = await response.json();
        return result;
      } catch (error: any) {
        console.error('API Request error:', error);
        // Try to extract more details from the error
        if (error.message && error.message.includes('<!DOCTYPE')) {
          throw new Error('Server returned HTML instead of JSON. The endpoint may not be registered. Please check server logs.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ['/api/symptom-checker/history'] });
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your symptoms successfully",
      });
    },
    onError: (error: any) => {
      console.error('Symptom analysis error:', error);
      // Extract error message from error object
      let errorMessage = "Failed to analyze symptoms. Please try again.";
      if (error?.message) {
        // Error message format is usually "400: {error: 'message'}" or just the message
        const messageStr = error.message.toString();
        if (messageStr.includes(':')) {
          const parts = messageStr.split(':');
          if (parts.length > 1) {
            try {
              const jsonPart = parts.slice(1).join(':').trim();
              const parsed = JSON.parse(jsonPart);
              errorMessage = parsed.error || errorMessage;
            } catch {
              errorMessage = parts.slice(1).join(':').trim() || errorMessage;
            }
          }
        } else {
          errorMessage = messageStr;
        }
      }
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const { data: history = [] } = useQuery({
    queryKey: ['/api/symptom-checker/history'],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
  });

  const onSubmit = (data: SymptomFormValues) => {
    analyzeMutation.mutate(data);
  };

  const resetForm = () => {
    setSymptoms([]);
    setCurrentSymptom("");
    setSelectedPatientId(null);
    form.reset({
      patientId: user?.id || 0,
      symptoms: [],
      symptomDescription: "",
      duration: "",
      severity: "",
    });
    setAnalysis(null);
    setShowResults(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'mild': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'severe': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'routine': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'non-urgent': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header title="AI Symptom Checker" subtitle="Get AI-powered insights about your symptoms and recommended next steps" />
      
      <div className="w-full px-3 sm:px-4 lg:px-5 py-4">

        {!showResults ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5" />
                        Describe Your Symptoms
                      </CardTitle>
                      <CardDescription>
                        Provide detailed information about what you're experiencing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 lg:space-y-6">
                      <div className="space-y-2">
                        <FormLabel data-testid="label-patient">Select Patient</FormLabel>
                        <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={patientSearchOpen}
                              className="w-full justify-between"
                              data-testid="button-select-patient"
                            >
                              {selectedPatientId
                                ? (() => {
                                    const selectedPatient = patients.find((patient: any) => patient.id === selectedPatientId);
                                    if (!selectedPatient) return "Select patient...";
                                    return selectedPatient.email
                                      ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.email})`
                                      : `${selectedPatient.firstName} ${selectedPatient.lastName}`;
                                  })()
                                : "Select patient..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search patient..." data-testid="input-search-patient" />
                              <CommandList>
                                <CommandEmpty>No patient found.</CommandEmpty>
                                <CommandGroup>
                                  {patients.map((patient: any) => (
                                    <CommandItem
                                      key={patient.id}
                                      value={`${patient.id}-${patient.firstName}-${patient.lastName}-${patient.email || ''}-${patient.patientNumber || ''}`}
                                      onSelect={() => {
                                        setSelectedPatientId(patient.id);
                                        setPatientSearchOpen(false);
                                      }}
                                      data-testid={`option-patient-${patient.id}`}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{patient.firstName} {patient.lastName}</span>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                          {patient.email && (
                                            <span>{patient.email}</span>
                                          )}
                                          {patient.patientNumber && (
                                            <span>({patient.patientNumber})</span>
                                          )}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <FormLabel data-testid="label-symptoms">List Your Symptoms</FormLabel>
                        <Popover open={symptomSearchOpen} onOpenChange={setSymptomSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={symptomSearchOpen}
                              className="w-full justify-between"
                              data-testid="button-select-symptom"
                              type="button"
                            >
                              {currentSymptom || "Select or type a symptom..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search or type custom symptom..." 
                                value={symptomSearchValue}
                                onValueChange={setSymptomSearchValue}
                                data-testid="input-search-symptom"
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-center">
                                    <p className="text-sm text-gray-600">No symptom found.</p>
                                    {symptomSearchValue && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => {
                                          setCurrentSymptom(symptomSearchValue);
                                          setSymptomSearchOpen(false);
                                          setSymptomSearchValue("");
                                        }}
                                        type="button"
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add "{symptomSearchValue}"
                                      </Button>
                                    )}
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {PREDEFINED_SYMPTOMS
                                    .filter(symptom => 
                                      symptom.toLowerCase().includes(symptomSearchValue.toLowerCase())
                                    )
                                    .map((symptom) => (
                                      <CommandItem
                                        key={symptom}
                                        value={symptom}
                                        onSelect={(value) => {
                                          setCurrentSymptom(value);
                                          setSymptomSearchOpen(false);
                                          setSymptomSearchValue("");
                                        }}
                                        data-testid={`option-symptom-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            currentSymptom === symptom ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {symptom}
                                      </CommandItem>
                                    ))
                                  }
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button 
                          type="button" 
                          onClick={addSymptom}
                          data-testid="button-add-symptom"
                          className="w-full mt-2"
                          disabled={!currentSymptom}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Symptom
                        </Button>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {symptoms.map((symptom) => (
                            <Badge 
                              key={symptom} 
                              variant="secondary"
                              className="px-3 py-1"
                              data-testid={`badge-symptom-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {symptom}
                              <button
                                onClick={() => removeSymptom(symptom)}
                                className="ml-2 hover:text-red-600"
                                data-testid={`button-remove-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                                type="button"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        {form.formState.errors.symptoms && (
                          <p className="text-sm text-red-500">{form.formState.errors.symptoms.message}</p>
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="symptomDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel data-testid="label-description">Detailed Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="textarea-description"
                                placeholder="Describe your symptoms in detail - when did they start, how severe are they, etc."
                                rows={4}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel data-testid="label-duration">Duration</FormLabel>
                              <Popover open={durationSearchOpen} onOpenChange={setDurationSearchOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={durationSearchOpen}
                                      className="w-full justify-between"
                                      data-testid="button-select-duration"
                                      type="button"
                                    >
                                      {field.value || "Select or type duration..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Search or type custom duration..." 
                                      value={durationSearchValue}
                                      onValueChange={setDurationSearchValue}
                                      data-testid="input-search-duration"
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        <div className="p-2 text-center">
                                          <p className="text-sm text-gray-600">No duration found.</p>
                                          {durationSearchValue && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="mt-2"
                                              onClick={() => {
                                                field.onChange(durationSearchValue);
                                                setDurationSearchOpen(false);
                                                setDurationSearchValue("");
                                              }}
                                              type="button"
                                            >
                                              <Plus className="h-4 w-4 mr-2" />
                                              Use "{durationSearchValue}"
                                            </Button>
                                          )}
                                        </div>
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {PREDEFINED_DURATIONS
                                          .filter(duration => 
                                            duration.toLowerCase().includes(durationSearchValue.toLowerCase())
                                          )
                                          .map((duration) => (
                                            <CommandItem
                                              key={duration}
                                              value={duration}
                                              onSelect={(value) => {
                                                field.onChange(value);
                                                setDurationSearchOpen(false);
                                                setDurationSearchValue("");
                                              }}
                                              data-testid={`option-duration-${duration.toLowerCase().replace(/\s+/g, '-')}`}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  field.value === duration ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {duration}
                                            </CommandItem>
                                          ))
                                        }
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="severity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel data-testid="label-severity">Severity</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-severity">
                                    <SelectValue placeholder="Select severity" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="mild" data-testid="option-mild">Mild</SelectItem>
                                  <SelectItem value="moderate" data-testid="option-moderate">Moderate</SelectItem>
                                  <SelectItem value="severe" data-testid="option-severe">Severe</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-semibold mb-1">Medical Disclaimer</p>
                            <p>This AI symptom checker is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={analyzeMutation.isPending}
                        className="w-full"
                        size="lg"
                        data-testid="button-analyze"
                      >
                        {analyzeMutation.isPending ? (
                          <>Analyzing Symptoms...</>
                        ) : (
                          <>
                            Analyze Symptoms
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Checks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {history.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                          No previous symptom checks
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {history.slice(0, 5).map((check: any) => (
                            <div 
                              key={check.id}
                              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover-elevate transition-colors"
                              data-testid={`history-item-${check.id}`}
                              onClick={() => setSelectedHistoryItem(check)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  {check.patient && (
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                      {check.patient.firstName} {check.patient.lastName} ({check.patient.patientId})
                                    </p>
                                  )}
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {check.symptoms.slice(0, 2).join(', ')}
                                    {check.symptoms.length > 2 && ` +${check.symptoms.length - 2} more`}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(check.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs" data-testid={`badge-status-${check.id}`}>
                                  {check.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Analysis Results
                  </CardTitle>
                  <Button onClick={resetForm} variant="outline" data-testid="button-new-check">
                    New Check
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Your Symptoms</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {symptoms.map((symptom) => (
                          <Badge key={symptom} variant="outline" data-testid={`result-symptom-${symptom.toLowerCase().replace(/\s+/g, '-')}`}>
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                      {form.getValues("duration") && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                          Duration: {form.getValues("duration")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {analysis && (
                  <div className="space-y-4 lg:space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 lg:mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Potential Diagnoses
                      </h3>
                      <div className="space-y-2 lg:space-y-3">
                        {analysis.potentialDiagnoses.map((diagnosis, index) => (
                          <Card key={index} data-testid={`diagnosis-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {diagnosis.condition}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    {diagnosis.description}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Badge className={getProbabilityColor(diagnosis.probability)} data-testid={`badge-probability-${index}`}>
                                    {diagnosis.probability} probability
                                  </Badge>
                                  <Badge className={getSeverityColor(diagnosis.severity)} data-testid={`badge-severity-${index}`}>
                                    {diagnosis.severity}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 lg:mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Recommended Specialists
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3">
                        {analysis.recommendedSpecialists.map((specialist, index) => (
                          <Card key={index} data-testid={`specialist-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {specialist.specialty}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    {specialist.reason}
                                  </p>
                                </div>
                                <Badge className={getUrgencyColor(specialist.urgency)} data-testid={`badge-urgency-${index}`}>
                                  {specialist.urgency}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {analysis.redFlags.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-800 dark:text-red-200">
                          <AlertCircle className="h-5 w-5" />
                          Warning Signs
                        </h3>
                        <ul className="space-y-2">
                          {analysis.redFlags.map((flag, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300" data-testid={`red-flag-${index}`}>
                              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold mb-3 lg:mb-4 flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Home Care Tips
                      </h3>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <ul className="space-y-2">
                          {analysis.homeCareTips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300" data-testid={`tip-${index}`}>
                              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <Clock className="h-5 w-5" />
                        When to Seek Care
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-when-to-seek-care">
                        {analysis.whenToSeekCare}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Score:</span>
                        <Badge variant="outline" data-testid="badge-confidence">
                          {(analysis.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* History Item Detail Dialog */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Symptom Analysis Result
            </DialogTitle>
          </DialogHeader>
          {selectedHistoryItem && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Patient & Symptoms Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {selectedHistoryItem.patient && (
                    <p className="text-sm font-semibold text-primary">
                      Patient: {selectedHistoryItem.patient.firstName} {selectedHistoryItem.patient.lastName} ({selectedHistoryItem.patient.patientId})
                    </p>
                  )}
                  <p className="text-sm"><strong>Date:</strong> {new Date(selectedHistoryItem.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>Symptoms:</strong> {selectedHistoryItem.symptoms?.join(', ')}</p>
                  {selectedHistoryItem.symptomDescription && (
                    <p className="text-sm"><strong>Description:</strong> {selectedHistoryItem.symptomDescription}</p>
                  )}
                  {selectedHistoryItem.duration && (
                    <p className="text-sm"><strong>Duration:</strong> {selectedHistoryItem.duration}</p>
                  )}
                  {selectedHistoryItem.severity && (
                    <p className="text-sm"><strong>Severity:</strong> {selectedHistoryItem.severity}</p>
                  )}
                  <Badge variant="outline">{selectedHistoryItem.status}</Badge>
                </div>

                {/* AI Analysis */}
                {selectedHistoryItem.aiAnalysis && (() => {
                  const aiData = typeof selectedHistoryItem.aiAnalysis === 'string' 
                    ? JSON.parse(selectedHistoryItem.aiAnalysis) 
                    : selectedHistoryItem.aiAnalysis;
                  
                  return (
                    <div className="space-y-6">
                      {/* Potential Diagnoses */}
                      {aiData.potentialDiagnoses && aiData.potentialDiagnoses.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Potential Diagnoses
                          </h3>
                          <div className="space-y-3">
                            {aiData.potentialDiagnoses.map((diagnosis: any, index: number) => (
                              <div key={index} className="bg-muted/30 rounded-lg p-4 border">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{diagnosis.condition}</h4>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary">{diagnosis.probability}</Badge>
                                    <Badge variant={diagnosis.severity === 'High' ? 'destructive' : 'outline'}>
                                      {diagnosis.severity}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{diagnosis.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Red Flags */}
                      {aiData.redFlags && aiData.redFlags.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-red-800 dark:text-red-200">
                            <AlertTriangle className="h-5 w-5" />
                            Red Flags
                          </h3>
                          <ul className="space-y-1">
                            {aiData.redFlags.map((flag: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{flag}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Specialists */}
                      {aiData.recommendedSpecialists && aiData.recommendedSpecialists.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            Recommended Specialists
                          </h3>
                          <div className="space-y-2">
                            {aiData.recommendedSpecialists.map((specialist: any, index: number) => (
                              <div key={index} className="bg-muted/30 rounded-lg p-3 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{specialist.specialty}</span>
                                  <Badge variant={specialist.urgency === 'Urgent' ? 'destructive' : 'secondary'} className="text-xs">
                                    {specialist.urgency}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{specialist.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Home Care Tips */}
                      {aiData.homeCareTips && aiData.homeCareTips.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-green-800 dark:text-green-200">
                            <Home className="h-5 w-5" />
                            Home Care Tips
                          </h3>
                          <ul className="space-y-1">
                            {aiData.homeCareTips.map((tip: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* When to Seek Care */}
                      {aiData.whenToSeekCare && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                            <Clock className="h-5 w-5" />
                            When to Seek Care
                          </h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{aiData.whenToSeekCare}</p>
                        </div>
                      )}

                      {/* Confidence Score */}
                      {aiData.confidence !== undefined && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Confidence Score:</span>
                          <Badge variant="outline">{(aiData.confidence * 100).toFixed(0)}%</Badge>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* No AI Analysis */}
                {!selectedHistoryItem.aiAnalysis && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No AI analysis available for this symptom check.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
