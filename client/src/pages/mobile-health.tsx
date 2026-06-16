import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Smartphone,
  Watch,
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  Battery,
  Wifi,
  Bluetooth,
  Cloud,
  Bell,
  Settings,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Play,
  QrCode,
  Share2,
  Globe,
  Calendar,
  MessageSquare,
  Camera,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

interface WearableDevice {
  id: string;
  patientId: string;
  patientName: string;
  deviceType: 'fitness_tracker' | 'smartwatch' | 'glucose_monitor' | 'blood_pressure' | 'pulse_oximeter';
  brand: string;
  model: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  batteryLevel: number;
  lastSync: string;
  dataTypes: string[];
  readings: Array<{
    timestamp: string;
    type: string;
    value: number;
    unit: string;
    status: 'normal' | 'abnormal' | 'critical';
  }>;
}

interface MobileApp {
  id: string;
  name: string;
  description: string;
  category: 'patient_portal' | 'medication_tracker' | 'symptom_tracker' | 'appointment_booking';
  platform: 'ios' | 'android' | 'pwa';
  version: string;
  downloads: number;
  rating: number;
  features: string[];
  screenshots: string[];
}

interface PushNotification {
  id: string;
  patientId: string;
  patientName: string;
  type: 'appointment_reminder' | 'medication_reminder' | 'health_alert' | 'lab_results';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledTime: string;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed';
  deliveryTime?: string;
}

interface PatientConsent {
  id: string;
  patientId: string;
  patientName: string;
  email: string;
  consentStatus: 'pending' | 'consented' | 'declined' | 'revoked';
  consentDate?: string;
  revokedDate?: string;
  monitoringTypes: {
    heartRate: boolean;
    bloodPressure: boolean;
    glucose: boolean;
    activity: boolean;
    sleep: boolean;
  };
  deviceAccess: boolean;
  dataSharing: boolean;
  emergencyContact: boolean;
  lastUpdated: string;
}

