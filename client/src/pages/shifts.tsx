import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Users, CalendarCheck, ChevronLeft, ChevronRight, UserCheck, Trash2, Edit, Settings, Plus, Check, ChevronsUpDown, CheckCircle, CalendarDays, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isDoctorLike } from "@/lib/role-utils";
import { useLocation } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type HolidayEntry = {
  id: number;
  holidayDate: string;
  name: string;
  holidayType: "national" | "regional" | "company";
  region?: string | null;
  allowShifts: boolean;
  isWorkingDay: boolean;
  notes?: string | null;
};

type HolidaySettings = {
  weekendDays: string[];
  weekendsNonWorking: boolean;
  defaultAllowShiftsOnHolidays: boolean;
};

type DateHolidayStatus = {
  isNonWorking: boolean;
  allowShifts: boolean;
  isWorkingDay: boolean;
  label: string;
  holidayType: string;
  source: "holiday" | "weekend";
  holidayId?: number;
};

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  national: "National",
  regional: "Regional / Provincial",
  company: "Company",
  weekend: "Weekend",
};

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  national: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100",
  regional: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100",
  company: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-100",
  weekend: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-100",
};

const normalizeHolidayDate = (value: string) => value.split("T")[0];

const getDayName = (date: Date) =>
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ShiftsPage() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isInitializingDefaultShifts, setIsInitializingDefaultShifts] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedAvailabilityDay, setSelectedAvailabilityDay] = useState(new Date());
  // Initialize time slot selection state
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Temporary storage for pending shifts before database save
  const [pendingShifts, setPendingShifts] = useState<Array<{startTime: string, endTime: string}>>([]);
  // Conflict modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [shiftSummaryList, setShiftSummaryList] = useState<string[]>([]);
  const [disabledSlots, setDisabledSlots] = useState<number[]>([]);
  const [conflictingShifts, setConflictingShifts] = useState<any[]>([]);
  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatedShifts, setUpdatedShifts] = useState<Array<{previous: string, updated: string, staffName: string}>>([]);
  // Default shifts state
  const [showDefaultShiftModal, setShowDefaultShiftModal] = useState(false);
  const [editingDefaultShift, setEditingDefaultShift] = useState<any>(null);
  const [defaultStartTime, setDefaultStartTime] = useState("09:00");
  const [defaultEndTime, setDefaultEndTime] = useState("17:00");
  const [defaultWorkingDays, setDefaultWorkingDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteSingleConfirmModal, setShowDeleteSingleConfirmModal] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<any>(null);
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [staffPopoverOpen, setStaffPopoverOpen] = useState(false);
  const [holidayMonth, setHolidayMonth] = useState(new Date());
  const [holidayFormDate, setHolidayFormDate] = useState("");
  const [holidayFormName, setHolidayFormName] = useState("");
  const [holidayFormType, setHolidayFormType] = useState<"national" | "regional" | "company">("national");
  const [holidayFormRegion, setHolidayFormRegion] = useState("");
  const [holidayFormAllowShifts, setHolidayFormAllowShifts] = useState(false);
  const [holidayFormIsWorking, setHolidayFormIsWorking] = useState(false);
  const [holidayFormNotes, setHolidayFormNotes] = useState("");
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [showHolidayConfirmDialog, setShowHolidayConfirmDialog] = useState(false);
  const [pendingHolidayAction, setPendingHolidayAction] = useState<"shift" | "absent" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [location] = useLocation();
  const getSearchFromLocation = (loc?: string) => {
    if (loc && loc.includes("?")) {
      return loc.substring(loc.indexOf("?") + 1);
    }
    if (typeof window !== "undefined") {
      return window.location.search.replace(/^\?/, "");
    }
    return "";
  };
  const getTabFromLocation = (loc?: string) => {
    const search = getSearchFromLocation(loc);
    const params = new URLSearchParams(search);
    return params.get("tab") || "custom-shifts";
  };
  const [activeTab, setActiveTab] = useState(() => getTabFromLocation(location));
  useEffect(() => {
    setActiveTab(getTabFromLocation(location));
  }, [location]);
  
  // Compute isDoctor before any hooks that reference it
  const isDoctor = isDoctorLike(user?.role);

  // Helper function to get role-based prefix for staff name display
  const getRolePrefix = (role: string): string => {
    if (!role) return "";
    const roleLower = role.toLowerCase();
    // Check for nurse first before isDoctorLike to ensure correct prefix
    if (roleLower === "nurse") {
      return "Nurse.";
    } else if (isDoctorLike(role)) {
      return "Dr.";
    } else {
      // Fallback: capitalize role name
      return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ") + ".";
    }
  };

  const slotFromTime = (time: string): number => parseInt(time.replace(":", ""));

  const extractSlotRange = (shift: { startTime: string; endTime: string }) => {
    const start = slotFromTime(shift.startTime);
    const end = slotFromTime(shift.endTime);
    const range: number[] = [];
    for (let value = start; value <= end; value += 100) {
      range.push(value);
    }
    return range;
  };

  const slotValueFromTime = (time: string): number => parseInt(time.replace(":", ""));
  const generateSlotRange = (startValue: number, endValue: number) => {
    const range: number[] = [];
    for (let value = startValue; value <= endValue; value += 100) {
      range.push(value);
    }
    return range;
  };

  const getShiftDisabledSlots = (shiftList: any[]) => {
    const disabled: number[] = [];
    shiftList.forEach((shift: any) => {
      if (!shift.startTime || !shift.endTime) return;
      const start = slotValueFromTime(shift.startTime);
      const end = slotValueFromTime(shift.endTime);
      disabled.push(...generateSlotRange(start, end));
    });
    return Array.from(new Set(disabled));
  };

  // Pre-select time slots from 10:00 AM to 3:00 PM only once on initial load
  useEffect(() => {
    if (!hasInitialized) {
      console.log("Initial pre-selection: setting time slots 1000-1500");
      setSelectedTimeSlots([1000, 1100, 1200, 1300, 1400, 1500]);
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Auto-select doctor's own role and ID when user is a doctor
  useEffect(() => {
    if (isDoctor && user?.role && user?.id) {
      setSelectedRole(user.role);
      setSelectedStaffId(user.id.toString());
    }
  }, [isDoctor, user]);

  // Clear pre-selected time slots when staff member is selected
  useEffect(() => {
    if (selectedStaffId) {
      setSelectedTimeSlots([]);
      setSelectedStartTime("");
      setSelectedEndTime("");
      setIsSelectingRange(false);
      setPendingShifts([]);
    }
    setDisabledSlots([]);
  }, [selectedStaffId]);

  // Clear time slot selections when date changes to prevent cross-date confusion
  useEffect(() => {
    console.log("Selected date changed to:", selectedDate.toDateString(), selectedDate);
    setSelectedTimeSlots([]);
    setSelectedStartTime("");
    setSelectedEndTime("");
    setIsSelectingRange(false);
    setPendingShifts([]);
    setDisabledSlots([]);
  }, [selectedDate]);

  // Refetch shifts when availability modal date changes
  useEffect(() => {
    if (showAvailability && selectedAvailabilityDay) {
      console.log("Availability modal date changed to:", selectedAvailabilityDay.toDateString(), "Refetching shifts...");
      // Invalidate queries for both the old and new date to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      // Also invalidate the specific query key pattern
      const newDateString = selectedAvailabilityDay.toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", newDateString] });
      refetchShifts();
    }
  }, [selectedAvailabilityDay, showAvailability]);



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

  // Map roles to dropdown options format
  const roleOptions = rolesData.map((role: any) => ({
    value: role.name,
    label: role.displayName || role.name
  }));

  // Fetch default shifts
  const { data: defaultShifts = [], refetch: refetchDefaultShifts } = useQuery({
    queryKey: ["/api/default-shifts"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/default-shifts");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Default shifts fetch error:", error);
        return [];
      }
    },
  });

  // Update default shift mutation
  const updateDefaultShiftMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/default-shifts/${userId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/default-shifts"] });
      setShowDefaultShiftModal(false);
      setSuccessMessage("Default shift updated successfully");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default shift",
        variant: "destructive",
      });
    },
  });

  // Delete single default shift mutation
  const deleteDefaultShiftMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/default-shifts/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/default-shifts"] });
      setShowDeleteSingleConfirmModal(false);
      setSuccessMessage("Default shift deleted successfully");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete default shift",
        variant: "destructive",
      });
    },
  });

  // Delete all default shifts mutation
  const deleteAllDefaultShiftsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/default-shifts/all");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/default-shifts"] });
      setShowDeleteConfirmModal(false);
      setSuccessMessage(`Successfully deleted ${data.deleted} default shifts`);
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete all default shifts",
        variant: "destructive",
      });
    },
  });

  // Handle edit default shift
  const handleEditDefaultShift = (shift: any) => {
    setEditingDefaultShift(shift);
    setDefaultStartTime(shift.startTime);
    setDefaultEndTime(shift.endTime);
    setDefaultWorkingDays(shift.workingDays || []);
    setShowDefaultShiftModal(true);
  };

  // Handle save default shift
  const handleSaveDefaultShift = async () => {
    if (!editingDefaultShift) return;
    
    await updateDefaultShiftMutation.mutateAsync({
      userId: editingDefaultShift.userId,
      data: {
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        workingDays: defaultWorkingDays,
      },
    });
  };

  // Generate dynamic time slots based on shift data (excluding absent shifts)
  const generateTimeSlots = (doctorShifts: any[]): { value: number; display: string; hour: number; shiftId: any }[] => {
    if (!doctorShifts || doctorShifts.length === 0) {
      // Return empty array if no shifts
      return [];
    }

    const slots: { value: number; display: string; hour: number; shiftId: any }[] = [];
    
    // For each shift, generate hourly slots within the shift duration (skip absent shifts)
    doctorShifts.forEach((shift: any) => {
      // Skip absent shifts - they should not generate time slots
      if (shift.shiftType === 'absent' || shift.status === 'absent') {
        return;
      }
      let startHour, endHour;
      
      // Parse start time
      if (typeof shift.startTime === 'string' && shift.startTime.includes(':')) {
        startHour = parseInt(shift.startTime.split(':')[0]);
      } else {
        startHour = Math.floor(parseInt(shift.startTime) / 100);
      }
      
      // Parse end time
      if (typeof shift.endTime === 'string' && shift.endTime.includes(':')) {
        endHour = parseInt(shift.endTime.split(':')[0]);
      } else {
        endHour = Math.floor(parseInt(shift.endTime) / 100);
      }
      
      // Generate hourly slots for this shift
      for (let hour = startHour; hour < endHour; hour++) {
        const timeValue = hour * 100;
        const displayTime = hour === 0 ? '12:00 AM' : 
                           hour < 12 ? `${hour}:00 AM` : 
                           hour === 12 ? '12:00 PM' : 
                           `${hour - 12}:00 PM`;
        
        // Avoid duplicates
        if (!slots.find(s => s.value === timeValue)) {
          slots.push({ value: timeValue, display: displayTime, hour, shiftId: shift.id });
        }
      }
    });
    
    // Sort slots by time value
    return slots.sort((a, b) => a.value - b.value);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  const shiftCalendarRange = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 41);
    return {
      from: getLocalDateString(start),
      to: getLocalDateString(end),
    };
  }, [currentMonth]);

  const { data: shiftHolidayCalendar } = useQuery({
    queryKey: ["/api/holiday-calendar", shiftCalendarRange.from, shiftCalendarRange.to],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/holiday-calendar?from=${shiftCalendarRange.from}&to=${shiftCalendarRange.to}`,
      );
      return response.json() as Promise<{ settings: HolidaySettings; holidays: HolidayEntry[] }>;
    },
  });

  const holidaySettings = shiftHolidayCalendar?.settings;
  const holidaysInShiftMonth = shiftHolidayCalendar?.holidays ?? [];

  const holidayByDate = useMemo(() => {
    const map = new Map<string, HolidayEntry[]>();
    for (const h of holidaysInShiftMonth) {
      const key = normalizeHolidayDate(h.holidayDate);
      const list = map.get(key) ?? [];
      list.push(h);
      map.set(key, list);
    }
    return map;
  }, [holidaysInShiftMonth]);

  const resolveClientDateStatus = (date: Date): DateHolidayStatus | null => {
    const dateStr = getLocalDateString(date);
    const entries = holidayByDate.get(dateStr);
    if (entries?.length) {
      const primary = entries[0];
      return {
        isNonWorking: !primary.isWorkingDay,
        allowShifts: primary.allowShifts,
        isWorkingDay: primary.isWorkingDay,
        label: primary.name,
        holidayType: primary.holidayType,
        source: "holiday",
        holidayId: primary.id,
      };
    }
    if (holidaySettings?.weekendsNonWorking) {
      const dayName = getDayName(date);
      if ((holidaySettings.weekendDays ?? ["Saturday", "Sunday"]).includes(dayName)) {
        return {
          isNonWorking: true,
          allowShifts: holidaySettings.defaultAllowShiftsOnHolidays ?? false,
          isWorkingDay: false,
          label: `${dayName} (weekend)`,
          holidayType: "weekend",
          source: "weekend",
        };
      }
    }
    return null;
  };

  const selectedDateHolidayStatus = useMemo(
    () => resolveClientDateStatus(selectedDate),
    [selectedDate, holidayByDate, holidaySettings],
  );

  const runAfterHolidayCheck = (
    action: "shift" | "absent",
    runner: (confirmOverride: boolean) => void | Promise<void>,
  ) => {
    const status = resolveClientDateStatus(selectedDate);
    if (
      status &&
      status.isNonWorking &&
      !status.allowShifts &&
      action === "shift"
    ) {
      toast({
        title: "Holiday — shifts not allowed",
        description: `${status.label} is configured as non-working. Shifts cannot be assigned on this date.`,
        variant: "destructive",
      });
      return;
    }
    if (status && status.isNonWorking && status.allowShifts && action === "shift") {
      setPendingHolidayAction(action);
      setShowHolidayConfirmDialog(true);
      return;
    }
    void runner(false);
  };

  const holidayMonthRange = useMemo(() => {
    const year = holidayMonth.getFullYear();
    const month = holidayMonth.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { from, to };
  }, [holidayMonth]);

  const { data: adminHolidayCalendar, refetch: refetchHolidayCalendar } = useQuery({
    queryKey: ["/api/holiday-calendar", "admin", holidayMonthRange.from, holidayMonthRange.to],
    enabled: activeTab === "holiday-calendar",
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/holiday-calendar?from=${holidayMonthRange.from}&to=${holidayMonthRange.to}`,
      );
      return response.json() as Promise<{ settings: HolidaySettings; holidays: HolidayEntry[] }>;
    },
  });

  const saveHolidaySettingsMutation = useMutation({
    mutationFn: async (payload: Partial<HolidaySettings>) => {
      const response = await apiRequest("PUT", "/api/holiday-calendar/settings", payload);
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holiday-calendar"] });
      toast({ title: "Holiday settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const saveHolidayMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editingHolidayId
        ? `/api/holiday-calendar/holidays/${editingHolidayId}`
        : "/api/holiday-calendar/holidays";
      const method = editingHolidayId ? "PUT" : "POST";
      const response = await apiRequest(method, url, payload);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save holiday");
      }
      return response.json();
    },
    onSuccess: () => {
      setHolidayFormName("");
      setHolidayFormRegion("");
      setHolidayFormNotes("");
      setHolidayFormDate("");
      setEditingHolidayId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/holiday-calendar"] });
      refetchHolidayCalendar();
      toast({ title: editingHolidayId ? "Holiday updated" : "Holiday added" });
    },
    onError: (e: Error) => {
      toast({ title: e.message || "Failed to save holiday", variant: "destructive" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/holiday-calendar/holidays/${id}`);
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holiday-calendar"] });
      refetchHolidayCalendar();
      toast({ title: "Holiday removed" });
    },
  });

  const resetHolidayForm = () => {
    setEditingHolidayId(null);
    setHolidayFormDate("");
    setHolidayFormName("");
    setHolidayFormType("national");
    setHolidayFormRegion("");
    setHolidayFormAllowShifts(false);
    setHolidayFormIsWorking(false);
    setHolidayFormNotes("");
  };

  const startEditHoliday = (h: HolidayEntry) => {
    setEditingHolidayId(h.id);
    setHolidayFormDate(normalizeHolidayDate(h.holidayDate));
    setHolidayFormName(h.name);
    setHolidayFormType(h.holidayType);
    setHolidayFormRegion(h.region ?? "");
    setHolidayFormAllowShifts(h.allowShifts);
    setHolidayFormIsWorking(h.isWorkingDay);
    setHolidayFormNotes(h.notes ?? "");
  };

  const adminHolidayByDate = useMemo(() => {
    const map = new Map<string, HolidayEntry[]>();
    for (const h of adminHolidayCalendar?.holidays ?? []) {
      const key = normalizeHolidayDate(h.holidayDate);
      const list = map.get(key) ?? [];
      list.push(h);
      map.set(key, list);
    }
    return map;
  }, [adminHolidayCalendar?.holidays]);

  const resolveAdminDateStatus = (date: Date): DateHolidayStatus | null => {
    const settings = adminHolidayCalendar?.settings;
    const dateStr = getLocalDateString(date);
    const entries = adminHolidayByDate.get(dateStr);
    if (entries?.length) {
      const primary = entries[0];
      return {
        isNonWorking: !primary.isWorkingDay,
        allowShifts: primary.allowShifts,
        isWorkingDay: primary.isWorkingDay,
        label: primary.name,
        holidayType: primary.holidayType,
        source: "holiday",
        holidayId: primary.id,
      };
    }
    if (settings?.weekendsNonWorking) {
      const dayName = getDayName(date);
      if ((settings.weekendDays ?? ["Saturday", "Sunday"]).includes(dayName)) {
        return {
          isNonWorking: true,
          allowShifts: settings.defaultAllowShiftsOnHolidays ?? false,
          isWorkingDay: false,
          label: `${dayName} (weekend)`,
          holidayType: "weekend",
          source: "weekend",
        };
      }
    }
    return null;
  };

  const holidayAdminDays = useMemo(() => {
    const year = holidayMonth.getFullYear();
    const month = holidayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  }, [holidayMonth]);

  // Fetch all users and filter for staff roles (non-patient users)
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/users");
        const data = await response.json();

        // Filter for all non-patient users (matches backend initializeDefaultShifts logic)
        return Array.isArray(data) ? data.filter((user: any) => user.role !== 'patient') : [];
      } catch (error) {
        console.error("Users fetch error:", error);
        throw error;
      }
    },
  });

  // Fetch all shifts for the selected staff member to determine available dates
  const { data: allStaffShifts = [] } = useQuery({
    queryKey: ["/api/shifts/staff", selectedStaffId, isDoctor ? user?.id : null],
    staleTime: 30000,
    enabled: !!selectedStaffId,
    queryFn: async () => {
      const createdByParam = isDoctor && user?.id ? `&createdBy=${user.id}` : '';
      const response = await apiRequest('GET', `/api/shifts?staffId=${selectedStaffId}${createdByParam}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch shifts for selected date (use availability modal date when modal is open)
  const dateForQuery = showAvailability ? selectedAvailabilityDay : selectedDate;
  const queryDateString = getLocalDateString(dateForQuery);
  
  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ["/api/shifts", queryDateString, showAvailability, isDoctor ? user?.id : null],
    queryFn: async () => {
      try {
        // Always use the current state values when the query runs
        const currentDate = showAvailability ? selectedAvailabilityDay : selectedDate;
        const dateString = getLocalDateString(currentDate);
        
        // For doctors, filter shifts by created_by
        const createdByParam = isDoctor && user?.id ? `&createdBy=${user.id}` : '';
        console.log("Query executing: fetching shifts for date:", dateString, "Modal open:", showAvailability, "Doctor filter:", isDoctor, "User ID:", user?.id);
        
        const response = await apiRequest("GET", `/api/shifts?date=${dateString}${createdByParam}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Shifts fetch error:", error);
        throw error;
      }
    },
  });

  useEffect(() => {
    const disabled = getShiftDisabledSlots(shifts);
    setDisabledSlots(disabled);
  }, [shifts]);

  // Check if a date has shifts for the selected staff member
  const hasShiftsOnDate = (date: Date): boolean => {
    if (!allStaffShifts || !selectedStaffId) return false;
    
    const dateStr = getLocalDateString(date);
    return allStaffShifts.some((shift: any) => {
      const shiftDateStr = shift.date.substring(0, 10);
      return shiftDateStr === dateStr && shift.staffId.toString() === selectedStaffId;
    });
  };

  // Filter staff by selected role
  const filteredStaff = useMemo(() => {
    console.log("=== STAFF FILTERING DEBUG ===");
    console.log("Raw staff data:", staff);
    console.log("Selected role:", selectedRole);
    console.log("Staff loading:", staffLoading);
    
    if (!selectedRole) {
      console.log("No role selected, returning all staff:", staff.length);
      return staff;
    }
    
    const filtered = staff.filter((member: any) => member.role === selectedRole);
    console.log(`Filtered staff for role "${selectedRole}":`, filtered.length, filtered);
    console.log("=== END STAFF FILTERING DEBUG ===");
    
    return filtered;
  }, [staff, selectedRole, staffLoading]);

  // Filter shifts for display based on role, name, and date
  const filteredShiftsForDisplay = useMemo(() => {
    console.log("=== SHIFT FILTERING DEBUG ===");
    console.log("All shifts:", shifts);
    console.log("Selected role:", selectedRole);
    console.log("Selected staff ID:", selectedStaffId);
    console.log("Selected date:", selectedDate.toISOString().split('T')[0]);
    
    // If no role selected, return all shifts for the date
    if (!selectedRole) {
      console.log("No role selected, returning all shifts");
      return shifts;
    }
    
    // Filter shifts by role
    let roleFilteredShifts = shifts.filter((shift: any) => {
      const staffMember = staff.find((s: any) => s.id === shift.staffId);
      return staffMember && staffMember.role === selectedRole;
    });
    
    // If staff member is selected, further filter by staffId
    if (selectedStaffId) {
      roleFilteredShifts = roleFilteredShifts.filter((shift: any) => 
        shift.staffId.toString() === selectedStaffId
      );
    }
    
    console.log(`Filtered shifts for role "${selectedRole}":`, roleFilteredShifts.length);
    console.log("=== END SHIFT FILTERING DEBUG ===");
    
    return roleFilteredShifts;
  }, [shifts, selectedRole, selectedStaffId, staff, selectedDate]);

  // Get staff members without shifts for selected role and date
  const staffWithoutShifts = useMemo(() => {
    if (!selectedRole) return [];
    
    // If a specific staff member is selected, only check that staff member
    if (selectedStaffId) {
      const dateString = getLocalDateString(selectedDate);
      const selectedStaff = staff.find((s: any) => s.id.toString() === selectedStaffId);
      if (!selectedStaff) return [];
      
      // Check if selected staff has a shift on this date
      const hasShift = shifts.some((shift: any) => {
        const shiftDateStr = shift.date.substring(0, 10);
        return shift.staffId.toString() === selectedStaffId && shiftDateStr === dateString;
      });
      
      // Return the selected staff if they don't have a shift
      return hasShift ? [] : [selectedStaff];
    }
    
    // If only role is selected (no specific staff), show all staff without shifts
    const dateString = getLocalDateString(selectedDate);
    const staffMembersWithShifts = new Set(
      shifts
        .filter((shift: any) => {
          const staffMember = staff.find((s: any) => s.id === shift.staffId);
          const shiftDateStr = shift.date.substring(0, 10);
          return staffMember && staffMember.role === selectedRole && shiftDateStr === dateString;
        })
        .map((shift: any) => shift.staffId)
    );
    
    return filteredStaff.filter((member: any) => !staffMembersWithShifts.has(member.id));
  }, [selectedRole, selectedStaffId, filteredStaff, shifts, selectedDate, staff]);

  // Get default shifts for selected role and date
  const defaultShiftsForRole = useMemo(() => {
    if (!selectedRole || !selectedDate) return [];
    
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // If a specific staff member is selected, only show their default shift
    if (selectedStaffId) {
      return defaultShifts.filter((defaultShift: any) => {
        const staffMember = staff.find((s: any) => s.id === defaultShift.userId);
        return staffMember && 
               staffMember.id.toString() === selectedStaffId &&
               staffMember.role === selectedRole && 
               defaultShift.workingDays && 
               defaultShift.workingDays.includes(dayOfWeek);
      });
    }
    
    // If only role is selected, show all default shifts for that role
    return defaultShifts.filter((defaultShift: any) => {
      const staffMember = staff.find((s: any) => s.id === defaultShift.userId);
      return staffMember && 
             staffMember.role === selectedRole && 
             defaultShift.workingDays && 
             defaultShift.workingDays.includes(dayOfWeek);
    });
  }, [selectedRole, selectedStaffId, selectedDate, defaultShifts, staff]);

  // Check if time slot is booked for selected staff member
  const isTimeSlotBooked = (timeSlot: string) => {
    if (!selectedStaffId || !selectedDate) return false;
    
    const dateString = selectedDate.toISOString().split('T')[0];
    return shifts.some((shift: any) => 
      shift.staffId === parseInt(selectedStaffId) &&
      shift.date === dateString &&
      shift.startTime === timeSlot &&
      shift.status !== 'cancelled'
    );
  };

  // Handle time slot selection for start/end time range
  const handleTimeSlotClick = (timeSlot: string) => {
    if (!selectedRole) {
      toast({
        title: "Select Role First",
        description: "Please select a role before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStartTime) {
      // First click - set start time
      setSelectedStartTime(timeSlot);
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected",
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    } else if (!selectedEndTime) {
      // Second click - set end time and create shift
      const startTimeValue = parseInt(selectedStartTime.replace(':', ''));
      const endTimeValue = parseInt(timeSlot.replace(':', ''));
      
      if (endTimeValue <= startTimeValue) {
        toast({
          title: "Invalid End Time",
          description: "End time must be after start time. Please select a later time.",
          variant: "destructive",
        });
        return;
      }
      setSelectedEndTime(timeSlot);
      handleCreateShift(selectedStartTime, timeSlot);
    } else {
      // Reset and start new selection
      setSelectedStartTime(timeSlot);
      setSelectedEndTime("");
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected",
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    }
  };

  // Create shift with selected start and end times
  const handleCreateShift = async (startTime: string, endTime: string) => {
    // Use local date formatting to avoid timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    console.log("Creating shift for date:", dateString, "Selected date object:", selectedDate);
    
    try {
      const shiftData = {
        staffId: parseInt(selectedStaffId),
        date: dateString,
        startTime: startTime,
        endTime: endTime,
        shiftType: "regular",
        status: "scheduled",
        isAvailable: true,
        notes: `Scheduled ${startTime} - ${endTime} via shift management calendar`
      };

      const response = await apiRequest("POST", "/api/shifts", shiftData);
      if (response.ok) {
        setSuccessMessage(`Successfully scheduled ${startTime} - ${endTime} for selected staff member`);
        setShowSuccessModal(true);
        
        // Keep selection to maintain dark green color
        // Selection will be reset when user clicks a new time slot
        
        // Force a fresh fetch by invalidating all shift-related queries
        await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
        await refetchShifts();
      }
    } catch (error) {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule the shift. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle time slot selection for shift range creation (stores temporarily, does not save to DB)
  const handleTimeSlotSelection = (slotValue: number) => {
    const holidayStatus = resolveClientDateStatus(selectedDate);
    if (holidayStatus?.isNonWorking && !holidayStatus.allowShifts) {
      toast({
        title: "Non-working day",
        description: `${holidayStatus.label} — shifts cannot be assigned on this date.`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedRole) {
      toast({
        title: "Select Role First",
        description: "Please select a role before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStartTime) {
      // First click - set start time and show only this slot as selected
      const timeSlot = `${Math.floor(slotValue / 100).toString().padStart(2, '0')}:00`;
      setSelectedStartTime(timeSlot);
      setSelectedTimeSlots([slotValue]);
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected",
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    } else if (!selectedEndTime) {
      // Second click - set end time and add to pending shifts  
      const startValue = parseInt(selectedStartTime.replace(':', ''));
      const endValue = slotValue;
      
      if (endValue <= startValue) {
        toast({
          title: "Invalid End Time",
          description: "End time must be after start time. Please select a later time.",
          variant: "destructive",
        });
        return;
      }
      
      // Create range of all slots between start and end
      const range = [];
      for (let i = startValue; i <= endValue; i += 100) {
        range.push(i);
      }
      
      // Use the selected slot as the actual end time (end exclusive)
      const endTimeSlot = `${Math.floor(slotValue / 100).toString().padStart(2, '0')}:00`;
      setSelectedEndTime(endTimeSlot);
      setSelectedTimeSlots(range);
      
      // Add to pending shifts instead of creating immediately
      setPendingShifts(prev => [...prev, { startTime: selectedStartTime, endTime: endTimeSlot }]);
      
      const rangeStart = `${Math.floor(startValue / 100).toString().padStart(2, '0')}:00`;
      setSuccessMessage(`${rangeStart} - ${endTimeSlot} added to pending shifts. Click "Create Shift" to save.`);
      setShowSuccessModal(true);
      
      // Reset for next selection
      setSelectedStartTime("");
      setSelectedEndTime("");
      setIsSelectingRange(false);
    } else {
      // Reset and start new selection
      const timeSlot = `${Math.floor(slotValue / 100).toString().padStart(2, '0')}:00`;
      setSelectedStartTime(timeSlot);
      setSelectedEndTime("");
      setSelectedTimeSlots([slotValue]);
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected", 
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    }
  };

  // Handle clicking on doctor name to show availability
  const handleDoctorClick = async (staffId: number) => {
    console.log("Doctor clicked - Staff ID:", staffId, "Main calendar date:", selectedDate.toDateString(), selectedDate);
    setSelectedDoctorId(staffId.toString());
    setSelectedAvailabilityDay(selectedDate); // Sync modal date with main calendar date
    
    console.log("Setting modal date to:", selectedDate.toDateString(), "Will query for date:", selectedDate.toISOString().split('T')[0]);
    
    // Force complete refresh of shifts data with new key
    await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    await queryClient.refetchQueries({ queryKey: ["/api/shifts"] });
    
    setShowAvailability(true);
  };

  const executeSavePendingShifts = async (confirmHolidayOverride: boolean) => {
    if (pendingShifts.length === 0) {
      toast({
        title: "No Shifts to Save",
        description: "Please select time slots first",
        variant: "destructive",
      });
      return;
    }

    const dateString = getLocalDateString(selectedDate);
    const updatesTracker: Array<{previous: string, updated: string, staffName: string}> = [];

    const uniquePendingShifts = pendingShifts.filter((shift, index, self) =>
      index === self.findIndex((s) => 
        s.startTime === shift.startTime && s.endTime === shift.endTime
      )
    );

    try {
      for (const pendingShift of uniquePendingShifts) {
        const existingShift = shifts.find((shift: any) => {
          const shiftDate = typeof shift.date === 'string' 
            ? shift.date.split('T')[0] 
            : getLocalDateString(new Date(shift.date));
          
          return shift.staffId === parseInt(selectedStaffId) &&
            shiftDate === dateString &&
            shift.startTime === pendingShift.startTime &&
            shift.status !== 'cancelled';
        });

        if (existingShift) {
          const updateData = {
            endTime: pendingShift.endTime,
            notes: `Updated ${pendingShift.startTime} - ${pendingShift.endTime} via shift management calendar`
          };

          const response = await apiRequest("PATCH", `/api/shifts/${existingShift.id}`, updateData);
          if (!response.ok) {
            throw new Error(`Failed to update shift ${pendingShift.startTime}`);
          }

          const staffMember = staff.find((s: any) => s.id === parseInt(selectedStaffId));
          const staffName = staffMember 
            ? `${getRolePrefix(staffMember.role)} ${staffMember.firstName} ${staffMember.lastName}`
            : 'Unknown Staff';

          updatesTracker.push({
            previous: `${existingShift.startTime} - ${existingShift.endTime}`,
            updated: `${pendingShift.startTime} - ${pendingShift.endTime}`,
            staffName: staffName
          });
        } else {
          const shiftData = {
            staffId: parseInt(selectedStaffId),
            date: dateString,
            startTime: pendingShift.startTime,
            endTime: pendingShift.endTime,
            shiftType: "regular",
            status: "scheduled",
            isAvailable: true,
            notes: `Scheduled ${pendingShift.startTime} - ${pendingShift.endTime} via shift management calendar`,
            confirmHolidayOverride,
          };

          const response = await apiRequest("POST", "/api/shifts", shiftData);
          if (response.status === 409) {
            const body = await response.json().catch(() => ({}));
            if (body.error === "HOLIDAY_BLOCKED") {
              toast({
                title: "Holiday — shifts not allowed",
                description: body.message || "Shifts cannot be assigned on this date.",
                variant: "destructive",
              });
              return;
            }
          }
          if (!response.ok) {
            throw new Error(`Failed to create shift ${pendingShift.startTime} - ${pendingShift.endTime}`);
          }
        }
      }

      if (updatesTracker.length > 0) {
        setUpdatedShifts(updatesTracker);
        setShowUpdateModal(true);
      } else {
        setSuccessMessage(`Successfully created ${uniquePendingShifts.length} shift(s)`);
        setShowSuccessModal(true);
      }

      const newDisabledSlots = uniquePendingShifts.flatMap(extractSlotRange);
      setDisabledSlots((prev) => Array.from(new Set([...prev, ...newDisabledSlots])));
      setShiftSummaryList(uniquePendingShifts.map((shift) => `${shift.startTime} - ${shift.endTime}`));

      setPendingShifts([]);
      setSelectedTimeSlots([]);
      await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      await refetchShifts();
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "Failed to save shifts. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle marking staff as absent for the entire day
  const handleMarkAbsent = async () => {
    console.log("Mark Absent button clicked - Staff ID:", selectedStaffId, "Date:", selectedDate.toDateString());
    
    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member before marking absent",
        variant: "destructive",
      });
      return;
    }

    const dateString = getLocalDateString(selectedDate);
    console.log("Marking staff absent for date:", dateString);
    
    try {
      // Create an absence record for the entire day
      const absenceData = {
        staffId: parseInt(selectedStaffId),
        date: dateString,
        startTime: "00:00",
        endTime: "23:59",
        shiftType: "absent",
        status: "absent",
        isAvailable: false,
        notes: `Marked absent for entire day via shift management`
      };

      const response = await apiRequest("POST", "/api/shifts", absenceData);
      if (response.ok) {
        console.log("Successfully marked staff as absent, refreshing data...");
        toast({
          title: "Staff Marked Absent",
          description: `Successfully marked staff member as absent for ${selectedDate.toLocaleDateString()}`,
        });
        
        // Force complete data refresh
        await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
        await refetchShifts();
      } else {
        console.error("Failed to mark staff absent - HTTP", response.status);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Operation Failed", 
        description: "Failed to mark staff as absent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting individual shifts
  const handleDeleteShift = async (shiftId: number) => {
    try {
      const response = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      if (response.ok) {
        toast({
          title: "Shift Deleted",
          description: "Successfully deleted the shift",
        });
        refetchShifts();
        queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the shift. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSavePendingShifts = () => {
    runAfterHolidayCheck("shift", (confirm) => executeSavePendingShifts(confirm));
  };

  // Navigation functions for calendar
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[currentMonth.getMonth()];
  const currentYear = currentMonth.getFullYear();

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';

  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90">
      <Header 
        title="Shifts Management" 
        subtitle="Manage staff shifts, schedules, and availability efficiently."
      />
      
      <div className="p-4 flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="default-shifts" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Default Shifts
          </TabsTrigger>
          <TabsTrigger value="custom-shifts" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Custom Shifts
          </TabsTrigger>
          <TabsTrigger value="holiday-calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Holiday Calendar
          </TabsTrigger>
        </TabsList>

        {/* Default Shifts Tab */}
        <TabsContent value="default-shifts" className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Default Shifts</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Set your regular working hours. These apply unless overridden by custom shifts.</p>
              </div>
            </div>

            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end gap-3 mb-4">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirmModal(true)}
                    disabled={defaultShifts.length === 0}
                    data-testid="button-delete-all-shifts"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Shifts
                  </Button>
                  <Button
                    onClick={async () => {
                      setIsInitializingDefaultShifts(true);
                      try {
                        const response = await apiRequest("POST", "/api/default-shifts/initialize");
                        const result = await response.json();
                        setSuccessMessage(`Created ${result.created} default shifts. Skipped ${result.skipped} existing shifts.`);
                        setShowSuccessModal(true);
                        refetchDefaultShifts();
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to initialize default shifts",
                          variant: "destructive",
                        });
                      } finally {
                        setIsInitializingDefaultShifts(false);
                      }
                    }}
                    disabled={isInitializingDefaultShifts}
                    data-testid="button-initialize-shifts"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isInitializingDefaultShifts ? "Creating Default Shifts" : "Initialize Default Shifts"}
                  </Button>
                </div>
              )}
              
              {defaultShifts.length > 0 ? (
                defaultShifts.map((shift: any) => {
                  const staffMember = staff.find((s: any) => s.id === shift.userId);
                  const canEdit = isAdmin || shift.userId === user?.id;

                  return (
                    <div key={shift.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {shift.startTime} - {shift.endTime}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {shift.workingDays?.map((day: string) => (
                              <span key={day} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                {day.substring(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditDefaultShift(shift)}
                              data-testid={`button-edit-shift-${shift.userId}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => {
                                setShiftToDelete(shift);
                                setShowDeleteSingleConfirmModal(true);
                              }}
                              data-testid={`button-delete-shift-${shift.userId}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No default shifts configured yet. Click the button above to initialize default shifts for all staff members.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Holiday Calendar Tab — global config for shift planning */}
        <TabsContent value="holiday-calendar" className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CalendarDays className="h-6 w-6 text-amber-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holiday Calendar</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure national, regional, and company holidays. The Custom Shifts calendar uses this automatically.
                </p>
              </div>
            </div>

            {isAdmin ? (
              <div className="space-y-6">
                <div className="border dark:border-slate-600 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Weekend rules</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {weekDays.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`weekend-${day}`}
                          checked={(adminHolidayCalendar?.settings?.weekendDays ?? ["Saturday", "Sunday"]).includes(day)}
                          onCheckedChange={(checked) => {
                            const current = adminHolidayCalendar?.settings?.weekendDays ?? ["Saturday", "Sunday"];
                            const next = checked
                              ? [...current, day]
                              : current.filter((d) => d !== day);
                            saveHolidaySettingsMutation.mutate({ weekendDays: next });
                          }}
                        />
                        <label htmlFor={`weekend-${day}`} className="text-sm cursor-pointer">{day}</label>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="weekends-non-working"
                        checked={adminHolidayCalendar?.settings?.weekendsNonWorking ?? true}
                        onCheckedChange={(v) =>
                          saveHolidaySettingsMutation.mutate({ weekendsNonWorking: v })
                        }
                      />
                      <Label htmlFor="weekends-non-working">Treat weekends as non-working days</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="default-allow-shifts"
                        checked={adminHolidayCalendar?.settings?.defaultAllowShiftsOnHolidays ?? false}
                        onCheckedChange={(v) =>
                          saveHolidaySettingsMutation.mutate({ defaultAllowShiftsOnHolidays: v })
                        }
                      />
                      <Label htmlFor="default-allow-shifts">Allow shifts on holidays by default (with warning)</Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border dark:border-slate-600 rounded-lg p-4">
                    <h3 className="font-medium mb-3">{editingHolidayId ? "Edit holiday" : "Add holiday"}</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={holidayFormDate} onChange={(e) => setHolidayFormDate(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input value={holidayFormName} onChange={(e) => setHolidayFormName(e.target.value)} placeholder="e.g. Christmas Day" className="mt-1" />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={holidayFormType} onValueChange={(v) => setHolidayFormType(v as typeof holidayFormType)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national">National</SelectItem>
                            <SelectItem value="regional">Regional / Provincial</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {holidayFormType === "regional" && (
                        <div>
                          <Label>Region / Province</Label>
                          <Input value={holidayFormRegion} onChange={(e) => setHolidayFormRegion(e.target.value)} className="mt-1" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Switch checked={holidayFormIsWorking} onCheckedChange={setHolidayFormIsWorking} id="holiday-working" />
                        <Label htmlFor="holiday-working">Working holiday (staff expected)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={holidayFormAllowShifts} onCheckedChange={setHolidayFormAllowShifts} id="holiday-allow-shifts" />
                        <Label htmlFor="holiday-allow-shifts">Allow shift assignment (shows warning if enabled)</Label>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea value={holidayFormNotes} onChange={(e) => setHolidayFormNotes(e.target.value)} className="mt-1" rows={2} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (!holidayFormDate || !holidayFormName.trim()) {
                              toast({ title: "Date and name are required", variant: "destructive" });
                              return;
                            }
                            saveHolidayMutation.mutate({
                              holidayDate: holidayFormDate,
                              name: holidayFormName.trim(),
                              holidayType: holidayFormType,
                              region: holidayFormType === "regional" ? holidayFormRegion || undefined : undefined,
                              allowShifts: holidayFormAllowShifts,
                              isWorkingDay: holidayFormIsWorking,
                              notes: holidayFormNotes || undefined,
                            });
                          }}
                          disabled={saveHolidayMutation.isPending}
                        >
                          {editingHolidayId ? "Update" : "Add"} holiday
                        </Button>
                        {editingHolidayId && (
                          <Button variant="outline" onClick={resetHolidayForm}>Cancel edit</Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border dark:border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Button variant="outline" size="sm" onClick={() => setHolidayMonth(new Date(holidayMonth.getFullYear(), holidayMonth.getMonth() - 1, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="font-medium">{monthNames[holidayMonth.getMonth()]} {holidayMonth.getFullYear()}</h3>
                      <Button variant="outline" size="sm" onClick={() => setHolidayMonth(new Date(holidayMonth.getFullYear(), holidayMonth.getMonth() + 1, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                        <div key={d} className="text-center text-xs text-gray-500 p-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {holidayAdminDays.map((day, idx) => {
                        const inMonth = day.getMonth() === holidayMonth.getMonth();
                        const dateStr = getLocalDateString(day);
                        const entries = adminHolidayByDate.get(dateStr) ?? [];
                        const status = resolveAdminDateStatus(day);
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={cn(
                              "h-10 text-xs rounded relative",
                              !inMonth && "text-gray-300",
                              entries.length > 0 && "bg-amber-100 dark:bg-amber-900/30 font-semibold",
                              status?.holidayType === "weekend" && entries.length === 0 && "bg-slate-100 dark:bg-slate-700/50",
                            )}
                            onClick={() => {
                              setHolidayFormDate(dateStr);
                              if (entries[0]) startEditHoliday(entries[0]);
                            }}
                          >
                            {day.getDate()}
                            {entries.length > 0 && (
                              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> Holiday</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200" /> Weekend rule</span>
                    </div>
                  </div>
                </div>

                <div className="border dark:border-slate-600 rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 dark:bg-slate-900 font-medium text-sm">Holidays this month</div>
                  {(adminHolidayCalendar?.holidays ?? []).length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">No holidays defined for this month.</p>
                  ) : (
                    <ul className="divide-y dark:divide-slate-600">
                      {(adminHolidayCalendar?.holidays ?? []).map((h) => (
                        <li key={h.id} className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{h.name}</p>
                            <p className="text-sm text-gray-500">
                              {normalizeHolidayDate(h.holidayDate)} · {HOLIDAY_TYPE_LABELS[h.holidayType] ?? h.holidayType}
                              {h.region ? ` · ${h.region}` : ""}
                            </p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={HOLIDAY_TYPE_COLORS[h.holidayType]}>
                                {HOLIDAY_TYPE_LABELS[h.holidayType]}
                              </Badge>
                              {h.isWorkingDay && <Badge variant="outline">Working</Badge>}
                              {h.allowShifts ? <Badge variant="outline">Shifts allowed</Badge> : <Badge variant="outline">No shifts</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => startEditHoliday(h)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteHolidayMutation.mutate(h.id)}>Delete</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only administrators can manage the holiday calendar. You can still see holiday markers on the Custom Shifts tab.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Custom Shifts Tab */}
        <TabsContent value="custom-shifts">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{shifts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <CalendarCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {shifts.filter((s: any) => s.isAvailable && s.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">On Call</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {shifts.filter((s: any) => s.shiftType === 'on_call').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {shifts.filter((s: any) => s.shiftType === 'absent' || s.status === 'absent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role and Name Selection - Hidden for doctors */}
      {!isDoctor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Role</h2>
            </div>
            <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={rolePopoverOpen}
                  className="w-full h-12 justify-between"
                >
                  {selectedRole
                    ? roleOptions.find((role) => role.value === selectedRole)?.label
                    : "Choose a role..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search roles..." />
                  <CommandList>
                    <CommandEmpty>No role found.</CommandEmpty>
                    <CommandGroup>
                      {roleOptions.map((role) => (
                        <CommandItem
                          key={role.value}
                          value={role.label}
                          onSelect={() => {
                            setSelectedRole(role.value);
                            setRolePopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRole === role.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {role.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Name</h2>
            </div>
            <Popover open={staffPopoverOpen} onOpenChange={setStaffPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={staffPopoverOpen}
                  className="w-full h-12 justify-between"
                  disabled={!selectedRole}
                >
                  {selectedStaffId
                    ? (() => {
                        const staff = filteredStaff.find((m: any) => m.id.toString() === selectedStaffId);
                        if (!staff) return "Choose a staff member...";

                        // Use the selected role to determine the prefix instead of the staff's stored role
                        let prefix = "";
                        if (selectedRole) {
                          const roleLower = selectedRole.toLowerCase();
                          // Check for nurse first before isDoctorLike to ensure correct prefix
                          if (roleLower === "nurse") {
                            prefix = "Nurse.";
                          } else if (isDoctorLike(selectedRole)) {
                            prefix = "Dr.";
                          } else {
                            // Fallback: capitalize role name
                            prefix =
                              selectedRole.charAt(0).toUpperCase() +
                              selectedRole.slice(1).replace(/_/g, " ") +
                              ".";
                          }
                        }

                        return `${prefix ? prefix + " " : ""}${staff.firstName} ${staff.lastName}`;
                      })()
                    : !selectedRole
                    ? "Select a role first"
                    : "Choose a staff member..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search staff..." />
                  <CommandList>
                    {staffLoading ? (
                      <CommandEmpty>Loading staff...</CommandEmpty>
                    ) : filteredStaff.length > 0 ? (
                      <CommandGroup>
                        {filteredStaff.map((member: any) => (
                          <CommandItem
                            key={member.id}
                            value={`${member.firstName} ${member.lastName}`}
                            onSelect={() => {
                              setSelectedStaffId(member.id.toString());
                              setStaffPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStaffId === member.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {(() => {
                              // Use the currently selected role to determine the prefix
                              let prefix = "";
                              if (selectedRole) {
                                const roleLower = selectedRole.toLowerCase();
                                // Check for nurse first before isDoctorLike to ensure correct prefix
                                if (roleLower === "nurse") {
                                  prefix = "Nurse.";
                                } else if (isDoctorLike(selectedRole)) {
                                  prefix = "Dr.";
                                } else {
                                  prefix =
                                    selectedRole.charAt(0).toUpperCase() +
                                    selectedRole.slice(1).replace(/_/g, " ") +
                                    ".";
                                }
                              }
                              return `${prefix ? prefix + " " : ""}${member.firstName} ${member.lastName}`;
                            })()}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : selectedRole ? (
                      <CommandEmpty>
                        No {
                          selectedRole === 'lab_technician' ? 'lab technicians' : 
                          selectedRole === 'sample_taker' ? 'sample takers' :
                          `${selectedRole}s`
                        } found
                      </CommandEmpty>
                    ) : (
                      <CommandEmpty>Please select a role first</CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Calendar and Time Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Date Calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select a Date & Time</h2>
          </div>
          
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {currentMonthName} {currentYear}
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = selectedDate.toDateString() === day.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              const dayStatus = resolveClientDateStatus(day);
              const dayHolidays = holidayByDate.get(getLocalDateString(day)) ?? [];
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  title={dayStatus ? dayStatus.label : undefined}
                  className={cn(
                    "h-10 p-0 font-normal flex flex-col items-center justify-center gap-0",
                    !isCurrentMonth && "text-gray-300 dark:text-gray-600",
                    isCurrentMonth && !isSelected && !dayStatus && "text-gray-900 dark:text-gray-100",
                    isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                    isToday && !isSelected && !dayStatus && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
                    dayStatus && !isSelected && dayStatus.holidayType === "national" && "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100",
                    dayStatus && !isSelected && dayStatus.holidayType === "regional" && "bg-orange-100 text-orange-900 dark:bg-orange-900/40",
                    dayStatus && !isSelected && dayStatus.holidayType === "company" && "bg-purple-100 text-purple-900 dark:bg-purple-900/40",
                    dayStatus && !isSelected && dayStatus.holidayType === "weekend" && "bg-slate-100 text-slate-600 dark:bg-slate-700/60",
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <span>{day.getDate()}</span>
                  {dayHolidays.length > 0 && (
                    <span className="text-[9px] leading-none truncate max-w-full px-0.5 opacity-90">
                      {dayHolidays[0].name.slice(0, 6)}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
          {selectedDateHolidayStatus && (
            <div
              className={cn(
                "mt-3 flex items-start gap-2 rounded-md border p-3 text-sm",
                selectedDateHolidayStatus.allowShifts
                  ? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100"
                  : "border-red-300 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100",
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {HOLIDAY_TYPE_LABELS[selectedDateHolidayStatus.holidayType] ?? "Non-working day"}: {selectedDateHolidayStatus.label}
                </p>
                <p className="text-xs mt-1 opacity-90">
                  {selectedDateHolidayStatus.allowShifts
                    ? "Shifts are allowed with a confirmation warning."
                    : "Shift assignment is blocked on this date."}
                  {selectedDateHolidayStatus.isWorkingDay ? " · Marked as a working holiday." : ""}
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> National</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200" /> Regional</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-200" /> Company</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200" /> Weekend</span>
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          
          {!selectedStaffId ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">Select a staff member to view time slots</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Choose role and name from the dropdowns above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mark Absent Button */}
              <div className="flex justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMarkAbsent}
                  className="w-full"
                >
                  Mark Staff as Absent for Entire Day
                </Button>
              </div>

              {/* Create Shift Button */}
              <div className="flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSavePendingShifts}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={pendingShifts.length === 0}
                >
                  Create Shift {pendingShifts.length > 0 && `(${pendingShifts.length} pending)`}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {Array.from({ length: 24 }, (_, hour) => ({ 
                  value: hour * 100, 
                  display: hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`, 
                  hour 
                })).map((slot) => {
                  const dateString = getLocalDateString(selectedDate);
                  
                  // Check if this hour slot has a scheduled shift for the selected staff member
                  const hasShift = shifts.some((shift: any) => {
                    if (shift.staffId !== parseInt(selectedStaffId) || shift.status === 'cancelled') {
                      return false;
                    }
                    
                    // Compare dates properly
                    const shiftDateStr = shift.date.substring(0, 10);
                    if (shiftDateStr !== dateString) {
                      return false;
                    }
                    
                    // Convert time formats for comparison
                    const shiftStart = typeof shift.startTime === 'string' && shift.startTime.includes(':') 
                      ? parseInt(shift.startTime.replace(':', ''))
                      : parseInt(shift.startTime);
                    const shiftEnd = typeof shift.endTime === 'string' && shift.endTime.includes(':')
                      ? parseInt(shift.endTime.replace(':', ''))
                      : parseInt(shift.endTime);
                    return slot.value >= shiftStart && slot.value < shiftEnd;
                  });
                  
                  // Check if this time slot is selected
                  const isSelected = selectedTimeSlots.includes(slot.value);
                  const isDisabledSlot = disabledSlots.includes(slot.value);
                  const slotDisabled = hasShift || isDisabledSlot;
                  

                  
                  return (
                    <Button
                      key={slot.value}
                      variant="outline"
                      disabled={slotDisabled}
                      className={`
                        h-12 justify-center font-medium transition-all text-sm
                        ${isSelected
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-400 hover:from-green-500 hover:to-emerald-600 cursor-pointer'
                          : slotDisabled
                          ? 'bg-gray-400 text-gray-100 border-gray-400 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-blue-400 hover:from-blue-500 hover:to-cyan-500 cursor-pointer'
                        }
                      `}
                      onClick={() => handleTimeSlotSelection(slot.value)}
                    >
                      {slot.display}
                    </Button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="text-center text-gray-700 dark:text-gray-300 font-medium mb-3">
                  {!selectedStartTime && "Click a time slot to set start time"}
                  {selectedStartTime && !selectedEndTime && "Now select end time to complete shift"}
                  {selectedStartTime && selectedEndTime && "Shift scheduled! Click another slot to create new shift"}
                </div>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Shift Already Created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Selected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">
        <div className="p-6 border-b dark:border-slate-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Shifts for {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        
        {shiftsLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading shifts...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-600">
            {/* Custom Shifts from staff_shifts table */}
            {filteredShiftsForDisplay.length > 0 && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Custom Shifts</h3>
                </div>
                {filteredShiftsForDisplay
                  .sort((a: any, b: any) => {
                    // Sort by creation date (newest first), then by start time
                    const dateA = new Date(a.createdAt || a.date);
                    const dateB = new Date(b.createdAt || b.date);
                    if (dateA.getTime() !== dateB.getTime()) {
                      return dateB.getTime() - dateA.getTime(); // Newest first
                    }
                    // If same creation date, sort by start time
                    const timeA = typeof a.startTime === 'string' && a.startTime.includes(':') 
                      ? parseInt(a.startTime.replace(':', ''))
                      : parseInt(a.startTime);
                    const timeB = typeof b.startTime === 'string' && b.startTime.includes(':')
                      ? parseInt(b.startTime.replace(':', ''))
                      : parseInt(b.startTime);
                    return timeA - timeB;
                  })
                  .map((shift: any) => {
                    const staffMember = staff.find((s: any) => s.id === shift.staffId);
                    const staffName = staffMember 
                      ? `${getRolePrefix(staffMember.role)} ${staffMember.firstName} ${staffMember.lastName}`
                      : 'Unknown Staff';
                    
                    return (
                      <div key={shift.id} className="p-6 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 
                              className="text-lg font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline transition-colors"
                              onClick={() => handleDoctorClick(shift.staffId)}
                            >
                              {staffName}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              shift.shiftType === 'regular' ? 'bg-blue-100 text-blue-800' :
                              shift.shiftType === 'overtime' ? 'bg-purple-100 text-purple-800' :
                              shift.shiftType === 'on_call' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {shift.shiftType.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              shift.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                              shift.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {shift.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
{shift.startTime}-{shift.endTime}
                            </div>
                            {shift.notes && <span>• {shift.notes}</span>}
                          </div>
                        </div>
                        
                        {/* Delete Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteShift(shift.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
              </>
            )}

            {/* Staff without shifts */}
            {selectedRole && staffWithoutShifts.length > 0 && (
              <>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20">
                  <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">Staff Without Shifts</h3>
                </div>
                {staffWithoutShifts.map((member: any) => (
                  <div key={member.id} className="p-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {getRolePrefix(member.role)} {member.firstName} {member.lastName}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {member.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">No shift scheduled for this date</p>
                  </div>
                ))}
              </>
            )}

            {/* Default shifts from doctor_default_shifts table */}
            {selectedRole && filteredShiftsForDisplay.length === 0 && defaultShiftsForRole.length > 0 && (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-900/20">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">Default Shifts</h3>
                </div>
                {defaultShiftsForRole.map((defaultShift: any) => {
                  const staffMember = staff.find((s: any) => s.id === defaultShift.userId);
                  const staffName = staffMember 
                    ? `${getRolePrefix(staffMember.role)} ${staffMember.firstName} ${staffMember.lastName}`
                    : 'Unknown Staff';
                  
                  return (
                    <div key={defaultShift.id} className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-green-600">
                          {staffName}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          DEFAULT SHIFT
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {defaultShift.startTime}-{defaultShift.endTime}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Days:</span>
                          {defaultShift.workingDays?.map((day: string) => (
                            <span key={day} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                              {day.substring(0, 3)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* No data message */}
            {!selectedRole && shifts.length === 0 && (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No shifts scheduled for this date</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Select a role above or use the calendar to schedule new shifts</p>
              </div>
            )}
            {selectedRole && filteredShiftsForDisplay.length === 0 && staffWithoutShifts.length === 0 && defaultShiftsForRole.length === 0 && (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No shifts found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">No staff or shifts found for the selected role and date</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Doctor Availability Modal */}
      {showAvailability && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-slate-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Doctor Availability</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAvailability(false)}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                const selectedDoctor = staff.find((s: any) => s.id.toString() === selectedDoctorId);
                if (!selectedDoctor) return <p className="text-gray-600 dark:text-gray-400">Doctor not found</p>;
                
                console.log("All shifts data:", shifts);
                console.log("Looking for doctor ID:", selectedDoctorId, "on date:", selectedAvailabilityDay.toDateString());
                
                const doctorShifts = shifts.filter((s: any) => {
                  // Use timezone-safe date comparison
                  const shiftDate = new Date(s.date);
                  const shiftDateString = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}-${String(shiftDate.getDate()).padStart(2, '0')}`;
                  
                  const selectedYear = selectedAvailabilityDay.getFullYear();
                  const selectedMonth = String(selectedAvailabilityDay.getMonth() + 1).padStart(2, '0');
                  const selectedDay = String(selectedAvailabilityDay.getDate()).padStart(2, '0');
                  const selectedDateString = `${selectedYear}-${selectedMonth}-${selectedDay}`;
                  
                  console.log("Checking shift:", s.id, "Staff ID:", s.staffId, "Date:", s.date, "Shift date string:", shiftDateString, "Selected date string:", selectedDateString, "Staff match:", s.staffId.toString() === selectedDoctorId, "Date match:", shiftDateString === selectedDateString);
                  return s.staffId.toString() === selectedDoctorId && shiftDateString === selectedDateString;
                });
                
                console.log("Filtered doctor shifts:", doctorShifts);
                
                return (
                  <div className="space-y-6">
                    {/* Doctor Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                        {getRolePrefix(selectedDoctor.role)} {selectedDoctor.firstName} {selectedDoctor.lastName}
                      </h3>
                      <p className="text-blue-700 dark:text-blue-400">{selectedDoctor.email}</p>
                      <p className="text-blue-600 dark:text-blue-400 capitalize">{selectedDoctor.role}</p>
                    </div>

                    {/* Availability Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                        <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">Available Hours</h4>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {(() => {
                            const totalHours = doctorShifts
                              .filter((s: any) => s.isAvailable && s.status === 'scheduled' && s.shiftType !== 'absent')
                              .reduce((total: number, shift: any) => {
                                let startHour, endHour;
                                
                                // Parse start time
                                if (typeof shift.startTime === 'string' && shift.startTime.includes(':')) {
                                  startHour = parseInt(shift.startTime.split(':')[0]);
                                } else {
                                  startHour = Math.floor(parseInt(shift.startTime) / 100);
                                }
                                
                                // Parse end time
                                if (typeof shift.endTime === 'string' && shift.endTime.includes(':')) {
                                  endHour = parseInt(shift.endTime.split(':')[0]);
                                } else {
                                  endHour = Math.floor(parseInt(shift.endTime) / 100);
                                }
                                
                                return total + (endHour - startHour);
                              }, 0);
                            return totalHours;
                          })()}h
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">This period</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                        <h4 className="text-lg font-semibold text-orange-800 dark:text-orange-300">On Call</h4>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {doctorShifts.filter((s: any) => s.shiftType === 'on_call').length}
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Shifts</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                        <h4 className="text-lg font-semibold text-red-800 dark:text-red-300">Absent Hours</h4>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {(() => {
                            const absentHours = doctorShifts
                              .filter((s: any) => s.shiftType === 'absent' || s.status === 'absent')
                              .reduce((total: number, shift: any) => {
                                let startHour, endHour;
                                
                                // Parse start time
                                if (typeof shift.startTime === 'string' && shift.startTime.includes(':')) {
                                  startHour = parseInt(shift.startTime.split(':')[0]);
                                } else {
                                  startHour = Math.floor(parseInt(shift.startTime) / 100);
                                }
                                
                                // Parse end time  
                                if (typeof shift.endTime === 'string' && shift.endTime.includes(':')) {
                                  endHour = parseInt(shift.endTime.split(':')[0]);
                                } else {
                                  endHour = Math.floor(parseInt(shift.endTime) / 100);
                                }
                                
                                return total + (endHour - startHour);
                              }, 0);
                            return absentHours;
                          })()}h
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">Unavailable</p>
                      </div>
                    </div>

                    {/* Day Selection */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Day</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, index) => {
                          // Calculate the date for this day of the week
                          const startOfWeek = new Date(selectedAvailabilityDay);
                          const day = startOfWeek.getDay();
                          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
                          startOfWeek.setDate(diff);
                          
                          const dayDate = new Date(startOfWeek);
                          dayDate.setDate(startOfWeek.getDate() + index);
                          
                          const isSelected = selectedAvailabilityDay.toDateString() === dayDate.toDateString();
                          
                          return (
                            <button
                              key={dayName}
                              onClick={() => setSelectedAvailabilityDay(dayDate)}
                              className={`p-3 rounded-lg border text-center font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-600'
                              }`}
                            >
                              <div className="text-sm">{dayName}</div>
                              <div className="text-xs mt-1">{dayDate.getDate()}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic Time Table based on Doctor's Shifts */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        {selectedDoctor.firstName}'s Available Time Slots - {selectedAvailabilityDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h4>
                      <div className="bg-white rounded-lg border p-4">
                        {(() => {
                          const hasRegularShifts = generateTimeSlots(doctorShifts).length > 0;
                          const hasAbsentShifts = doctorShifts.some((s: any) => s.shiftType === 'absent' || s.status === 'absent');
                          
                          if (!hasRegularShifts && !hasAbsentShifts) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <p>No shifts scheduled for this doctor.</p>
                                <p className="text-sm mt-2">Schedule a shift to see available time slots.</p>
                              </div>
                            );
                          }
                          
                          if (!hasRegularShifts && hasAbsentShifts) {
                            return (
                              <div className="text-center py-8 text-red-500">
                                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                                  <div className="text-red-600 text-lg font-semibold mb-2">Staff Member Absent</div>
                                  <p className="text-red-700 text-sm">This staff member is marked as absent for this day.</p>
                                  <p className="text-red-600 text-sm font-medium mt-2">No available time slots.</p>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                          <>
                            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                            {generateTimeSlots(doctorShifts).map((slot) => {
                            // Check if this doctor has a NON-ABSENT shift at this time (exclude absent shifts)
                            const hasShift = doctorShifts.some((shift: any) => {
                              // Skip absent shifts - they should not show as green available slots
                              if (shift.shiftType === 'absent' || shift.status === 'absent') {
                                return false;
                              }
                              
                              // Convert time formats for comparison - handle both "HHMM" and "HH:MM" formats
                              let shiftStart, shiftEnd;
                              
                              if (typeof shift.startTime === 'string') {
                                if (shift.startTime.includes(':')) {
                                  shiftStart = parseInt(shift.startTime.replace(':', ''));
                                } else if (shift.startTime.length === 4) {
                                  shiftStart = parseInt(shift.startTime);
                                } else {
                                  shiftStart = parseInt(shift.startTime.padStart(4, '0'));
                                }
                              } else {
                                shiftStart = parseInt(shift.startTime);
                              }
                              
                              if (typeof shift.endTime === 'string') {
                                if (shift.endTime.includes(':')) {
                                  shiftEnd = parseInt(shift.endTime.replace(':', ''));
                                } else if (shift.endTime.length === 4) {
                                  shiftEnd = parseInt(shift.endTime);
                                } else {
                                  shiftEnd = parseInt(shift.endTime.padStart(4, '0'));
                                }
                              } else {
                                shiftEnd = parseInt(shift.endTime);
                              }
                              
                              return slot.value >= shiftStart && slot.value <= shiftEnd;
                            });
                            
                            const handleSlotClick = async () => {
                              try {
                                const dateString = selectedAvailabilityDay.toISOString().split('T')[0];
                                
                                if (hasShift) {
                                  // Remove shift - find and delete the shift that contains this time slot
                                  const shiftToRemove = doctorShifts.find((shift: any) => {
                                    
                                    // Convert time formats for comparison
                                    const shiftStart = typeof shift.startTime === 'string' && shift.startTime.includes(':') 
                                      ? parseInt(shift.startTime.replace(':', ''))
                                      : parseInt(shift.startTime);
                                    const shiftEnd = typeof shift.endTime === 'string' && shift.endTime.includes(':')
                                      ? parseInt(shift.endTime.replace(':', ''))
                                      : parseInt(shift.endTime);
                                    
                                    return slot.value >= shiftStart && slot.value <= shiftEnd;
                                  });
                                  
                                  if (shiftToRemove) {
                                    const response = await fetch(`/api/shifts/${shiftToRemove.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                        'Content-Type': 'application/json',
                                      },
                                    });
                                    
                                    if (response.ok) {
                                      // Refresh shifts data using React Query
                                      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
                                      setSuccessMessage("Shift removed successfully");
                                      setShowSuccessModal(true);
                                    }
                                  }
                                } else {
                                  // Add new shift for this time slot (1 hour duration)
                                  const endTime = slot.value + 100; // Add 1 hour (100 in HHMM format)
                                  const shiftData = {
                                    staffId: parseInt(selectedDoctor.id),
                                    date: dateString,
                                    startTime: slot.value.toString().padStart(4, '0'),
                                    endTime: endTime.toString().padStart(4, '0'),
                                    shiftType: 'regular',
                                    status: 'scheduled',
                                    isAvailable: true,
                                    notes: 'Added from Doctor Availability modal'
                                  };
                                  
                                  const response = await fetch('/api/shifts', {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(shiftData),
                                  });
                                  
                                  if (response.ok) {
                                    // Refresh shifts data using React Query
                                    queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
                                    setSuccessMessage("Shift added successfully");
                                    setShowSuccessModal(true);
                                  }
                                }
                              } catch (error) {
                                console.error('Error updating shift:', error);
                              }
                            };
                            
                            return (
                              <button
                                key={slot.value}
                                onClick={handleSlotClick}
                                className={`
                                  h-12 flex items-center justify-center font-medium rounded-lg border text-sm transition-all cursor-pointer hover:opacity-80
                                  ${hasShift 
                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                                  }
                                `}
                              >
                                {slot.display}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t text-center">
                          <p className="text-sm text-gray-600 mb-3">
                            Time slots from scheduled shifts for {selectedAvailabilityDay.toLocaleDateString('en-US', { weekday: 'long' })} (Click to remove shift)
                          </p>
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-600 rounded"></div>
                              <span className="text-gray-600">Scheduled Hours (Click to Remove)</span>
                            </div>
                          </div>
                            </div>
                          </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Detailed Shifts */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Schedule</h4>
                      <div className="space-y-3">
                        {doctorShifts.map((shift: any) => (
                          <div key={shift.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {new Date(shift.date).toLocaleDateString()} - {shift.startTime} to {shift.endTime}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    shift.shiftType === 'regular' ? 'bg-blue-100 text-blue-800' :
                                    shift.shiftType === 'overtime' ? 'bg-purple-100 text-purple-800' :
                                    shift.shiftType === 'on_call' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {shift.shiftType.replace('_', ' ').toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    shift.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                                    shift.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {shift.status.toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    shift.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {shift.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {shift.notes && (
                              <p className="text-sm text-gray-600 mt-2">{shift.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-slate-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Shift Already Exists</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowConflictModal(false);
                    setConflictingShifts([]);
                  }}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                The following shift(s) already exist in the database. Please select another date or time.
              </p>

              <div className="space-y-3">
                {conflictingShifts.map((shift: any) => {
                  const staffMember = staff.find((s: any) => s.id === shift.staffId);
                  const staffName = staffMember 
                    ? `${getRolePrefix(staffMember.role)} ${staffMember.firstName} ${staffMember.lastName}`
                    : 'Unknown Staff';

                  return (
                    <div key={shift.id} className="border border-red-300 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-red-800 dark:text-red-300">{staffName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          shift.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                          shift.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {shift.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-400">
                        <p><strong>Date:</strong> {new Date(shift.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {shift.startTime} - {shift.endTime}</p>
                        <p><strong>Type:</strong> {shift.shiftType.replace('_', ' ').toUpperCase()}</p>
                        {shift.notes && <p><strong>Notes:</strong> {shift.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="default"
                  onClick={() => {
                    setShowConflictModal(false);
                    setConflictingShifts([]);
    setPendingShifts([]);
                  }}
                >
                  Close and Select Another Time
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-slate-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Shift Updated Successfully</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdatedShifts([]);
                  }}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                The following shift(s) have been updated with new time slots:
              </p>

              <div className="space-y-3">
                {updatedShifts.map((update, index) => (
                  <div key={index} className="border border-blue-300 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-3">{update.staffName}</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Previous Time Slot:</p>
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded px-3 py-2">
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">{update.previous}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Updated Time Slot:</p>
                        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded px-3 py-2">
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">{update.updated}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="default"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdatedShifts([]);
                  }}
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </TabsContent>
      </Tabs>

      {/* Default Shift Edit Modal */}
      <Dialog open={showDefaultShiftModal} onOpenChange={setShowDefaultShiftModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Default Shift</DialogTitle>
            <DialogDescription>
              Update your regular working hours. These apply unless overridden by date-specific shifts.
            </DialogDescription>
          </DialogHeader>

          {editingDefaultShift && (() => {
            const staffMember = staff.find((s: any) => s.id === editingDefaultShift.userId);
            return staffMember ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Editing shift for: {staffMember.firstName} {staffMember.lastName}
                </p>
              </div>
            ) : null;
          })()}

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="default-start-time">Start Time</Label>
                <Input
                  id="default-start-time"
                  type="time"
                  value={defaultStartTime}
                  onChange={(e) => setDefaultStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="default-end-time">End Time</Label>
                <Input
                  id="default-end-time"
                  type="time"
                  value={defaultEndTime}
                  onChange={(e) => setDefaultEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Working Days</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {weekDays.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={defaultWorkingDays.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDefaultWorkingDays([...defaultWorkingDays, day]);
                        } else {
                          setDefaultWorkingDays(defaultWorkingDays.filter((d) => d !== day));
                        }
                      }}
                    />
                    <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDefaultShiftModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDefaultShift} disabled={updateDefaultShiftMutation.isPending}>
              {updateDefaultShiftMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Shift details</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <p className="text-lg font-semibold">Shift saved successfully</p>
            </div>
            {shiftSummaryList.length > 0 && (
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {shiftSummaryList.map((summary) => (
                  <li key={summary}>{summary}</li>
                ))}
              </ul>
            )}
            {shiftSummaryList.length === 0 && (
              <p className="text-gray-700 dark:text-gray-300">{successMessage}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
                setShiftSummaryList([]);
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Single Shift Confirmation Modal */}
      <Dialog open={showDeleteSingleConfirmModal} onOpenChange={setShowDeleteSingleConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Confirm Deletion</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {shiftToDelete && (() => {
              const staffMember = staff.find((s: any) => s.id === shiftToDelete.userId);
              return (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Are you sure you want to delete the default shift for{' '}
                    <span className="font-bold">
                      {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'this user'}
                    </span>?
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone.
                  </p>
                </>
              );
            })()}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteSingleConfirmModal(false);
                setShiftToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => shiftToDelete && deleteDefaultShiftMutation.mutate(shiftToDelete.userId)}
              disabled={deleteDefaultShiftMutation.isPending}
              data-testid="button-confirm-delete-single"
            >
              {deleteDefaultShiftMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showHolidayConfirmDialog} onOpenChange={setShowHolidayConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Holiday date</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDateHolidayStatus
                ? `This date is marked as ${selectedDateHolidayStatus.label} (${HOLIDAY_TYPE_LABELS[selectedDateHolidayStatus.holidayType]?.toLowerCase() ?? "holiday"}). Do you still want to assign a shift?`
                : "This date is a non-working day. Do you still want to assign a shift?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingHolidayAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowHolidayConfirmDialog(false);
                if (pendingHolidayAction === "shift") {
                  void executeSavePendingShifts(true);
                }
                setPendingHolidayAction(null);
              }}
            >
              Yes, assign shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Shifts Confirmation Modal */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Confirm Deletion</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete all default shifts? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will delete <span className="font-bold text-red-600 dark:text-red-400">{defaultShifts.length}</span> default shift(s).
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllDefaultShiftsMutation.mutate()}
              disabled={deleteAllDefaultShiftsMutation.isPending}
              data-testid="button-confirm-delete-all"
            >
              {deleteAllDefaultShiftsMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}