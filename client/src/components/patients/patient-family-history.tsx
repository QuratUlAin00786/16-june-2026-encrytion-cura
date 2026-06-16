import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Users,
  Heart,
  AlertTriangle,
  Edit,
  Trash2,
  Activity,
  Save,
  Check,
  ChevronsUpDown,
  X,
  CheckCircle,
  FileText,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types";

interface AnatomicalFile {
  filename: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface PatientFamilyHistoryProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
  anatomicalFiles?: AnatomicalFile[];
  anatomicalFilesLoading?: boolean;
  anatomicalFilesError?: string;
  onDeleteAnatomicalFile?: (filename: string) => Promise<boolean>;
}

interface FamilyCondition {
  id: string;
  relative: string;
  condition: string;
  ageOfOnset?: string;
  notes?: string;
  severity: "mild" | "moderate" | "severe";
}

interface SocialHistory {
  smoking: {
    status: "never" | "former" | "current";
    packsPerDay?: number;
    yearsSmoked?: number;
    quitDate?: string;
  };
  alcohol: {
    status: "never" | "occasional" | "moderate" | "heavy";
    drinksPerWeek?: number;
  };
  drugs: {
    status: "never" | "former" | "current";
    substances?: string[];
    notes?: string;
  };
  occupation: string;
  maritalStatus: string;
  education: string;
  exercise: {
    frequency: "none" | "occasional" | "regular" | "daily";
    type?: string;
    duration?: string;
  };
}

interface Immunization {
  id: string;
  vaccine: string;
  date: string;
  provider: string;
  lot?: string;
  site?: string;
  notes?: string;
}

type RelationshipCategory =
  | "father"
  | "mother"
  | "siblings"
  | "children"
  | "grandparents"
  | "grandchildren"
  | "spouse"
  | "extended"
  | "step_parents"
  | "step_siblings"
  | "guardian";

const familyMembers = {
  "Immediate Family": [
    "Father",
    "Mother",
    "Brother",
    "Sister",
    "Son",
    "Daughter",
    "Spouse / Husband / Wife"
  ],
  "Extended Family": [
    "Grandfather",
    "Grandmother",
    "Grandson",
    "Granddaughter",
    "Uncle",
    "Aunt",
    "Nephew",
    "Niece",
    "Cousin"
  ],
  "Other / Optional": [
    "Step-father",
    "Step-mother",
    "Step-brother",
    "Step-sister",
    "Partner / Domestic Partner",
    "Guardian"
  ]
};

const defaultFamilyHistory: Record<RelationshipCategory, string[]> = {
  father: [],
  mother: [],
  siblings: [],
  children: [],
  grandparents: [],
  grandchildren: [],
  spouse: [],
  extended: [],
  step_parents: [],
  step_siblings: [],
  guardian: [],
};

const relationshipLabels: Record<RelationshipCategory, string> = {
  father: "Father",
  mother: "Mother",
  siblings: "Siblings",
  children: "Children",
  grandparents: "Grandparents",
  grandchildren: "Grandchildren",
  spouse: "Spouse / Partner",
  extended: "Extended Family",
  step_parents: "Step Parents",
  step_siblings: "Step Siblings",
  guardian: "Guardian",
};

const relationshipOrder: RelationshipCategory[] = [
  "father",
  "mother",
  "spouse",
  "children",
  "grandchildren",
  "siblings",
  "step_parents",
  "step_siblings",
  "extended",
  "grandparents",
  "guardian",
];

const normalizeFamilyHistory = (
  history?: Partial<Record<RelationshipCategory, string[]>>,
): Record<RelationshipCategory, string[]> => {
  return {
    father: history?.father ?? [],
    mother: history?.mother ?? [],
    siblings: history?.siblings ?? [],
    children: history?.children ?? [],
    grandparents: history?.grandparents ?? [],
    grandchildren: history?.grandchildren ?? [],
    spouse: history?.spouse ?? [],
    extended: history?.extended ?? [],
    step_parents: history?.step_parents ?? [],
    step_siblings: history?.step_siblings ?? [],
    guardian: history?.guardian ?? [],
  };
};

const medicalConditions = {
  "1. Cardiovascular Conditions": [
    "Hypertension (High blood pressure)",
    "Heart disease",
    "Atrial fibrillation",
    "Congestive heart failure",
    "Coronary artery disease",
    "High cholesterol"
  ],
  "2. Respiratory Conditions": [
    "Asthma",
    "COPD (Chronic obstructive pulmonary disease)",
    "Chronic bronchitis",
    "Emphysema",
    "Sleep apnea"
  ],
  "3. Endocrine & Metabolic Conditions": [
    "Diabetes (Type 1, Type 2)",
    "Thyroid disorders (Hypothyroidism, Hyperthyroidism)",
    "PCOS (Polycystic ovarian syndrome)",
    "Metabolic syndrome",
    "Obesity"
  ],
  "4. Gastrointestinal Conditions": [
    "GERD (Acid reflux)",
    "Crohn's disease",
    "Ulcerative colitis",
    "IBS (Irritable bowel syndrome)",
    "Celiac disease",
    "Chronic liver disease"
  ],
  "5. Neurological Conditions": [
    "Epilepsy",
    "Parkinson's disease",
    "Multiple sclerosis",
    "Migraines",
    "Neuropathy",
    "Alzheimer's / Dementia"
  ],
  "6. Mental Health Conditions": [
    "Depression",
    "Anxiety disorders",
    "Bipolar disorder",
    "PTSD",
    "OCD",
    "ADHD"
  ],
  "7. Musculoskeletal Conditions": [
    "Arthritis (Osteoarthritis, Rheumatoid arthritis)",
    "Fibromyalgia",
    "Chronic back pain",
    "Osteoporosis"
  ],
  "8. Autoimmune Conditions": [
    "Lupus",
    "Sjögren's syndrome",
    "Psoriasis / Psoriatic arthritis",
    "Hashimoto's thyroiditis"
  ],
  "9. Kidney & Urinary Conditions": [
    "Chronic kidney disease",
    "Interstitial cystitis",
    "Recurrent kidney stones"
  ],
  "10. Skin Conditions": [
    "Eczema",
    "Rosacea",
    "Hives",
    "Vitiligo"
  ],
  "Optional / Other": [
    "Cancer (Specify type)",
    "Anemia",
    "HIV/AIDS",
    "Other chronic conditions (Specify)"
  ]
};

const commonVaccines = [
  "COVID-19",
  "Influenza",
  "Tetanus",
  "Diphtheria",
  "Pertussis",
  "MMR (Measles, Mumps, Rubella)",
  "Polio",
  "Hepatitis A",
  "Hepatitis B",
  "Varicella (Chickenpox)",
  "Pneumococcal",
  "Meningococcal",
  "HPV",
  "Shingles",
  "Tdap",
  "IPV",
  "Rotavirus",
  "Hib",
  "BCG",
];

const predefinedAllergies = [
  // Food Allergies
  "Peanuts",
  "Tree nuts (walnuts, almonds, cashews, pistachios)",
  "Milk",
  "Eggs",
  "Wheat",
  "Soy",
  "Fish",
  "Shellfish",
  // Environmental / Seasonal Allergies
  "Pollen (trees, grasses, weeds)",
  "Mold spores",
  "Dust mites",
  "Pet dander (cats, dogs)",
  // Medication Allergies
  "Penicillin and other antibiotics",
  "Aspirin",
  "NSAIDs (ibuprofen, naproxen)",
  "Chemotherapy drugs",
  // Insect Allergies
  "Bee stings",
  "Wasp stings",
  "Hornet stings",
  "Fire ant stings",
  // Chemical / Contact Allergies
  "Latex",
  "Nickel (jewelry, belt buckles)",
  "Fragrances",
  "Detergents and cleaning products",
  "Cosmetics and skincare ingredients",
  // Other Allergies
  "Sun exposure (photosensitivity)",
  "Cold-induced allergies",
];

