import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  FileText,
  Stethoscope,
  Pill,
  Calendar,
  AlertTriangle,
  ClipboardList,
  X,
  Mic,
  MicOff,
  Square
} from "lucide-react";

interface ConsultationNotesProps {
  patientId: number;
}

interface MedicalRecord {
  id: number;
  type: string;
  title: string;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  createdAt: string;
  prescription?: {
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
    }>;
  };
  aiSuggestions?: {
    recommendations: string[];
  };
}

export default function ConsultationNotes({ patientId }: ConsultationNotesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Audio transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);

  const { data: medicalRecords = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/records`],
    enabled: !!patientId,
  });

  const form = useForm({
    defaultValues: {
      type: "consultation",
      title: "",
      notes: "",
      diagnosis: "",
      treatment: "",
      medications: [],
      followUpRequired: false,
      followUpDate: "",
      referrals: []
    }
  });

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      console.log('Speech Recognition API check:', {
        SpeechRecognition: !!SpeechRecognition,
        webkitSpeechRecognition: !!window.webkitSpeechRecognition,
        isTranscriptionSupported,
        userAgent: navigator.userAgent
      });
      
      if (SpeechRecognition) {
        setIsTranscriptionSupported(true);
        console.log('Speech recognition is supported, setting up...');
        
        // Don't create the recognition instance here, create it when needed
        // This prevents issues with stale references
      } else {
        console.log('Speech recognition is not supported in this browser');
        setIsTranscriptionSupported(false);
      }
    }

    return () => {
      // Clean up any active recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (error) {
          console.error('Error cleaning up recognition:', error);
        }
      }
    };
  }, []); // Remove form and toast dependencies to prevent recreation

  const startRecording = async () => {
    if (!isTranscriptionSupported) {
      toast({
        title: "Transcription Not Supported",
        description: "Please use Chrome or Edge browser for audio transcription.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      return; // Already recording
    }

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Always create a fresh recognition instance to avoid state issues
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        // Clean up any existing recognition
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (error) {
            console.log('Previous recognition already stopped');
          }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Speech recognition started successfully');
        };

        recognition.onresult = (event) => {
          console.log('Speech recognition result received');
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update live transcript display
          setTranscript(prev => prev + interimTranscript);
          
          if (finalTranscript) {
            console.log('Final transcript received:', finalTranscript);
            const currentNotes = form.getValues("notes");
            const newNotes = currentNotes + finalTranscript;
            form.setValue("notes", newNotes);
            // Clear interim transcript and add final transcript
            setTranscript(finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: "Transcription Error",
            description: `Unable to transcribe audio: ${event.error}. Please try again.`,
            variant: "destructive",
          });
          setIsRecording(false);
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }

      if (recognitionRef.current) {
        setTranscript("");
        recognitionRef.current.start();
        setIsRecording(true);
        toast({
          title: "Recording Started",
          description: "Speak clearly to transcribe your clinical notes",
        });
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice transcription.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Stopping speech recognition');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    
    if (isRecording) {
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Transcription has been added to your clinical notes",
      });
    }
  };

  const createRecordMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", `/api/patients/${patientId}/records`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/records`] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Medical record saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save medical record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const formattedData = {
      ...data,
      patientId: Number(patientId),
      prescription: data.medications && data.medications.length > 0 ? {
        medications: data.medications
      } : undefined
    };
    createRecordMutation.mutate(formattedData);
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "consultation": return <Stethoscope className="h-4 w-4" />;
      case "prescription": return <Pill className="h-4 w-4" />;
      case "lab": return <ClipboardList className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case "consultation": return "bg-blue-100 text-blue-800";
      case "prescription": return "bg-green-100 text-green-800";
      case "lab": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medical Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading medical records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Medical Records
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medical Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Record Type</Label>
                    <select
                      {...form.register("type")}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="consultation">Consultation</option>
                      <option value="prescription">Prescription</option>
                      <option value="lab">Lab Results</option>
                      <option value="imaging">Imaging</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      {...form.register("title")}
                      placeholder="e.g., Regular Checkup, Follow-up Visit"
                    />
                  </div>
                </div>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="notes">Clinical Notes</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant={isRecording ? "destructive" : "outline"}
                            size="sm"
                            onClick={isRecording ? stopRecording : startRecording}
                            className="flex items-center space-x-1"
                            disabled={!isTranscriptionSupported}
                            title={isTranscriptionSupported ? "Click to start dictating your notes" : "Speech recognition not supported in this browser"}
                          >
                            {isRecording ? (
                              <>
                                <Square className="h-3 w-3" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Mic className="h-3 w-3" />
                                <span>Transcribe Audio</span>
                              </>
                            )}
                          </Button>
                          {isRecording && (
                            <div className="flex items-center space-x-1 text-red-600 text-xs animate-pulse">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              <span>Recording...</span>
                            </div>
                          )}
                          {!isTranscriptionSupported && (
                            <span className="text-xs text-gray-500">
                              (Try Chrome/Edge for audio transcription)
                            </span>
                          )}
                        </div>
                      </div>
                      <Textarea
                        {...form.register("notes")}
                        placeholder="Patient presentation, examination findings, etc. Click 'Transcribe Audio' to dictate your notes."
                        rows={4}
                        onFocus={() => {
                          // Don't stop recording when user clicks in the text area
                          // This allows them to position cursor while recording continues
                          console.log('Textarea focused, recording state:', isRecording);
                        }}
                        onChange={(e) => {
                          // Handle manual text changes
                          const { onChange } = form.register("notes");
                          onChange(e);
                        }}
                      />
                      {transcript && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <span className="text-blue-700 font-medium">Live Transcription: </span>
                          <span className="text-blue-800">{transcript}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="diagnosis">Diagnosis</Label>
                      <Textarea
                        {...form.register("diagnosis")}
                        placeholder="Primary and secondary diagnoses"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="treatment">Treatment Plan</Label>
                      <Textarea
                        {...form.register("treatment")}
                        placeholder="Treatment recommendations and instructions"
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="medications" className="space-y-4">
                    <div className="space-y-3">
                      <Label>Prescribed Medications</Label>
                      {form.watch("medications")?.map((med: any, index: number) => (
                        <div key={index} className="border p-3 rounded-md space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Medication {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const current = form.watch("medications") || [];
                                const updated = current.filter((_: any, i: number) => i !== index);
                                form.setValue("medications", updated);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              {...form.register(`medications.${index}.name` as any)}
                              placeholder="Medication name"
                            />
                            <Input
                              {...form.register(`medications.${index}.dosage` as any)}
                              placeholder="Dosage (e.g., 500mg)"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              {...form.register(`medications.${index}.frequency` as any)}
                              placeholder="Frequency (e.g., twice daily)"
                            />
                            <Input
                              {...form.register(`medications.${index}.duration` as any)}
                              placeholder="Duration (e.g., 7 days)"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const current = form.watch("medications") || [];
                          form.setValue("medications", [...current, { name: "", dosage: "", frequency: "", duration: "" }] as any);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Medication
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="followup" className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...form.register("followUpRequired")}
                        className="rounded border-gray-300"
                      />
                      <Label>Follow-up appointment required</Label>
                    </div>
                    {form.watch("followUpRequired") && (
                      <div>
                        <Label htmlFor="followUpDate">Follow-up Date</Label>
                        <Input
                          type="date"
                          {...form.register("followUpDate" as any)}
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createRecordMutation.isPending}
                  >
                    {createRecordMutation.isPending ? "Saving..." : "Save Record"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!Array.isArray(medicalRecords) || medicalRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No medical records found</p>
            <p className="text-sm">Add the first consultation note or medical record</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(medicalRecords as MedicalRecord[]).map((record) => (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRecordIcon(record.type)}
                      <h4 className="font-semibold">{record.title}</h4>
                    </div>
                    <Badge className={getRecordColor(record.type)}>
                      {record.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(record.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>

                {record.notes && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700">{record.notes}</p>
                  </div>
                )}

                {record.diagnosis && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Diagnosis:</h5>
                    <p className="text-sm text-gray-700">{record.diagnosis}</p>
                  </div>
                )}

                {record.treatment && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Treatment:</h5>
                    <p className="text-sm text-gray-700">{record.treatment}</p>
                  </div>
                )}

                {record.prescription?.medications && record.prescription.medications.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Pill className="h-4 w-4" />
                      Prescribed Medications:
                    </h5>
                    <div className="space-y-2">
                      {record.prescription.medications.map((med, index) => (
                        <div key={index} className="bg-green-50 p-2 rounded text-sm">
                          <strong>{med.name}</strong> - {med.dosage}, {med.frequency}
                          {med.duration && <span> for {med.duration}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {record.aiSuggestions?.recommendations && record.aiSuggestions.recommendations.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      AI Recommendations:
                    </h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {record.aiSuggestions.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-600">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}