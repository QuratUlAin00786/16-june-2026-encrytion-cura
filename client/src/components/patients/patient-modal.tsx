import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, buildUrl, getTenantSubdomain } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Brain, Save, X } from "lucide-react";

// Comprehensive country codes with ISO codes for flag API
const COUNTRY_CODES = [
  { code: "+93", name: "Afghanistan", iso: "af" },
  { code: "+355", name: "Albania", iso: "al" },
  { code: "+213", name: "Algeria", iso: "dz" },
  { code: "+376", name: "Andorra", iso: "ad" },
  { code: "+244", name: "Angola", iso: "ao" },
  { code: "+54", name: "Argentina", iso: "ar" },
  { code: "+374", name: "Armenia", iso: "am" },
  { code: "+61", name: "Australia", iso: "au" },
  { code: "+43", name: "Austria", iso: "at" },
  { code: "+994", name: "Azerbaijan", iso: "az" },
  { code: "+1-242", name: "Bahamas", iso: "bs" },
  { code: "+973", name: "Bahrain", iso: "bh" },
  { code: "+880", name: "Bangladesh", iso: "bd" },
  { code: "+1-246", name: "Barbados", iso: "bb" },
  { code: "+375", name: "Belarus", iso: "by" },
  { code: "+32", name: "Belgium", iso: "be" },
  { code: "+501", name: "Belize", iso: "bz" },
  { code: "+229", name: "Benin", iso: "bj" },
  { code: "+975", name: "Bhutan", iso: "bt" },
  { code: "+591", name: "Bolivia", iso: "bo" },
  { code: "+387", name: "Bosnia and Herzegovina", iso: "ba" },
  { code: "+267", name: "Botswana", iso: "bw" },
  { code: "+55", name: "Brazil", iso: "br" },
  { code: "+673", name: "Brunei", iso: "bn" },
  { code: "+359", name: "Bulgaria", iso: "bg" },
  { code: "+226", name: "Burkina Faso", iso: "bf" },
  { code: "+257", name: "Burundi", iso: "bi" },
  { code: "+855", name: "Cambodia", iso: "kh" },
  { code: "+237", name: "Cameroon", iso: "cm" },
  { code: "+1", name: "Canada", iso: "ca" },
  { code: "+238", name: "Cape Verde", iso: "cv" },
  { code: "+236", name: "Central African Republic", iso: "cf" },
  { code: "+235", name: "Chad", iso: "td" },
  { code: "+56", name: "Chile", iso: "cl" },
  { code: "+86", name: "China", iso: "cn" },
  { code: "+57", name: "Colombia", iso: "co" },
  { code: "+269", name: "Comoros", iso: "km" },
  { code: "+242", name: "Congo (Brazzaville)", iso: "cg" },
  { code: "+243", name: "Congo (Kinshasa)", iso: "cd" },
  { code: "+506", name: "Costa Rica", iso: "cr" },
  { code: "+385", name: "Croatia", iso: "hr" },
  { code: "+53", name: "Cuba", iso: "cu" },
  { code: "+357", name: "Cyprus", iso: "cy" },
  { code: "+420", name: "Czech Republic", iso: "cz" },
  { code: "+45", name: "Denmark", iso: "dk" },
  { code: "+253", name: "Djibouti", iso: "dj" },
  { code: "+1-767", name: "Dominica", iso: "dm" },
  { code: "+1-809", name: "Dominican Republic", iso: "do" },
  { code: "+670", name: "East Timor", iso: "tl" },
  { code: "+593", name: "Ecuador", iso: "ec" },
  { code: "+20", name: "Egypt", iso: "eg" },
  { code: "+503", name: "El Salvador", iso: "sv" },
  { code: "+240", name: "Equatorial Guinea", iso: "gq" },
  { code: "+291", name: "Eritrea", iso: "er" },
  { code: "+372", name: "Estonia", iso: "ee" },
  { code: "+268", name: "Eswatini", iso: "sz" },
  { code: "+251", name: "Ethiopia", iso: "et" },
  { code: "+679", name: "Fiji", iso: "fj" },
  { code: "+358", name: "Finland", iso: "fi" },
  { code: "+33", name: "France", iso: "fr" },
  { code: "+241", name: "Gabon", iso: "ga" },
  { code: "+220", name: "Gambia", iso: "gm" },
  { code: "+995", name: "Georgia", iso: "ge" },
  { code: "+49", name: "Germany", iso: "de" },
  { code: "+233", name: "Ghana", iso: "gh" },
  { code: "+30", name: "Greece", iso: "gr" },
  { code: "+1-473", name: "Grenada", iso: "gd" },
  { code: "+502", name: "Guatemala", iso: "gt" },
  { code: "+224", name: "Guinea", iso: "gn" },
  { code: "+245", name: "Guinea-Bissau", iso: "gw" },
  { code: "+592", name: "Guyana", iso: "gy" },
  { code: "+509", name: "Haiti", iso: "ht" },
  { code: "+504", name: "Honduras", iso: "hn" },
  { code: "+36", name: "Hungary", iso: "hu" },
  { code: "+354", name: "Iceland", iso: "is" },
  { code: "+91", name: "India", iso: "in" },
  { code: "+62", name: "Indonesia", iso: "id" },
  { code: "+98", name: "Iran", iso: "ir" },
  { code: "+964", name: "Iraq", iso: "iq" },
  { code: "+353", name: "Ireland", iso: "ie" },
  { code: "+972", name: "Israel", iso: "il" },
  { code: "+39", name: "Italy", iso: "it" },
  { code: "+225", name: "Ivory Coast", iso: "ci" },
  { code: "+1-876", name: "Jamaica", iso: "jm" },
  { code: "+81", name: "Japan", iso: "jp" },
  { code: "+962", name: "Jordan", iso: "jo" },
  { code: "+7", name: "Kazakhstan", iso: "kz" },
  { code: "+254", name: "Kenya", iso: "ke" },
  { code: "+686", name: "Kiribati", iso: "ki" },
  { code: "+850", name: "Korea, North", iso: "kp" },
  { code: "+82", name: "Korea, South", iso: "kr" },
  { code: "+965", name: "Kuwait", iso: "kw" },
  { code: "+996", name: "Kyrgyzstan", iso: "kg" },
  { code: "+856", name: "Laos", iso: "la" },
  { code: "+371", name: "Latvia", iso: "lv" },
  { code: "+961", name: "Lebanon", iso: "lb" },
  { code: "+266", name: "Lesotho", iso: "ls" },
  { code: "+231", name: "Liberia", iso: "lr" },
  { code: "+218", name: "Libya", iso: "ly" },
  { code: "+423", name: "Liechtenstein", iso: "li" },
  { code: "+370", name: "Lithuania", iso: "lt" },
  { code: "+352", name: "Luxembourg", iso: "lu" },
  { code: "+261", name: "Madagascar", iso: "mg" },
  { code: "+265", name: "Malawi", iso: "mw" },
  { code: "+60", name: "Malaysia", iso: "my" },
  { code: "+960", name: "Maldives", iso: "mv" },
  { code: "+223", name: "Mali", iso: "ml" },
  { code: "+356", name: "Malta", iso: "mt" },
  { code: "+692", name: "Marshall Islands", iso: "mh" },
  { code: "+222", name: "Mauritania", iso: "mr" },
  { code: "+230", name: "Mauritius", iso: "mu" },
  { code: "+52", name: "Mexico", iso: "mx" },
  { code: "+691", name: "Micronesia", iso: "fm" },
  { code: "+373", name: "Moldova", iso: "md" },
  { code: "+377", name: "Monaco", iso: "mc" },
  { code: "+976", name: "Mongolia", iso: "mn" },
  { code: "+382", name: "Montenegro", iso: "me" },
  { code: "+212", name: "Morocco", iso: "ma" },
  { code: "+258", name: "Mozambique", iso: "mz" },
  { code: "+95", name: "Myanmar", iso: "mm" },
  { code: "+264", name: "Namibia", iso: "na" },
  { code: "+674", name: "Nauru", iso: "nr" },
  { code: "+977", name: "Nepal", iso: "np" },
  { code: "+31", name: "Netherlands", iso: "nl" },
  { code: "+64", name: "New Zealand", iso: "nz" },
  { code: "+505", name: "Nicaragua", iso: "ni" },
  { code: "+227", name: "Niger", iso: "ne" },
  { code: "+234", name: "Nigeria", iso: "ng" },
  { code: "+389", name: "North Macedonia", iso: "mk" },
  { code: "+47", name: "Norway", iso: "no" },
  { code: "+968", name: "Oman", iso: "om" },
  { code: "+92", name: "Pakistan", iso: "pk" },
  { code: "+680", name: "Palau", iso: "pw" },
  { code: "+507", name: "Panama", iso: "pa" },
  { code: "+675", name: "Papua New Guinea", iso: "pg" },
  { code: "+595", name: "Paraguay", iso: "py" },
  { code: "+51", name: "Peru", iso: "pe" },
  { code: "+63", name: "Philippines", iso: "ph" },
  { code: "+48", name: "Poland", iso: "pl" },
  { code: "+351", name: "Portugal", iso: "pt" },
  { code: "+974", name: "Qatar", iso: "qa" },
  { code: "+40", name: "Romania", iso: "ro" },
  { code: "+7", name: "Russia", iso: "ru" },
  { code: "+250", name: "Rwanda", iso: "rw" },
  { code: "+1-869", name: "Saint Kitts and Nevis", iso: "kn" },
  { code: "+1-758", name: "Saint Lucia", iso: "lc" },
  { code: "+1-784", name: "Saint Vincent & Grenadines", iso: "vc" },
  { code: "+685", name: "Samoa", iso: "ws" },
  { code: "+378", name: "San Marino", iso: "sm" },
  { code: "+239", name: "Sao Tome and Principe", iso: "st" },
  { code: "+966", name: "Saudi Arabia", iso: "sa" },
  { code: "+221", name: "Senegal", iso: "sn" },
  { code: "+381", name: "Serbia", iso: "rs" },
  { code: "+248", name: "Seychelles", iso: "sc" },
  { code: "+232", name: "Sierra Leone", iso: "sl" },
  { code: "+65", name: "Singapore", iso: "sg" },
  { code: "+421", name: "Slovakia", iso: "sk" },
  { code: "+386", name: "Slovenia", iso: "si" },
  { code: "+677", name: "Solomon Islands", iso: "sb" },
  { code: "+252", name: "Somalia", iso: "so" },
  { code: "+27", name: "South Africa", iso: "za" },
  { code: "+211", name: "South Sudan", iso: "ss" },
  { code: "+34", name: "Spain", iso: "es" },
  { code: "+94", name: "Sri Lanka", iso: "lk" },
  { code: "+249", name: "Sudan", iso: "sd" },
  { code: "+597", name: "Suriname", iso: "sr" },
  { code: "+46", name: "Sweden", iso: "se" },
  { code: "+41", name: "Switzerland", iso: "ch" },
  { code: "+963", name: "Syria", iso: "sy" },
  { code: "+886", name: "Taiwan", iso: "tw" },
  { code: "+992", name: "Tajikistan", iso: "tj" },
  { code: "+255", name: "Tanzania", iso: "tz" },
  { code: "+66", name: "Thailand", iso: "th" },
  { code: "+228", name: "Togo", iso: "tg" },
  { code: "+676", name: "Tonga", iso: "to" },
  { code: "+1-868", name: "Trinidad and Tobago", iso: "tt" },
  { code: "+216", name: "Tunisia", iso: "tn" },
  { code: "+90", name: "Turkey", iso: "tr" },
  { code: "+993", name: "Turkmenistan", iso: "tm" },
  { code: "+688", name: "Tuvalu", iso: "tv" },
  { code: "+256", name: "Uganda", iso: "ug" },
  { code: "+380", name: "Ukraine", iso: "ua" },
  { code: "+971", name: "United Arab Emirates", iso: "ae" },
  { code: "+44", name: "United Kingdom", iso: "gb" },
  { code: "+1", name: "United States", iso: "us" },
  { code: "+598", name: "Uruguay", iso: "uy" },
  { code: "+998", name: "Uzbekistan", iso: "uz" },
  { code: "+678", name: "Vanuatu", iso: "vu" },
  { code: "+379", name: "Vatican City", iso: "va" },
  { code: "+58", name: "Venezuela", iso: "ve" },
  { code: "+84", name: "Vietnam", iso: "vn" },
  { code: "+967", name: "Yemen", iso: "ye" },
  { code: "+260", name: "Zambia", iso: "zm" },
  { code: "+263", name: "Zimbabwe", iso: "zw" }
] as const;

