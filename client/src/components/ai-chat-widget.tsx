import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  User, 
  Send, 
  Calendar, 
  Pill, 
  Clock, 
  Stethoscope,
  FileText,
  Sparkles,
  X,
  MessageCircle,
  Loader2,
  Minimize2,
  Maximize2,
  Mic,
  MicOff,
  ChevronRight,
  CheckCircle,
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isDoctorLike } from "@/lib/role-utils";

// Simple type for our speech recognition usage
type CustomSpeechRecognition = any;

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Skin, Hair & Appearance": {
    "Dermatologist": ["Skin", "Hair", "Nails"],
    "Cosmetologist": ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"]
  },
  "Eye & Vision": {
    "Ophthalmologist": ["Cataracts", "Glaucoma", "Surgeries"],
    "Optometrist": ["Vision correction (glasses, lenses)"]
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    "Orthodontist": ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"]
  }
} as const;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  showMainOptions?: boolean;
  showSpecialtySelector?: boolean;
  showSubSpecialtySelector?: boolean;
  showDoctorSelector?: boolean;
  showTimeSlotSelector?: boolean;
  showRegistrationInput?: boolean;
  showRegistrationOptions?: boolean;
  showRebookingOptions?: boolean;
  showPrescriptionSearchInput?: boolean;
  showPrescriptionSearchAgainOptions?: boolean;
  showSelectAnotherDoctorOptions?: boolean;
  selectedCategory?: string;
  selectedSubSpecialty?: string;
  selectedDoctor?: any;
  availableDoctors?: any[];
  availableTimeSlots?: any[];
  intent?: string;
  entities?: any[];
  confidence?: number;
  medicalAdviceLevel?: 'none' | 'educational' | 'guidance' | 'referral';
  disclaimers?: string[];
  followUpQuestions?: string[];
  educationalContent?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  recommendedSpecialty?: string;
}

interface Prescription {
  id: string;
  patientName: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  diagnosis: string;
  status: string;
  prescribedAt: string;
}

