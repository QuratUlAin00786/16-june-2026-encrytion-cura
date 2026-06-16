import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Send,
  Plus,
  Search,
  Phone,
  Video,
  Paperclip,
  MessageSquare,
  Users,
  Mail,
  Smartphone,
  Clock,
  Check,
  CheckCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  Archive,
  Trash2,
  Edit,
  Copy,
  ArrowLeft,
  MoreVertical,
  Forward,
  Tag,
  X,
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  Globe,
  LogOut
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useLocation } from "wouter";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";
import { Header } from "@/components/layout/header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTenant } from "@/hooks/use-tenant";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useAuth } from "@/hooks/use-auth";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { createRemoteLiveKitRoom } from "@/lib/livekit-room-service";
import { buildSocketUserIdentifier, socketManager } from "@/lib/socket-manager";
import { LiveKitVideoCall } from "@/components/telemedicine/livekit-video-call";
import { LiveKitAudioCall } from "@/components/telemedicine/livekit-audio-call";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'internal' | 'patient' | 'broadcast';
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  isStarred: boolean;
  threadId?: string;
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

interface Conversation {
  id: string;
  participants: Array<{
    id: string | number;
    name: string;
    role: string;
    avatar?: string;
  }>;
  lastMessage: Message;
  unreadCount: number;
  isPatientConversation: boolean;
  isFavorite?: boolean;
}

// Campaign name suggestions organized by category
const CAMPAIGN_NAME_SUGGESTIONS = {
  "A. Patient-Focused Campaigns": [
    "Appointment reminders", "Follow-up reminders", "Missed appointment recalls", "Medication reminders",
    "Vaccination campaigns", "Preventive screening campaigns", "Chronic disease management campaigns",
    "Hospital service announcements", "Health education campaigns", "Patient satisfaction surveys",
    "Discharge follow-up campaigns", "Health camp invitations", "Insurance renewal reminders", "Billing & payment reminders"
  ],
  "B. Staff-Focused Campaigns": [
    "Staff training campaigns", "Policy updates", "Shift schedule notifications", "Internal event announcements",
    "Staff wellness campaigns", "Emergency drills", "Performance review campaigns", "New equipment training"
  ],
  "C. Doctor-Specific Campaigns": [
    "Clinical guideline updates", "New protocol announcements", "CME invitations",
    "Specialist rotation schedules", "Case discussion reminders"
  ],
  "D. Public / Community Campaigns": [
    "Blood donation drives", "Organ donation awareness", "Public health awareness",
    "Free medical camps", "Community vaccination drives", "Disaster response communication"
  ],
  "E. IT & System Campaigns": [
    "IT system maintenance", "App/portal updates", "Password reset reminders", "Cybersecurity updates"
  ],
  "F. Emergency & Safety Campaigns": [
    "Emergency preparedness", "Disaster management alerts", "Fire & safety equipment checks",
    "Ambulance readiness updates", "Outbreak/epidemic alerts"
  ],
  "G. Quality & Compliance Campaigns": [
    "Accreditation readiness", "Quality audits", "Clinical compliance updates", "Feedback & incident reporting"
  ],
  "H. Financial & Administrative Campaigns": [
    "Insurance documentation reminders", "Corporate client campaigns", "Tariff updates",
    "Staff payroll communication", "Vendor communication", "Contractor compliance updates"
  ],
  "I. Facility & Maintenance Campaigns": [
    "Maintenance alerts", "Water/electricity outage alerts", "Elevator servicing",
    "Biomedical waste reminders", "Renovation updates"
  ],
  "J. HR & Workforce Campaigns": [
    "Employee onboarding", "Leave policy updates", "Recruitment/interview updates",
    "Attendance reminders", "Grievance communication"
  ],
  "K. Patient Experience & Engagement": [
    "Patient onboarding instructions", "Inpatient daily schedule", "Patient portal activation",
    "Patient education videos", "Dietary instruction campaigns"
  ],
  "L. Pharmacy Campaigns": [
    "Drug availability alerts", "Medication shortage alerts", "New drug announcements",
    "Pharmacy recall alerts", "Prescription renewal reminders"
  ],
  "M. Laboratory & Radiology Campaigns": [
    "Lab report ready alerts", "Sample recollection alerts", "New diagnostic test updates", "Equipment downtime notifications"
  ],
  "N. IT & Digital Campaigns": [
    "System downtime alerts", "Software feature updates", "Cybersecurity awareness",
    "Telemedicine activation", "Mobile app promotions"
  ],
  "O. Hospitality & Guest Services": [
    "Canteen menu updates", "Visitor guidelines", "Parking updates", "Room sanitization reminders"
  ],
  "P. Specialty Department Campaigns": [
    "Maternity program campaigns", "Pediatrics vaccination reminders", "Cardiology heart health programs",
    "Orthopedic rehab campaigns", "Mental health awareness"
  ],
  "Q. Volunteer & CSR Campaigns": [
    "Charity event announcements", "CSR health projects", "Volunteer recruitment", "NGO partnership updates"
  ],
  "R. VIP / Corporate Patient Campaigns": [
    "Corporate health check campaigns", "VIP patient communication", "Employee wellness tie-ups"
  ],
  "S. Operations & Workflow Campaigns": [
    "OT schedule updates", "Bed availability notifications", "Ward occupancy alerts",
    "Queue management updates", "Transport/porter requests", "Cleaning & housekeeping rotation", "Sterilization cycle alerts"
  ],
  "T. Nursing Department Campaigns": [
    "Nursing duty roster updates", "Nursing documentation compliance", "Bedside care protocols",
    "Nursing audits", "Patient fall risk communication"
  ],
  "U. Security & Access Control Campaigns": [
    "ID card renewal", "Visitor access policy updates", "Security drill reminders",
    "Lost & found communication", "Restricted area alerts"
  ],
  "V. Medical Records / HIS Campaigns": [
    "MRD file submission reminders", "Digitization project updates", "Data correction requests", "Discharge summary completion"
  ],
  "W. Customer Service / Helpdesk Campaigns": [
    "Complaint resolution notifications", "Helpline updates", "New service announcements", "Token system alerts"
  ],
  "X. Ambulance & Emergency Department": [
    "Emergency team activation", "Trauma protocol updates", "Ambulance dispatch coordination",
    "Triage training", "Surge capacity alerts"
  ],
  "Y. Specialty Clinical Departments": [
    "Oncology follow-ups", "Dialysis schedule reminders", "Transplant coordination alerts",
    "Rehabilitation therapy reminders", "Pain management program campaigns"
  ],
  "Z. Infection Control Campaigns": [
    "Hand hygiene audits", "Isolation precautions", "Post-exposure prophylaxis alerts",
    "Antibiotic stewardship", "Air/surface testing alerts"
  ]
};

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'both';
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  subject: string;
  content: string;
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  template: string;
}

// Format timestamp for display - converts server's UTC timestamp to local time
// Server stores timestamps in UTC (ISO format) to avoid timezone confusion
// This function displays the UTC timestamp in the user's local timezone
// JavaScript Date automatically converts UTC to local time when using getHours(), getDate(), etc.
const formatTimestampNoConversion = (timestamp: string): string => {
  if (!timestamp) return "";

  try {
    // Parse the timestamp - handle both ISO strings and other formats
    let date: Date;

    // If timestamp is already a Date object, use it directly
    if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // Parse the timestamp string
      // If it's an ISO string with 'Z' or timezone, JavaScript Date will parse it as UTC
      // If it's not, we need to ensure it's treated as UTC
      if (typeof timestamp === 'string' && (timestamp.includes('Z') || timestamp.includes('+') || timestamp.includes('-'))) {
        // ISO format with timezone indicator - parse as UTC
        date = new Date(timestamp);
      } else {
        // No timezone indicator - assume it's UTC and parse accordingly
        // Append 'Z' to indicate UTC if not present
        const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
        date = new Date(utcTimestamp);
      }
    }

    // Validate the date
    if (Number.isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return "";
    }

    // Use local time methods to display the time as it appears in user's timezone
    // When you create a Date from a UTC ISO string, JavaScript automatically converts it to local time
    // These methods (getHours(), getDate(), etc.) return values in the user's local timezone
    const month = date.getMonth();
    const day = date.getDate();
    const year = date.getFullYear();
    const hour = date.getHours(); // Returns local timezone hour (automatically converted from UTC)
    const minute = date.getMinutes(); // Returns local timezone minute (automatically converted from UTC)

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month];

    // Format hour with AM/PM
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;

    // Always show date with time for clarity
    // Format: "Jan 15, 2024 2:30 pm" or "Today 2:30 pm" for today's messages
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    // Check if date is yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    // Format time
    const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;

    if (isToday) {
      return `Today ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday ${timeStr}`;
    } else {
      // Show full date: "Jan 15, 2024 2:30 pm"
      return `${monthName} ${day}, ${year} ${timeStr}`;
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error, 'timestamp:', timestamp);
    return "";
  }
};