const predefinedChronicConditions = [
  // Cardiovascular Conditions
  "Hypertension (High blood pressure)",
  "Heart disease",
  "Atrial fibrillation",
  "Congestive heart failure",
  "Coronary artery disease",
  "High cholesterol",
  // Respiratory Conditions
  "Asthma",
  "COPD (Chronic obstructive pulmonary disease)",
  "Chronic bronchitis",
  "Emphysema",
  "Sleep apnea",
  // Endocrine & Metabolic Conditions
  "Diabetes (Type 1, Type 2)",
  "Thyroid disorders (Hypothyroidism, Hyperthyroidism)",
  "PCOS (Polycystic ovarian syndrome)",
  "Metabolic syndrome",
  "Obesity",
  // Gastrointestinal Conditions
  "GERD (Acid reflux)",
  "Crohn's disease",
  "Ulcerative colitis",
  "IBS (Irritable bowel syndrome)",
  "Celiac disease",
  "Chronic liver disease",
  // Neurological Conditions
  "Epilepsy",
  "Parkinson's disease",
  "Multiple sclerosis",
  "Migraines",
  "Neuropathy",
  "Alzheimer's / Dementia",
  // Mental Health Conditions
  "Depression",
  "Anxiety disorders",
  "Bipolar disorder",
  "PTSD",
  "OCD",
  "ADHD",
  // Musculoskeletal Conditions
  "Arthritis (Osteoarthritis, Rheumatoid arthritis)",
  "Fibromyalgia",
  "Chronic back pain",
  "Osteoporosis",
  // Autoimmune Conditions
  "Lupus",
  "Sjögren's syndrome",
  "Psoriasis / Psoriatic arthritis",
  "Hashimoto's thyroiditis",
  // Kidney & Urinary Conditions
  "Chronic kidney disease",
  "Interstitial cystitis",
  "Recurrent kidney stones",
  // Skin Conditions
  "Eczema",
  "Rosacea",
  "Hives",
  "Vitiligo",
];

const predefinedEducationLevels = [
  // No Schooling
  "No formal education",
  "Some primary education (no completion)",
  // Primary / Elementary
  "Completed primary school",
  "Completed elementary school",
  // Secondary / High School
  "Some high school",
  "High school graduate / Diploma",
  "GED (General Equivalency Diploma)",
  // Postsecondary (Non-degree)
  "Trade school / Vocational training",
  "Certificate program",
  "Apprenticeship",
  // College / University
  "Some college (no degree)",
  "Associate degree (AA / AS)",
  "Bachelor's degree (BA / BS / BFA)",
  // Graduate / Postgraduate
  "Master's degree (MA / MS / MBA / etc.)",
  "Professional degree (MD, DO, JD, PharmD, DDS, etc.)",
  "Doctorate / PhD",
  // Other / Specialized
  "Continuing education",
  "Adult education courses",
  "Specialized license training",
  "Other (specify)",
];

const occupationBaseList = [
  // Healthcare & Medical
  "Physician / Doctor",
  "Nurse (RN / LPN)",
  "Nurse Practitioner",
  "Physician Assistant",
  "Pharmacist",
  "Medical Assistant",
  "Dentist",
  "Dental Hygienist",
  "Therapist (PT / OT / Speech)",
  "Emergency Medical Technician (EMT)",
  "Paramedic",
  "Surgeon",
  "Radiology Technician",
  "Medical Laboratory Technician",
  "Caregiver / Home Health Aide",
  // Business & Office
  "Manager",
  "Executive",
  "Business Owner",
  "Administrative Assistant",
  "Receptionist",
  "Accountant",
  "Financial Analyst",
  "HR Specialist",
  "Customer Service Representative",
  "Project Manager",
  // Education
  "Teacher",
  "College Professor",
  "Tutor",
  "School Administrator",
  "Teaching Assistant",
  "Childcare Worker",
  // Trades & Labor
  "Electrician",
  "Plumber",
  "Carpenter",
  "Construction Worker",
  "Mechanic",
  "Welder",
  "HVAC Technician",
  "Machine Operator",
  "Truck Driver",
  "Factory Worker",
  // Technology
  "Software Developer",
  "IT Specialist",
  "Network Engineer",
  "Data Analyst",
  "Cybersecurity Specialist",
  "Web Developer",
  "Systems Administrator",
  // Public Service
  "Police Officer",
  "Firefighter",
  "Military Service",
  "Government Worker",
  "Postal Worker",
  "Social Worker",
  // Hospitality & Service
  "Chef / Cook",
  "Waiter / Waitress",
  "Bartender",
  "Housekeeper",
  "Hotel Staff",
  "Security Guard",
  "Retail Sales Associate",
  "Cashier",
  // Creative & Media
  "Artist",
  "Writer",
  "Photographer",
  "Graphic Designer",
  "Video Editor",
  "Musician",
  "Actor",
  "Fashion Designer",
  // Science & Engineering
  "Engineer (Mechanical, Electrical, Civil, etc.)",
  "Scientist / Researcher",
  "Lab Technician",
  "Environmental Specialist",
  "Chemist",
  "Biologist",
  // Transportation
  "Driver (Taxi / Uber / Lyft)",
  "Bus Driver",
  "Pilot",
  "Train Operator",
  "Delivery Driver",
  // Agriculture
  "Farmer",
  "Rancher",
  "Fisherman",
  "Agricultural Worker",
  // Other / Miscellaneous
  "Student",
  "Homemaker",
  "Freelancer",
  "Unemployed",
  "Retired",
  "Self-Employed",
];

const predefinedOccupations = Array.from(
  new Set([...occupationBaseList, "Housewife", "Other"]),
).sort((a, b) => a.localeCompare(b));

const predefinedMaritalStatuses = [
  // Standard Options
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
  // Additional Common Options
  "In a relationship",
  "Domestic partnership",
  "Living with partner / Cohabiting",
  "Engaged",
  "Prefer not to say",
  // Advanced / Legal Options
  "Civil union",
  "Annulled",
  "Legally separated",
  "Registered partnership",
];