interface Appointment {
  id: string;
  patientName: string;
  providerName: string;
  title: string;
  scheduledAt: string;
  status: string;
  duration: number;
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your Cura AI Assistant. Please select what you'd like to do:",
      timestamp: new Date(),
      showMainOptions: true
    }
  ]);
  const [bookingState, setBookingState] = useState({
    step: 'idle', // idle, category, subspecialty, doctor, timeslot, registration, confirmation
    selectedCategory: '',
    selectedSubSpecialty: '',
    selectedDoctor: null as any,
    selectedTimeSlot: null as any,
    patientRegistrationNumber: '',
    availableDoctors: [] as any[],
    availableTimeSlots: [] as any[]
  });
  const [input, setInput] = useState("");
  const [registrationInput, setRegistrationInput] = useState("");
  const [prescriptionSearchInput, setPrescriptionSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<CustomSpeechRecognition | null>(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState("");
  const transcriptBufferRef = useRef("");
  const isProcessingSpeechRef = useRef(false);
  const speechEndTimeRef = useRef(0);
  const lastSpeechInputRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to generate time slots
  const generateAvailableTimeSlots = (doctor: any) => {
    const slots = [];
    const today = new Date();
    
    // Generate slots for the next 7 days
    for (let day = 1; day <= 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      
      // Skip weekends if doctor doesn't work weekends
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (doctor.workingDays && doctor.workingDays.length > 0 && !doctor.workingDays.includes(dayName)) {
        continue;
      }
      
      // Generate hourly slots during working hours
      const startHour = doctor.workingHours?.start ? parseInt(doctor.workingHours.start.split(':')[0]) : 9;
      const endHour = doctor.workingHours?.end ? parseInt(doctor.workingHours.end.split(':')[0]) : 17;
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Create a consistent datetime string without timezone conversion
        const year = slotTime.getFullYear();
        const month = String(slotTime.getMonth() + 1).padStart(2, '0');
        const day = String(slotTime.getDate()).padStart(2, '0');
        const hours = String(slotTime.getHours()).padStart(2, '0');
        const minutes = String(slotTime.getMinutes()).padStart(2, '0');
        const consistentDatetime = `${year}-${month}-${day}T${hours}:${minutes}:00`;
        
        slots.push({
          datetime: consistentDatetime,
          display: format(slotTime, 'EEE, MMM d - h:mm a'),
          available: true
        });
      }
    }
    
    return slots;
  };

  // Handler functions for main options
  const handleMainOptionSelection = async (option: 'book_appointments' | 'find_prescriptions') => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option === 'book_appointments' ? 'Book appointments' : 'Find prescriptions',
      timestamp: new Date(),
    };

    if (option === 'book_appointments') {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'll help you book an appointment. Let's start by selecting the medical specialty category.",
        timestamp: new Date(),
        showSpecialtySelector: true
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setBookingState(prev => ({ ...prev, step: 'category' }));
    } else {
      // Handle prescription search - prompt for patient details
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Please enter Patient Name, NPI Number, or Registration Number.",
        timestamp: new Date(),
        showPrescriptionSearchInput: true
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
    }
  };

  // Handler functions for appointment booking flow
  const handleCategorySelection = async (category: string) => {
    setBookingState(prev => ({ ...prev, selectedCategory: category, step: 'subspecialty' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected category: ${category}`,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: `Great! You selected "${category}". Now please select a sub-specialty:`,
      timestamp: new Date(),
      showSubSpecialtySelector: true,
      selectedCategory: category
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
  };

  const handleSubSpecialtySelection = async (subSpecialty: string) => {
    setBookingState(prev => ({ ...prev, selectedSubSpecialty: subSpecialty, step: 'doctor' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected sub-specialty: ${subSpecialty}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Fetch doctors with the selected specialty
      const response = await apiRequest("GET", `/api/medical-staff?specialty=${encodeURIComponent(bookingState.selectedCategory)}&subSpecialty=${encodeURIComponent(subSpecialty)}`);
      const data = await response.json();
      const doctors = data?.staff || [];
      
      // Filter for doctors only
      const filteredDoctors = doctors.filter((doctor: any) => isDoctorLike(doctor.role));
      
      setBookingState(prev => ({ ...prev, availableDoctors: filteredDoctors }));

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: filteredDoctors.length > 0 
          ? `Perfect! I found ${filteredDoctors.length} available doctor(s) for "${subSpecialty}". Please select a doctor:`
          : `I'm sorry, there are no doctors available for "${subSpecialty}" at the moment. Please try a different specialty.\n\nWould you like to select another doctor?`,
        timestamp: new Date(),
        showDoctorSelector: filteredDoctors.length > 0,
        showSelectAnotherDoctorOptions: filteredDoctors.length === 0,
        availableDoctors: filteredDoctors
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: 'I encountered an error while fetching available doctors. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorSelection = async (doctor: any) => {
    setBookingState(prev => ({ ...prev, selectedDoctor: doctor, step: 'timeslot' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected doctor: Dr. ${doctor.firstName} ${doctor.lastName}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Generate time slots for the next 7 days
      const timeSlots = generateAvailableTimeSlots(doctor);
      setBookingState(prev => ({ ...prev, availableTimeSlots: timeSlots }));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Excellent choice! Dr. ${doctor.firstName} ${doctor.lastName} is available. Please select a date and time:`,
        timestamp: new Date(),
        showTimeSlotSelector: true,
        availableTimeSlots: timeSlots
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error generating time slots:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I encountered an error while fetching available time slots. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotSelection = async (timeSlot: any) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected time: ${format(new Date(timeSlot.datetime), 'PPp')}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Check if time slot is already booked
      const response = await apiRequest("GET", `/api/appointments?providerId=${bookingState.selectedDoctor.id}&date=${format(new Date(timeSlot.datetime), 'yyyy-MM-dd')}`);
      const existingAppointments = await response.json();
      
      // Check if the selected time slot conflicts with existing appointments
      const isSlotBooked = existingAppointments.some((appointment: any) => {
        const existingTime = appointment.scheduledAt || appointment.scheduled_at;
        if (!existingTime) return false;
        
        const existingDateTime = new Date(existingTime);
        const selectedDateTime = new Date(timeSlot.datetime);
        
        // Check if times match (same hour and minute)
        return existingDateTime.getHours() === selectedDateTime.getHours() &&
               existingDateTime.getMinutes() === selectedDateTime.getMinutes();
      });

      if (isSlotBooked) {
        // Time slot is already booked - show error and redisplay time slots
        const conflictMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `❌ This time slot is already booked. Please select another available time.`,
          timestamp: new Date(),
          showTimeSlotSelector: true,
          availableTimeSlots: bookingState.availableTimeSlots
        };
        
        setMessages(prev => [...prev, userMessage, conflictMessage]);
        setBookingState(prev => ({ ...prev, step: 'timeslot' }));
      } else {
        // Time slot is available - proceed to patient verification
        setBookingState(prev => ({ ...prev, selectedTimeSlot: timeSlot, step: 'registration' }));
        
        const registrationMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Great! Now please enter your Patient Name or Patient Registration Number/NHS Number to proceed with the booking:`,
          timestamp: new Date(),
          showRegistrationInput: true
        };

        setMessages(prev => [...prev, userMessage, registrationMessage]);
      }
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I encountered an error while checking time slot availability. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for patient name or registration number submission
  const handleRegistrationSubmission = async (patientInput: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Patient Info: ${patientInput}`,
      timestamp: new Date(),
    };

    setIsLoading(true);
    setBookingState(prev => ({ ...prev, patientRegistrationNumber: patientInput }));

    try {
      // Check if patient exists in database by name or registration
      const response = await apiRequest("GET", `/api/patients?search=${encodeURIComponent(patientInput)}`);
      const data = await response.json();
      
      // Look for patient with matching name, patientId or nhsNumber
      const matchedPatient = data.find((patient: any) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const searchInput = patientInput.toLowerCase();
        return fullName.includes(searchInput) || 
               patient.patientId === patientInput || 
               patient.nhsNumber === patientInput;
      });

      if (matchedPatient) {
        // Patient found - proceed with booking
        await proceedWithBooking(matchedPatient);
        setMessages(prev => [...prev, userMessage]);
      } else {
        // Patient not found - show options
        const notFoundMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `❌ No patient found with the name or registration number you entered. Would you like to:`,
          timestamp: new Date(),
          showRegistrationOptions: true
        };
        setMessages(prev => [...prev, userMessage, notFoundMessage]);
      }

    } catch (error) {
      console.error('Error validating patient information:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I encountered an error while validating your patient information. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for prescription search submission
  const handlePrescriptionSearchSubmission = async (searchInput: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Search for: ${searchInput}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Search prescriptions by patient name, NPI number, or registration number
      const response = await apiRequest("GET", `/api/prescriptions?search=${encodeURIComponent(searchInput)}`);
      const prescriptions = await response.json();

      if (prescriptions && prescriptions.length > 0) {
        // Prescriptions found - display results
        const resultsMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Found ${prescriptions.length} prescription(s):`,
          timestamp: new Date(),
          data: { prescriptions }
        };
        setMessages(prev => [...prev, userMessage, resultsMessage]);
      } else {
        // No prescriptions found - show search again options
        const noResultsMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "No prescriptions found. Would you like to search for another prescription?",
          timestamp: new Date(),
          showPrescriptionSearchAgainOptions: true
        };
        setMessages(prev => [...prev, userMessage, noResultsMessage]);
      }

    } catch (error) {
      console.error('Error searching prescriptions:', error);
      // On error, show search again options
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "No prescriptions found. Would you like to search for another prescription?",
        timestamp: new Date(),
        showPrescriptionSearchAgainOptions: true
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithBooking = async (patient: any) => {
    try {
      // Book the appointment
      const appointmentData = {
        patientId: patient.id, // Use the actual patient ID from database
        providerId: parseInt(bookingState.selectedDoctor.id),
        title: `${bookingState.selectedSubSpecialty} Consultation`,
        description: `Appointment with Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}`,
        appointmentDate: format(new Date(bookingState.selectedTimeSlot.datetime), 'yyyy-MM-dd'),
        scheduledAt: bookingState.selectedTimeSlot.datetime,
        duration: 30,
        type: "consultation",
        department: bookingState.selectedCategory,
        isVirtual: false
      };

      const bookingResponse = await apiRequest("POST", "/api/appointments", appointmentData);
      const bookingResult = await bookingResponse.json();

      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `✅ **Appointment Successfully Booked!**\n\n**Patient:** ${patient.firstName} ${patient.lastName}\n**Registration:** ${bookingState.patientRegistrationNumber}\n**Doctor:** Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}\n**Specialty:** ${bookingState.selectedSubSpecialty}\n**Date & Time:** ${format(new Date(bookingState.selectedTimeSlot.datetime), 'PPp')}\n**Department:** ${bookingState.selectedCategory}\n\nYour appointment has been confirmed. You will receive a confirmation message shortly.\n\nDo you want to book another appointment?`,
        timestamp: new Date(),
        data: bookingResult,
        showRebookingOptions: true
      };

      setMessages(prev => [...prev, successMessage]);
      
      // Reset booking state
      setBookingState({
        step: 'idle',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        patientRegistrationNumber: '',
        availableDoctors: [],
        availableTimeSlots: []
      });

      toast({
        title: "Appointment Booked",
        description: `Successfully booked for ${patient.firstName} ${patient.lastName}`,
      });

    } catch (error) {
      console.error('Error booking appointment:', error);
      // Return to time slot selection instead of showing generic error
      const goBackMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Please select a date and time for your appointment with Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}:`,
        timestamp: new Date(),
        showTimeSlotSelector: true,
        availableTimeSlots: bookingState.availableTimeSlots
      };
      setMessages(prev => [...prev, goBackMessage]);
      setBookingState(prev => ({ ...prev, step: 'timeslot', patientRegistrationNumber: '' }));
    }
  };

  // Handler for select another doctor options (yes or no)
  const handleSelectAnotherDoctorOptions = async (option: 'yes' | 'no') => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option === 'yes' ? 'Yes, select another doctor' : 'No, I\'m done',
      timestamp: new Date(),
    };

    if (option === 'yes') {
      // Return to the beginning of the booking flow (specialty selection)
      const restartMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'll help you book an appointment. Let's start by selecting the medical specialty category.",
        timestamp: new Date(),
        showSpecialtySelector: true
      };
      
      setMessages(prev => [...prev, userMessage, restartMessage]);
      setBookingState({
        step: 'category',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        patientRegistrationNumber: '',
        availableDoctors: [],
        availableTimeSlots: []
      });
    } else {
      // Thank the user and show main options
      const completionMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Thank you for using Cura AI Assistant! If you need any further assistance, feel free to ask.",
        timestamp: new Date(),
        showMainOptions: true
      };
      
      setMessages(prev => [...prev, userMessage, completionMessage]);
      setBookingState({
        step: 'idle',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        patientRegistrationNumber: '',
        availableDoctors: [],
        availableTimeSlots: []
      });
    }
  };

  // Handler for prescription search again options (yes or no)
  const handlePrescriptionSearchAgainOptions = async (option: 'yes' | 'no') => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option === 'yes' ? 'Yes, search again' : 'No, I\'m done',
      timestamp: new Date(),
    };

    if (option === 'yes') {
      // Return to prescription search input
      const searchAgainMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Please enter Patient Name, NPI Number, or Registration Number.",
        timestamp: new Date(),
        showPrescriptionSearchInput: true
      };
      setMessages(prev => [...prev, userMessage, searchAgainMessage]);
    } else {
      // Thank the user and show main options
      const completionMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Thank you for using Cura AI Assistant! If you need any further assistance, feel free to ask.",
        timestamp: new Date(),
        showMainOptions: true
      };
      setMessages(prev => [...prev, userMessage, completionMessage]);
    }
  };

  // Handler for rebooking options (yes or no)
  const handleRebookingOptions = async (option: 'yes' | 'no') => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option === 'yes' ? 'Yes, book another appointment' : 'No, I\'m done',
      timestamp: new Date(),
    };

    if (option === 'yes') {
      // Start a new booking flow
      const restartMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'll help you book another appointment. Let's start by selecting the medical specialty category.",
        timestamp: new Date(),
        showSpecialtySelector: true
      };
      
      setMessages(prev => [...prev, userMessage, restartMessage]);
      setBookingState({
        step: 'category',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        patientRegistrationNumber: '',
        availableDoctors: [],
        availableTimeSlots: []
      });
    } else {
      // Thank the user and show main options
      const completionMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Thank you for using Cura AI Assistant! If you need any further assistance, feel free to ask.",
        timestamp: new Date(),
        showMainOptions: true
      };
      
      setMessages(prev => [...prev, userMessage, completionMessage]);
      setBookingState({
        step: 'idle',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        patientRegistrationNumber: '',
        availableDoctors: [],
        availableTimeSlots: []
      });
    }
  };

  const handleRegistrationOptions = async (option: 'reenter' | 'exit' | 'goback') => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option === 'reenter' ? 'Enter it again' : option === 'exit' ? 'Exit' : 'Go Back',
      timestamp: new Date(),
    };

    if (option === 'reenter') {
      // Show registration input again
      const reenterMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Please enter your Patient Name or Patient Registration Number/NHS Number again:`,
        timestamp: new Date(),
        showRegistrationInput: true
      };
      setMessages(prev => [...prev, userMessage, reenterMessage]);
      
    } else if (option === 'exit') {
      // Return to start (doctor specialty selection)
      const exitMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'll help you book an appointment. Let's start by selecting the medical specialty category.`,
        timestamp: new Date(),
        showSpecialtySelector: true
      };
      setMessages(prev => [...prev, userMessage, exitMessage]);
      setBookingState({
        step: 'category',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        patientRegistrationNumber: '',
        availableDoctors: [],
        availableTimeSlots: []
      });
    } else { // goback
      // Go back to time slot selection
      const goBackMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Please select a date and time for your appointment with Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}:`,
        timestamp: new Date(),
        showTimeSlotSelector: true,
        availableTimeSlots: bookingState.availableTimeSlots
      };
      setMessages(prev => [...prev, userMessage, goBackMessage]);
      setBookingState(prev => ({ ...prev, step: 'timeslot' }));
    }
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} className="mt-2 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
            {appointment.title}
          </CardTitle>
          <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
            {appointment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Patient:</strong> {appointment.patientName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Provider:</strong> {appointment.providerName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(appointment.scheduledAt), 'PPp')} ({appointment.duration} mins)
        </p>
      </CardContent>
    </Card>
  );

  const renderPrescriptionCard = (prescription: Prescription) => (
    <Card key={prescription.id} className="mt-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {prescription.patientName}
          </CardTitle>
          <Badge variant={prescription.status === 'signed' ? 'default' : 'secondary'}>
            {prescription.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          <strong>Diagnosis:</strong> {prescription.diagnosis}
        </p>
        <div className="space-y-1">
          {prescription.medications.map((med, idx) => (
            <div key={idx} className="text-sm text-gray-900 dark:text-gray-100">
              <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Prescribed: {format(new Date(prescription.prescribedAt), 'MMM dd, yyyy')}
        </p>
      </CardContent>
    </Card>
  );

  const renderSpecialtySelector = (message: Message) => {
    const categories = Object.keys(medicalSpecialties);
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Medical Specialty Category:</p>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant="outline"
              onClick={() => handleCategorySelection(category)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              data-testid={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>{category}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderSubSpecialtySelector = (message: Message) => {
    const category = message.selectedCategory;
    if (!category || !medicalSpecialties[category as keyof typeof medicalSpecialties]) return null;
    
    const subSpecialties = Object.keys(medicalSpecialties[category as keyof typeof medicalSpecialties]);
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Sub-Specialty in {category}:</p>
        <div className="grid grid-cols-1 gap-2">
          {subSpecialties.map((subSpecialty) => (
            <Button
              key={subSpecialty}
              variant="outline"
              onClick={() => handleSubSpecialtySelection(subSpecialty)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
              data-testid={`subspecialty-${subSpecialty.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="flex-1 text-left break-words min-w-0">{subSpecialty}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderDoctorSelector = (message: Message) => {
    const doctors = message.availableDoctors || [];
    if (doctors.length === 0) return null;
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Doctors:</p>
        <div className="grid grid-cols-1 gap-2">
          {doctors.map((doctor) => (
            <Button
              key={doctor.id}
              variant="outline"
              onClick={() => handleDoctorSelection(doctor)}
              className="justify-start text-left h-auto py-4 px-4 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              data-testid={`doctor-${doctor.id}`}
            >
              <div className="flex items-start gap-3 w-full">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-1" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {doctor.specialty} {doctor.subSpecialty && `• ${doctor.subSpecialty}`}
                  </div>
                  {doctor.experience && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {doctor.experience} years experience
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 ml-auto mt-1" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeSlotSelector = (message: Message) => {
    const timeSlots = message.availableTimeSlots || [];
    if (timeSlots.length === 0) return null;
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Time Slots:</p>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
          {timeSlots.map((slot, index) => (
            <Button
              key={`${slot.datetime}-${index}`}
              variant="outline"
              onClick={() => handleTimeSlotSelection(slot)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              data-testid={`timeslot-${index}`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>{slot.display}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderMainOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How can I help you today?</p>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            onClick={() => handleMainOptionSelection('book_appointments')}
            className="justify-start text-left h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            data-testid="option-book-appointments"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Book appointments</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleMainOptionSelection('find_prescriptions')}
            className="justify-start text-left h-auto py-3 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
            data-testid="option-find-prescriptions"
          >
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span>Find prescriptions</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </div>
          </Button>
        </div>
      </div>
    );
  };

  const renderRegistrationInput = () => {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter Patient Name or Registration Number"
            value={registrationInput}
            onChange={(e) => setRegistrationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && registrationInput.trim()) {
                handleRegistrationSubmission(registrationInput.trim());
                setRegistrationInput('');
              }
            }}
            className="flex-1 text-sm"
            data-testid="input-registration"
          />
          <Button
            onClick={() => {
              if (registrationInput.trim()) {
                handleRegistrationSubmission(registrationInput.trim());
                setRegistrationInput('');
              }
            }}
            disabled={!registrationInput.trim() || isLoading}
            size="sm"
            data-testid="button-submit-registration"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const renderPrescriptionSearchInput = () => {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter Patient Name, NPI Number, or Registration Number"
            value={prescriptionSearchInput}
            onChange={(e) => setPrescriptionSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && prescriptionSearchInput.trim()) {
                handlePrescriptionSearchSubmission(prescriptionSearchInput.trim());
                setPrescriptionSearchInput('');
              }
            }}
            className="flex-1 text-sm"
            data-testid="input-prescription-search"
          />
          <Button
            onClick={() => {
              if (prescriptionSearchInput.trim()) {
                handlePrescriptionSearchSubmission(prescriptionSearchInput.trim());
                setPrescriptionSearchInput('');
              }
            }}
            disabled={!prescriptionSearchInput.trim() || isLoading}
            size="sm"
            data-testid="button-submit-prescription-search"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const renderRegistrationOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            onClick={() => handleRegistrationOptions('reenter')}
            className="justify-start text-left h-auto py-2 px-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            data-testid="option-reenter-registration"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span>Enter it again</span>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRegistrationOptions('goback')}
            className="justify-start text-left h-auto py-2 px-4 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            data-testid="option-goback-registration"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Go Back</span>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRegistrationOptions('exit')}
            className="justify-start text-left h-auto py-2 px-4 hover:bg-red-50 dark:hover:bg-red-900/20"
            data-testid="option-exit-registration"
          >
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>Exit</span>
            </div>
          </Button>
        </div>
      </div>
    );
  };

  const renderSelectAnotherDoctorOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleSelectAnotherDoctorOptions('yes')}
            className="justify-center py-2 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
            data-testid="option-yes-another-doctor"
          >
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
            Yes
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSelectAnotherDoctorOptions('no')}
            className="justify-center py-2 px-4 hover:bg-red-50 dark:hover:bg-red-900/20"
            data-testid="option-no-another-doctor"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
            No
          </Button>
        </div>
      </div>
    );
  };

  const renderRebookingOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleRebookingOptions('yes')}
            className="justify-center py-2 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
            data-testid="option-yes-rebook"
          >
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
            Yes
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRebookingOptions('no')}
            className="justify-center py-2 px-4 hover:bg-red-50 dark:hover:bg-red-900/20"
            data-testid="option-no-rebook"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
            No
          </Button>
        </div>
      </div>
    );
  };

  const renderPrescriptionSearchAgainOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handlePrescriptionSearchAgainOptions('yes')}
            className="justify-center py-2 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
            data-testid="option-yes-search-again"
          >
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
            Yes
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePrescriptionSearchAgainOptions('no')}
            className="justify-center py-2 px-4 hover:bg-red-50 dark:hover:bg-red-900/20"
            data-testid="option-no-search-again"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
            No
          </Button>
        </div>
      </div>
    );
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for both webkit and standard versions
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      
      // Configure recognition settings
      recognition.continuous = false; // Changed to false for better control
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
        setIsListening(true);
        setTranscriptBuffer("");
        transcriptBufferRef.current = "";
        isProcessingSpeechRef.current = true;
      };
      
      recognition.onresult = (event: any) => {
        console.log('Speech recognition result received');
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all results to get the complete transcript
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('Final transcript segment:', transcript);
          } else {
            interimTranscript += transcript + ' ';
            console.log('Interim transcript segment:', transcript);
          }
        }
        
        // Update input field with complete transcript
        if (finalTranscript) {
          // Final result: accumulate in buffer and set to input
          const newBuffer = (transcriptBufferRef.current + finalTranscript).trim();
          console.log('=== FINAL TRANSCRIPT ===');
          console.log('Previous buffer:', transcriptBufferRef.current);
          console.log('New final transcript:', finalTranscript);
          console.log('New buffer:', newBuffer);
          transcriptBufferRef.current = newBuffer;
          setTranscriptBuffer(newBuffer);
          setInput(newBuffer);
          console.log('Input state updated to:', newBuffer);
          console.log('========================');
        } else if (interimTranscript) {
          // Interim result: only update if significantly different to prevent excessive renders
          const currentBuffer = transcriptBufferRef.current.trim();
          const preview = currentBuffer + (currentBuffer ? ' ' : '') + '[' + interimTranscript.trim() + ']';
          // Only update if the preview has changed significantly
          if (preview !== input) {
            setInput(preview);
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different error types appropriately
        switch (event.error) {
          case 'no-speech':
            console.log('No speech detected, stopping gracefully');
            // Don't show error for no speech - this is normal
            break;
          case 'aborted':
            console.log('Speech recognition was stopped by user');
            break;
          case 'audio-capture':
            toast({
              title: "Microphone Error",
              description: "Unable to access microphone. Please check your settings.",
              variant: "destructive",
            });
            break;
          case 'not-allowed':
            toast({
              title: "Permission Denied",
              description: "Please allow microphone access to use voice recognition.",
              variant: "destructive",
            });
            break;
          case 'network':
            toast({
              title: "Network Error",
              description: "Check your internet connection for voice recognition.",
              variant: "destructive",
            });
            break;
          case 'service-not-allowed':
            toast({
              title: "Service Unavailable",
              description: "Speech recognition service is not available.",
              variant: "destructive",
            });
            break;
          default:
            toast({
              title: "Voice Recognition Error",
              description: `Recognition failed: ${event.error}`,
              variant: "destructive",
            });
        }
        
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended naturally');
        setIsListening(false);
        speechEndTimeRef.current = Date.now();
        
        // Ensure final transcript is preserved in the input field WITHOUT auto-sending
        if (transcriptBufferRef.current.trim()) {
          const finalText = transcriptBufferRef.current.trim();
          lastSpeechInputRef.current = finalText;
          setInput(finalText);
          console.log('Final transcript preserved on end:', finalText);
        }
        
        // Reset speech processing flag after a longer delay to prevent auto-send
        setTimeout(() => {
          isProcessingSpeechRef.current = false;
          // Clear speech input tracking after delay to allow manual sending
          setTimeout(() => {
            lastSpeechInputRef.current = "";
            console.log('Speech input tracking cleared - manual send now allowed');
          }, 2000);
          console.log('Speech processing completed, auto-send protection disabled');
        }, 3000);
      };
      
      setRecognition(recognition);
    }
  }, [toast]); // Removed transcriptBuffer dependency to prevent re-initialization

  const handleSendMessage = async () => {
    const finalMessage = input.trim();
    if (!finalMessage || isLoading) return;
    await sendMessageWithText(finalMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // More aggressive protection - check if this is a rapid input change (typical of speech recognition)
      const currentTime = Date.now();
      const timeSinceSpeechEnd = currentTime - speechEndTimeRef.current;
      const isRecentSpeechInput = input === lastSpeechInputRef.current && input.trim().length > 0;
      
      // Check if input contains multi-line content typical of speech recognition
      const hasMultilineContent = input.includes('\n') && input.split('\n').length > 1;
      
      // Block if any of these conditions are true
      if (isProcessingSpeechRef.current || timeSinceSpeechEnd < 5000 || isRecentSpeechInput || hasMultilineContent) {
        console.log('Enter key blocked - speech processing, recent speech end, speech input, or multiline content');
        console.log('Speech processing:', isProcessingSpeechRef.current, 'Time since end:', timeSinceSpeechEnd, 'Is speech input:', isRecentSpeechInput, 'Has multiline:', hasMultilineContent);
        return;
      }
      
      handleSendMessage();
    }
  };

  const startVoiceRecognition = () => {
    if (!recognition) {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Please type your message instead.",
        variant: "destructive",
      });
      return;
    }

    // Only start if not already listening
    if (isListening) {
      console.log("Speech recognition already active, skipping start request");
      return;
    }

    try {
      // Request microphone permissions explicitly
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone access granted, starting speech recognition');
          setTranscriptBuffer("");
          setInput("");
          recognition.start();
        })
        .catch((permissionError) => {
          console.error('Microphone permission denied:', permissionError);
          toast({
            title: "Microphone Access Required",
            description: "Please allow microphone access to use voice recognition.",
            variant: "destructive",
          });
        });
    } catch (error: any) {
      console.error("Error starting voice recognition:", error);
      
      if (error.name === 'InvalidStateError') {
        // Recognition already started, stop and restart
        setIsListening(false);
        try {
          recognition.stop();
          setTimeout(() => {
            if (!isListening) {
              try {
                recognition.start();
              } catch (retryError) {
                console.error("Retry failed:", retryError);
                toast({
                  title: "Voice Recognition Error",
                  description: "Unable to restart voice recognition.",
                  variant: "destructive",
                });
              }
            }
          }, 1000);
        } catch (stopError) {
          console.error("Failed to stop recognition:", stopError);
        }
      } else {
        toast({
          title: "Voice Recognition Error",
          description: "Unable to start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (!recognition) {
      console.error("Speech recognition not available");
      return;
    }

    try {
      if (isListening) {
        recognition.stop();
        console.log("Voice recognition stop requested");
      }
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
    }
    
    // Always reset state regardless of current listening status
    setIsListening(false);
    
    // DON'T clear the transcript buffer or modify input here
    // Let the onend handler preserve the final transcript
  };

  const quickActions = [
    {
      label: "Book appointments",
      icon: Calendar,
      option: "book_appointments" as const
    },
    {
      label: "Find prescriptions",
      icon: Pill,
      option: "find_prescriptions" as const
    }
  ];


  const sendMessageWithText = async (messageText: string) => {
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setTranscriptBuffer(""); // Clear transcript buffer

    try {
      // Include the complete conversation history (including all previous messages)
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      console.log("[AI Chat] Sending conversation history:", conversationHistory);
      console.log("[AI Chat] Current message:", messageText);

      const response = await apiRequest("POST", "/api/ai-agent/chat", {
        message: messageText,
        conversationHistory: conversationHistory
      });

      const responseData = await response.json();
      
      console.log("[AI Chat] Raw backend response:", responseData);
      
      // CRITICAL: Extract ONLY the message string, never the entire object
      let messageContent = "";
      
      // Backend always returns { message: "text", intent: "...", ... }
      // We ONLY want the message field content
      if (responseData && typeof responseData.message === 'string') {
        messageContent = responseData.message.trim();
        console.log("[AI Chat] Extracted message content:", messageContent);
      } else if (responseData && typeof responseData.response === 'string') {
        messageContent = responseData.response.trim(); 
        console.log("[AI Chat] Extracted response content:", messageContent);
      } else {
        console.error("[AI Chat] No valid message found in response:", responseData);
        messageContent = "I apologize, I couldn't process that request. Please try again.";
      }

      // Final safety check - ensure we never display JSON
      if (messageContent.includes('"intent"') || messageContent.includes('"confidence"') || messageContent.startsWith('{')) {
        console.error("[AI Chat] CRITICAL: JSON detected in message content - blocking display");
        messageContent = "I found your information. Let me present it in a readable format.";
      }

      console.log("[AI Chat] FINAL SAFE MESSAGE:", messageContent);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: messageContent,
        timestamp: new Date(),
        data: responseData.data,
        intent: responseData.intent,
        entities: responseData.entities,
        confidence: responseData.confidence,
        medicalAdviceLevel: responseData.medicalAdviceLevel,
        disclaimers: responseData.disclaimers,
        followUpQuestions: responseData.followUpQuestions,
        educationalContent: responseData.educationalContent,
        urgencyLevel: responseData.urgencyLevel,
        recommendedSpecialty: responseData.recommendedSpecialty
      };

      setMessages(prev => [...prev, aiMessage]);

      // Show success toast for actions
      if (responseData.action) {
        toast({
          title: "Action Completed",
          description: responseData.actionDescription,
        });
      }

      // Invalidate caches if appointment was successfully created
      if ((responseData.response && responseData.response.includes('Appointment Successfully Booked')) ||
          (responseData.message && (responseData.message.includes("Appointment Successfully Booked") || 
           responseData.message.includes("✅") || responseData.message.includes("appointment has been created")))) {
        
        console.log("[AI Chat] Successful appointment detected - invalidating caches");
        await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }

      // Invalidate prescription caches if prescription was found
      if (responseData.data?.prescriptions || 
          (responseData.message && responseData.message.includes("prescription"))) {
        console.log("[AI Chat] Prescription query detected - invalidating prescription caches");
        await queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      }

    } catch (error: any) {
      console.error("AI Chat error:", error);
      const errorMessage = error.message || "Unable to process your request. Please try again.";
      const errorTitle = "AI Assistant Error";
      let errorDescription = errorMessage;

      if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
        errorDescription = "Connection issue. Please check your internet and try again.";
      } else if (errorMessage.includes('500')) {
        errorDescription = "Server error. Please try again in a moment.";
      }

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorDescription,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorResponse]);
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPrescriptions = (prescriptions: Prescription[]) => (
    <div className="mt-4 space-y-3">
      <h4 className="font-semibold text-sm text-muted-foreground">Found Prescriptions:</h4>
      {prescriptions.slice(0, 3).map((prescription) => (
        <Card key={prescription.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-semibold text-sm">{prescription.patientName}</h5>
              <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
                {prescription.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{prescription.diagnosis}</p>
            <div className="space-y-1">
              {prescription.medications.slice(0, 2).map((med, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{med.name}</span> - {med.dosage} ({med.frequency})
                </div>
              ))}
              {prescription.medications.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{prescription.medications.length - 2} more medications
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Prescribed: {format(new Date(prescription.prescribedAt), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>
      ))}
      {prescriptions.length > 3 && (
        <p className="text-xs text-muted-foreground text-center">
          +{prescriptions.length - 3} more prescriptions found
        </p>
      )}
    </div>
  );

  const renderAppointments = (appointments: Appointment[]) => (
    <div className="mt-4 space-y-3">
      <h4 className="font-semibold text-sm text-muted-foreground">Scheduled Appointments:</h4>
      {appointments.slice(0, 3).map((appointment) => (
        <Card key={appointment.id} className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-semibold text-sm">{appointment.title}</h5>
              <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
                {appointment.status}
              </Badge>
            </div>
            <p className="text-sm">{appointment.patientName}</p>
            <p className="text-sm text-muted-foreground">{appointment.providerName}</p>
            <p className="text-sm font-medium mt-2">
              {new Date(appointment.scheduledAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                timeZone: 'UTC'
              })} - {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'UTC'
              })}
            </p>
            <p className="text-xs text-muted-foreground">Duration: {appointment.duration} minutes</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          className="rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 text-white"
          style={{ 
            backgroundColor: 'hsl(210, 100%, 46%)', 
            minHeight: '48px', 
            minWidth: '48px',
            position: 'relative',
            zIndex: 9999
          }}
        >
          <Bot className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999]" style={{ zIndex: 9999 }}>
      <Card className={`shadow-2xl transition-all duration-300 border-2 border-primary/20 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`} style={{ position: 'relative', zIndex: 9999 }}>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Cura AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-7 w-7 p-0"
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4 pt-0 flex flex-col h-full">
            <ScrollArea className="flex-1 mb-4 max-h-[400px]">
              <div className="space-y-4 pr-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'assistant' && <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        {message.type === 'user' && <User className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                        <div className="whitespace-pre-wrap text-sm break-words break-all">
                            {(() => {
                              // Triple safety check for message content
                              if (typeof message.content !== 'string') {
                                console.error('[AI Chat Render] Non-string content detected:', typeof message.content);
                                return 'Error: Invalid message format';
                              }
                              
                              // Check for JSON patterns
                              if (message.content.includes('"intent"') || message.content.includes('"confidence"') || 
                                  (message.content.startsWith('{') && message.content.includes('"'))) {
                                console.error('[AI Chat Render] JSON pattern detected in content:', message.content.substring(0, 100));
                                return 'I found the information you requested. Let me present it properly.';
                              }
                              
                              return message.content;
                            })()}
                          </div>
                          
                          {/* Enhanced Medical Insights Display */}
                          {message.type === 'assistant' && (
                            <>
                              {/* Urgency Level Indicator */}
                              {message.urgencyLevel && message.urgencyLevel !== 'low' && (
                                <div className={`mt-2 p-2 rounded-md text-xs font-medium ${
                                  message.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  message.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                  'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                  🚨 Urgency Level: {message.urgencyLevel.toUpperCase()}
                                </div>
                              )}

                              {/* Medical Advice Level */}
                              {message.medicalAdviceLevel && message.medicalAdviceLevel !== 'none' && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                  <div className="text-xs font-medium text-blue-800 mb-1">
                                    Medical Information Level: {message.medicalAdviceLevel}
                                  </div>
                                </div>
                              )}

                              {/* Recommended Specialty */}
                              {message.recommendedSpecialty && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                  <div className="text-xs font-medium text-green-800">
                                    💡 Recommended Specialty: {message.recommendedSpecialty}
                                  </div>
                                </div>
                              )}

                              {/* Educational Content */}
                              {message.educationalContent && message.educationalContent.length > 0 && (
                                <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                                  <div className="text-xs font-medium text-purple-800 mb-1">📚 Educational Information:</div>
                                  {message.educationalContent.map((content, idx) => (
                                    <div key={idx} className="text-xs text-purple-700">• {content}</div>
                                  ))}
                                </div>
                              )}

                              {/* Follow-up Questions */}
                              {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                <div className="mt-2 p-2 bg-cyan-50 border border-cyan-200 rounded-md">
                                  <div className="text-xs font-medium text-cyan-800 mb-1">🤔 Follow-up Questions:</div>
                                  {message.followUpQuestions.map((question, idx) => (
                                    <div key={idx} className="text-xs text-cyan-700">• {question}</div>
                                  ))}
                                </div>
                              )}

                              {/* Medical Disclaimers */}
                              {message.disclaimers && message.disclaimers.length > 0 && (
                                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="text-xs font-medium text-gray-700 mb-1">⚠️ Important Disclaimers:</div>
                                  {message.disclaimers.map((disclaimer, idx) => (
                                    <div key={idx} className="text-xs text-gray-600">• {disclaimer}</div>
                                  ))}
                                </div>
                              )}


                            </>
                          )}
                          
                          {/* Booking Flow UI Components */}
                          {message.type === 'assistant' && (
                            <>
                              {/* Main Options */}
                              {message.showMainOptions && renderMainOptions()}
                              
                              {/* Specialty Selector */}
                              {message.showSpecialtySelector && renderSpecialtySelector(message)}
                              
                              {/* Sub-Specialty Selector */}
                              {message.showSubSpecialtySelector && renderSubSpecialtySelector(message)}
                              
                              {/* Doctor Selector */}
                              {message.showDoctorSelector && renderDoctorSelector(message)}
                              
                              {/* Time Slot Selector */}
                              {message.showTimeSlotSelector && renderTimeSlotSelector(message)}
                              
                              {/* Registration Input */}
                              {message.showRegistrationInput && renderRegistrationInput()}
                              
                              {/* Prescription Search Input */}
                              {message.showPrescriptionSearchInput && renderPrescriptionSearchInput()}
                              
                              {/* Option Buttons */}
                              {message.showRegistrationOptions && renderRegistrationOptions()}
                              {message.showSelectAnotherDoctorOptions && renderSelectAnotherDoctorOptions()}
                              {message.showRebookingOptions && renderRebookingOptions()}
                              {message.showPrescriptionSearchAgainOptions && renderPrescriptionSearchAgainOptions()}
                            </>
                          )}
                          
                          {message.data?.prescriptions && renderPrescriptions(message.data.prescriptions)}
                          {message.data?.appointments && renderAppointments(message.data.appointments)}
                          
                          <div className="text-xs opacity-70 mt-2">
                            {format(message.timestamp, 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {messages.length === 1 && (
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-3">Quick actions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleMainOptionSelection(action.option)}
                      className="flex items-center gap-2 w-full text-left whitespace-normal"
                    >
                      <action.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-xs sm:text-sm">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-20">
              <div className="relative flex-1">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                  disabled
                  className="pr-10 min-h-[40px] max-h-[120px] resize-none bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                  rows={1}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  disabled={isLoading || !recognition}
                  className={`absolute right-1 top-1 h-8 w-8 p-0 ${
                    isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground hover:text-primary'
                  }`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                title="Send message"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}