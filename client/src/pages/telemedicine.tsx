import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { useAuth } from "@/hooks/use-auth";
import { createRemoteLiveKitRoom } from "@/lib/livekit-room-service";
import { buildSocketUserIdentifier, isSocketUserMatch, socketManager } from "@/lib/socket-manager";
import { LiveKitVideoCall } from "@/components/telemedicine/livekit-video-call";
import { LiveKitAudioCall } from "@/components/telemedicine/livekit-audio-call";
import { OutgoingCallWaiting } from "@/components/telemedicine/outgoing-call-waiting";
import { useSocket } from "@/hooks/use-socket";
import { isUserOnline } from "@/lib/socket-user-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Camera,
  CameraOff,
  Monitor,
  Users,
  Clock,
  Calendar,
  FileText,
  Stethoscope,
  Heart,
  Activity,
  Settings,
  Square,
  Play,
  Pause,
  Download,
  Share2,
  MessageSquare,
  MonitorSpeaker,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ChevronsUpDown,
  Check,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/use-role-permissions";

interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  type: "video" | "audio" | "screen_share";
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "waiting";
  scheduledTime: string;
  duration?: number;
  notes?: string;
  recordings?: Array<{
    id: string;
    name: string;
    duration: number;
    size: string;
    url: string;
  }>;
  prescriptions?: Array<{
    medication: string;
    dosage: string;
    instructions: string;
  }>;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenSaturation?: number;
  };
}

interface WaitingRoom {
  patientId: string;
  patientName: string;
  appointmentTime: string;
  waitTime: number;
  priority: "normal" | "urgent";
  status: "waiting" | "ready" | "in_call";
}

const TELEMEDICINE_SETTINGS_KEY = "telemedicine_settings";

export interface TelemedicineSettings {
  defaultVideoQuality: "480p" | "720p" | "1080p";
  autoStartVideo: boolean;
  autoStartAudio: boolean;
  echoCancellation: boolean;
  autoRecordConsultations: boolean;
  recordingQuality: "low" | "medium" | "high";
  patientConsentRequired: boolean;
  appointmentReminders: boolean;
  patientWaitingAlerts: boolean;
  connectionIssuesAlerts: boolean;
}

const DEFAULT_TELEMEDICINE_SETTINGS: TelemedicineSettings = {
  defaultVideoQuality: "720p",
  autoStartVideo: true,
  autoStartAudio: true,
  echoCancellation: true,
  autoRecordConsultations: false,
  recordingQuality: "high",
  patientConsentRequired: true,
  appointmentReminders: true,
  patientWaitingAlerts: true,
  connectionIssuesAlerts: true,
};

function loadTelemedicineSettingsFromStorage(): TelemedicineSettings {
  try {
    const raw = localStorage.getItem(TELEMEDICINE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TelemedicineSettings>;
      return { ...DEFAULT_TELEMEDICINE_SETTINGS, ...parsed };
    }
  } catch (_) {}
  return { ...DEFAULT_TELEMEDICINE_SETTINGS };
}