export default function PatientFamilyHistory({
  patient,
  onUpdate,
  anatomicalFiles = [],
  anatomicalFilesLoading = false,
  anatomicalFilesError = "",
  onDeleteAnatomicalFile,
}: PatientFamilyHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("family");
  const [newCondition, setNewCondition] = useState<Partial<FamilyCondition>>({
    relative: "",
    condition: "",
    severity: "mild",
  });
  const [showImmunizationForm, setShowImmunizationForm] = useState(false);
  const [editingImmunizationIndex, setEditingImmunizationIndex] = useState<number | null>(null);
  const [newImmunization, setNewImmunization] = useState<Partial<Immunization>>(
    {
      vaccine: "",
      date: "",
      provider: "",
      lot: "",
      site: "",
      notes: "",
    },
  );
  const [newAllergy, setNewAllergy] = useState("");
  const [allergyOptions, setAllergyOptions] = useState<string[]>(predefinedAllergies);
  const [isCustomAllergy, setIsCustomAllergy] = useState(false);
  const [openAllergyCombobox, setOpenAllergyCombobox] = useState(false);
  const [allergySearchQuery, setAllergySearchQuery] = useState("");
  const [newChronicCondition, setNewChronicCondition] = useState("");
  const [chronicConditionOptions, setChronicConditionOptions] = useState<string[]>(predefinedChronicConditions);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [openConditionCombobox, setOpenConditionCombobox] = useState(false);
  const [conditionSearchQuery, setConditionSearchQuery] = useState("");
  const [educationOptions, setEducationOptions] = useState<string[]>(predefinedEducationLevels);
  const [openEducationCombobox, setOpenEducationCombobox] = useState(false);
  const [educationSearchQuery, setEducationSearchQuery] = useState("");
  const [occupationOptions, setOccupationOptions] = useState<string[]>(predefinedOccupations);
  const [openOccupationCombobox, setOpenOccupationCombobox] = useState(false);
  const [occupationSearchQuery, setOccupationSearchQuery] = useState("");
  const [maritalStatusOptions, setMaritalStatusOptions] = useState<string[]>(predefinedMaritalStatuses);
  const [openMaritalStatusCombobox, setOpenMaritalStatusCombobox] = useState(false);
  const [maritalStatusSearchQuery, setMaritalStatusSearchQuery] = useState("");
  const [openFamilyMemberCombobox, setOpenFamilyMemberCombobox] = useState(false);
  const [familyMemberSearchQuery, setFamilyMemberSearchQuery] = useState("");
  const [openMedicalConditionCombobox, setOpenMedicalConditionCombobox] = useState(false);
  const [medicalConditionSearchQuery, setMedicalConditionSearchQuery] = useState("");
  const [editingCondition, setEditingCondition] =
    useState<FamilyCondition | null>(null);
  const [familyErrors, setFamilyErrors] = useState({
    relative: "",
    condition: "",
  });
  const [immunizationErrors, setImmunizationErrors] = useState({
    vaccine: "",
    date: "",
    provider: "",
  });
  const [selectedImmunization, setSelectedImmunization] = useState<Immunization | null>(null);
  const [isImmunizationDetailsOpen, setIsImmunizationDetailsOpen] = useState(false);
  const [allergyError, setAllergyError] = useState("");
  const [chronicConditionError, setChronicConditionError] = useState("");
  const [socialHistoryErrors, setSocialHistoryErrors] = useState({
    occupation: "",
    education: "",
  });
  const [showAllergyDeleteSuccessModal, setShowAllergyDeleteSuccessModal] = useState(false);
  const [showMedicalHistoryUpdateSuccessModal, setShowMedicalHistoryUpdateSuccessModal] = useState(false);
  const [showChronicConditionDeleteSuccessModal, setShowChronicConditionDeleteSuccessModal] = useState(false);
  const specialRequirementGroups = [
    {
      title: "Mobility & Physical Assistance",
      options: [
        { key: "mobility_wheelchair", label: "Wheelchair user" },
        { key: "mobility_walking_assistance", label: "Needs walking assistance" },
        { key: "mobility_bed_bound", label: "Bed-bound" },
        { key: "mobility_exam_table_help", label: "Requires help getting onto exam table" },
        { key: "mobility_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Sensory Support",
      options: [
        { key: "sensory_hearing_impairment", label: "Hearing impairment" },
        { key: "sensory_sign_language", label: "Requires sign language interpreter" },
        { key: "sensory_visual_impairment", label: "Visual impairment" },
        { key: "sensory_large_print", label: "Needs large-print materials" },
        { key: "sensory_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Communication Needs",
      options: [
        { key: "communication_language_barrier", label: "Language barrier (Specify)", hasInput: true },
        { key: "communication_interpreter", label: "Needs translator/interpreter" },
        { key: "communication_difficulty_instructions", label: "Difficulty understanding instructions" },
        { key: "communication_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Cognitive / Behavioral",
      options: [
        { key: "cognitive_dementia", label: "Dementia / memory issues" },
        { key: "cognitive_autism", label: "Autism spectrum" },
        { key: "cognitive_anxiety", label: "Anxiety / panic disorder" },
        { key: "cognitive_quiet_environment", label: "Needs calm or quiet environment" },
        { key: "cognitive_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Medical Conditions Requiring Attention",
      options: [
        { key: "medical_diabetes", label: "Diabetes" },
        { key: "medical_heart_condition", label: "Heart condition" },
        { key: "medical_epilepsy", label: "Epilepsy / seizures" },
        { key: "medical_oxygen", label: "Requires oxygen" },
        { key: "medical_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Allergies / Medical Alerts",
      options: [
        { key: "alerts_drug_allergy", label: "Drug allergy (Specify)", hasInput: true },
        { key: "alerts_latex_allergy", label: "Latex allergy" },
        { key: "alerts_skin_sensitivity", label: "Skin sensitivity" },
        { key: "alerts_cosmetic_allergy", label: "Cosmetic product allergy" },
        { key: "alerts_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Infection Control",
      options: [
        { key: "infection_condition", label: "Infectious condition (Specify)", hasInput: true },
        { key: "infection_isolation", label: "Requires isolation precautions" },
        { key: "infection_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Aesthetic / Cosmetic Considerations",
      options: [
        { key: "aesthetic_sensitive_skin", label: "Sensitive skin" },
        { key: "aesthetic_reactions_history", label: "History of cosmetic reactions (peels, lasers, etc.)" },
        { key: "aesthetic_undergoing_treatments", label: "Undergoing cosmetic treatments (e.g., Botox, fillers)" },
        { key: "aesthetic_scarring_concern", label: "Concern about scarring or pigmentation" },
        { key: "aesthetic_keloid_tendency", label: "Keloid tendency (raised scars)" },
        { key: "aesthetic_acne_prone", label: "Acne-prone skin" },
        { key: "aesthetic_hyperpigmentation", label: "Hyperpigmentation / melasma" },
        { key: "aesthetic_minimal_marks", label: "Preference for minimal marks or no visible scars" },
        { key: "aesthetic_skincare_medications", label: "Using skincare medications (retinoids, steroids, etc.)" },
        { key: "aesthetic_recent_treatment", label: "Recent facial/body treatment (peel, laser, waxing, etc.)" },
        { key: "aesthetic_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Personal / Cultural Preferences",
      options: [
        { key: "personal_prefers_male_doctor", label: "Prefers male doctor" },
        { key: "personal_prefers_female_doctor", label: "Prefers female doctor" },
        { key: "personal_modesty_privacy", label: "Modesty/privacy concerns" },
        { key: "personal_religious_cultural", label: "Religious/cultural considerations", hasInput: true },
        { key: "personal_other", label: "Other", hasInput: true },
      ],
    },
    {
      title: "Special Assistance",
      options: [
        { key: "assistance_caregiver", label: "Requires caregiver assistance" },
        { key: "assistance_priority", label: "Needs priority/urgent care" },
        { key: "assistance_other_special", label: "Other special assistance", hasInput: true },
        { key: "assistance_other", label: "Other", hasInput: true },
      ],
    },
  ] as const;

  const createDefaultSpecialRequirements = () => ({
    hasSpecialRequirements: "" as "" | "yes" | "no",
    selected: {} as Record<string, boolean>,
    details: {} as Record<string, string>,
    additionalNotes: "",
    aestheticNotes: {
      skinType: "",
      allergyTestDone: "" as "" | "yes" | "no",
      specialPrecautions: "",
    },
  });

  const parseSpecialRequirements = (raw: any) => {
    const defaults = createDefaultSpecialRequirements();
    if (!raw || typeof raw !== "object") return defaults;
    return {
      hasSpecialRequirements:
        raw.hasSpecialRequirements === "yes" || raw.hasSpecialRequirements === "no"
          ? raw.hasSpecialRequirements
          : defaults.hasSpecialRequirements,
      selected:
        raw.selected && typeof raw.selected === "object" ? raw.selected : defaults.selected,
      details:
        raw.details && typeof raw.details === "object" ? raw.details : defaults.details,
      additionalNotes:
        typeof raw.additionalNotes === "string" ? raw.additionalNotes : defaults.additionalNotes,
      aestheticNotes: {
        skinType:
          typeof raw.aestheticNotes?.skinType === "string"
            ? raw.aestheticNotes.skinType
            : "",
        allergyTestDone:
          raw.aestheticNotes?.allergyTestDone === "yes" ||
          raw.aestheticNotes?.allergyTestDone === "no"
            ? raw.aestheticNotes.allergyTestDone
            : "",
        specialPrecautions:
          typeof raw.aestheticNotes?.specialPrecautions === "string"
            ? raw.aestheticNotes.specialPrecautions
            : "",
      },
    };
  };

  const [specialRequirementsForm, setSpecialRequirementsForm] = useState(() =>
    parseSpecialRequirements((patient.medicalHistory as any)?.specialRequirements),
  );

  // Ensure Family History tab is selected when dialog opens
  useEffect(() => {
    if (isEditing) {
      setActiveTab("family");
      setSpecialRequirementsForm(
        parseSpecialRequirements((patient.medicalHistory as any)?.specialRequirements),
      );
    }
  }, [isEditing]);

  // Track if the mutation is for allergy deletion or chronic condition deletion
  const [isAllergyDeletion, setIsAllergyDeletion] = useState(false);
  const [isChronicConditionDeletion, setIsChronicConditionDeletion] = useState(false);

  const updateMedicalHistoryMutation = useMutation({
    mutationFn: async (medicalHistory: any) => {
      console.log(
        "MUTATION - Sending medical history:",
        JSON.stringify(medicalHistory, null, 2),
      );
      console.log(
        "MUTATION - Family history being sent:",
        medicalHistory.familyHistory,
      );
      const response = await apiRequest(
        "PATCH",
        `/api/patients/${patient.id}/medical-history`,
        medicalHistory,
      );
      return response.json();
    },
    onSuccess: (updatedPatient) => {
      // Update the local patient state with the response from the API
      onUpdate(updatedPatient);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}`],
      });
      
      // Show success modal for allergy deletion, chronic condition deletion, or general medical history updates
      if (isAllergyDeletion) {
        setShowAllergyDeleteSuccessModal(true);
        setIsAllergyDeletion(false); // Reset flag
      } else if (isChronicConditionDeletion) {
        setShowChronicConditionDeleteSuccessModal(true);
        setIsChronicConditionDeletion(false); // Reset flag
      } else {
        setShowMedicalHistoryUpdateSuccessModal(true);
      }
    },
    onError: () => {
      setIsAllergyDeletion(false); // Reset flag on error
      setIsChronicConditionDeletion(false); // Reset flag on error
      toast({
        title: "Error updating medical history",
        description: "Failed to save medical information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Make familyHistory reactive to patient data changes
  const familyHistory = normalizeFamilyHistory(patient.medicalHistory?.familyHistory);

  const relationshipLabels: Record<string, string> = {
    father: "Father",
    mother: "Mother",
    siblings: "Siblings",
    children: "Children",
    grandparents: "Grandparents",
    spouse: "Spouse / Partner",
  };

  const defaultSocialHistory: SocialHistory = {
    smoking: { status: "never" },
    alcohol: { status: "never" },
    drugs: { status: "never" },
    occupation: "",
    maritalStatus: "single",
    education: "",
    exercise: { frequency: "none" },
  };

  const [editedSocialHistory, setEditedSocialHistory] = useState<SocialHistory>(
    () => {
      const currentSocialHistory = patient.medicalHistory?.socialHistory;
      // Check if the social history has the correct structure
      if (
        currentSocialHistory &&
        typeof currentSocialHistory === "object" &&
        (currentSocialHistory as any).smoking &&
        typeof (currentSocialHistory as any).smoking === "object" &&
        "status" in (currentSocialHistory as any).smoking
      ) {
        return currentSocialHistory as unknown as SocialHistory;
      }
      return defaultSocialHistory;
    },
  );

  const saveSocialHistory = () => {
    setSocialHistoryErrors({ occupation: "", education: "" });

    const errors = {
      occupation: !editedSocialHistory.occupation.trim()
        ? "Please enter occupation"
        : "",
      education: !editedSocialHistory.education.trim()
        ? "Please enter education level"
        : "",
    };

    if (errors.occupation || errors.education) {
      setSocialHistoryErrors(errors);
      return;
    }

    try {
      updateMedicalHistoryMutation.mutate({
        allergies: patient.medicalHistory?.allergies || [],
        chronicConditions: patient.medicalHistory?.chronicConditions || [],
        medications: patient.medicalHistory?.medications || [],
        familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
        socialHistory: editedSocialHistory as any,
        immunizations: patient.medicalHistory?.immunizations || [],
      });
      setSocialHistoryErrors({ occupation: "", education: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save social history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveFamilyHistoryUpdate = (updatedHistory: Record<RelationshipCategory, string[]>) => {
    const normalized = normalizeFamilyHistory(updatedHistory);
    const newMedicalHistory = {
      ...patient.medicalHistory,
      familyHistory: normalized,
    };
    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalized,
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });
    onUpdate({
      ...patient,
      medicalHistory: newMedicalHistory,
    });
  };

  const [familyConditionDialogOpen, setFamilyConditionDialogOpen] = useState(false);
  const [familyConditionDialogMode, setFamilyConditionDialogMode] = useState<"view" | "edit">("view");
  const [familyConditionSelection, setFamilyConditionSelection] = useState<{
    relationship: RelationshipCategory;
    condition: string;
    index: number;
  } | null>(null);
  const [familyConditionDraft, setFamilyConditionDraft] = useState("");

  const openFamilyConditionDialog = (
    mode: "view" | "edit",
    relationship: RelationshipCategory,
    condition: string,
    index: number,
  ) => {
    setFamilyConditionDialogMode(mode);
    setFamilyConditionSelection({ relationship, condition, index });
    setFamilyConditionDraft(condition);
    setFamilyConditionDialogOpen(true);
  };

  const closeFamilyConditionDialog = () => {
    setFamilyConditionDialogOpen(false);
    setFamilyConditionSelection(null);
    setFamilyConditionDraft("");
  };

  const handleSaveFamilyConditionEdit = () => {
    if (!familyConditionSelection) return;
    const updatedHistory = normalizeFamilyHistory(patient.medicalHistory?.familyHistory);
    updatedHistory[familyConditionSelection.relationship][familyConditionSelection.index] = familyConditionDraft;
    saveFamilyHistoryUpdate(updatedHistory);
    closeFamilyConditionDialog();
  };

  const handleDeleteFamilyCondition = (relationship: RelationshipCategory, index: number) => {
    const updatedHistory = normalizeFamilyHistory(patient.medicalHistory?.familyHistory);
    updatedHistory[relationship] = updatedHistory[relationship].filter((_, i) => i !== index);
    saveFamilyHistoryUpdate(updatedHistory);
    toast({
      title: "Condition removed",
      description: "The family condition entry was deleted.",
    });
  };

  const addAllergy = () => {
    setAllergyError("");
    
    if (!newAllergy.trim()) {
      setAllergyError("Please enter an allergy");
      return;
    }

    const currentAllergies = patient.medicalHistory?.allergies || [];
    const allergyValue = newAllergy.trim();
    const updatedAllergies = [...currentAllergies, allergyValue];

    // If this is a custom allergy not in the predefined list, add it to options
    if (!allergyOptions.includes(allergyValue)) {
      setAllergyOptions([...allergyOptions, allergyValue]);
    }

    updateMedicalHistoryMutation.mutate({
      allergies: updatedAllergies,
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        allergies: updatedAllergies,
      },
    });
    setNewAllergy("");
    setIsCustomAllergy(false);
    setAllergyError("");
  };

  const removeAllergy = (index: number) => {
    // Get combined allergies just like in display logic
    const medicalAllergies = patient.medicalHistory?.allergies || [];
    const flagAllergies = patient.flags
      ? patient.flags
          .filter((flag) => typeof flag === "string" && flag.includes(":"))
          .map((flag) => flag.split(":")[2])
          .filter((allergy) => allergy && allergy.trim().length > 0)
      : [];

    const allAllergies = [...medicalAllergies, ...flagAllergies];
    const allergyToRemove = allAllergies[index];

    // Only remove from medicalHistory.allergies if it exists there
    const updatedAllergies = medicalAllergies.filter(
      (allergy) => allergy !== allergyToRemove,
    );

    // Set flag to show success modal instead of toast
    setIsAllergyDeletion(true);

    updateMedicalHistoryMutation.mutate({
      allergies: updatedAllergies,
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        allergies: updatedAllergies,
      },
    });
  };

  const addChronicCondition = () => {
    setChronicConditionError("");
    
    if (!newChronicCondition.trim()) {
      setChronicConditionError("Please enter a chronic condition");
      return;
    }

    const currentConditions = patient.medicalHistory?.chronicConditions || [];
    const conditionValue = newChronicCondition.trim();
    const updatedConditions = [...currentConditions, conditionValue];

    // If this is a custom condition not in the predefined list, add it to options
    if (!chronicConditionOptions.includes(conditionValue)) {
      setChronicConditionOptions([...chronicConditionOptions, conditionValue]);
    }

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: updatedConditions,
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        chronicConditions: updatedConditions,
      },
    });
    setNewChronicCondition("");
    setChronicConditionError("");
  };

  const removeChronicCondition = (index: number) => {
    const currentConditions = patient.medicalHistory?.chronicConditions || [];
    const updatedConditions = currentConditions.filter((_, i) => i !== index);

    // Set flag to show success modal instead of toast
    setIsChronicConditionDeletion(true);

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: updatedConditions,
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        chronicConditions: updatedConditions,
      },
    });
  };

  const immunizations = patient.medicalHistory?.immunizations || [];

  const showImmunizationDetails = (immunization: Immunization) => {
    setSelectedImmunization(immunization);
    setIsImmunizationDetailsOpen(true);
  };

  const closeImmunizationDetails = () => {
    setIsImmunizationDetailsOpen(false);
    setSelectedImmunization(null);
  };

  const handleSaveAllChanges = () => {
    // Save the complete medical history including all sections
    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
      specialRequirements: specialRequirementsForm,
      specialRequirementsNotes: specialRequirementsForm.additionalNotes || "",
    });
    setIsEditing(false);
  };

  const addFamilyCondition = () => {
    // Reset errors
    setFamilyErrors({ relative: "", condition: "" });

    // Validate fields
    const errors = {
      relative: !newCondition.relative ? "Please select a family member" : "",
      condition: !newCondition.condition
        ? "Please select a medical condition"
        : "",
    };

    if (errors.relative || errors.condition) {
      setFamilyErrors(errors);
      return;
    }

    // Build the condition string
    const conditionText = `${newCondition.condition}${newCondition.ageOfOnset ? ` (age ${newCondition.ageOfOnset})` : ""}${newCondition.notes ? ` - ${newCondition.notes}` : ""}`;

    // Get current family history and create a copy
    const currentHistory = normalizeFamilyHistory(patient.medicalHistory?.familyHistory);

    // Determine which relative category this belongs to
    let relativeCategory: RelationshipCategory = "father";
    const relativeText = newCondition.relative.toLowerCase().trim();

    if (relativeText.includes("guardian")) {
      relativeCategory = "guardian";
    } else if (
      relativeText.includes("step") &&
      (relativeText.includes("father") || relativeText.includes("mother"))
    ) {
      relativeCategory = "step_parents";
    } else if (
      relativeText.includes("step") &&
      (relativeText.includes("brother") || relativeText.includes("sister"))
    ) {
      relativeCategory = "step_siblings";
    } else if (
      relativeText.includes("grandson") ||
      relativeText.includes("granddaughter") ||
      relativeText.includes("grandchild")
    ) {
      relativeCategory = "grandchildren";
    } else if (
      relativeText.includes("uncle") ||
      relativeText.includes("aunt") ||
      relativeText.includes("nephew") ||
      relativeText.includes("niece") ||
      relativeText.includes("cousin")
    ) {
      relativeCategory = "extended";
    } else if (
      relativeText.includes("grandparent") ||
      relativeText.includes("grandmother") ||
      relativeText.includes("grandfather")
    ) {
      relativeCategory = "grandparents";
    } else if (relativeText === "mother") {
      relativeCategory = "mother";
    } else if (relativeText === "father") {
      relativeCategory = "father";
    } else if (
      relativeText.includes("son") ||
      relativeText.includes("daughter") ||
      relativeText.includes("child") ||
      relativeText.includes("children")
    ) {
      relativeCategory = "children";
    } else if (
      relativeText.includes("sibling") ||
      relativeText.includes("sister") ||
      relativeText.includes("brother")
    ) {
      relativeCategory = "siblings";
    } else if (
      relativeText.includes("spouse") ||
      relativeText.includes("husband") ||
      relativeText.includes("wife") ||
      relativeText.includes("partner")
    ) {
      relativeCategory = "spouse";
    } else {
      relativeCategory = "father"; // default to father
    }

    // Create the updated family history object
    const updatedFamilyHistory = {
      father: [...currentHistory.father],
      mother: [...currentHistory.mother],
      siblings: [...currentHistory.siblings],
      children: [...currentHistory.children],
      grandchildren: [...currentHistory.grandchildren],
      grandparents: [...currentHistory.grandparents],
      spouse: [...currentHistory.spouse],
      extended: [...currentHistory.extended],
      step_parents: [...currentHistory.step_parents],
      step_siblings: [...currentHistory.step_siblings],
      guardian: [...currentHistory.guardian],
    };

    // Add the new condition to the appropriate category
    updatedFamilyHistory[relativeCategory].push(conditionText);

    saveFamilyHistoryUpdate(updatedFamilyHistory);

    // Reset form only after successful local update
    setNewCondition({ relative: "", condition: "", severity: "mild" });
    setFamilyErrors({ relative: "", condition: "" });
  };

  const addImmunization = () => {
    // Reset errors
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });

    // Validate fields
    const errors = {
      vaccine: !newImmunization.vaccine ? "Please select a vaccine" : "",
      date: !newImmunization.date ? "Please select a date" : "",
      provider: !newImmunization.provider ? "Please enter a provider" : "",
    };

    if (errors.vaccine || errors.date || errors.provider) {
      setImmunizationErrors(errors);
      return;
    }

    const immunization: Immunization = {
      id: Date.now().toString(),
      vaccine: newImmunization.vaccine!,
      date: newImmunization.date!,
      provider: newImmunization.provider!,
      lot: newImmunization.lot,
      site: newImmunization.site,
      notes: newImmunization.notes,
    };

    const updatedImmunizations = [...immunizations, immunization];

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: updatedImmunizations,
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        immunizations: updatedImmunizations,
      },
    });

    setNewImmunization({
      vaccine: "",
      date: "",
      provider: "",
      lot: "",
      site: "",
      notes: "",
    });
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });
    setShowImmunizationForm(false);
  };

  const editImmunization = (index: number) => {
    const immunization = immunizations[index];
    setNewImmunization({
      vaccine: immunization.vaccine,
      date: immunization.date,
      provider: immunization.provider,
      lot: immunization.lot || "",
      site: immunization.site || "",
      notes: immunization.notes || "",
    });
    setEditingImmunizationIndex(index);
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });
  };

  const updateImmunization = () => {
    // Reset errors
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });

    // Validate fields
    const errors = {
      vaccine: !newImmunization.vaccine ? "Please select a vaccine" : "",
      date: !newImmunization.date ? "Please select a date" : "",
      provider: !newImmunization.provider ? "Please enter a provider" : "",
    };

    if (errors.vaccine || errors.date || errors.provider) {
      setImmunizationErrors(errors);
      return;
    }

    if (editingImmunizationIndex === null) return;

    const updatedImmunization: Immunization = {
      id: immunizations[editingImmunizationIndex].id,
      vaccine: newImmunization.vaccine!,
      date: newImmunization.date!,
      provider: newImmunization.provider!,
      lot: newImmunization.lot,
      site: newImmunization.site,
      notes: newImmunization.notes,
    };

    const updatedImmunizations = [...immunizations];
    updatedImmunizations[editingImmunizationIndex] = updatedImmunization;

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: normalizeFamilyHistory(patient.medicalHistory?.familyHistory),
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: updatedImmunizations,
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        immunizations: updatedImmunizations,
      },
    });

    setNewImmunization({
      vaccine: "",
      date: "",
      provider: "",
      lot: "",
      site: "",
      notes: "",
    });
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });
    setEditingImmunizationIndex(null);
  };

  const cancelEditImmunization = () => {
    setNewImmunization({
      vaccine: "",
      date: "",
      provider: "",
      lot: "",
      site: "",
      notes: "",
    });
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });
    setEditingImmunizationIndex(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "bg-yellow-100 text-yellow-800";
      case "moderate":
        return "bg-orange-100 text-orange-800";
      case "severe":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Complete Patient History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {patient.firstName} {patient.lastName} • Patient ID:{" "}
              {patient.patientId}
            </p>
          </div>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Add History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Complete Medical History</DialogTitle>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="family">Family History</TabsTrigger>
                  <TabsTrigger value="social">Social History</TabsTrigger>
                  <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
                  <TabsTrigger value="allergies">
                    Allergies & Conditions
                  </TabsTrigger>
                  <TabsTrigger value="special-requirements">
                    Special Requirements
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="family" className="space-y-6 overflow-y-auto flex-1">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">
                      Add Family Medical Condition
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Family Member</Label>
                        <Popover open={openFamilyMemberCombobox} onOpenChange={setOpenFamilyMemberCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openFamilyMemberCombobox}
                              className="w-full justify-between"
                            >
                              {newCondition.relative || "Select family member"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search family member..."
                                value={familyMemberSearchQuery}
                                onValueChange={setFamilyMemberSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-sm text-gray-500">
                                    No family member found. Type to add custom entry.
                                  </div>
                                  {familyMemberSearchQuery && (
                                    <Button
                                      variant="ghost"
                                      className="w-full"
                                      onClick={() => {
                                        setNewCondition({
                                          ...newCondition,
                                          relative: familyMemberSearchQuery,
                                        });
                                        setOpenFamilyMemberCombobox(false);
                                        setFamilyMemberSearchQuery("");
                                      }}
                                    >
                                      Add "{familyMemberSearchQuery}"
                                    </Button>
                                  )}
                                </CommandEmpty>
                                {Object.entries(familyMembers).map(([category, members]) => (
                                  <CommandGroup key={category} heading={category}>
                                    {members
                                      .filter((member) =>
                                        member.toLowerCase().includes(familyMemberSearchQuery.toLowerCase())
                                      )
                                      .map((member) => (
                                        <CommandItem
                                          key={member}
                                          value={member}
                                          onSelect={(currentValue) => {
                                            setNewCondition({
                                              ...newCondition,
                                              relative: currentValue,
                                            });
                                            setOpenFamilyMemberCombobox(false);
                                            setFamilyMemberSearchQuery("");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              newCondition.relative === member ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {member}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {familyErrors.relative && (
                          <p className="text-sm text-red-500 mt-1">
                            {familyErrors.relative}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Medical Condition</Label>
                        <Popover open={openMedicalConditionCombobox} onOpenChange={setOpenMedicalConditionCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openMedicalConditionCombobox}
                              className="w-full justify-between"
                            >
                              {newCondition.condition || "Select medical condition"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search medical condition..."
                                value={medicalConditionSearchQuery}
                                onValueChange={setMedicalConditionSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-sm text-gray-500">
                                    No condition found. Type to add custom entry.
                                  </div>
                                  {medicalConditionSearchQuery && (
                                    <Button
                                      variant="ghost"
                                      className="w-full"
                                      onClick={() => {
                                        setNewCondition({
                                          ...newCondition,
                                          condition: medicalConditionSearchQuery,
                                        });
                                        setOpenMedicalConditionCombobox(false);
                                        setMedicalConditionSearchQuery("");
                                      }}
                                    >
                                      Add "{medicalConditionSearchQuery}"
                                    </Button>
                                  )}
                                </CommandEmpty>
                                {Object.entries(medicalConditions).map(([category, conditions]) => (
                                  <CommandGroup key={category} heading={category}>
                                    {conditions
                                      .filter((condition) =>
                                        condition.toLowerCase().includes(medicalConditionSearchQuery.toLowerCase())
                                      )
                                      .map((condition) => (
                                        <CommandItem
                                          key={condition}
                                          value={condition}
                                          onSelect={(currentValue) => {
                                            setNewCondition({
                                              ...newCondition,
                                              condition: currentValue,
                                            });
                                            setOpenMedicalConditionCombobox(false);
                                            setMedicalConditionSearchQuery("");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              newCondition.condition === condition ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {condition}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {familyErrors.condition && (
                          <p className="text-sm text-red-500 mt-1">
                            {familyErrors.condition}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Age of Onset</Label>
                        <Input
                          placeholder="e.g., 45"
                          value={newCondition.ageOfOnset || ""}
                          onChange={(e) =>
                            setNewCondition({
                              ...newCondition,
                              ageOfOnset: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Select
                          value={newCondition.severity}
                          onValueChange={(value: any) =>
                            setNewCondition({
                              ...newCondition,
                              severity: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <Label>Additional Notes</Label>
                      <Input
                        placeholder="Additional details about the condition"
                        value={newCondition.notes || ""}
                        onChange={(e) =>
                          setNewCondition({
                            ...newCondition,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Button onClick={addFamilyCondition} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {relationshipOrder.map((relationship) => {
                      const conditions = familyHistory[relationship];
                      const relationshipLabel =
                        relationshipLabels[relationship] ||
                        relationship.charAt(0).toUpperCase() +
                          relationship.slice(1);
                      return (
                        <div
                          key={relationship}
                          className="border rounded-lg p-4"
                        >
                          <h5 className="font-medium mb-2 capitalize flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            {relationshipLabel}
                          </h5>
                          {conditions.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No conditions reported
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {conditions.map((condition, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-sm"
                                >
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Smoking Status</Label>
                        <Select
                          value={editedSocialHistory.smoking.status}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              smoking: {
                                ...editedSocialHistory.smoking,
                                status: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never smoked</SelectItem>
                            <SelectItem value="former">
                              Former smoker
                            </SelectItem>
                            <SelectItem value="current">
                              Current smoker
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Alcohol Consumption</Label>
                        <Select
                          value={editedSocialHistory.alcohol.status}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              alcohol: {
                                ...editedSocialHistory.alcohol,
                                status: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="occasional">
                              Occasional
                            </SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="heavy">Heavy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Exercise Frequency</Label>
                        <Select
                          value={editedSocialHistory.exercise.frequency}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              exercise: {
                                ...editedSocialHistory.exercise,
                                frequency: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No exercise</SelectItem>
                            <SelectItem value="occasional">
                              Occasional
                            </SelectItem>
                            <SelectItem value="regular">
                              Regular (2-3x/week)
                            </SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Occupation</Label>
                        <div className="space-y-2">
                          <Popover open={openOccupationCombobox} onOpenChange={setOpenOccupationCombobox}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openOccupationCombobox}
                                className="w-full justify-between"
                                data-testid="button-select-occupation"
                              >
                                {editedSocialHistory.occupation || "Select occupation..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Search occupations..." 
                                  value={occupationSearchQuery}
                                  onValueChange={setOccupationSearchQuery}
                                />
                                <CommandList className="max-h-[300px]">
                                  <CommandEmpty>
                                    <div className="p-2">
                                      <p className="text-sm text-muted-foreground mb-2">
                                        No occupation found.
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                          if (occupationSearchQuery.trim()) {
                                            setEditedSocialHistory({
                                              ...editedSocialHistory,
                                              occupation: occupationSearchQuery.trim(),
                                            });
                                            if (!occupationOptions.includes(occupationSearchQuery.trim())) {
                                              setOccupationOptions([...occupationOptions, occupationSearchQuery.trim()]);
                                            }
                                            setOpenOccupationCombobox(false);
                                            setOccupationSearchQuery("");
                                          }
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add "{occupationSearchQuery}"
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {occupationOptions.map((occupation) => (
                                      <CommandItem
                                        key={occupation}
                                        value={occupation}
                                        onSelect={(currentValue) => {
                                          setEditedSocialHistory({
                                            ...editedSocialHistory,
                                            occupation: currentValue,
                                          });
                                          setOpenOccupationCombobox(false);
                                          setOccupationSearchQuery("");
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            editedSocialHistory.occupation === occupation ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {occupation}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {socialHistoryErrors.occupation && (
                          <p className="text-sm text-red-500 mt-1">
                            {socialHistoryErrors.occupation}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Marital Status</Label>
                        <div className="space-y-2">
                          <Popover open={openMaritalStatusCombobox} onOpenChange={setOpenMaritalStatusCombobox}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openMaritalStatusCombobox}
                                className="w-full justify-between"
                                data-testid="button-select-marital-status"
                              >
                                {editedSocialHistory.maritalStatus || "Select marital status..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Search marital status..." 
                                  value={maritalStatusSearchQuery}
                                  onValueChange={setMaritalStatusSearchQuery}
                                />
                                <CommandList className="max-h-[300px]">
                                  <CommandEmpty>
                                    <div className="p-2">
                                      <p className="text-sm text-muted-foreground mb-2">
                                        No marital status found.
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                          if (maritalStatusSearchQuery.trim()) {
                                            setEditedSocialHistory({
                                              ...editedSocialHistory,
                                              maritalStatus: maritalStatusSearchQuery.trim(),
                                            });
                                            if (!maritalStatusOptions.includes(maritalStatusSearchQuery.trim())) {
                                              setMaritalStatusOptions([...maritalStatusOptions, maritalStatusSearchQuery.trim()]);
                                            }
                                            setOpenMaritalStatusCombobox(false);
                                            setMaritalStatusSearchQuery("");
                                          }
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add "{maritalStatusSearchQuery}"
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {maritalStatusOptions.map((status) => (
                                      <CommandItem
                                        key={status}
                                        value={status}
                                        onSelect={(currentValue) => {
                                          setEditedSocialHistory({
                                            ...editedSocialHistory,
                                            maritalStatus: currentValue,
                                          });
                                          setOpenMaritalStatusCombobox(false);
                                          setMaritalStatusSearchQuery("");
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            editedSocialHistory.maritalStatus === status ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {status}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div>
                        <Label>Education Level</Label>
                        <div className="space-y-2">
                          <Popover open={openEducationCombobox} onOpenChange={setOpenEducationCombobox}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openEducationCombobox}
                                className="w-full justify-between"
                                data-testid="button-select-education"
                              >
                                {editedSocialHistory.education || "Select education level..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Search education levels..." 
                                  value={educationSearchQuery}
                                  onValueChange={setEducationSearchQuery}
                                />
                                <CommandList className="max-h-[300px]">
                                  <CommandEmpty>
                                    <div className="p-2">
                                      <p className="text-sm text-muted-foreground mb-2">
                                        No education level found.
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                          if (educationSearchQuery.trim()) {
                                            setEditedSocialHistory({
                                              ...editedSocialHistory,
                                              education: educationSearchQuery.trim(),
                                            });
                                            if (!educationOptions.includes(educationSearchQuery.trim())) {
                                              setEducationOptions([...educationOptions, educationSearchQuery.trim()]);
                                            }
                                            setOpenEducationCombobox(false);
                                            setEducationSearchQuery("");
                                          }
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add "{educationSearchQuery}"
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {educationOptions.map((level) => (
                                      <CommandItem
                                        key={level}
                                        value={level}
                                        onSelect={(currentValue) => {
                                          setEditedSocialHistory({
                                            ...editedSocialHistory,
                                            education: currentValue,
                                          });
                                          setOpenEducationCombobox(false);
                                          setEducationSearchQuery("");
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            editedSocialHistory.education === level ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {level}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {socialHistoryErrors.education && (
                          <p className="text-sm text-red-500 mt-1">
                            {socialHistoryErrors.education}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button onClick={saveSocialHistory} className="px-6">
                      <Save className="h-4 w-4 mr-2" />
                      Save Social History
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="immunizations" className="space-y-4 overflow-y-auto flex-1">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Immunization Record</h4>
                    <div className="space-y-3">
                      {immunizations.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No immunization records
                        </p>
                      ) : (
                        immunizations.map((immunization, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div>
                              <div className="font-medium">
                                {immunization.vaccine}
                              </div>
                              <div className="text-sm text-gray-500">
                                {immunization.date} - {immunization.provider}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => editImmunization(index)}
                              data-testid={`button-edit-immunization-${index}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">
                          {editingImmunizationIndex !== null ? "Edit Immunization Record" : "New Immunization Record"}
                        </h5>
                        <div className="flex gap-2">
                          {editingImmunizationIndex !== null && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditImmunization}
                              data-testid="button-cancel-immunization"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={editingImmunizationIndex !== null ? updateImmunization : addImmunization}
                            data-testid={editingImmunizationIndex !== null ? "button-update-immunization" : "button-add-immunization"}
                          >
                            {editingImmunizationIndex !== null ? (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Update Immunization
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Immunization
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Vaccine</Label>
                            <Select
                              value={newImmunization.vaccine}
                              onValueChange={(value) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  vaccine: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select vaccine" />
                              </SelectTrigger>
                              <SelectContent>
                                {commonVaccines.map((vaccine) => (
                                  <SelectItem key={vaccine} value={vaccine}>
                                    {vaccine}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {immunizationErrors.vaccine && (
                              <p className="text-sm text-red-500 mt-1">
                                {immunizationErrors.vaccine}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Date Administered</Label>
                            <Input
                              type="date"
                              value={newImmunization.date}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  date: e.target.value,
                                })
                              }
                            />
                            {immunizationErrors.date && (
                              <p className="text-sm text-red-500 mt-1">
                                {immunizationErrors.date}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Healthcare Provider</Label>
                            <Input
                              placeholder="Provider name or clinic"
                              value={newImmunization.provider}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  provider: e.target.value,
                                })
                              }
                            />
                            {immunizationErrors.provider && (
                              <p className="text-sm text-red-500 mt-1">
                                {immunizationErrors.provider}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Lot Number (Optional)</Label>
                            <Input
                              placeholder="Vaccine lot number"
                              value={newImmunization.lot}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  lot: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Administration Site (Optional)</Label>
                            <Select
                              value={newImmunization.site}
                              onValueChange={(value) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  site: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select site" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left-arm">
                                  Left Arm
                                </SelectItem>
                                <SelectItem value="right-arm">
                                  Right Arm
                                </SelectItem>
                                <SelectItem value="left-thigh">
                                  Left Thigh
                                </SelectItem>
                                <SelectItem value="right-thigh">
                                  Right Thigh
                                </SelectItem>
                                <SelectItem value="oral">Oral</SelectItem>
                                <SelectItem value="nasal">Nasal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                              placeholder="Additional notes or reactions"
                              value={newImmunization.notes}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  notes: e.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                  </div>
                </TabsContent>

                <TabsContent value="allergies" className="space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Known Allergies
                      </h4>
                      <div>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Popover open={openAllergyCombobox} onOpenChange={setOpenAllergyCombobox}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openAllergyCombobox}
                                  className="flex-1 justify-between"
                                  data-testid="button-select-allergy"
                                >
                                  {newAllergy || "Search or select an allergy..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput 
                                    placeholder="Search allergies..." 
                                    value={allergySearchQuery}
                                    onValueChange={setAllergySearchQuery}
                                  />
                                  <CommandList className="max-h-[300px]">
                                    <CommandEmpty>
                                      <div className="p-2">
                                        <p className="text-sm text-muted-foreground mb-2">
                                          No allergy found.
                                        </p>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={() => {
                                            if (allergySearchQuery.trim()) {
                                              setNewAllergy(allergySearchQuery.trim());
                                              setOpenAllergyCombobox(false);
                                              setAllergySearchQuery("");
                                            }
                                          }}
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add "{allergySearchQuery}"
                                        </Button>
                                      </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {allergyOptions.map((allergy) => (
                                        <CommandItem
                                          key={allergy}
                                          value={allergy}
                                          onSelect={(currentValue) => {
                                            setNewAllergy(currentValue);
                                            setOpenAllergyCombobox(false);
                                            setAllergySearchQuery("");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              newAllergy === allergy ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {allergy}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button onClick={addAllergy} size="sm" data-testid="button-add-allergy">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {newAllergy && (
                            <Input
                              placeholder="Edit or modify allergy before adding"
                              value={newAllergy}
                              onChange={(e) => setNewAllergy(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && addAllergy()}
                              data-testid="input-edit-allergy"
                            />
                          )}
                        </div>
                        {allergyError && (
                          <p className="text-sm text-red-500 mt-1">
                            {allergyError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 mt-4 h-[250px] overflow-y-auto pr-1">
                        {(() => {
                          // Combine allergies from medicalHistory and extract from flags
                          const medicalAllergies =
                            patient.medicalHistory?.allergies || [];
                          const flagAllergies = patient.flags
                            ? patient.flags
                                .filter(
                                  (flag) =>
                                    typeof flag === "string" &&
                                    flag.includes(":"),
                                )
                                .map((flag) => flag.split(":")[2]) // Extract the allergy text after "general:medium:"
                                .filter(
                                  (allergy) =>
                                    allergy && allergy.trim().length > 0,
                                )
                            : [];

                          const allAllergies = [
                            ...medicalAllergies,
                            ...flagAllergies,
                          ];

                          return allAllergies.length > 0 ? (
                            allAllergies.map((allergy, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-red-50 rounded"
                              >
                                <span className="text-red-800">{allergy}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAllergy(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">
                              No known allergies
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        Chronic Conditions
                      </h4>
                      <div>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Popover open={openConditionCombobox} onOpenChange={setOpenConditionCombobox}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openConditionCombobox}
                                  className="flex-1 justify-between"
                                  data-testid="button-select-condition"
                                >
                                  {newChronicCondition || "Search or select a chronic condition..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput 
                                    placeholder="Search chronic conditions..." 
                                    value={conditionSearchQuery}
                                    onValueChange={setConditionSearchQuery}
                                  />
                                  <CommandList className="max-h-[300px]">
                                    <CommandEmpty>
                                      <div className="p-2">
                                        <p className="text-sm text-muted-foreground mb-2">
                                          No condition found.
                                        </p>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={() => {
                                            if (conditionSearchQuery.trim()) {
                                              setNewChronicCondition(conditionSearchQuery.trim());
                                              setOpenConditionCombobox(false);
                                              setConditionSearchQuery("");
                                            }
                                          }}
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add "{conditionSearchQuery}"
                                        </Button>
                                      </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {chronicConditionOptions.map((condition) => (
                                        <CommandItem
                                          key={condition}
                                          value={condition}
                                          onSelect={(currentValue) => {
                                            setNewChronicCondition(currentValue);
                                            setOpenConditionCombobox(false);
                                            setConditionSearchQuery("");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              newChronicCondition === condition ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {condition}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button onClick={addChronicCondition} size="sm" data-testid="button-add-condition">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {newChronicCondition && (
                            <Input
                              placeholder="Edit or modify condition before adding"
                              value={newChronicCondition}
                              onChange={(e) => setNewChronicCondition(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && addChronicCondition()}
                              data-testid="input-edit-condition"
                            />
                          )}
                        </div>
                        {chronicConditionError && (
                          <p className="text-sm text-red-500 mt-1">
                            {chronicConditionError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 mt-4 h-[250px] overflow-y-auto pr-1">
                        {patient.medicalHistory?.chronicConditions &&
                        patient.medicalHistory.chronicConditions.length > 0 ? (
                          patient.medicalHistory.chronicConditions.map(
                            (condition, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-blue-50 rounded"
                              >
                                <span className="text-blue-800">
                                  {condition}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeChronicCondition(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-sm text-gray-500">
                            No chronic conditions
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value="special-requirements"
                  className="space-y-4 overflow-y-auto flex-1"
                >
                  <div className="border rounded-lg p-4 space-y-5">
                    <h4 className="font-medium">Special Requirements</h4>

                    <div className="space-y-2">
                      <Label>1. Does the patient have any special requirements?</Label>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="hasSpecialRequirements"
                            checked={specialRequirementsForm.hasSpecialRequirements === "no"}
                            onChange={() =>
                              setSpecialRequirementsForm((prev: any) => ({
                                ...prev,
                                hasSpecialRequirements: "no",
                              }))
                            }
                          />
                          No
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="hasSpecialRequirements"
                            checked={specialRequirementsForm.hasSpecialRequirements === "yes"}
                            onChange={() =>
                              setSpecialRequirementsForm((prev: any) => ({
                                ...prev,
                                hasSpecialRequirements: "yes",
                              }))
                            }
                          />
                          Yes
                        </label>
                      </div>
                    </div>

                    {specialRequirementsForm.hasSpecialRequirements === "yes" && (
                      <>
                        <div className="space-y-4">
                          <Label>2. Type of Special Requirement (Check all that apply)</Label>
                          {specialRequirementGroups.map((group) => (
                            <div key={group.title} className="border rounded-md p-3 space-y-2">
                              <p className="text-sm font-semibold">{group.title}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {group.options.map((opt) => (
                                  <div key={opt.key} className="space-y-1">
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={!!specialRequirementsForm.selected?.[opt.key]}
                                        onChange={(e) =>
                                          setSpecialRequirementsForm((prev: any) => ({
                                            ...prev,
                                            selected: {
                                              ...(prev.selected || {}),
                                              [opt.key]: e.target.checked,
                                            },
                                          }))
                                        }
                                      />
                                      {opt.label}
                                    </label>
                                    {opt.hasInput && (
                                      <Input
                                        value={specialRequirementsForm.details?.[opt.key] || ""}
                                        onChange={(e) =>
                                          setSpecialRequirementsForm((prev: any) => ({
                                            ...prev,
                                            details: {
                                              ...(prev.details || {}),
                                              [opt.key]: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Specify..."
                                        className="h-8"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label>3. Additional Notes</Label>
                          <Textarea
                            value={specialRequirementsForm.additionalNotes || ""}
                            onChange={(e) =>
                              setSpecialRequirementsForm((prev: any) => ({
                                ...prev,
                                additionalNotes: e.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Add additional notes..."
                          />
                        </div>

                        <div className="space-y-3 border rounded-md p-3">
                          <Label>4. Aesthetic Treatment Notes (For Staff)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Skin type</Label>
                              <Input
                                value={specialRequirementsForm.aestheticNotes?.skinType || ""}
                                onChange={(e) =>
                                  setSpecialRequirementsForm((prev: any) => ({
                                    ...prev,
                                    aestheticNotes: {
                                      ...(prev.aestheticNotes || {}),
                                      skinType: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Skin type"
                              />
                            </div>
                            <div>
                              <Label>Allergy test done</Label>
                              <div className="flex items-center gap-6 mt-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name="allergyTestDone"
                                    checked={specialRequirementsForm.aestheticNotes?.allergyTestDone === "yes"}
                                    onChange={() =>
                                      setSpecialRequirementsForm((prev: any) => ({
                                        ...prev,
                                        aestheticNotes: {
                                          ...(prev.aestheticNotes || {}),
                                          allergyTestDone: "yes",
                                        },
                                      }))
                                    }
                                  />
                                  Yes
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name="allergyTestDone"
                                    checked={specialRequirementsForm.aestheticNotes?.allergyTestDone === "no"}
                                    onChange={() =>
                                      setSpecialRequirementsForm((prev: any) => ({
                                        ...prev,
                                        aestheticNotes: {
                                          ...(prev.aestheticNotes || {}),
                                          allergyTestDone: "no",
                                        },
                                      }))
                                    }
                                  />
                                  No
                                </label>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label>Special precautions</Label>
                            <Input
                              value={specialRequirementsForm.aestheticNotes?.specialPrecautions || ""}
                              onChange={(e) =>
                                setSpecialRequirementsForm((prev: any) => ({
                                  ...prev,
                                  aestheticNotes: {
                                    ...(prev.aestheticNotes || {}),
                                    specialPrecautions: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Special precautions"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAllChanges}
                  disabled={updateMedicalHistoryMutation.isPending}
                >
                  {updateMedicalHistoryMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="family" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="family">Family History</TabsTrigger>
            <TabsTrigger value="social">Social History</TabsTrigger>
            <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
            <TabsTrigger value="anatomical">Anatomical analysis uploads</TabsTrigger>
          </TabsList>

          <TabsContent value="family" className="space-y-4">
            {relationshipOrder.map((relationship) => {
              const conditions = familyHistory[relationship];
              const relationshipLabel =
                relationshipLabels[relationship] ||
                relationship.charAt(0).toUpperCase() + relationship.slice(1);
              return (
                <div key={relationship} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2 capitalize flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    {relationshipLabel}
                  </h4>
                  {conditions.length === 0 ? (
                    <p className="text-sm text-gray-500">No conditions reported</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {conditions.map((condition, index) => (
                        <div
                          key={`${relationship}-${index}`}
                          className="flex items-center gap-2 px-3 py-1 rounded-full border bg-white shadow-sm"
                        >
                          <span className="text-sm">{condition}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="View condition"
                              onClick={() =>
                                openFamilyConditionDialog(
                                  "view",
                                  relationship,
                                  condition,
                                  index,
                                )
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Edit condition"
                              onClick={() =>
                                openFamilyConditionDialog(
                                  "edit",
                                  relationship,
                                  condition,
                                  index,
                                )
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Delete condition"
                              onClick={() => handleDeleteFamilyCondition(relationship, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Smoking</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.smoking.status.replace("_", " ")}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Alcohol</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.alcohol.status}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Exercise</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.exercise.frequency.replace("_", " ")}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Occupation</div>
                  <div className="text-sm text-gray-600">
                    {editedSocialHistory.occupation || "Not specified"}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Marital Status</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.maritalStatus}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Education</div>
                  <div className="text-sm text-gray-600">
                    {editedSocialHistory.education || "Not specified"}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="immunizations" className="space-y-4">
            {immunizations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No immunization records</p>
              </div>
            ) : (
              <div className="space-y-2">
                {immunizations.map((immunization, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => showImmunizationDetails(immunization)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        showImmunizationDetails(immunization);
                      }
                    }}
                    className="border rounded-lg p-3 cursor-pointer transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--cura-bluewave))]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {immunization.vaccine}
                        </div>
                        <div className="text-sm text-gray-500">
                          {immunization.date} - {immunization.provider}
                        </div>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="anatomical" className="space-y-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Anatomical analysis uploads
            </div>
            {anatomicalFilesError && (
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Failed to load anatomical analysis files.
              </div>
            )}
            {anatomicalFilesLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Checking for uploads…</p>
            ) : anatomicalFiles.length > 0 ? (
              <div className="border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Preview</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Uploaded</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {anatomicalFiles.map((file) => (
                        <tr key={file.filename} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-3">
                            <div className="h-16 w-16 rounded overflow-hidden bg-black flex items-center justify-center">
                              {file.filename.toLowerCase().endsWith(".pdf") ? (
                                <div className="flex flex-col items-center gap-1 text-xs text-white">
                                  <FileText className="h-6 w-6" />
                                  <span className="text-[10px] uppercase tracking-wide">PDF</span>
                                </div>
                              ) : (
                                <img
                                  src={file.url}
                                  alt={file.filename}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              className="text-sm font-semibold text-[hsl(var(--cura-bluewave))] hover:underline cursor-pointer"
                              onClick={() => window.open(file.url, "_blank")}
                            >
                              {file.filename}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(file.uploadedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => window.open(file.url, "_blank")}
                                title="View full-size"
                              >
                                <Eye className="h-4 w-4 text-[hsl(var(--cura-bluewave))]" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                                onClick={async () => {
                                  if (!onDeleteAnatomicalFile) return;
                                  setDeletingFile(file.filename);
                                  try {
                                    const success = await onDeleteAnatomicalFile(file.filename);
                                    if (success) {
                                      toast({
                                        title: "File deleted",
                                        description: `${file.filename} removed`,
                                        variant: "success",
                                        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
                                      });
                                    } else {
                                      toast({
                                        title: "Delete failed",
                                        description: `Unable to delete ${file.filename}`,
                                        variant: "destructive",
                                      });
                                    }
                                  } finally {
                                    setDeletingFile(null);
                                  }
                                }}
                                disabled={deletingFile === file.filename}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No anatomical analysis exists for this patient.
              </p>
            )}
          </TabsContent>
        </Tabs>
        <Dialog
          open={familyConditionDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeFamilyConditionDialog();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {familyConditionDialogMode === "edit"
                  ? "Edit Family Condition"
                  : "Condition Details"}
              </DialogTitle>
            </DialogHeader>

            {familyConditionDialogMode === "edit" ? (
              <div className="space-y-3 mt-2">
                <Label>Condition</Label>
                <Textarea
                  value={familyConditionDraft}
                  onChange={(e) => setFamilyConditionDraft(e.target.value)}
                  className="h-32"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {familyConditionSelection?.condition}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-6">
              {familyConditionDialogMode === "edit" && (
                <Button onClick={handleSaveFamilyConditionEdit} className="bg-medical-blue">
                  Save
                </Button>
              )}
              <Button variant="outline" onClick={closeFamilyConditionDialog}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      <Dialog
        open={isImmunizationDetailsOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeImmunizationDetails();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedImmunization?.vaccine || "Immunization Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedImmunization ? (
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Date
                </p>
                <p className="font-semibold">{selectedImmunization.date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Provider
                </p>
                <p className="font-semibold">{selectedImmunization.provider}</p>
              </div>
              {selectedImmunization.lot && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Lot
                  </p>
                  <p className="font-semibold">{selectedImmunization.lot}</p>
                </div>
              )}
              {selectedImmunization.site && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Site
                  </p>
                  <p className="font-semibold">{selectedImmunization.site}</p>
                </div>
              )}
              {selectedImmunization.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">
                    {selectedImmunization.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Select an immunization to view its details.
            </p>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={closeImmunizationDetails}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allergy Deletion Success Modal */}
      <Dialog open={showAllergyDeleteSuccessModal} onOpenChange={setShowAllergyDeleteSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Allergy Deleted Successfully</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Allergies deleted successfully
            </h3>
            <Button
              onClick={() => {
                setShowAllergyDeleteSuccessModal(false);
              }}
              className="mt-6 w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Medical History Update Success Modal */}
      <Dialog open={showMedicalHistoryUpdateSuccessModal} onOpenChange={setShowMedicalHistoryUpdateSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Medical History Updated Successfully</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Medical history updated
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              Patient medical information has been saved successfully
            </p>
            <Button
              onClick={() => {
                setShowMedicalHistoryUpdateSuccessModal(false);
              }}
              className="mt-2 w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chronic Condition Deletion Success Modal */}
      <Dialog open={showChronicConditionDeleteSuccessModal} onOpenChange={setShowChronicConditionDeleteSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Chronic Condition Deleted Successfully</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Chronic Conditions deleted successfully
            </h3>
            <Button
              onClick={() => {
                setShowChronicConditionDeleteSuccessModal(false);
              }}
              className="mt-6 w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