// Digit limits for each country code (excluding country code itself)
const COUNTRY_DIGIT_LIMITS: Record<string, number> = {
  "+1": 10, "+44": 10, "+32": 9, "+971": 9, "+966": 9, "+93": 9, "+355": 9,
  "+213": 9, "+376": 9, "+244": 9, "+54": 10, "+374": 8, "+61": 9, "+43": 10,
  "+994": 9, "+1-242": 10, "+973": 8, "+880": 10, "+1-246": 10, "+375": 9,
  "+501": 7, "+229": 8, "+975": 8, "+591": 8, "+387": 8, "+267": 8, "+55": 11,
  "+673": 7, "+359": 9, "+226": 8, "+257": 8, "+855": 9, "+237": 9, "+238": 7,
  "+236": 8, "+235": 8, "+56": 9, "+86": 11, "+57": 10, "+269": 7, "+242": 9,
  "+243": 9, "+506": 8, "+385": 9, "+53": 8, "+357": 8, "+420": 9, "+45": 8,
  "+253": 8, "+1-767": 10, "+1-809": 10, "+670": 8, "+593": 9, "+20": 10,
  "+503": 8, "+240": 9, "+291": 7, "+372": 8, "+268": 8, "+251": 9, "+679": 7,
  "+358": 10, "+33": 9, "+241": 8, "+220": 7, "+995": 9, "+49": 11, "+233": 9,
  "+30": 10, "+1-473": 10, "+502": 8, "+224": 9, "+245": 9, "+592": 7, "+509": 8,
  "+504": 8, "+36": 9, "+354": 7, "+91": 10, "+62": 11, "+98": 10, "+964": 10,
  "+353": 9, "+972": 9, "+39": 10, "+225": 10, "+1-876": 10, "+81": 10, "+962": 9,
  "+7": 10, "+254": 10, "+686": 8, "+850": 10, "+82": 10, "+965": 8, "+996": 9,
  "+856": 10, "+371": 8, "+961": 8, "+266": 8, "+231": 9, "+218": 10, "+423": 7,
  "+370": 8, "+352": 9, "+261": 9, "+265": 9, "+60": 10, "+960": 7, "+223": 8,
  "+356": 8, "+692": 7, "+222": 8, "+230": 8, "+52": 10, "+691": 7, "+373": 8,
  "+377": 8, "+976": 8, "+382": 8, "+212": 9, "+258": 9, "+95": 9, "+264": 9,
  "+674": 7, "+977": 10, "+31": 9, "+64": 9, "+505": 8, "+227": 8, "+234": 10,
  "+389": 8, "+47": 8, "+968": 8, "+92": 10, "+680": 7, "+507": 8, "+675": 8,
  "+595": 9, "+51": 9, "+63": 10, "+48": 9, "+351": 9, "+974": 8, "+40": 10,
  "+250": 9, "+1-869": 10, "+1-758": 10, "+1-784": 10, "+685": 7, "+378": 10,
  "+239": 7, "+221": 9, "+381": 9, "+248": 7, "+232": 8, "+65": 8, "+421": 9,
  "+386": 8, "+677": 7, "+252": 9, "+27": 9, "+211": 9, "+34": 9, "+94": 9,
  "+249": 9, "+597": 7, "+46": 10, "+41": 9, "+963": 9, "+886": 9, "+992": 9,
  "+255": 9, "+66": 9, "+228": 8, "+676": 7, "+1-868": 10, "+216": 8, "+90": 10,
  "+993": 8, "+688": 6, "+256": 9, "+380": 9, "+598": 8, "+998": 9, "+678": 7,
  "+379": 10, "+58": 10, "+84": 10, "+967": 9, "+260": 9, "+263": 9
};