function saveTelemedicineSettingsToStorage(settings: TelemedicineSettings): void {
  try {
    localStorage.setItem(TELEMEDICINE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {}
}

function mergeWithDefaults(partial: Partial<TelemedicineSettings> | null): TelemedicineSettings {
  if (!partial || typeof partial !== "object") return { ...DEFAULT_TELEMEDICINE_SETTINGS };
  return { ...DEFAULT_TELEMEDICINE_SETTINGS, ...partial };
}

// Patient List Component for selecting patients for telemedicine consultations
function PatientList({
  telemedicineSettings,
  myProfileImageUrl,
}: {
  telemedicineSettings?: TelemedicineSettings | null;
  myProfileImageUrl?: string | null;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canCreate } = useRolePermissions();
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const currentAudioCallRef = useRef<typeof liveKitAudioCall>(null);
  const currentVideoCallRef = useRef<typeof liveKitVideoCall>(null);
  const callAcceptedRef = useRef<boolean>(false);
  const [outgoingVideoAccepted, setOutgoingVideoAccepted] = useState(false);
  const [outgoingAudioAccepted, setOutgoingAudioAccepted] = useState(false);
  const [callStatusModal, setCallStatusModal] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });

  // LiveKit call state
  type LiveKitCallSession = {
    roomName: string;
    patient: any;
    token: string;
    serverUrl: string;
    e2eeKey?: string;
    initiatorSocketId: string;
    participantSocketId: string;
  };

  const [liveKitVideoCall, setLiveKitVideoCall] = useState<LiveKitCallSession | null>(null);
  const [liveKitAudioCall, setLiveKitAudioCall] = useState<LiveKitCallSession | null>(null);

  // Note: Incoming call is now handled globally by GlobalIncomingCallBar

  // Socket.IO online users
  const { onlineUsers } = useSocket();

  // Fetch users for telemedicine - filtered based on role
  // Admin users see all users, non-admin users see only non-patient users
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/telemedicine/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/telemedicine/users");
      return response.json();
    },
    enabled: true,
  });

  // BigBlueButton video call function
  const startBigBlueButtonCall = async (patient: any) => {
    try {
      const response = await fetch("/api/video-conference/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        body: JSON.stringify({
          meetingName: `Consultation with ${patient.firstName} ${patient.lastName}`,
          participantName: `${patient.firstName} ${patient.lastName}`,
          duration: 30,
          maxParticipants: 10,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error("BigBlueButton API failed, using fallback");
        // Fallback: Show message about video consultation
        toast({
          title: "Video Call Initiated",
          description: `Starting video consultation with ${patient.firstName} ${patient.lastName}. Please use your preferred video platform or call ${patient.phone || "phone number not available"}`,
          variant: "default",
        });
        return;
      }

      const meetingData = await response.json();

      // Open BigBlueButton meeting in new window - use moderator URL for doctor
      const meetingWindow = window.open(
        meetingData.moderatorJoinUrl,
        "_blank",
        "width=1200,height=800,scrollbars=yes,resizable=yes",
      );

      if (
        !meetingWindow ||
        meetingWindow.closed ||
        typeof meetingWindow.closed == "undefined"
      ) {
        // Popup was blocked - provide fallback
        toast({
          title: "Popup Blocked",
          description:
            "Your browser blocked the meeting popup. Please allow popups and try again, or copy the meeting URL from the browser console.",
          variant: "default",
        });

        // Log the meeting URL for users to manually open
        console.log("BigBlueButton Meeting URL:", meetingData.moderatorJoinUrl);

        // Also try to open in the same tab as fallback
        window.location.href = meetingData.moderatorJoinUrl;
        return; // Don't throw error, just redirect
      }

      toast({
        title: "Video Call Started",
        description: `Opening BigBlueButton meeting with ${patient.firstName} ${patient.lastName}`,
      });

      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "video",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: meetingData.meetingID,
        }),
        credentials: "include",
      });
    } catch (error) {
      // Fallback: Show message about video consultation
      toast({
        title: "Video Call Initiated",
        description: `Starting video consultation with ${patient.firstName} ${patient.lastName}. Please use your preferred video platform or call ${patient.phone || "phone number not available"}`,
        variant: "default",
      });
    }
  };

  // LiveKit Video Call
  const buildParticipantIdentifier = (
    entity: any,
    defaultRole = "participant",
  ) => {
    return buildSocketUserIdentifier({
      id: entity?.id,
      firstName: entity?.firstName,
      lastName: entity?.lastName,
      email: entity?.email,
      role: entity?.role || defaultRole,
    });
  };

  const getDisplayName = (entity: any) => {
    const name = [entity?.firstName, entity?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || entity?.email || `user-${entity?.id}`;
  };

  /** Notify callee via Socket.IO so GlobalIncomingCallBar / nurse can ring and join the same room. */
  const emitTelemedicineIncomingInvite = (
    session: LiveKitCallSession,
    isVideo: boolean,
  ) => {
    if (!user || !session.token || !session.serverUrl) return;
    const fromUsername = getDisplayName(user);
    socketManager.emitToServer("incoming-call", {
      roomId: session.roomName,
      fromUserId: session.initiatorSocketId,
      fromUsername,
      toUserId: session.participantSocketId,
      to: session.participantSocketId,
      isVideo,
      token: session.token,
      serverUrl: session.serverUrl,
      e2eeKey: session.e2eeKey,
      participants: [],
      isGroup: false,
      groupName: isVideo ? "Telemedicine Video Consultation" : "Telemedicine Audio Consultation",
      isDelayedCall: false,
    });
  };

  const emitTelemedicineCallSignal = (
    session: LiveKitCallSession,
    event: "call_declined" | "call_ended",
  ) => {
    const initiatorUserId = session.initiatorSocketId;
    const participantId = session.participantSocketId;
    if (!initiatorUserId || !participantId) return;

    if (event === "call_declined") {
      socketManager.emitToServer("call_declined", {
        roomId: session.roomName,
        fromUserId: initiatorUserId,
        toUserId: participantId,
        isGroup: false,
      });
      return;
    }

    socketManager.emitToServer("call_ended", {
      roomId: session.roomName,
      initiatorUserId,
      participantIds: [participantId],
    });
  };

  const createTelemedicineCallSession = async (
    patient: any,
    isVideo: boolean,
  ): Promise<LiveKitCallSession> => {
    if (!user) {
      throw new Error("Please log in to start a call");
    }

    const fromIdentifier = buildParticipantIdentifier(user, user.role);
    const toIdentifier = buildParticipantIdentifier(patient, patient.role);

    if (!fromIdentifier || !toIdentifier) {
      throw new Error("Unable to determine participant identifiers for this call");
    }

    const prefix = isVideo ? "telemedicine-video" : "telemedicine-audio";
    const roomName = `${prefix}-${user.id}-${patient.id}-${Date.now()}`;

    const liveKitRoom = await createRemoteLiveKitRoom({
      roomId: roomName,
      fromUsername: fromIdentifier,
      toUsers: [
        {
          identifier: toIdentifier,
          displayName: getDisplayName(patient),
        },
      ],
      isVideo,
      groupName: isVideo
        ? "Telemedicine Video Consultation"
        : "Telemedicine Audio Consultation",
    });

    const finalRoomId = liveKitRoom.roomId || roomName;

    if (!liveKitRoom.token || !liveKitRoom.serverUrl) {
      throw new Error("LiveKit did not return connection credentials");
    }

    return {
      roomName: finalRoomId,
      patient,
      token: liveKitRoom.token,
      serverUrl: liveKitRoom.serverUrl,
      e2eeKey: liveKitRoom.e2eeKey,
      initiatorSocketId: fromIdentifier,
      participantSocketId: toIdentifier,
    };
  };

  const recordTelemedicineConsultation = async (
    patientId: number,
    type: "video" | "audio",
    meetingId: string,
  ) => {
    await fetch("/api/telemedicine/consultations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        "X-Tenant-Subdomain": getActiveSubdomain(),
      },
      body: JSON.stringify({
        patientId,
        type,
        scheduledTime: new Date().toISOString(),
        duration: 30,
        meetingId,
      }),
      credentials: "include",
    });
  };

  const startCallDurationTimer = () => {
    setCallDuration(0);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallDurationTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  };

  /** Hold mic/camera from the start-call click until LiveKit takes over after accept. */
  const warmUpCallerMediaDevices = async (includeVideo: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const existing = (window as Window & { __callerWarmStream?: MediaStream | null })
        .__callerWarmStream;
      existing?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: includeVideo,
      });
      (window as Window & { __callerWarmStream?: MediaStream | null }).__callerWarmStream =
        stream;
    } catch (e) {
      console.warn("[Telemedicine] Media warm-up (caller):", e);
    }
  };

  const releaseCallerWarmStream = () => {
    const stream = (window as Window & { __callerWarmStream?: MediaStream | null })
      .__callerWarmStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      (window as Window & { __callerWarmStream?: MediaStream | null }).__callerWarmStream =
        null;
    }
  };

  const startLiveKitVideoCall = async (patient: any) => {
    try {
      if (liveKitVideoCall || liveKitAudioCall) {
        toast({
          title: "Call already active",
          description: "End the current call before starting another.",
          variant: "destructive",
        });
        return;
      }

      // Mic only while ringing — camera is opened after accept to avoid "Device in use".
      await warmUpCallerMediaDevices(false);

      toast({
        title: "Video Call Starting",
        description: `Connecting to video call with ${patient.firstName} ${patient.lastName}`,
      });

      const session = await createTelemedicineCallSession(patient, true);
      setOutgoingVideoAccepted(false);
      callAcceptedRef.current = false;
      currentVideoCallRef.current = session;
      setLiveKitVideoCall(session);
      emitTelemedicineIncomingInvite(session, true);
      startCallDurationTimer();

      callStartTimeRef.current = Date.now();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      const capturedSession = session;
      callTimeoutRef.current = setTimeout(() => {
        const currentCall = currentVideoCallRef.current;
        if (
          currentCall &&
          currentCall.roomName === capturedSession.roomName &&
          callStartTimeRef.current &&
          !callAcceptedRef.current
        ) {
          emitTelemedicineCallSignal(capturedSession, "call_declined");
          stopCallDurationTimer();
          setLiveKitVideoCall(null);
          currentVideoCallRef.current = null;
          setOutgoingVideoAccepted(false);
          callStartTimeRef.current = null;
          toast({
            title: "No answer",
            description: `${getDisplayName(patient)} did not answer the call.`,
          });
        }
      }, 30000);

      await recordTelemedicineConsultation(patient.id, "video", session.roomName);
    } catch (error: any) {
      console.error("LiveKit video call failed:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start video call",
        variant: "destructive",
      });
    }
  };

  // LiveKit Audio Call
  const startLiveKitAudioCall = async (patient: any) => {
    try {
      if (liveKitVideoCall || liveKitAudioCall) {
        toast({
          title: "Call already active",
          description: "End the current call before starting another.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Audio Call Starting",
        description: `Connecting to audio call with ${patient.firstName} ${patient.lastName}`,
      });

      const session = await createTelemedicineCallSession(patient, false);
      setOutgoingAudioAccepted(false);
      setLiveKitAudioCall(session);
      emitTelemedicineIncomingInvite(session, false);
      currentAudioCallRef.current = session;
      callAcceptedRef.current = false;
      startCallDurationTimer();

      callStartTimeRef.current = Date.now();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }

      const capturedSession = session;
      callTimeoutRef.current = setTimeout(() => {
        const currentCall = currentAudioCallRef.current;
        if (
          currentCall &&
          currentCall.roomName === capturedSession.roomName &&
          callStartTimeRef.current &&
          !callAcceptedRef.current
        ) {
          const timeElapsed = Date.now() - callStartTimeRef.current;
          if (timeElapsed >= 30000) {
            emitTelemedicineCallSignal(capturedSession, "call_declined");
            stopCallDurationTimer();
            setLiveKitAudioCall(null);
            currentAudioCallRef.current = null;
            callStartTimeRef.current = null;
            toast({
              title: "No answer",
              description: `${getDisplayName(patient)} did not answer the call.`,
            });
          }
        }
      }, 30000);

      await recordTelemedicineConsultation(patient.id, "audio", session.roomName);
    } catch (error: any) {
      console.error("LiveKit audio call failed:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start audio call",
        variant: "destructive",
      });
    }
  };

  const handleLiveKitVideoCallConnected = () => {
    callAcceptedRef.current = true;
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const handleLiveKitVideoCallEnd = (disconnectedParticipant?: { name: string; role?: string }) => {
    const currentVideoCall = liveKitVideoCall;
    releaseCallerWarmStream();
    stopCallDurationTimer();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    currentVideoCallRef.current = null;
    setOutgoingVideoAccepted(false);
    callStartTimeRef.current = null;

    if (currentVideoCall) {
      emitTelemedicineCallSignal(currentVideoCall, "call_declined");
      emitTelemedicineCallSignal(currentVideoCall, "call_ended");
    }

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

  const handleLiveKitAudioCallConnected = () => {
    callAcceptedRef.current = true;
    setOutgoingAudioAccepted(true);
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const handleLiveKitAudioCallEnd = (disconnectedParticipant?: { name: string; role?: string }) => {
    const currentAudioCall = liveKitAudioCall;
    stopCallDurationTimer();
    setOutgoingAudioAccepted(false);

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    if (currentAudioCall) {
      emitTelemedicineCallSignal(currentAudioCall, "call_declined");
      emitTelemedicineCallSignal(currentAudioCall, "call_ended");
    }

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

  // Cleanup on unmount
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

  // Listen for call_ended, call_declined, and call_accepted (outgoing → connect after answer)
  useEffect(() => {
    const unsubscribeCallAccepted = socketManager.on("call_accepted", (data: any) => {
      if (!user || !isSocketUserMatch(data?.toUserId, user)) return;

      const videoSession = currentVideoCallRef.current;
      if (videoSession && data.roomId === videoSession.roomName) {
        callAcceptedRef.current = true;
        releaseCallerWarmStream();
        setOutgoingVideoAccepted(true);
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
      }

      const audioSession = currentAudioCallRef.current;
      if (audioSession && data.roomId === audioSession.roomName) {
        callAcceptedRef.current = true;
        setOutgoingAudioAccepted(true);
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
      }
    });

    // Handle when the other party ends the call
    const unsubscribeCallEnded = socketManager.on('call_ended', (data: any) => {
      console.log('[Telemedicine] Received call_ended event:', data);
      
      // Check if this is for our current video call
      if (liveKitVideoCall && data.roomId === liveKitVideoCall.roomName) {
        console.log('[Telemedicine] Closing video call - other party ended');
        // Stop call timer
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        setCallDuration(0);
        
        // Get participant info for disconnect message
        const patient = liveKitVideoCall.patient;
        let description = "Video call has been terminated";
        if (patient) {
          const rolePrefix = patient.role?.toLowerCase() === 'nurse' ? 'Nurse.' : patient.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
          const displayName = rolePrefix ? `${rolePrefix} ${patient.firstName || ''} ${patient.lastName || ''}`.trim() : `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
          if (displayName) {
            description = `Disconnected ${displayName} have left the call`;
          }
        }
        
        setOutgoingVideoAccepted(false);
        currentVideoCallRef.current = null;
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
      
      // Check if this is for our current audio call
      if (liveKitAudioCall && data.roomId === liveKitAudioCall.roomName) {
        console.log('[Telemedicine] Closing audio call - other party ended');
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
        const patient = liveKitAudioCall.patient;
        let description = "Audio call has been terminated";
        if (patient) {
          const rolePrefix = patient.role?.toLowerCase() === 'nurse' ? 'Nurse.' : patient.role?.toLowerCase() === 'doctor' ? 'Dr.' : '';
          const displayName = rolePrefix ? `${rolePrefix} ${patient.firstName || ''} ${patient.lastName || ''}`.trim() : `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
          if (displayName) {
            description = `Disconnected ${displayName} have left the call`;
          }
        }
        
        setOutgoingAudioAccepted(false);
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
      console.log('[Telemedicine] Received call_declined event:', data);
      
      // Check if this is for our current video call
      if (liveKitVideoCall && data.roomId === liveKitVideoCall.roomName) {
        console.log('[Telemedicine] Closing video call - call was declined');
        // Stop call timer
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        setCallDuration(0);
        
        // Explicitly stop all camera/video tracks before unmounting
        // Stop all video tracks from video elements in the document
        document.querySelectorAll('video').forEach(videoElement => {
          const video = videoElement as HTMLVideoElement;
          if (video.srcObject instanceof MediaStream) {
            const stream = video.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => {
              track.stop();
              console.log('[Telemedicine] Stopped video track from video element on decline');
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
            console.log('[Telemedicine] Stopped video track from media stream on decline');
          });
        });
        
        setOutgoingVideoAccepted(false);
        currentVideoCallRef.current = null;
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        setLiveKitVideoCall(null);
        // Don't show call status modal - close window automatically
      }
      
      // Check if this is for our current audio call
      if (liveKitAudioCall && data.roomId === liveKitAudioCall.roomName) {
        console.log('[Telemedicine] Closing audio call - call was declined');
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
        setOutgoingAudioAccepted(false);
        setLiveKitAudioCall(null);
        currentAudioCallRef.current = null;
        callStartTimeRef.current = null;
        callAcceptedRef.current = false;
        // Don't show call status modal - close window automatically
      }
    });

    return () => {
      unsubscribeCallAccepted();
      unsubscribeCallEnded();
      unsubscribeCallDeclined();
    };
  }, [liveKitVideoCall, liveKitAudioCall, user, toast]);

  // Format call duration
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // BigBlueButton audio call function
  const startBigBlueButtonAudioCall = async (patient: any) => {
    try {
      const response = await fetch("/api/video-conference/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        body: JSON.stringify({
          meetingName: `Audio Consultation with ${patient.firstName} ${patient.lastName}`,
          participantName: `${patient.firstName} ${patient.lastName}`,
          duration: 30,
          maxParticipants: 10,
          disableVideo: true, // Audio-only mode
          webcamsOnlyForModerator: false,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error("BigBlueButton API failed, using fallback");
        // Fallback: Show phone number for direct call
        toast({
          title: "Audio Call Initiated",
          description: `Please call ${patient.firstName} ${patient.lastName} at ${patient.phone || "phone number not available"}`,
          variant: "default",
        });
        return;
      }

      const meetingData = await response.json();

      // Open BigBlueButton audio meeting in new window - use moderator URL for doctor
      const meetingWindow = window.open(
        meetingData.moderatorJoinUrl,
        "_blank",
        "width=800,height=600,scrollbars=yes,resizable=yes",
      );

      if (
        !meetingWindow ||
        meetingWindow.closed ||
        typeof meetingWindow.closed == "undefined"
      ) {
        // Popup was blocked - provide fallback
        toast({
          title: "Popup Blocked",
          description:
            "Your browser blocked the meeting popup. Please allow popups and try again, or copy the meeting URL from the browser console.",
          variant: "default",
        });

        // Log the meeting URL for users to manually open
        console.log(
          "BigBlueButton Audio Meeting URL:",
          meetingData.moderatorJoinUrl,
        );

        // Also try to open in the same tab as fallback
        window.location.href = meetingData.moderatorJoinUrl;
        return; // Don't throw error, just redirect
      }

      toast({
        title: "Audio Call Started",
        description: `Opening audio consultation with ${patient.firstName} ${patient.lastName}`,
      });

      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "audio",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: meetingData.meetingID,
        }),
        credentials: "include",
      });
    } catch (error) {
      // Fallback: Show phone number for direct call
      toast({
        title: "Audio Call Initiated",
        description: `Please call ${patient.firstName} ${patient.lastName} at ${patient.phone || "phone number not available"}`,
        variant: "default",
      });
    }
  };

  if (patientsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!patients || !Array.isArray(patients) || patients.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          {user?.role === "admin"
            ? "No users available for consultation"
            : "No staff members available for consultation"}
        </p>
      </div>
    );
  }

  const consultUsers = patients.filter((patient: any) => patient.id !== user?.id);
  const onlineConsultUsers = consultUsers.filter((patient: any) =>
    isUserOnline(patient.id, onlineUsers),
  );
  const offlineConsultUsers = consultUsers.filter(
    (patient: any) => !isUserOnline(patient.id, onlineUsers),
  );

  const renderConsultUserCard = (patient: any) => (
          <Card
            key={patient.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    {(patient.profilePicturePath || patient.profile_picture_path) && (
                      <AvatarImage
                        src={patient.profilePicturePath || patient.profile_picture_path}
                        alt="Profile picture"
                      />
                    )}
                    <AvatarFallback>
                      {patient.firstName?.[0] || patient.email?.[0]}
                      {patient.lastName?.[0] || patient.email?.[1]}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online Status Indicator */}
                  {isUserOnline(patient.id, onlineUsers) && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">
                    {patient.firstName && patient.lastName
                      ? `${patient.firstName} ${patient.lastName}`
                      : patient.email}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span>
                      {patient.role
                        ? patient.role.charAt(0).toUpperCase() +
                          patient.role.slice(1)
                        : "User"}{" "}
                      • ID: {patient.id}
                    </span>
                    {isUserOnline(patient.id, onlineUsers) && (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Online
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="truncate">{patient.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{patient.phone || "N/A"}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {(canCreate('telemedicine') || user?.role === 'patient') && (
                  <Button
                    onClick={() => startLiveKitVideoCall(patient)}
                    className="flex-1"
                    size="sm"
                    variant="default"
                    disabled={liveKitVideoCall !== null || liveKitAudioCall !== null}
                    data-testid={`button-livekit-video-call-${patient.id}`}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                )}
                {(canCreate('telemedicine') || user?.role === 'patient') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => startLiveKitAudioCall(patient)}
                    data-testid={`button-livekit-audio-call-${patient.id}`}
                    disabled={liveKitAudioCall !== null || liveKitVideoCall !== null}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Audio
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
  );

  return (
    <>
      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Online</h3>
          {onlineConsultUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineConsultUsers.map((patient: any) => renderConsultUserCard(patient))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users online</p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Offline</h3>
          {offlineConsultUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offlineConsultUsers.map((patient: any) => renderConsultUserCard(patient))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users offline</p>
          )}
        </section>
      </div>

      {/* LiveKit Video Call Modal - Full Screen */}
      {liveKitVideoCall && (
        <Dialog
          open={!!liveKitVideoCall}
          onOpenChange={() => handleLiveKitVideoCallEnd()}
        >
          <DialogContent className="max-w-none p-0 m-0 rounded-none border-none" style={{ width: 'calc(100vw - 30px)', height: 'calc(100vh - 30px)' }}>
            <DialogHeader className="p-4 border-b absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur">
              <DialogTitle className="flex items-center justify-between gap-4">
                <span>Video Call - {liveKitVideoCall.patient.firstName}{" "}
                {liveKitVideoCall.patient.lastName}</span>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {formatCallDuration(callDuration)}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="w-full h-full pt-16">
              {!outgoingVideoAccepted ? (
                <OutgoingCallWaiting
                  calleeName={`${liveKitVideoCall.patient.firstName} ${liveKitVideoCall.patient.lastName}`.trim()}
                  isVideo
                  onCancel={() => handleLiveKitVideoCallEnd()}
                />
              ) : (
                <LiveKitVideoCall
                  roomName={liveKitVideoCall.roomName}
                  participantName={
                    user ? `${user.firstName} ${user.lastName}` : "Provider"
                  }
                  participantRole={user?.role}
                  participantImageUrl={myProfileImageUrl}
                  token={liveKitVideoCall.token}
                  serverUrl={liveKitVideoCall.serverUrl}
                  connectWhenReady
                  onDisconnect={handleLiveKitVideoCallEnd}
                  onConnected={handleLiveKitVideoCallConnected}
                  audioEnabled={telemedicineSettings?.autoStartAudio ?? true}
                  videoEnabled
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* LiveKit Audio Call Modal */}
      {liveKitAudioCall && (
        <Dialog
          open={!!liveKitAudioCall}
          onOpenChange={() => handleLiveKitAudioCallEnd()}
        >
          <DialogContent className="max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-4">
                <span>Audio Call - {liveKitAudioCall.patient.firstName}{" "}
                {liveKitAudioCall.patient.lastName}</span>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {formatCallDuration(callDuration)}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              {!outgoingAudioAccepted ? (
                <OutgoingCallWaiting
                  calleeName={`${liveKitAudioCall.patient.firstName} ${liveKitAudioCall.patient.lastName}`.trim()}
                  isVideo={false}
                  onCancel={() => handleLiveKitAudioCallEnd()}
                />
              ) : (
                <LiveKitAudioCall
                  roomName={liveKitAudioCall.roomName}
                  participantName={
                    user ? `${user.firstName} ${user.lastName}` : "Provider"
                  }
                  participantRole={user?.role}
                  participantImageUrl={myProfileImageUrl}
                  token={liveKitAudioCall.token}
                  serverUrl={liveKitAudioCall.serverUrl}
                  connectWhenReady
                  onDisconnect={handleLiveKitAudioCallEnd}
                  onConnected={handleLiveKitAudioCallConnected}
                  audioEnabled={telemedicineSettings?.autoStartAudio ?? true}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

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

    </>
  );
}

export default function Telemedicine() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("start");
  const [currentCall, setCurrentCall] = useState<Consultation | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telemedicineSettings, setTelemedicineSettings] = useState<TelemedicineSettings>(() => loadTelemedicineSettingsFromStorage());

  // Current user details (includes profilePicturePath)
  const { data: currentUserDetails } = useQuery<any>({
    queryKey: ["/api/users/current"],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/current");
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });
  const myProfileImageUrl: string | null =
    (currentUserDetails?.profilePicturePath as string | null | undefined) ||
    ((user as any)?.profilePicturePath as string | null | undefined) ||
    null;

  // Fetch telemedicine settings from database (GET)
  const { data: savedSettings, refetch: refetchTelemedicineSettings } = useQuery({
    queryKey: ["/api/telemedicine/settings"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/telemedicine/settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data as Partial<TelemedicineSettings> | null;
    },
    enabled: true,
  });

  const settingsDialogOpenedRef = useRef(false);

  // Apply saved settings from API when they load
  useEffect(() => {
    if (savedSettings === undefined) return;
    if (!settingsOpen) {
      setTelemedicineSettings(mergeWithDefaults(savedSettings));
    } else if (settingsDialogOpenedRef.current) {
      setTelemedicineSettings(mergeWithDefaults(savedSettings));
      settingsDialogOpenedRef.current = false;
    }
  }, [savedSettings, settingsOpen]);

  // When Settings dialog opens, refetch from database so form shows latest saved data
  useEffect(() => {
    if (settingsOpen) {
      settingsDialogOpenedRef.current = true;
      refetchTelemedicineSettings();
    }
  }, [settingsOpen, refetchTelemedicineSettings]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingConsultationId, setEditingConsultationId] = useState<string | null>(null);
  // Schedule form state
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleProvider, setScheduleProvider] = useState("");
  const [scheduleProviderName, setScheduleProviderName] = useState("");
  const [scheduleType, setScheduleType] = useState("video");
  const [scheduleDuration, setScheduleDuration] = useState("15");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const reminderSentRef = useRef<Set<string>>(new Set());
  const autoStartedConsultationIdsRef = useRef<Set<string>>(new Set());
  const autoStartInProgressRef = useRef(false);
  const pendingAutoStartRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callNotesRef = useRef("");
  const consultationsRef = useRef<any[]>([]);
  const currentCallRef = useRef<Consultation | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = useRolePermissions();

  const providerOptions = [
    { value: "provider_1", label: "Dr. Emily Watson" },
    { value: "provider_2", label: "Dr. David Smith" },
    { value: "provider_3", label: "Dr. Lisa Anderson" },
  ];

  // Fetch consultations
  const { data: consultations = [], isLoading: consultationsLoading, refetch: refetchConsultations } = useQuery({
    queryKey: ["/api/telemedicine/consultations"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/telemedicine/consultations", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch consultations");
      return res.json();
    },
    enabled: true,
  });

  // Fetch waiting room
  const { data: waitingRoom, isLoading: waitingLoading } = useQuery({
    queryKey: ["/api/telemedicine/waiting-room"],
    enabled: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users for scheduling - filtered based on role
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/telemedicine/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/telemedicine/users");
      return response.json();
    },
    enabled: true,
  });

  // Start consultation mutation
  const startConsultationMutation = useMutation({
    mutationFn: async (consultationId: string) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/telemedicine/consultations/${consultationId}/start`,
        {
          method: "POST",
          headers,
          credentials: "include",
        },
      );
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Failed to start consultation";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: (data) => {
      const pending = pendingAutoStartRef.current;
      const durationMins = pending?.duration ?? 15;
      const callPayload = {
        id: data.consultationId ?? data.id,
        patientId: pending?.patientId ?? "",
        patientName: pending?.patientName ?? "Patient",
        providerId: pending?.providerId ?? "",
        providerName: pending?.providerName ?? "",
        type: (pending?.type ?? "video") as "video" | "audio" | "screen_share",
        status: "in_progress" as const,
        scheduledTime: pending?.scheduledTime ?? new Date().toISOString(),
        duration: durationMins,
        notes: pending?.notes,
      };
      setCurrentCall(callPayload);
      pendingAutoStartRef.current = null;
      autoStartInProgressRef.current = false;
      queryClient.invalidateQueries({
        queryKey: ["/api/telemedicine/consultations"],
      });
      
      // Show success toast for auto-started consultations
      if (pending) {
        toast({
          title: "Consultation started",
          description: `Auto-connected with ${callPayload.patientName || "Patient"} (${durationMins} min). Call will end automatically.`,
        });
      }
      
      setSuccessMessage(`Consultation started with ${callPayload.patientName}`);
      setShowSuccessModal(true);
      // Auto-disconnect after consultation duration
      if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
      durationTimerRef.current = setTimeout(() => {
        durationTimerRef.current = null;
        endConsultationMutation.mutate({
          consultationId: String(callPayload.id),
          notes: callNotesRef.current || "",
          duration: durationMins,
        });
      }, durationMins * 60 * 1000);
    },
    onError: (error: any) => {
      pendingAutoStartRef.current = null;
      autoStartInProgressRef.current = false;
      console.error("Failed to start consultation:", error);
      toast({ 
        title: "Failed to start consultation", 
        description: error.message || "Please check your connection and try again.",
        variant: "destructive" 
      });
    },
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
      });
      if (!response.ok) throw new Error("Failed to delete patient");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Patient Deleted",
        description: "Patient has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setSelectedPatient(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createConsultationMutation = useMutation({
    mutationFn: async (payload: { isDraft: boolean }) => {
      const token = localStorage.getItem("auth_token");
      const scheduled = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : new Date().toISOString();
      const res = await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "",
          scheduledTime: scheduled,
          notes: scheduleNotes,
          isDraft: payload.isDraft,
          providerId: scheduleProvider || undefined,
          providerName: scheduleProviderName || undefined,
          type: scheduleType,
          duration: parseInt(scheduleDuration, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save consultation");
      }
      return res.json();
    },
    onSuccess: (_, { isDraft }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
      setScheduleOpen(false);
      resetScheduleForm();
      toast({
        title: isDraft ? "Saved as draft" : "Consultation scheduled",
        description: isDraft ? "Draft saved. You can edit it from the Consultations tab." : "Patient will be notified.",
      });
      if (isDraft) setActiveTab("consultations");
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const updateConsultationMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: unknown }) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/telemedicine/consultations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update consultation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
      setScheduleOpen(false);
      setEditingConsultationId(null);
      resetScheduleForm();
      toast({ title: "Consultation updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteConsultationMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/telemedicine/consultations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Subdomain": getActiveSubdomain(),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete consultation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
      toast({ title: "Consultation deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  function resetScheduleForm() {
    setSelectedPatient(null);
    setScheduleDate("");
    setScheduleTime("");
    setScheduleProvider("");
    setScheduleProviderName("");
    setScheduleType("video");
    setScheduleDuration("15");
    setScheduleNotes("");
    setEditingConsultationId(null);
  }

  function openScheduleDialogForEdit(consultation: any) {
    setEditingConsultationId(consultation.id);
    setSelectedPatient({ id: consultation.patientId, firstName: consultation.patientName?.split(" ")[0] || "", lastName: consultation.patientName?.split(" ").slice(1).join(" ") || "" });
    setScheduleDate(consultation.scheduledTime ? format(new Date(consultation.scheduledTime), "yyyy-MM-dd") : "");
    setScheduleTime(consultation.scheduledTime ? format(new Date(consultation.scheduledTime), "HH:mm") : "");
    setScheduleProvider(consultation.providerId || "");
    setScheduleProviderName(consultation.providerName || "");
    setScheduleType(consultation.type || "video");
    setScheduleDuration(String(consultation.duration || 15));
    setScheduleNotes(consultation.notes || "");
    setScheduleOpen(true);
  }

  useEffect(() => {
    callNotesRef.current = callNotes;
  }, [callNotes]);

  consultationsRef.current = Array.isArray(consultations) ? consultations : [];
  currentCallRef.current = currentCall;

  // Auto-connect: DISABLED - do not auto-open video consultation popup
  // useEffect(() => {
  //   function checkAndAutoConnect() {
  //     const list = consultationsRef.current;
  //     if (!list.length) return;
  //     if (currentCallRef.current) return; // already in a call
  //     if (autoStartInProgressRef.current) return; // start already triggered
  //     const now = Date.now();
  //     const windowMs = 2 * 60 * 1000; // auto-connect if scheduled time was 0â€“2 minutes ago
  //     for (const c of list) {
  //       if (c.status !== "scheduled" || !c.scheduledTime) continue;
  //       const scheduled = new Date(c.scheduledTime).getTime();
  //       const diff = now - scheduled;
  //       if (diff >= 0 && diff < windowMs && !autoStartedConsultationIdsRef.current.has(c.id)) {
  //         autoStartedConsultationIdsRef.current.add(c.id);
  //         autoStartInProgressRef.current = true;
  //         pendingAutoStartRef.current = c;
  //         // Don't show toast here - let the mutation's onSuccess handler show it
  //         startConsultationMutation.mutate(c.id);
  //         return;
  //       }
  //     }
  //   }
  //   checkAndAutoConnect();
  //   const t = setInterval(checkAndAutoConnect, 10 * 1000);
  //   return () => clearInterval(t);
  // }, [consultations]);

  // Poll consultations so list and ref stay fresh
  useEffect(() => {
    const t = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
    }, 15 * 1000);
    return () => clearInterval(t);
  }, [queryClient]);

  // Clear duration timer on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
    };
  }, []);

  // Auto-send reminder to patient when consultation time is within 15 minutes
  useEffect(() => {
    if (!Array.isArray(consultations) || consultations.length === 0) return;
    const now = Date.now();
    const fifteenMins = 15 * 60 * 1000;
    const token = localStorage.getItem("auth_token");
    consultations.forEach((c: any) => {
      if (c.status !== "scheduled" || !c.scheduledTime) return;
      const scheduled = new Date(c.scheduledTime).getTime();
      const diff = scheduled - now;
      if (diff > 0 && diff <= fifteenMins && !reminderSentRef.current.has(c.id)) {
        reminderSentRef.current.add(c.id);
        fetch(`/api/telemedicine/consultations/${c.id}/send-reminder`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Tenant-Subdomain": getActiveSubdomain(),
          },
          credentials: "include",
        })
          .then((res) => {
            if (res.ok) {
              toast({
                title: "Reminder sent",
                description: `Patient ${c.patientName} has been notified about their consultation.`,
              });
            }
          })
          .catch(() => {});
      }
    });
  }, [consultations, toast]);

  // Poll consultations when on Consultations tab so reminder check runs
  useEffect(() => {
    if (activeTab !== "consultations") return;
    const t = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
    }, 60 * 1000);
    return () => clearInterval(t);
  }, [activeTab, queryClient]);

  // End consultation mutation
  const endConsultationMutation = useMutation({
    mutationFn: async (data: {
      consultationId: string;
      notes: string;
      duration: number;
    }) => {
      const response = await fetch(
        `/api/telemedicine/consultations/${data.consultationId}/end`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: data.notes, duration: data.duration }),
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to end consultation");
      return response.json();
    },
    onSuccess: () => {
      if (durationTimerRef.current) {
        clearTimeout(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      // Stop video stream first
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setCurrentCall(null);
      setCallNotes("");
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsRecording(false);
      queryClient.invalidateQueries({
        queryKey: ["/api/telemedicine/consultations"],
      });
      setSuccessMessage("Consultation ended and notes saved");
      setShowSuccessModal(true);
    },
    onError: (error) => {
      if (durationTimerRef.current) {
        clearTimeout(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      // Even if the API call fails, still end the call locally
      console.error("Error ending consultation:", error);

      // Stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setCurrentCall(null);
      setCallNotes("");
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsRecording(false);
      toast({
        title: "Call ended",
        description:
          "Notes may not have been saved. Please check consultation history.",
        variant: "destructive",
      });
    },
  });

  // Mock data
  const mockConsultations: Consultation[] = [
    {
      id: "consult_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      providerId: "provider_1",
      providerName: "Dr. Emily Watson",
      type: "video",
      status: "scheduled",
      scheduledTime: "2024-06-26T15:00:00Z",
      vitalSigns: {
        heartRate: 72,
        bloodPressure: "120/80",
        temperature: 98.6,
        oxygenSaturation: 98,
      },
    },
    {
      id: "consult_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      providerId: "provider_1",
      providerName: "Dr. Emily Watson",
      type: "video",
      status: "completed",
      scheduledTime: "2024-06-26T14:00:00Z",
      duration: 25,
      notes:
        "Follow-up consultation for hypertension management. Patient reports improved symptoms.",
      recordings: [
        {
          id: "rec_1",
          name: "Consultation Recording",
          duration: 25,
          size: "150 MB",
          url: "#",
        },
      ],
      prescriptions: [
        {
          medication: "Lisinopril",
          dosage: "10mg",
          instructions: "Take once daily in the morning",
        },
      ],
    },
  ];

  const mockWaitingRoom: WaitingRoom[] = [
    {
      patientId: "patient_3",
      patientName: "Emma Davis",
      appointmentTime: "2024-06-26T15:30:00Z",
      waitTime: 5,
      priority: "normal",
      status: "waiting",
    },
    {
      patientId: "patient_4",
      patientName: "James Wilson",
      appointmentTime: "2024-06-26T15:15:00Z",
      waitTime: 12,
      priority: "urgent",
      status: "ready",
    },
  ];

  // Initialize video stream when component mounts
  useEffect(() => {
    if (videoRef.current && currentCall) {
      navigator.mediaDevices
        .getUserMedia({ video: isVideoEnabled, audio: isAudioEnabled })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing media devices:", err);
          toast({
            title: "Camera/microphone access denied",
            description:
              "Please allow access to continue with video consultation",
            variant: "destructive",
          });
        });
    }
  }, [currentCall, isVideoEnabled, isAudioEnabled]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
      }
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
      }
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    setSuccessMessage(
      isRecording
        ? "Consultation recording has been saved"
        : "Consultation is now being recorded",
    );
    setShowSuccessModal(true);
  };

  const endCall = () => {
    if (currentCall) {
      endConsultationMutation.mutate({
        consultationId: currentCall.id,
        notes: callNotes,
        duration: 15, // Mock duration
      });
    }
  };

  // Video consultation interface
  if (currentCall) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Video area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Patient info overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {currentCall.patientName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{currentCall.patientName || "Patient"}</div>
                <div className="text-sm opacity-75">
                  {currentCall.type === "audio" ? "Audio" : currentCall.type === "screen_share" ? "Screen Share" : "Video"} Consultation
                </div>
              </div>
            </div>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm">Recording</span>
            </div>
          )}

          {/* Call duration */}
          <div className="absolute top-4 right-20 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
            <Clock className="w-4 h-4 inline mr-1" />
            <span className="text-sm">00:15:32</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4">
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant={isVideoEnabled ? "secondary" : "destructive"}
              onClick={toggleVideo}
              className="rounded-full w-12 h-12"
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </Button>

            <Button
              size="lg"
              variant={isAudioEnabled ? "secondary" : "destructive"}
              onClick={toggleAudio}
              className="rounded-full w-12 h-12"
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={toggleRecording}
              className="rounded-full w-12 h-12"
            >
              {isRecording ? (
                <Square className="w-6 h-6 text-red-500" />
              ) : (
                <Square className="w-6 h-6" />
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-12 h-12"
            >
              <MonitorSpeaker className="w-6 h-6" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-12 h-12"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={endCall}
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>

          {/* Notes area */}
          <div className="mt-4 max-w-md mx-auto">
            <Input
              placeholder="Add consultation notes..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 page-zoom-90">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Telemedicine
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Virtual consultations and remote patient care
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {canCreate('telemedicine') && (
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Consultation
                </Button>
              </DialogTrigger>
            <DialogContent
              className="max-w-2xl max-h-[80vh] overflow-y-auto"
              onOpenAutoFocus={() => { if (!editingConsultationId) resetScheduleForm(); }}
              onCloseAutoFocus={() => { setEditingConsultationId(null); resetScheduleForm(); }}
            >
              <DialogHeader>
                <DialogTitle>{editingConsultationId ? "Edit Consultation" : "Schedule New Consultation"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Patient
                  </label>
                  <Popover
                    open={patientSearchOpen}
                    onOpenChange={setPatientSearchOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={patientSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedPatient
                          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                          : "Select a patient..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search patients..." />
                        <CommandEmpty>No patients found.</CommandEmpty>
                        <CommandGroup>
                          <CommandList className="max-h-[200px]">
                            {patientsLoading ? (
                              <CommandItem disabled>
                                Loading patients...
                              </CommandItem>
                            ) : (
                              patients?.map((patient: any) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.firstName} ${patient.lastName}`}
                                  onSelect={() => {
                                    setSelectedPatient(patient);
                                    setPatientSearchOpen(false);
                                  }}
                                  className="flex items-center"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedPatient?.id === patient.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <div>
                                    <div>
                                      {patient.firstName} {patient.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      ID: {patient.patientId || patient.id}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))
                            )}
                          </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Provider
                  </label>
                  <select
                    value={scheduleProvider}
                    onChange={(e) => {
                      const opt = providerOptions.find((o) => o.value === e.target.value);
                      setScheduleProvider(e.target.value);
                      setScheduleProviderName(opt?.label || "");
                    }}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a provider...</option>
                    {providerOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Date
                    </label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Time
                    </label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Consultation Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Consultation Type
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="video">Video Consultation</option>
                    <option value="audio">Audio Only</option>
                    <option value="screen_share">Screen Share</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Duration
                  </label>
                  <select
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Notes (Optional)
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-md h-20 resize-none bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 text-gray-900 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Add any special instructions or notes for this consultation..."
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {editingConsultationId ? (
                    <Button
                      className="flex-1"
                      disabled={updateConsultationMutation.isPending}
                      onClick={() => {
                        const scheduled = scheduleDate && scheduleTime
                          ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
                          : new Date().toISOString();
                        updateConsultationMutation.mutate({
                          id: editingConsultationId,
                          patientId: String(selectedPatient?.id ?? ""),
                          patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "",
                          scheduledTime: scheduled,
                          notes: scheduleNotes,
                          providerId: scheduleProvider || undefined,
                          providerName: scheduleProviderName || undefined,
                          type: scheduleType,
                          duration: parseInt(scheduleDuration, 10),
                        });
                      }}
                    >
                      {updateConsultationMutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="flex-1"
                        disabled={createConsultationMutation.isPending || !selectedPatient}
                        onClick={() => {
                          if (!selectedPatient) {
                            toast({ title: "Select a patient", variant: "destructive" });
                            return;
                          }
                          createConsultationMutation.mutate({ isDraft: false });
                        }}
                      >
                        {createConsultationMutation.isPending ? "Scheduling..." : "Schedule Consultation"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={createConsultationMutation.isPending || !selectedPatient}
                        onClick={() => {
                          if (!selectedPatient) {
                            toast({ title: "Select a patient", variant: "destructive" });
                            return;
                          }
                          createConsultationMutation.mutate({ isDraft: true });
                        }}
                      >
                        Save as Draft
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
            </Dialog>
          )}

          {user?.role !== "patient" && (
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              {/* Sign out button placed immediately after Settings */}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => {
                  try { logout(); } catch {}
                  window.location.href = "/auth/login";
                }}
                title="Sign out"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
              <DialogContent className="max-w-[min(42rem,calc(100vw-2rem))] max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col overflow-hidden p-4 sm:p-6">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Telemedicine Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1">
                {/* Video & Audio Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Video & Audio Settings
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Default Video Quality
                      </Label>
                      <Select
                        value={telemedicineSettings.defaultVideoQuality}
                        onValueChange={(value: "480p" | "720p" | "1080p") =>
                          setTelemedicineSettings((s) => ({ ...s, defaultVideoQuality: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="480p">480p Standard</SelectItem>
                          <SelectItem value="720p">720p HD</SelectItem>
                          <SelectItem value="1080p">1080p Full HD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Auto-start Video
                      </Label>
                      <Switch
                        checked={telemedicineSettings.autoStartVideo}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, autoStartVideo: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Auto-start Audio
                      </Label>
                      <Switch
                        checked={telemedicineSettings.autoStartAudio}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, autoStartAudio: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Echo Cancellation
                      </Label>
                      <Switch
                        checked={telemedicineSettings.echoCancellation}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, echoCancellation: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Recording Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Recording Settings
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Auto-record Consultations
                      </Label>
                      <Switch
                        checked={telemedicineSettings.autoRecordConsultations}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, autoRecordConsultations: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Recording Quality
                      </Label>
                      <Select
                        value={telemedicineSettings.recordingQuality}
                        onValueChange={(value: "low" | "medium" | "high") =>
                          setTelemedicineSettings((s) => ({ ...s, recordingQuality: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Quality</SelectItem>
                          <SelectItem value="medium">Medium Quality</SelectItem>
                          <SelectItem value="low">Low Quality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Patient Consent Required
                      </Label>
                      <Switch
                        checked={telemedicineSettings.patientConsentRequired}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, patientConsentRequired: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Notifications
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Appointment Reminders
                      </Label>
                      <Switch
                        checked={telemedicineSettings.appointmentReminders}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, appointmentReminders: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Patient Waiting Alerts
                      </Label>
                      <Switch
                        checked={telemedicineSettings.patientWaitingAlerts}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, patientWaitingAlerts: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Connection Issues Alerts
                      </Label>
                      <Switch
                        checked={telemedicineSettings.connectionIssuesAlerts}
                        onCheckedChange={(checked) =>
                          setTelemedicineSettings((s) => ({ ...s, connectionIssuesAlerts: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("auth_token");
                        const response = await fetch("/api/telemedicine/settings", {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                            "X-Tenant-Subdomain": getActiveSubdomain(),
                          },
                          credentials: "include",
                          body: JSON.stringify(telemedicineSettings),
                        });
                        if (!response.ok) {
                          const errBody = await response.json().catch(() => ({}));
                          const msg = errBody?.error || response.statusText || "Failed to save settings";
                          throw new Error(msg);
                        }
                        saveTelemedicineSettingsToStorage(telemedicineSettings);
                        queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/settings"] });
                        setSuccessMessage(
                          "Telemedicine settings have been updated successfully.",
                        );
                        setShowSuccessModal(true);
                        setSettingsOpen(false);
                      } catch (e: any) {
                        toast({
                          title: "Save failed",
                          description: e?.message || "Could not save settings. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Save Settings
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTelemedicineSettings(DEFAULT_TELEMEDICINE_SETTINGS);
                      try {
                        const token = localStorage.getItem("auth_token");
                        const response = await fetch("/api/telemedicine/settings", {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                            "X-Tenant-Subdomain": getActiveSubdomain(),
                          },
                          credentials: "include",
                          body: JSON.stringify(DEFAULT_TELEMEDICINE_SETTINGS),
                        });
                        if (response.ok) {
                          saveTelemedicineSettingsToStorage(DEFAULT_TELEMEDICINE_SETTINGS);
                          queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/settings"] });
                          toast({
                            title: "Reset to default",
                            description: "Telemedicine settings have been reset to defaults and saved.",
                          });
                        } else {
                          toast({
                            title: "Reset failed",
                            description: "Settings were reset locally but could not be saved. Try again.",
                            variant: "destructive",
                          });
                        }
                      } catch (_) {
                        toast({
                          title: "Reset failed",
                          description: "Settings were reset locally but could not be saved. Try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="start">Start Consultation</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
        </TabsList>
        <TabsContent value="start" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Consultation via Audio or Video
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Start a new telemedicine consultation
              </p>
            </CardHeader>
            <CardContent>
              <PatientList
                telemedicineSettings={telemedicineSettings}
                myProfileImageUrl={myProfileImageUrl}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consultations" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduled & Draft Consultations
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                View, edit, or delete consultations. Patients are notified before their scheduled time.
              </p>
            </CardHeader>
            <CardContent>
              {consultationsLoading ? (
                <div className="flex justify-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : Array.isArray(consultations) && consultations.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No consultations yet.</p>
                  <p className="text-sm mt-1">Schedule one or save a draft from the Schedule New Consultation dialog.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(consultations as any[]).map((c: any) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {c.patientName || "Patient"} Â· {c.providerName || "Provider"}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {c.scheduledTime ? format(new Date(c.scheduledTime), "PPp") : "â€”"} Â· {c.duration ?? 15} min Â· {c.type === "video" ? "Video" : c.type === "audio" ? "Audio" : "Screen share"}
                        </div>
                        {c.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate max-w-md">{c.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={c.status === "draft" ? "secondary" : c.status === "scheduled" ? "default" : "outline"}>
                          {c.status}
                        </Badge>
                        {canEdit("telemedicine") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScheduleDialogForEdit(c)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete("telemedicine") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            disabled={deleteConsultationMutation.isPending}
                            onClick={() => {
                              if (window.confirm("Delete this consultation?")) {
                                deleteConsultationMutation.mutate(c.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">
              Success
            </DialogTitle>
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
    </div>
  );
}
