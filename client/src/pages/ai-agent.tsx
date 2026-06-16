import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  MessageCircle,
  Loader2,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { isDoctorLike } from "@/lib/role-utils";

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

export default function AIAgentPage() {
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
      // Restart the booking process from the beginning
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
      // Thank the user and complete the process
      const completionMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "✅ Thank you for using Cura AI Assistant! Your appointment booking process is complete. If you need any further assistance, feel free to ask.",
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

  // Handler for registration options (re-enter, exit, go back)
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
      
    } else if (option === 'goback') {
      // Return to time slot selection
      const goBackMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Please select a date and time for your appointment with Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}:`,
        timestamp: new Date(),
        showTimeSlotSelector: true,
        availableTimeSlots: bookingState.availableTimeSlots
      };
      setMessages(prev => [...prev, userMessage, goBackMessage]);
      setBookingState(prev => ({ ...prev, step: 'timeslot', patientRegistrationNumber: '' }));
    }
  };

  // Function to proceed with booking after patient validation
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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if user is requesting appointment booking
      const lowerInput = input.toLowerCase();
      if ((lowerInput.includes('book') && lowerInput.includes('appointment')) || 
          (lowerInput.includes('schedule') && lowerInput.includes('appointment')) ||
          lowerInput.includes('book appointment') ||
          lowerInput.includes('schedule appointment')) {
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'll help you book an appointment. Let's start by selecting the medical specialty category.",
          timestamp: new Date(),
          showSpecialtySelector: true
        };

        setMessages(prev => [...prev, assistantMessage]);
        setBookingState(prev => ({ ...prev, step: 'category' }));
        return;
      }

      // Send to AI agent endpoint for other requests
      const response = await apiRequest("POST", "/api/ai-agent/chat", {
        message: input,
        conversationHistory: messages.slice(-5) // Send last 5 messages for context
      });

      const responseData = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseData.message || "I apologize, but I couldn't process your request properly.",
        timestamp: new Date(),
        data: responseData.data
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show success toast if action was performed
      if (responseData.action) {
        toast({
          title: "Action Completed",
          description: responseData.actionDescription || "Action completed successfully",
        });
      }

    } catch (error) {
      console.error("AI Agent error:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

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
          Prescribed: {format(new Date(prescription.prescribedAt), 'PPp')}
        </p>
      </CardContent>
    </Card>
  );

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
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>{subSpecialty}</span>
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
    
    if (doctors.length === 0) {
      return (
        <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">No doctors available for this specialty.</p>
        </div>
      );
    }
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Doctor:</p>
        <div className="grid grid-cols-1 gap-2">
          {doctors.map((doctor: any) => (
            <Button
              key={doctor.id}
              variant="outline"
              onClick={() => handleDoctorSelection(doctor)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              data-testid={`doctor-${doctor.id}`}
            >
              <div className="flex items-center gap-2 w-full">
                <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div className="flex-1">
                  <div className="font-medium">Dr. {doctor.firstName} {doctor.lastName}</div>
                  {doctor.department && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{doctor.department}</div>
                  )}
                  {doctor.workingHours?.start && doctor.workingHours?.end && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Available: {doctor.workingHours.start} - {doctor.workingHours.end}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeSlotSelector = (message: Message) => {
    const timeSlots = message.availableTimeSlots || [];
    
    if (timeSlots.length === 0) {
      return (
        <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">No available time slots found.</p>
        </div>
      );
    }
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Date & Time:</p>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {timeSlots.map((slot: any, index: number) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleTimeSlotSelection(slot)}
              className="justify-start text-left h-auto py-2 px-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm"
              data-testid={`timeslot-${index}`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                <span>{slot.display}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderRegistrationInput = () => {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient Name or Registration Number/NHS Number:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={registrationInput}
            onChange={(e) => setRegistrationInput(e.target.value)}
            placeholder="Enter Patient Name or ID/NHS Number"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            data-testid="input-patient-info"
          />
          <Button
            onClick={() => {
              if (registrationInput.trim()) {
                handleRegistrationSubmission(registrationInput.trim());
                setRegistrationInput("");
              }
            }}
            disabled={!registrationInput.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-submit-registration"
          >
            Submit
          </Button>
        </div>
      </div>
    );
  };

  const renderRegistrationOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <Button
          onClick={() => handleRegistrationOptions('reenter')}
          className="w-full bg-primary hover:bg-primary/90 text-white text-left justify-start"
          data-testid="button-reenter-registration"
        >
          🔄 Enter it again
        </Button>
        <Button
          onClick={() => handleRegistrationOptions('exit')}
          className="w-full bg-red-500 hover:bg-red-600 text-white text-left justify-start"
          data-testid="button-exit-booking"
        >
          ❌ Exit
        </Button>
        <Button
          onClick={() => handleRegistrationOptions('goback')}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white text-left justify-start"
          data-testid="button-go-back"
        >
          ⬅️ Go Back
        </Button>
      </div>
    );
  };

  const renderRebookingOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <Button
          onClick={() => handleRebookingOptions('yes')}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-left justify-start"
          data-testid="button-book-another-yes"
        >
          ✅ Yes, book another appointment
        </Button>
        <Button
          onClick={() => handleRebookingOptions('no')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-left justify-start"
          data-testid="button-book-another-no"
        >
          ❌ No, I'm done
        </Button>
      </div>
    );
  };

  const renderPrescriptionSearchInput = () => {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient Name, NPI Number, or Registration Number:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={prescriptionSearchInput}
            onChange={(e) => setPrescriptionSearchInput(e.target.value)}
            placeholder="Enter Patient Name, NPI Number, or Registration Number"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            data-testid="input-prescription-search"
          />
          <Button
            onClick={() => {
              if (prescriptionSearchInput.trim()) {
                handlePrescriptionSearchSubmission(prescriptionSearchInput.trim());
                setPrescriptionSearchInput("");
              }
            }}
            disabled={!prescriptionSearchInput.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-submit-prescription-search"
          >
            Search
          </Button>
        </div>
      </div>
    );
  };

  const renderPrescriptionSearchAgainOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <Button
          onClick={() => handlePrescriptionSearchAgainOptions('yes')}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-left justify-start"
          data-testid="button-search-again-yes"
        >
          ✅ Yes, search again
        </Button>
        <Button
          onClick={() => handlePrescriptionSearchAgainOptions('no')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-left justify-start"
          data-testid="button-search-again-no"
        >
          ❌ No, I'm done
        </Button>
      </div>
    );
  };

  const renderSelectAnotherDoctorOptions = () => {
    return (
      <div className="mt-3 space-y-2">
        <Button
          onClick={() => handleSelectAnotherDoctorOptions('yes')}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-left justify-start"
          data-testid="button-select-another-doctor-yes"
        >
          ✅ Yes, select another doctor
        </Button>
        <Button
          onClick={() => handleSelectAnotherDoctorOptions('no')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-left justify-start"
          data-testid="button-select-another-doctor-no"
        >
          ❌ No, I'm done
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl page-zoom-90">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cura AI Assistant</h1>
            <p className="text-gray-600 dark:text-gray-300">Intelligent appointment booking and prescription management</p>
          </div>
        </div>
      </div>

      <Card className="h-[580px] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-b">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <MessageCircle className="h-5 w-5" />
            Chat with AI Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4 overflow-y-auto" style={{maxHeight: 'calc(580px - 120px)'}}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user'
                          ? 'bg-blue-600'
                          : 'bg-gradient-to-r from-purple-500 to-blue-500'
                      }`}
                    >
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>

                    <div className="flex flex-col">
                    <div
                      className={`px-4 py-2 rounded-lg break-words whitespace-pre-line ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div
                        className="w-full"
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(message.content)
                        }}
                      />
                    </div>

                      {/* Render main options */}
                      {message.showMainOptions && (
                        <div className="mt-4 space-y-2">
                          <Button
                            onClick={() => handleMainOptionSelection('book_appointments')}
                            className="w-full bg-primary hover:bg-primary/90 text-white"
                            data-testid="button-book-appointments"
                          >
                            📅 Book appointments
                          </Button>
                          <Button
                            onClick={() => handleMainOptionSelection('find_prescriptions')}
                            className="w-full bg-secondary hover:bg-secondary/90 text-white"
                            data-testid="button-find-prescriptions"
                          >
                            💊 Find prescriptions
                          </Button>
                        </div>
                      )}

                      {/* Render specialty selector */}
                      {message.showSpecialtySelector && (
                        <div className="mt-2">
                          {renderSpecialtySelector(message)}
                        </div>
                      )}
                      
                      {/* Render sub-specialty selector */}
                      {message.showSubSpecialtySelector && (
                        <div className="mt-2">
                          {renderSubSpecialtySelector(message)}
                        </div>
                      )}
                      
                      {/* Render doctor selector */}
                      {message.showDoctorSelector && (
                        <div className="mt-2">
                          {renderDoctorSelector(message)}
                        </div>
                      )}
                      
                      {/* Render time slot selector */}
                      {message.showTimeSlotSelector && (
                        <div className="mt-2">
                          {renderTimeSlotSelector(message)}
                        </div>
                      )}

                      {/* Render registration input */}
                      {message.showRegistrationInput && (
                        <div className="mt-4">
                          {renderRegistrationInput()}
                        </div>
                      )}

                      {/* Render registration options */}
                      {message.showRegistrationOptions && (
                        <div className="mt-4">
                          {renderRegistrationOptions()}
                        </div>
                      )}

                      {/* Render rebooking options */}
                      {message.showRebookingOptions && (
                        <div className="mt-4">
                          {renderRebookingOptions()}
                        </div>
                      )}

                      {/* Render prescription search input */}
                      {message.showPrescriptionSearchInput && (
                        <div className="mt-4">
                          {renderPrescriptionSearchInput()}
                        </div>
                      )}

                      {/* Render prescription search again options */}
                      {message.showPrescriptionSearchAgainOptions && (
                        <div className="mt-4">
                          {renderPrescriptionSearchAgainOptions()}
                        </div>
                      )}

                      {/* Render select another doctor options */}
                      {message.showSelectAnotherDoctorOptions && (
                        <div className="mt-4">
                          {renderSelectAnotherDoctorOptions()}
                        </div>
                      )}

                      {/* Render data cards if present */}
                      {message.data && (
                        <div className="mt-2">
                          {message.data.prescriptions && (
                            <div>
                              {message.data.prescriptions.map((prescription: Prescription) =>
                                renderPrescriptionCard(prescription)
                              )}
                            </div>
                          )}
                          {message.data.appointments && (
                            <div>
                              {message.data.appointments.map((appointment: Appointment) =>
                                renderAppointmentCard(appointment)
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(message.timestamp, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator />

          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                className="flex-1 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                disabled
              />
              <Button 
                onClick={handleSendMessage} 
                disabled
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Book appointments
              </div>
              <div className="flex items-center gap-1">
                <Pill className="h-3 w-3" />
                Find prescriptions
              </div>
              <div className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                Medical queries
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}