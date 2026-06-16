import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  Star, 
  Users, 
  Calendar, 
  TrendingUp,
  FileText,
  Heart,
  Brain,
  Activity,
  Stethoscope,
  UserCheck,
  MessageSquare,
  ClipboardCheck,
  Shield,
  AlertTriangle,
  Smile,
  BarChart3,
  Clock,
  CheckCircle,
  Eye
} from "lucide-react";
import { FormTemplate } from "./form-builder";

const comprehensiveTemplates: FormTemplate[] = [
  {
    id: "intake_comprehensive",
    title: "Comprehensive Patient Intake",
    description: "Complete new patient onboarding with medical history, insurance, and emergency contacts",
    category: "intake",
    fields: [
      { id: "1", type: "text", label: "Full Legal Name", required: true },
      { id: "2", type: "date", label: "Date of Birth", required: true },
      { id: "3", type: "radio", label: "Gender", options: ["Male", "Female", "Non-binary", "Prefer not to say"], required: true },
      { id: "4", type: "email", label: "Email Address", required: true },
      { id: "5", type: "phone", label: "Primary Phone", required: true },
      { id: "6", type: "phone", label: "Secondary Phone", required: false },
      { id: "7", type: "text", label: "Address Line 1", required: true },
      { id: "8", type: "text", label: "Address Line 2", required: false },
      { id: "9", type: "text", label: "City", required: true },
      { id: "10", type: "text", label: "Postcode", required: true },
      { id: "11", type: "select", label: "Country", options: ["United Kingdom", "United States", "Canada", "Australia", "Other"], required: true },
      { id: "12", type: "text", label: "NHS Number", required: false },
      { id: "13", type: "select", label: "Preferred Language", options: ["English", "Spanish", "French", "Arabic", "Chinese", "Other"], required: true },
      { id: "14", type: "text", label: "Emergency Contact Name", required: true },
      { id: "15", type: "text", label: "Emergency Contact Relationship", required: true },
      { id: "16", type: "phone", label: "Emergency Contact Phone", required: true },
      { id: "17", type: "select", label: "Insurance Provider", options: ["NHS", "Private Insurance", "Self-Pay", "Other"], required: true },
      { id: "18", type: "text", label: "Insurance Policy Number", required: false },
      { id: "19", type: "text", label: "Primary Care Physician", required: false },
      { id: "20", type: "textarea", label: "Current Medications", placeholder: "List all current medications, dosages, and frequency", required: false },
      { id: "21", type: "textarea", label: "Known Allergies", placeholder: "Include medication, food, and environmental allergies", required: false },
      { id: "22", type: "checkbox", label: "Medical Conditions", options: ["Diabetes", "Hypertension", "Heart Disease", "Asthma", "Arthritis", "Depression", "Anxiety", "Cancer", "None"], required: false },
      { id: "23", type: "textarea", label: "Previous Surgeries", placeholder: "List any previous surgeries and dates", required: false },
      { id: "24", type: "textarea", label: "Family Medical History", placeholder: "Significant family medical history", required: false },
      { id: "25", type: "radio", label: "Smoking Status", options: ["Never", "Former", "Current"], required: true },
      { id: "26", type: "radio", label: "Alcohol Consumption", options: ["Never", "Occasional", "Moderate", "Heavy"], required: true },
      { id: "27", type: "text", label: "Occupation", required: false },
      { id: "28", type: "checkbox", label: "Consent", options: ["I consent to treatment", "I consent to sharing information with healthcare team", "I consent to electronic communications"], required: true },
      { id: "29", type: "signature", label: "Patient Signature", required: true }
    ],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: true,
      showProgress: true,
      autoSave: true,
      notifications: true,
      branding: true
    },
    styling: {
      theme: "medical",
      primaryColor: "#3b82f6",
      backgroundColor: "#ffffff",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  },
  {
    id: "mental_health_screening",
    title: "Mental Health Assessment (PHQ-9 & GAD-7)",
    description: "Comprehensive mental health screening using validated assessment tools",
    category: "assessment",
    fields: [
      { id: "1", type: "radio", label: "Over the last 2 weeks, little interest or pleasure in doing things?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "2", type: "radio", label: "Feeling down, depressed, or hopeless?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "3", type: "radio", label: "Trouble falling or staying asleep, or sleeping too much?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "4", type: "radio", label: "Feeling tired or having little energy?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "5", type: "radio", label: "Poor appetite or overeating?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "6", type: "radio", label: "Feeling bad about yourself or that you are a failure?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "7", type: "radio", label: "Trouble concentrating on things?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "8", type: "radio", label: "Moving or speaking slowly, or being fidgety/restless?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "9", type: "radio", label: "Thoughts of being better off dead or hurting yourself?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "10", type: "radio", label: "Feeling nervous, anxious, or on edge?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "11", type: "radio", label: "Not being able to stop or control worrying?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "12", type: "radio", label: "Worrying too much about different things?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "13", type: "radio", label: "Trouble relaxing?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "14", type: "radio", label: "Being so restless that it's hard to sit still?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "15", type: "radio", label: "Becoming easily annoyed or irritable?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "16", type: "radio", label: "Feeling afraid as if something awful might happen?", 
        options: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"], required: true },
      { id: "17", type: "textarea", label: "Additional concerns or symptoms", required: false },
      { id: "18", type: "radio", label: "Are you currently receiving mental health treatment?", 
        options: ["Yes", "No"], required: true },
      { id: "19", type: "checkbox", label: "Support systems", 
        options: ["Family support", "Friends support", "Professional counselor", "Support groups", "Religious/spiritual support", "None"], required: false }
    ],
    settings: {
      allowAnonymous: true,
      requireAuthentication: false,
      multiPage: true,
      showProgress: true,
      autoSave: true,
      notifications: false,
      branding: true
    },
    styling: {
      theme: "minimal",
      primaryColor: "#10b981",
      backgroundColor: "#f8fafc",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  },
  {
    id: "symptom_checker",
    title: "Pre-Visit Symptom Checker",
    description: "Comprehensive symptom assessment to optimize consultation time",
    category: "assessment",
    fields: [
      { id: "1", type: "checkbox", label: "Primary symptoms you're experiencing", 
        options: ["Headache", "Fever", "Cough", "Shortness of breath", "Chest pain", "Abdominal pain", "Nausea/vomiting", "Diarrhea", "Rash", "Joint pain", "Fatigue", "Dizziness", "Other"], required: true },
      { id: "2", type: "pain_scale", label: "Rate your overall discomfort level", required: true },
      { id: "3", type: "select", label: "How long have you had these symptoms?", 
        options: ["Less than 24 hours", "1-3 days", "4-7 days", "1-2 weeks", "2-4 weeks", "More than a month"], required: true },
      { id: "4", type: "radio", label: "Symptom onset", 
        options: ["Sudden onset", "Gradual onset", "Intermittent"], required: true },
      { id: "5", type: "radio", label: "Symptom severity trend", 
        options: ["Getting worse", "Staying the same", "Getting better", "Fluctuating"], required: true },
      { id: "6", type: "checkbox", label: "What makes your symptoms worse?", 
        options: ["Physical activity", "Rest", "Eating", "Stress", "Weather changes", "Time of day", "Nothing specific", "Other"], required: false },
      { id: "7", type: "checkbox", label: "What makes your symptoms better?", 
        options: ["Rest", "Medication", "Physical activity", "Heat/cold application", "Certain positions", "Nothing helps", "Other"], required: false },
      { id: "8", type: "textarea", label: "Describe your symptoms in detail", 
        placeholder: "Please provide any additional details about your symptoms", required: false },
      { id: "9", type: "radio", label: "Have you taken any medication for these symptoms?", 
        options: ["Yes", "No"], required: true },
      { id: "10", type: "textarea", label: "If yes, what medications have you tried?", required: false },
      { id: "11", type: "radio", label: "Have you seen another healthcare provider for these symptoms?", 
        options: ["Yes", "No"], required: true },
      { id: "12", type: "textarea", label: "If yes, what was the outcome?", required: false },
      { id: "13", type: "vitals", label: "Recent vital signs (if known)", required: false },
      { id: "14", type: "radio", label: "Is this preventing you from normal activities?", 
        options: ["Not at all", "Slightly", "Moderately", "Severely", "Completely"], required: true },
      { id: "15", type: "radio", label: "How urgent do you feel this condition is?", 
        options: ["Not urgent", "Somewhat urgent", "Urgent", "Very urgent"], required: true }
    ],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: true,
      showProgress: true,
      autoSave: true,
      notifications: true,
      branding: true
    },
    styling: {
      theme: "medical",
      primaryColor: "#ef4444",
      backgroundColor: "#ffffff",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  },
  {
    id: "patient_satisfaction_comprehensive",
    title: "Comprehensive Patient Experience Survey",
    description: "Detailed feedback collection on all aspects of patient care experience",
    category: "feedback",
    fields: [
      { id: "1", type: "rating", label: "Overall satisfaction with your visit", required: true },
      { id: "2", type: "rating", label: "Ease of scheduling your appointment", required: true },
      { id: "3", type: "rating", label: "Wait time for your appointment", required: true },
      { id: "4", type: "rating", label: "Courtesy and helpfulness of reception staff", required: true },
      { id: "5", type: "rating", label: "Cleanliness of the facility", required: true },
      { id: "6", type: "rating", label: "Comfort of the waiting area", required: true },
      { id: "7", type: "rating", label: "Provider's explanation of your condition", required: true },
      { id: "8", type: "rating", label: "Provider's listening to your concerns", required: true },
      { id: "9", type: "rating", label: "Time spent with your provider", required: true },
      { id: "10", type: "rating", label: "Courtesy and professionalism of clinical staff", required: true },
      { id: "11", type: "rating", label: "Clarity of discharge instructions", required: true },
      { id: "12", type: "radio", label: "Would you recommend our practice to others?", 
        options: ["Definitely yes", "Probably yes", "Not sure", "Probably no", "Definitely no"], required: true },
      { id: "13", type: "radio", label: "Would you return to our practice for future care?", 
        options: ["Definitely yes", "Probably yes", "Not sure", "Probably no", "Definitely no"], required: true },
      { id: "14", type: "select", label: "How did you hear about our practice?", 
        options: ["Referral from another doctor", "Friend/family recommendation", "Insurance directory", "Online search", "Social media", "Advertisement", "Other"], required: false },
      { id: "15", type: "checkbox", label: "Which services did you use today?", 
        options: ["Consultation", "Diagnostic tests", "Treatment/procedure", "Prescription", "Follow-up", "Other"], required: false },
      { id: "16", type: "radio", label: "How would you prefer to receive appointment reminders?", 
        options: ["Text message", "Email", "Phone call", "No reminders"], required: false },
      { id: "17", type: "radio", label: "Are you interested in online appointment booking?", 
        options: ["Very interested", "Somewhat interested", "Not interested"], required: false },
      { id: "18", type: "textarea", label: "What did we do well?", 
        placeholder: "Please share what you appreciated about your visit", required: false },
      { id: "19", type: "textarea", label: "How can we improve?", 
        placeholder: "Please share any suggestions for improvement", required: false },
      { id: "20", type: "textarea", label: "Additional comments", 
        placeholder: "Any other feedback you'd like to share", required: false }
    ],
    settings: {
      allowAnonymous: true,
      requireAuthentication: false,
      multiPage: true,
      showProgress: true,
      autoSave: true,
      notifications: false,
      branding: true
    },
    styling: {
      theme: "modern",
      primaryColor: "#8b5cf6",
      backgroundColor: "#ffffff",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  },
  {
    id: "covid_screening",
    title: "COVID-19 Health Screening",
    description: "Pre-visit COVID-19 symptom and exposure screening questionnaire",
    category: "assessment",
    fields: [
      { id: "1", type: "radio", label: "Have you received a COVID-19 vaccine?", 
        options: ["Fully vaccinated (2+ doses)", "Partially vaccinated (1 dose)", "Not vaccinated"], required: true },
      { id: "2", type: "date", label: "Date of last COVID-19 vaccine dose", required: false },
      { id: "3", type: "radio", label: "Have you tested positive for COVID-19 in the past 90 days?", 
        options: ["Yes", "No"], required: true },
      { id: "4", type: "date", label: "If yes, date of positive test", required: false },
      { id: "5", type: "checkbox", label: "Are you currently experiencing any of these symptoms?", 
        options: ["Fever (100.4°F or higher)", "Cough", "Shortness of breath", "Loss of taste or smell", "Sore throat", "Body aches", "Headache", "Fatigue", "Nausea/vomiting", "Diarrhea", "None of the above"], required: true },
      { id: "6", type: "radio", label: "Have you had close contact with someone who tested positive for COVID-19 in the past 14 days?", 
        options: ["Yes", "No", "Unknown"], required: true },
      { id: "7", type: "radio", label: "Have you traveled outside your local area in the past 14 days?", 
        options: ["Yes", "No"], required: true },
      { id: "8", type: "textarea", label: "If yes, where did you travel?", required: false },
      { id: "9", type: "radio", label: "Have you attended any large gatherings in the past 14 days?", 
        options: ["Yes", "No"], required: true },
      { id: "10", type: "radio", label: "Do you live or work in a long-term care facility?", 
        options: ["Yes", "No"], required: true },
      { id: "11", type: "checkbox", label: "Do you have any of the following high-risk conditions?", 
        options: ["Age 65 or older", "Chronic lung disease", "Heart conditions", "Immunocompromised", "Diabetes", "Chronic kidney disease", "Liver disease", "Pregnancy", "None of the above"], required: false },
      { id: "12", type: "radio", label: "Are you currently in quarantine or isolation?", 
        options: ["Yes", "No"], required: true },
      { id: "13", type: "signature", label: "I certify that the above information is accurate", required: true }
    ],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: false,
      showProgress: false,
      autoSave: true,
      notifications: true,
      branding: true
    },
    styling: {
      theme: "medical",
      primaryColor: "#dc2626",
      backgroundColor: "#fef2f2",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  },
  {
    id: "consent_surgery",
    title: "Surgical Consent Form",
    description: "Comprehensive informed consent for surgical procedures",
    category: "consent",
    fields: [
      { id: "1", type: "text", label: "Patient Full Name", required: true },
      { id: "2", type: "date", label: "Date of Birth", required: true },
      { id: "3", type: "text", label: "Procedure Name", required: true },
      { id: "4", type: "text", label: "Surgeon Name", required: true },
      { id: "5", type: "date", label: "Scheduled Surgery Date", required: true },
      { id: "6", type: "textarea", label: "Description of Procedure", 
        placeholder: "Detailed description of the planned surgical procedure", required: true },
      { id: "7", type: "textarea", label: "Reason for Surgery", 
        placeholder: "Medical indication and expected benefits", required: true },
      { id: "8", type: "textarea", label: "Risks and Complications", 
        placeholder: "Potential risks, complications, and side effects", required: true },
      { id: "9", type: "textarea", label: "Alternative Treatments", 
        placeholder: "Other treatment options available", required: true },
      { id: "10", type: "textarea", label: "Consequences of No Treatment", 
        placeholder: "What may happen if surgery is not performed", required: true },
      { id: "11", type: "radio", label: "Anesthesia Type", 
        options: ["General anesthesia", "Local anesthesia", "Regional anesthesia", "Sedation"], required: true },
      { id: "12", type: "checkbox", label: "I understand and acknowledge", 
        options: [
          "The nature and purpose of the surgery has been explained to me",
          "I understand the risks and benefits",
          "I understand that no guarantee of success has been made",
          "I have had opportunity to ask questions",
          "I understand alternative treatments are available",
          "I understand the consequences of refusing treatment",
          "I consent to photography/video for medical purposes",
          "I consent to disposal of tissue/specimens as appropriate"
        ], required: true },
      { id: "13", type: "radio", label: "Blood transfusion consent", 
        options: ["I consent to blood transfusion if necessary", "I refuse blood transfusion"], required: true },
      { id: "14", type: "textarea", label: "Special instructions or concerns", required: false },
      { id: "15", type: "text", label: "Patient/Guardian Name (print)", required: true },
      { id: "16", type: "signature", label: "Patient/Guardian Signature", required: true },
      { id: "17", type: "date", label: "Date Signed", required: true },
      { id: "18", type: "text", label: "Witness Name (print)", required: true },
      { id: "19", type: "signature", label: "Witness Signature", required: true },
      { id: "20", type: "text", label: "Physician Name (print)", required: true },
      { id: "21", type: "signature", label: "Physician Signature", required: true }
    ],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: true,
      showProgress: true,
      autoSave: true,
      notifications: true,
      branding: true
    },
    styling: {
      theme: "medical",
      primaryColor: "#1d4ed8",
      backgroundColor: "#ffffff",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  },
  {
    id: "employee_health_screening",
    title: "Employee Health & Wellness Survey",
    description: "Annual employee health assessment and wellness program feedback",
    category: "survey",
    fields: [
      { id: "1", type: "select", label: "Department", 
        options: ["Administration", "Clinical", "Laboratory", "Radiology", "Pharmacy", "Housekeeping", "Security", "Other"], required: true },
      { id: "2", type: "select", label: "Years of employment", 
        options: ["Less than 1 year", "1-2 years", "3-5 years", "6-10 years", "More than 10 years"], required: true },
      { id: "3", type: "rating", label: "Overall health and wellbeing", required: true },
      { id: "4", type: "rating", label: "Work-related stress level", required: true },
      { id: "5", type: "rating", label: "Job satisfaction", required: true },
      { id: "6", type: "rating", label: "Work-life balance", required: true },
      { id: "7", type: "checkbox", label: "Current health concerns", 
        options: ["Musculoskeletal pain", "Stress/anxiety", "Sleep problems", "Fatigue", "Weight management", "None"], required: false },
      { id: "8", type: "checkbox", label: "Workplace wellness programs you'd be interested in", 
        options: ["Fitness classes", "Nutrition counseling", "Stress management", "Health screenings", "Mental health support", "Ergonomic assessments", "Smoking cessation"], required: false },
      { id: "9", type: "radio", label: "Do you feel comfortable reporting workplace safety concerns?", 
        options: ["Very comfortable", "Somewhat comfortable", "Not very comfortable", "Not at all comfortable"], required: true },
      { id: "10", type: "textarea", label: "Suggestions for improving workplace wellness", required: false }
    ],
    settings: {
      allowAnonymous: true,
      requireAuthentication: false,
      multiPage: false,
      showProgress: true,
      autoSave: true,
      notifications: false,
      branding: true
    },
    styling: {
      theme: "modern",
      primaryColor: "#059669",
      backgroundColor: "#f0fdf4",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isActive: true
  }
];

const categoryIcons = {
  intake: UserCheck,
  assessment: Stethoscope,
  survey: MessageSquare,
  feedback: Smile,
  consent: Shield,
  medical: Heart,
  custom: FileText
};

const categoryColors = {
  intake: "bg-blue-100 text-blue-800",
  assessment: "bg-red-100 text-red-800",
  survey: "bg-green-100 text-green-800",
  feedback: "bg-yellow-100 text-yellow-800",
  consent: "bg-purple-100 text-purple-800",
  medical: "bg-pink-100 text-pink-800",
  custom: "bg-gray-100 text-gray-800"
};

interface SurveyTemplatesProps {
  onSelectTemplate: (template: FormTemplate) => void;
  onCreateNew: () => void;
}

export function SurveyTemplates({ onSelectTemplate, onCreateNew }: SurveyTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const filteredTemplates = comprehensiveTemplates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "oldest":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "name":
        return a.title.localeCompare(b.title);
      case "category":
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  const getCategoryStats = () => {
    const stats = comprehensiveTemplates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([category, count]) => ({
      category,
      count,
      Icon: categoryIcons[category as keyof typeof categoryIcons] || FileText
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form & Survey Templates</h2>
          <p className="text-gray-600 mt-1">
            Choose from our comprehensive library of pre-built medical forms and surveys
          </p>
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Form
        </Button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {getCategoryStats().map(({ category, count, Icon }) => (
          <Card key={category} className="hover:bg-gray-50 cursor-pointer">
            <CardContent className="p-4 text-center">
              <Icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{category}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="intake">Patient Intake</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="survey">Survey</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="consent">Consent</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const IconComponent = categoryIcons[template.category as keyof typeof categoryIcons] || FileText;
          
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                      <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <Badge className={categoryColors[template.category as keyof typeof categoryColors]}>
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">4.8</span>
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg line-clamp-2">{template.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{template.fields.length} fields</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>2.3k uses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>~{Math.ceil(template.fields.length * 0.5)}min</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {template.settings.multiPage && (
                      <Badge variant="outline" className="text-xs">Multi-page</Badge>
                    )}
                    {template.settings.allowAnonymous && (
                      <Badge variant="outline" className="text-xs">Anonymous</Badge>
                    )}
                    {template.settings.autoSave && (
                      <Badge variant="outline" className="text-xs">Auto-save</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">Try adjusting your search terms or filters</p>
        </div>
      )}

      {/* Popular Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Most Popular Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comprehensiveTemplates.slice(0, 4).map((template) => {
              const IconComponent = categoryIcons[template.category as keyof typeof categoryIcons] || FileText;
              
              return (
                <div key={template.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <IconComponent className="h-6 w-6 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{template.title}</div>
                    <div className="text-xs text-gray-500">{template.fields.length} fields</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onSelectTemplate(template)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}