/**
 * Validates First Name or Last Name per rules:
 * 1. Only letters (A-Z, a-z), spaces, hyphens (-), apostrophes (')
 * 2. Between 2 and 50 characters
 * 3. No more than 2 identical characters in a row
 * 4. No numbers, symbols, or nonsense (e.g. "hhhhhh", "aaaaaa")
 */
function validatePatientName(name: string): { valid: true } | { valid: false; reason: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { valid: false, reason: "Invalid – must be at least 2 characters." };
  if (trimmed.length > 50) return { valid: false, reason: "Invalid – must be between 2 and 50 characters." };
  if (!/^[A-Za-z\s\-']+$/.test(trimmed)) return { valid: false, reason: "Invalid – must contain only letters, spaces, hyphens, or apostrophes." };
  if (/(.)\1{2,}/.test(trimmed)) return { valid: false, reason: "Invalid – contains excessive repeated characters." };
  return { valid: true };
}

const patientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").refine(
    (val) => validatePatientName(val).valid,
    (val) => {
      const r = validatePatientName(val);
      return { message: r.valid ? "" : r.reason };
    }
  ),
  lastName: z.string().trim().min(1, "Last name is required").refine(
    (val) => validatePatientName(val).valid,
    (val) => {
      const r = validatePatientName(val);
      return { message: r.valid ? "" : r.reason };
    }
  ),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required").refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" }
  ),
  genderAtBirth: z.string().trim().optional(),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().min(1, "Phone number is required").regex(
    /^[\+]?[0-9\s\-\(\)]{10,}$/,
    "Please enter a valid phone number"
  ),
  nhsNumber: z.string().trim().optional(),
  address: z.object({
    building: z.string().trim().optional(),
    street: z.string().trim().min(1, "Street address is required"),
    city: z.string().trim().min(1, "City is required"),
    postcode: z.string().trim().min(1, "Postcode is required"),
    country: z.string().trim().min(1, "Country is required")
  }),
  insuranceInfo: z.object({
    provider: z.string().trim().optional(),
    policyNumber: z.string().trim().optional(),
    groupNumber: z.string().trim().optional(),
    memberNumber: z.string().trim().optional(),
    planType: z.string().trim().optional(),
    effectiveDate: z.string().trim().optional(),
    expirationDate: z.string().trim().optional(),
    copay: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Cannot be negative").optional(),
    deductible: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Cannot be negative").optional(),
    isActive: z.boolean().optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string().trim()
      .min(3, "Contact name must be at least 3 characters")
      .max(25, "Contact name cannot exceed 25 characters")
      .regex(/^[a-zA-Z\s]+$/, "Contact name can only contain letters"),
    relationship: z.string().trim().min(1, "Relationship is required"),
    phone: z.string().trim().min(1, "Emergency contact phone is required").regex(
      /^[\+]?[0-9\s\-\(\)]{10,}$/,
      "Please enter a valid phone number"
    )
  }),
  medicalHistory: z.object({
    allergies: z.string().trim().optional(),
    chronicConditions: z.string().trim().optional(),
    medications: z.string().trim().optional()
  }).optional()
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode?: boolean;
  editPatient?: any;
}

