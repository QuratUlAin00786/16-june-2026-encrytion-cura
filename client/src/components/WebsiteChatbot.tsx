import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Pill,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickActions?: QuickAction[];
  form?: FormType;
}

interface QuickAction {
  label: string;
  action: string;
  icon?: any;
}

type FormType = 'appointment' | 'prescription' | 'demo' | 'contact';

interface AppointmentForm {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
}

interface PrescriptionForm {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  medication: string;
  dosage: string;
  reason: string;
  currentMedications: string;
  allergies: string;
}

export function WebsiteChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your Cura EMR assistant. I can help you with:\n\n• Book real appointments with doctors\n• Request prescription renewals\n• Schedule a system demo\n• Answer questions about features\n• Connect you with sales\n\nHow may I assist you today?",
      isUser: false,
      timestamp: new Date(),
      quickActions: [
        { label: "Book Appointment", action: "appointment", icon: Calendar },
        { label: "Request Prescription", action: "prescription", icon: Pill },
        { label: "Schedule Demo", action: "demo", icon: Calendar },
        { label: "Contact Sales", action: "sales", icon: Phone }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentForm, setCurrentForm] = useState<FormType | null>(null);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    appointmentType: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionForm>({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    medication: '',
    dosage: '',
    reason: '',
    currentMedications: '',
    allergies: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = generateBotResponse(message.toLowerCase());
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (action: string) => {
    setCurrentForm(action as FormType);
    
    let responseText = "";
    let form: FormType | undefined;
    
    switch (action) {
      case 'appointment':
        responseText = "I'll help you book a real appointment with one of our doctors. Please fill out the form below and I'll schedule it in our system.";
        form = 'appointment';
        break;
      case 'prescription':
        responseText = "I can help you request a prescription renewal or new prescription. Please provide the details below and our doctor will review your request.";
        form = 'prescription';
        break;
      case 'demo':
        responseText = "Great! I'd love to schedule a personalized demo of Cura EMR for you. Please provide your contact details and preferred time.";
        form = 'demo';
        break;
      case 'sales':
        responseText = "I'll connect you with our sales team. They can provide detailed pricing information and help you choose the right plan for your organization.";
        form = 'contact';
        break;
      default:
        responseText = "How can I assist you further?";
    }

    const botMessage: Message = {
      id: Date.now().toString(),
      text: responseText,
      isUser: false,
      timestamp: new Date(),
      form
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const generateBotResponse = (userMessage: string): Message => {
    let responseText = "";
    let quickActions: QuickAction[] = [];

    if (userMessage.includes('appointment') || userMessage.includes('book') || userMessage.includes('schedule')) {
      responseText = "I can help you book a real appointment with one of our doctors. Would you like me to start the booking process?";
      quickActions = [
        { label: "Yes, Book Appointment", action: "appointment", icon: Calendar },
        { label: "Learn More First", action: "features", icon: Bot }
      ];
    } else if (userMessage.includes('prescription') || userMessage.includes('medication') || userMessage.includes('refill')) {
      responseText = "I can help you request a prescription renewal or new prescription from our doctors. Shall I start the prescription request form?";
      quickActions = [
        { label: "Yes, Request Prescription", action: "prescription", icon: Pill },
        { label: "Learn About Process", action: "features", icon: Bot }
      ];
    } else if (userMessage.includes('demo') || userMessage.includes('trial')) {
      responseText = "I'd be happy to schedule a personalized demo of Cura EMR for you. Our team can show you all the features and how they can benefit your practice.";
      quickActions = [
        { label: "Schedule Demo", action: "demo", icon: Calendar },
        { label: "View Features", action: "features", icon: Bot }
      ];
    } else if (userMessage.includes('price') || userMessage.includes('cost') || userMessage.includes('plan')) {
      responseText = "Our pricing starts with a free 14-day trial, followed by plans from £49/month. Would you like to speak with sales for detailed pricing or see our pricing page?";
      quickActions = [
        { label: "Contact Sales", action: "sales", icon: Phone },
        { label: "View Pricing Page", action: "pricing", icon: Mail }
      ];
    } else if (userMessage.includes('features') || userMessage.includes('what') || userMessage.includes('how')) {
      responseText = "Cura EMR includes patient management, appointment scheduling, AI-powered insights, telemedicine, prescription management, and more. Would you like a demo or more specific information?";
      quickActions = [
        { label: "Schedule Demo", action: "demo", icon: Calendar },
        { label: "Contact Sales", action: "sales", icon: Phone }
      ];
    } else {
      responseText = "I can help you with several things:\n• Book real appointments\n• Request prescriptions\n• Schedule demos\n• Provide pricing info\n• Connect with sales\n\nWhat would you like to do?";
      quickActions = [
        { label: "Book Appointment", action: "appointment", icon: Calendar },
        { label: "Request Prescription", action: "prescription", icon: Pill },
        { label: "Schedule Demo", action: "demo", icon: Calendar },
        { label: "Contact Sales", action: "sales", icon: Phone }
      ];
    }

    return {
      id: Date.now().toString(),
      text: responseText,
      isUser: false,
      timestamp: new Date(),
      quickActions
    };
  };

  const handleAppointmentSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/chatbot/book-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: appointmentForm.patientEmail,
          name: appointmentForm.patientName,
          phone: appointmentForm.patientPhone,
          appointmentType: appointmentForm.appointmentType,
          preferredDate: appointmentForm.preferredDate,
          preferredTime: appointmentForm.preferredTime,
          reason: appointmentForm.notes
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        const successMessage: Message = {
          id: Date.now().toString(),
          text: `✅ ${result.message}\n\n📅 Date: ${appointmentForm.preferredDate}\n🕒 Time: ${appointmentForm.preferredTime}\n👨‍⚕️ Doctor: ${result.doctorName}\n📋 Type: ${appointmentForm.appointmentType}\n📧 Status: Pending Confirmation\n\nYou'll receive a confirmation email shortly. Is there anything else I can help you with?`,
          isUser: false,
          timestamp: new Date(),
          quickActions: [
            { label: "Book Another", action: "appointment", icon: Calendar },
            { label: "Request Prescription", action: "prescription", icon: Pill }
          ]
        };
        
        setMessages(prev => [...prev, successMessage]);
        setCurrentForm(null);
        setAppointmentForm({
          patientName: '',
          patientEmail: '',
          patientPhone: '',
          appointmentType: '',
          preferredDate: '',
          preferredTime: '',
          notes: ''
        });
      } else {
        throw new Error(result.error || 'Failed to book appointment');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `❌ Sorry, there was an error booking your appointment: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact our support team.`,
        isUser: false,
        timestamp: new Date(),
        quickActions: [
          { label: "Try Again", action: "appointment", icon: Calendar },
          { label: "Contact Support", action: "sales", icon: Phone }
        ]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrescriptionSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/chatbot/request-prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: prescriptionForm.patientEmail,
          name: prescriptionForm.patientName,
          phone: prescriptionForm.patientPhone,
          medication: prescriptionForm.medication,
          reason: prescriptionForm.reason,
          medicalHistory: `Current medications: ${prescriptionForm.currentMedications || 'None'}, Allergies: ${prescriptionForm.allergies || 'None'}`
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        const successMessage: Message = {
          id: Date.now().toString(),
          text: `✅ ${result.message}\n\n💊 Medication: ${prescriptionForm.medication}\n👨‍⚕️ Reviewing Doctor: ${result.reviewingDoctor}\n📧 Status: ${result.status}\n📅 Requested: ${new Date().toLocaleDateString()}\n\nOur doctor will review your request and contact you within 24 hours. You'll receive an email confirmation shortly.`,
          isUser: false,
          timestamp: new Date(),
          quickActions: [
            { label: "Request Another", action: "prescription", icon: Pill },
            { label: "Book Appointment", action: "appointment", icon: Calendar }
          ]
        };
        
        setMessages(prev => [...prev, successMessage]);
        setCurrentForm(null);
        setPrescriptionForm({
          patientName: '',
          patientEmail: '',
          patientPhone: '',
          medication: '',
          dosage: '',
          reason: '',
          currentMedications: '',
          allergies: ''
        });
      } else {
        throw new Error(result.error || 'Failed to submit prescription request');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `❌ Sorry, there was an error submitting your prescription request: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact our support team.`,
        isUser: false,
        timestamp: new Date(),
        quickActions: [
          { label: "Try Again", action: "prescription", icon: Pill },
          { label: "Contact Support", action: "sales", icon: Phone }
        ]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = (formType: FormType) => {
    if (formType === 'appointment') {
      return (
        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Book Real Appointment
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="patientName">Full Name *</Label>
              <Input
                id="patientName"
                value={appointmentForm.patientName}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientName: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <Label htmlFor="patientEmail">Email *</Label>
              <Input
                id="patientEmail"
                type="email"
                value={appointmentForm.patientEmail}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientEmail: e.target.value }))}
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="patientPhone">Phone *</Label>
              <Input
                id="patientPhone"
                value={appointmentForm.patientPhone}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientPhone: e.target.value }))}
                placeholder="+44 7XXX XXX XXX"
              />
            </div>
            
            <div>
              <Label htmlFor="appointmentType">Appointment Type *</Label>
              <Select 
                value={appointmentForm.appointmentType}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, appointmentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">General Consultation</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="telemedicine">Telemedicine</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="preferredDate">Preferred Date *</Label>
              <Input
                id="preferredDate"
                type="date"
                value={appointmentForm.preferredDate}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label htmlFor="preferredTime">Preferred Time</Label>
              <Select 
                value={appointmentForm.preferredTime}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, preferredTime: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">09:00 AM</SelectItem>
                  <SelectItem value="09:30">09:30 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="10:30">10:30 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="11:30">11:30 AM</SelectItem>
                  <SelectItem value="14:00">02:00 PM</SelectItem>
                  <SelectItem value="14:30">02:30 PM</SelectItem>
                  <SelectItem value="15:00">03:00 PM</SelectItem>
                  <SelectItem value="15:30">03:30 PM</SelectItem>
                  <SelectItem value="16:00">04:00 PM</SelectItem>
                  <SelectItem value="16:30">04:30 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any specific concerns or requirements..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleAppointmentSubmit}
              disabled={!appointmentForm.patientName || !appointmentForm.patientEmail || !appointmentForm.patientPhone || !appointmentForm.appointmentType || !appointmentForm.preferredDate || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentForm(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (formType === 'prescription') {
      return (
        <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border">
          <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Request Prescription
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="prescPatientName">Full Name *</Label>
              <Input
                id="prescPatientName"
                value={prescriptionForm.patientName}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, patientName: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <Label htmlFor="prescPatientEmail">Email *</Label>
              <Input
                id="prescPatientEmail"
                type="email"
                value={prescriptionForm.patientEmail}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, patientEmail: e.target.value }))}
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="prescPatientPhone">Phone *</Label>
              <Input
                id="prescPatientPhone"
                value={prescriptionForm.patientPhone}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, patientPhone: e.target.value }))}
                placeholder="+44 7XXX XXX XXX"
              />
            </div>
            
            <div>
              <Label htmlFor="medication">Medication Name</Label>
              <Input
                id="medication"
                value={prescriptionForm.medication}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, medication: e.target.value }))}
                placeholder="e.g., Paracetamol, Ibuprofen"
              />
            </div>
            
            <div>
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                value={prescriptionForm.dosage}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="e.g., 500mg, 10ml"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="reason">Reason for Request *</Label>
              <Textarea
                id="reason"
                value={prescriptionForm.reason}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please describe your symptoms or reason for requesting this prescription..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="currentMedications">Current Medications</Label>
              <Textarea
                id="currentMedications"
                value={prescriptionForm.currentMedications}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, currentMedications: e.target.value }))}
                placeholder="List any medications you're currently taking..."
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="allergies">Known Allergies</Label>
              <Textarea
                id="allergies"
                value={prescriptionForm.allergies}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, allergies: e.target.value }))}
                placeholder="List any known drug allergies..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handlePrescriptionSubmit}
              disabled={!prescriptionForm.patientName || !prescriptionForm.patientEmail || !prescriptionForm.patientPhone || !prescriptionForm.reason || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Pill className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentForm(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // Demo and contact forms would be simpler
    return null;
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-16 w-16 bg-gradient-to-r from-blue-300 to-blue-400 hover:from-blue-400 hover:to-blue-500 shadow-xl border-2 border-white"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <div className="flex flex-col items-center">
              <img 
                src="/cura-logo-chatbot.png" 
                alt="Cura Chat" 
                className="h-6 w-6 mb-0.5"
              />
              <span className="text-xs text-white font-medium">Chat</span>
            </div>
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] z-40 shadow-2xl">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-white text-gray-900 rounded-t-lg border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/cura-logo-chatbot.png" 
                    alt="Cura Logo" 
                    className="h-8 w-auto"
                  />
                  <div>
                    <div className="font-semibold text-gray-800">Cura Assistant</div>
                    <div className="text-xs text-gray-500">AI-Powered Healthcare Support</div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Online
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.isUser 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}>
                      <div className="flex items-start gap-2">
                        {!message.isUser && (
                          <img 
                            src="/cura-logo-chatbot.png" 
                            alt="Cura" 
                            className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-sm"
                          />
                        )}
                        <div className="whitespace-pre-wrap text-sm">{message.text}</div>
                        {message.isUser && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {message.quickActions && (
                    <div className="flex flex-wrap gap-2 justify-start ml-6">
                      {message.quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(action.action)}
                          className="text-xs"
                        >
                          {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Form */}
                  {message.form && currentForm === message.form && (
                    <div className="ml-6">
                      {renderForm(message.form)}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img 
                        src="/cura-logo-chatbot.png" 
                        alt="Cura" 
                        className="h-4 w-4 rounded-sm"
                      />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}