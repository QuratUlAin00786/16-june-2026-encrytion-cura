/**
 * Built-in form templates for the Form Builder.
 * When a user selects "Use Template", a copy is loaded so the original remains unchanged.
 */

export type FieldType = "text" | "textarea" | "number" | "email" | "date" | "checkbox" | "radio";

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  optionsInput?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  sections: TemplateSection[];
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "patient-intake-medical-history",
    title: "Patient Intake & Medical History Form",
    description: "This form is used to collect patient demographic information, medical history, and current health concerns before consultation.",
    category: "Patient Intake",
    sections: [
      {
        id: "s1",
        title: "Patient Information",
        fields: [
          { id: "f1", label: "Full Name", type: "text", required: true, placeholder: "Enter full name" },
          { id: "f2", label: "Date of Birth", type: "date", required: true },
          { id: "f3", label: "Gender", type: "radio", required: false, options: ["Male", "Female", "Other"], optionsInput: "Male, Female, Other" },
          { id: "f4", label: "Phone Number", type: "number", required: true, placeholder: "Phone" },
          { id: "f5", label: "Email Address", type: "email", required: true, placeholder: "Email" },
          { id: "f6", label: "Home Address", type: "textarea", required: false, placeholder: "Address" },
        ],
      },
      {
        id: "s2",
        title: "Visit Details",
        fields: [
          { id: "f7", label: "Reason for Visit", type: "textarea", required: true, placeholder: "Describe reason" },
          { id: "f8", label: "Symptoms Duration", type: "number", required: false, placeholder: "Days/weeks" },
          { id: "f9", label: "Have you visited us before?", type: "radio", required: false, options: ["Yes", "No"], optionsInput: "Yes, No" },
          { id: "f10", label: "Priority Level", type: "radio", required: false, options: ["Routine", "Urgent", "Emergency"], optionsInput: "Routine, Urgent, Emergency" },
        ],
      },
      {
        id: "s3",
        title: "Medical History",
        fields: [
          { id: "f11", label: "Chronic Conditions", type: "checkbox", required: false, options: ["Diabetes", "Hypertension", "Asthma", "Heart Disease", "None"], optionsInput: "Diabetes, Hypertension, Asthma, Heart Disease, None" },
          { id: "f12", label: "Current Medications", type: "textarea", required: false, placeholder: "List medications" },
          { id: "f13", label: "Known Allergies", type: "textarea", required: false, placeholder: "List allergies" },
        ],
      },
      {
        id: "s4",
        title: "Consent",
        fields: [
          { id: "f14", label: "I confirm the information provided is accurate", type: "checkbox", required: true, options: ["Yes"], optionsInput: "Yes" },
          { id: "f15", label: "Signature", type: "text", required: true, placeholder: "Full name" },
          { id: "f16", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
  {
    id: "aesthetic-new-patient",
    title: "Aesthetic Clinic - New Patient Registration",
    description: "Registration form for new patients at an aesthetic clinic.",
    category: "Aesthetic Clinic",
    sections: [
      { id: "s1", title: "Personal Details", fields: [
        { id: "f1", label: "Full Name", type: "text", required: true },
        { id: "f2", label: "Date of Birth", type: "date", required: true },
        { id: "f3", label: "Email", type: "email", required: true },
        { id: "f4", label: "Phone", type: "number", required: true },
        { id: "f5", label: "Emergency Contact", type: "text", required: false },
      ]},
      { id: "s2", title: "Skin & Treatment History", fields: [
        { id: "f6", label: "Skin Type", type: "radio", required: false, options: ["Dry", "Oily", "Combination", "Sensitive"], optionsInput: "Dry, Oily, Combination, Sensitive" },
        { id: "f7", label: "Previous Treatments", type: "textarea", required: false, placeholder: "List any previous aesthetic treatments" },
        { id: "f8", label: "Current Skincare Routine", type: "textarea", required: false },
      ]},
    ],
  },
  {
    id: "consent-botox",
    title: "Treatment Consent - Botox",
    description: "Informed consent form for Botox treatment.",
    category: "Treatment-Specific",
    sections: [
      { id: "s1", title: "Treatment Agreement", fields: [
        { id: "f1", label: "I understand the procedure and risks", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Treatment areas", type: "checkbox", required: false, options: ["Forehead", "Glabella", "Crow's feet", "Other"], optionsInput: "Forehead, Glabella, Crow's feet, Other" },
        { id: "f3", label: "Additional notes", type: "textarea", required: false },
        { id: "f4", label: "Signature", type: "text", required: true },
        { id: "f5", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "consent-laser",
    title: "Treatment Consent - Laser",
    description: "Informed consent for laser skin treatments.",
    category: "Treatment-Specific",
    sections: [
      { id: "s1", title: "Laser Consent", fields: [
        { id: "f1", label: "I have been informed about the laser procedure", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Laser type / area", type: "text", required: true, placeholder: "e.g. Laser hair removal - legs" },
        { id: "f3", label: "Skin sensitivity", type: "radio", required: false, options: ["Normal", "Sensitive", "Very sensitive"], optionsInput: "Normal, Sensitive, Very sensitive" },
        { id: "f4", label: "Signature", type: "text", required: true },
        { id: "f5", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "consent-prp",
    title: "Treatment Consent - PRP",
    description: "Informed consent for PRP (Platelet-Rich Plasma) treatment.",
    category: "Treatment-Specific",
    sections: [
      { id: "s1", title: "PRP Consent", fields: [
        { id: "f1", label: "I understand PRP uses my own blood", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Treatment area", type: "text", required: true, placeholder: "e.g. Face, Scalp" },
        { id: "f3", label: "Signature", type: "text", required: true },
        { id: "f4", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "medical-history",
    title: "Medical History Form",
    description: "Comprehensive medical history for clinical assessment.",
    category: "Medical History",
    sections: [
      { id: "s1", title: "General Health", fields: [
        { id: "f1", label: "Current health conditions", type: "textarea", required: false },
        { id: "f2", label: "Past surgeries", type: "textarea", required: false },
        { id: "f3", label: "Family medical history", type: "textarea", required: false },
      ]},
      { id: "s2", title: "Lifestyle", fields: [
        { id: "f4", label: "Smoking", type: "radio", required: false, options: ["Never", "Former", "Current"], optionsInput: "Never, Former, Current" },
        { id: "f5", label: "Alcohol use", type: "radio", required: false, options: ["None", "Occasional", "Regular"], optionsInput: "None, Occasional, Regular" },
        { id: "f6", label: "Exercise frequency", type: "text", required: false, placeholder: "e.g. 3x per week" },
      ]},
    ],
  },
  {
    id: "consent-general",
    title: "General Consent Form",
    description: "General treatment and data consent.",
    category: "Consent",
    sections: [
      { id: "s1", title: "Consent", fields: [
        { id: "f1", label: "I consent to treatment as discussed", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "I consent to use of my data for care", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f3", label: "Signature", type: "text", required: true },
        { id: "f4", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "photo-consent",
    title: "Photo Consent Form",
    description: "Consent for clinical photography and use of images.",
    category: "Consent",
    sections: [
      { id: "s1", title: "Photography Consent", fields: [
        { id: "f1", label: "I consent to clinical photography", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Images may be used for", type: "checkbox", required: false, options: ["Medical records only", "Treatment planning", "Education", "Marketing (anonymized)"], optionsInput: "Medical records only, Treatment planning, Education, Marketing (anonymized)" },
        { id: "f3", label: "Signature", type: "text", required: true },
        { id: "f4", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "consultation-request",
    title: "Consultation Request Form",
    description: "Request a consultation with a specialist.",
    category: "Patient Intake",
    sections: [
      { id: "s1", title: "Request Details", fields: [
        { id: "f1", label: "Patient Name", type: "text", required: true },
        { id: "f2", label: "Preferred consultation type", type: "radio", required: true, options: ["In-person", "Video call", "Phone"], optionsInput: "In-person, Video call, Phone" },
        { id: "f3", label: "Preferred date/time", type: "text", required: false, placeholder: "e.g. Next week morning" },
        { id: "f4", label: "Reason for consultation", type: "textarea", required: true },
        { id: "f5", label: "Contact email", type: "email", required: true },
        { id: "f6", label: "Contact phone", type: "number", required: true },
      ]},
    ],
  },
  {
    id: "follow-up-assessment",
    title: "Follow-up Assessment Form",
    description: "Post-treatment or follow-up visit assessment.",
    category: "Medical History",
    sections: [
      { id: "s1", title: "Follow-up", fields: [
        { id: "f1", label: "Date of previous treatment", type: "date", required: false },
        { id: "f2", label: "How do you feel since last visit?", type: "radio", required: false, options: ["Much better", "Better", "Same", "Worse"], optionsInput: "Much better, Better, Same, Worse" },
        { id: "f3", label: "Any new symptoms or concerns?", type: "textarea", required: false },
        { id: "f4", label: "Medication adherence", type: "radio", required: false, options: ["As prescribed", "Sometimes missed", "Often missed"], optionsInput: "As prescribed, Sometimes missed, Often missed" },
      ]},
    ],
  },
  {
    id: "dermal-filler-consent",
    title: "Treatment Consent - Dermal Filler",
    description: "Informed consent for dermal filler treatment.",
    category: "Treatment-Specific",
    sections: [
      { id: "s1", title: "Filler Consent", fields: [
        { id: "f1", label: "I understand the risks of dermal fillers", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Treatment area(s)", type: "checkbox", required: false, options: ["Lips", "Nasolabial folds", "Cheeks", "Other"], optionsInput: "Lips, Nasolabial folds, Cheeks, Other" },
        { id: "f3", label: "Signature", type: "text", required: true },
        { id: "f4", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "chemical-peel-consent",
    title: "Treatment Consent - Chemical Peel",
    description: "Consent for chemical peel procedure.",
    category: "Treatment-Specific",
    sections: [
      { id: "s1", title: "Chemical Peel Consent", fields: [
        { id: "f1", label: "I understand the procedure and aftercare", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Peel type / strength", type: "text", required: true, placeholder: "As discussed with provider" },
        { id: "f3", label: "Signature", type: "text", required: true },
        { id: "f4", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "microneedling-consent",
    title: "Treatment Consent - Microneedling",
    description: "Consent for microneedling treatment.",
    category: "Treatment-Specific",
    sections: [
      { id: "s1", title: "Microneedling Consent", fields: [
        { id: "f1", label: "I consent to microneedling as discussed", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f2", label: "Target area", type: "text", required: true },
        { id: "f3", label: "Signature", type: "text", required: true },
        { id: "f4", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "child-minor-consent",
    title: "Consent for Minor / Child",
    description: "Parent or guardian consent for treatment of a minor.",
    category: "Consent",
    sections: [
      { id: "s1", title: "Guardian Consent", fields: [
        { id: "f1", label: "Minor's full name", type: "text", required: true },
        { id: "f2", label: "I am the parent/legal guardian", type: "checkbox", required: true, options: ["I confirm"], optionsInput: "I confirm" },
        { id: "f3", label: "I consent to the proposed treatment", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" },
        { id: "f4", label: "Guardian name", type: "text", required: true },
        { id: "f5", label: "Relationship to minor", type: "text", required: true, placeholder: "e.g. Parent" },
        { id: "f6", label: "Signature", type: "text", required: true },
        { id: "f7", label: "Date", type: "date", required: true },
      ]},
    ],
  },
  {
    id: "pre-procedure-checklist",
    title: "Pre-Procedure Checklist",
    description: "Checklist before a procedure or treatment.",
    category: "Aesthetic Clinic",
    sections: [
      { id: "s1", title: "Checklist", fields: [
        { id: "f1", label: "Consent form signed", type: "checkbox", required: true, options: ["Yes"], optionsInput: "Yes" },
        { id: "f2", label: "Medical history reviewed", type: "checkbox", required: true, options: ["Yes"], optionsInput: "Yes" },
        { id: "f3", label: "Allergies confirmed", type: "checkbox", required: true, options: ["Yes"], optionsInput: "Yes" },
        { id: "f4", label: "Photos taken (if applicable)", type: "checkbox", required: false, options: ["Yes", "N/A"], optionsInput: "Yes, N/A" },
        { id: "f5", label: "Notes", type: "textarea", required: false },
      ]},
    ],
  },
  {
    id: "treatment-feedback",
    title: "Treatment Feedback Form",
    description: "Patient feedback after a treatment.",
    category: "Aesthetic Clinic",
    sections: [
      { id: "s1", title: "Feedback", fields: [
        { id: "f1", label: "Overall satisfaction", type: "radio", required: true, options: ["Very satisfied", "Satisfied", "Neutral", "Unsatisfied"], optionsInput: "Very satisfied, Satisfied, Neutral, Unsatisfied" },
        { id: "f2", label: "Would you recommend us?", type: "radio", required: false, options: ["Yes", "Maybe", "No"], optionsInput: "Yes, Maybe, No" },
        { id: "f3", label: "Additional comments", type: "textarea", required: false },
      ]},
    ],
  },
  // Doctor-Related Templates
  { id: "doctor-consultation-form", title: "Doctor Consultation Form", description: "Standard consultation form for doctor-patient visits.", category: "Doctor-Related", sections: [{ id: "s1", title: "Consultation", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Chief Complaint", type: "textarea", required: true }, { id: "f3", label: "History of Present Illness", type: "textarea", required: false }, { id: "f4", label: "Assessment", type: "textarea", required: false }, { id: "f5", label: "Plan", type: "textarea", required: false }, { id: "f6", label: "Date", type: "date", required: true }] }] },
  { id: "clinical-assessment-form", title: "Clinical Assessment Form", description: "Structured clinical assessment and findings.", category: "Doctor-Related", sections: [{ id: "s1", title: "Assessment", fields: [{ id: "f1", label: "Vital Signs", type: "text", required: false, placeholder: "BP, HR, Temp, etc." }, { id: "f2", label: "Physical Exam Findings", type: "textarea", required: false }, { id: "f3", label: "Clinical Impression", type: "textarea", required: true }, { id: "f4", label: "Recommendations", type: "textarea", required: false }] }] },
  { id: "follow-up-visit-form", title: "Follow-Up Visit Form", description: "Documentation for follow-up visits.", category: "Doctor-Related", sections: [{ id: "s1", title: "Follow-Up", fields: [{ id: "f1", label: "Previous Visit Date", type: "date", required: false }, { id: "f2", label: "Progress Since Last Visit", type: "textarea", required: true }, { id: "f3", label: "Current Status", type: "textarea", required: false }, { id: "f4", label: "Continue/Adjust Plan", type: "textarea", required: false }, { id: "f5", label: "Next Follow-Up", type: "date", required: false }] }] },
  { id: "prescription-form", title: "Prescription Form", description: "Prescription and medication orders.", category: "Doctor-Related", sections: [{ id: "s1", title: "Prescription", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Medication Name", type: "text", required: true }, { id: "f3", label: "Dosage", type: "text", required: true, placeholder: "e.g. 500mg" }, { id: "f4", label: "Frequency", type: "text", required: true, placeholder: "e.g. twice daily" }, { id: "f5", label: "Duration", type: "text", required: false, placeholder: "e.g. 7 days" }, { id: "f6", label: "Instructions", type: "textarea", required: false }, { id: "f7", label: "Date", type: "date", required: true }] }] },
  { id: "treatment-plan-form", title: "Treatment Plan Form", description: "Structured treatment plan documentation.", category: "Doctor-Related", sections: [{ id: "s1", title: "Treatment Plan", fields: [{ id: "f1", label: "Diagnosis", type: "text", required: true }, { id: "f2", label: "Goals", type: "textarea", required: false }, { id: "f3", label: "Treatment Steps", type: "textarea", required: true }, { id: "f4", label: "Timeline", type: "text", required: false }, { id: "f5", label: "Review Date", type: "date", required: false }] }] },
  { id: "surgical-evaluation-form", title: "Surgical Evaluation Form", description: "Pre-surgical evaluation and clearance.", category: "Doctor-Related", sections: [{ id: "s1", title: "Evaluation", fields: [{ id: "f1", label: "Procedure Planned", type: "text", required: true }, { id: "f2", label: "Medical Fitness", type: "radio", required: true, options: ["Fit", "Fit with precautions", "Not fit"], optionsInput: "Fit, Fit with precautions, Not fit" }, { id: "f3", label: "Risk Assessment", type: "textarea", required: false }, { id: "f4", label: "Recommendations", type: "textarea", required: false }, { id: "f5", label: "Evaluator Name", type: "text", required: true }, { id: "f6", label: "Date", type: "date", required: true }] }] },
  { id: "radiology-request-form", title: "Radiology Request Form", description: "Request for imaging studies.", category: "Doctor-Related", sections: [{ id: "s1", title: "Request", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Study Type", type: "text", required: true, placeholder: "X-ray, CT, MRI, etc." }, { id: "f3", label: "Body Part / Region", type: "text", required: true }, { id: "f4", label: "Clinical Indication", type: "textarea", required: true }, { id: "f5", label: "Urgency", type: "radio", required: false, options: ["Routine", "Urgent", "Stat"], optionsInput: "Routine, Urgent, Stat" }, { id: "f6", label: "Requesting Doctor", type: "text", required: true }] }] },
  { id: "lab-test-request-form", title: "Lab Test Request Form", description: "Request for laboratory tests.", category: "Doctor-Related", sections: [{ id: "s1", title: "Lab Request", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Tests Required", type: "textarea", required: true, placeholder: "List tests" }, { id: "f3", label: "Clinical Indication", type: "textarea", required: false }, { id: "f4", label: "Fasting Required", type: "radio", required: false, options: ["Yes", "No"], optionsInput: "Yes, No" }, { id: "f5", label: "Requesting Doctor", type: "text", required: true }, { id: "f6", label: "Date", type: "date", required: true }] }] },
  { id: "medical-certificate-form", title: "Medical Certificate Form", description: "Medical fitness or sick leave certificate.", category: "Doctor-Related", sections: [{ id: "s1", title: "Certificate", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Purpose", type: "text", required: true, placeholder: "e.g. Sick leave, Fitness" }, { id: "f3", label: "Duration / Details", type: "textarea", required: true }, { id: "f4", label: "From Date", type: "date", required: true }, { id: "f5", label: "To Date", type: "date", required: false }, { id: "f6", label: "Doctor Name", type: "text", required: true }, { id: "f7", label: "Date Issued", type: "date", required: true }] }] },
  { id: "telemedicine-consultation-form", title: "Telemedicine Consultation Form", description: "Virtual consultation documentation.", category: "Doctor-Related", sections: [{ id: "s1", title: "Telemedicine Visit", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Platform", type: "text", required: false, placeholder: "e.g. Video call" }, { id: "f3", label: "Chief Complaint", type: "textarea", required: true }, { id: "f4", label: "Assessment", type: "textarea", required: false }, { id: "f5", label: "Plan", type: "textarea", required: false }, { id: "f6", label: "Consent to telemedicine obtained", type: "checkbox", required: true, options: ["Yes"], optionsInput: "Yes" }, { id: "f7", label: "Date", type: "date", required: true }] }] },
  // Patient-Related Templates
  { id: "patient-registration-form", title: "Patient Registration Form", description: "New patient registration and demographics.", category: "Patient-Related", sections: [{ id: "s1", title: "Registration", fields: [{ id: "f1", label: "Full Name", type: "text", required: true }, { id: "f2", label: "Date of Birth", type: "date", required: true }, { id: "f3", label: "Gender", type: "radio", required: false, options: ["Male", "Female", "Other"], optionsInput: "Male, Female, Other" }, { id: "f4", label: "Phone", type: "number", required: true }, { id: "f5", label: "Email", type: "email", required: true }, { id: "f6", label: "Address", type: "textarea", required: false }, { id: "f7", label: "Preferred Language", type: "text", required: false }] }] },
  { id: "patient-intake-form-new", title: "Patient Intake Form", description: "Initial intake information for new patients.", category: "Patient-Related", sections: [{ id: "s1", title: "Intake", fields: [{ id: "f1", label: "Reason for Visit", type: "textarea", required: true }, { id: "f2", label: "Current Medications", type: "textarea", required: false }, { id: "f3", label: "Allergies", type: "textarea", required: false }, { id: "f4", label: "Past Medical History", type: "textarea", required: false }] }] },
  { id: "medical-history-form-new", title: "Medical History Form", description: "Comprehensive medical history (patient-facing).", category: "Patient-Related", sections: [{ id: "s1", title: "Medical History", fields: [{ id: "f1", label: "Chronic Conditions", type: "textarea", required: false }, { id: "f2", label: "Surgeries", type: "textarea", required: false }, { id: "f3", label: "Family History", type: "textarea", required: false }, { id: "f4", label: "Lifestyle", type: "textarea", required: false }] }] },
  { id: "consent-to-treatment-form", title: "Consent to Treatment Form", description: "General consent for medical treatment.", category: "Patient-Related", sections: [{ id: "s1", title: "Consent", fields: [{ id: "f1", label: "Treatment Description", type: "textarea", required: true }, { id: "f2", label: "I consent to the above treatment", type: "checkbox", required: true, options: ["I agree"], optionsInput: "I agree" }, { id: "f3", label: "Patient/Guardian Name", type: "text", required: true }, { id: "f4", label: "Signature", type: "text", required: true }, { id: "f5", label: "Date", type: "date", required: true }] }] },
  { id: "insurance-information-form", title: "Insurance Information Form", description: "Patient insurance details.", category: "Patient-Related", sections: [{ id: "s1", title: "Insurance", fields: [{ id: "f1", label: "Insurance Provider", type: "text", required: true }, { id: "f2", label: "Policy Number", type: "text", required: true }, { id: "f3", label: "Group Number", type: "text", required: false }, { id: "f4", label: "Subscriber Name", type: "text", required: true }, { id: "f5", label: "Relationship to Patient", type: "text", required: false }, { id: "f6", label: "Effective Date", type: "date", required: false }] }] },
  { id: "emergency-contact-form", title: "Emergency Contact Form", description: "Emergency contact information.", category: "Patient-Related", sections: [{ id: "s1", title: "Emergency Contact", fields: [{ id: "f1", label: "Contact Name", type: "text", required: true }, { id: "f2", label: "Relationship", type: "text", required: true }, { id: "f3", label: "Phone", type: "number", required: true }, { id: "f4", label: "Alternate Phone", type: "number", required: false }, { id: "f5", label: "Address", type: "textarea", required: false }] }] },
  { id: "new-patient-onboarding-form", title: "New Patient Onboarding Form", description: "Onboarding checklist and information.", category: "Patient-Related", sections: [{ id: "s1", title: "Onboarding", fields: [{ id: "f1", label: "Welcome packet received", type: "checkbox", required: false, options: ["Yes"], optionsInput: "Yes" }, { id: "f2", label: "ID verified", type: "checkbox", required: false, options: ["Yes"], optionsInput: "Yes" }, { id: "f3", label: "Insurance verified", type: "checkbox", required: false, options: ["Yes"], optionsInput: "Yes" }, { id: "f4", label: "Consents signed", type: "checkbox", required: false, options: ["Yes"], optionsInput: "Yes" }, { id: "f5", label: "Notes", type: "textarea", required: false }] }] },
  { id: "feedback-satisfaction-form", title: "Feedback & Satisfaction Form", description: "Patient satisfaction and feedback.", category: "Patient-Related", sections: [{ id: "s1", title: "Feedback", fields: [{ id: "f1", label: "Overall Rating", type: "radio", required: true, options: ["1 - Poor", "2", "3", "4", "5 - Excellent"], optionsInput: "1 - Poor, 2, 3, 4, 5 - Excellent" }, { id: "f2", label: "Would you recommend us?", type: "radio", required: false, options: ["Yes", "No"], optionsInput: "Yes, No" }, { id: "f3", label: "Comments", type: "textarea", required: false }] }] },
  { id: "pre-surgery-questionnaire", title: "Pre-Surgery Questionnaire", description: "Pre-operative patient questionnaire.", category: "Patient-Related", sections: [{ id: "s1", title: "Pre-Surgery", fields: [{ id: "f1", label: "Last food/drink", type: "text", required: false, placeholder: "Date and time" }, { id: "f2", label: "Current medications taken today", type: "textarea", required: false }, { id: "f3", label: "Allergies confirmed", type: "checkbox", required: true, options: ["Yes"], optionsInput: "Yes" }, { id: "f4", label: "Any concerns?", type: "textarea", required: false }] }] },
  { id: "post-treatment-follow-up-form", title: "Post-Treatment Follow-Up Form", description: "Follow-up after treatment or procedure.", category: "Patient-Related", sections: [{ id: "s1", title: "Follow-Up", fields: [{ id: "f1", label: "Treatment Date", type: "date", required: true }, { id: "f2", label: "How are you feeling?", type: "radio", required: false, options: ["Well", "Some concerns", "Unwell"], optionsInput: "Well, Some concerns, Unwell" }, { id: "f3", label: "Any side effects?", type: "textarea", required: false }, { id: "f4", label: "Next steps", type: "textarea", required: false }] }] },
  // Nurse-Related Templates
  { id: "nursing-assessment-form", title: "Nursing Assessment Form", description: "Nursing assessment and baseline data.", category: "Nurse-Related", sections: [{ id: "s1", title: "Assessment", fields: [{ id: "f1", label: "Vital Signs", type: "text", required: false, placeholder: "BP, HR, RR, Temp, SpO2" }, { id: "f2", label: "Pain Score", type: "number", required: false, placeholder: "0-10" }, { id: "f3", label: "Assessment Notes", type: "textarea", required: true }, { id: "f4", label: "Nurse Name", type: "text", required: true }, { id: "f5", label: "Date/Time", type: "date", required: true }] }] },
  { id: "vital-signs-monitoring-form", title: "Vital Signs Monitoring Form", description: "Vital signs tracking over time.", category: "Nurse-Related", sections: [{ id: "s1", title: "Vitals", fields: [{ id: "f1", label: "Blood Pressure", type: "text", required: false }, { id: "f2", label: "Heart Rate", type: "number", required: false }, { id: "f3", label: "Temperature", type: "number", required: false }, { id: "f4", label: "Respiratory Rate", type: "number", required: false }, { id: "f5", label: "SpO2", type: "number", required: false }, { id: "f6", label: "Time", type: "date", required: true }] }] },
  { id: "medication-administration-record", title: "Medication Administration Record", description: "MAR for documenting medication given.", category: "Nurse-Related", sections: [{ id: "s1", title: "MAR", fields: [{ id: "f1", label: "Medication", type: "text", required: true }, { id: "f2", label: "Dose", type: "text", required: true }, { id: "f3", label: "Route", type: "radio", required: true, options: ["PO", "IV", "IM", "SC", "Topical", "Other"], optionsInput: "PO, IV, IM, SC, Topical, Other" }, { id: "f4", label: "Time Given", type: "date", required: true }, { id: "f5", label: "Administered By", type: "text", required: true }, { id: "f6", label: "Patient Response", type: "textarea", required: false }] }] },
  { id: "wound-care-assessment-form", title: "Wound Care Assessment Form", description: "Wound assessment and care documentation.", category: "Nurse-Related", sections: [{ id: "s1", title: "Wound", fields: [{ id: "f1", label: "Location", type: "text", required: true }, { id: "f2", label: "Size", type: "text", required: false, placeholder: "L x W x D" }, { id: "f3", label: "Appearance", type: "textarea", required: false }, { id: "f4", label: "Drainage", type: "text", required: false }, { id: "f5", label: "Care Performed", type: "textarea", required: false }, { id: "f6", label: "Date/Time", type: "date", required: true }] }] },
  { id: "patient-observation-chart", title: "Patient Observation Chart", description: "Structured patient observations.", category: "Nurse-Related", sections: [{ id: "s1", title: "Observations", fields: [{ id: "f1", label: "Time", type: "date", required: true }, { id: "f2", label: "Level of Consciousness", type: "text", required: false }, { id: "f3", label: "Behavior/Activity", type: "textarea", required: false }, { id: "f4", label: "Safety Concerns", type: "textarea", required: false }, { id: "f5", label: "Nurse Initials", type: "text", required: true }] }] },
  { id: "injection-administration-form", title: "Injection Administration Form", description: "Documentation for injections given.", category: "Nurse-Related", sections: [{ id: "s1", title: "Injection", fields: [{ id: "f1", label: "Medication", type: "text", required: true }, { id: "f2", label: "Dose", type: "text", required: true }, { id: "f3", label: "Site", type: "text", required: true, placeholder: "e.g. Left deltoid" }, { id: "f4", label: "Time", type: "date", required: true }, { id: "f5", label: "Administered By", type: "text", required: true }, { id: "f6", label: "Patient Tolerated", type: "radio", required: false, options: ["Yes", "No"], optionsInput: "Yes, No" }] }] },
  { id: "daily-nursing-report", title: "Daily Nursing Report", description: "Shift or daily nursing summary.", category: "Nurse-Related", sections: [{ id: "s1", title: "Report", fields: [{ id: "f1", label: "Shift", type: "radio", required: true, options: ["Day", "Evening", "Night"], optionsInput: "Day, Evening, Night" }, { id: "f2", label: "Summary", type: "textarea", required: true }, { id: "f3", label: "Incidents", type: "textarea", required: false }, { id: "f4", label: "Handover Notes", type: "textarea", required: false }, { id: "f5", label: "Nurse Name", type: "text", required: true }, { id: "f6", label: "Date", type: "date", required: true }] }] },
  { id: "iv-fluid-monitoring-form", title: "IV Fluid Monitoring Form", description: "IV fluid intake and monitoring.", category: "Nurse-Related", sections: [{ id: "s1", title: "IV", fields: [{ id: "f1", label: "Solution", type: "text", required: true }, { id: "f2", label: "Rate", type: "text", required: true, placeholder: "e.g. 100 mL/hr" }, { id: "f3", label: "Site", type: "text", required: false }, { id: "f4", label: "Start Time", type: "date", required: true }, { id: "f5", label: "Volume Infused", type: "text", required: false }, { id: "f6", label: "Nurse", type: "text", required: true }] }] },
  { id: "shift-handover-report", title: "Shift Handover Report", description: "Handover between shifts.", category: "Nurse-Related", sections: [{ id: "s1", title: "Handover", fields: [{ id: "f1", label: "From Shift", type: "text", required: true }, { id: "f2", label: "To Shift", type: "text", required: true }, { id: "f3", label: "Key Points", type: "textarea", required: true }, { id: "f4", label: "Pending Tasks", type: "textarea", required: false }, { id: "f5", label: "Handed Over By", type: "text", required: true }, { id: "f6", label: "Received By", type: "text", required: true }] }] },
  { id: "triage-assessment-form", title: "Triage Assessment Form", description: "Emergency or clinic triage assessment.", category: "Nurse-Related", sections: [{ id: "s1", title: "Triage", fields: [{ id: "f1", label: "Chief Complaint", type: "textarea", required: true }, { id: "f2", label: "Triage Level", type: "radio", required: true, options: ["1 - Resuscitation", "2 - Emergent", "3 - Urgent", "4 - Less Urgent", "5 - Non-Urgent"], optionsInput: "1 - Resuscitation, 2 - Emergent, 3 - Urgent, 4 - Less Urgent, 5 - Non-Urgent" }, { id: "f3", label: "Vitals", type: "text", required: false }, { id: "f4", label: "Notes", type: "textarea", required: false }, { id: "f5", label: "Triage Nurse", type: "text", required: true }] }] },
  // Admin-Related Templates
  { id: "appointment-booking-form", title: "Appointment Booking Form", description: "Book or request an appointment.", category: "Admin-Related", sections: [{ id: "s1", title: "Booking", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Preferred Date", type: "date", required: true }, { id: "f3", label: "Preferred Time", type: "text", required: false }, { id: "f4", label: "Provider/Department", type: "text", required: false }, { id: "f5", label: "Reason", type: "textarea", required: false }, { id: "f6", label: "Contact Phone", type: "number", required: true }] }] },
  { id: "billing-information-form", title: "Billing Information Form", description: "Billing and payment information.", category: "Admin-Related", sections: [{ id: "s1", title: "Billing", fields: [{ id: "f1", label: "Patient/Account Name", type: "text", required: true }, { id: "f2", label: "Service/Procedure", type: "text", required: true }, { id: "f3", label: "Amount", type: "number", required: true }, { id: "f4", label: "Payment Method", type: "radio", required: false, options: ["Cash", "Card", "Insurance", "Other"], optionsInput: "Cash, Card, Insurance, Other" }, { id: "f5", label: "Notes", type: "textarea", required: false }] }] },
  { id: "invoice-request-form", title: "Invoice Request Form", description: "Request for an invoice.", category: "Admin-Related", sections: [{ id: "s1", title: "Request", fields: [{ id: "f1", label: "Patient/Client Name", type: "text", required: true }, { id: "f2", label: "Services/Dates", type: "textarea", required: true }, { id: "f3", label: "Billing Address", type: "textarea", required: false }, { id: "f4", label: "Email for Invoice", type: "email", required: true }, { id: "f5", label: "Requested By", type: "text", required: true }] }] },
  { id: "admission-form", title: "Admission Form", description: "Patient admission documentation.", category: "Admin-Related", sections: [{ id: "s1", title: "Admission", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Admission Date/Time", type: "date", required: true }, { id: "f3", label: "Unit/Ward", type: "text", required: false }, { id: "f4", label: "Admitting Doctor", type: "text", required: true }, { id: "f5", label: "Reason for Admission", type: "textarea", required: true }, { id: "f6", label: "Admitted By", type: "text", required: true }] }] },
  { id: "discharge-summary-form", title: "Discharge Summary Form", description: "Discharge summary and instructions.", category: "Admin-Related", sections: [{ id: "s1", title: "Discharge", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Discharge Date", type: "date", required: true }, { id: "f3", label: "Diagnosis", type: "textarea", required: false }, { id: "f4", label: "Summary of Stay", type: "textarea", required: false }, { id: "f5", label: "Discharge Instructions", type: "textarea", required: true }, { id: "f6", label: "Follow-Up", type: "textarea", required: false }, { id: "f7", label: "Discharging Doctor", type: "text", required: true }] }] },
  { id: "referral-form", title: "Referral Form", description: "Referral to another provider or facility.", category: "Admin-Related", sections: [{ id: "s1", title: "Referral", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Refer To", type: "text", required: true }, { id: "f3", label: "Specialty/Service", type: "text", required: true }, { id: "f4", label: "Reason for Referral", type: "textarea", required: true }, { id: "f5", label: "Referring Doctor", type: "text", required: true }, { id: "f6", label: "Urgency", type: "radio", required: false, options: ["Routine", "Urgent"], optionsInput: "Routine, Urgent" }] }] },
  { id: "complaint-registration-form", title: "Complaint Registration Form", description: "Register a complaint or feedback.", category: "Admin-Related", sections: [{ id: "s1", title: "Complaint", fields: [{ id: "f1", label: "Complainant Name", type: "text", required: true }, { id: "f2", label: "Contact", type: "text", required: true }, { id: "f3", label: "Subject", type: "text", required: true }, { id: "f4", label: "Description", type: "textarea", required: true }, { id: "f5", label: "Date of Incident", type: "date", required: false }, { id: "f6", label: "Preferred Resolution", type: "textarea", required: false }] }] },
  { id: "staff-registration-form", title: "Staff Registration Form", description: "New staff registration and details.", category: "Admin-Related", sections: [{ id: "s1", title: "Staff", fields: [{ id: "f1", label: "Full Name", type: "text", required: true }, { id: "f2", label: "Role/Title", type: "text", required: true }, { id: "f3", label: "Department", type: "text", required: false }, { id: "f4", label: "Email", type: "email", required: true }, { id: "f5", label: "Phone", type: "number", required: true }, { id: "f6", label: "Start Date", type: "date", required: false }] }] },
  { id: "insurance-claim-form", title: "Insurance Claim Form", description: "Insurance claim submission details.", category: "Admin-Related", sections: [{ id: "s1", title: "Claim", fields: [{ id: "f1", label: "Patient Name", type: "text", required: true }, { id: "f2", label: "Insurance Provider", type: "text", required: true }, { id: "f3", label: "Policy Number", type: "text", required: true }, { id: "f4", label: "Service Date", type: "date", required: true }, { id: "f5", label: "Diagnosis/CPT Codes", type: "textarea", required: false }, { id: "f6", label: "Amount Claimed", type: "number", required: true }, { id: "f7", label: "Submitted By", type: "text", required: true }] }] },
  { id: "document-request-form", title: "Document Request Form", description: "Request medical or admin documents.", category: "Admin-Related", sections: [{ id: "s1", title: "Request", fields: [{ id: "f1", label: "Requester Name", type: "text", required: true }, { id: "f2", label: "Patient Name", type: "text", required: true }, { id: "f3", label: "Document Type", type: "text", required: true, placeholder: "e.g. Medical record, Invoice" }, { id: "f4", label: "Purpose", type: "textarea", required: false }, { id: "f5", label: "Preferred Format", type: "radio", required: false, options: ["Email", "Post", "Pick-up"], optionsInput: "Email, Post, Pick-up" }, { id: "f6", label: "Contact", type: "email", required: true }] }] },
];

/**
 * Clone a template into a FormBuilderLoadPayload with new unique ids so the builder gets a copy.
 */
export function cloneTemplateAsPayload(template: FormTemplate): { key: number; title: string; description: string; sections: Array<{ id: string; title: string; fields: Array<{ id: string; label: string; type: FieldType; required: boolean; placeholder?: string; options?: string[]; optionsInput?: string }> }> } {
  const key = Date.now();
  return {
    key,
    title: template.title,
    description: template.description,
    sections: template.sections.map((sec, si) => ({
      id: `section_${key}_${si}`,
      title: sec.title,
      fields: sec.fields.map((f, fi) => ({
        id: `field_${key}_${si}_${fi}`,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder,
        options: f.options,
        optionsInput: f.optionsInput ?? f.options?.join(", "),
      })),
    })),
  };
}