export function PatientModal({ open, onOpenChange, editMode = false, editPatient }: PatientModalProps) {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [emailError, setEmailError] = useState<string>("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Country code state
  const [selectedCountryCode, setSelectedCountryCode] = useState("+44");
  const [emergencyCountryCode, setEmergencyCountryCode] = useState("+44");
  const [phoneCodePopoverOpen, setPhoneCodePopoverOpen] = useState(false);
  const [emergencyPhoneCodePopoverOpen, setEmergencyPhoneCodePopoverOpen] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Postcode lookup message state
  const [postcodeLookupMessage, setPostcodeLookupMessage] = useState("");
  const [lookupAddresses, setLookupAddresses] = useState<string[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [allowManualAddress, setAllowManualAddress] = useState(true);
  const [selectedLookupString, setSelectedLookupString] = useState<string | null>(null);
  const [selectedAddressDetails, setSelectedAddressDetails] = useState<{
    street: string;
    city: string;
    postcode: string;
    building: string;
    district?: string;
    county?: string;
    country?: string;
  } | null>(null);

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): string => {
    if (!dateOfBirth) return "";
    
    const birthDate = new Date(dateOfBirth);
    const currentDate = new Date();
    
    if (birthDate > currentDate) return "";
    
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: editMode && editPatient ? {
      firstName: editPatient.firstName || "",
      lastName: editPatient.lastName || "",
      dateOfBirth: editPatient.dateOfBirth || "",
      genderAtBirth: editPatient.genderAtBirth || "",
      email: editPatient.email || "",
      phone: editPatient.phone || "",
      nhsNumber: editPatient.nhsNumber || "",
      address: {
        street: editPatient.address?.street || "",
        city: editPatient.address?.city || "",
        postcode: editPatient.address?.postcode || "",
        country: editPatient.address?.country || (tenant?.region === "UK" ? "United Kingdom" : "")
      },
      insuranceInfo: {
        provider: editPatient.insuranceInfo?.provider || "",
        policyNumber: editPatient.insuranceInfo?.policyNumber || "",
        groupNumber: editPatient.insuranceInfo?.groupNumber || "",
        memberNumber: editPatient.insuranceInfo?.memberNumber || "",
        planType: editPatient.insuranceInfo?.planType || "",
        effectiveDate: editPatient.insuranceInfo?.effectiveDate || "",
        expirationDate: editPatient.insuranceInfo?.expirationDate || "",
        copay: editPatient.insuranceInfo?.copay || 0,
        deductible: editPatient.insuranceInfo?.deductible || 0,
        isActive: editPatient.insuranceInfo?.isActive ?? true
      },
      emergencyContact: {
        name: editPatient.emergencyContact?.name || "",
        relationship: editPatient.emergencyContact?.relationship || "",
        phone: editPatient.emergencyContact?.phone || ""
      },
      medicalHistory: {
        allergies: Array.isArray(editPatient.medicalHistory?.allergies) 
          ? editPatient.medicalHistory.allergies.join(", ") 
          : "",
        chronicConditions: Array.isArray(editPatient.medicalHistory?.chronicConditions) 
          ? editPatient.medicalHistory.chronicConditions.join(", ") 
          : "",
        medications: Array.isArray(editPatient.medicalHistory?.medications) 
          ? editPatient.medicalHistory.medications.join(", ") 
          : ""
      }
    } : {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      genderAtBirth: "",
      email: "",
      phone: "",
      nhsNumber: "",
      address: {
        street: "",
        city: "",
        postcode: "",
        country: tenant?.region === "UK" ? "United Kingdom" : ""
      },
      insuranceInfo: {
        provider: "",
        policyNumber: "",
        groupNumber: "",
        memberNumber: "",
        planType: "",
        effectiveDate: "",
        expirationDate: "",
        copay: 0,
        deductible: 0,
        isActive: true
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: ""
      },
      medicalHistory: {
        allergies: "",
        chronicConditions: "",
        medications: ""
      }
    }
  });
  const selectedCountry = form.watch("address.country");
  useEffect(() => {
    if (selectedCountry !== "United Kingdom") {
      setAllowManualAddress(true);
      setLookupAddresses([]);
      setSelectedLookupString(null);
      setPostcodeLookupMessage("");
    }
  }, [selectedCountry]);

  // Watch for changes in date of birth to calculate age
  const watchedDateOfBirth = form.watch("dateOfBirth");
  const calculatedAge = useMemo(() => calculateAge(watchedDateOfBirth), [watchedDateOfBirth]);

  // Watch for email changes and check availability
  const watchedEmail = form.watch("email");
  
  useEffect(() => {
    // Don't check in edit mode or if email is empty
    if (editMode || !watchedEmail || watchedEmail.trim() === "") {
      setEmailError("");
      return;
    }

    // Debounce email check
    const timeoutId = setTimeout(async () => {
      try {
        setIsCheckingEmail(true);
        setEmailError("");
        
        const response = await apiRequest("GET", `/api/patients/check-email?email=${encodeURIComponent(watchedEmail)}`);
        const data = await response.json();
        
        if (!data.emailAvailable) {
          if (data.associatedWithAnotherOrg) {
            setEmailError("This email is associated with another Cura's organization.");
          } else {
            setEmailError("This email is already in use.");
          }
        }
      } catch (error) {
        console.error("Error checking email:", error);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, editMode]);

  // Reset form when editPatient, editMode, or open state changes
  useEffect(() => {
    const formValues = editMode && editPatient ? {
      firstName: editPatient.firstName || "",
      lastName: editPatient.lastName || "",
      dateOfBirth: editPatient.dateOfBirth || "",
      genderAtBirth: editPatient.genderAtBirth || "",
      email: editPatient.email || "",
      phone: editPatient.phone || "",
      nhsNumber: editPatient.nhsNumber || "",
      address: {
        street: editPatient.address?.street || "",
        city: editPatient.address?.city || "",
        postcode: editPatient.address?.postcode || "",
        country: editPatient.address?.country || (tenant?.region === "UK" ? "United Kingdom" : "")
      },
      insuranceInfo: {
        provider: editPatient.insuranceInfo?.provider || "",
        policyNumber: editPatient.insuranceInfo?.policyNumber || "",
        groupNumber: editPatient.insuranceInfo?.groupNumber || "",
        memberNumber: editPatient.insuranceInfo?.memberNumber || "",
        planType: editPatient.insuranceInfo?.planType || "",
        effectiveDate: editPatient.insuranceInfo?.effectiveDate || "",
        expirationDate: editPatient.insuranceInfo?.expirationDate || "",
        copay: editPatient.insuranceInfo?.copay || 0,
        deductible: editPatient.insuranceInfo?.deductible || 0,
        isActive: editPatient.insuranceInfo?.isActive ?? true
      },
      emergencyContact: {
        name: editPatient.emergencyContact?.name || "",
        relationship: editPatient.emergencyContact?.relationship || "",
        phone: editPatient.emergencyContact?.phone || ""
      },
      medicalHistory: {
        allergies: Array.isArray(editPatient.medicalHistory?.allergies) 
          ? editPatient.medicalHistory.allergies.join(", ") 
          : "",
        chronicConditions: Array.isArray(editPatient.medicalHistory?.chronicConditions) 
          ? editPatient.medicalHistory.chronicConditions.join(", ") 
          : "",
        medications: Array.isArray(editPatient.medicalHistory?.medications) 
          ? editPatient.medicalHistory.medications.join(", ") 
          : ""
      }
    } : {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      genderAtBirth: "",
      email: "",
      phone: "",
      nhsNumber: "",
      address: {
        street: "",
        city: "",
        postcode: "",
        country: tenant?.region === "UK" ? "United Kingdom" : ""
      },
      insuranceInfo: {
        provider: "",
        policyNumber: "",
        groupNumber: "",
        memberNumber: "",
        planType: "",
        effectiveDate: "",
        expirationDate: "",
        copay: 0,
        deductible: 0,
        isActive: true
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: ""
      },
      medicalHistory: {
        allergies: "",
        chronicConditions: "",
        medications: ""
      }
    };

    form.reset(formValues);
    setEmailError(""); // Clear email error when form resets

    // Extract country codes from phone numbers after form reset
    if (editMode && editPatient) {
      const phoneValue = editPatient.phone || "";
      const emergencyPhoneValue = editPatient.emergencyContact?.phone || "";
      
      const matchedPhoneCode = COUNTRY_CODES.find(c => phoneValue.startsWith(c.code));
      if (matchedPhoneCode) {
        setSelectedCountryCode(matchedPhoneCode.code);
      } else {
        setSelectedCountryCode("+44"); // Default to UK
      }

      const matchedEmergencyCode = COUNTRY_CODES.find(c => emergencyPhoneValue.startsWith(c.code));
      if (matchedEmergencyCode) {
        setEmergencyCountryCode(matchedEmergencyCode.code);
      } else {
        setEmergencyCountryCode("+44"); // Default to UK
      }
    } else {
      // Reset to defaults for new patient
      setSelectedCountryCode("+44");
      setEmergencyCountryCode("+44");
    }
  }, [editPatient, editMode, open, tenant?.region, form]);

  // Watch for changes in postal code and country to auto-lookup
  const watchedPostcode = form.watch("address.postcode");
  const watchedCountry = form.watch("address.country");
  
  useEffect(() => {
    // Auto-lookup when postal code or country changes
    if (!watchedPostcode || watchedPostcode.trim().length < 3 || !watchedCountry) {
      return;
    }

    // Debounce the lookup
    const timeoutId = setTimeout(() => {
      handlePostcodeLookup(watchedPostcode);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedPostcode, watchedCountry]);

  const patientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const transformedData = {
        ...data,
        email: data.email || undefined,
        medicalHistory: {
          allergies: data.medicalHistory?.allergies ? data.medicalHistory.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
          chronicConditions: data.medicalHistory?.chronicConditions ? data.medicalHistory.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
          medications: data.medicalHistory?.medications ? data.medicalHistory.medications.split(',').map(s => s.trim()).filter(Boolean) : []
        }
      };

      if (editMode && editPatient) {
        return apiRequest('PATCH', `/api/patients/${editPatient.id}`, transformedData);
      } else {
        return apiRequest('POST', '/api/patients', transformedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSuccessMessage(editMode ? "The patient information has been updated." : "The patient has been added to your records.");
      setShowSuccessModal(true);
      onOpenChange(false);
      form.reset();
      setShowAiInsights(false);
    },
    onError: (error: any) => {
      toast({
        title: editMode ? "Error updating patient" : "Error creating patient",
        description: error.message || (editMode ? "Failed to update patient. Please try again." : "Failed to create patient. Please try again."),
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: PatientFormData) => {
    patientMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setShowAiInsights(false);
    setAddressSuggestions([]);
    setSelectedAddressDetails(null);
  };

  const applySelectedAddress = async (selection: string) => {
    const cleanedPostcode = selection.split(",").pop()?.trim() || form.getValues("address.postcode");
    setLookupLoading(true);
    try {
      const tenant = getTenantSubdomain();
      const response = await fetch(
        buildUrl(`/api/public/${encodeURIComponent(tenant)}/postcode-lookup?postcode=${encodeURIComponent(cleanedPostcode)}`),
        {
          method: "GET",
          headers: { "X-Tenant-Subdomain": tenant },
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Unable to fetch address details");
      }
      const data = await response.json();
      if (!data.result) throw new Error("Royal Mail returned no results");
      const result = data.result;
      const sanitizeText = (text?: string) => text?.trim() || "";
      const postalCodePattern = result.postcode
        ? new RegExp(result.postcode.replace(/\s+/g, ""), "gi")
        : null;

      const streetParts = [
        sanitizeText(result.line_1),
        sanitizeText(result.line_2),
        sanitizeText(result.thoroughfare),
        sanitizeText(result.dependent_locality),
        sanitizeText(result.parish),
      ]
        .filter(Boolean)
        .map((part) => part.trim());

      let streetAddress = streetParts.length ? streetParts.join(", ") : selection;
      if (postalCodePattern && postalCodePattern.test(streetAddress.replace(/\s+/g, ""))) {
        streetAddress = streetAddress.replace(postalCodePattern, "").trim();
      }
      if (!streetAddress) {
        streetAddress = selection.replace(result.postcode || "", "").replace(/,+$/, "").trim();
      }

      form.setValue("address.street", streetAddress);
      form.setValue("address.city", result.post_town || result.admin_district || result.region || "");
      form.setValue("address.postcode", result.postcode || cleanedPostcode);
      form.setValue("address.country", "United Kingdom");
      form.setValue(
        "address.building",
        result.premise || result.building_name || result.admin_ward || result.line_1 || form.getValues("address.building")
      );
      setSelectedLookupString(selection);
      setLookupAddresses([]);
      const adminWard = result.admin_ward || result.admin_district || result.region;
      const buildingName = result.premise || result.building_name || adminWard || result.line_1 || "";
      setSelectedAddressDetails({
        street: streetAddress,
        city: result.post_town || result.admin_district || result.region || "",
        postcode: result.postcode || cleanedPostcode,
        building: buildingName,
        district: result.admin_district || result.admin_ward || result.region,
        county: result.admin_county || result.region,
        country: result.country || "United Kingdom",
      });
      setPostcodeLookupMessage("Royal Mail address populated.");
      setAllowManualAddress(false);
    } catch (error) {
      console.error("Royal Mail detail error:", error);
      setPostcodeLookupMessage("Could not retrieve the full address. You can enter it manually.");
      setAllowManualAddress(true);
      setSelectedAddressDetails(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePostcodeLookup = async (postcode: string) => {
    if (!postcode || postcode.trim().length < 3) {
      setPostcodeLookupMessage("Enter a valid postcode before lookup.");
      setAllowManualAddress(true);
      return;
    }

    const selectedCountry = form.getValues('address.country');
    if (selectedCountry !== "United Kingdom") {
      setPostcodeLookupMessage("Royal Mail lookup is only available for United Kingdom addresses.");
      setAllowManualAddress(true);
      return;
    }

    setLookupLoading(true);
    setPostcodeLookupMessage("Looking up addresses via Royal Mail...");
      setLookupAddresses([]);
      setSelectedLookupString(null);
      setSelectedAddressDetails(null);

    try {
      const cleanedPostcode = postcode.trim().replace(/\s+/g, "");
      const tenant = getTenantSubdomain();
      const response = await fetch(
        buildUrl(`/api/public/${encodeURIComponent(tenant)}/postcode-autocomplete?postcode=${encodeURIComponent(cleanedPostcode)}`),
        {
          method: "GET",
          headers: { "X-Tenant-Subdomain": tenant },
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("No addresses found");
      }

      const data = await response.json();
      const results: string[] = Array.isArray(data.result) ? data.result : [];
      if (results.length === 0) {
        throw new Error("No addresses returned");
      }

      setLookupAddresses(results);
      setPostcodeLookupMessage(`${results.length} addresses returned. Select the precise Royal Mail address.`);
      setAllowManualAddress(false);
      if (results.length === 1) {
        await applySelectedAddress(results[0]);
      }
    } catch (error) {
      console.error("Lookup error:", error);
      setPostcodeLookupMessage(
        "Unable to fetch addresses. You can enter the address manually or try again."
      );
      setAllowManualAddress(true);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editMode ? `Edit ${editPatient?.firstName} ${editPatient?.lastName}` : "Add New Patient"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required">First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter first name" maxLength={50} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required">Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter last name" maxLength={50} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required">Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} max={new Date().toISOString().split('T')[0]} data-testid="input-date-of-birth" />
                          </FormControl>
                          <FormMessage />
                          {calculatedAge && (
                            <p className="text-sm text-gray-600 mt-1">
                              Age: {calculatedAge} years old
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="genderAtBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender at Birth</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="patient@email.com" />
                          </FormControl>
                          <FormMessage />
                          {emailError && (
                            <p className="text-sm text-red-600 mt-1">{emailError}</p>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Popover open={phoneCodePopoverOpen} onOpenChange={setPhoneCodePopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={phoneCodePopoverOpen}
                                    className="w-[180px] justify-between"
                                    data-testid="button-phone-country-code"
                                  >
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={`https://flagcdn.com/16x12/${COUNTRY_CODES.find(c => c.code === selectedCountryCode)?.iso}.png`}
                                        alt={COUNTRY_CODES.find(c => c.code === selectedCountryCode)?.name}
                                        className="w-4 h-3"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <span>{selectedCountryCode}</span>
                                    </div>
                                    <span className="ml-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search country..." />
                                    <CommandList>
                                      <CommandEmpty>No country found.</CommandEmpty>
                                      <CommandGroup>
                                        {COUNTRY_CODES.map((country, index) => (
                                          <CommandItem
                                            key={`${country.code}-${country.iso}-${index}`}
                                            value={`${country.name} ${country.code}`}
                                            onSelect={() => {
                                              let localNumber = field.value;
                                              if (localNumber.startsWith(selectedCountryCode)) {
                                                localNumber = localNumber.slice(selectedCountryCode.length).trim();
                                              }
                                              setSelectedCountryCode(country.code);
                                              field.onChange(localNumber ? `${country.code} ${localNumber}` : '');
                                              setPhoneCodePopoverOpen(false);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <img 
                                                src={`https://flagcdn.com/16x12/${country.iso}.png`}
                                                alt={country.name}
                                                className="w-4 h-3"
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none';
                                                }}
                                              />
                                              <span className="flex-1">{country.name}</span>
                                              <span className="text-muted-foreground">{country.code}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Input 
                                {...field} 
                                placeholder="123 456 7890"
                                type="tel"
                                className="flex-1"
                                maxLength={COUNTRY_DIGIT_LIMITS[selectedCountryCode] || 15}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/[^\d]/g, '');
                                  const maxDigits = COUNTRY_DIGIT_LIMITS[selectedCountryCode] || 15;
                                  
                                  // Limit to max digits for selected country
                                  if (value.length > maxDigits) {
                                    value = value.slice(0, maxDigits);
                                  }
                                  
                                  // If the phone number is empty, set the field to empty string
                                  if (value === '') {
                                    field.onChange('');
                                  } else {
                                    field.onChange(`${selectedCountryCode} ${value}`);
                                  }
                                }}
                                value={
                                  field.value.startsWith(selectedCountryCode)
                                    ? field.value.slice(selectedCountryCode.length).trim()
                                    : field.value
                                }
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 mt-1">
                            Must be exactly {COUNTRY_DIGIT_LIMITS[selectedCountryCode]} digits (excluding country code)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                  </div>
                </CardContent>
              </Card>


              {/* Address Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address.country"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-country">
                                <SelectValue placeholder="Select country first for auto-lookup" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                              <SelectItem value="United States">🇺🇸 United States</SelectItem>
                              <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                              <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                              <SelectItem value="Ireland">🇮🇪 Ireland</SelectItem>
                              <SelectItem value="France">🇫🇷 France</SelectItem>
                              <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                              <SelectItem value="Spain">🇪🇸 Spain</SelectItem>
                              <SelectItem value="Italy">🇮🇹 Italy</SelectItem>
                              <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                              <SelectItem value="Belgium">🇧🇪 Belgium</SelectItem>
                              <SelectItem value="Switzerland">🇨🇭 Switzerland</SelectItem>
                              <SelectItem value="Austria">🇦🇹 Austria</SelectItem>
                              <SelectItem value="Portugal">🇵🇹 Portugal</SelectItem>
                              <SelectItem value="Poland">🇵🇱 Poland</SelectItem>
                              <SelectItem value="Sweden">🇸🇪 Sweden</SelectItem>
                              <SelectItem value="Norway">🇳🇴 Norway</SelectItem>
                              <SelectItem value="Denmark">🇩🇰 Denmark</SelectItem>
                              <SelectItem value="Finland">🇫🇮 Finland</SelectItem>
                              <SelectItem value="Greece">🇬🇷 Greece</SelectItem>
                              <SelectItem value="Czech Republic">🇨🇿 Czech Republic</SelectItem>
                              <SelectItem value="Hungary">🇭🇺 Hungary</SelectItem>
                              <SelectItem value="Romania">🇷🇴 Romania</SelectItem>
                              <SelectItem value="Bulgaria">🇧🇬 Bulgaria</SelectItem>
                              <SelectItem value="Croatia">🇭🇷 Croatia</SelectItem>
                              <SelectItem value="Slovakia">🇸🇰 Slovakia</SelectItem>
                              <SelectItem value="Slovenia">🇸🇮 Slovenia</SelectItem>
                              <SelectItem value="Lithuania">🇱🇹 Lithuania</SelectItem>
                              <SelectItem value="Latvia">🇱🇻 Latvia</SelectItem>
                              <SelectItem value="Estonia">🇪🇪 Estonia</SelectItem>
                              <SelectItem value="India">🇮🇳 India</SelectItem>
                              <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                              <SelectItem value="South Korea">🇰🇷 South Korea</SelectItem>
                              <SelectItem value="Mexico">🇲🇽 Mexico</SelectItem>
                              <SelectItem value="Brazil">🇧🇷 Brazil</SelectItem>
                              <SelectItem value="Argentina">🇦🇷 Argentina</SelectItem>
                              <SelectItem value="Turkey">🇹🇷 Turkey</SelectItem>
                              <SelectItem value="South Africa">🇿🇦 South Africa</SelectItem>
                              <SelectItem value="New Zealand">🇳🇿 New Zealand</SelectItem>
                              <SelectItem value="Other">🌍 Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Select country first to enable postal code auto-lookup
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.postcode"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Postal Code / ZIP Code (Auto-lookup)</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                {...field} 
                                placeholder="Enter postal code"
                                data-testid="input-postcode"
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => handlePostcodeLookup(field.value)}
                                disabled={!field.value || field.value.length < 3 || lookupLoading}
                                data-testid="button-lookup-postcode"
                              >
                                {lookupLoading ? "Looking up..." : "Lookup"}
                              </Button>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            When collecting UK addresses, use Royal Mail lookup. Provide postcode (and optional building) to fetch formatted addresses.
                          </p>
                          {lookupAddresses.length > 0 && (
                            <div className="space-y-2 mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 border border-dashed border-slate-200 max-h-48 overflow-y-auto">
                              <p className="text-xs font-semibold text-slate-500">Select the matching Royal Mail address:</p>
                              {lookupAddresses.map((addr) => (
                                <button
                                  key={addr}
                                  type="button"
                                  className="w-full rounded-md border border-transparent bg-white px-3 py-2 text-left text-sm hover:bg-blue-50"
                                  onClick={() => applySelectedAddress(addr)}
                                >
                                  {addr}
                                </button>
                              ))}
                            </div>
                          )}
                          {postcodeLookupMessage && !selectedAddressDetails && (
                            <p className={`text-xs mt-2 ${allowManualAddress ? "text-amber-600" : "text-green-600"}`}>
                              {postcodeLookupMessage}
                            </p>
                          )}
                          {!allowManualAddress && selectedLookupString && selectedAddressDetails && (
                            <div className="mt-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 space-y-1">
                              <p className="font-semibold text-emerald-800">Royal Mail address</p>
                              {selectedAddressDetails.street && selectedAddressDetails.street.trim() !== "" && (() => {
                                const normalizedStreet = selectedAddressDetails.street.replace(/\s+/g, "").toLowerCase();
                                const normalizedPostcode = (selectedAddressDetails.postcode || "").replace(/\s+/g, "").toLowerCase();
                                if (normalizedStreet && normalizedStreet !== normalizedPostcode) {
                                  return <p>{selectedAddressDetails.street}</p>;
                                }
                                return null;
                              })()}
                              <p>
                                {selectedAddressDetails.city} • {selectedAddressDetails.postcode}
                              </p>
                              {selectedAddressDetails.county && (
                                <p className="text-xs text-emerald-700">
                                  County: {selectedAddressDetails.county}
                                </p>
                              )}
                              {selectedAddressDetails.country && (
                                <p className="text-xs text-emerald-700">
                                  Country: {selectedAddressDetails.country}
                                </p>
                              )}
                              {selectedAddressDetails.building && (
                                <p className="text-xs text-emerald-700">
                                  Building: {selectedAddressDetails.building}
                                </p>
                              )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address.building"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Building Number / Name (optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Optional building number or name"
                              disabled={!allowManualAddress}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter street address" 
                              data-testid="input-street" 
                            />
                          </FormControl>
                          {postcodeLookupMessage && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              {postcodeLookupMessage}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City/Town</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Auto-filled or enter manually" 
                              data-testid="input-city" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Health Insurance Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Health Insurance Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insuranceInfo.provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select insurance provider..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NHS (National Health Service)" className="bg-cyan-300 hover:bg-cyan-400 dark:bg-cyan-500 dark:hover:bg-cyan-600">
                                NHS (National Health Service)
                              </SelectItem>
                              <SelectItem value="Bupa">Bupa</SelectItem>
                              <SelectItem value="AXA PPP Healthcare">AXA PPP Healthcare</SelectItem>
                              <SelectItem value="Vitality Health">Vitality Health</SelectItem>
                              <SelectItem value="Aviva Health">Aviva Health</SelectItem>
                              <SelectItem value="Simply Health">Simply Health</SelectItem>
                              <SelectItem value="WPA">WPA</SelectItem>
                              <SelectItem value="Benenden Health">Benenden Health</SelectItem>
                              <SelectItem value="Healix Health Services">Healix Health Services</SelectItem>
                              <SelectItem value="Sovereign Health Care">Sovereign Health Care</SelectItem>
                              <SelectItem value="Exeter Friendly Society">Exeter Friendly Society</SelectItem>
                              <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.planType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Comprehensive" className="bg-cyan-300 hover:bg-cyan-400 dark:bg-cyan-500 dark:hover:bg-cyan-600">
                                Comprehensive
                              </SelectItem>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="Basic">Basic</SelectItem>
                              <SelectItem value="Dental Only">Dental Only</SelectItem>
                              <SelectItem value="Optical Only">Optical Only</SelectItem>
                              <SelectItem value="Mental Health">Mental Health</SelectItem>
                              <SelectItem value="Maternity">Maternity</SelectItem>
                              <SelectItem value="Specialist">Specialist</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter policy number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.memberNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter member number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nhsNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NHS Number</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="tel"
                              maxLength={10}
                              placeholder="9434765919"
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d]/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">Must be exactly 10 digits. Example: 9434765919</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContact.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter emergency contact name" maxLength={25} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact.relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="parent">Parent</SelectItem>
                                <SelectItem value="child">Child</SelectItem>
                                <SelectItem value="sibling">Sibling</SelectItem>
                                <SelectItem value="friend">Friend</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact.phone"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Popover open={emergencyPhoneCodePopoverOpen} onOpenChange={setEmergencyPhoneCodePopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={emergencyPhoneCodePopoverOpen}
                                    className="w-[180px] justify-between"
                                    data-testid="button-emergency-phone-country-code"
                                  >
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={`https://flagcdn.com/16x12/${COUNTRY_CODES.find(c => c.code === emergencyCountryCode)?.iso}.png`}
                                        alt={COUNTRY_CODES.find(c => c.code === emergencyCountryCode)?.name}
                                        className="w-4 h-3"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <span>{emergencyCountryCode}</span>
                                    </div>
                                    <span className="ml-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search country..." />
                                    <CommandList>
                                      <CommandEmpty>No country found.</CommandEmpty>
                                      <CommandGroup>
                                        {COUNTRY_CODES.map((country, index) => (
                                          <CommandItem
                                            key={`emerg-${country.code}-${country.iso}-${index}`}
                                            value={`${country.name} ${country.code}`}
                                            onSelect={() => {
                                              let localNumber = field.value;
                                              if (localNumber.startsWith(emergencyCountryCode)) {
                                                localNumber = localNumber.slice(emergencyCountryCode.length).trim();
                                              }
                                              setEmergencyCountryCode(country.code);
                                              field.onChange(localNumber ? `${country.code} ${localNumber}` : '');
                                              setEmergencyPhoneCodePopoverOpen(false);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <img 
                                                src={`https://flagcdn.com/16x12/${country.iso}.png`}
                                                alt={country.name}
                                                className="w-4 h-3"
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none';
                                                }}
                                              />
                                              <span className="flex-1">{country.name}</span>
                                              <span className="text-muted-foreground">{country.code}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Input 
                                {...field} 
                                placeholder="123 456 7890"
                                type="tel"
                                className="flex-1"
                                maxLength={COUNTRY_DIGIT_LIMITS[emergencyCountryCode] || 15}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/[^\d]/g, '');
                                  const maxDigits = COUNTRY_DIGIT_LIMITS[emergencyCountryCode] || 15;
                                  
                                  // Limit to max digits for selected country
                                  if (value.length > maxDigits) {
                                    value = value.slice(0, maxDigits);
                                  }
                                  
                                  // If the phone number is empty, set the field to empty string
                                  if (value === '') {
                                    field.onChange('');
                                  } else {
                                    field.onChange(`${emergencyCountryCode} ${value}`);
                                  }
                                }}
                                value={
                                  field.value.startsWith(emergencyCountryCode)
                                    ? field.value.slice(emergencyCountryCode.length).trim()
                                    : field.value
                                }
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 mt-1">
                            Must be exactly {COUNTRY_DIGIT_LIMITS[emergencyCountryCode]} digits (excluding country code)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={patientMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={patientMutation.isPending || (!editMode && !!emailError)}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  {patientMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editMode ? "Update Patient" : "Create Patient"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}