export default function MobileHealth() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("devices");
  const [selectedDevice, setSelectedDevice] = useState<WearableDevice | null>(null);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [deviceToConfig, setDeviceToConfig] = useState<WearableDevice | null>(null);
  const [sendNotificationOpen, setSendNotificationOpen] = useState(false);
  const [installPwaOpen, setInstallPwaOpen] = useState(false);
  const [configureOfflineOpen, setConfigureOfflineOpen] = useState(false);
  const [appPreviewOpen, setAppPreviewOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<MobileApp | null>(null);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);
  const [settingsDevice, setSettingsDevice] = useState<WearableDevice | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  // Fetch wearable devices
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/mobile-health/devices"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/mobile-health/devices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) throw new Error('Failed to fetch devices');
      return await response.json() as WearableDevice[];
    }
  });

  // Fetch mobile apps
  const { data: apps, isLoading: appsLoading } = useQuery({
    queryKey: ["/api/mobile-health/apps"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/mobile-health/apps', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) throw new Error('Failed to fetch apps');
      return await response.json() as MobileApp[];
    }
  });

  // Fetch push notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/mobile-health/notifications"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/mobile-health/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json() as PushNotification[];
    }
  });

  // Fetch real patients from database
  const { data: realPatients, isLoading: realPatientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  // Create real patient consent data based on actual patients
  const patientConsents: PatientConsent[] = realPatients?.map((patient: any) => ({
    id: `consent_${patient.id}`,
    patientId: patient.patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    email: patient.email || `${patient.firstName.toLowerCase()}.${patient.lastName.toLowerCase()}@email.com`,
    consentStatus: (patient.id === 167 ? 'consented' : patient.id === 159 ? 'consented' : 'pending') as 'pending' | 'consented' | 'declined' | 'revoked',
    consentDate: patient.id === 167 || patient.id === 159 ? '2024-01-15T10:30:00Z' : undefined,
    monitoringTypes: {
      heartRate: true,
      bloodPressure: true,
      glucose: patient.id === 159,
      activity: true,
      sleep: true
    },
    deviceAccess: true,
    dataSharing: patient.id === 167 || patient.id === 159,
    emergencyContact: true,
    lastUpdated: new Date().toISOString()
  })) || [];

  // Sync device mutation
  const syncDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/mobile-health/devices/${deviceId}/sync`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Failed to sync device");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-health/devices"] });
      setSuccessMessage("Device data has been synchronized and updated.");
      setShowSuccessModal(true);
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Unable to sync device. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationData: Partial<PushNotification>) => {
      const response = await fetch("/api/mobile-health/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to send notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-health/notifications"] });
      setSuccessMessage("Notification sent successfully");
      setShowSuccessModal(true);
    }
  });

  // Update patient consent mutation
  const updateConsentMutation = useMutation({
    mutationFn: async ({ patientId, consentData }: { patientId: string; consentData: Partial<PatientConsent> }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/mobile-health/patient-consent/${patientId}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(consentData),
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to update consent");
      return response.json();
    },
    onMutate: async ({ patientId, consentData }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/mobile-health/patient-consent"] });

      // Snapshot the previous value
      const previousConsents = queryClient.getQueryData(["/api/mobile-health/patient-consent"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/mobile-health/patient-consent"], (old: any) => {
        if (!old) return old;
        return old.map((consent: any) => {
          if (consent.patientId === patientId) {
            const updated = { ...consent, ...consentData, lastUpdated: new Date().toISOString() };
            
            // Handle consent status specific updates
            if (consentData.consentStatus === 'consented') {
              updated.deviceAccess = true;
              updated.dataSharing = true;
              updated.monitoringTypes = {
                heartRate: true,
                bloodPressure: true,
                glucose: true,
                activity: true,
                sleep: true
              };
            } else if (consentData.consentStatus === 'declined' || consentData.consentStatus === 'revoked') {
              updated.deviceAccess = false;
              updated.dataSharing = false;
              updated.monitoringTypes = {
                heartRate: false,
                bloodPressure: false,
                glucose: false,
                activity: false,
                sleep: false
              };
            }
            
            return updated;
          }
          return consent;
        });
      });

      // Return a context object with the snapshotted value
      return { previousConsents };
    },
    onError: (err, newTodo, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/mobile-health/patient-consent"], context?.previousConsents);
      console.error("Consent update error:", err);
      toast({
        title: "Update Failed",
        description: "Unable to update consent. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-health/patient-consent"] });
    },
    onSuccess: (response) => {
      console.log("Consent update response:", response);
      setSuccessMessage("Patient monitoring consent has been updated.");
      setShowSuccessModal(true);
    }
  });

  // Fetch patients for notification dropdown
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  // Generate pairing code function
  const generatePairingCode = async () => {
    setGeneratingCode(true);
    try {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a realistic 6-digit pairing code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(code);
      
      setSuccessMessage(`Your pairing code is: ${code}`);
      setShowSuccessModal(true);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate pairing code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  // Mock data
  const mockDevices: WearableDevice[] = [
    {
      id: "device_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      deviceType: "smartwatch",
      brand: "Apple",
      model: "Watch Series 9",
      status: "connected",
      batteryLevel: 78,
      lastSync: "2024-06-26T15:30:00Z",
      dataTypes: ["Heart Rate", "Steps", "Sleep", "ECG"],
      readings: [
        {
          timestamp: "2024-06-26T15:30:00Z",
          type: "heart_rate",
          value: 72,
          unit: "bpm",
          status: "normal"
        },
        {
          timestamp: "2024-06-26T15:30:00Z",
          type: "steps",
          value: 8456,
          unit: "steps",
          status: "normal"
        }
      ]
    },
    {
      id: "device_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      deviceType: "glucose_monitor",
      brand: "Dexcom",
      model: "G7",
      status: "connected",
      batteryLevel: 92,
      lastSync: "2024-06-26T15:45:00Z",
      dataTypes: ["Blood Glucose", "Trends"],
      readings: [
        {
          timestamp: "2024-06-26T15:45:00Z",
          type: "glucose",
          value: 142,
          unit: "mg/dL",
          status: "abnormal"
        }
      ]
    },
    {
      id: "device_3",
      patientId: "patient_3",
      patientName: "Emma Davis",
      deviceType: "blood_pressure",
      brand: "Omron",
      model: "HeartGuide",
      status: "disconnected",
      batteryLevel: 15,
      lastSync: "2024-06-25T08:20:00Z",
      dataTypes: ["Blood Pressure", "Heart Rate"],
      readings: []
    }
  ];

  const mockApps: MobileApp[] = [
    {
      id: "app_1",
      name: "Averox Patient Portal",
      description: "Complete patient portal with appointment booking, messaging, and health records",
      category: "patient_portal",
      platform: "pwa",
      version: "2.1.0",
      downloads: 15420,
      rating: 4.8,
      features: [
        "Appointment Booking",
        "Secure Messaging",
        "Lab Results",
        "Prescription Management",
        "Health Records",
        "Telehealth Integration"
      ],
      screenshots: []
    },
    {
      id: "app_2",
      name: "Averox Medication Tracker",
      description: "Smart medication reminders with dose tracking and refill alerts",
      category: "medication_tracker",
      platform: "ios",
      version: "1.5.2",
      downloads: 8930,
      rating: 4.6,
      features: [
        "Medication Reminders",
        "Dose Tracking",
        "Refill Alerts",
        "Drug Interaction Warnings",
        "Pill Recognition"
      ],
      screenshots: []
    }
  ];

  const mockNotifications: PushNotification[] = [
    {
      id: "notif_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      type: "appointment_reminder",
      title: "Appointment Reminder",
      message: "You have an appointment tomorrow at 10:00 AM with Dr. Emily Watson",
      priority: "normal",
      scheduledTime: "2024-06-27T09:00:00Z",
      status: "scheduled"
    },
    {
      id: "notif_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      type: "health_alert",
      title: "Blood Glucose Alert",
      message: "Your blood glucose reading of 180 mg/dL is elevated. Please check your levels.",
      priority: "high",
      scheduledTime: "2024-06-26T16:00:00Z",
      status: "delivered",
      deliveryTime: "2024-06-26T16:00:12Z"
    }
  ];

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "smartwatch": return Watch;
      case "fitness_tracker": return Activity;
      case "glucose_monitor": return Heart;
      case "blood_pressure": return Heart;
      case "pulse_oximeter": return Activity;
      default: return Smartphone;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-800";
      case "syncing": return "bg-blue-100 text-blue-800";
      case "disconnected": return "bg-gray-100 text-gray-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-600";
    if (level > 20) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-4 space-y-4 page-zoom-90">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mobile Health</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Wearable devices, mobile apps, and patient engagement</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Smartphone className="w-4 h-4 mr-2" />
                Connect Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Wearable Device</DialogTitle>
                <DialogDescription>
                  Connect a new wearable device to track patient health metrics and sync data automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center p-6">
                  <QrCode className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Scan this QR code with your device's companion app to connect
                  </p>
                </div>
                
                {pairingCode && (
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">Pairing Code Generated</div>
                    <div className="text-2xl font-mono font-bold text-green-800 tracking-widest">
                      {pairingCode}
                    </div>
                    <div className="text-xs text-green-600 mt-2">
                      Code expires in 10 minutes
                    </div>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={generatePairingCode}
                  disabled={generatingCode}
                >
                  {generatingCode ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      {pairingCode ? 'Generate New Code' : 'Generate Pairing Code'}
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Apps
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="devices">Wearable Devices</TabsTrigger>
          <TabsTrigger value="apps">Mobile Apps</TabsTrigger>
          <TabsTrigger value="notifications">Push Notifications</TabsTrigger>
          <TabsTrigger value="consent">Patient Consent</TabsTrigger>
          <TabsTrigger value="offline">Offline Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4">
            {devicesLoading ? (
              <div className="text-center py-8">Loading devices...</div>
            ) : (devices || []).map((device) => {
              const DeviceIcon = getDeviceIcon(device.deviceType);
              return (
                <Card key={device.id} className={device.status === 'error' ? 'border-red-200 dark:border-red-800' : 'dark:border-slate-700'}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="w-8 h-8 text-blue-500" />
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{device.brand} {device.model}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{device.patientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(device.status)}>
                          {device.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Battery className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          <span className={`text-sm ${getBatteryColor(device.batteryLevel)}`}>
                            {device.batteryLevel}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Device Type</div>
                        <div className="font-medium capitalize text-gray-900 dark:text-gray-100">
                          {device.deviceType.replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Last Sync</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {format(new Date(device.lastSync), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Data Types</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{device.dataTypes.length} types</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Latest Readings</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{device.readings.length} readings</div>
                      </div>
                    </div>

                    {device.readings.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">Recent Data</h4>
                        <div className="space-y-2">
                          {device.readings.map((reading, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded">
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-red-500" />
                                <span className="text-sm capitalize text-gray-900 dark:text-gray-100">
                                  {reading.type.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {reading.value} {reading.unit}
                                </span>
                                <Badge 
                                  className={reading.status === 'normal' ? 
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                                    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
                                  }
                                >
                                  {reading.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => syncDeviceMutation.mutate(device.id)}
                        disabled={syncDeviceMutation.isPending || device.status === 'syncing'}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Sync Now
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setDeviceToConfig(device);
                          setConfigureOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Configure
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedDevice(device)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="apps" className="space-y-4">
          <div className="grid gap-4">
            {appsLoading ? (
              <div className="text-center py-8">Loading apps...</div>
            ) : (apps || []).map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-blue-500" />
                      <div>
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{app.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < Math.floor(app.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                            ★
                          </span>
                        ))}
                        <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">{app.rating}</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{app.downloads.toLocaleString()} downloads</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Category</div>
                      <div className="font-medium capitalize">
                        {app.category.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Platform</div>
                      <div className="font-medium uppercase">{app.platform}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Version</div>
                      <div className="font-medium">{app.version}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Features</div>
                      <div className="font-medium">{app.features.length} features</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Key Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {app.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        // Create a mock download file
                        const appFileName = `${app.name.replace(/\s+/g, '_')}_v${app.version}.${app.platform === 'pwa' ? 'zip' : app.platform === 'ios' ? 'ipa' : 'apk'}`;
                        const downloadContent = `${app.name} v${app.version}\n\nDescription: ${app.description}\n\nFeatures:\n${app.features.map(f => `- ${f}`).join('\n')}\n\nPlatform: ${app.platform.toUpperCase()}\nRating: ${app.rating}/5\nDownloads: ${app.downloads.toLocaleString()}\n\nThis is a simulated download file for demonstration purposes.`;
                        
                        // Create and trigger download
                        const blob = new Blob([downloadContent], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = appFileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "Download Started",
                          description: `${app.name} is being downloaded to your device`,
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedApp(app);
                        setAppPreviewOpen(true);
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedApp(app);
                        setShareLinkOpen(true);
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Push Notifications</h3>
            <Button onClick={() => setSendNotificationOpen(true)}>
              <Bell className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </div>

          <div className="grid gap-4">
            {notificationsLoading ? (
              <div className="text-center py-8">Loading notifications...</div>
            ) : (notifications || []).map((notification) => (
              <Card key={notification.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{notification.patientName}</h3>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Scheduled: {format(new Date(notification.scheduledTime), 'MMM dd, yyyy HH:mm')}
                          {notification.deliveryTime && (
                            <span className="ml-2">
                              • Delivered: {format(new Date(notification.deliveryTime), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {notification.status === 'delivered' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : notification.status === 'failed' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Activity className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Patient Consent Management</h3>
              <p className="text-gray-600 dark:text-gray-300">Manage patient consent for IoT cardiac monitoring and data sharing</p>
            </div>
          </div>

          <div className="grid gap-4">
            {realPatientsLoading ? (
              <div className="text-center py-8">Loading patient consent data...</div>
            ) : (patientConsents || []).map((consent) => (
              <Card key={consent.id} className={consent.consentStatus === 'declined' || consent.consentStatus === 'revoked' ? 'border-red-200 bg-red-50/30' : consent.consentStatus === 'consented' ? 'border-green-200 bg-green-50/30' : 'border-yellow-200 bg-yellow-50/30'}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Heart className={`w-8 h-8 ${consent.consentStatus === 'consented' ? 'text-green-500' : consent.consentStatus === 'declined' || consent.consentStatus === 'revoked' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <div>
                        <CardTitle className="text-lg">{consent.patientName}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{consent.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        consent.consentStatus === 'consented' ? 'bg-green-100 text-green-800' :
                        consent.consentStatus === 'declined' || consent.consentStatus === 'revoked' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {consent.consentStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Consent Date</div>
                      <div className="font-medium">
                        {consent.consentDate ? format(new Date(consent.consentDate), 'MMM dd, yyyy') : 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
                      <div className="font-medium">
                        {format(new Date(consent.lastUpdated), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Device Access</div>
                      <div className="font-medium">
                        {consent.deviceAccess ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Data Sharing</div>
                      <div className="font-medium">
                        {consent.dataSharing ? 'Allowed' : 'Restricted'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Monitoring Permissions</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${consent.monitoringTypes.heartRate ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Heart Rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${consent.monitoringTypes.bloodPressure ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Blood Pressure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${consent.monitoringTypes.glucose ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Glucose</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${consent.monitoringTypes.activity ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Activity</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${consent.monitoringTypes.sleep ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Sleep</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex items-center gap-2">
                      {(() => {
                        if (consent.consentStatus === 'consented') {
                          const patientDevices = devices?.filter(device => device.patientName === consent.patientName) || [];
                          const activeDevices = patientDevices.filter(device => device.status === 'connected');
                          const recentData = patientDevices.some(device => 
                            device.readings?.length > 0 && 
                            new Date(device.lastSync) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                          );
                          
                          if (activeDevices.length > 0 && recentData) {
                            return <div className="relative"><CheckCircle className="w-5 h-5 text-green-500" /><div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div></div>;
                          } else if (activeDevices.length > 0) {
                            return <Activity className="w-5 h-5 text-blue-500" />;
                          } else {
                            return <CheckCircle className="w-5 h-5 text-gray-400" />;
                          }
                        } else if (consent.consentStatus === 'declined' || consent.consentStatus === 'revoked') {
                          return <AlertTriangle className="w-5 h-5 text-red-500" />;
                        } else {
                          return <Activity className="w-5 h-5 text-yellow-500" />;
                        }
                      })()}
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {(() => {
                          if (consent.consentStatus === 'consented') {
                            // Check if patient has connected devices that are actively monitoring
                            const patientDevices = devices?.filter(device => device.patientName === consent.patientName) || [];
                            const activeDevices = patientDevices.filter(device => device.status === 'connected');
                            const recentData = patientDevices.some(device => 
                              device.readings?.length > 0 && 
                              new Date(device.lastSync) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Within 24 hours
                            );
                            
                            if (activeDevices.length > 0 && recentData) {
                              return `Actively monitoring via ${activeDevices.length} device${activeDevices.length > 1 ? 's' : ''} • Last data: ${format(new Date(patientDevices[0]?.lastSync || new Date()), 'HH:mm')}`;
                            } else if (activeDevices.length > 0) {
                              return `Connected but no recent data • ${activeDevices.length} device${activeDevices.length > 1 ? 's' : ''} online`;
                            } else {
                              return 'Consented but no active devices';
                            }
                          } else if (consent.consentStatus === 'declined' || consent.consentStatus === 'revoked') {
                            return 'No monitoring active';
                          } else {
                            return 'Awaiting patient response';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {consent.consentStatus === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConsentMutation.mutate({
                              patientId: consent.patientId,
                              consentData: {
                                consentStatus: 'declined',
                                lastUpdated: new Date().toISOString()
                              }
                            })}
                            disabled={updateConsentMutation.isPending}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateConsentMutation.mutate({
                              patientId: consent.patientId,
                              consentData: {
                                consentStatus: 'consented',
                                consentDate: new Date().toISOString(),
                                lastUpdated: new Date().toISOString()
                              }
                            })}
                            disabled={updateConsentMutation.isPending}
                          >
                            Grant Consent
                          </Button>
                        </>
                      )}
                      {consent.consentStatus === 'consented' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateConsentMutation.mutate({
                            patientId: consent.patientId,
                            consentData: {
                              consentStatus: 'revoked',
                              revokedDate: new Date().toISOString(),
                              lastUpdated: new Date().toISOString()
                            }
                          })}
                          disabled={updateConsentMutation.isPending}
                        >
                          Revoke Consent
                        </Button>
                      )}
                      {(consent.consentStatus === 'declined' || consent.consentStatus === 'revoked') && (
                        <Button
                          size="sm"
                          onClick={() => updateConsentMutation.mutate({
                            patientId: consent.patientId,
                            consentData: {
                              consentStatus: 'consented',
                              consentDate: new Date().toISOString(),
                              lastUpdated: new Date().toISOString()
                            }
                          })}
                          disabled={updateConsentMutation.isPending}
                        >
                          Request New Consent
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!patientConsents || patientConsents.length === 0) && !realPatientsLoading && (
              <Card>
                <CardContent className="text-center py-8">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">No Patient Consent Records</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Patient consent data will appear here once patients are enrolled for monitoring.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Progressive Web App (PWA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Enable offline functionality for essential features when internet connectivity is limited.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Offline Features</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      View patient records
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Add clinical notes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Access medication lists
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      View appointment schedule
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Storage Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cache Storage</span>
                      <span>45 MB / 100 MB</span>
                    </div>
                    <Progress value={45} />
                    <div className="flex justify-between text-sm">
                      <span>Offline Patients</span>
                      <span>126 records</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setInstallPwaOpen(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Install PWA
                </Button>
                <Button variant="outline" onClick={() => setConfigureOfflineOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Offline
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Details Modal */}
      {selectedDevice && (
        <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedDevice.brand} {selectedDevice.model} - {selectedDevice.patientName}
              </DialogTitle>
              <DialogDescription>
                View detailed information and health metrics from this wearable device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                  <Badge className={getStatusColor(selectedDevice.status)}>
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Battery</div>
                  <div className="flex items-center gap-2">
                    <Battery className={`w-4 h-4 ${getBatteryColor(selectedDevice.batteryLevel)}`} />
                    <span>{selectedDevice.batteryLevel}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Data Types</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDevice.dataTypes.map((type, idx) => (
                    <Badge key={idx} variant="outline">{type}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => syncDeviceMutation.mutate(selectedDevice.id)}
                  disabled={syncDeviceMutation.isPending || selectedDevice.status === 'syncing'}
                >
                  {syncDeviceMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  {syncDeviceMutation.isPending ? 'Syncing...' : 'Sync Device'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSettingsDevice(selectedDevice);
                    setDeviceSettingsOpen(true);
                    setSelectedDevice(null);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Configure Device Dialog */}
      <Dialog open={configureOpen} onOpenChange={setConfigureOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Device - {deviceToConfig?.brand} {deviceToConfig?.model}</DialogTitle>
            <DialogDescription>
              Adjust device settings, sync preferences, and notification options.
            </DialogDescription>
          </DialogHeader>
          {deviceToConfig && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{deviceToConfig.patientName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Device Type: {deviceToConfig.deviceType.replace('_', ' ')}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(deviceToConfig.status)}>
                    {deviceToConfig.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Battery className={`w-4 h-4 ${getBatteryColor(deviceToConfig.batteryLevel)}`} />
                    <span className={`text-sm ${getBatteryColor(deviceToConfig.batteryLevel)}`}>
                      {deviceToConfig.batteryLevel}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Sync Frequency</label>
                <Select defaultValue="every_hour">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_time">Real-time</SelectItem>
                    <SelectItem value="every_15min">Every 15 minutes</SelectItem>
                    <SelectItem value="every_hour">Every hour</SelectItem>
                    <SelectItem value="every_4hours">Every 4 hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Data Collection</label>
                <div className="space-y-2 mt-2">
                  {deviceToConfig.dataTypes.map((dataType, index) => (
                    <label key={index} className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{dataType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Alert Thresholds</label>
                <div className="space-y-3 mt-2">
                  {deviceToConfig.deviceType === 'smartwatch' || deviceToConfig.deviceType === 'fitness_tracker' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-300">Heart Rate Max</label>
                          <Input type="number" defaultValue="120" placeholder="BPM" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-300">Heart Rate Min</label>
                          <Input type="number" defaultValue="60" placeholder="BPM" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Daily Steps Goal</label>
                        <Input type="number" defaultValue="8000" placeholder="Steps" />
                      </div>
                    </>
                  ) : deviceToConfig.deviceType === 'blood_pressure' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Systolic Max</label>
                        <Input type="number" defaultValue="140" placeholder="mmHg" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Diastolic Max</label>
                        <Input type="number" defaultValue="90" placeholder="mmHg" />
                      </div>
                    </div>
                  ) : deviceToConfig.deviceType === 'glucose_monitor' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Glucose High</label>
                        <Input type="number" defaultValue="180" placeholder="mg/dL" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Glucose Low</label>
                        <Input type="number" defaultValue="70" placeholder="mg/dL" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-300">Custom Alert Value</label>
                      <Input type="number" placeholder="Enter threshold value" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notification Settings</label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Critical alerts</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Daily summaries</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Weekly reports</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Low battery warnings</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Auto-sync When</label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Device is charged</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Connected to Wi-Fi</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Patient is at clinic</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setConfigureOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast({
                    title: "Device Configured",
                    description: `Settings updated for ${deviceToConfig?.brand} ${deviceToConfig?.model}`,
                  });
                  setConfigureOpen(false);
                }}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={sendNotificationOpen} onOpenChange={setSendNotificationOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Push Notification</DialogTitle>
            <DialogDescription>
              Send a push notification to the connected mobile device or wearable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient</label>
              <Select defaultValue="">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patientsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : patients && patients.length > 0 ? (
                    patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notification Type</label>
              <Select defaultValue="">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                  <SelectItem value="medication_reminder">Medication Reminder</SelectItem>
                  <SelectItem value="health_alert">Health Alert</SelectItem>
                  <SelectItem value="lab_results">Lab Results Available</SelectItem>
                  <SelectItem value="general">General Information</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select defaultValue="normal">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Title</label>
              <Input 
                placeholder="Notification title" 
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea 
                placeholder="Enter your notification message..."
                className="mt-1 w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Schedule</label>
              <Select defaultValue="now">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Send Now</SelectItem>
                  <SelectItem value="1_hour">In 1 Hour</SelectItem>
                  <SelectItem value="1_day">Tomorrow</SelectItem>
                  <SelectItem value="custom">Custom Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Options</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Push notification</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">SMS backup</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Email backup</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSendNotificationOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Notification Sent",
                  description: "Push notification has been scheduled and sent successfully",
                });
                setSendNotificationOpen(false);
              }}>
                Send Notification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install PWA Dialog */}
      <Dialog open={installPwaOpen} onOpenChange={setInstallPwaOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Install Progressive Web App</DialogTitle>
            <DialogDescription>
              Install the mobile health app on your device for offline access and push notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg">
              <Download className="w-12 h-12 text-blue-500" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-medium">Install Averox EMR</h3>
              <p className="text-sm text-gray-600">
                Install our app for faster access and offline functionality
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Benefits of Installing:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Faster loading times</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Offline access to patient records</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Push notifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Native app experience</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Secure local data storage</span>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">Installation Instructions:</p>
              <ol className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                <li>1. Click "Install App" below</li>
                <li>2. Confirm installation in browser prompt</li>
                <li>3. App will be added to your device</li>
                <li>4. Access from home screen or app drawer</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p>Compatible with:</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">Chrome</Badge>
                  <Badge variant="outline">Edge</Badge>
                  <Badge variant="outline">Safari</Badge>
                  <Badge variant="outline">Firefox</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setInstallPwaOpen(false)}>
                Not Now
              </Button>
              <Button onClick={() => {
                toast({
                  title: "PWA Installation Started",
                  description: "Follow your browser prompts to complete installation",
                });
                setInstallPwaOpen(false);
              }}>
                Install App
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configure Offline Dialog */}
      <Dialog open={configureOfflineOpen} onOpenChange={setConfigureOfflineOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Offline Settings</DialogTitle>
            <DialogDescription>
              Set up offline data storage and sync preferences for when internet connectivity is limited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Offline Mode Configuration</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Customize what data is available when you're offline
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Data Sync Frequency</label>
              <Select defaultValue="auto">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_time">Real-time (Wi-Fi only)</SelectItem>
                  <SelectItem value="auto">Automatic</SelectItem>
                  <SelectItem value="every_hour">Every hour</SelectItem>
                  <SelectItem value="every_4hours">Every 4 hours</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Storage Allocation</label>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Usage</span>
                  <span>45 MB / 500 MB</span>
                </div>
                <Progress value={9} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-300">Max Storage (MB)</label>
                    <Input type="number" defaultValue="500" placeholder="MB" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-300">Patient Records Limit</label>
                    <Input type="number" defaultValue="200" placeholder="Records" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Offline Data Types</label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Patient demographics</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Medical history</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Current medications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Appointment schedule</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Lab results (recent)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Imaging studies</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Clinical notes templates</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Sync Conditions</label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Wi-Fi only</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Allow mobile data</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">When charging</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">During work hours only</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Auto-cleanup</label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Remove old patient records (30+ days)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Clear cache when storage is low</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Delete completed tasks</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setConfigureOfflineOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Offline Settings Updated",
                  description: "Your offline configuration has been saved successfully",
                });
                setConfigureOfflineOpen(false);
              }}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* App Preview Dialog */}
      <Dialog open={appPreviewOpen} onOpenChange={setAppPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>App Preview - {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Preview how this health application will look and function on mobile devices.
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Smartphone className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="font-medium">{selectedApp.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedApp.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{selectedApp.platform.toUpperCase()}</Badge>
                    <span className="text-sm text-gray-500 dark:text-gray-400">v{selectedApp.version}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Rating</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.floor(selectedApp.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                    <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">{selectedApp.rating}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Downloads</div>
                  <div className="font-medium">{selectedApp.downloads.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Category</div>
                  <div className="font-medium capitalize">{selectedApp.category.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Platform</div>
                  <div className="font-medium">{selectedApp.platform.toUpperCase()}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Key Features</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedApp.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Preview Not Available</h4>
                <p className="text-sm text-blue-600 mt-1">
                  App preview requires device installation. Download the app to experience full functionality.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Installation Requirements</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {selectedApp.platform === 'pwa' ? (
                    <>
                      <li>• Modern web browser (Chrome, Edge, Safari, Firefox)</li>
                      <li>• Internet connection for initial install</li>
                      <li>• 50MB available storage space</li>
                    </>
                  ) : selectedApp.platform === 'ios' ? (
                    <>
                      <li>• iOS 14.0 or later</li>
                      <li>• iPhone, iPad, or iPod touch</li>
                      <li>• 100MB available storage space</li>
                    </>
                  ) : (
                    <>
                      <li>• Android 8.0 (API level 26) or higher</li>
                      <li>• 150MB available storage space</li>
                      <li>• Internet connection</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setAppPreviewOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  toast({
                    title: "Download Started",
                    description: `${selectedApp.name} is being downloaded for your device`,
                  });
                  setAppPreviewOpen(false);
                }}>
                  Download App
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Link Dialog */}
      <Dialog open={shareLinkOpen} onOpenChange={setShareLinkOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share App Link - {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Share the download link for this mobile health application with patients or staff.
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Share {selectedApp.name}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Share this app with colleagues, patients, or other healthcare providers
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">App Link</label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={`https://apps.averox.com/${selectedApp.id}`}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(`https://apps.averox.com/${selectedApp.id}`);
                    setSuccessMessage("App link copied to clipboard");
                    setShowSuccessModal(true);
                  }}>
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Share Method</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => {
                      const subject = `Check out ${selectedApp.name}`;
                      const body = `I recommend trying ${selectedApp.name}: ${selectedApp.description}\n\nDownload: https://apps.averox.com/${selectedApp.id}`;
                      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => {
                      const text = `Check out ${selectedApp.name}: ${selectedApp.description} https://apps.averox.com/${selectedApp.id}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">QR Code</label>
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg mt-2">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">QR Code for easy sharing</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Scan to download app</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Share Message Template</label>
                <textarea 
                  className="mt-1 w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue={`I recommend trying ${selectedApp.name} - ${selectedApp.description}

Key features include:
${selectedApp.features.slice(0, 3).map(f => `• ${f}`).join('\n')}

Download link: https://apps.averox.com/${selectedApp.id}`}
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShareLinkOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setSuccessMessage("App sharing options are ready to use");
                  setShowSuccessModal(true);
                  setShareLinkOpen(false);
                }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Device Settings Dialog */}
      <Dialog open={deviceSettingsOpen} onOpenChange={setDeviceSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Device Settings - {settingsDevice?.brand} {settingsDevice?.model}
            </DialogTitle>
            <DialogDescription>
              Configure advanced settings, calibration options, and data collection preferences for this device.
            </DialogDescription>
          </DialogHeader>
          {settingsDevice && (
            <div className="space-y-6">
              {/* Sync Settings */}
              <div>
                <h4 className="font-medium mb-3">Sync Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Sync Frequency</label>
                    <Select defaultValue="every_hour">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real_time">Real-time</SelectItem>
                        <SelectItem value="every_15min">Every 15 minutes</SelectItem>
                        <SelectItem value="every_hour">Every hour</SelectItem>
                        <SelectItem value="every_4hours">Every 4 hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Auto-sync Conditions</label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Wi-Fi only</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Allow mobile data</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">When charging</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">During work hours only</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Collection */}
              <div>
                <h4 className="font-medium mb-3">Data Collection</h4>
                <div className="space-y-2">
                  {settingsDevice.dataTypes.map((dataType, index) => (
                    <label key={index} className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{dataType}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Alert Thresholds */}
              <div>
                <h4 className="font-medium mb-3">Alert Thresholds</h4>
                <div className="grid grid-cols-2 gap-4">
                  {settingsDevice.deviceType === 'smartwatch' && (
                    <>
                      <div>
                        <label className="text-sm font-medium">Heart Rate (High)</label>
                        <input 
                          type="number" 
                          defaultValue="120" 
                          className="w-full mt-1 p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Heart Rate (Low)</label>
                        <input 
                          type="number" 
                          defaultValue="50" 
                          className="w-full mt-1 p-2 border rounded"
                        />
                      </div>
                    </>
                  )}
                  {settingsDevice.deviceType === 'glucose_monitor' && (
                    <>
                      <div>
                        <label className="text-sm font-medium">Glucose High (mg/dL)</label>
                        <input 
                          type="number" 
                          defaultValue="180" 
                          className="w-full mt-1 p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Glucose Low (mg/dL)</label>
                        <input 
                          type="number" 
                          defaultValue="70" 
                          className="w-full mt-1 p-2 border rounded"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-sm font-medium">Battery Low Alert (%)</label>
                    <input 
                      type="number" 
                      defaultValue="20" 
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Settings */}
              <div>
                <h4 className="font-medium mb-3">Privacy & Security</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Share data with healthcare provider</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Allow anonymous research participation</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Encrypt sensitive data</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDeviceSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSuccessMessage("Device settings have been updated successfully");
                  setShowSuccessModal(true);
                  setDeviceSettingsOpen(false);
                }}>
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
}