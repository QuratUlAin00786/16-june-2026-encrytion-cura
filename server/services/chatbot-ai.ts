import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatbotIntent {
  intent: string;
  confidence: number;
  extractedData?: {
    patientName?: string;
    phone?: string;
    email?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentType?: string;
    medicationName?: string;
    prescriptionDetails?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
}

export interface ChatbotResponse {
  response: string;
  intent: ChatbotIntent;
  requiresFollowUp: boolean;
  nextAction?: string;
}

export class ChatbotAIService {
  async processMessage(message: string, sessionHistory: Array<{ sender: string; content: string }> = []): Promise<ChatbotResponse> {
    try {
      // Build conversation context
      const conversationContext = sessionHistory
        .slice(-5) // Keep last 5 messages for context
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are a medical assistant chatbot for Cura EMR. Your primary functions are:
1. Help patients book appointments
2. Assist with prescription requests
3. Provide general healthcare information

IMPORTANT RULES:
- Always be professional and empathetic
- For appointments: Extract patient name, phone/email, preferred date/time, appointment type
- For prescriptions: Extract patient name, medication details, urgency level
- If information is missing, politely ask for it
- Never provide medical diagnoses or treatment advice
- Direct urgent medical situations to emergency services

Respond with helpful information and guide the conversation toward booking appointments or prescription requests.

Current conversation context:
${conversationContext}

Analyze the user's message and determine their intent, extract relevant information, and provide an appropriate response.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');

      // Extract intent and data
      const intent: ChatbotIntent = {
        intent: aiResult.intent || 'general_inquiry',
        confidence: Math.min(Math.max(aiResult.confidence || 0.5, 0), 1),
        extractedData: aiResult.extractedData || {}
      };

      // Generate response based on intent
      let botResponse = aiResult.response || "I'm here to help you with appointments and prescriptions. How can I assist you today?";
      let requiresFollowUp = aiResult.requiresFollowUp || false;
      let nextAction = aiResult.nextAction;

      // Handle specific intents
      switch (intent.intent) {
        case 'appointment_booking':
          if (!intent.extractedData?.patientName || !intent.extractedData?.phone) {
            botResponse = "I'd be happy to help you book an appointment! To get started, I'll need your full name and phone number.";
            requiresFollowUp = true;
            nextAction = 'collect_patient_info';
          } else if (!intent.extractedData?.appointmentDate) {
            botResponse = `Thank you, ${intent.extractedData.patientName}! What date and time would work best for your appointment?`;
            requiresFollowUp = true;
            nextAction = 'collect_appointment_time';
          } else {
            botResponse = `Perfect! I have all the information needed to book your appointment for ${intent.extractedData.patientName} on ${intent.extractedData.appointmentDate}. A staff member will contact you at ${intent.extractedData.phone} to confirm the details.`;
            requiresFollowUp = false;
            nextAction = 'create_appointment';
          }
          break;

        case 'prescription_request':
          if (!intent.extractedData?.patientName || !intent.extractedData?.medicationName) {
            botResponse = "I can help you with a prescription request. Please provide your full name and the medication you need.";
            requiresFollowUp = true;
            nextAction = 'collect_prescription_info';
          } else {
            botResponse = `Thank you, ${intent.extractedData.patientName}! I've received your request for ${intent.extractedData.medicationName}. A healthcare provider will review your request and contact you within 24 hours.`;
            requiresFollowUp = false;
            nextAction = 'create_prescription_request';
          }
          break;

        case 'emergency':
          botResponse = "This sounds like it may be urgent. For immediate medical emergencies, please call 999 (UK) or your local emergency number. For non-urgent medical concerns, I can help you book an appointment with a healthcare provider.";
          requiresFollowUp = true;
          nextAction = 'offer_appointment';
          break;

        default:
          botResponse = aiResult.response || "I'm here to help you book appointments, request prescriptions, or answer general healthcare questions. What would you like to do today?";
          requiresFollowUp = true;
          nextAction = 'clarify_intent';
      }

      return {
        response: botResponse,
        intent,
        requiresFollowUp,
        nextAction
      };

    } catch (error) {
      console.error('Error processing chatbot message with AI:', error);
      
      // Fallback response
      return {
        response: "I'm here to help you with appointments and prescriptions. Could you please let me know what you'd like assistance with today?",
        intent: {
          intent: 'general_inquiry',
          confidence: 0.5
        },
        requiresFollowUp: true,
        nextAction: 'clarify_intent'
      };
    }
  }

  async analyzeIntent(message: string): Promise<ChatbotIntent> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Analyze the user's message and determine their intent. Return JSON with:
            {
              "intent": "appointment_booking|prescription_request|general_inquiry|emergency",
              "confidence": 0.0-1.0,
              "extractedData": {
                "patientName": "extracted name if found",
                "phone": "extracted phone if found",
                "email": "extracted email if found",
                "appointmentDate": "extracted date if found",
                "appointmentTime": "extracted time if found",
                "medicationName": "extracted medication if found",
                "urgency": "low|medium|high"
              }
            }`
          },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        intent: result.intent || 'general_inquiry',
        confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        extractedData: result.extractedData || {}
      };

    } catch (error) {
      console.error('Error analyzing intent:', error);
      return {
        intent: 'general_inquiry',
        confidence: 0.3
      };
    }
  }
}

export const chatbotAIService = new ChatbotAIService();