export default function MessagingPage() {
  const { canCreate, canEdit, canDelete } = useRolePermissions();
  const { tenant } = useTenant();
  const { logout } = useAuth();

  // State for success modal (used by showSuccess)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Helper to show success in modal popup with green tick (instead of toast)
  const showSuccess = (title: string, message: string) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setShowSuccessDialog(true);
  };
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const [liveKitVideoCall, setLiveKitVideoCall] = useState<{
    roomName: string;
    participant: any;
    token?: string;
    serverUrl?: string;
    initiatorSocketId?: string;
    participantSocketId?: string;
  } | null>(null);
  const [liveKitAudioCall, setLiveKitAudioCall] = useState<{
    roomName: string;
    participant: any;
    token?: string;
    serverUrl?: string;
    initiatorSocketId?: string;
    participantSocketId?: string;
  } | null>(null);
  const [callStatusModal, setCallStatusModal] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });
  
  // Call timer and state refs (matching telemedicine.tsx)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const currentAudioCallRef = useRef<typeof liveKitAudioCall>(null);
  const callAcceptedRef = useRef<boolean>(false);
  const [newMessageContent, setNewMessageContent] = useState("");
  const [showSentConfirmation, setShowSentConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageFilter, setMessageFilter] = useState("all");
  const [activeMessagingTab, setActiveMessagingTab] = useState("conversations");
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignNamePopoverOpen, setCampaignNamePopoverOpen] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(false);
  const [showScheduledCallSuccess, setShowScheduledCallSuccess] = useState(false);
  const [scheduledCallInfo, setScheduledCallInfo] = useState<{ participantName: string, scheduledTime: string } | null>(null);
  const [callParticipant, setCallParticipant] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [meetingInfo, setMeetingInfo] = useState<{ meetingID: string, moderatorPassword: string } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "email" as "email" | "sms" | "both",
    subject: "",
    content: "",
    template: "default",
    recipients: [] as Array<{ id: number, name: string, role: string, phone: string, email: string }>,
    sendMode: "now" as "now" | "schedule",
    scheduledDateTime: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [campaignRecipientRole, setCampaignRecipientRole] = useState("");
  const [campaignRecipientName, setCampaignRecipientName] = useState("");
  const [campaignRecipientPhone, setCampaignRecipientPhone] = useState("");
  const [showCampaignSummary, setShowCampaignSummary] = useState(false);
  const [campaignSummary, setCampaignSummary] = useState<{
    totalRecipients: number;
    totalSent: number;
    totalFailed: number;
    deliveryLog: Array<{ recipient: string; phone: string; status: string; messageId?: string; error?: string }>;
  } | null>(null);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [showSendingProgress, setShowSendingProgress] = useState(false);
  const [sendingRecipients, setSendingRecipients] = useState<Array<{
    id: number;
    name: string;
    phone: string;
    status: 'pending' | 'sending' | 'sent' | 'failed';
    error?: string;
  }>>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "general" as "general" | "medical" | "preventive" | "urgent" | "onboarding",
    subject: "",
    content: ""
  });
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState({
    name: "",
    category: "general" as "general" | "medical" | "preventive" | "urgent" | "onboarding",
    subject: "",
    content: ""
  });
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [editingCampaign, setEditingCampaign] = useState({
    name: "",
    type: "email" as "email" | "sms" | "both",
    subject: "",
    content: "",
    template: "default",
    status: "draft" as "draft" | "scheduled" | "sent" | "paused",
    scheduledAt: "",
    recipientCount: 0,
    recipients: [] as Array<{ id: number, name: string, role: string, phone: string, email: string }>
  });
  const [editCampaignRecipientRole, setEditCampaignRecipientRole] = useState("");
  const [editCampaignRecipientName, setEditCampaignRecipientName] = useState("");
  const [editCampaignRecipientPhone, setEditCampaignRecipientPhone] = useState("");
  const [showViewCampaign, setShowViewCampaign] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);
  const [showViewCampaignRecipients, setShowViewCampaignRecipients] = useState(false);
  const [showDuplicateCampaignDialog, setShowDuplicateCampaignDialog] = useState(false);
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<any>(null);
  const [duplicateCampaignName, setDuplicateCampaignName] = useState("");
  const [showDuplicateAnnouncementDialog, setShowDuplicateAnnouncementDialog] = useState(false);
  const [announcementToDuplicate, setAnnouncementToDuplicate] = useState<any>(null);
  const [duplicateAnnouncementName, setDuplicateAnnouncementName] = useState("");
  const [campaignSubTab, setCampaignSubTab] = useState<"all" | "history" | "email_history">("all");
  const [sendingCampaignId, setSendingCampaignId] = useState<number | null>(null);
  const [recipientFilter, setRecipientFilter] = useState({
    role: "all",
    searchName: ""
  });
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [showDeleteCampaign, setShowDeleteCampaign] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [showDeleteTemplate, setShowDeleteTemplate] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  const [deleteConversationDialog, setDeleteConversationDialog] = useState<{ open: boolean; conversationId: string | null; participantName: string }>({ open: false, conversationId: null, participantName: "" });
  const [showNoRecipientsDialog, setShowNoRecipientsDialog] = useState(false);
  const [showUnfavoriteDialog, setShowUnfavoriteDialog] = useState(false);
  const [unfavoritedConversationName, setUnfavoritedConversationName] = useState<string>("");
  const [showFavoriteDialog, setShowFavoriteDialog] = useState(false);
  const [favoritedConversationName, setFavoritedConversationName] = useState<string>("");
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [taggedMessageContent, setTaggedMessageContent] = useState<string>("");
  const [taggedMessageId, setTaggedMessageId] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState<string>("");
  const [newTagColor, setNewTagColor] = useState<string>("blue");
  const [showCallInProgress, setShowCallInProgress] = useState(false);
  const [callInProgressParticipant, setCallInProgressParticipant] = useState<string>("");
  const [newMessage, setNewMessage] = useState({
    recipient: "",
    subject: "",
    content: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    type: "internal" as "internal" | "patient" | "broadcast",
    phoneNumber: "",
    messageType: "message" as "message" | "sms" | "whatsapp" | "email" | "voice"
  });
  const [videoCall, setVideoCall] = useState({
    participant: "",
    type: "consultation" as "consultation" | "team_meeting" | "emergency",
    duration: "30" as "15" | "30" | "60" | "90",
    scheduled: false,
    scheduledTime: ""
  });
  const [selectedVideoCallPatient, setSelectedVideoCallPatient] = useState<string>("");
  const [videoCallPatientSearch, setVideoCallPatientSearch] = useState<string>("");
  const [selectedMessagePatient, setSelectedMessagePatient] = useState<string>("");
  const [messagePatientSearch, setMessagePatientSearch] = useState<string>("");
  const [selectedRecipientRole, setSelectedRecipientRole] = useState<string>("");
  const [composeRecipientNameOpen, setComposeRecipientNameOpen] = useState(false);
  const [composeRecipientRoleOpen, setComposeRecipientRoleOpen] = useState(false);
  const [selectedRecipientUser, setSelectedRecipientUser] = useState<string>("");
  const [selectedVideoCallParticipant, setSelectedVideoCallParticipant] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<{
    recipientRole?: string;
    recipientName?: string;
    subject?: string;
    phoneNumber?: string;
    content?: string;
    videoCallParticipant?: string;
    videoCallScheduledTime?: string;
  }>({});
  const { toast } = useToast();

  // Authentication token and headers
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setAuthToken(token);
  }, []);

  // Fetch current user information
  const { data: user } = useQuery({
    queryKey: ['/api/auth/validate'],
    queryFn: async () => {
      console.log('🔐 FETCHING USER AUTH DATA for WebSocket connection');
      const response = await apiRequest('GET', '/api/auth/validate');
      const data = await response.json();
      console.log('🔐 USER AUTH DATA RECEIVED:', data.user);
      return data.user;
    }
  });

  // Update currentUser when user data is available
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Check if user is a doctor role
  const isDoctor = isDoctorLike(user?.role);

  // Fetch patients for searchable dropdown
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      console.log('📋 MESSAGING: Fetching patients data...');
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      console.log('📋 MESSAGING: Patients data received:', data?.length || 0, 'patients');
      return data;
    },
    enabled: true // Always fetch patients data
  });

  // Fetch users for admin and patient role-based filtering
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      const data = await response.json();
      return data;
    },
    enabled: user?.role === 'admin' || user?.role === 'patient' || user?.role === 'doctor' || user?.role === 'nurse' // Fetch when user is admin, patient, doctor, or nurse
  });

  // Fetch roles from the roles table filtered by organization_id
  const { data: rolesData = [] } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/roles");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Roles fetch error:", error);
        return [];
      }
    },
  });

  // Update current user when user data changes
  useEffect(() => {
    if (user) {
      console.log('🔐 SETTING CURRENT USER for WebSocket:', user);
      setCurrentUser(user);
    } else {
      console.log('🔐 NO USER DATA - WebSocket cannot connect');
    }
  }, [user]);

  // Filter patients based on search
  const filteredVideoCallPatients = (patientsData || []).filter((patient: any) =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(videoCallPatientSearch.toLowerCase()) ||
    patient.email?.toLowerCase().includes(videoCallPatientSearch.toLowerCase()) ||
    patient.patientId?.toLowerCase().includes(videoCallPatientSearch.toLowerCase())
  );

  const filteredMessagePatients = (patientsData || []).filter((patient: any) =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(messagePatientSearch.toLowerCase()) ||
    patient.email?.toLowerCase().includes(messagePatientSearch.toLowerCase()) ||
    patient.patientId?.toLowerCase().includes(messagePatientSearch.toLowerCase())
  );

  // Filter users/patients based on selected role; exclude current user so they cannot select themselves
  const currentUserId = currentUser?.id ?? user?.id;
  const filteredRecipients = (() => {
    const base = selectedRecipientRole === 'patient'
      ? (patientsData || [])
      : selectedRecipientRole
        ? (usersData || []).filter((u: any) => u.role === selectedRecipientRole)
        : [];
    if (currentUserId == null) return base;
    if (selectedRecipientRole === 'patient') {
      return base.filter((p: any) => String(p.userId) !== String(currentUserId) && String(p.id) !== String(currentUserId));
    }
    return base.filter((u: any) => String(u.id) !== String(currentUserId));
  })();

  const patientRelationRank = (relation?: string | null) => {
    if (!relation) return 50;
    const r = String(relation).toLowerCase();
    if (r === "self") return 0;
    if (r === "spouse") return 10;
    if (r === "father") return 20;
    if (r === "mother") return 21;
    if (r === "son") return 30;
    if (r === "daughter") return 31;
    if (r === "dependent child") return 32;
    if (r === "other") return 40;
    return 45;
  };

  const formatPatientDropdownLabel = (patient: any) =>
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() +
    (patient?.patientId ? ` (${patient.patientId})` : "");

  const getSelfEmailForUserId = (userId: number | string | null | undefined): string => {
    if (!patientsData || !Array.isArray(patientsData) || userId == null) return "";
    const self = patientsData.find(
      (p: any) =>
        String(p?.userId) === String(userId) &&
        String(p?.relation ?? "").trim().toLowerCase() === "self",
    );
    return String(self?.email ?? "").trim();
  };

  const getDisplayEmailForPatient = (patient: any): string => {
    if (!patient) return "";
    const relation = String(patient?.relation ?? "").trim().toLowerCase();
    const email = String(patient?.email ?? "").trim();
    if (relation === "self") return email;
    return getSelfEmailForUserId(patient?.userId) || email;
  };

  const selectedComposePatient = useMemo(() => {
    if (selectedRecipientRole !== "patient" || !selectedRecipientUser) return null;
    return (patientsData || []).find((p: any) => String(p.id) === selectedRecipientUser) ?? null;
  }, [selectedRecipientRole, selectedRecipientUser, patientsData]);

  const patientRecipientsForMessaging = useMemo(() => {
    const base = patientsData || [];
    if (currentUserId == null) return base;
    return base.filter(
      (p: any) =>
        String(p.userId) !== String(currentUserId) && String(p.id) !== String(currentUserId),
    );
  }, [patientsData, currentUserId]);

  const patientDropdownGroups = useMemo(() => {
    if (!Array.isArray(patientRecipientsForMessaging) || patientRecipientsForMessaging.length === 0) {
      return [];
    }

    const map = new Map<number | string, any[]>();
    for (const p of patientRecipientsForMessaging) {
      const key = p?.userId ?? `no-user-${p?.id ?? Math.random()}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }

    const groups = Array.from(map.values()).map((members) => {
      const sorted = [...members].sort((a, b) => {
        const rr = patientRelationRank(a?.relation) - patientRelationRank(b?.relation);
        if (rr !== 0) return rr;
        const na = `${a?.firstName ?? ""} ${a?.lastName ?? ""}`.trim().toLowerCase();
        const nb = `${b?.firstName ?? ""} ${b?.lastName ?? ""}`.trim().toLowerCase();
        return na.localeCompare(nb);
      });

      const main =
        sorted.find((m) => String(m?.relation ?? "").trim().toLowerCase() === "self") ??
        sorted[0];
      const relatives = sorted.filter((m) => m !== main);
      return { main, relatives };
    });

    groups.sort((a, b) => {
      const na = `${a.main?.firstName ?? ""} ${a.main?.lastName ?? ""}`.trim().toLowerCase();
      const nb = `${b.main?.firstName ?? ""} ${b.main?.lastName ?? ""}`.trim().toLowerCase();
      return na.localeCompare(nb);
    });

    return groups;
  }, [patientRecipientsForMessaging]);

  const handleComposeRecipientSelect = (recipient: any) => {
    const value = String(recipient.id);
    setSelectedRecipientUser(value);
    setNewMessage((prev) => ({
      ...prev,
      recipient: value,
      phoneNumber: recipient.phone || recipient.phoneNumber || recipient.mobile || prev.phoneNumber || "",
    }));
    setValidationErrors((prev) => ({ ...prev, recipientName: undefined }));
    setComposeRecipientNameOpen(false);
  };

  const getRoleDisplayLabel = (roleName: string) => {
    if (!roleName) return "";
    const match = (rolesData as any[]).find((r) => r.name === roleName);
    return match?.displayName || formatRoleLabel(roleName);
  };

  const handleComposeRoleSelect = (roleName: string) => {
    setSelectedRecipientRole(roleName);
    setSelectedRecipientUser("");
    setComposeRecipientNameOpen(false);
    setComposeRecipientRoleOpen(false);
    setNewMessage((prev) => ({ ...prev, recipient: "", phoneNumber: "" }));
    setValidationErrors((prev) => ({ ...prev, recipientRole: undefined }));
  };

  // Helper function to get the other participant (not the current user)
  const getOtherParticipant = (conversation: Conversation) => {
    console.log('🔍 GET OTHER PARTICIPANT - Conversation:', conversation.id);
    console.log('🔍 PARTICIPANTS:', conversation.participants);
    console.log('🔍 CURRENT USER:', currentUser?.id);

    if (!currentUser) {
      // Return first participant with a valid name, or first participant
      const validParticipant = conversation.participants.find(p => p.name && p.name !== 'undefined' && p.id);
      console.log('🔍 NO CURRENT USER - Valid participant:', validParticipant);
      return validParticipant || conversation.participants[0];
    }

    // Find the participant that is NOT the current user (simple ID comparison)
    const otherParticipant = conversation.participants.find(p =>
      p.id && String(p.id) !== String(currentUser.id)
    );

    console.log('🔍 OTHER PARTICIPANT FOUND:', otherParticipant);
    return otherParticipant || conversation.participants[0];
  };

  const getProfilePicturePathByRoleAndId = (role: string | undefined, id: string | number | undefined) => {
    if (!id) return null;
    const roleLower = String(role || "").toLowerCase();
    const idStr = String(id);

    if (roleLower === "patient") {
      const patient = (patientsData || []).find(
        (p: any) => String(p.userId) === idStr || String(p.id) === idStr,
      );
      return (
        patient?.profilePicturePath ||
        patient?.profile_picture_path ||
        null
      );
    }

    const u = (usersData || []).find((x: any) => String(x.id) === idStr);
    return u?.profilePicturePath || u?.profile_picture_path || null;
  };

  const getParticipantProfilePicturePath = (participant: any) => {
    return (
      participant?.profilePicturePath ||
      participant?.profile_picture_path ||
      participant?.avatar ||
      getProfilePicturePathByRoleAndId(participant?.role, participant?.id)
    );
  };

  // LiveKit call helpers
  const buildParticipantIdentifier = (entity: any, defaultRole = "participant") => {
    let firstName = entity?.firstName;
    let lastName = entity?.lastName;

    if (!firstName && !lastName && entity?.name) {
      const nameParts = entity.name.split(" ");
      firstName = nameParts[0] || entity.name;
      lastName = nameParts.slice(1).join(" ") || "";
    }

    return buildSocketUserIdentifier({
      id: entity?.id,
      firstName,
      lastName,
      email: entity?.email,
      role: entity?.role || defaultRole,
    });
  };

  const getDisplayName = (entity: any) => {
    const name = [entity?.firstName, entity?.lastName].filter(Boolean).join(" ").trim();
    return name || entity?.name || entity?.email || `user-${entity?.id}`;
  };

  const emitMessagingIncomingInvite = (args: {
    roomName: string;
    token?: string;
    serverUrl?: string;
    e2eeKey?: string;
    fromIdentifier: string;
    toIdentifier: string;
    isVideo: boolean;
  }) => {
    if (!user || !args.token || !args.serverUrl) return;
    const fromUsername = getDisplayName(user);
    socketManager.emitToServer("incoming-call", {
      roomId: args.roomName,
      fromUserId: args.fromIdentifier,
      fromUsername,
      toUserId: args.toIdentifier,
      to: args.toIdentifier,
      isVideo: args.isVideo,
      token: args.token,
      serverUrl: args.serverUrl,
      e2eeKey: args.e2eeKey,
      participants: [],
      isGroup: false,
      groupName: args.isVideo ? "Messaging Video Call" : "Messaging Audio Call",
      isDelayedCall: false,
    });
  };

  const startLiveKitVideoCall = async (participant: any) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start a video call",
          variant: "destructive",
        });
        return;
      }

      const fromIdentifier = buildParticipantIdentifier(user, user.role);
      const toIdentifier = buildParticipantIdentifier(participant, participant.role);

      if (!fromIdentifier || !toIdentifier) {
        toast({
          title: "Call Failed",
          description: "Unable to determine participant identifiers",
          variant: "destructive",
        });
        return;
      }

      const roomName = `messaging-video-${user.id}-${participant.id}-${Date.now()}`;

      toast({
        title: "Video Call Starting",
        description: `Connecting to video call with ${getDisplayName(participant)}`,
      });

      const liveKitRoom = await createRemoteLiveKitRoom({
        roomId: roomName,
        fromUsername: fromIdentifier,
        toUsers: [
          {
            identifier: toIdentifier,
            displayName: getDisplayName(participant),
          },
        ],
        isVideo: true,
        groupName: "Messaging Video Call",
      });

      const finalRoomId = liveKitRoom.roomId || roomName;

      emitMessagingIncomingInvite({
        roomName: finalRoomId,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        e2eeKey: liveKitRoom.e2eeKey,
        fromIdentifier,
        toIdentifier,
        isVideo: true,
      });

      setLiveKitVideoCall({
        roomName: finalRoomId,
        participant,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        // Store exact socket identifiers used to route events (critical for closing Incoming Call popup)
        initiatorSocketId: fromIdentifier,
        participantSocketId: toIdentifier,
      });
    } catch (error: any) {
      console.error("LiveKit video call failed:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start video call",
        variant: "destructive",
      });
    }
  };

  const startLiveKitAudioCall = async (participant: any) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start an audio call",
          variant: "destructive",
        });
        return;
      }

      const fromIdentifier = buildParticipantIdentifier(user, user.role);
      const toIdentifier = buildParticipantIdentifier(participant, participant.role);

      if (!fromIdentifier || !toIdentifier) {
        toast({
          title: "Call Failed",
          description: "Unable to determine participant identifiers",
          variant: "destructive",
        });
        return;
      }

      const roomName = `messaging-audio-${user.id}-${participant.id}-${Date.now()}`;

      toast({
        title: "Audio Call Starting",
        description: `Connecting to audio call with ${getDisplayName(participant)}`,
      });

      const liveKitRoom = await createRemoteLiveKitRoom({
        roomId: roomName,
        fromUsername: fromIdentifier,
        toUsers: [
          {
            identifier: toIdentifier,
            displayName: getDisplayName(participant),
          },
        ],
        isVideo: false,
        groupName: "Messaging Audio Call",
      });

      const finalRoomId = liveKitRoom.roomId || roomName;

      emitMessagingIncomingInvite({
        roomName: finalRoomId,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        e2eeKey: liveKitRoom.e2eeKey,
        fromIdentifier,
        toIdentifier,
        isVideo: false,
      });

      setLiveKitAudioCall({
        roomName: finalRoomId,
        participant,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        // Store exact socket identifiers used to route events (critical for closing Incoming Call popup)
        initiatorSocketId: fromIdentifier,
        participantSocketId: toIdentifier,
      });
    } catch (error: any) {
      console.error("LiveKit audio call failed:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start audio call",
        variant: "destructive",
      });
    }
  };

  const handleLiveKitVideoCallEnd = (disconnectedParticipant?: { name: string; role?: string }) => {
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);

    // Capture values before clearing state (matching telemedicine.tsx)
    const currentVideoCall = liveKitVideoCall;
    const currentUser = user;

    // Emit both call_ended and call_declined events to ensure recipient's popup closes
    // Do this BEFORE clearing state to ensure we have the data
    if (currentVideoCall && currentUser) {
      // Prefer the exact identifiers used when the room/call was created (matches telemedicine routing)
      const initiatorUserId =
        currentVideoCall.initiatorSocketId || buildSocketUserIdentifier(currentUser);
      const participantId =
        currentVideoCall.participantSocketId ||
        buildSocketUserIdentifier(currentVideoCall.participant);
      
      if (initiatorUserId && participantId) {
        // Emit call_declined to close recipient's incoming call popup
        socketManager.emitToServer('call_declined', {
          roomId: currentVideoCall.roomName,
          fromUserId: initiatorUserId,
          toUserId: participantId,
          isGroup: false,
        });
        console.log('[Messaging] Emitted call_declined for video call:', {
          roomId: currentVideoCall.roomName,
          fromUserId: initiatorUserId,
          toUserId: participantId,
        });
        
        // Also emit call_ended for consistency
        socketManager.emitToServer('call_ended', {
          roomId: currentVideoCall.roomName,
          initiatorUserId: initiatorUserId,
          participantIds: [participantId],
        });
        console.log('[Messaging] Emitted call_ended for video call:', {
          roomId: currentVideoCall.roomName,
          initiatorUserId: initiatorUserId,
          participantIds: [participantId],
        });
      }
    }
    
    // Clear state after emitting events
    setLiveKitVideoCall(null);
    
    // Format disconnect message with participant name if available
    let description = "Video call has been terminated";
    if (disconnectedParticipant && disconnectedParticipant.name) {
      const rolePrefix = disconnectedParticipant.role?.toLowerCase() === 'nurse' ? 'Nurse.' : disconnectedParticipant.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
      const displayName = rolePrefix ? `${rolePrefix} ${disconnectedParticipant.name}` : disconnectedParticipant.name;
      description = `Disconnected ${displayName} have left the call`;
    }
    
    // Use setTimeout to ensure modal shows after main dialog closes
    setTimeout(() => {
      setCallStatusModal({
        open: true,
        title: "Call Ended",
        description: description,
      });
    }, 100);
  };

  const handleLiveKitAudioCallEnd = (disconnectedParticipant?: { name: string; role?: string }) => {
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Stop timeout timer
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    setCallDuration(0);

    // Capture values before clearing state (matching telemedicine.tsx)
    const currentAudioCall = liveKitAudioCall;
    const currentUser = user;

    // Emit both call_ended and call_declined events to ensure recipient's popup closes
    // Do this BEFORE clearing state to ensure we have the data
    if (currentAudioCall && currentUser) {
      // Prefer the exact identifiers used when the room/call was created (matches telemedicine routing)
      const initiatorUserId =
        currentAudioCall.initiatorSocketId || buildSocketUserIdentifier(currentUser);
      const participantId =
        currentAudioCall.participantSocketId ||
        buildSocketUserIdentifier(currentAudioCall.participant);
      
      if (initiatorUserId && participantId) {
        // Emit call_declined to close recipient's incoming call popup
        socketManager.emitToServer('call_declined', {
          roomId: currentAudioCall.roomName,
          fromUserId: initiatorUserId,
          toUserId: participantId,
          isGroup: false,
        });
        console.log('[Messaging] Emitted call_declined for audio call:', {
          roomId: currentAudioCall.roomName,
          fromUserId: initiatorUserId,
          toUserId: participantId,
        });
        
        // Also emit call_ended for consistency
        socketManager.emitToServer('call_ended', {
          roomId: currentAudioCall.roomName,
          initiatorUserId: initiatorUserId,
          participantIds: [participantId],
        });
        console.log('[Messaging] Emitted call_ended for audio call:', {
          roomId: currentAudioCall.roomName,
          initiatorUserId: initiatorUserId,
          participantIds: [participantId],
        });
      }
    }
    
    // Clear state after emitting events
    setLiveKitAudioCall(null);
    currentAudioCallRef.current = null;
    callStartTimeRef.current = null;
    callAcceptedRef.current = false;
    
    // Format disconnect message with participant name if available
    let description = "Audio call has been terminated";
    if (disconnectedParticipant && disconnectedParticipant.name) {
      const rolePrefix = disconnectedParticipant.role?.toLowerCase() === 'nurse' ? 'Nurse.' : disconnectedParticipant.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
      const displayName = rolePrefix ? `${rolePrefix} ${disconnectedParticipant.name}` : disconnectedParticipant.name;
      description = `Disconnected ${displayName} have left the call`;
    }
    
    // Use setTimeout to ensure modal shows after main dialog closes
    setTimeout(() => {
      setCallStatusModal({
        open: true,
        title: "Call Ended",
        description: description,
      });
    }, 100);
  };

  // Listen for call_ended and call_declined events from other participants
  useEffect(() => {
    // Handle when the other party ends the call
    const unsubscribeCallEnded = socketManager.on('call_ended', (data: any) => {
      console.log('[Messaging] Received call_ended event:', data);
      
      // Check if this is for our current video call (exact matching like telemedicine.tsx)
      if (liveKitVideoCall && data.roomId === liveKitVideoCall.roomName) {
        console.log('[Messaging] Closing video call - other party ended');
        // Stop call timer
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        setCallDuration(0);
        
        // Stop all camera/video tracks before closing
        document.querySelectorAll('video').forEach(videoElement => {
          const video = videoElement as HTMLVideoElement;
          if (video.srcObject instanceof MediaStream) {
            const stream = video.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => {
              track.stop();
              console.log('[Messaging] Stopped video track from video element on call ended');
            });
            video.srcObject = null;
          }
        });
        
        const allStreams = new Set<MediaStream>();
        document.querySelectorAll('video, audio').forEach(element => {
          const mediaElement = element as HTMLVideoElement | HTMLAudioElement;
          if (mediaElement.srcObject instanceof MediaStream) {
            allStreams.add(mediaElement.srcObject as MediaStream);
          }
        });
        
        allStreams.forEach(stream => {
          stream.getVideoTracks().forEach(track => {
            track.stop();
            console.log('[Messaging] Stopped video track from media stream on call ended');
          });
        });
        
        // Get participant info for disconnect message
        const participant = liveKitVideoCall.participant;
        let description = "Video call has been terminated";
        if (participant) {
          const rolePrefix = participant.role?.toLowerCase() === 'nurse' ? 'Nurse.' : participant.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
          const displayName = rolePrefix 
            ? `${rolePrefix} ${participant.firstName || participant.name?.split(' ')[0] || ''} ${participant.lastName || participant.name?.split(' ').slice(1).join(' ') || ''}`.trim()
            : `${participant.firstName || participant.name?.split(' ')[0] || ''} ${participant.lastName || participant.name?.split(' ').slice(1).join(' ') || ''}`.trim();
          if (displayName && displayName !== 'Unknown') {
            description = `Disconnected ${displayName} have left the call`;
          }
        }
        
        setLiveKitVideoCall(null);
        // Use setTimeout to ensure modal shows after main dialog closes
        setTimeout(() => {
          setCallStatusModal({
            open: true,
            title: "Call Ended",
            description: description,
          });
        }, 100);
      }
      
      // Check if this is for our current audio call (exact matching like telemedicine.tsx)
      if (liveKitAudioCall && data.roomId === liveKitAudioCall.roomName) {
        console.log('[Messaging] Closing audio call - other party ended');
        // Stop call timer
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        // Stop timeout timer
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        setCallDuration(0);
        
        // Get participant info for disconnect message
        const participant = liveKitAudioCall.participant;
        let description = "Audio call has been terminated";
        if (participant) {
          const rolePrefix = participant.role?.toLowerCase() === 'nurse' ? 'Nurse.' : participant.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
          const displayName = rolePrefix 
            ? `${rolePrefix} ${participant.firstName || participant.name?.split(' ')[0] || ''} ${participant.lastName || participant.name?.split(' ').slice(1).join(' ') || ''}`.trim()
            : `${participant.firstName || participant.name?.split(' ')[0] || ''} ${participant.lastName || participant.name?.split(' ').slice(1).join(' ') || ''}`.trim();
          if (displayName && displayName !== 'Unknown') {
            description = `Disconnected ${displayName} have left the call`;
          }
        }
        
        setLiveKitAudioCall(null);
        currentAudioCallRef.current = null;
        callStartTimeRef.current = null;
        callAcceptedRef.current = false;
        // Use setTimeout to ensure modal shows after main dialog closes
        setTimeout(() => {
          setCallStatusModal({
            open: true,
            title: "Call Ended",
            description: description,
          });
        }, 100);
      }
    });

    // Handle when an incoming call is declined
    const unsubscribeCallDeclined = socketManager.on('call_declined', (data: any) => {
      console.log('[Messaging] Received call_declined event:', data);
      
      // Check if this is for our current video call (exact matching like telemedicine.tsx)
      if (liveKitVideoCall && data.roomId === liveKitVideoCall.roomName) {
        console.log('[Messaging] Closing video call - call was declined');
        // Stop call timer
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        setCallDuration(0);
        
        // Stop all camera/video tracks before closing
        // Stop all video tracks from video elements in the document
        document.querySelectorAll('video').forEach(videoElement => {
          const video = videoElement as HTMLVideoElement;
          if (video.srcObject instanceof MediaStream) {
            const stream = video.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => {
              track.stop();
              console.log('[Messaging] Stopped video track from video element on decline');
            });
            video.srcObject = null;
          }
        });
        
        // Also stop any active media tracks that might be running
        // Get all active media streams and stop video tracks
        const allStreams = new Set<MediaStream>();
        document.querySelectorAll('video, audio').forEach(element => {
          const mediaElement = element as HTMLVideoElement | HTMLAudioElement;
          if (mediaElement.srcObject instanceof MediaStream) {
            allStreams.add(mediaElement.srcObject as MediaStream);
          }
        });
        
        allStreams.forEach(stream => {
          stream.getVideoTracks().forEach(track => {
            track.stop();
            console.log('[Messaging] Stopped video track from media stream on decline');
          });
        });
        
        setLiveKitVideoCall(null);
        setCallStatusModal({
          open: true,
          title: "Call Declined",
          description: "The recipient declined the call",
        });
      }
      
      // Check if this is for our current audio call (exact matching like telemedicine.tsx)
      if (liveKitAudioCall && data.roomId === liveKitAudioCall.roomName) {
        console.log('[Messaging] Closing audio call - call was declined');
        // Stop call timer
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        // Stop timeout timer
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        setCallDuration(0);
        setLiveKitAudioCall(null);
        currentAudioCallRef.current = null;
        callStartTimeRef.current = null;
        callAcceptedRef.current = false;
        setCallStatusModal({
          open: true,
          title: "Call Declined",
          description: "The recipient declined the call",
        });
      }
    });

    return () => {
      unsubscribeCallEnded();
      unsubscribeCallDeclined();
    };
  }, [liveKitVideoCall, liveKitAudioCall]);

  // Cleanup on unmount (matching telemedicine.tsx)
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
  }, []);

  // Clear message content when conversation changes
  useEffect(() => {
    setNewMessageContent("");
  }, [selectedConversation]);

  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['/api/messaging/conversations'],
    enabled: true, // Enable automatic execution to load conversations
    staleTime: 300000, // Consider data fresh for 5 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't auto-refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: false, // Don't poll
    retry: 1, // Only retry once on failure
    queryFn: async () => {
      console.log('🔄 FETCHING CONVERSATIONS');
      const response = await apiRequest('GET', '/api/messaging/conversations');
      const data = await response.json();
      console.log('📨 CONVERSATIONS DATA RECEIVED:', JSON.stringify(data, null, 2));
      return data;
    }
  });

  // Auto-select first conversation when conversations load
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversation) {
      console.log('🔥 AUTO-SELECTING FIRST CONVERSATION:', conversations[0].id);
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  // Bypass React Query completely for messages to avoid cache issues
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (conversationId: string, preserveExisting: boolean = false) => {
    if (!conversationId) return;

    setMessagesLoading(true);
    try {
      console.log('🔥 DIRECT FETCH MESSAGES for conversation:', conversationId);
      console.log('🔥 FETCH TIMESTAMP:', new Date().toISOString());
      const response = await apiRequest('GET', `/api/messaging/messages/${conversationId}`);
      const data = await response.json();
      console.log('🔥 DIRECT FETCH COMPLETED:', data.length, 'messages');
      console.log('🔥 MESSAGE IDS:', data.map((m: any) => m.id));

      // Normalize timestamp field - server returns timestamps in UTC (ISO format)
      // Server stores timestamps in UTC to avoid timezone confusion, work globally,
      // prevent daylight saving issues, and keep database time consistent
      // We preserve the UTC timestamp and let JavaScript Date convert to local time for display
      setMessages(prev => {
        const prevById = new Map(prev.map(m => [m.id, m]));

        const normalized = (data as any[]).map((m: any) => {
          const existing = prevById.get(m.id);
          // Server returns timestamp in UTC (ISO format) - prioritize timestamp over createdAt
          const serverTs = m.timestamp || m.createdAt || null;

          // CRITICAL: Always use server's UTC timestamp for received messages
          // This ensures consistency and proper timezone handling
          let finalTimestamp: string;

          if (existing) {
            // Message already exists - preserve its timestamp to avoid flicker
            // For sent messages, this might be an optimistic timestamp (local time)
            // For received messages, this should be the server's UTC timestamp
            finalTimestamp = existing.timestamp;
          } else if (serverTs) {
            // New message from server - normalize to UTC ISO format
            // This ensures consistent UTC format regardless of how the database returns it
            const serverDate = new Date(serverTs);
            if (!isNaN(serverDate.getTime())) {
              // Convert to UTC ISO string to ensure consistent format
              // This ensures both sender and receiver see the same time after local conversion
              finalTimestamp = serverDate.toISOString();
              console.log('📨 Normalized server timestamp to UTC:', serverTs, '-> UTC:', finalTimestamp, '-> Local:', serverDate.toLocaleString());
            } else {
              // Invalid server timestamp - this should not happen, but fallback to current UTC time
              console.warn('⚠️ Invalid server timestamp:', serverTs, 'using current UTC time');
              finalTimestamp = new Date().toISOString(); // Current time in UTC
            }
          } else {
            // No server timestamp - this should not happen for real messages
            // Fallback to current UTC time (not local time)
            console.warn('⚠️ No server timestamp found for message:', m.id, 'using current UTC time');
            finalTimestamp = new Date().toISOString(); // Current time in UTC
          }

          return {
            ...m,
            timestamp: finalTimestamp, // UTC timestamp from server
          };
        });

        if (preserveExisting) {
          // Merge: keep any messages that are not in the latest payload (defensive),
          // then sort by timestamp (ascending - oldest first, newest last).
          const incomingIds = new Set(normalized.map(m => m.id));
          const leftovers = prev.filter(m => !incomingIds.has(m.id));
          const merged = [...leftovers, ...normalized].sort((a, b) => {
            // Ensure timestamps are valid dates
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

            // Handle invalid dates
            if (isNaN(timeA) || isNaN(timeB)) {
              console.warn('⚠️ Invalid timestamp detected:', { a: a.timestamp, b: b.timestamp });
              return 0;
            }

            // Ascending order: oldest messages first, newest messages last (at bottom)
            return timeA - timeB;
          });

          // Log for debugging
          console.log('📋 MERGED MESSAGES - Count:', merged.length);
          if (merged.length > 0) {
            console.log('📋 First message timestamp:', merged[0].timestamp, 'Parsed:', new Date(merged[0].timestamp).toLocaleString(), 'Content:', merged[0].content);
            console.log('📋 Last message timestamp:', merged[merged.length - 1].timestamp, 'Parsed:', new Date(merged[merged.length - 1].timestamp).toLocaleString(), 'Content:', merged[merged.length - 1].content);
            // Log all timestamps for debugging
            merged.forEach((m, idx) => {
              const parsed = new Date(m.timestamp);
              console.log(`📋 Message ${idx}: timestamp="${m.timestamp}", parsed="${parsed.toLocaleString()}", content="${m.content?.substring(0, 20)}"`);
            });
          }

          return merged;
        }

        // Non-preserving path: just use normalized server data, sorted by timestamp (ascending - oldest first, newest last).
        // Ensure proper chronological order: messages with earlier timestamps come first
        const sorted = normalized.sort((a, b) => {
          // Ensure timestamps are valid dates
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

          // Handle invalid dates
          if (isNaN(timeA) || isNaN(timeB)) {
            console.warn('⚠️ Invalid timestamp detected:', { a: a.timestamp, b: b.timestamp });
            return 0;
          }

          // Ascending order: oldest messages first, newest messages last (at bottom)
          return timeA - timeB;
        });

        // Log for debugging
        console.log('📋 MESSAGES SORTED - Count:', sorted.length);
        if (sorted.length > 0) {
          console.log('📋 First message timestamp:', sorted[0].timestamp, 'Content:', sorted[0].content?.substring(0, 20));
          console.log('📋 Last message timestamp:', sorted[sorted.length - 1].timestamp, 'Content:', sorted[sorted.length - 1].content?.substring(0, 20));
        }

        return sorted;
      });

      // Refresh conversations list to update unread counts after marking messages as read
      // Use a small delay to ensure the backend has processed the read status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      }, 500);
    } catch (error: any) {
      // Handle connection errors gracefully
      if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
        console.warn('Connection error fetching messages (server may be starting):', error);
        if (!preserveExisting) {
          setMessages([]);
        }
      } else {
        console.error('Error fetching messages:', error);
        if (!preserveExisting) {
          setMessages([]);
        }
      }
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  // Auto-scroll to bottom when messages change or new message is sent
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Small delay to ensure DOM is updated and messages are rendered in correct order
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [messages.length, selectedConversation]); // Trigger on message count change or conversation change

  const { data: campaigns = [], isLoading: campaignsLoading, error: campaignsError } = useQuery({
    queryKey: ['/api/messaging/campaigns'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching campaigns with token:', token ? 'present' : 'missing');
      const response = await fetch('/api/messaging/campaigns', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      console.log('Campaigns response status:', response.status);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      const data = await response.json();
      console.log('Campaigns data received:', data);
      return data;
    }
  });

  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: ['/api/messaging/templates'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching templates with token:', token ? 'present' : 'missing');
      const response = await fetch('/api/messaging/templates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      console.log('Templates response status:', response.status);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      const data = await response.json();
      console.log('Templates data received:', data);
      return data;
    }
  });

  // Fetch message tags
  const { data: messageTags = [], isLoading: tagsLoading, refetch: refetchTags } = useQuery({
    queryKey: ['/api/messaging/tags'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messaging/tags');
      const data = await response.json();
      return data;
    }
  });

  const { data: analytics = {}, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/messaging/analytics'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/analytics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    }
  });

  const [smsRefreshLoading, setSmsRefreshLoading] = useState(false);

  const { data: smsMessages = [], isLoading: smsLoading, refetch: refetchSmsMessages } = useQuery({
    queryKey: ['/api/messaging/sms-messages'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/sms-messages', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    staleTime: 0
  });

  const resetNewMessage = () => {
    setNewMessage({
      recipient: "",
      subject: "",
      content: "",
      priority: "normal",
      type: "internal",
      phoneNumber: "",
      messageType: "message"
    });
    setValidationErrors({});
    setSelectedRecipientRole("");
    setSelectedRecipientUser("");
    setSelectedMessagePatient("");
    setComposeRecipientRoleOpen(false);
    setComposeRecipientNameOpen(false);
  };



  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        // Parse error response for SMS/WhatsApp delivery failures
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('🎯 MESSAGE SENT SUCCESS - messageType:', variables.createConversation ? 'message' : variables.messageType);

      // CRITICAL: Only create/update conversations if "Message" type was selected
      // Other types (SMS/Email/WhatsApp/Voice) should NOT create conversations
      const isMessageType = variables.createConversation === true;

      if (isMessageType) {
        // Message type: create/update conversation and open it
        console.log('💬 MESSAGE TYPE - creating/updating conversation');

        // Force immediate UI update for conversations list
        const currentConversations = queryClient.getQueryData(['/api/messaging/conversations']) as any[] || [];

        // Check if this creates a new conversation or updates existing
        const existingConversation = currentConversations.find(conv => conv.id === data.conversationId);

        if (!existingConversation) {
          // New conversation created - force complete cache refresh
          console.log('🔄 NEW CONVERSATION DETECTED - forcing complete refresh');
          queryClient.removeQueries({ queryKey: ['/api/messaging/conversations'] });
          queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
        } else {
          // Existing conversation - update the last message info immediately
          const updatedConversations = currentConversations.map(conv => {
            if (conv.id === data.conversationId) {
              return {
                ...conv,
                lastMessage: {
                  id: data.id,
                  content: data.content,
                  subject: data.subject || "",
                  priority: data.priority || "normal",
                  timestamp: data.timestamp || new Date().toISOString(),
                  senderId: data.senderId
                },
                updatedAt: new Date().toISOString()
              };
            }
            return conv;
          });

          // Update the cache immediately
          queryClient.setQueryData(['/api/messaging/conversations'], updatedConversations);
          queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
        }

        // Close dialog and reset form
        setShowNewMessage(false);
        resetNewMessage();

        // Open the conversation in Conversations tab
        if (data.conversationId) {
          console.log('💬 Opening conversation:', data.conversationId);

          // Switch to Conversations tab
          setActiveMessagingTab("conversations");

          // Wait a moment for conversations to refresh, then select and open the conversation
          setTimeout(() => {
            setSelectedConversation(data.conversationId);
            // Fetch messages for the conversation
            if (fetchMessages) {
              fetchMessages(data.conversationId, false);
            }
          }, 300);
        }
      } else {
        // Non-message types: don't create/update conversations, just send the message
        console.log('📧 NON-MESSAGE TYPE - no conversation created');

        // Invalidate SMS messages query if an SMS was sent
        if (variables.messageType === 'sms') {
          queryClient.invalidateQueries({ queryKey: ['/api/messaging/sms-messages'] });
        }

        // Close dialog and reset form
        setShowNewMessage(false);
        resetNewMessage();

        // Show different success message based on communication method
        let title = "Message Sent";
        let description = "Your message has been sent successfully.";

        if (variables.messageType === 'email') {
          title = "Email Sent Successfully";
          description = `Your email has been delivered successfully to the recipient.`;
        } else if (variables.messageType === 'sms') {
          title = "SMS Sent Successfully";
          description = `SMS delivered successfully to ${variables.phoneNumber} via Twilio. Check the SMS tab to see your message.`;
        } else if (variables.messageType === 'whatsapp') {
          title = "WhatsApp Sent Successfully";
          description = `WhatsApp message delivered successfully to ${variables.phoneNumber}.`;
        } else if (variables.messageType === 'voice') {
          title = "Voice Call Initiated";
          description = `Voice call with text-to-speech message initiated successfully to ${variables.phoneNumber || 'recipient'}.`;
        }

        showSuccess(title, description);
      }
    },
    onError: (error: any) => {
      console.error('Message sending failed:', error);
      // Extract a cleaner error message
      let errorMessage = error.message || "Failed to send message. Please check your configuration and try again.";

      // Remove redundant "Failed to send SMS:" prefix if present
      if (errorMessage.includes("Failed to send SMS:")) {
        errorMessage = errorMessage.replace("Failed to send SMS:", "").trim();
      }
      if (errorMessage.includes("Failed to send WhatsApp:")) {
        errorMessage = errorMessage.replace("Failed to send WhatsApp:", "").trim();
      }
      if (errorMessage.includes("Failed to send Voice:")) {
        errorMessage = errorMessage.replace("Failed to send Voice:", "").trim();
      }

      toast({
        title: "Message Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ conversationId, conversationName }: { conversationId: string; conversationName: string }) => {
      const response = await apiRequest('POST', `/api/messaging/conversations/${conversationId}/favorite`);
      const data = await response.json();
      return { ...data, conversationName };
    },
    onSuccess: (data) => {
      // Refetch conversations to update favorite status
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });

      // Show success toast for favoriting, modal for unfavoriting
      if (data.isFavorite) {
        toast({
          title: "Conversation Favorited",
          description: `Your conversation "${data.conversationName}" is favorited now`,
        });
      } else {
        // Show modal popup for unfavorite
        setUnfavoritedConversationName(data.conversationName);
        setShowUnfavoriteDialog(true);
      }
    },
    onError: (error) => {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onMutate: async (conversationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/messaging/conversations'] });

      // Snapshot the previous value
      const previousConversations = queryClient.getQueryData(['/api/messaging/conversations']);

      // Optimistically update to remove the conversation
      const currentConversations = (previousConversations as any[]) || [];
      const updatedConversations = currentConversations.filter(conv => conv.id !== conversationId);
      queryClient.setQueryData(['/api/messaging/conversations'], updatedConversations);

      // If we're currently viewing this conversation, go back to conversations list
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
      }

      return { previousConversations };
    },
    onSuccess: (data, conversationId) => {
      console.log('🗑️ CONVERSATION DELETED SUCCESS:', conversationId);

      showSuccess("Conversation Deleted", "The conversation has been permanently deleted.");
    },
    onError: (err, conversationId, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(['/api/messaging/conversations'], context.previousConversations);
      }

      console.error('Conversation deletion failed:', err);
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete conversation. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after mutation settles - force complete refresh
      queryClient.removeQueries({ queryKey: ['/api/messaging/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      // setTimeout(() => {
      //   refetchConversations();
      // }, 50);
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(campaignData),
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/sms-messages'] });
    }
  });

  const resetCampaignForm = () => {
    setNewCampaign({
      name: "",
      type: "email",
      subject: "",
      content: "",
      template: "default",
      recipients: [],
      sendMode: "now",
      scheduledDateTime: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    setCampaignRecipientRole("");
    setCampaignRecipientName("");
    setCampaignRecipientPhone("");
  };

  const personalizeMessage = (content: string, recipient: { name: string }) => {
    const nameParts = recipient.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return content
      .replace(/\[FirstName\]/gi, firstName)
      .replace(/\[LastName\]/gi, lastName);
  };

  const handleSendCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in campaign name and content.",
        variant: "destructive"
      });
      return;
    }

    if ((newCampaign.type === 'sms' || newCampaign.type === 'both') && newCampaign.recipients.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one recipient for SMS campaign.",
        variant: "destructive"
      });
      return;
    }

    if (newCampaign.sendMode === 'schedule' && !newCampaign.scheduledDateTime) {
      toast({
        title: "Validation Error",
        description: "Please select a scheduled date and time.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingCampaign(true);
    const deliveryLog: Array<{ recipient: string; phone: string; status: string; messageId?: string; error?: string }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    try {
      const token = localStorage.getItem('auth_token');

      // Send SMS to each recipient
      if (newCampaign.type === 'sms' || newCampaign.type === 'both') {
        for (const recipient of newCampaign.recipients) {
          if (!recipient.phone) {
            deliveryLog.push({
              recipient: recipient.name,
              phone: recipient.phone || 'N/A',
              status: 'failed',
              error: 'No phone number'
            });
            totalFailed++;
            continue;
          }

          try {
            const personalizedContent = personalizeMessage(newCampaign.content, recipient);

            const response = await fetch('/api/messaging/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                recipientName: recipient.name,
                recipientId: recipient.id,
                subject: newCampaign.subject,
                content: personalizedContent,
                priority: 'normal',
                type: 'patient',
                messageType: 'sms',
                phoneNumber: recipient.phone,
                campaignId: newCampaign.name
              }),
            });

            if (response.ok) {
              const data = await response.json();
              deliveryLog.push({
                recipient: recipient.name,
                phone: recipient.phone,
                status: 'sent',
                messageId: data.message?.externalMessageId || data.twilioSid
              });
              totalSent++;
            } else {
              const errorData = await response.json().catch(() => ({}));
              deliveryLog.push({
                recipient: recipient.name,
                phone: recipient.phone,
                status: 'failed',
                error: errorData.error || 'Failed to send'
              });
              totalFailed++;
            }
          } catch (err: any) {
            deliveryLog.push({
              recipient: recipient.name,
              phone: recipient.phone,
              status: 'failed',
              error: err.message || 'Network error'
            });
            totalFailed++;
          }
        }
      }

      // Create campaign record with recipients
      await createCampaignMutation.mutateAsync({
        name: newCampaign.name,
        type: newCampaign.type,
        subject: newCampaign.subject,
        content: newCampaign.content,
        template: newCampaign.template,
        status: newCampaign.sendMode === 'schedule' ? 'scheduled' : (totalSent > 0 ? 'sent' : 'draft'),
        recipientCount: newCampaign.recipients.length,
        sentCount: totalSent,
        openRate: 0,
        clickRate: 0,
        scheduledAt: newCampaign.sendMode === 'schedule' ? newCampaign.scheduledDateTime : null,
        timezone: newCampaign.timezone,
        recipients: newCampaign.recipients.map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          phone: r.phone,
          email: r.email || ''
        }))
      });

      setCampaignSummary({
        totalRecipients: newCampaign.recipients.length,
        totalSent,
        totalFailed,
        deliveryLog
      });

      setShowCreateCampaign(false);
      setShowCampaignSummary(true);
      resetCampaignForm();

    } catch (error: any) {
      toast({
        title: "Campaign Error",
        description: error.message || "An error occurred while sending the campaign.",
        variant: "destructive"
      });
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim() || !newCampaign.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (newCampaign.recipients.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one recipient.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createCampaignMutation.mutateAsync({
        ...newCampaign,
        status: newCampaign.sendMode === 'schedule' ? 'scheduled' : 'draft',
        recipientCount: newCampaign.recipients.length,
        sentCount: 0,
        openRate: 0,
        clickRate: 0,
        scheduledAt: newCampaign.sendMode === 'schedule' ? newCampaign.scheduledDateTime : null,
        timezone: newCampaign.timezone,
        recipients: newCampaign.recipients.map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          phone: r.phone,
          email: r.email || ''
        }))
      });

      setShowCreateCampaign(false);
      resetCampaignForm();
      toast({
        title: "Campaign Created",
        description: newCampaign.sendMode === 'schedule'
          ? "Your campaign has been scheduled successfully."
          : "Your campaign has been saved as draft. You can send it from the campaigns list.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign.",
        variant: "destructive"
      });
    }
  };

  const handleCreateCampaign = () => {
    handleSaveCampaign();
  };

  // Save and Send Campaign - saves to database then sends SMS one by one with progress
  const handleSaveAndSendCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim() || !newCampaign.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (newCampaign.recipients.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one recipient.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingCampaign(true);

    // Initialize sending recipients with pending status
    const initialRecipients = newCampaign.recipients.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      status: 'pending' as const
    }));
    setSendingRecipients(initialRecipients);
    setShowSendingProgress(true);

    try {
      // First create the campaign as draft
      const createdCampaign = await createCampaignMutation.mutateAsync({
        ...newCampaign,
        status: 'draft',
        recipientCount: newCampaign.recipients.length,
        sentCount: 0,
        openRate: 0,
        clickRate: 0,
        scheduledAt: null,
        timezone: newCampaign.timezone,
        recipients: newCampaign.recipients.map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          phone: r.phone,
          email: r.email || ''
        }))
      });

      if (createdCampaign && createdCampaign.id) {
        let totalSent = 0;
        let totalFailed = 0;
        const deliveryLog: Array<{ recipient: string; phone: string; status: string; error?: string }> = [];

        // Send SMS one by one
        for (let i = 0; i < newCampaign.recipients.length; i++) {
          const recipient = newCampaign.recipients[i];

          // Update status to sending
          setSendingRecipients(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'sending' as const } : r
          ));

          try {
            const response = await apiRequest('POST', `/api/messaging/campaigns/${createdCampaign.id}/send-single`, {
              recipient: {
                id: recipient.id,
                name: recipient.name,
                phone: recipient.phone,
                email: recipient.email
              },
              content: newCampaign.content,
              type: newCampaign.type,
              subject: newCampaign.subject
            });

            const result = await response.json();

            if (result.success) {
              totalSent++;
              deliveryLog.push({ recipient: recipient.name, phone: recipient.phone, status: 'sent' });
              setSendingRecipients(prev => prev.map((r, idx) =>
                idx === i ? { ...r, status: 'sent' as const } : r
              ));
            } else {
              totalFailed++;
              deliveryLog.push({ recipient: recipient.name, phone: recipient.phone, status: 'failed', error: result.error });
              setSendingRecipients(prev => prev.map((r, idx) =>
                idx === i ? { ...r, status: 'failed' as const, error: result.error } : r
              ));
            }
          } catch (err: any) {
            totalFailed++;
            deliveryLog.push({ recipient: recipient.name, phone: recipient.phone, status: 'failed', error: err.message });
            setSendingRecipients(prev => prev.map((r, idx) =>
              idx === i ? { ...r, status: 'failed' as const, error: err.message } : r
            ));
          }

          // Small delay between sends to avoid rate limiting
          if (i < newCampaign.recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Finalize the campaign status
        await apiRequest('POST', `/api/messaging/campaigns/${createdCampaign.id}/finalize-send`, {
          sentCount: totalSent
        });

        // Wait a moment so user can see the final status
        await new Promise(resolve => setTimeout(resolve, 1500));

        setShowSendingProgress(false);
        setShowCreateCampaign(false);
        resetCampaignForm();

        // Show campaign summary
        setCampaignSummary({
          totalRecipients: newCampaign.recipients.length,
          totalSent,
          totalFailed,
          deliveryLog
        });
        setShowCampaignSummary(true);

        toast({
          title: "Campaign Sent",
          description: `Campaign "${newCampaign.name}" has been sent to ${totalSent} recipient(s).`,
        });

        // Invalidate campaigns cache
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      }
    } catch (error: any) {
      setShowSendingProgress(false);
      toast({
        title: "Error",
        description: error.message || "Failed to save and send campaign.",
        variant: "destructive"
      });
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const addCampaignRecipient = () => {
    if (!campaignRecipientName) {
      toast({
        title: "Validation Error",
        description: "Please select a recipient name.",
        variant: "destructive"
      });
      return;
    }

    // Find the recipient in the filtered list
    const recipientsList = campaignRecipientRole === 'patient'
      ? (patientsData || [])
      : (usersData || []).filter((u: any) => u.role === campaignRecipientRole || !campaignRecipientRole);

    const recipient = recipientsList.find((r: any) => `${r.firstName} ${r.lastName}` === campaignRecipientName);

    if (!recipient) {
      toast({
        title: "Error",
        description: "Recipient not found.",
        variant: "destructive"
      });
      return;
    }

    // Check if already added
    if (newCampaign.recipients.some(r => r.id === recipient.id)) {
      toast({
        title: "Already Added",
        description: "This recipient is already in the list.",
        variant: "destructive"
      });
      return;
    }

    const phone = campaignRecipientPhone || recipient.phone || recipient.phoneNumber || recipient.mobile || '';
    const email = recipient.email || '';

    setNewCampaign(prev => ({
      ...prev,
      recipients: [...prev.recipients, {
        id: recipient.id,
        name: `${recipient.firstName} ${recipient.lastName}`,
        role: campaignRecipientRole,
        phone,
        email
      }]
    }));

    setCampaignRecipientName("");
    setCampaignRecipientPhone("");
  };

  const removeCampaignRecipient = (id: number) => {
    setNewCampaign(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== id)
    }));
  };

  const getCampaignFilteredRecipients = () => {
    if (!campaignRecipientRole) return [];
    if (campaignRecipientRole === 'patient') {
      return patientsData || [];
    }
    return (usersData || []).filter((u: any) => u.role === campaignRecipientRole);
  };

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(templateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      setShowCreateTemplate(false);
      setNewTemplate({
        name: "",
        category: "general",
        subject: "",
        content: ""
      });
      showSuccess("Template Created", "Your message template has been created successfully.");
    },
    onError: (error: any) => {
      console.error("Error creating template:", error);
      toast({
        title: "Failed to Create Template",
        description: error.message || "An error occurred while creating the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  // Fetch all users for Use Template dialog
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: showUseTemplate,
  });

  // Fetch roles for filter
  const { data: allRoles = [] } = useQuery<any[]>({
    queryKey: ['/api/roles'],
    enabled: showUseTemplate,
  });

  const useTemplateMutation = useMutation({
    mutationFn: async ({ templateId, recipients }: { templateId: number, recipients: string[] }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/templates/${templateId}/send-to-selected`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ recipients }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      setShowUseTemplate(false);
      setSelectedTemplate(null);
      setSelectedRecipients([]);
      setRecipientFilter({ role: "all", searchName: "" });
      showSuccess("Template Sent", data.message || `Email sent successfully to ${data.successCount} recipients.`);
    },
    onError: (error: any) => {
      console.error("Error sending template:", error);
      toast({
        title: "Failed to Send Template",
        description: error.message || "An error occurred while sending the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const editTemplateMutation = useMutation({
    mutationFn: async ({ templateId, templateData }: { templateId: number, templateData: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(templateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      setShowEditTemplate(false);
      setSelectedTemplate(null);
      setEditingTemplate({
        name: "",
        category: "general",
        subject: "",
        content: ""
      });
      showSuccess("Template Updated", "Your message template has been updated successfully.");
    },
    onError: (error: any) => {
      console.error("Error updating template:", error);
      toast({
        title: "Failed to Update Template",
        description: error.message || "An error occurred while updating the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          category: template.category,
          subject: template.subject,
          content: template.content
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      showSuccess("Template Copied", "Template has been copied successfully.");
    },
    onError: (error: any) => {
      console.error("Error copying template:", error);
      toast({
        title: "Failed to Copy Template",
        description: error.message || "An error occurred while copying the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setSelectedRecipients([]);  // Start with no recipients selected
    setRecipientFilter({ role: "all", searchName: "" });
    setShowUseTemplate(true);
  };

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setEditingTemplate({
      name: template.name,
      category: template.category,
      subject: template.subject,
      content: template.content
    });
    setShowEditTemplate(true);
  };

  const handleCopyTemplate = (template: any) => {
    // Get current templates from cache to generate default name
    const cachedTemplates = queryClient.getQueryData<any[]>(['/api/messaging/templates']) || [];
    const defaultName = generateDuplicateAnnouncementName(template.name, cachedTemplates, template.id);

    setAnnouncementToDuplicate(template);
    setDuplicateAnnouncementName(defaultName);
    setShowDuplicateAnnouncementDialog(true);
  };

  const duplicateAnnouncementMutation = useMutation({
    mutationFn: async ({ template, duplicateName }: { template: any; duplicateName: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: duplicateName,
          category: template.category,
          subject: template.subject,
          content: template.content
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      showSuccess("Announcement Duplicated", "Announcement has been duplicated successfully.");
      setShowDuplicateAnnouncementDialog(false);
      setAnnouncementToDuplicate(null);
      setDuplicateAnnouncementName("");
    },
    onError: (error: any) => {
      console.error("Error duplicating announcement:", error);
      toast({
        title: "Failed to Duplicate Announcement",
        description: error.message || "An error occurred while duplicating the announcement. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleConfirmDuplicateAnnouncement = () => {
    if (!duplicateAnnouncementName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an announcement name.",
        variant: "destructive"
      });
      return;
    }

    if (announcementToDuplicate) {
      duplicateAnnouncementMutation.mutate({
        template: announcementToDuplicate,
        duplicateName: duplicateAnnouncementName.trim()
      });
    }
  };

  const handleConfirmUseTemplate = () => {
    if (selectedTemplate && selectedRecipients.length > 0) {
      const recipientEmails = selectedRecipients.map(user => user.email);
      useTemplateMutation.mutate({
        templateId: selectedTemplate.id,
        recipients: recipientEmails
      });
    } else {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one recipient to send the email.",
        variant: "destructive"
      });
    }
  };

  const handleAddRecipient = (user: any) => {
    if (!selectedRecipients.find(r => r.id === user.id)) {
      setSelectedRecipients([...selectedRecipients, user]);
    }
  };

  const handleRemoveRecipient = (userId: number) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.id !== userId));
  };

  const handleSelectAllFiltered = () => {
    const filtered = getFilteredUsers();
    const newRecipients = [...selectedRecipients];
    filtered.forEach((user: any) => {
      if (!newRecipients.find(r => r.id === user.id)) {
        newRecipients.push(user);
      }
    });
    setSelectedRecipients(newRecipients);
  };

  const getFilteredUsers = () => {
    return allUsers.filter((user: any) => {
      const matchesRole = recipientFilter.role === "all" || user.role === recipientFilter.role;
      const matchesName = !recipientFilter.searchName ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(recipientFilter.searchName.toLowerCase()) ||
        user.email.toLowerCase().includes(recipientFilter.searchName.toLowerCase());
      return matchesRole && matchesName;
    });
  };

  const handleConfirmEditTemplate = () => {
    if (!editingTemplate.name.trim() || !editingTemplate.subject.trim() || !editingTemplate.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (selectedTemplate) {
      editTemplateMutation.mutate({
        templateId: selectedTemplate.id,
        templateData: editingTemplate
      });
    }
  };

  // Campaign mutations
  const editCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, campaignData }: { campaignId: number, campaignData: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(campaignData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      setShowEditCampaign(false);
      setSelectedCampaign(null);
      setEditingCampaign({
        name: "",
        type: "email",
        subject: "",
        content: "",
        template: "default",
        status: "draft",
        scheduledAt: "",
        recipientCount: 0,
        recipients: []
      });
      showSuccess("Campaign Updated", "Your campaign has been updated successfully.");
    },
    onError: (error: any) => {
      console.error("Error updating campaign:", error);
      toast({
        title: "Failed to Update Campaign",
        description: error.message || "An error occurred while updating the campaign. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Helper function to generate a unique duplicate campaign name
  const generateDuplicateCampaignName = (originalName: string, existingCampaigns: any[], excludeCampaignId?: number): string => {
    // Remove any existing "(Copy)", "(Copy N)", "-N", or "Follow-up N –" prefix/suffix to get the base name
    let baseName = originalName
      .replace(/\s*\(Copy(?:\s+\d+)?\)\s*$/, '') // Remove "(Copy)" or "(Copy N)"
      .replace(/-\d+$/, '') // Remove "-N" pattern
      .replace(/^Follow-up\s+\d+\s*–\s*/i, '') // Remove "Follow-up N –" prefix
      .trim();

    // Pattern to match names ending with "-N" where N is a number
    const numberedPattern = /^(.+?)-(\d+)$/;
    // Pattern to match "Follow-up N – [Name]" format
    const followUpPattern = /^Follow-up\s+(\d+)\s*–\s*(.+)$/i;
    const existingNumbers: number[] = [];

    existingCampaigns.forEach((c: any) => {
      // Skip the campaign being duplicated
      if (excludeCampaignId && c.id === excludeCampaignId) {
        return;
      }

      const name = c.name.trim();

      // Check for "Follow-up N – [Name]" pattern
      const followUpMatch = name.match(followUpPattern);
      if (followUpMatch) {
        const existingBase = followUpMatch[2].trim();
        if (existingBase === baseName) {
          const number = parseInt(followUpMatch[1], 10);
          if (!isNaN(number)) {
            existingNumbers.push(number);
          }
        }
      }

      // Check for numbered pattern: "baseName-N"
      const numberedMatch = name.match(numberedPattern);
      if (numberedMatch) {
        const existingBase = numberedMatch[1].trim();
        if (existingBase === baseName) {
          const number = parseInt(numberedMatch[2], 10);
          if (!isNaN(number)) {
            existingNumbers.push(number);
          }
        }
      }

      // Also check for old "(Copy)" pattern and convert it
      const copyPattern = /^(.+?)\s*\(Copy(?:\s+(\d+))?\)\s*$/;
      const copyMatch = name.match(copyPattern);
      if (copyMatch) {
        const existingBase = copyMatch[1].trim();
        if (existingBase === baseName) {
          const copyNumber = copyMatch[2] ? parseInt(copyMatch[2], 10) : 1;
          if (!isNaN(copyNumber)) {
            existingNumbers.push(copyNumber);
          }
        }
      }

      // Check if exact base name exists (without any suffix)
      if (name === baseName) {
        existingNumbers.push(0); // Treat base name as number 0
      }
    });

    // Find the next available number
    let nextNumber = 1;
    if (existingNumbers.length > 0) {
      const maxNumber = Math.max(...existingNumbers);
      nextNumber = maxNumber + 1;
    }

    // Generate the new name in format "Follow-up N – baseName"
    return `Follow-up ${nextNumber} – ${baseName}`;
  };

  // Helper function to generate a unique duplicate announcement name
  const generateDuplicateAnnouncementName = (originalName: string, existingAnnouncements: any[], excludeAnnouncementId?: number): string => {
    // Remove any existing "(Copy)", "(Copy N)", "-N", or "Follow-up N –" prefix/suffix to get the base name
    let baseName = originalName
      .replace(/\s*\(Copy(?:\s+\d+)?\)\s*$/, '') // Remove "(Copy)" or "(Copy N)"
      .replace(/-\d+$/, '') // Remove "-N" pattern
      .replace(/^Follow-up\s+\d+\s*–\s*/i, '') // Remove "Follow-up N –" prefix
      .trim();

    // Pattern to match names ending with "-N" where N is a number
    const numberedPattern = /^(.+?)-(\d+)$/;
    // Pattern to match "Follow-up N – [Name]" format
    const followUpPattern = /^Follow-up\s+(\d+)\s*–\s*(.+)$/i;
    const existingNumbers: number[] = [];

    existingAnnouncements.forEach((a: any) => {
      // Skip the announcement being duplicated
      if (excludeAnnouncementId && a.id === excludeAnnouncementId) {
        return;
      }

      const name = a.name.trim();

      // Check for "Follow-up N – [Name]" pattern
      const followUpMatch = name.match(followUpPattern);
      if (followUpMatch) {
        const existingBase = followUpMatch[2].trim();
        if (existingBase === baseName) {
          const number = parseInt(followUpMatch[1], 10);
          if (!isNaN(number)) {
            existingNumbers.push(number);
          }
        }
      }

      // Check for numbered pattern: "baseName-N"
      const numberedMatch = name.match(numberedPattern);
      if (numberedMatch) {
        const existingBase = numberedMatch[1].trim();
        if (existingBase === baseName) {
          const number = parseInt(numberedMatch[2], 10);
          if (!isNaN(number)) {
            existingNumbers.push(number);
          }
        }
      }

      // Also check for old "(Copy)" pattern and convert it
      const copyPattern = /^(.+?)\s*\(Copy(?:\s+(\d+))?\)\s*$/;
      const copyMatch = name.match(copyPattern);
      if (copyMatch) {
        const existingBase = copyMatch[1].trim();
        if (existingBase === baseName) {
          const copyNumber = copyMatch[2] ? parseInt(copyMatch[2], 10) : 1;
          if (!isNaN(copyNumber)) {
            existingNumbers.push(copyNumber);
          }
        }
      }

      // Check if exact base name exists (without any suffix)
      if (name === baseName) {
        existingNumbers.push(0); // Treat base name as number 0
      }
    });

    // Find the next available number
    let nextNumber = 1;
    if (existingNumbers.length > 0) {
      const maxNumber = Math.max(...existingNumbers);
      nextNumber = maxNumber + 1;
    }

    // Generate the new name in format "Follow-up N – baseName"
    return `Follow-up ${nextNumber} – ${baseName}`;
  };

  const duplicateCampaignMutation = useMutation({
    mutationFn: async ({ campaign, duplicateName }: { campaign: any; duplicateName: string }) => {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/messaging/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: duplicateName,
          type: campaign.type,
          subject: campaign.subject,
          content: campaign.content,
          template: campaign.template,
          status: "draft",
          recipientCount: 0,
          sentCount: 0,
          openRate: 0,
          clickRate: 0
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      showSuccess("Campaign Duplicated", "Campaign has been duplicated successfully.");
      setShowDuplicateCampaignDialog(false);
      setCampaignToDuplicate(null);
      setDuplicateCampaignName("");
    },
    onError: (error: any) => {
      console.error("Error duplicating campaign:", error);
      toast({
        title: "Failed to Duplicate Campaign",
        description: error.message || "An error occurred while duplicating the campaign. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleEditCampaign = (campaign: any) => {
    setSelectedCampaign(campaign);
    setEditingCampaign({
      name: campaign.name,
      type: campaign.type,
      subject: campaign.subject,
      content: campaign.content,
      template: campaign.template || "default",
      status: campaign.status || "draft",
      scheduledAt: campaign.scheduledAt || "",
      recipientCount: campaign.recipientCount || 0,
      recipients: campaign.recipients || []
    });
    setEditCampaignRecipientRole("");
    setEditCampaignRecipientName("");
    setEditCampaignRecipientPhone("");
    setShowEditCampaign(true);
  };

  const handleViewCampaign = (campaign: any) => {
    setViewingCampaign(campaign);
    setShowViewCampaignRecipients(false);
    setShowViewCampaign(true);
  };

  const getEditCampaignFilteredRecipients = () => {
    if (editCampaignRecipientRole === 'patient') {
      return patientsData || [];
    }
    if (editCampaignRecipientRole) {
      return (usersData || []).filter((u: any) => u.role === editCampaignRecipientRole);
    }
    return [];
  };

  const addEditCampaignRecipient = () => {
    if (!editCampaignRecipientName) {
      toast({
        title: "Validation Error",
        description: "Please select a recipient name.",
        variant: "destructive"
      });
      return;
    }

    const recipientsList = editCampaignRecipientRole === 'patient'
      ? (patientsData || [])
      : (usersData || []).filter((u: any) => u.role === editCampaignRecipientRole || !editCampaignRecipientRole);

    const recipient = recipientsList.find((r: any) => `${r.firstName} ${r.lastName}` === editCampaignRecipientName);

    if (!recipient) {
      toast({
        title: "Error",
        description: "Recipient not found.",
        variant: "destructive"
      });
      return;
    }

    if (editingCampaign.recipients.some(r => r.id === recipient.id)) {
      toast({
        title: "Already Added",
        description: "This recipient is already in the list.",
        variant: "destructive"
      });
      return;
    }

    const phone = editCampaignRecipientPhone || recipient.phone || recipient.phoneNumber || recipient.mobile || '';
    const email = recipient.email || '';

    setEditingCampaign(prev => ({
      ...prev,
      recipients: [...prev.recipients, {
        id: recipient.id,
        name: `${recipient.firstName} ${recipient.lastName}`,
        role: editCampaignRecipientRole,
        phone,
        email
      }],
      recipientCount: prev.recipients.length + 1
    }));

    setEditCampaignRecipientRole("");
    setEditCampaignRecipientName("");
    setEditCampaignRecipientPhone("");
  };

  const removeEditCampaignRecipient = (recipientId: number) => {
    setEditingCampaign(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== recipientId),
      recipientCount: prev.recipients.length - 1
    }));
  };

  const handleDuplicateCampaign = (campaign: any) => {
    // Get current campaigns from cache to generate default name
    const cachedCampaigns = queryClient.getQueryData<any[]>(['/api/messaging/campaigns']) || [];
    const defaultName = generateDuplicateCampaignName(campaign.name, cachedCampaigns, campaign.id);

    setCampaignToDuplicate(campaign);
    setDuplicateCampaignName(defaultName);
    setShowDuplicateCampaignDialog(true);
  };

  const handleConfirmDuplicateCampaign = () => {
    if (!duplicateCampaignName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a campaign name.",
        variant: "destructive"
      });
      return;
    }

    if (campaignToDuplicate) {
      duplicateCampaignMutation.mutate({
        campaign: campaignToDuplicate,
        duplicateName: duplicateCampaignName.trim()
      });
    }
  };

  const handleConfirmEditCampaign = () => {
    if (!editingCampaign.name.trim() || !editingCampaign.subject.trim() || !editingCampaign.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (selectedCampaign) {
      editCampaignMutation.mutate({
        campaignId: selectedCampaign.id,
        campaignData: editingCampaign
      });
    }
  };

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      showSuccess("Campaign Deleted", "Campaign has been deleted successfully.");
    },
    onError: (error: any) => {
      console.error("Error deleting campaign:", error);
      toast({
        title: "Failed to Delete Campaign",
        description: error.message || "An error occurred while deleting the campaign. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteCampaign = (campaign: any) => {
    setCampaignToDelete(campaign);
    setShowDeleteCampaign(true);
  };

  const handleConfirmDeleteCampaign = () => {
    if (campaignToDelete) {
      deleteCampaignMutation.mutate(campaignToDelete.id);
      setShowDeleteCampaign(false);
      setCampaignToDelete(null);
    }
  };

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSendingCampaignId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      setCampaignSummary({
        totalRecipients: data.totalRecipients,
        totalSent: data.totalSent,
        totalFailed: data.totalFailed,
        deliveryLog: data.deliveryLog || []
      });
      setShowCampaignSummary(true);
      showSuccess("Campaign Sent", `Successfully sent to ${data.totalSent} recipients.`);
    },
    onError: (error: any) => {
      setSendingCampaignId(null);
      console.error("Error sending campaign:", error);
      toast({
        title: "Failed to Send Campaign",
        description: error.message || "An error occurred while sending the campaign.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always reset sending campaign ID when mutation completes (success or error)
      setSendingCampaignId(null);
    }
  });

  const handleSendExistingCampaign = (campaign: any, event?: React.MouseEvent) => {
    // Prevent event propagation to avoid multiple triggers
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Prevent sending if already sending this specific campaign
    if (sendingCampaignId === campaign.id) {
      return;
    }

    // Check if campaign has recipients - check both recipients array and recipientCount
    const hasRecipients = (campaign.recipients && Array.isArray(campaign.recipients) && campaign.recipients.length > 0) ||
      (campaign.recipientCount && campaign.recipientCount > 0);

    if (!hasRecipients) {
      setShowNoRecipientsDialog(true);
      return;
    }

    // Allow resending even if status is 'sent' (that's what "Resend Campaign" is for)
    // Set the sending campaign ID immediately to prevent multiple clicks
    setSendingCampaignId(campaign.id);
    sendCampaignMutation.mutate(campaign.id);
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      showSuccess("Template Deleted", "Template has been deleted successfully.");
    },
    onError: (error: any) => {
      console.error("Error deleting template:", error);
      toast({
        title: "Failed to Delete Template",
        description: error.message || "An error occurred while deleting the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteTemplate = (template: any) => {
    setTemplateToDelete(template);
    setShowDeleteTemplate(true);
  };

  const handleConfirmDeleteTemplate = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
      setShowDeleteTemplate(false);
      setTemplateToDelete(null);
    }
  };

  // Polling-based real-time messaging as WebSocket fallback
  useEffect(() => {
    if (!currentUser) {
      console.log('🔗 Real-time: No currentUser, skipping connection');
      return;
    }

    console.log('🔗 Setting up polling-based real-time messaging for user:', currentUser.id);

    // Reduced polling interval to prevent UI blinking
    const messagePollingInterval = setInterval(() => {
      // Only poll if user is on messaging page and WebSocket is not connected
      // Use preserveExisting=true to avoid flicker and preserve timestamps
      if (selectedConversation && fetchMessages) {
        fetchMessages(selectedConversation, true); // preserveExisting=true to maintain timestamps
      }

      // Less frequent conversation refresh to reduce API calls
      refetchConversations();
    }, 5000); // Check every 5 seconds instead of 2

    // Also attempt WebSocket as primary method with robust URL construction
    const url = new URL('/ws', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = url.toString();
    console.log('🔗 WebSocket: URL:', wsUrl);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('🔗 WebSocket connected successfully');
      try {
        // Authenticate with the server
        const authMessage = {
          type: 'auth',
          userId: currentUser.id
        };
        console.log('🔗 WebSocket: Sending authentication:', authMessage);
        socket.send(JSON.stringify(authMessage));
      } catch (error) {
        console.error('❌ WebSocket authentication error:', error);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);

        if (data.type === 'new_message') {
          console.log('📨 WebSocket message received:', data);
          console.log('🔄 New message received via WebSocket, refreshing UI immediately');

          // Extract conversationId from different possible locations
          const messageConversationId = data.data?.conversationId || data.message?.conversationId || data.conversationId;
          console.log('🔍 Extracted conversationId for WebSocket:', messageConversationId);

          // If we have the message data directly, add it with server's UTC timestamp
          // Server stores timestamps in UTC - we preserve them and convert to local time for display
          if (data.message && selectedConversation && messageConversationId === selectedConversation) {
            const receivedMessage = data.message;

            // CRITICAL: Always use server's UTC timestamp (not current local time)
            // Server stores timestamps in UTC to avoid timezone confusion
            let serverUtcTimestamp = receivedMessage.timestamp || receivedMessage.createdAt;

            if (!serverUtcTimestamp) {
              console.warn('⚠️ WebSocket message missing UTC timestamp:', receivedMessage);
              // Use current UTC time if missing
              serverUtcTimestamp = new Date().toISOString();
            } else {
              // Validate timestamp is a valid date, but use it as-is from server
              const timestampDate = new Date(serverUtcTimestamp);
              if (!isNaN(timestampDate.getTime())) {
                // Use server timestamp exactly as received - no conversion needed
                // Server handles UTC, we just use it as-is
                serverUtcTimestamp = String(serverUtcTimestamp);
                console.log('📨 Using server timestamp as-is for received message:', serverUtcTimestamp, '-> Parsed as:', timestampDate.toLocaleString());
              } else {
                console.error('❌ Invalid timestamp format in WebSocket message:', serverUtcTimestamp);
                // Fallback to current UTC time
                serverUtcTimestamp = new Date().toISOString();
              }
            }

            // Add the message with server's UTC timestamp
            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(m => m.id === receivedMessage.id);
              if (exists) {
                return prev; // Don't add duplicate
              }

              // Add new message - ALWAYS use server's UTC timestamp in ISO format
              const newMessage = {
                ...receivedMessage,
                timestamp: serverUtcTimestamp // UTC timestamp in ISO format
              };

              // Validate the timestamp one more time
              const timestampDate = new Date(newMessage.timestamp);
              if (isNaN(timestampDate.getTime())) {
                console.error('❌ Invalid UTC timestamp after normalization:', newMessage.timestamp);
                // Fallback to current UTC time
                newMessage.timestamp = new Date().toISOString();
              }

              // Sort by timestamp (ascending - oldest first, newest last)
              const updated = [...prev, newMessage].sort((a, b) => {
                // Ensure timestamps are valid dates
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

                // Handle invalid dates
                if (isNaN(timeA) || isNaN(timeB)) {
                  console.warn('⚠️ Invalid timestamp in WebSocket message:', { a: a.timestamp, b: b.timestamp });
                  return 0;
                }

                // Ascending order: oldest messages first, newest messages last
                return timeA - timeB;
              });

              console.log('📨 Added real-time message with server UTC timestamp:', newMessage.timestamp,
                '-> Local time:', timestampDate.toLocaleString());
              return updated;
            });
          }

          // Force immediate refresh of current conversation if it matches
          // Use preserveExisting=true to avoid flicker and preserve optimistic timestamps
          if (selectedConversation && messageConversationId === selectedConversation && fetchMessages) {
            console.log('🔥 IMMEDIATE REFETCH - Current conversation matches WebSocket message');
            // Small delay to ensure message was added above
            setTimeout(() => {
              fetchMessages(selectedConversation, true); // preserveExisting=true to maintain timestamps
            }, 100);
          }

          // Always refresh conversations to update sidebar
          console.log('🔥 FORCE REFETCH ALL CONVERSATIONS - WebSocket triggered');
          refetchConversations();

          // Show toast notification
          toast({
            title: "New Message",
            description: `New message received`,
          });
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('🔗 WebSocket disconnected:', event.code, event.reason);
      // Log disconnection but don't force reload - polling will handle real-time updates
      if (event.code === 1006) {
        console.log('🔄 Abnormal WebSocket closure detected - polling system will maintain real-time updates');
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
      // Prevent unhandled promise rejections
      if (error instanceof Error) {
        return Promise.resolve();
      }
    };

    // Cleanup on unmount
    return () => {
      console.log('🔗 Real-time: Cleaning up polling and WebSocket connection');
      clearInterval(messagePollingInterval);
      socket.close();
    };
  }, [currentUser, toast, selectedConversation, fetchMessages]);

  const handleSendNewMessage = () => {
    // Reset validation errors
    const errors: {
      recipientRole?: string;
      recipientName?: string;
      subject?: string;
      phoneNumber?: string;
      content?: string;
    } = {};

    // Validate required fields
    if (user?.role === 'admin' || user?.role === 'patient') {
      if (!selectedRecipientRole.trim()) {
        errors.recipientRole = "Please select a role";
      }
      if (!selectedRecipientUser.trim()) {
        errors.recipientName = "Please select a recipient";
      }
    } else {
      if (!newMessage.recipient.trim()) {
        errors.recipientName = "Please select a recipient";
      }
    }

    if (!newMessage.subject.trim()) {
      errors.subject = "Please enter a subject";
    }

    if (!newMessage.content.trim()) {
      errors.content = "Please enter message content";
    }

    // Validate message type is selected
    if (!newMessage.messageType || newMessage.messageType.trim() === '') {
      errors.recipientName = "Please select a message type";
    }

    // Validate phone number for SMS/WhatsApp/Voice
    if ((newMessage.messageType === 'sms' || newMessage.messageType === 'whatsapp' || newMessage.messageType === 'voice') && !newMessage.phoneNumber.trim()) {
      errors.phoneNumber = "Please enter a phone number";
    }

    // Set validation errors
    setValidationErrors(errors);

    // If there are any errors, don't proceed
    if (Object.keys(errors).length > 0) {
      return;
    }

    // CRITICAL: Determine behavior based on message type
    // If "Message" is selected: create conversation (internal message)
    // If other types are selected: send only that type without creating conversation
    const isMessageType = newMessage.messageType === 'message';
    const effectiveType = isMessageType
      ? 'internal'  // Message type creates internal conversation
      : 'patient';  // Other types (SMS/Email/WhatsApp/Voice) are external, no conversation

    // Get recipient email from filteredRecipients if available (for email type messages)
    let recipientEmail = undefined;
    if (newMessage.messageType === 'email' && newMessage.recipient) {
      const recipient = filteredRecipients.find((r: any) => String(r.id) === String(newMessage.recipient));
      if (recipient && recipient.email) {
        recipientEmail = recipient.email;
        console.log('📧 Frontend: Found recipient email:', recipientEmail, 'for recipientId:', newMessage.recipient);
      }
    }

    sendMessageMutation.mutate({
      recipientId: newMessage.recipient,
      subject: newMessage.subject,
      content: newMessage.content,
      priority: newMessage.priority,
      type: effectiveType,
      phoneNumber: newMessage.phoneNumber,
      messageType: isMessageType ? undefined : newMessage.messageType, // Only send messageType for non-message types
      createConversation: isMessageType, // Flag to indicate if conversation should be created
      recipientEmail: recipientEmail // Include email as fallback for backend lookup
    });
  };

  const handleSendConversationMessage = async () => {
    if (!newMessageContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a conversation first.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive"
      });
      return;
    }

    const messageContent = newMessageContent.trim();
    console.log('📨 Sending message to conversation:', selectedConversation);
    console.log('📨 Message content:', messageContent);

    // Find the other participant to ensure we have the correct recipientId
    const currentConversation = conversations.find((c: Conversation) => c.id === selectedConversation);
    const otherParticipant = currentConversation?.participants?.find((p: any) =>
      p.id !== currentUser.id && String(p.id) !== String(currentUser.id)
    );

    if (!otherParticipant) {
      toast({
        title: "Error",
        description: "Could not find recipient in conversation.",
        variant: "destructive"
      });
      return;
    }

    console.log('📨 Other participant:', otherParticipant);
    console.log('📨 Current user ID:', currentUser.id);

    // Store a temporary message ID for optimistic update
    const tempMessageId = `temp-${Date.now()}`;
    // Create UTC timestamp for optimistic message - this will match server behavior
    // Using UTC ensures both sender and receiver see the same time after local timezone conversion
    const optimisticUtcTimestamp = new Date().toISOString();
    const optimisticMessage = {
      id: tempMessageId,
      senderId: currentUser?.id,
      senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
      senderRole: currentUser?.role || 'user',
      recipientId: '',
      recipientName: '',
      subject: '',
      content: messageContent,
      timestamp: optimisticUtcTimestamp, // UTC timestamp in ISO format
      isRead: false,
      priority: 'normal' as const,
      type: 'internal' as const,
      isStarred: false
    };

    // Optimistically add message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessageContent(""); // Clear input immediately

    try {
      // For patient conversations, get phone from stored messages or participant
      const phoneNumber = messages?.[0]?.phoneNumber || otherParticipant?.phone;
      const messageType = 'sms'; // Default to SMS for external messages

      // Determine if this should be sent as external SMS (only for patients with phone numbers)
      const isExternalMessage = phoneNumber && messageType && otherParticipant?.role === 'patient';

      // Debug logging
      console.log('🔍 SMS DETECTION DEBUG:');
      console.log('  Other participant:', otherParticipant);
      console.log('  Phone number:', phoneNumber);
      console.log('  Message type:', messageType);
      console.log('  Is external:', isExternalMessage);

      // CRITICAL: Ensure recipientId is included in message data
      // This ensures the backend can find or create the correct conversation
      const messageData = {
        conversationId: selectedConversation,
        recipientId: otherParticipant.id, // Include recipientId for proper conversation lookup
        content: messageContent,
        priority: 'normal',
        type: isExternalMessage ? 'patient' : 'internal',
        phoneNumber: isExternalMessage ? phoneNumber : undefined,
        messageType: isExternalMessage ? messageType : undefined
      };
      console.log('🔥 CONVERSATION MESSAGE DATA:', messageData);
      console.log('🔥 Selected conversation ID:', selectedConversation);

      // Use direct API call with proper error handling (avoids false error notifications)
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to send message: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🔥 CONVERSATION MESSAGE RESPONSE:', responseData);

      // Replace the optimistic message with the real one from server
      setMessages(prev => {
        // Remove the temporary message and add the real one
        const filtered = prev.filter(m => m.id !== tempMessageId);
        const optimisticMsg = prev.find(m => m.id === tempMessageId);

        // Always use server's timestamp and normalize to UTC ISO format
        // The server timestamp is the source of truth for both sender and receiver
        // We normalize it to ensure consistent UTC format for display
        const serverTimestamp = responseData.timestamp || responseData.createdAt || null;

        let finalTimestamp: string;
        if (serverTimestamp) {
          // Validate the timestamp and normalize to UTC ISO format
          const serverDate = new Date(serverTimestamp);
          if (!isNaN(serverDate.getTime())) {
            // Convert to UTC ISO string to ensure consistent format
            // This ensures both sender and receiver see the same time after local conversion
            finalTimestamp = serverDate.toISOString();
            console.log('📨 Normalized server timestamp to UTC for sent message:', serverTimestamp, '-> UTC:', finalTimestamp, '-> Local:', serverDate.toLocaleString());
          } else {
            console.warn('⚠️ Invalid server timestamp in response:', serverTimestamp);
            // Fallback to current UTC time
            finalTimestamp = new Date().toISOString();
          }
        } else {
          // No server timestamp - use current UTC time
          console.warn('⚠️ No server timestamp in response, using current UTC time');
          finalTimestamp = new Date().toISOString();
        }

        const realMessage = {
          id: responseData.id,
          senderId: responseData.senderId || currentUser?.id,
          senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
          senderRole: currentUser?.role || 'user',
          recipientId: responseData.recipientId,
          recipientName: responseData.recipientName,
          subject: responseData.subject || '',
          content: responseData.content || messageContent,
          timestamp: finalTimestamp, // Preserve optimistic timestamp to prevent timezone conversion
          isRead: false,
          priority: responseData.priority || 'normal',
          type: responseData.type || 'internal',
          isStarred: false,
          tags: responseData.tags || [] // Include tags if present
        };

        // Sort messages by timestamp to maintain order (ascending - oldest first, newest last)
        const updated = [...filtered, realMessage].sort((a, b) => {
          // Ensure timestamps are valid dates
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

          // Handle invalid dates
          if (isNaN(timeA) || isNaN(timeB)) {
            console.warn('⚠️ Invalid timestamp in sent message:', { a: a.timestamp, b: b.timestamp });
            return 0;
          }

          // Ascending order: oldest messages first, newest messages last
          return timeA - timeB;
        });
        return updated;
      });

      // Immediately refetch to get any real-time updates and ensure consistency
      // Use preserveExisting to avoid flicker
      if (selectedConversation) {
        setTimeout(() => {
          fetchMessages(selectedConversation, true);
        }, 500);
      }

      // Update conversations cache for persistence
      const currentConversations = queryClient.getQueryData(['/api/messaging/conversations']) as any[] || [];
      const existingConversation = currentConversations.find(conv => conv.id === responseData.conversationId);

      if (!existingConversation) {
        // New conversation created - force complete cache refresh
        console.log('🔄 NEW CONVERSATION DETECTED - forcing complete refresh');
        queryClient.removeQueries({ queryKey: ['/api/messaging/conversations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      } else {
        // Update existing conversation cache
        const updatedConversations = currentConversations.map(conv => {
          if (conv.id === responseData.conversationId) {
            return {
              ...conv,
              lastMessage: {
                id: responseData.id,
                content: responseData.content,
                priority: responseData.priority || "normal",
                timestamp: responseData.timestamp || new Date().toISOString(),
                senderId: responseData.senderId
              },
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        queryClient.setQueryData(['/api/messaging/conversations'], updatedConversations);
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      }

      // Refetch messages to ensure we have the latest data from server (with a small delay to ensure server has processed)
      // Don't refetch immediately - the optimistic update already shows the message
      // Only refetch if needed for consistency, but preserve the current messages
      console.log('🔥 MESSAGE SENT SUCCESSFULLY - Keeping optimistic update');

      // Show inline "Message sent" with green tick inside message area for 10 seconds, then hide
      setShowSentConfirmation(true);
      setTimeout(() => setShowSentConfirmation(false), 10000);

      // Auto scroll down so new message and "Message sent" are visible
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);

    } catch (error: any) {
      // Remove the optimistic message since send failed
      setMessages(prev => prev.filter(m => m.id !== tempMessageId));

      // Restore the message content if send failed
      setNewMessageContent(messageContent);
      console.error('🔥 CONVERSATION MESSAGE ERROR:', error);

      // Show error notification only on actual failure
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };



  const handleStartVideoCall = async () => {
    // Clear previous validation errors
    setValidationErrors(prev => ({
      ...prev,
      videoCallParticipant: undefined,
      videoCallScheduledTime: undefined
    }));

    // Validate participant
    if (!videoCall.participant.trim() || !selectedVideoCallParticipant) {
      setValidationErrors(prev => ({
        ...prev,
        videoCallParticipant: "Please select a participant for the video call."
      }));
      return;
    }

    // Validate scheduled time if scheduling for later
    if (videoCall.scheduled) {
      if (!videoCall.scheduledTime.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          videoCallScheduledTime: "Please select a scheduled time for the video call."
        }));
        return;
      }

      // Check if scheduled time is in the future
      const scheduledDateTime = new Date(videoCall.scheduledTime);
      const now = new Date();
      if (scheduledDateTime <= now) {
        setValidationErrors(prev => ({
          ...prev,
          videoCallScheduledTime: "Scheduled time must be in the future."
        }));
        return;
      }

      // For scheduled calls, save to database and send email notifications
      try {
        const scheduledDateTime = new Date(videoCall.scheduledTime);
        const participant = selectedVideoCallParticipant;

        // Call API to schedule the video call
        const response = await apiRequest('POST', '/api/video-calls/schedule', {
          participantId: participant.id,
          participantName: getDisplayName(participant),
          participantEmail: participant.email,
          participantRole: participant.role,
          scheduledAt: scheduledDateTime.toISOString(),
          duration: parseInt(videoCall.duration),
          callType: videoCall.type,
          organizationId: user?.organizationId
        });

        if (response.success) {
          // Show success modal
          setScheduledCallInfo({
            participantName: getDisplayName(participant),
            scheduledTime: format(scheduledDateTime, 'PPpp')
          });
          setShowScheduledCallSuccess(true);

          // Reset form and close dialog
          setShowVideoCall(false);
          setVideoCall({
            participant: "",
            type: "consultation",
            duration: "30",
            scheduled: false,
            scheduledTime: ""
          });
          setSelectedVideoCallParticipant(null);
          setSelectedRecipientRole("");
          setSelectedRecipientUser("");
          setVideoCallPatientSearch("");
          setValidationErrors(prev => ({
            ...prev,
            videoCallParticipant: undefined,
            videoCallScheduledTime: undefined
          }));
        } else {
          throw new Error(response.error || 'Failed to schedule video call');
        }
      } catch (error: any) {
        console.error('Error scheduling video call:', error);
        toast({
          title: "Scheduling Failed",
          description: error?.message || "Unable to schedule video call. Please try again.",
          variant: "destructive"
        });
      }
      return;
    }

    // For immediate calls, use LiveKit
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start a video call",
          variant: "destructive",
        });
        return;
      }

      const participant = selectedVideoCallParticipant;
      const fromIdentifier = buildParticipantIdentifier(user, user.role);
      const toIdentifier = buildParticipantIdentifier(participant, participant.role);

      if (!fromIdentifier || !toIdentifier) {
        toast({
          title: "Call Failed",
          description: "Unable to determine participant identifiers",
          variant: "destructive",
        });
        return;
      }

      const roomName = `messaging-video-${user.id}-${participant.id}-${Date.now()}`;

      toast({
        title: "Video Call Starting",
        description: `Connecting to video call with ${getDisplayName(participant)}`,
      });

      const liveKitRoom = await createRemoteLiveKitRoom({
        roomId: roomName,
        fromUsername: fromIdentifier,
        toUsers: [
          {
            identifier: toIdentifier,
            displayName: getDisplayName(participant),
          },
        ],
        isVideo: true,
        groupName: "Messaging Video Call",
      });

      const finalRoomId = liveKitRoom.roomId || roomName;

      emitMessagingIncomingInvite({
        roomName: finalRoomId,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        e2eeKey: liveKitRoom.e2eeKey,
        fromIdentifier,
        toIdentifier,
        isVideo: true,
      });

      // Close dialog and start LiveKit video call
      setShowVideoCall(false);
      setLiveKitVideoCall({
        roomName: finalRoomId,
        participant,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        initiatorSocketId: fromIdentifier,
        participantSocketId: toIdentifier,
      });

      // Reset form and clear validation errors only on success
      setVideoCall({
        participant: "",
        type: "consultation",
        duration: "30",
        scheduled: false,
        scheduledTime: ""
      });
      setSelectedVideoCallParticipant(null);
      setSelectedRecipientRole("");
      setSelectedRecipientUser("");
      setVideoCallPatientSearch("");
      setValidationErrors(prev => ({
        ...prev,
        videoCallParticipant: undefined,
        videoCallScheduledTime: undefined
      }));

    } catch (error: any) {
      console.error('Error creating LiveKit video call:', error);
      const errorMessage = error?.message || "Unable to start video call. Please try again.";
      toast({
        title: "Call Failed",
        description: errorMessage,
        variant: "destructive"
      });
      // Don't reset form on error so user can try again
    }
  };

  const handleEndVideoCall = async () => {
    // End BigBlueButton meeting if we have meeting info
    if (meetingInfo) {
      try {
        const response = await fetch(`/api/video-conference/end/${meetingInfo.meetingID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moderatorPassword: meetingInfo.moderatorPassword
          })
        });

        if (response.ok) {
          toast({
            title: "Meeting Ended",
            description: "BigBlueButton meeting has been terminated.",
          });
        }
      } catch (error) {
        console.error('Error ending meeting:', error);
      }
    }

    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear timer
    if (callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
    }

    setActiveVideoCall(false);
    setCallParticipant("");
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOn(true);
    setMeetingInfo(null);

    toast({
      title: "Call Ended",
      description: "Video call has been terminated.",
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Microphone On" : "Microphone Muted",
      description: isMuted ? "You are now unmuted" : "You are now muted",
    });
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    toast({
      title: isVideoOn ? "Camera Off" : "Camera On",
      description: isVideoOn ? "Your video is now off" : "Your video is now on",
    });
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Delete conversation function
  const handleDeleteConversation = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId);
  };

  // CRITICAL: Filter conversations to only show those where current user is a participant
  // This ensures role-based visibility - users only see conversations they are part of
  // Backend already filters, but this adds an extra security layer on the frontend
  const filteredConversations = (conversations || []).filter((conv: Conversation) => {
    // Security check: Only show conversations where current user is a participant
    if (currentUser && currentUser.id) {
      const isParticipant = conv.participants.some(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
        return pId === currentUser.id;
      });
      if (!isParticipant) {
        console.log(`🚫 FILTERED OUT - User ${currentUser.id} is not a participant in conversation ${conv.id}`);
        return false;
      }
    }

    // Apply message filters
    if (messageFilter === "unread" && conv.unreadCount === 0) return false;
    if (messageFilter === "patients" && !conv.isPatientConversation) return false;
    if (messageFilter === "staff" && conv.isPatientConversation) return false;
    if (searchQuery && conv.lastMessage && !conv.lastMessage.subject?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'scheduled': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'paused': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'draft': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  if (conversationsLoading || campaignsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }



  return (
    <div className="h-screen flex flex-col overflow-hidden max-w-full w-full min-h-0">
      {/* Top row: Header + Theme Toggle */}
      <div className="flex items-center justify-between gap-1.5 bg-white dark:bg-card px-2 py-0.5 rounded flex-shrink-0 min-w-0 max-w-full">
        <Header
          title="Messaging Center"
          subtitle="Secure communication with patients and staff"
          hideNotificationBell={true}
          hideAiStatus={true}
          hideRegionalSettings={true}
          hideSignOut={true}
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* AI Status Indicator */}
          {tenant?.settings?.features?.aiEnabled && (
            <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-900 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-200">AI Active</span>
            </div>
          )}

          {/* Regional Settings */}
          <div className="hidden sm:flex items-center space-x-1 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-lg">
            <Globe className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
            <span className="text-[10px] uppercase font-bold text-neutral-700 dark:text-neutral-300">
              {tenant?.region?.substring(0, 2)}/{tenant?.settings?.compliance?.gdprEnabled ? "GDPR" : "Std"}
            </span>
          </div>

          <NotificationBell />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">Theme:</span>
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            className="ml-1.5"
            onClick={() => {
              try { logout(); } catch {}
              window.location.href = "/auth/login";
            }}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      {/* Healthcare Quick Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 px-3 sm:px-4 flex-wrap flex-shrink-0 min-w-0 max-w-full">
        <Button
          variant="outline"
          size="sm"
          className="text-xs py-1.5 px-2.5 h-8 shrink-0"
          onClick={() => {
            setNewMessage({
              recipient: "",
              subject: "Appointment Reminder",
              content: "Hi {{patientName}},\n\nThis is a reminder that you have an appointment scheduled on {{appointmentDate}} with {{doctorName}} at {{clinicName}}.\n\nPlease arrive 15 minutes early for check-in.\n\nIf you need to reschedule, please call us.\n\nThank you,\n{{clinicName}}",
              priority: "normal",
              type: "patient",
              phoneNumber: "",
              messageType: "sms"
            });
            setShowNewMessage(true);
          }}
        >
          <span className="text-xs">📅 Appointment Reminder</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs py-1.5 px-2.5 h-8"
          onClick={() => {
            setNewMessage({
              recipient: "",
              subject: "Lab Results Available",
              content: "Hi {{patientName}},\n\nYour lab results are now available for review.\n\nPlease call us at {{clinicPhone}} or visit your patient portal to discuss the results with your provider.\n\nBest regards,\n{{clinicName}}",
              priority: "normal",
              type: "patient",
              phoneNumber: "",
              messageType: "sms"
            });
            setShowNewMessage(true);
          }}
        >
          <span className="text-xs">🧪 Lab Results</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs py-1.5 px-2.5 h-8"
          onClick={() => {
            setNewMessage({
              recipient: "",
              subject: "Prescription Ready",
              content: "Hi {{patientName}},\n\nYour prescription is ready for pickup at:\n{{pharmacyName}}\n{{pharmacyAddress}}\n\nPlease bring a valid ID when collecting your medication.\n\nThank you!",
              priority: "normal",
              type: "patient",
              phoneNumber: "",
              messageType: "sms"
            });
            setShowNewMessage(true);
          }}
        >
          <span className="text-xs">💊 Prescription Ready</span>
        </Button>
        <Dialog open={showVideoCall} onOpenChange={(open) => {
          setShowVideoCall(open);
          if (!open) {
            // Clear validation errors and selected participant when dialog closes
            setValidationErrors(prev => ({
              ...prev,
              videoCallParticipant: undefined,
              videoCallScheduledTime: undefined
            }));
            setSelectedVideoCallParticipant(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs py-1.5 px-2.5 h-8">
              <Video className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Video Call</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Start Video Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {(user?.role === 'admin' || user?.role === 'patient') ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="selectCallRole">Select Role *</Label>
                    <Select
                      value={selectedRecipientRole}
                      onValueChange={(value) => {
                        setSelectedRecipientRole(value);
                        setSelectedRecipientUser("");
                        setSelectedVideoCallParticipant(null);
                        setVideoCall(prev => ({ ...prev, participant: "" }));
                      }}
                    >
                      <SelectTrigger data-testid="select-call-recipient-role">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesData.map((role: any) => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.displayName || role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selectCallName">Select Name *</Label>
                    <Select
                      value={selectedVideoCallParticipant?.id?.toString() || selectedRecipientUser}
                      onValueChange={(value) => {
                        setSelectedRecipientUser(value);
                        // Find and store the full participant object
                        const participant = filteredRecipients.find((r: any) =>
                          (r.id?.toString() === value) ||
                          (`${r.firstName} ${r.lastName}` === value)
                        );
                        if (participant) {
                          setSelectedVideoCallParticipant(participant);
                          setVideoCall(prev => ({ ...prev, participant: `${participant.firstName} ${participant.lastName}` }));
                        } else {
                          setVideoCall(prev => ({ ...prev, participant: value }));
                        }
                        // Clear validation error when user selects a participant
                        if (validationErrors.videoCallParticipant) {
                          setValidationErrors(prev => ({
                            ...prev,
                            videoCallParticipant: undefined
                          }));
                        }
                      }}
                      disabled={!selectedRecipientRole}
                    >
                      <SelectTrigger data-testid="select-call-recipient-name" className={validationErrors.videoCallParticipant ? "border-red-500" : ""}>
                        <SelectValue placeholder={selectedRecipientRole ? "Select a name..." : "Select role first..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRecipients.map((recipient: any) => (
                          <SelectItem
                            key={recipient.id}
                            value={recipient.id?.toString() || `${recipient.firstName} ${recipient.lastName}`}
                            data-testid={`call-recipient-option-${recipient.id}`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{recipient.firstName} {recipient.lastName}</span>
                              <span className="text-sm text-gray-500">{recipient.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.videoCallParticipant && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.videoCallParticipant}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="callParticipant">Recipient *</Label>
                  <div className="relative">
                    <Input
                      id="callParticipant"
                      placeholder="Search patients..."
                      value={videoCallPatientSearch}
                      onChange={(e) => {
                        setVideoCallPatientSearch(e.target.value);
                        // Clear validation error when user types
                        if (validationErrors.videoCallParticipant) {
                          setValidationErrors(prev => ({
                            ...prev,
                            videoCallParticipant: undefined
                          }));
                        }
                      }}
                      className={validationErrors.videoCallParticipant ? "border-red-500" : ""}
                    />
                    {videoCallPatientSearch && filteredVideoCallPatients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredVideoCallPatients.map((patient: any) => (
                          <div
                            key={patient.id}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
                            onClick={() => {
                              setSelectedVideoCallPatient(`${patient.firstName} ${patient.lastName}`);
                              setVideoCallPatientSearch(`${patient.firstName} ${patient.lastName}`);
                              setSelectedVideoCallParticipant(patient);
                              setVideoCall(prev => ({ ...prev, participant: `${patient.firstName} ${patient.lastName}` }));
                              // Clear validation error when user selects a patient
                              if (validationErrors.videoCallParticipant) {
                                setValidationErrors(prev => ({
                                  ...prev,
                                  videoCallParticipant: undefined
                                }));
                              }
                            }}
                          >
                            <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                            <div className="text-sm text-gray-500">{patient.email} • {patient.patientId}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {validationErrors.videoCallParticipant && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.videoCallParticipant}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="callType">Call Type</Label>
                  <Select
                    value={videoCall.type}
                    onValueChange={(value: "consultation" | "team_meeting" | "emergency") =>
                      setVideoCall(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Patient Consultation</SelectItem>
                      <SelectItem value="team_meeting">Team Meeting</SelectItem>
                      <SelectItem value="emergency">Emergency Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callDuration">Expected Duration</Label>
                  <Select
                    value={videoCall.duration}
                    onValueChange={(value: "15" | "30" | "60" | "90") =>
                      setVideoCall(prev => ({ ...prev, duration: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="scheduleCall"
                    checked={videoCall.scheduled}
                    onChange={(e) => setVideoCall(prev => ({ ...prev, scheduled: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="scheduleCall">Schedule for later</Label>
                </div>

                {videoCall.scheduled && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Scheduled Time</Label>
                    <Input
                      id="scheduledTime"
                      type="datetime-local"
                      value={videoCall.scheduledTime}
                      onChange={(e) => {
                        setVideoCall(prev => ({ ...prev, scheduledTime: e.target.value }));
                        // Clear validation error when user changes the scheduled time
                        if (validationErrors.videoCallScheduledTime) {
                          setValidationErrors(prev => ({
                            ...prev,
                            videoCallScheduledTime: undefined
                          }));
                        }
                      }}
                      className={validationErrors.videoCallScheduledTime ? "border-red-500" : ""}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {validationErrors.videoCallScheduledTime && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.videoCallScheduledTime}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Video Call Features</span>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• HD video and audio quality</li>
                  <li>• Screen sharing capability</li>
                  <li>• Recording option for consultations</li>
                  <li>• Secure end-to-end encryption</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowVideoCall(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartVideoCall}
                  variant="default"
                >
                  {videoCall.scheduled ? "Schedule Call" : "Start Call"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scheduled Call Success Modal */}
        <Dialog open={showScheduledCallSuccess} onOpenChange={setShowScheduledCallSuccess}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Call Scheduled</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              {scheduledCallInfo && (
                <p className="text-muted-foreground">
                  Video call with <span className="font-semibold">{scheduledCallInfo.participantName}</span> scheduled for <span className="font-semibold">{scheduledCallInfo.scheduledTime}</span>
                </p>
              )}
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setShowScheduledCallSuccess(false)} className="w-full sm:w-auto">OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewMessage} onOpenChange={(open) => {
          setShowNewMessage(open);
          if (!open) {
            resetNewMessage();
          }
        }}>
          {canCreate('messaging') && (
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs py-1.5 px-2.5 h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Message
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-semibold leading-none">Compose New Message</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">
                Send a message to start a conversation or communicate directly
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5">
              {/* From/Sender Field - display logged-in user */}
              <div className="space-y-1">
                <Label htmlFor="message-sender" className="text-xs font-medium leading-none">From</Label>
                <div className="h-8 px-2.5 py-1.5 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-xs text-gray-700 dark:text-gray-300 leading-none">
                  {(currentUser || user) ? (
                    isDoctor ? (
                      <>{formatRoleLabel((currentUser || user)?.role)} {(currentUser || user)?.firstName} {(currentUser || user)?.lastName}</>
                    ) : (
                      <>{(currentUser || user)?.firstName} {(currentUser || user)?.lastName}</>
                    )
                  ) : (
                    <span className="text-muted-foreground">Loading...</span>
                  )}
                </div>
              </div>

              {/* Role and Name Selection - Show for admin, patient, doctor, and nurse */}
              <div className="grid grid-cols-2 gap-2">
                {(user?.role === 'admin' || user?.role === 'patient' || user?.role === 'doctor' || user?.role === 'nurse') ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="selectRole" className="text-xs font-medium leading-none">Select Role *</Label>
                      <Popover
                        open={composeRecipientRoleOpen}
                        onOpenChange={setComposeRecipientRoleOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={composeRecipientRoleOpen}
                            data-testid="select-recipient-role"
                            className={`h-8 w-full justify-between text-xs font-normal min-w-0 ${validationErrors.recipientRole ? "border-red-500" : ""}`}
                          >
                            <span className="truncate text-left">
                              {selectedRecipientRole
                                ? getRoleDisplayLabel(selectedRecipientRole)
                                : "Select a role..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search role..." className="text-xs h-8" />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty className="text-xs py-3">No role found.</CommandEmpty>
                              <CommandGroup>
                                {(rolesData as any[]).map((role: any) => (
                                  <CommandItem
                                    key={role.id}
                                    value={`${role.displayName || role.name} ${role.name}`}
                                    data-testid={`recipient-role-option-${role.name}`}
                                    onSelect={() => handleComposeRoleSelect(role.name)}
                                    className="text-xs py-2"
                                  >
                                    <Check
                                      className={`mr-2 h-3.5 w-3.5 shrink-0 ${
                                        selectedRecipientRole === role.name
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    <span className="truncate">
                                      {role.displayName || formatRoleLabel(role.name)}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {validationErrors.recipientRole && (
                        <p className="text-xs text-red-500 mt-0.5 leading-none">{validationErrors.recipientRole}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="selectName" className="text-xs font-medium leading-none">Select Name *</Label>
                      {selectedRecipientRole === "patient" ? (
                        <>
                        <Popover
                          open={composeRecipientNameOpen}
                          onOpenChange={setComposeRecipientNameOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={composeRecipientNameOpen}
                              disabled={!selectedRecipientRole}
                              data-testid="select-recipient-name"
                              className={`h-8 w-full justify-between text-xs font-normal min-w-0 ${validationErrors.recipientName ? "border-red-500" : ""}`}
                            >
                              <span className="truncate text-left">
                                {selectedRecipientUser
                                  ? (() => {
                                      const patient = (patientsData || []).find(
                                        (p: any) => String(p.id) === selectedRecipientUser,
                                      );
                                      return patient
                                        ? formatPatientDropdownLabel(patient)
                                        : "Select a patient";
                                    })()
                                  : selectedRecipientRole
                                    ? "Select a patient"
                                    : "Select role first..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search patient..." className="text-xs h-8" />
                              <CommandList>
                                <CommandEmpty className="text-xs py-3">No patient found.</CommandEmpty>
                                <CommandGroup>
                                  {patientsLoading ? (
                                    <CommandItem disabled className="text-xs">
                                      Loading patients...
                                    </CommandItem>
                                  ) : patientDropdownGroups.length > 0 ? (
                                    patientDropdownGroups.flatMap(({ main, relatives }) => {
                                      const rows = [
                                        { patient: main, isChild: false },
                                        ...relatives.map((p: any) => ({ patient: p, isChild: true })),
                                      ];
                                      return rows.map(({ patient, isChild }) => (
                                        <CommandItem
                                          key={patient.id}
                                          value={`${patient.firstName} ${patient.lastName} ${patient.patientId} ${patient.email ?? ""}`}
                                          data-testid={`recipient-option-${patient.id}`}
                                          onSelect={() => handleComposeRecipientSelect(patient)}
                                          className="text-xs py-2"
                                        >
                                          <Check
                                            className={`mr-2 h-3.5 w-3.5 shrink-0 ${
                                              selectedRecipientUser === String(patient.id)
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          <span className={`truncate ${isChild ? "pl-1" : ""}`}>
                                            {isChild ? "↳ " : ""}
                                            {formatPatientDropdownLabel(patient)}
                                          </span>
                                        </CommandItem>
                                      ));
                                    })
                                  ) : (
                                    <CommandItem disabled className="text-xs">
                                      No patients available
                                    </CommandItem>
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedComposePatient && (
                          <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/40 px-2.5 py-2">
                            <Label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none">
                              Email
                            </Label>
                            <p
                              className="text-xs text-gray-900 dark:text-gray-100 mt-1 break-all leading-snug"
                              data-testid="compose-recipient-email"
                            >
                              {getDisplayEmailForPatient(selectedComposePatient) || "—"}
                            </p>
                          </div>
                        )}
                        </>
                      ) : (
                        <Select
                          value={selectedRecipientUser}
                          onValueChange={(value) => {
                            setSelectedRecipientUser(value);
                            setNewMessage((prev) => ({ ...prev, recipient: value }));
                            setValidationErrors((prev) => ({ ...prev, recipientName: undefined }));

                            const recipient = filteredRecipients.find((r: any) => String(r.id) === value);
                            if (recipient && (recipient.phone || recipient.phoneNumber || recipient.mobile)) {
                              setNewMessage((prev) => ({
                                ...prev,
                                phoneNumber:
                                  recipient.phone || recipient.phoneNumber || recipient.mobile || "",
                              }));
                            }
                          }}
                          disabled={!selectedRecipientRole}
                        >
                          <SelectTrigger
                            data-testid="select-recipient-name"
                            className={`h-8 text-xs min-w-0 truncate leading-none ${validationErrors.recipientName ? "border-red-500" : ""}`}
                          >
                            <SelectValue
                              placeholder={
                                selectedRecipientRole ? "Select a name..." : "Select role first..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredRecipients.map((recipient: any) => (
                              <SelectItem
                                key={recipient.id}
                                value={String(recipient.id)}
                                data-testid={`recipient-option-${recipient.id}`}
                                className="text-xs leading-none"
                              >
                                <span className="truncate block leading-none">
                                  {recipient.firstName} {recipient.lastName} ({recipient.email})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {validationErrors.recipientName && (
                        <p className="text-xs text-red-500 mt-0.5 leading-none">{validationErrors.recipientName}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="selectRoleOther" className="text-xs font-medium leading-none">Select Role *</Label>
                      <Select
                        value="patient"
                        onValueChange={() => { }}
                        disabled
                      >
                        <SelectTrigger data-testid="select-recipient-role-other" className="h-8 text-xs bg-gray-50 dark:bg-gray-800 leading-none">
                          <SelectValue placeholder="Select a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient" className="text-xs leading-none">Patient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="selectNameOther" className="text-xs font-medium leading-none">Select Name *</Label>
                      <Select
                        value={selectedMessagePatient}
                        onValueChange={(value) => {
                          const patient = (patientsData || []).find((p: any) => String(p.id) === value);
                          if (patient) {
                            setSelectedMessagePatient(value);
                            setNewMessage(prev => ({
                              ...prev,
                              recipient: value,
                              phoneNumber: patient.phone || patient.phoneNumber || patient.mobile || ""
                            }));
                            setValidationErrors(prev => ({ ...prev, recipientName: undefined }));
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-patient-recipient" className={`h-8 text-xs min-w-0 truncate leading-none ${validationErrors.recipientName ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Select a name..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(patientsData || []).map((patient: any) => (
                            <SelectItem
                              key={patient.id}
                              value={String(patient.id)}
                              data-testid={`patient-option-${patient.id}`}
                              className="text-xs leading-none"
                            >
                              <span className="truncate block leading-none">{patient.firstName} {patient.lastName} ({patient.email}){patient.patientId ? ` • ${patient.patientId}` : ""}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.recipientName && (
                        <p className="text-xs text-red-500 mt-0.5 leading-none">{validationErrors.recipientName}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="messageSubject" className="text-xs font-medium leading-none">Subject *</Label>
                  <Input
                    id="messageSubject"
                    placeholder="Enter message subject"
                    value={newMessage.subject}
                    onChange={(e) => {
                      setNewMessage(prev => ({ ...prev, subject: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, subject: undefined }));
                    }}
                    className={`h-8 text-xs leading-none ${validationErrors.subject ? "border-red-500" : ""}`}
                  />
                  {validationErrors.subject && (
                    <p className="text-xs text-red-500 mt-0.5 leading-none">{validationErrors.subject}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="messagePriority" className="text-xs font-medium leading-none">Priority</Label>
                  <Select
                    value={newMessage.priority}
                    onValueChange={(value: "low" | "normal" | "high" | "urgent") =>
                      setNewMessage(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs leading-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="text-xs leading-none">Low</SelectItem>
                      <SelectItem value="normal" className="text-xs leading-none">Normal</SelectItem>
                      <SelectItem value="high" className="text-xs leading-none">High</SelectItem>
                      <SelectItem value="urgent" className="text-xs leading-none">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="messageType" className="text-xs font-medium leading-none">Message Type *</Label>
                  <Select
                    value={newMessage.messageType}
                    onValueChange={(value: "message" | "sms" | "email" | "whatsapp" | "voice") => {
                      setNewMessage(prev => ({ ...prev, messageType: value }));
                      // Clear phone number when switching away from phone-based types
                      if (value === 'message' || value === 'email') {
                        setNewMessage(prev => ({ ...prev, phoneNumber: "" }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs leading-none">
                      <SelectValue placeholder="Select message type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message" className="text-xs leading-none">Message (Start Conversation)</SelectItem>
                      <SelectItem value="email" className="text-xs leading-none">Email Only</SelectItem>
                      <SelectItem value="sms" className="text-xs leading-none">SMS Only</SelectItem>
                      <SelectItem value="whatsapp" className="text-xs leading-none">WhatsApp Only</SelectItem>
                      <SelectItem value="voice" className="text-xs leading-none">Phone Call Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-none">
                    {newMessage.messageType === 'message'
                      ? "Creates a conversation."
                      : newMessage.messageType === 'email'
                        ? "Sends email only, no conversation created"
                        : newMessage.messageType === 'sms'
                          ? "Sends SMS only, no conversation created"
                          : newMessage.messageType === 'whatsapp'
                            ? "Sends WhatsApp only, no conversation created"
                            : newMessage.messageType === 'voice'
                              ? "Makes phone call only, no conversation created"
                              : "Select a message type"}
                  </p>
                </div>
                {(newMessage.messageType === 'sms' || newMessage.messageType === 'whatsapp' || newMessage.messageType === 'voice') && (
                  <div className="space-y-1">
                    <Label htmlFor="phoneNumber" className="text-xs font-medium leading-none">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="Enter phone number (e.g., +44 7123 456789)"
                      value={newMessage.phoneNumber}
                      onChange={(e) => {
                        setNewMessage(prev => ({ ...prev, phoneNumber: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, phoneNumber: undefined }));
                      }}
                      className={`h-8 text-xs leading-none ${validationErrors.phoneNumber ? "border-red-500" : ""}`}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-none">
                      Sample: +44 7123 456789 (UK) or +1 555 123 4567 (US)
                    </p>
                    {validationErrors.phoneNumber && (
                      <p className="text-xs text-red-500 mt-0.5 leading-none">{validationErrors.phoneNumber}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="messageContent" className="text-xs font-medium leading-none">Message Content *</Label>
                <Textarea
                  id="messageContent"
                  placeholder="Enter your message content..."
                  rows={4}
                  value={newMessage.content}
                  onChange={(e) => {
                    setNewMessage(prev => ({ ...prev, content: e.target.value }));
                    setValidationErrors(prev => ({ ...prev, content: undefined }));
                  }}
                  className={`resize-none text-xs leading-none ${validationErrors.content ? "border-red-500" : ""}`}
                />
                {validationErrors.content && (
                  <p className="text-xs text-red-500 mt-0.5 leading-none">{validationErrors.content}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowNewMessage(false)}
                  className="h-8 text-xs leading-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendNewMessage}
                  disabled={sendMessageMutation.isPending}
                  variant="default"
                  className="h-8 text-xs leading-none"
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Dialog - Global */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-lg">{successTitle || "Success"}</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="default"
              onClick={() => setShowSuccessDialog(false)}
              className="w-full"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete conversation confirmation modal */}
      <Dialog open={deleteConversationDialog.open} onOpenChange={(open) => !open && setDeleteConversationDialog({ open: false, conversationId: null, participantName: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Delete conversation with {deleteConversationDialog.participantName || "this user"} ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConversationDialog({ open: false, conversationId: null, participantName: "" })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConversationDialog.conversationId) {
                  handleDeleteConversation(deleteConversationDialog.conversationId);
                  setDeleteConversationDialog({ open: false, conversationId: null, participantName: "" });
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messaging Content */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 md:p-4 max-w-full">
        <Tabs value={activeMessagingTab} onValueChange={setActiveMessagingTab} className="w-full h-full flex flex-col min-h-0 min-w-0">
          <TabsList className="w-full grid grid-cols-4 flex-shrink-0 min-w-0 h-9 text-sm">
            <TabsTrigger value="conversations" className="min-w-0 text-xs sm:text-sm py-1.5">Conversations</TabsTrigger>
            <TabsTrigger value="sms" className="min-w-0 text-xs sm:text-sm py-1.5">SMS</TabsTrigger>
            <TabsTrigger value="campaigns" className="min-w-0 text-xs sm:text-sm py-1.5">Campaigns</TabsTrigger>
            <TabsTrigger value="templates" className="min-w-0 text-xs sm:text-sm py-1.5">Announcement</TabsTrigger>
          </TabsList>
          <TabsContent value="conversations" className="flex-1 overflow-hidden mt-2 min-h-0 min-w-0">
            <div className="grid grid-cols-12 gap-2 md:gap-3 h-full min-w-0">
              {/* Conversations List */}
              <div className="col-span-4 min-w-0 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg flex flex-col overflow-hidden">
                <div className="p-2.5 md:p-3 border-b border-gray-200 dark:border-slate-600 flex-shrink-0 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
                    <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">All Messages</h2>
                    <Select value={messageFilter} onValueChange={setMessageFilter}>
                      <SelectTrigger className="min-w-0 w-full max-w-[7rem] h-8 flex-shrink-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Messages</SelectItem>
                        <SelectItem value="unread">Unread</SelectItem>
                        <SelectItem value="patients">Patients</SelectItem>
                        <SelectItem value="staff">Staff Only</SelectItem>
                        <SelectItem value="starred">Starred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-3.5 w-3.5" />
                    <Input
                      placeholder="Search conversations..."
                      className="pl-8 h-8 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 min-h-0 min-w-0">
                    <div className="p-2.5 md:p-3">
                      {/* New Conversation Option */}
                      {/* Show existing conversations first */}
                      {filteredConversations && filteredConversations.length > 0 && (
                        <div className="mb-2.5">
                          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 px-0.5">📩 Click conversation below to send messages:</h3>
                          <div className="space-y-2">
                            {filteredConversations.map((conversation: Conversation) => {
                              const otherParticipant = getOtherParticipant(conversation);
                              const participantName = otherParticipant?.name && otherParticipant.name !== 'undefined'
                                ? otherParticipant.name
                                : otherParticipant?.id && otherParticipant.id !== 'undefined'
                                  ? `User ${otherParticipant.id}`
                                  : 'Unknown User';
                              const participantRole = otherParticipant?.role || 'user';
                              const participantImageUrl = getParticipantProfilePicturePath(otherParticipant);
                              // Use the same timestamp formatting function for consistency
                              const lastMessageTimestamp = conversation.lastMessage?.timestamp
                                ? formatTimestampNoConversion(conversation.lastMessage.timestamp)
                                : null;

                              return (
                                <div
                                  key={conversation.id}
                                  className={`p-2.5 rounded-md cursor-pointer transition-all duration-200 ${selectedConversation === conversation.id
                                    ? 'border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                    : 'border border-green-200 dark:border-green-700 bg-white dark:bg-slate-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm'
                                    }`}
                                  onClick={() => {
                                    console.log('🔥 CONVERSATION SELECTED:', conversation.id);
                                    console.log('🔥 Setting selectedConversation to:', conversation.id);
                                    setSelectedConversation(conversation.id);
                                  }}
                                >
                                  <div className="flex items-start gap-2">
                                    {/* Kebab menu - in front of name and time */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Actions"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuItem
                                          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            setDeleteConversationDialog({ open: true, conversationId: conversation.id, participantName });
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete conversation
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                      <Avatar className="h-8 w-8">
                                        {participantImageUrl ? (
                                          <AvatarImage src={participantImageUrl} alt="Profile picture" />
                                        ) : null}
                                        <AvatarFallback className="bg-green-500 text-white text-xs font-semibold">
                                          {String(participantName).charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      {conversation.unreadCount > 0 && (
                                        <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 text-[10px] min-w-[14px] h-4 flex items-center justify-center p-0">
                                          {conversation.unreadCount}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      {/* Name */}
                                      <div className="flex items-start justify-between mb-0.5">
                                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                          {participantName}
                                        </h4>
                                      </div>

                                      {/* Role Badge and Date */}
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Badge
                                          className="bg-purple-500 text-white text-[10px] px-1.5 py-0 font-normal"
                                          variant="secondary"
                                        >
                                          {participantRole}
                                        </Badge>
                                        {lastMessageTimestamp && (
                                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                            {lastMessageTimestamp}
                                          </span>
                                        )}
                                      </div>

                                      {/* Last Message */}
                                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                        {conversation.lastMessage?.content || "No messages yet"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(!filteredConversations || filteredConversations.length === 0) && (
                        <div className="text-center py-5 text-gray-500 dark:text-gray-400">
                          <MessageSquare className="h-10 w-10 mx-auto mb-2.5 opacity-50" />
                          <p className="text-sm">No existing conversations found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Fixed bottom section - excluded from scroll */}
                  <div className="p-2.5 pt-2 border-t border-gray-200 dark:border-slate-600 flex-shrink-0 bg-white dark:bg-slate-800">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">Or create new conversation:</p>
                    <div
                      className="p-2 rounded-md cursor-pointer transition-all border-2 border-dashed border-gray-300 dark:border-slate-500 hover:border-gray-400 dark:hover:border-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      onClick={() => setShowNewMessage(true)}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                          <Plus className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">New Message</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Thread */}
              <div className="col-span-8 min-w-0 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg flex flex-col overflow-hidden">
                {selectedConversation ? (
                  <>
                    {/* Message Header */}
                    <div className="p-2.5 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {(() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            const other = conv ? getOtherParticipant(conv) : null;
                            const url = getParticipantProfilePicturePath(other);
                            return url ? <AvatarImage src={url} alt="Profile picture" /> : null;
                          })()}
                          <AvatarFallback className="text-xs">
                            {(() => {
                              const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                              return conv ? String(getOtherParticipant(conv)?.name || 'U').charAt(0).toUpperCase() : 'U';
                            })()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {(() => {
                              const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                              return conv ? getOtherParticipant(conv)?.name : '';
                            })()}
                          </h3>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {(() => {
                                const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                                return conv ? getOtherParticipant(conv)?.role : '';
                              })()}
                            </p>
                            {/* Online/Offline Status */}
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              Online
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            if (conv) {
                              const participant = getOtherParticipant(conv);
                              if (participant) {
                                startLiveKitAudioCall(participant);
                              }
                            }
                          }}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            if (conv) {
                              const participant = getOtherParticipant(conv);
                              if (participant) startLiveKitVideoCall(participant);
                            }
                          }}
                        >
                          <Video className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (selectedConversation) {
                              const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                              const otherParticipant = conv ? getOtherParticipant(conv) : null;
                              const conversationName = otherParticipant?.name || "Unknown";
                              toggleFavoriteMutation.mutate({
                                conversationId: selectedConversation,
                                conversationName
                              });
                            }
                          }}
                          disabled={toggleFavoriteMutation.isPending}
                        >
                          {(() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            const isFavorite = conv?.isFavorite || false;
                            const isLoading = toggleFavoriteMutation.isPending;
                            return (
                              <Star
                                className={`h-3.5 w-3.5 ${isFavorite ? "fill-yellow-500 text-yellow-500" : ""} ${isLoading ? "opacity-50" : ""}`}
                              />
                            );
                          })()}
                        </Button>
                      </div>
                    </div>

                    {/* Typing Indicator */}
                    {(() => {
                      // TODO: Implement real typing indicator based on WebSocket events
                      const isTyping = false; // Placeholder
                      return isTyping ? (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                          <span>Raja shams averoc is typing...</span>
                        </div>
                      ) : null;
                    })()}

                    {/* Messages */}
                    <ScrollArea className="flex-1 overflow-y-auto">
                      <div ref={messagesContainerRef} className="space-y-2 p-3">
                        {(() => {
                          console.log('🔥 RENDERING MESSAGES - Count:', messages.length);
                          console.log('🔥 RENDERING MESSAGES - Data:', JSON.stringify(messages, null, 2));
                          return null;
                        })()}
                        {messages.length === 0 ? (
                          <div className="text-center py-5 text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2.5 opacity-50" />
                            <p className="text-sm">No messages in this conversation</p>
                          </div>
                        ) : (
                          messages.map((message: Message, index: number) => {
                            console.log(`🔥 RENDERING MESSAGE ${index}:`, message.id, message.content);
                            // Determine if message is sent by current user
                            const isSentByCurrentUser = currentUser && (
                              String(message.senderId) === String(currentUser.id) ||
                              message.senderName === `${currentUser.firstName} ${currentUser.lastName}` ||
                              message.senderName === 'You'
                            );

                            return (
                              <div
                                key={message.id}
                                className={`flex gap-2 mb-2 transition-all duration-200 group ${isSentByCurrentUser ? 'flex-row-reverse' : 'flex-row'
                                  }`}
                              >
                                {/* Avatar - only show for received messages */}
                                {!isSentByCurrentUser && (
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    {(() => {
                                      const url = getProfilePicturePathByRoleAndId(message.senderRole, message.senderId);
                                      return url ? <AvatarImage src={url} alt="Profile picture" /> : null;
                                    })()}
                                    <AvatarFallback className="text-[10px] bg-gray-400 text-white">
                                      {message.senderName?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}

                                {/* Message Container */}
                                <div className={`flex flex-col min-w-0 max-w-[70%] ${isSentByCurrentUser ? 'items-end' : 'items-start'}`}>
                                  {/* Sender Name, Timestamp and Kebab - same row for received; kebab-only row for sent */}
                                  {!isSentByCurrentUser ? (
                                    <div className="flex items-center gap-2 mb-1 px-1 w-full">
                                      <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{message.senderName}</span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {formatTimestampNoConversion(message.timestamp)}
                                      </span>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-500"
                                          >
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                          <DropdownMenuItem
                                            onSelect={(e) => {
                                              e.preventDefault();
                                              setNewMessage(prev => ({
                                                ...prev,
                                                content: message.content,
                                                subject: `Forwarded: ${message.subject || 'Message'}`,
                                                priority: message.priority || "normal"
                                              }));
                                              setValidationErrors({});
                                              setShowNewMessage(true);
                                            }}
                                          >
                                            <Forward className="mr-2 h-4 w-4" />
                                            Forward
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={async () => {
                                            const messagePreview = message.content.length > 50
                                              ? `${message.content.substring(0, 50)}...`
                                              : message.content;
                                            setTaggedMessageContent(messagePreview);
                                            setTaggedMessageId(message.id);
                                            try {
                                              const existingTags = message.tags?.map((t: any) => t.id) || [];
                                              setSelectedTags(existingTags);
                                              try {
                                                const response = await apiRequest('GET', `/api/messaging/messages/${message.id}/tags`);
                                                if (response.ok) {
                                                  const serverTags = await response.json();
                                                  setSelectedTags(serverTags.map((t: any) => t.id));
                                                }
                                              } catch (fetchError) {
                                                console.warn('Could not fetch tags from server, using cached tags');
                                              }
                                            } catch (error) {
                                              console.error('Error loading tags:', error);
                                              setSelectedTags([]);
                                            }
                                            setShowTagDialog(true);
                                          }}>
                                            <Tag className="mr-2 h-4 w-4" />
                                            Tag
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={async () => {
                                              try {
                                                const token = localStorage.getItem('auth_token');
                                                const response = await fetch(`/api/messaging/messages/${message.id}`, {
                                                  method: 'DELETE',
                                                  headers: {
                                                    'Authorization': `Bearer ${token}`,
                                                    'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
                                                    'Content-Type': 'application/json'
                                                  },
                                                  credentials: 'include'
                                                });
                                                if (!response.ok) {
                                                  if (response.status === 404) {
                                                    toast({ title: "Message Already Deleted", description: "This message has already been deleted" });
                                                    if (selectedConversation && fetchMessages) await fetchMessages(selectedConversation);
                                                    return;
                                                  }
                                                  throw new Error(`${response.status}: ${response.statusText}`);
                                                }
                                                if (selectedConversation && fetchMessages) await fetchMessages(selectedConversation);
                                                toast({ title: "Message Deleted", description: "Message has been deleted successfully", duration: 3000 });
                                              } catch (error) {
                                                console.error('Delete error:', error);
                                                toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
                                              }
                                            }}
                                            className="text-red-600 dark:text-red-400"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  ) : (
                                    /* Sent: bubble and kebab in one row, kebab on the right */
                                    <div className="flex items-end gap-1.5 justify-end w-full">
                                      <div
                                        className={`rounded-xl px-3 py-2 shadow-sm transition-all duration-200 min-w-0 ${isSentByCurrentUser
                                          ? 'bg-blue-600 text-white rounded-br-md' // Outgoing: blue with sharper left corners
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md' // Incoming: gray with sharper right corners
                                          }`}
                                      >
                                        <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                                        <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px] text-blue-100 dark:text-blue-300">
                                          <span>{formatTimestampNoConversion(message.timestamp)}</span>
                                          <span className="flex items-center gap-0.5 opacity-90">
                                            sent
                                            <Check className="h-3 w-3 inline" strokeWidth={2.5} />
                                          </span>
                                        </div>
                                        {message.tags && message.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {message.tags.map((tag: any) => {
                                              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                                                blue: { bg: 'rgba(255, 255, 255, 0.3)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                red: { bg: 'rgba(255, 200, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                green: { bg: 'rgba(200, 255, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                yellow: { bg: 'rgba(255, 255, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                purple: { bg: 'rgba(255, 200, 255, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                orange: { bg: 'rgba(255, 220, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                pink: { bg: 'rgba(255, 200, 220, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                                gray: { bg: 'rgba(255, 255, 255, 0.25)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              };
                                              const colors = colorMap[tag.color] || colorMap.blue;
                                              return (
                                                <Badge key={tag.id} variant="secondary" className="text-xs" style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}>
                                                  <Tag className="h-2 w-2 mr-1" />
                                                  {tag.name}
                                                </Badge>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {message.attachments && message.attachments.length > 0 && (
                                          <div className="mt-2 space-y-2">
                                            {message.attachments.map((attachment: any) => {
                                              const isImage = attachment.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.name || '');
                                              return (
                                                <div key={attachment.id} className="space-y-1">
                                                  {isImage && attachment.url ? (
                                                    <div className="overflow-hidden rounded-md border border-blue-400 max-w-full">
                                                      <img src={attachment.url} alt={attachment.name || 'Attachment'} className="max-w-full h-auto max-h-[400px] object-contain w-full block" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-2 text-xs text-blue-100 dark:text-blue-200">
                                                      <Paperclip className="h-3 w-3" />
                                                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-50 hover:text-white hover:underline break-words">{attachment.name}</a>
                                                      <span className="text-blue-200 dark:text-blue-300 whitespace-nowrap">({(attachment.size / 1024).toFixed(1)} KB)</span>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isSentByCurrentUser ? 'text-blue-400 hover:text-blue-300' : 'text-gray-400 hover:text-gray-500'
                                              }`}
                                          >
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isSentByCurrentUser ? "end" : "start"}>
                                          <DropdownMenuItem
                                            onSelect={(e) => {
                                              e.preventDefault();
                                              setNewMessage(prev => ({
                                                ...prev,
                                                content: message.content,
                                                subject: `Forwarded: ${message.subject || 'Message'}`,
                                                priority: message.priority || "normal"
                                              }));
                                              setValidationErrors({});
                                              setShowNewMessage(true);
                                            }}
                                          >
                                            <Forward className="mr-2 h-4 w-4" />
                                            Forward
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={async () => {
                                            const messagePreview = message.content.length > 50
                                              ? `${message.content.substring(0, 50)}...`
                                              : message.content;
                                            setTaggedMessageContent(messagePreview);
                                            setTaggedMessageId(message.id);
                                            try {
                                              const existingTags = message.tags?.map((t: any) => t.id) || [];
                                              setSelectedTags(existingTags);
                                              try {
                                                const response = await apiRequest('GET', `/api/messaging/messages/${message.id}/tags`);
                                                if (response.ok) {
                                                  const serverTags = await response.json();
                                                  setSelectedTags(serverTags.map((t: any) => t.id));
                                                }
                                              } catch (fetchError) {
                                                console.warn('Could not fetch tags from server, using cached tags');
                                              }
                                            } catch (error) {
                                              console.error('Error loading tags:', error);
                                              setSelectedTags([]);
                                            }
                                            setShowTagDialog(true);
                                          }}>
                                            <Tag className="mr-2 h-4 w-4" />
                                            Tag
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={async () => {
                                              try {
                                                const token = localStorage.getItem('auth_token');
                                                const response = await fetch(`/api/messaging/messages/${message.id}`, {
                                                  method: 'DELETE',
                                                  headers: {
                                                    'Authorization': `Bearer ${token}`,
                                                    'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
                                                    'Content-Type': 'application/json'
                                                  },
                                                  credentials: 'include'
                                                });
                                                if (!response.ok) {
                                                  if (response.status === 404) {
                                                    toast({ title: "Message Already Deleted", description: "This message has already been deleted" });
                                                    if (selectedConversation && fetchMessages) await fetchMessages(selectedConversation);
                                                    return;
                                                  }
                                                  throw new Error(`${response.status}: ${response.statusText}`);
                                                }
                                                if (selectedConversation && fetchMessages) await fetchMessages(selectedConversation);
                                                toast({ title: "Message Deleted", description: "Message has been deleted successfully", duration: 3000 });
                                              } catch (error) {
                                                console.error('Delete error:', error);
                                                toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
                                              }
                                            }}
                                            className="text-red-600 dark:text-red-400"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}

                                  {/* Message Bubble - only for received messages; sent messages have bubble above inside the row */}
                                  {!isSentByCurrentUser && (
                                    <div
                                      className={`rounded-xl px-3 py-2 shadow-sm transition-all duration-200 ${isSentByCurrentUser
                                        ? 'bg-blue-600 text-white rounded-br-md' // Outgoing: blue with sharper left corners
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md' // Incoming: gray with sharper right corners
                                        }`}
                                    >
                                      <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                                      {message.tags && message.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {message.tags.map((tag) => {
                                            // Use lighter colors for tags on sent messages (blue background)
                                            const colorMap: Record<string, { bg: string; text: string; border: string }> = isSentByCurrentUser ? {
                                              blue: { bg: 'rgba(255, 255, 255, 0.3)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              red: { bg: 'rgba(255, 200, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              green: { bg: 'rgba(200, 255, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              yellow: { bg: 'rgba(255, 255, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              purple: { bg: 'rgba(255, 200, 255, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              orange: { bg: 'rgba(255, 220, 200, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              pink: { bg: 'rgba(255, 200, 220, 0.4)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                              gray: { bg: 'rgba(255, 255, 255, 0.25)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.5)' },
                                            } : {
                                              blue: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
                                              red: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
                                              green: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
                                              yellow: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
                                              purple: { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
                                              orange: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
                                              pink: { bg: '#fce7f3', text: '#9f1239', border: '#f9a8d4' },
                                              gray: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
                                            };
                                            const colors = colorMap[tag.color] || (isSentByCurrentUser ? colorMap.blue : colorMap.blue);
                                            return (
                                              <Badge
                                                key={tag.id}
                                                variant="secondary"
                                                className="text-xs"
                                                style={{
                                                  backgroundColor: colors.bg,
                                                  color: colors.text,
                                                  borderColor: colors.border,
                                                }}
                                              >
                                                <Tag className="h-2 w-2 mr-1" />
                                                {tag.name}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {message.attachments && message.attachments.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                          {message.attachments.map((attachment) => {
                                            const isImage = attachment.type?.startsWith('image/') ||
                                              /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.name || '');
                                            return (
                                              <div key={attachment.id} className="space-y-1">
                                                {isImage && attachment.url ? (
                                                  <div className="overflow-hidden rounded-md border border-gray-300 dark:border-slate-600 max-w-full">
                                                    <img
                                                      src={attachment.url}
                                                      alt={attachment.name || 'Attachment'}
                                                      className="max-w-full h-auto max-h-[400px] object-contain w-full block"
                                                      style={{
                                                        maxWidth: '100%',
                                                        width: '100%',
                                                        height: 'auto',
                                                        display: 'block',
                                                        objectFit: 'contain'
                                                      }}
                                                      onError={(e) => {
                                                        // Hide image and show fallback
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                      }}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className={`flex items-center gap-2 text-xs ${isSentByCurrentUser
                                                    ? 'text-blue-100 dark:text-blue-200'
                                                    : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    <Paperclip className="h-3 w-3" />
                                                    <a
                                                      href={attachment.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className={`hover:underline break-words ${isSentByCurrentUser
                                                        ? 'text-blue-50 hover:text-white'
                                                        : 'text-gray-900 dark:text-gray-100 hover:text-blue-600'
                                                        }`}
                                                    >
                                                      {attachment.name}
                                                    </a>
                                                    <span className={`whitespace-nowrap ${isSentByCurrentUser
                                                      ? 'text-blue-200 dark:text-blue-300'
                                                      : 'text-gray-500 dark:text-gray-400'
                                                      }`}>
                                                      ({(attachment.size / 1024).toFixed(1)} KB)
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                        {/* Inline "Message sent" with green tick - right side, below the message */}
                        {showSentConfirmation && (
                          <div
                            className="flex items-center justify-end gap-1.5 py-1.5 mr-[30px] text-xs text-green-600 dark:text-green-400 transition-opacity duration-200"
                            role="status"
                            aria-live="polite"
                          >
                            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.5} />
                            <span>Message sent</span>
                          </div>
                        )}
                        {/* Invisible element at bottom for auto-scroll */}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Composer */}
                    <div className="p-2.5 border-t border-gray-200 dark:border-slate-600 bg-blue-50 dark:bg-slate-700 flex-shrink-0">
                      <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5">
                        💬 Reply to this conversation
                      </div>
                      <div className="flex gap-2">
                        <Textarea
                          key={`message-input-${selectedConversation}`}
                          placeholder="Type your reply here..."
                          value={newMessageContent}
                          onChange={(e) => setNewMessageContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (newMessageContent.trim()) {
                                handleSendConversationMessage();
                              }
                            }
                          }}
                          className="flex-1 min-h-[64px] text-sm py-2 px-3 bg-white dark:bg-slate-600"
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={handleSendConversationMessage}
                            disabled={!newMessageContent.trim()}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <h3 className="text-base font-medium mb-1.5 text-gray-900 dark:text-gray-100">Select a conversation</h3>
                      <p className="text-xs">Choose a conversation from the list to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tag Message Dialog */}
            <Dialog open={showTagDialog} onOpenChange={(open) => {
              setShowTagDialog(open);
              if (!open) {
                setTaggedMessageContent("");
                setTaggedMessageId("");
                setSelectedTags([]);
                setNewTagName("");
                setNewTagColor("blue");
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tag Message</DialogTitle>
                  <DialogDescription>
                    Tagging message: {taggedMessageContent}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Existing Tags Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Tags</Label>
                    {tagsLoading ? (
                      <div className="text-sm text-gray-500">Loading tags...</div>
                    ) : messageTags.length === 0 ? (
                      <div className="text-sm text-gray-500">No tags available. Create a new tag below.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {messageTags.map((tag: any) => {
                          const isSelected = selectedTags.includes(tag.id);
                          const colorMap: Record<string, { bg: string; hover: string; text: string }> = {
                            blue: { bg: '#3b82f6', hover: '#2563eb', text: '#ffffff' },
                            red: { bg: '#ef4444', hover: '#dc2626', text: '#ffffff' },
                            green: { bg: '#22c55e', hover: '#16a34a', text: '#ffffff' },
                            yellow: { bg: '#eab308', hover: '#ca8a04', text: '#000000' },
                            purple: { bg: '#a855f7', hover: '#9333ea', text: '#ffffff' },
                            orange: { bg: '#f97316', hover: '#ea580c', text: '#ffffff' },
                            pink: { bg: '#ec4899', hover: '#db2777', text: '#ffffff' },
                            gray: { bg: '#6b7280', hover: '#4b5563', text: '#ffffff' },
                          };
                          const colors = colorMap[tag.color] || colorMap.blue;
                          return (
                            <Button
                              key={tag.id}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                } else {
                                  setSelectedTags([...selectedTags, tag.id]);
                                }
                              }}
                              style={isSelected ? {
                                backgroundColor: colors.bg,
                                color: colors.text,
                              } : {}}
                              className={isSelected ? 'hover:opacity-90' : ''}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag.name}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Create New Tag */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium mb-2 block">Create New Tag</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Tag name"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="flex-1"
                        />
                        <Select value={newTagColor} onValueChange={setNewTagColor}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="yellow">Yellow</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="pink">Pink</SelectItem>
                            <SelectItem value="gray">Gray</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!newTagName.trim()) {
                            toast({
                              title: "Validation Error",
                              description: "Please enter a tag name",
                              variant: "destructive"
                            });
                            return;
                          }
                          try {
                            const response = await apiRequest('POST', '/api/messaging/tags', {
                              name: newTagName.trim(),
                              color: newTagColor
                            });
                            const newTag = await response.json();
                            setSelectedTags([...selectedTags, newTag.id]);
                            setNewTagName("");
                            refetchTags();
                            showSuccess("Tag Created", `Tag "${newTagName.trim()}" has been created and added to this message.`);
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to create tag",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={!newTagName.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create & Add Tag
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTagDialog(false);
                      setTaggedMessageContent("");
                      setTaggedMessageId("");
                      setSelectedTags([]);
                      setNewTagName("");
                      setNewTagColor("blue");
                    }}
                    data-testid="button-cancel-tag-dialog"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={async () => {
                      if (!taggedMessageId) {
                        toast({
                          title: "Error",
                          description: "Message ID is missing",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        console.log('🏷️ Saving tags for message:', taggedMessageId);
                        console.log('🏷️ Selected tags:', selectedTags);

                        // Get current message tags
                        let currentTagIds: number[] = [];
                        try {
                          const currentTagsResponse = await apiRequest('GET', `/api/messaging/messages/${taggedMessageId}/tags`);
                          if (currentTagsResponse.ok) {
                            const currentTags = await currentTagsResponse.json();
                            currentTagIds = currentTags.map((t: any) => t.id);
                            console.log('🏷️ Current tags:', currentTagIds);
                          }
                        } catch (getTagsError: any) {
                          // If tag tables don't exist, currentTagIds will be empty array
                          console.warn('⚠️ Could not fetch current tags (tag tables may not exist):', getTagsError.message);
                          currentTagIds = [];
                        }

                        // Remove tags that are no longer selected
                        for (const tagId of currentTagIds) {
                          if (!selectedTags.includes(tagId)) {
                            try {
                              await apiRequest('DELETE', `/api/messaging/messages/${taggedMessageId}/tags/${tagId}`);
                              console.log('🏷️ Removed tag:', tagId);
                            } catch (removeError: any) {
                              console.error('❌ Error removing tag:', removeError);
                              // Continue with other operations even if one fails
                            }
                          }
                        }

                        // Add newly selected tags
                        for (const tagId of selectedTags) {
                          if (!currentTagIds.includes(tagId)) {
                            try {
                              await apiRequest('POST', `/api/messaging/messages/${taggedMessageId}/tags`, { tagId });
                              console.log('🏷️ Added tag:', tagId);
                            } catch (addError: any) {
                              console.error('❌ Error adding tag:', addError);
                              // Continue with other operations even if one fails
                            }
                          }
                        }

                        // Refresh messages to show updated tags
                        if (selectedConversation) {
                          fetchMessages(selectedConversation);
                        }

                        showSuccess("Message Tagged", `Tags have been ${selectedTags.length > 0 ? 'updated' : 'removed'} successfully.`);

                        setShowTagDialog(false);
                        setTaggedMessageContent("");
                        setTaggedMessageId("");
                        setSelectedTags([]);
                        setNewTagName("");
                        setNewTagColor("blue");
                      } catch (error: any) {
                        console.error('❌ Error updating tags:', error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to update tags. Make sure the tag migration has been run.",
                          variant: "destructive"
                        });
                      }
                    }}
                    data-testid="button-confirm-tag-dialog"
                  >
                    Save Tags
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </TabsContent>

          <TabsContent value="sms" className="space-y-6 min-h-0 min-w-0 overflow-auto">
            <div className="border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg min-w-0 max-w-full">
              <div className="p-4 border-b border-gray-200 dark:border-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-4 min-w-0">
                  <div>
                    <h3 className="text-lg font-semibold">SMS Messages</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      View all SMS messages sent through the system via Twilio
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSmsRefreshLoading(true);
                        try {
                          // Make a fresh API call to get latest SMS messages
                          const token = localStorage.getItem('auth_token');
                          const response = await fetch('/api/messaging/sms-messages', {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
                              'Content-Type': 'application/json'
                            },
                            credentials: 'include'
                          });

                          if (!response.ok) {
                            throw new Error(`${response.status}: ${response.statusText}`);
                          }

                          const data = await response.json();

                          // Update the query cache with fresh data
                          queryClient.setQueryData(['/api/messaging/sms-messages'], data);

                          toast({
                            title: "Success",
                            description: "SMS messages refreshed successfully",
                          });
                        } catch (error) {
                          console.error('Error refreshing SMS messages:', error);
                          toast({
                            title: "Error",
                            description: "Failed to refresh SMS messages",
                            variant: "destructive"
                          });
                        } finally {
                          setSmsRefreshLoading(false);
                        }
                      }}
                      disabled={smsLoading || smsRefreshLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${(smsLoading || smsRefreshLoading) ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Badge variant="outline" className="text-sm">
                      {(smsMessages || []).length} messages
                    </Badge>
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[500px] overflow-y-auto">
                <div className="p-4 space-y-4">
                  {smsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (smsMessages || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h4 className="text-lg font-medium mb-2">No SMS Messages</h4>
                      <p className="text-sm text-muted-foreground max-w-md">
                        SMS messages sent through the "New Message" dialog will appear here.
                        Select SMS as the communication method and provide a phone number.
                      </p>
                    </div>
                  ) : (
                    (smsMessages || []).map((msg: any) => (
                      <div
                        key={msg.id}
                        className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 hover-elevate"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {msg.patientFirstName && msg.patientLastName
                                  ? `${msg.patientFirstName} ${msg.patientLastName}`
                                  : msg.recipientName || msg.phoneNumber || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">{msg.phoneNumber}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                msg.deliveryStatus === 'delivered' ? 'default' :
                                  msg.deliveryStatus === 'sent' ? 'secondary' :
                                    msg.deliveryStatus === 'failed' ? 'destructive' : 'outline'
                              }
                            >
                              {msg.deliveryStatus === 'delivered' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {msg.deliveryStatus === 'sent' && <Send className="h-3 w-3 mr-1" />}
                              {msg.deliveryStatus === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                              {msg.deliveryStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {msg.deliveryStatus || 'Pending'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {msg.createdAt ? format(new Date(msg.createdAt), 'MMM dd, HH:mm') : ''}
                            </span>
                          </div>
                        </div>
                        <div className="pl-13">
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 dark:bg-slate-900 p-3 rounded-md">
                            {msg.content}
                          </p>
                          {msg.externalMessageId && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Twilio ID: {msg.externalMessageId}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6 p-4 md:p-6 min-h-0 min-w-0 overflow-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 min-w-0 max-w-full">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Messaging Campaigns</h2>
              <div className="flex items-center gap-4">
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={campaignSubTab === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCampaignSubTab("all")}
                    className="rounded-none"
                    data-testid="button-all-campaigns-tab"
                  >
                    All Campaigns
                  </Button>
                  <Button
                    variant={campaignSubTab === "history" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCampaignSubTab("history")}
                    className="rounded-none"
                    data-testid="button-campaign-history-tab"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    SMS Campaign History
                  </Button>
                  <Button
                    variant={campaignSubTab === "email_history" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCampaignSubTab("email_history")}
                    className="rounded-none"
                    data-testid="button-email-campaign-history-tab"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email Campaign History
                  </Button>
                </div>
                {canCreate('messaging') && (
                  <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Campaign</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="campaignName">Campaign Name *</Label>
                            <Popover open={campaignNamePopoverOpen} onOpenChange={setCampaignNamePopoverOpen}>
                              <PopoverTrigger asChild>
                                <div className="relative">
                                  <Input
                                    id="campaignName"
                                    placeholder="Search or enter campaign name..."
                                    value={newCampaign.name}
                                    onChange={(e) => {
                                      setNewCampaign(prev => ({ ...prev, name: e.target.value }));
                                      if (!campaignNamePopoverOpen) setCampaignNamePopoverOpen(true);
                                    }}
                                    onClick={() => setCampaignNamePopoverOpen(true)}
                                    data-testid="input-campaign-name"
                                    className="pr-8"
                                  />
                                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0 max-h-[400px] overflow-y-auto" align="start">
                                <ScrollArea className="h-[350px]">
                                  <div className="p-2">
                                    {(() => {
                                      const searchTerm = newCampaign.name.toLowerCase().trim();
                                      const filteredCategories = Object.entries(CAMPAIGN_NAME_SUGGESTIONS)
                                        .map(([category, suggestions]) => ({
                                          category,
                                          filtered: suggestions.filter(s =>
                                            searchTerm === '' || s.toLowerCase().includes(searchTerm)
                                          )
                                        }))
                                        .filter(({ filtered }) => filtered.length > 0);

                                      if (filteredCategories.length === 0) {
                                        return (
                                          <div className="p-4 text-center text-muted-foreground text-sm">
                                            No matching campaigns found. You can use your custom name.
                                          </div>
                                        );
                                      }

                                      return filteredCategories.map(({ category, filtered }) => (
                                        <div key={category} className="mb-3">
                                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded mb-1">
                                            {category}
                                          </div>
                                          {filtered.map((suggestion) => (
                                            <Button
                                              key={suggestion}
                                              variant="ghost"
                                              size="sm"
                                              className="w-full justify-start text-left h-8 px-2"
                                              onClick={() => {
                                                setNewCampaign(prev => ({ ...prev, name: suggestion }));
                                                setCampaignNamePopoverOpen(false);
                                              }}
                                              data-testid={`campaign-suggestion-${suggestion.replace(/\s+/g, '-').toLowerCase()}`}
                                            >
                                              {suggestion}
                                            </Button>
                                          ))}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="campaignType">Campaign Type</Label>
                            <Select
                              value={newCampaign.type}
                              onValueChange={(value: "email" | "sms" | "both") => {
                                setNewCampaign(prev => ({ ...prev, type: value, recipients: [] }));
                                setCampaignRecipientRole("");
                                setCampaignRecipientName("");
                                setCampaignRecipientPhone("");
                              }}
                            >
                              <SelectTrigger data-testid="select-campaign-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>Email Only</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="sms">
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    <span>SMS Only</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="both">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <Smartphone className="h-4 w-4" />
                                    <span>Email & SMS</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Campaign Type Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Campaign Method:</span>
                          {newCampaign.type === 'email' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <Mail className="h-3 w-3 mr-1" /> Email Campaign
                            </Badge>
                          )}
                          {newCampaign.type === 'sms' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <Smartphone className="h-3 w-3 mr-1" /> SMS Campaign
                            </Badge>
                          )}
                          {newCampaign.type === 'both' && (
                            <>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <Mail className="h-3 w-3 mr-1" /> Email
                              </Badge>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <Smartphone className="h-3 w-3 mr-1" /> SMS
                              </Badge>
                            </>
                          )}
                        </div>

                        {/* Recipient Selection - for all campaign types */}
                        <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-primary" />
                            <Label className="font-semibold">Add Recipients</Label>
                            <span className="text-xs text-muted-foreground ml-2">
                              {newCampaign.type === 'email' ? '(Email addresses will be used)' :
                                newCampaign.type === 'sms' ? '(Phone numbers will be used)' :
                                  '(Both email and phone will be used)'}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="campaignRecipientRole">Select Role</Label>
                              <Select
                                value={campaignRecipientRole}
                                onValueChange={(value) => {
                                  setCampaignRecipientRole(value);
                                  setCampaignRecipientName("");
                                  setCampaignRecipientPhone("");
                                }}
                              >
                                <SelectTrigger data-testid="select-campaign-recipient-role">
                                  <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="patient">Patient</SelectItem>
                                  {rolesData.filter((r: any) => r.name !== 'patient').map((role: any) => (
                                    <SelectItem key={role.id} value={role.name}>
                                      {role.displayName || role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="campaignRecipientName">Select Name</Label>
                              <Select
                                value={campaignRecipientName}
                                onValueChange={(value) => {
                                  setCampaignRecipientName(value);
                                  const recipients = getCampaignFilteredRecipients();
                                  const recipient = recipients.find((r: any) => `${r.firstName} ${r.lastName}` === value);
                                  if (recipient) {
                                    setCampaignRecipientPhone(recipient.phone || recipient.phoneNumber || recipient.mobile || '');
                                  }
                                }}
                                disabled={!campaignRecipientRole}
                              >
                                <SelectTrigger data-testid="select-campaign-recipient-name">
                                  <SelectValue placeholder={campaignRecipientRole ? "Select name..." : "Select role first"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {getCampaignFilteredRecipients().map((r: any) => (
                                    <SelectItem key={r.id} value={`${r.firstName} ${r.lastName}`}>
                                      {r.firstName} {r.lastName} {r.email ? `(${r.email})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {(newCampaign.type === 'sms' || newCampaign.type === 'both') && (
                              <div className="space-y-2">
                                <Label htmlFor="campaignRecipientPhone">Phone Number</Label>
                                <Input
                                  id="campaignRecipientPhone"
                                  placeholder="Enter phone number"
                                  value={campaignRecipientPhone}
                                  onChange={(e) => setCampaignRecipientPhone(e.target.value)}
                                  data-testid="input-campaign-recipient-phone"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label>&nbsp;</Label>
                              <Button
                                onClick={addCampaignRecipient}
                                className="w-full"
                                disabled={!campaignRecipientName}
                                data-testid="button-add-campaign-recipient"
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add
                              </Button>
                            </div>
                          </div>

                          {/* Recipients List */}
                          {newCampaign.recipients.length > 0 && (
                            <div className="mt-4">
                              <Label className="text-sm text-muted-foreground mb-2 block">
                                Selected Recipients ({newCampaign.recipients.length})
                              </Label>
                              <ScrollArea className="h-32 border rounded-md p-2 bg-white dark:bg-gray-800">
                                <div className="space-y-2">
                                  {newCampaign.recipients.map((recipient) => (
                                    <div key={recipient.id} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {recipient.role}
                                        </Badge>
                                        <span className="font-medium text-sm">{recipient.name}</span>
                                        {(newCampaign.type === 'sms' || newCampaign.type === 'both') && (
                                          <span className="text-sm text-muted-foreground">{recipient.phone || 'No phone'}</span>
                                        )}
                                        {(newCampaign.type === 'email' || newCampaign.type === 'both') && (
                                          <span className="text-sm text-muted-foreground">{recipient.email || 'No email'}</span>
                                        )}
                                      </div>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => removeCampaignRecipient(recipient.id)}
                                        data-testid={`button-remove-recipient-${recipient.id}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campaignSubject">Subject Line *</Label>
                          <Input
                            id="campaignSubject"
                            placeholder="Enter subject line"
                            value={newCampaign.subject}
                            onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                            data-testid="input-campaign-subject"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="campaignContent">Message Content *</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Personalization Tags:</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNewCampaign(prev => ({ ...prev, content: prev.content + '[FirstName]' }))}
                                data-testid="button-insert-firstname"
                              >
                                [FirstName]
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNewCampaign(prev => ({ ...prev, content: prev.content + '[LastName]' }))}
                                data-testid="button-insert-lastname"
                              >
                                [LastName]
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            id="campaignContent"
                            placeholder="Enter your campaign message content... Use [FirstName] and [LastName] for personalization."
                            rows={6}
                            value={newCampaign.content}
                            onChange={(e) => setNewCampaign(prev => ({ ...prev, content: e.target.value }))}
                            data-testid="textarea-campaign-content"
                          />
                          <p className="text-xs text-muted-foreground">
                            Example: "Hello [FirstName], your update from Cura Healthcare EMR."
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campaignTemplate">Template</Label>
                          <Select
                            value={newCampaign.template}
                            onValueChange={(value) =>
                              setNewCampaign(prev => ({ ...prev, template: value }))
                            }
                          >
                            <SelectTrigger data-testid="select-campaign-template">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                              <SelectItem value="health_tip">Health Tip</SelectItem>
                              <SelectItem value="vaccination_reminder">Vaccination Reminder</SelectItem>
                              <SelectItem value="follow_up">Follow-up Care</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Send or Schedule Options */}
                        <div className="space-y-4 p-4 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <Label className="font-semibold">Send Options</Label>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                id="sendNow"
                                name="sendMode"
                                checked={newCampaign.sendMode === 'now'}
                                onChange={() => setNewCampaign(prev => ({ ...prev, sendMode: 'now' }))}
                                className="w-4 h-4"
                                data-testid="radio-send-now"
                              />
                              <Label htmlFor="sendNow" className="cursor-pointer">Send Now</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                id="schedule"
                                name="sendMode"
                                checked={newCampaign.sendMode === 'schedule'}
                                onChange={() => setNewCampaign(prev => ({ ...prev, sendMode: 'schedule' }))}
                                className="w-4 h-4"
                                data-testid="radio-schedule"
                              />
                              <Label htmlFor="schedule" className="cursor-pointer">Schedule for Later</Label>
                            </div>
                          </div>

                          {newCampaign.sendMode === 'schedule' && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="space-y-2">
                                <Label htmlFor="scheduledDateTime">Date & Time</Label>
                                <Input
                                  id="scheduledDateTime"
                                  type="datetime-local"
                                  value={newCampaign.scheduledDateTime}
                                  onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduledDateTime: e.target.value }))}
                                  min={new Date().toISOString().slice(0, 16)}
                                  data-testid="input-scheduled-datetime"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="timezone">Time Zone</Label>
                                <Select
                                  value={newCampaign.timezone}
                                  onValueChange={(value) => setNewCampaign(prev => ({ ...prev, timezone: value }))}
                                >
                                  <SelectTrigger data-testid="select-timezone">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                                    <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                                    <SelectItem value="America/Chicago">America/Chicago (CST/CDT)</SelectItem>
                                    <SelectItem value="Europe/Paris">Europe/Paris (CET/CEST)</SelectItem>
                                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                                    <SelectItem value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</SelectItem>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Time will be converted to UTC before sending.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowCreateCampaign(false);
                              resetCampaignForm();
                            }}
                            data-testid="button-cancel-campaign"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleSaveCampaign}
                            disabled={createCampaignMutation.isPending || isSendingCampaign}
                            data-testid="button-save-draft-campaign"
                          >
                            {createCampaignMutation.isPending ? "Saving..." : newCampaign.sendMode === 'schedule' ? "Schedule Campaign" : "Save Draft"}
                          </Button>
                          {newCampaign.sendMode === 'now' && (
                            <Button
                              onClick={handleSaveAndSendCampaign}
                              disabled={createCampaignMutation.isPending || isSendingCampaign}
                              data-testid="button-send-campaign"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {isSendingCampaign ? "Sending..." : "Save & Send Now"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Sending Progress Dialog */}
                <Dialog open={showSendingProgress} onOpenChange={() => { }}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary animate-pulse" />
                        Sending Campaign
                      </DialogTitle>
                      <DialogDescription>
                        Sending SMS to recipients one by one...
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {sendingRecipients.map((recipient, index) => (
                        <div
                          key={recipient.id}
                          className={`flex items-center justify-between p-3 rounded-md border ${recipient.status === 'sent'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : recipient.status === 'failed'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : recipient.status === 'sending'
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}
                          data-testid={`sending-recipient-${recipient.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {recipient.status === 'sent' && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                              {recipient.status === 'failed' && (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              {recipient.status === 'sending' && (
                                <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              )}
                              {recipient.status === 'pending' && (
                                <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{recipient.name}</div>
                              <div className="text-xs text-muted-foreground">{recipient.phone}</div>
                            </div>
                          </div>
                          <div className="text-xs">
                            {recipient.status === 'sent' && (
                              <span className="text-green-600 font-medium">Sent</span>
                            )}
                            {recipient.status === 'failed' && (
                              <span className="text-red-600 font-medium">Failed</span>
                            )}
                            {recipient.status === 'sending' && (
                              <span className="text-blue-600 font-medium">Sending...</span>
                            )}
                            {recipient.status === 'pending' && (
                              <span className="text-gray-500">Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      {sendingRecipients.filter(r => r.status === 'sent').length} of {sendingRecipients.length} sent
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Campaign Summary Dialog */}
                <Dialog open={showCampaignSummary} onOpenChange={setShowCampaignSummary}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Campaign Summary
                      </DialogTitle>
                    </DialogHeader>
                    {campaignSummary && (
                      <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-primary">{campaignSummary.totalRecipients}</div>
                              <div className="text-sm text-muted-foreground">Total Recipients</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-green-600">{campaignSummary.totalSent}</div>
                              <div className="text-sm text-muted-foreground">Successfully Sent</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-red-600">{campaignSummary.totalFailed}</div>
                              <div className="text-sm text-muted-foreground">Failed</div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Delivery Log */}
                        <div className="space-y-2">
                          <Label className="font-semibold">Delivery Log</Label>
                          <ScrollArea className="h-64 border rounded-md">
                            <div className="p-4 space-y-2">
                              {campaignSummary.deliveryLog.map((log, index) => (
                                <div
                                  key={index}
                                  className={`flex items-center justify-between p-3 rounded-md ${log.status === 'sent'
                                    ? 'bg-green-50 dark:bg-green-900/20'
                                    : 'bg-red-50 dark:bg-red-900/20'
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {log.status === 'sent' ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    )}
                                    <div>
                                      <div className="font-medium text-sm">{log.recipient}</div>
                                      <div className="text-xs text-muted-foreground">{log.phone}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                                      {log.status}
                                    </Badge>
                                    {log.messageId && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        ID: {log.messageId.substring(0, 15)}...
                                      </div>
                                    )}
                                    {log.error && (
                                      <div className="text-xs text-red-600 mt-1">
                                        {log.error}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              setShowCampaignSummary(false);
                              setCampaignSummary(null);
                            }}
                            data-testid="button-close-summary"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* All Campaigns Tab */}
            {campaignSubTab === "all" && (
              <div className="bg-white dark:bg-slate-900 rounded-lg h-[550px] overflow-y-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {!campaigns || campaigns.length === 0 ? (
                    <Card className="col-span-2 bg-white dark:bg-slate-900">
                      <CardContent className="p-8 text-center">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                        <p className="text-sm text-gray-600">Create your first messaging campaign to engage patients and staff.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    campaigns.map((campaign: Campaign) => (
                      <Card key={campaign.id} className="bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <CardTitle className="text-lg truncate min-w-0 flex-1" title={campaign.name}>
                              {campaign.name}
                            </CardTitle>
                            <Badge className={getCampaignStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {campaign.type === 'email' ? <Mail className="h-4 w-4 flex-shrink-0" /> : <Smartphone className="h-4 w-4 flex-shrink-0" />}
                              <span className="text-sm font-medium truncate min-w-0" title={campaign.subject}>
                                {campaign.subject}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="min-w-0">
                                <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                                <span className="ml-2 font-medium">{campaign.recipientCount}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-600 dark:text-gray-400">Sent:</span>
                                <span className="ml-2 font-medium">{campaign.sentCount}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-600 dark:text-gray-400">Open Rate:</span>
                                <span className="ml-2 font-medium">{campaign.openRate}%</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-600 dark:text-gray-400">Click Rate:</span>
                                <span className="ml-2 font-medium">{campaign.clickRate}%</span>
                              </div>
                            </div>

                            {/* Show creator info for admin users */}
                            {user?.role === 'admin' && campaign.createdByName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
                                <span>Created by: </span>
                                <span className="font-medium">{campaign.createdByName}</span>
                                {campaign.createdByRole && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {campaign.createdByRole}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-3 border-t flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewCampaign(campaign)}
                                data-testid={`button-view-campaign-${campaign.id}`}
                              >
                                View
                              </Button>
                              {canEdit('messaging') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditCampaign(campaign)}
                                  data-testid={`button-edit-campaign-${campaign.id}`}
                                >
                                  Edit
                                </Button>
                              )}
                              {campaign.status !== 'sent' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleSendExistingCampaign(campaign, e)}
                                  disabled={sendingCampaignId === campaign.id}
                                  data-testid={`button-send-campaign-${campaign.id}`}
                                >
                                  {sendingCampaignId === campaign.id ? "Sending..." : "Send Campaign"}
                                </Button>
                              )}
                              {campaign.status === 'sent' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleSendExistingCampaign(campaign, e);
                                  }}
                                  disabled={sendingCampaignId === campaign.id}
                                  data-testid={`button-resend-campaign-${campaign.id}`}
                                >
                                  {sendingCampaignId === campaign.id ? "Sending..." : "Resend Campaign"}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicateCampaign(campaign)}
                                disabled={duplicateCampaignMutation.isPending}
                                data-testid={`button-duplicate-campaign-${campaign.id}`}
                              >
                                Duplicate
                              </Button>
                              {canDelete('messaging') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteCampaign(campaign)}
                                  disabled={deleteCampaignMutation.isPending}
                                  data-testid={`button-delete-campaign-${campaign.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SMS Campaign History Tab */}
            {campaignSubTab === "history" && (
              <div className="bg-white dark:bg-slate-900 rounded-lg h-[550px] overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">SMS Campaign History</h3>
                  </div>

                  {!campaigns ||
                    campaigns.filter(
                      (c: Campaign) =>
                        c.status === "sent" && (c.type === "sms" || c.type === "both"),
                    ).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">
                          No SMS campaigns sent yet
                        </h3>
                        <p className="text-sm text-gray-600">
                          SMS campaigns you send will appear here with their complete
                          history.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {campaigns
                        .filter(
                          (c: Campaign) =>
                            c.status === "sent" &&
                            (c.type === "sms" || c.type === "both"),
                        )
                        .sort((a: Campaign, b: Campaign) => {
                          const dateA = a.sentAt
                            ? new Date(a.sentAt).getTime()
                            : 0;
                          const dateB = b.sentAt
                            ? new Date(b.sentAt).getTime()
                            : 0;
                          return dateB - dateA;
                        })
                        .map((campaign: Campaign) => (
                          <Card
                            key={campaign.id}
                            className="border-l-4 border-l-green-500 overflow-hidden"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                                    <h4 className="font-semibold text-lg truncate min-w-0" title={campaign.name}>
                                      {campaign.name}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex-shrink-0"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Sent
                                    </Badge>
                                    <Badge variant="outline" className="flex-shrink-0">
                                      {campaign.type === "email" ? (
                                        <Mail className="h-3 w-3 mr-1" />
                                      ) : (
                                        <Smartphone className="h-3 w-3 mr-1" />
                                      )}
                                      {campaign.type.toUpperCase()}
                                    </Badge>
                                  </div>

                                  <p className="text-sm text-muted-foreground truncate min-w-0" title={campaign.subject}>
                                    {campaign.subject}
                                  </p>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Sent At
                                      </div>
                                      <div className="font-medium truncate" title={campaign.sentAt
                                        ? format(
                                          new Date(campaign.sentAt),
                                          "MMM dd, yyyy HH:mm",
                                        )
                                        : "N/A"}>
                                        {campaign.sentAt
                                          ? format(
                                            new Date(campaign.sentAt),
                                            "MMM dd, yyyy HH:mm",
                                          )
                                          : "N/A"}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Recipients
                                      </div>
                                      <div className="font-medium">
                                        {campaign.recipientCount}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Delivered
                                      </div>
                                      <div className="font-medium text-green-600 dark:text-green-400">
                                        {campaign.sentCount}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Open Rate
                                      </div>
                                      <div className="font-medium">
                                        {campaign.openRate}%
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 min-w-0">
                                    <Calendar className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate min-w-0" title={`Created: ${format(
                                      new Date(campaign.createdAt),
                                      "MMM dd, yyyy HH:mm",
                                    )}`}>
                                      Created:{" "}
                                      {format(
                                        new Date(campaign.createdAt),
                                        "MMM dd, yyyy HH:mm",
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewCampaign(campaign)}
                                    data-testid={`button-view-history-campaign-${campaign.id}`}
                                  >
                                    View Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleSendExistingCampaign(campaign, e);
                                    }}
                                    disabled={sendingCampaignId === campaign.id}
                                    data-testid={`button-resend-history-campaign-${campaign.id}`}
                                  >
                                    {sendingCampaignId === campaign.id
                                      ? "Sending..."
                                      : "Resend Campaign"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleDuplicateCampaign(campaign)
                                    }
                                    data-testid={`button-duplicate-history-campaign-${campaign.id}`}
                                  >
                                    Duplicate
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Campaign History Tab */}
            {campaignSubTab === "email_history" && (
              <div className="bg-white dark:bg-slate-900 rounded-lg h-[550px] overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Email Campaign History</h3>
                  </div>

                  {!campaigns ||
                    campaigns.filter(
                      (c: Campaign) =>
                        c.status === "sent" &&
                        (c.type === "email" || c.type === "both"),
                    ).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">
                          No email campaigns sent yet
                        </h3>
                        <p className="text-sm text-gray-600">
                          Email campaigns you send will appear here with their
                          complete history.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {campaigns
                        .filter(
                          (c: Campaign) =>
                            c.status === "sent" &&
                            (c.type === "email" || c.type === "both"),
                        )
                        .sort((a: Campaign, b: Campaign) => {
                          const dateA = a.sentAt
                            ? new Date(a.sentAt).getTime()
                            : 0;
                          const dateB = b.sentAt
                            ? new Date(b.sentAt).getTime()
                            : 0;
                          return dateB - dateA;
                        })
                        .map((campaign: Campaign) => (
                          <Card
                            key={campaign.id}
                            className="border-l-4 border-l-blue-500 overflow-hidden"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                                    <h4 className="font-semibold text-lg truncate min-w-0" title={campaign.name}>
                                      {campaign.name}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex-shrink-0"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Sent
                                    </Badge>
                                    <Badge variant="outline" className="flex-shrink-0">
                                      <Mail className="h-3 w-3 mr-1" />
                                      {campaign.type.toUpperCase()}
                                    </Badge>
                                  </div>

                                  <p className="text-sm text-muted-foreground truncate min-w-0" title={campaign.subject}>
                                    {campaign.subject}
                                  </p>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Sent At
                                      </div>
                                      <div className="font-medium truncate" title={campaign.sentAt
                                        ? format(
                                          new Date(campaign.sentAt),
                                          "MMM dd, yyyy HH:mm",
                                        )
                                        : "N/A"}>
                                        {campaign.sentAt
                                          ? format(
                                            new Date(campaign.sentAt),
                                            "MMM dd, yyyy HH:mm",
                                          )
                                          : "N/A"}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Recipients
                                      </div>
                                      <div className="font-medium">
                                        {campaign.recipientCount}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Delivered
                                      </div>
                                      <div className="font-medium text-green-600 dark:text-green-400">
                                        {campaign.sentCount}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded min-w-0">
                                      <div className="text-muted-foreground text-xs">
                                        Open Rate
                                      </div>
                                      <div className="font-medium">
                                        {campaign.openRate}%
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 min-w-0 flex-wrap">
                                    <Calendar className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate min-w-0" title={`Created: ${format(
                                      new Date(campaign.createdAt),
                                      "MMM dd, yyyy HH:mm",
                                    )}`}>
                                      Created:{" "}
                                      {format(
                                        new Date(campaign.createdAt),
                                        "MMM dd, yyyy HH:mm",
                                      )}
                                    </span>
                                    {/* Show creator info for admin users */}
                                    {user?.role === 'admin' && campaign.createdByName && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className="truncate min-w-0" title={`Created by: ${campaign.createdByName}`}>
                                          By: {campaign.createdByName}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewCampaign(campaign)}
                                    data-testid={`button-view-email-history-campaign-${campaign.id}`}
                                  >
                                    View Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleSendExistingCampaign(campaign, e);
                                    }}
                                    disabled={sendingCampaignId === campaign.id}
                                    data-testid={`button-resend-email-history-campaign-${campaign.id}`}
                                  >
                                    {sendingCampaignId === campaign.id
                                      ? "Sending..."
                                      : "Resend Campaign"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleDuplicateCampaign(campaign)
                                    }
                                    data-testid={`button-duplicate-email-history-campaign-${campaign.id}`}
                                  >
                                    Duplicate
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Duplicate Campaign Dialog */}
            <Dialog open={showDuplicateCampaignDialog} onOpenChange={(open) => {
              setShowDuplicateCampaignDialog(open);
              if (!open) {
                setCampaignToDuplicate(null);
                setDuplicateCampaignName("");
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Duplicate Campaign</DialogTitle>
                  <DialogDescription>
                    This campaign will be created as a follow-up to {campaignToDuplicate?.name || "the selected campaign"}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="duplicateCampaignName">Campaign Name</Label>
                    <Input
                      id="duplicateCampaignName"
                      value={duplicateCampaignName}
                      onChange={(e) => setDuplicateCampaignName(e.target.value)}
                      placeholder="Enter campaign name"
                    />
                    <p className="text-sm text-muted-foreground">
                      This follow-up email is part of the same payment reminder sequence.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDuplicateCampaignDialog(false);
                      setCampaignToDuplicate(null);
                      setDuplicateCampaignName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDuplicateCampaign}
                    disabled={duplicateCampaignMutation.isPending || !duplicateCampaignName.trim()}
                  >
                    {duplicateCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Campaign Dialog */}
            <Dialog open={showEditCampaign} onOpenChange={setShowEditCampaign}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Campaign</DialogTitle>
                  <DialogDescription>
                    Update the campaign details below. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editCampaignName">Campaign Name *</Label>
                      <Input
                        id="editCampaignName"
                        placeholder="Enter campaign name"
                        value={editingCampaign.name}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                        data-testid="input-edit-campaign-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editCampaignType">Campaign Type *</Label>
                      <Select
                        value={editingCampaign.type}
                        onValueChange={(value) => setEditingCampaign({ ...editingCampaign, type: value as any })}
                      >
                        <SelectTrigger data-testid="select-edit-campaign-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>Email</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              <span>SMS</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <Smartphone className="h-4 w-4" />
                              <span>Both</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editCampaignStatus">Status</Label>
                      <Select
                        value={editingCampaign.status}
                        onValueChange={(value) => setEditingCampaign({ ...editingCampaign, status: value as any })}
                      >
                        <SelectTrigger data-testid="select-edit-campaign-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editCampaignTemplate">Template</Label>
                      <Select
                        value={editingCampaign.template}
                        onValueChange={(value) => setEditingCampaign({ ...editingCampaign, template: value })}
                      >
                        <SelectTrigger data-testid="select-edit-campaign-template">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                          <SelectItem value="health_tip">Health Tip</SelectItem>
                          <SelectItem value="vaccination_reminder">Vaccination Reminder</SelectItem>
                          <SelectItem value="follow_up">Follow-up Care</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editingCampaign.status === 'scheduled' && (
                    <div className="space-y-2">
                      <Label htmlFor="editCampaignScheduledAt">Scheduled Date & Time</Label>
                      <Input
                        id="editCampaignScheduledAt"
                        type="datetime-local"
                        value={editingCampaign.scheduledAt ? new Date(editingCampaign.scheduledAt).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, scheduledAt: e.target.value })}
                        data-testid="input-edit-campaign-scheduled-at"
                      />
                    </div>
                  )}

                  <div className="p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <Label className="text-base font-medium">Add Recipients</Label>
                    </div>

                    <div className="grid grid-cols-4 gap-3 items-end">
                      <div className="space-y-2">
                        <Label className="text-sm">Select Role</Label>
                        <Select
                          value={editCampaignRecipientRole}
                          onValueChange={(value) => {
                            setEditCampaignRecipientRole(value);
                            setEditCampaignRecipientName("");
                            setEditCampaignRecipientPhone("");
                          }}
                        >
                          <SelectTrigger data-testid="select-edit-recipient-role">
                            <SelectValue placeholder="Select role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="patient">Patient</SelectItem>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                            <SelectItem value="administrator">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Select Name</Label>
                        <Select
                          value={editCampaignRecipientName}
                          onValueChange={(value) => {
                            setEditCampaignRecipientName(value);
                            const recipientsList = editCampaignRecipientRole === 'patient'
                              ? (patientsData || [])
                              : (usersData || []).filter((u: any) => u.role === editCampaignRecipientRole);
                            const recipient = recipientsList.find((r: any) => `${r.firstName} ${r.lastName}` === value);
                            if (recipient) {
                              setEditCampaignRecipientPhone(recipient.phone || recipient.phoneNumber || recipient.mobile || '');
                            }
                          }}
                          disabled={!editCampaignRecipientRole}
                        >
                          <SelectTrigger data-testid="select-edit-recipient-name">
                            <SelectValue placeholder={editCampaignRecipientRole ? "Select name" : "Select role first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getEditCampaignFilteredRecipients().map((r: any) => (
                              <SelectItem key={r.id} value={`${r.firstName} ${r.lastName}`}>
                                {r.firstName} {r.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Phone Number</Label>
                        <Input
                          placeholder="Enter phone number"
                          value={editCampaignRecipientPhone}
                          onChange={(e) => setEditCampaignRecipientPhone(e.target.value)}
                          data-testid="input-edit-recipient-phone"
                        />
                      </div>

                      <Button
                        onClick={addEditCampaignRecipient}
                        className="bg-primary hover:bg-primary/90"
                        data-testid="button-add-edit-recipient"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>

                    {editingCampaign.recipients.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Added Recipients ({editingCampaign.recipients.length})</Label>
                        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                          {editingCampaign.recipients.map((recipient) => (
                            <div key={recipient.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="capitalize text-xs">{recipient.role}</Badge>
                                </div>
                                <span className="font-semibold text-base">{recipient.name}</span>
                                <div className="flex flex-col gap-1">
                                  {recipient.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                      <Phone className="h-3 w-3" />
                                      <span className="font-mono">{recipient.phone}</span>
                                    </div>
                                  )}
                                  {recipient.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                      <Mail className="h-3 w-3" />
                                      <span>{recipient.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeEditCampaignRecipient(recipient.id)}
                                data-testid={`button-remove-edit-recipient-${recipient.id}`}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editCampaignSubject">Subject *</Label>
                    <Input
                      id="editCampaignSubject"
                      placeholder="Enter subject line"
                      value={editingCampaign.subject}
                      onChange={(e) => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                      data-testid="input-edit-campaign-subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="editCampaignContent">Message Content *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Insert:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCampaign({ ...editingCampaign, content: editingCampaign.content + '[FirstName]' })}
                          data-testid="button-edit-insert-firstname"
                        >
                          [FirstName]
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCampaign({ ...editingCampaign, content: editingCampaign.content + '[LastName]' })}
                          data-testid="button-edit-insert-lastname"
                        >
                          [LastName]
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="editCampaignContent"
                      placeholder="Enter your campaign message content..."
                      rows={6}
                      value={editingCampaign.content}
                      onChange={(e) => setEditingCampaign({ ...editingCampaign, content: e.target.value })}
                      data-testid="textarea-edit-campaign-content"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditCampaign(false)}
                      data-testid="button-cancel-edit-campaign"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmEditCampaign}
                      disabled={editCampaignMutation.isPending}
                      data-testid="button-save-edit-campaign"
                    >
                      {editCampaignMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Campaign Dialog */}
            <Dialog open={showDeleteCampaign} onOpenChange={setShowDeleteCampaign}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Campaign</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete the campaign "{campaignToDelete?.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteCampaign(false);
                      setCampaignToDelete(null);
                    }}
                    data-testid="button-cancel-delete-campaign"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDeleteCampaign}
                    disabled={deleteCampaignMutation.isPending}
                    data-testid="button-confirm-delete-campaign"
                  >
                    {deleteCampaignMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* No Recipients Error Dialog */}
            <Dialog open={showNoRecipientsDialog} onOpenChange={setShowNoRecipientsDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Failed to Send Campaign</DialogTitle>
                  <DialogDescription>
                    No recipients in this campaign. Please add recipients before sending.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="default"
                    onClick={() => setShowNoRecipientsDialog(false)}
                    data-testid="button-close-no-recipients-dialog"
                  >
                    OK
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Conversation Favorited Dialog */}
            <Dialog open={showFavoriteDialog} onOpenChange={setShowFavoriteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conversation Favorited</DialogTitle>
                  <DialogDescription>
                    Your conversation "{favoritedConversationName}" is favorited now
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowFavoriteDialog(false);
                      setFavoritedConversationName("");
                    }}
                    data-testid="button-close-favorite-dialog"
                  >
                    OK
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Conversation Unfavorited Dialog */}
            <Dialog open={showUnfavoriteDialog} onOpenChange={setShowUnfavoriteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conversation Unfavorited</DialogTitle>
                  <DialogDescription>
                    Your conversation "{unfavoritedConversationName}" has been removed from favorites
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowUnfavoriteDialog(false);
                      setUnfavoritedConversationName("");
                    }}
                    data-testid="button-close-unfavorite-dialog"
                  >
                    OK
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* View Campaign Dialog */}
            <Dialog open={showViewCampaign} onOpenChange={setShowViewCampaign}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span>Campaign Details</span>
                    {viewingCampaign && (
                      <Badge className={getCampaignStatusColor(viewingCampaign.status)}>
                        {viewingCampaign.status}
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                {viewingCampaign && (
                  <div className="space-y-6">
                    {/* Campaign Header */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <h3 className="text-xl font-semibold mb-2">{viewingCampaign.name}</h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        {viewingCampaign.type === 'email' && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <Mail className="h-3 w-3 mr-1" /> Email Campaign
                          </Badge>
                        )}
                        {viewingCampaign.type === 'sms' && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Smartphone className="h-3 w-3 mr-1" /> SMS Campaign
                          </Badge>
                        )}
                        {viewingCampaign.type === 'both' && (
                          <>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <Mail className="h-3 w-3 mr-1" /> Email
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <Smartphone className="h-3 w-3 mr-1" /> SMS
                            </Badge>
                          </>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Template: {viewingCampaign.template || 'Default'}
                        </span>
                      </div>
                    </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setShowViewCampaignRecipients(!showViewCampaignRecipients)}
                        data-testid="card-view-recipients"
                      >
                        <CardContent className="p-4 text-center">
                          <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <p className="text-2xl font-bold">{viewingCampaign.recipientCount || (viewingCampaign.recipients?.length || 0)}</p>
                          <p className="text-xs text-muted-foreground">Recipients</p>
                          <p className="text-xs text-primary mt-1">{showViewCampaignRecipients ? 'Click to hide' : 'Click to view'}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Send className="h-6 w-6 mx-auto mb-2 text-green-600" />
                          <p className="text-2xl font-bold">{viewingCampaign.sentCount}</p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Mail className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                          <p className="text-2xl font-bold">{viewingCampaign.openRate}%</p>
                          <p className="text-xs text-muted-foreground">Open Rate</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                          <p className="text-2xl font-bold">{viewingCampaign.clickRate}%</p>
                          <p className="text-xs text-muted-foreground">Click Rate</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                        <p className="font-medium">{viewingCampaign.subject}</p>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Message Content</Label>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                        <p className="whitespace-pre-wrap">{viewingCampaign.content}</p>
                      </div>
                    </div>

                    {/* Recipients - shown when clicking on Recipients card */}
                    {showViewCampaignRecipients && (
                      <div className="space-y-2 border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Campaign Recipients ({viewingCampaign.recipients?.length || 0})
                        </Label>
                        {viewingCampaign.recipients && viewingCampaign.recipients.length > 0 ? (
                          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto bg-background">
                            {viewingCampaign.recipients.map((recipient: any, index: number) => (
                              <div key={recipient.id || index} className="p-4">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="capitalize text-xs">
                                      {recipient.role}
                                    </Badge>
                                  </div>
                                  <span className="font-semibold text-base">{recipient.name}</span>
                                  <div className="flex flex-col gap-1">
                                    {recipient.phone && (
                                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Phone className="h-3 w-3" />
                                        <span className="font-mono">{recipient.phone}</span>
                                      </div>
                                    )}
                                    {recipient.email && (
                                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Mail className="h-3 w-3" />
                                        <span>{recipient.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground border rounded-lg bg-background">
                            No recipients added to this campaign yet.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{viewingCampaign.createdAt ? format(new Date(viewingCampaign.createdAt), 'PPpp') : 'N/A'}</span>
                        </div>
                      </div>
                      {viewingCampaign.scheduledAt && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Scheduled At</Label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(viewingCampaign.scheduledAt), 'PPpp')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      {canEdit('messaging') && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowViewCampaign(false);
                            handleEditCampaign(viewingCampaign);
                          }}
                          data-testid="button-view-to-edit-campaign"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Campaign
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleDuplicateCampaign(viewingCampaign)}
                        disabled={duplicateCampaignMutation.isPending}
                        data-testid="button-view-duplicate-campaign"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </Button>
                      <Button
                        onClick={() => setShowViewCampaign(false)}
                        data-testid="button-close-view-campaign"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6 min-w-0 overflow-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 min-w-0 max-w-full">
              <h2 className="text-xl font-semibold">Message Announcement</h2>
              <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
                {canCreate('messaging') && (
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Announcement
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Announcement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="templateName">Announcement Name *</Label>
                        <Input
                          id="templateName"
                          placeholder="Enter Announcement name"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={newTemplate.category}
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="medical">Medical</SelectItem>
                            <SelectItem value="preventive">Preventive</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Enter subject line"
                        value={newTemplate.subject}
                        onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Message Content *</Label>
                      <Textarea
                        id="content"
                        placeholder="Enter message content. Use {{variableName}} for dynamic content."
                        rows={8}
                        value={newTemplate.content}
                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">Tip: Use placeholders like {'{{patientName}}'}, {'{{date}}'}, {'{{doctorName}}'} for dynamic content</p>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateTemplate(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTemplate}
                        disabled={createTemplateMutation.isPending}
                      >
                        {createTemplateMutation.isPending ? "Creating..." : "Create Announcement"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg h-[550px] overflow-y-auto p-4">
              {templatesLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p>Loading templates...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : !templates || templates.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Announcements Yet</h3>
                      <p className="mb-4">Create your first message announcement to get started.</p>
                      <Button onClick={() => setShowCreateTemplate(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Announcement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template: any) => (
                    <Card key={template.id} className="bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          </div>
                          <Badge variant={template.category === 'urgent' ? 'destructive' : 'secondary'}>
                            {template.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject:</p>
                          <p className="text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 p-2 rounded">{template.subject}</p>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                            {template.content.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-2">
                          <span>Used {template.usageCount || 0} times</span>
                          <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                        </div>
                        {/* Show creator info for admin users */}
                        {user?.role === 'admin' && template.createdByName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t mt-2">
                            <span>Created by: </span>
                            <span className="font-medium">{template.createdByName}</span>
                            {template.createdByRole && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {template.createdByRole}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-3 border-t mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUseTemplate(template)}
                            data-testid={`button-use-template-${template.id}`}
                          >
                            Public Notice
                          </Button>
                          {canEdit('messaging') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                              data-testid={`button-edit-template-${template.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyTemplate(template)}
                            disabled={copyTemplateMutation.isPending}
                            data-testid={`button-copy-template-${template.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {canDelete('messaging') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template)}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Use Template Dialog */}
            <Dialog open={showUseTemplate} onOpenChange={setShowUseTemplate}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send Template to Selected Users</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Template Details</h4>
                    {selectedTemplate && (
                      <>
                        <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Name:</strong> {selectedTemplate.name}</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Subject:</strong> {selectedTemplate.subject}</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mt-2"><strong>Content Preview:</strong></p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{selectedTemplate.content.substring(0, 200)}...</p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Available Users Panel */}
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Available Users</h4>

                      {/* Filters */}
                      <div className="space-y-3 mb-3">
                        <div className="space-y-2">
                          <Label htmlFor="filterRole" className="text-xs">Filter by Role</Label>
                          <Select
                            value={recipientFilter.role}
                            onValueChange={(value) => setRecipientFilter({ ...recipientFilter, role: value })}
                          >
                            <SelectTrigger id="filterRole" className="h-9" data-testid="select-filter-role">
                              <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Roles</SelectItem>
                              {allRoles.map((role: any) => (
                                <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filterName" className="text-xs">Search by Name or Email</Label>
                          <Input
                            id="filterName"
                            placeholder="Search name or email..."
                            value={recipientFilter.searchName}
                            onChange={(e) => setRecipientFilter({ ...recipientFilter, searchName: e.target.value })}
                            className="h-9"
                            data-testid="input-filter-name"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllFiltered}
                          className="w-full"
                          data-testid="button-add-all-filtered"
                        >
                          Add All Filtered ({getFilteredUsers().length})
                        </Button>
                      </div>

                      {/* Available Users List */}
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {getFilteredUsers().length > 0 ? (
                          getFilteredUsers().map((user: any) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between text-sm py-2 px-2 bg-gray-50 dark:bg-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-600"
                            >
                              <div className="flex-1">
                                <p className="text-gray-700 dark:text-gray-200 font-medium">{user.firstName} {user.lastName}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">{user.email}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Role: {user.role}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddRecipient(user)}
                                disabled={selectedRecipients.find(r => r.id === user.id)}
                                data-testid={`button-add-recipient-${user.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No users match your filters</p>
                        )}
                      </div>
                    </div>

                    {/* Selected Recipients Panel */}
                    <div className="border rounded-md p-4 bg-green-50 dark:bg-green-900/10">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Email Recipients ({selectedRecipients.length} selected)
                      </h4>

                      <div className="max-h-[400px] overflow-y-auto space-y-1">
                        {selectedRecipients.length > 0 ? (
                          selectedRecipients.map((user: any) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between text-sm py-2 px-2 bg-white dark:bg-slate-700 rounded"
                            >
                              <div className="flex-1">
                                <p className="text-gray-700 dark:text-gray-200 font-medium">{user.firstName} {user.lastName}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">{user.email}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Role: {user.role}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRecipient(user.id)}
                                data-testid={`button-remove-recipient-${user.id}`}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-sm text-gray-500 mb-2">No recipients selected</p>
                            <p className="text-xs text-gray-400">Add users from the left panel</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUseTemplate(false);
                        setSelectedRecipients([]);
                        setRecipientFilter({ role: "all", searchName: "" });
                      }}
                      data-testid="button-cancel-use-template"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmUseTemplate}
                      disabled={useTemplateMutation.isPending || selectedRecipients.length === 0}
                      data-testid="button-send-template"
                    >
                      {useTemplateMutation.isPending ? "Sending..." : `Send to ${selectedRecipients.length} Recipients`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Template Dialog */}
            <Dialog open={showEditTemplate} onOpenChange={setShowEditTemplate}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editTemplateName">Template Name *</Label>
                      <Input
                        id="editTemplateName"
                        placeholder="Enter template name"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        data-testid="input-edit-template-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editCategory">Category *</Label>
                      <Select
                        value={editingTemplate.category}
                        onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value as any })}
                      >
                        <SelectTrigger data-testid="select-edit-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="preventive">Preventive</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editSubject">Subject *</Label>
                    <Input
                      id="editSubject"
                      placeholder="Enter subject line"
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      data-testid="input-edit-template-subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editContent">Message Content *</Label>
                    <Textarea
                      id="editContent"
                      placeholder="Enter message content. Use {{variableName}} for dynamic content."
                      rows={8}
                      value={editingTemplate.content}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                      data-testid="textarea-edit-template-content"
                    />
                    <p className="text-xs text-gray-500">Tip: Use placeholders like {'{{patientName}}'}, {'{{date}}'}, {'{{doctorName}}'} for dynamic content</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditTemplate(false)}
                      data-testid="button-cancel-edit-template"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmEditTemplate}
                      disabled={editTemplateMutation.isPending}
                      data-testid="button-save-edit-template"
                    >
                      {editTemplateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Template Dialog */}
            <Dialog open={showDeleteTemplate} onOpenChange={setShowDeleteTemplate}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Template</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteTemplate(false);
                      setTemplateToDelete(null);
                    }}
                    data-testid="button-cancel-delete-template"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDeleteTemplate}
                    disabled={deleteTemplateMutation.isPending}
                    data-testid="button-confirm-delete-template"
                  >
                    {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Duplicate Announcement Dialog */}
            <Dialog open={showDuplicateAnnouncementDialog} onOpenChange={(open) => {
              setShowDuplicateAnnouncementDialog(open);
              if (!open) {
                setAnnouncementToDuplicate(null);
                setDuplicateAnnouncementName("");
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Duplicate Announcement</DialogTitle>
                  <DialogDescription>
                    This Announcement will be created as a follow-up to {announcementToDuplicate?.name || "the selected announcement"}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="duplicateAnnouncementName">Announcement Name</Label>
                    <Input
                      id="duplicateAnnouncementName"
                      value={duplicateAnnouncementName}
                      onChange={(e) => setDuplicateAnnouncementName(e.target.value)}
                      placeholder="Enter announcement name"
                    />
                    <p className="text-sm text-muted-foreground">
                      This follow-up email is part of the same payment reminder sequence.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDuplicateAnnouncementDialog(false);
                      setAnnouncementToDuplicate(null);
                      setDuplicateAnnouncementName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDuplicateAnnouncement}
                    disabled={duplicateAnnouncementMutation.isPending || !duplicateAnnouncementName.trim()}
                  >
                    {duplicateAnnouncementMutation.isPending ? "Creating..." : "Create Announcement"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Messaging Analytics</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Export Report
                </Button>
              </div>
            </div>

            {analyticsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading analytics...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Messages</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalMessages || 2847}</p>
                        </div>
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium">+12.5%</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">from last month</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Response Rate</p>
                          <p className="text-2xl font-bold">{analytics.responseRate || '94.2%'}</p>
                        </div>
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCheck className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-xs">
                        <span className="text-green-600 font-medium">+2.1%</span>
                        <span className="text-gray-500 ml-1">from last month</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                          <p className="text-2xl font-bold">{analytics.avgResponseTime || '4.2h'}</p>
                        </div>
                        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-xs">
                        <span className="text-red-600 font-medium">+0.3h</span>
                        <span className="text-gray-500 ml-1">from last month</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Campaign Reach</p>
                          <p className="text-2xl font-bold">{analytics.campaignReach || '18.5K'}</p>
                        </div>
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-xs">
                        <span className="text-green-600 font-medium">+18.7%</span>
                        <span className="text-gray-500 ml-1">from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts and Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Message Volume Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Internal Messages</span>
                          <span className="font-medium">1,254</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Patient Messages</span>
                          <span className="font-medium">892</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Broadcast Messages</span>
                          <span className="font-medium">701</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Template Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {templates.slice(0, 4).map((template: any, index: number) => (
                          <div key={template.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{template.name}</span>
                            </div>
                            <span className="text-sm font-medium">{template.usageCount}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Messaging Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Campaign "Flu Vaccination Reminder" sent</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Reached 1,240 patients • 2 hours ago</p>
                        </div>
                        <Badge variant="outline">Completed</Badge>
                      </div>

                      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Template "Lab Results Available" used 12 times</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">High engagement rate • 4 hours ago</p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>

                      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Bulk message sent to Cardiology department</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">45 recipients • 6 hours ago</p>
                        </div>
                        <Badge variant="outline">Delivered</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Active Video Call Interface */}
      {activeVideoCall && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
            {/* Video Call Header */}
            <div className="bg-gray-900 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Video Call with {callParticipant}</h3>
                  <p className="text-sm text-gray-300">Duration: {formatCallDuration(callDuration)} • Powered by BigBlueButton</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Live Meeting
                </span>
              </div>
            </div>

            {/* Video Call Main Area */}
            <div className="flex-1 bg-gray-100 relative flex items-center justify-center">
              {/* Enhanced video feed with realistic effects */}
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
                {/* Video simulation with movement */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-purple-500 to-indigo-600 animate-pulse"></div>

                {/* Connection quality overlay */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-60 rounded-lg px-3 py-2 z-10">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-3 bg-green-400 rounded animate-pulse"></div>
                      <div className="w-1 h-4 bg-green-400 rounded animate-pulse delay-75"></div>
                      <div className="w-1 h-5 bg-green-400 rounded animate-pulse delay-150"></div>
                      <div className="w-1 h-4 bg-green-400 rounded animate-pulse delay-200"></div>
                    </div>
                    <span className="text-white text-xs font-medium">HD • Secure</span>
                  </div>
                </div>

                {/* Participant info */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-32 bg-white bg-opacity-25 rounded-full flex items-center justify-center mb-6 mx-auto shadow-2xl animate-bounce">
                      <span className="text-4xl font-bold">{callParticipant.charAt(0).toUpperCase()}</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-2 drop-shadow-lg">{callParticipant}</h3>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-lg font-medium">Connected • Speaking</p>
                    </div>
                    <p className="text-sm opacity-90 bg-black bg-opacity-30 px-3 py-1 rounded-full mb-3">Patient Consultation Session</p>
                    <div className="bg-blue-600 bg-opacity-80 px-4 py-2 rounded-lg">
                      <p className="text-sm font-medium">✓ BigBlueButton meeting is active in new window</p>
                      <p className="text-xs opacity-90">Switch to the meeting window for full video conference</p>
                    </div>
                  </div>
                </div>

                {/* Audio visualization bars */}
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s'
                      }}
                    ></div>
                  ))}
                </div>

                {/* Enhanced self video (small corner) */}
                <div className="absolute bottom-4 right-4 w-52 h-40 rounded-lg border-2 border-white overflow-hidden shadow-2xl z-20">
                  {isVideoOn ? (
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 relative">
                      {/* Simulated camera feed */}
                      <div className="absolute inset-0 bg-gradient-to-tl from-green-600 to-blue-500 animate-pulse opacity-75"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white bg-opacity-40 rounded-full flex items-center justify-center mb-2 mx-auto animate-pulse">
                            <span className="text-xl font-bold">YOU</span>
                          </div>
                          <p className="text-xs font-medium bg-black bg-opacity-30 px-2 py-1 rounded">Camera Active</p>
                        </div>
                      </div>
                      {/* Microphone indicator */}
                      {!isMuted && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-xs">🎤</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-center relative">
                      <div>
                        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                          <span className="text-xl">📹</span>
                        </div>
                        <p className="text-xs">Camera Off</p>
                      </div>
                      {/* Microphone indicator when video is off */}
                      {!isMuted && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-xs">🎤</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Video Call Controls */}
            <div className="bg-gray-800 p-4 rounded-b-lg flex justify-center items-center gap-4">
              <Button
                onClick={toggleMute}
                variant="outline"
                size="sm"
                className={`text-white border-gray-600 hover:bg-gray-600 ${isMuted ? 'bg-red-600' : 'bg-gray-700'}`}
              >
                {isMuted ? '🔇' : '🎤'}
              </Button>
              <Button
                onClick={toggleVideo}
                variant="outline"
                size="sm"
                className={`text-white border-gray-600 hover:bg-gray-600 ${!isVideoOn ? 'bg-red-600' : 'bg-gray-700'}`}
              >
                {isVideoOn ? '📹' : '📵'}
              </Button>
              <Button variant="outline" size="sm">
                🖥️
              </Button>
              <Button variant="outline" size="sm">
                💬
              </Button>
              <Button
                onClick={handleEndVideoCall}
                variant="destructive"
                className="px-6"
              >
                End Call
              </Button>
              <Button variant="outline" size="sm">
                ⚙️
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LiveKit Video Call Modal */}
      <Dialog open={!!liveKitVideoCall} onOpenChange={(open) => !open && handleLiveKitVideoCallEnd()}>
        <DialogContent className="sm:max-w-4xl h-[80vh] p-0 overflow-hidden [&>button]:text-white [&>button]:hover:bg-white/20">
          <div className="w-full h-full">
            {liveKitVideoCall && (
              <LiveKitVideoCall
                roomName={liveKitVideoCall.roomName}
                participantName={getDisplayName(liveKitVideoCall.participant)}
                participantRole={user?.role}
                token={liveKitVideoCall.token}
                serverUrl={liveKitVideoCall.serverUrl}
                onDisconnect={handleLiveKitVideoCallEnd}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* LiveKit Audio Call Modal */}
      <Dialog open={!!liveKitAudioCall} onOpenChange={(open) => !open && handleLiveKitAudioCallEnd()}>
        <DialogContent className="sm:max-w-md">
          {liveKitAudioCall && (
            <LiveKitAudioCall
              roomName={liveKitAudioCall.roomName}
              participantName={getDisplayName(liveKitAudioCall.participant)}
              participantRole={user?.role}
              token={liveKitAudioCall.token}
              serverUrl={liveKitAudioCall.serverUrl}
              onDisconnect={handleLiveKitAudioCallEnd}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Call Status Modal */}
      <Dialog open={callStatusModal.open} onOpenChange={(open) => {
        if (!open) {
          setCallStatusModal({ open: false, title: "", description: "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {callStatusModal.description?.includes("Audio") ? (
                <Phone className="h-5 w-5" />
              ) : callStatusModal.description?.includes("Video") ? (
                <Video className="h-5 w-5" />
              ) : null}
              {callStatusModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{callStatusModal.description}</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setCallStatusModal({ open: false, title: "", description: "" });
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}