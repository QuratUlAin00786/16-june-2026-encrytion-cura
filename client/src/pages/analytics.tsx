import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  LabelList
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  PoundSterling, 
  Clock,
  Download,
  Filter,
  RefreshCw,
  Activity,
  FileText,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Settings,
  ChevronsUpDown,
  Check,
  Loader2,
  CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { isDoctorLike } from "@/lib/role-utils";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useCurrency } from "@/hooks/use-currency";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import { apiRequest, buildUrl, getTenantSubdomain } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Custom Tooltip component with theme support
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const isDark = document.documentElement.classList.contains('dark');
    return (
      <div style={{
        backgroundColor: isDark ? '#1e293b' : 'white',
        border: isDark ? '1px solid #475569' : '1px solid white',
        borderRadius: '4px',
        padding: '8px',
        boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ color: isDark ? '#e2e8f0' : '#000', margin: 0 }}>
          {`${payload[0].name} : ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

interface AnalyticsData {
  overview: {
    totalPatients: number;
    newPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
    averageWaitTime: number;
    patientSatisfaction: number;
    noShowRate: number;
    patientsThisMonth?: number;
    topDoctor?: {
      name: string;
      appointmentCount: number;
    };
    totalRevenue?: number;
    outstandingDues?: number;
    labTestsCount?: number;
    noShowCount?: number;
    cancelledCount?: number;
    topLabTest?: {
      name: string;
      count: number;
    };
    topPaymentMode?: {
      mode: string;
      count: number;
    };
    averageAge?: number;
    maleCount?: number;
    femaleCount?: number;
  };
  trends: {
    patientGrowth: Array<{
      month: string;
      total: number;
      new: number;
    }>;
    appointmentVolume: Array<{
      date: string;
      scheduled: number;
      completed: number;
      cancelled: number;
      noShow: number;
    }>;
    revenue: Array<{
      month: string;
      amount: number;
      target: number;
    }>;
  };
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Custom Analytics Dashboard Component

function CustomTreatmentAnalyticsModule() {
  const formatSqlDate = (d: string | Date) => dayjs(d).format("YYYY-MM-DD HH:mm:ss");
  // Align date bounds with appointments admin filter: day start/end using ISO-like strings without timezone conversion
  const getBoundedIsoRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const sDay = s.toISOString().split("T")[0];
    const eDay = e.toISOString().split("T")[0];
    return {
      startIso: `${sDay}T00:00:00`,
      endIso: `${eDay}T23:59:59`,
    };
  };
  // Rebuilt data pipeline: unified series from DB with server fallback
  function useAppointmentsSeries(params: {
    startDate: string;
    endDate: string;
    appointmentType: "consultation" | "treatment";
    enabled: boolean;
  }) {
    const { startDate: s, endDate: e, appointmentType: at, enabled } = params;
    const orgId = (tenantInfoQuery.data as any)?.id ?? (user as any)?.organizationId ?? null;

    const baseQuery = useQuery({
      queryKey: ["/api/appointments", "series", { s, e, at, orgId, createRunId }],
      enabled: !!user && enabled,
      retry: false,
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/appointments");
        const data = await res.json();
        const all: any[] = Array.isArray(data) ? data : [];
        const startTs = new Date(s).getTime();
        const endTs = new Date(e).getTime();
        const startDay = String(s).slice(0, 10);
        const endDay = String(e).slice(0, 10);
        const rows = all.filter((a: any) => {
          const rowOrg = a?.organization_id ?? a?.organizationId ?? null;
          if (orgId != null && Number(rowOrg) !== Number(orgId)) return false;
          const raw = a?.scheduledAt ?? a?.scheduled_at ?? null;
          const ts = raw ? new Date(raw).getTime() : NaN;
          const day = raw ? String(raw).slice(0, 10) : "";
          const tsOk = !Number.isNaN(ts) && ts >= startTs && ts <= endTs;
          const dayOk = day >= startDay && day <= endDay;
          if (!tsOk && !dayOk) return false;
          const t = String(a?.appointmentType ?? a?.appointment_type ?? "").toLowerCase().trim();
          if (at === "treatment") return t === "treatment" || (a?.treatmentId ?? a?.treatment_id) != null;
          return t === "consultation" || (a?.consultationId ?? a?.consultation_id) != null;
        });
        return rows.slice(0, 4000);
      },
    });

    const fastQuery = useQuery({
      queryKey: ["/api/analytics/appointments-custom-list", "fast", { s, e, at, orgId, createRunId }],
      enabled: !!user && enabled && (Array.isArray(baseQuery.data) ? baseQuery.data.length === 0 : true),
      retry: false,
      queryFn: async () => {
        const qs = new URLSearchParams({
          startDate: String(s).slice(0, 10),
          endDate: String(e).slice(0, 10),
          appointmentType: at,
          forChart: "1",
        });
        const url = `/api/analytics/appointments-custom-list?${qs.toString()}`;
        console.log("[CustomTreatmentAnalytics] Fast path request:", {
          url,
          startDateSql: String(s).slice(0, 10),
          endDateSql: String(e).slice(0, 10),
          organizationId: orgId,
        });
        const res = await apiRequest("GET", url);
        const json = await res.json();
        const rows: any[] = Array.isArray(json) ? json : [];
        return rows.map((r) => ({
          id: r.id ?? r.appointment_id ?? undefined,
          appointmentId: r.appointment_id ?? r.appointmentId,
          scheduledAt: r.scheduled_at ?? r.scheduledAt,
          appointmentType: String(r.appointment_type ?? r.appointmentType ?? "").toLowerCase(),
          treatmentId: r.treatment_id ?? r.treatmentId ?? null,
          consultationId: r.consultation_id ?? r.consultationId ?? null,
          title: r.service_name ?? r.title ?? null,
          // title intentionally not used per requirements
          organizationId: r.organization_id ?? r.organizationId ?? orgId,
          status: r.status ?? null,
        }));
      },
    });

    const effectiveRows = useMemo(() => {
      const primary = Array.isArray(baseQuery.data) ? baseQuery.data : [];
      if (primary.length > 0) return primary;
      const fast = Array.isArray(fastQuery.data) ? fastQuery.data : [];
      return fast;
    }, [baseQuery.data, fastQuery.data]);

    const series = useMemo(() => {
      const rows = effectiveRows;
      if (!rows || rows.length === 0) return { labels: [] as string[], datasets: [] as any[], groupBy: "day" as const };
      const start = new Date(s);
      const end = new Date(e);
      const diffMs = end.getTime() - start.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      const groupBy: "hour" | "day" | "month" =
        diffMs <= 2 * oneDay ? "hour" : diffMs <= 62 * oneDay ? "day" : "month";
      const formatKey = (d: Date) => {
        if (groupBy === "hour") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
        if (groupBy === "day") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };
      const labels: string[] = [];
      const cursor = new Date(start);
      while (cursor.getTime() <= end.getTime()) {
        labels.push(formatKey(cursor));
        if (groupBy === "hour") cursor.setHours(cursor.getHours() + 1);
        else if (groupBy === "day") cursor.setDate(cursor.getDate() + 1);
        else cursor.setMonth(cursor.getMonth() + 1);
      }
      type Key = string;
      const name = (a: any): string => {
        if (at === "treatment") {
          const sid = a?.treatmentId ?? a?.treatment_id ?? null;
          const title = String(a?.title ?? "").trim();
          return sid != null ? `Treatment ${sid}` : (title || "Treatment");
        }
        const sid = a?.consultationId ?? a?.consultation_id ?? null;
        const title = String(a?.title ?? "").trim();
        return sid != null ? `Consultation ${sid}` : (title || "Consultation");
      };
      const colorFor = new Map<string, string>();
      const count = new Map<string, number>(); // `${service}__${label}` -> number
      rows.forEach((a) => {
        const raw = a?.scheduledAt ?? a?.scheduled_at ?? null;
        if (!raw) return;
        const d = new Date(raw);
        const lab = formatKey(d);
        const svc = name(a);
        if (!colorFor.has(svc)) colorFor.set(svc, COLORS[colorFor.size % COLORS.length]);
        const key = `${svc}__${lab}`;
        count.set(key, (count.get(key) || 0) + 1);
      });
      const services = Array.from(new Set(rows.map(name)));
      const datasets = services.map((svc) => ({
        id: null,
        label: svc,
        colorCode: colorFor.get(svc),
        data: labels.map((lab) => count.get(`${svc}__${lab}`) || 0),
      }));
      return { labels, datasets, groupBy };
    }, [effectiveRows, s, e, at]);

    useEffect(() => {
      console.log("[CustomTreatmentAnalytics] Series input params:", {
        startDateRaw: s,
        endDateRaw: e,
        startDateSql: formatSqlDate(s),
        endDateSql: formatSqlDate(e),
        appointmentType: at,
        organizationId: orgId,
      });
      const primaryCount = Array.isArray(baseQuery.data) ? baseQuery.data.length : 0;
      const fastCount = Array.isArray(fastQuery.data) ? fastQuery.data.length : 0;
      const effCount = Array.isArray(effectiveRows) ? effectiveRows.length : 0;
      console.log("[CustomTreatmentAnalytics] Rows count:", {
        baseCount: primaryCount,
        fastCount,
        effectiveCount: effCount,
        sample: Array.isArray(effectiveRows) ? effectiveRows.slice(0, 5) : [],
      });
    }, [s, e, at, orgId, baseQuery.data, fastQuery.data, effectiveRows]);

    return {
      rows: effectiveRows,
      series,
      isLoading: !!user && (baseQuery.isLoading || fastQuery.isLoading),
      isFetching: !!user && (baseQuery.isFetching || fastQuery.isFetching),
      error: baseQuery.error || fastQuery.error,
    };
  }
  const { user } = useAuth();
  const { toast } = useToast();

  const formatLocalYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatLocalYMDHM = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    // for <input type="datetime-local"> => "YYYY-MM-DDTHH:mm"
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const [subject, setSubject] = useState("Last 30 days treatments");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatLocalYMDHM(d);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return formatLocalYMDHM(d);
  });
  const [appointmentType, setAppointmentType] = useState<"consultation" | "treatment">("treatment");
  const [graphType, setGraphType] = useState<"line" | "bar" | "pie">("bar");
  const [appliedGraphType, setAppliedGraphType] = useState<"line" | "bar" | "pie">("bar");
  // Keep list collapsed by default; it can be a heavy query and slows "instant chart" perception.
  const [showAppointments, setShowAppointments] = useState(false);
  const [useSampleData, setUseSampleData] = useState(true);

  const [createRunId, setCreateRunId] = useState(0);

  const tenantInfoQuery = useQuery({
    queryKey: ["/api/tenant/info", "custom-treatment-analytics-debug"],
    enabled: !!user,
    retry: 1,
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/tenant/info");
        return await res.json();
      } catch {
        const res = await fetch("/tenant/info", {
      method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Subdomain": getTenantSubdomain(),
          },
      credentials: "include",
      cache: "no-store",
    });
        if (!res.ok) throw new Error(`HTTP ${res.status} for /tenant/info`);
        return await res.json();
      }
    },
  });

  // Fetch latest 10 appointments for this org right after "Create Treatments Analytics"
  const latestAppointmentsQuery = useQuery({
    queryKey: ["/api/appointments", "latest-10", { createRunId }],
    enabled: !!user && createRunId > 0,
    retry: false,
    queryFn: async () => {
      try {
        console.log("[CustomTreatmentAnalytics] Fetch latest appointments: /api/appointments");
        const response = await apiRequest("GET", "/api/appointments");
        const data = await response.json();
        const all = Array.isArray(data) ? data : [];
        console.log("[CustomTreatmentAnalytics] Latest appointments raw count:", all.length, {
          sample: all.slice(0, 3),
        });
        const sorted = [...all].sort((a: any, b: any) => {
          const ta = new Date(a?.scheduledAt ?? a?.scheduled_at ?? 0).getTime();
          const tb = new Date(b?.scheduledAt ?? b?.scheduled_at ?? 0).getTime();
          return tb - ta;
        });
        const top10 = sorted.slice(0, 10);
        console.log("[CustomTreatmentAnalytics] Latest appointments top10 count:", top10.length, {
          sample: top10.slice(0, 3),
        });
        return top10;
    } catch (err: any) {
        console.error("[CustomTreatmentAnalytics] Latest appointments fetch error:", {
        message: err?.message || String(err),
          error: err,
        });
        throw err;
      }
    },
  });

  // Fetch appointments from server by range/type/org to preview DB rows before chart
  const rangeAppointmentsQuery = useQuery({
    queryKey: ["/api/analytics/appointments-range", "range", { startDate, endDate, appointmentType, createRunId }],
    enabled: !!user && createRunId > 0,
    retry: false,
    queryFn: async () => {
      try {
        const orgId =
          (tenantInfoQuery.data as any)?.id ??
          (user as any)?.organizationId ??
          null;
        const bounds = getBoundedIsoRange(startDate, endDate);
        const qs = new URLSearchParams({
          startDate: String(bounds.startIso).slice(0, 10),
          endDate: String(bounds.endIso).slice(0, 10),
          appointmentType,
        });
        const url = `/api/analytics/appointments-range?${qs.toString()}`;
        console.log("[CustomTreatmentAnalytics] Fetch range appointments (server-filtered):", {
          url,
          startDate: String(bounds.startIso).slice(0, 10),
          endDate: String(bounds.endIso).slice(0, 10),
          appointmentType,
          organizationId: orgId,
        });
        const resp = await apiRequest("GET", url);
        const serverRows = await resp.json();
        const allRows: any[] = Array.isArray(serverRows) ? serverRows : [];
        // Admin calendar-style filtering: date-only, no timezone conversion
        const startDay = String(bounds.startIso).slice(0, 10); // YYYY-MM-DD
        const endDay = String(bounds.endIso).slice(0, 10);
        const filteredRows = allRows.filter((a: any) => {
          const raw = a?.scheduledAt ?? a?.scheduled_at ?? null;
          const day = raw ? String(raw).slice(0, 10) : "";
          if (!(day >= startDay && day <= endDay)) return false;
          const apptType = String(a?.appointmentType ?? a?.appointment_type ?? "").toLowerCase().trim();
          if (appointmentType === "treatment") {
            return apptType === "treatment" || (a?.treatmentId ?? a?.treatment_id) != null;
          } else if (appointmentType === "consultation") {
            return apptType === "consultation" || (a?.consultationId ?? a?.consultation_id) != null;
          }
          return true;
        });
        console.log("[CustomTreatmentAnalytics] Range appointments server count (day-only filtered):", filteredRows.length, { sample: filteredRows.slice(0, 5) });
        if (filteredRows.length > 0) {
          return filteredRows.slice(0, 2000);
        }
        // Fallback: pull direct rows from optimized analytics endpoint (forChart=1)
        const bounds2 = getBoundedIsoRange(startDate, endDate);
        const qs2 = new URLSearchParams({
          startDate: String(bounds2.startIso).slice(0, 10),
          endDate: String(bounds2.endIso).slice(0, 10),
          appointmentType,
          forChart: "1",
        });
        const fastUrl = `/api/analytics/appointments-custom-list?${qs2.toString()}`;
        console.warn("[CustomTreatmentAnalytics] Primary /api/appointments yielded 0; trying fast analytics rows:", { fastUrl });
        const fastRes = await apiRequest("GET", fastUrl);
        const fastJson = await fastRes.json();
        const fastRows: any[] = Array.isArray(fastJson) ? fastJson : [];
        console.log("[CustomTreatmentAnalytics] Fast analytics rows count:", fastRows.length, { sample: fastRows.slice(0, 5) });
        // Normalize to /api/appointments-like shape for preview + client chart
        const normalized = fastRows.map((r: any) => ({
          id: r.id ?? r.appointment_id ?? undefined,
          appointmentId: r.appointment_id ?? r.appointmentId,
          scheduledAt: r.scheduled_at ?? r.scheduledAt,
          appointmentType: String(r.appointment_type ?? r.appointmentType ?? "").toLowerCase(),
          treatmentId: r.treatment_id ?? r.treatmentId ?? null,
          consultationId: r.consultation_id ?? r.consultationId ?? null,
          // title intentionally not used per requirements
          organizationId: r.organization_id ?? r.organizationId ?? orgId,
          status: r.status ?? null,
        }));
        return normalized.slice(0, 2000);
      } catch (err: any) {
        console.error("[CustomTreatmentAnalytics] Range appointments fetch error:", {
          message: err?.message || String(err),
          error: err,
        });
        throw err;
      }
    },
  });

  // Small debounce so typing/changing dates doesn't fire multiple requests instantly.
  const [debouncedRange, setDebouncedRange] = useState({ startDate, endDate, appointmentType });
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedRange({ startDate, endDate, appointmentType }), 250);
    return () => window.clearTimeout(t);
  }, [startDate, endDate, appointmentType]);

  const treatmentsReportQuery = useQuery({
    queryKey: [
      "/api/analytics/treatments-report",
      { ...debouncedRange, createRunId },
    ],
    enabled: !!user && !useSampleData && createRunId > 0,
    retry: false,
    queryFn: async () => {
      try {
      const b = getBoundedIsoRange(debouncedRange.startDate, debouncedRange.endDate);
      const qs = new URLSearchParams({
        startDate: String(b.startIso).slice(0, 10),
        endDate: String(b.endIso).slice(0, 10),
          appointmentType,
      });
        const url = `/api/analytics/custom-treatment-graph?${qs.toString()}`;
      console.log("[CustomTreatmentAnalytics] Fetch chart data:", {
        url,
        startDate: String(b.startIso).slice(0, 10),
        endDate: String(b.endIso).slice(0, 10),
          appointmentType,
        });
        const response = await Promise.race<Response>([
          apiRequest("GET", url),
          new Promise<Response>((_, reject) =>
            window.setTimeout(() => reject(new Error("Chart request timeout after 15000ms")), 15000),
          ),
        ]);
        const graph = (await response.json()) as any;
        const labels: string[] = Array.isArray(graph?.labels) ? graph.labels : [];
        const datasets: Array<{ id: number | null; label: string; colorCode?: string; data: number[] }> =
          Array.isArray(graph?.datasets) ? graph.datasets : [];
        console.log("[CustomTreatmentAnalytics] Chart graph summary:", {
          labelsCount: labels.length,
          datasetsCount: datasets.length,
          totalBookingsRaw: graph?.totalBookings,
          groupBy: graph?.groupBy,
          sampleLabels: labels.slice(0, 5),
          sampleDataset0: datasets[0],
        });

        const mapped = datasets.map((ds, idx) => {
          const bookingCount = Array.isArray(ds.data) ? ds.data.reduce((a, b) => a + Number(b || 0), 0) : 0;
            return {
            id: ds.id ?? idx + 1,
            treatmentName: String(ds.label || "Unknown"),
            colorCode: String(ds.colorCode || "#2563eb"),
              bookingCount,
              percentage: 0,
            };
        });
        console.log("[CustomTreatmentAnalytics] Datasets mapped (before filter):", {
          count: mapped.length,
          sample: mapped.slice(0, 3),
        });
        const treatments = mapped
          .filter((t) => t.bookingCount > 0)
          .sort((a, b) => b.bookingCount - a.bookingCount);
        console.log("[CustomTreatmentAnalytics] Treatments after filter (bookingCount>0):", {
          count: treatments.length,
          sample: treatments.slice(0, 3),
        });

        const totalBookings = Number(graph?.totalBookings ?? treatments.reduce((acc, t) => acc + t.bookingCount, 0));
        const treatmentsWithPct = treatments.map((t) => ({
          ...t,
          percentage: totalBookings > 0 ? Number(((t.bookingCount / totalBookings) * 100).toFixed(2)) : 0,
        }));
        const top = treatmentsWithPct[0] || null;

        if (labels.length === 0 || datasets.length === 0) {
          console.warn("[CustomTreatmentAnalytics] Empty chart data from backend", {
            labelsCount: labels.length,
            datasetsCount: datasets.length,
            url,
          });
        }

        return {
          totalBookings,
          topTreatment: top
            ? {
                id: top.id,
                treatmentName: top.treatmentName,
                bookingCount: top.bookingCount,
                percentage: top.percentage,
              }
            : null,
          insightText: top
            ? `Top treatment is ${top.treatmentName} with ${top.percentage}% of total bookings`
            : "No treatment bookings found in selected date range",
          treatments: treatmentsWithPct,
          series: { labels, datasets },
          groupBy: graph?.groupBy,
        };
      } catch (err: any) {
        console.error("[CustomTreatmentAnalytics] Chart fetch error:", {
          message: err?.message || String(err),
          error: err,
        });
        throw err;
      }
    },
  });

  const isLoading = treatmentsReportQuery.isLoading;
  const isFetching = treatmentsReportQuery.isFetching;
  const error = treatmentsReportQuery.error;
  const data = treatmentsReportQuery.data as any;

  useEffect(() => {
    console.log("[CustomTreatmentAnalytics] Chart query state:", {
      isLoading,
      isFetching,
      hasError: !!error,
      startDate,
      endDate,
      appointmentType,
    });
  }, [isLoading, isFetching, error, startDate, endDate, appointmentType]);

  // Intentionally no toast on analytics fetch errors.
  // We render a non-blocking inline message ("No data available right now.") instead.

  const sampleRows: Array<{ scheduled_at: string; service_id: number | null; service_name: string; appointment_count: number; color_code?: string }> =
    useMemo(() => {
      const raw = Array.isArray(latestAppointmentsQuery.data) ? latestAppointmentsQuery.data : [];
      const orgId =
        (tenantInfoQuery.data as any)?.id ??
        (user as any)?.organizationId ??
        null;
      const filtered = raw.filter((a: any) => {
        const rowOrgId = a?.organization_id ?? a?.organizationId ?? null;
        if (orgId != null && Number(rowOrgId) !== Number(orgId)) return false;
        const apptType = String(a?.appointmentType ?? a?.appointment_type ?? "").toLowerCase();
        return appointmentType === "treatment"
          ? apptType === "treatment" || (a?.treatmentId ?? a?.treatment_id) != null
          : apptType === "consultation" || (a?.consultationId ?? a?.consultation_id) != null;
      });

      return filtered.slice(0, 200).map((a: any, idx: number) => {
        const serviceId = appointmentType === "treatment"
          ? (a?.treatmentId ?? a?.treatment_id ?? null)
          : (a?.consultationId ?? a?.consultation_id ?? null);
        const title = String(a?.title ?? "").trim();
        return {
          scheduled_at: String(a?.scheduledAt ?? a?.scheduled_at ?? ""),
          service_id: serviceId,
          service_name:
            appointmentType === "treatment"
              ? (serviceId != null ? `Treatment ${serviceId}` : (title || "Treatment"))
              : (serviceId != null ? `Consultation ${serviceId}` : (title || "Consultation")),
          appointment_count: 1,
          color_code: COLORS[idx % COLORS.length],
        };
      });
    }, [latestAppointmentsQuery.data, appointmentType, tenantInfoQuery.data, user]);

  // Use rebuilt series pipeline
  const rebuilt = useAppointmentsSeries({
    startDate: debouncedRange.startDate,
    endDate: debouncedRange.endDate,
    appointmentType,
    enabled: !useSampleData && createRunId > 0,
  });
  const liveSeries = !useSampleData ? rebuilt.series : null;
  const liveLabels: string[] = Array.isArray(liveSeries?.labels) ? liveSeries.labels : [];
  const liveDatasets: Array<{ label: string; colorCode?: string; data: number[] }> = Array.isArray(liveSeries?.datasets) ? liveSeries.datasets : [];

  // Client-side fallback series computed from DB appointments when backend chart is unavailable
  const clientSeries = useMemo(() => {
    if (useSampleData) return null;
    const rows = Array.isArray((rangeAppointmentsQuery as any)?.data) ? (rangeAppointmentsQuery as any).data : [];
    if (rows.length === 0) return null;
    // Determine groupBy based on range
    const start = new Date(debouncedRange.startDate);
    const end = new Date(debouncedRange.endDate);
    const diffMs = end.getTime() - start.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const groupBy: "hour" | "day" | "month" =
      diffMs <= 2 * oneDay ? "hour" : diffMs <= 62 * oneDay ? "day" : "month";

    const formatKey = (d: Date) => {
      if (groupBy === "hour") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
      if (groupBy === "day") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    // Build label buckets between start and end
    const labels: string[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      labels.push(formatKey(cursor));
      if (groupBy === "hour") cursor.setHours(cursor.getHours() + 1);
      else if (groupBy === "day") cursor.setDate(cursor.getDate() + 1);
      else cursor.setMonth(cursor.getMonth() + 1);
    }

    // Aggregate counts per service per label
    type ServiceKey = string; // use string key to allow fallback to title
    const serviceToName = new Map<ServiceKey, string>();
    const serviceToColor = new Map<ServiceKey, string>();
    const serviceLabelToCount = new Map<string, number>(); // key: `${serviceKey}__${label}`

    rows.forEach((a: any, idx: number) => {
      const tsRaw = a?.scheduledAt ?? a?.scheduled_at ?? null;
      const ts = tsRaw ? new Date(tsRaw) : null;
      if (!ts) return;
      const label = formatKey(ts);
      let serviceKey: ServiceKey;
      if (appointmentType === "treatment") {
        const sid = a?.treatmentId ?? a?.treatment_id ?? null;
        const title = String(a?.title ?? "").trim();
        serviceKey = sid != null ? `Treatment ${sid}` : (title || "Treatment");
      } else {
        const sid = a?.consultationId ?? a?.consultation_id ?? null;
        const title = String(a?.title ?? "").trim();
        serviceKey = sid != null ? `Consultation ${sid}` : (title || "Consultation");
      }
      if (!serviceToName.has(serviceKey)) {
        serviceToName.set(serviceKey, serviceKey);
        serviceToColor.set(serviceKey, COLORS[serviceToName.size % COLORS.length]);
      }
      const key = `${serviceKey}__${label}`;
      serviceLabelToCount.set(key, (serviceLabelToCount.get(key) || 0) + 1);
    });

    const serviceKeys = Array.from(serviceToName.keys());
    const datasets = serviceKeys.map((sk) => {
      const data = labels.map((lab) => serviceLabelToCount.get(`${sk}__${lab}`) || 0);
      return {
        id: null,
        label: serviceToName.get(sk) || "Unknown",
        colorCode: serviceToColor.get(sk),
        data,
      };
    });

    console.warn("[CustomTreatmentAnalytics] Using client-side DB fallback for chart", {
      groupBy,
      labelsCount: labels.length,
      datasetsCount: datasets.length,
      firstLabel: labels[0],
      lastLabel: labels[labels.length - 1],
    });

    return { labels, datasets, groupBy };
  }, [useSampleData, rangeAppointmentsQuery.data, debouncedRange.startDate, debouncedRange.endDate, appointmentType]);

  const effectiveSeries = (!useSampleData && liveDatasets.length > 0 && liveLabels.length > 0)
    ? { labels: liveLabels, datasets: liveDatasets }
    : (!useSampleData && clientSeries && Array.isArray(clientSeries.labels) && Array.isArray(clientSeries.datasets) && clientSeries.labels.length > 0 && clientSeries.datasets.length > 0)
      ? clientSeries
      : null;

  // Chart rows for rendering:
  // - sample mode: use sampleRows (built from DB latest rows)
  // - live mode: build timeseries rows from effectiveSeries (backend or client-side DB fallback)
  const rows: Array<{ scheduled_at: string; service_id: number | null; service_name: string; appointment_count: number; color_code?: string }> =
    useSampleData
      ? sampleRows
      : (effectiveSeries && effectiveSeries.labels.length > 0 && effectiveSeries.datasets.length > 0
          ? effectiveSeries.labels.flatMap((label, idx) =>
              effectiveSeries.datasets.map((ds: any, j: number) => ({
                scheduled_at: label,
                service_id: (ds.id as number | null) ?? (j + 1),
                service_name: String(ds.label || "Unknown"),
                appointment_count: Number((ds.data || [])[idx] || 0),
                color_code: ds.colorCode,
              })),
            )
          : []);
  // Chart rows come from DB unless user explicitly enables sample mode.
  const chartRows = rows;
  useEffect(() => {
    if (!useSampleData) {
      // Suppress "empty" warning while queries are still loading/fetching
      const chartLoading =
        (treatmentsReportQuery as any)?.isLoading === true ||
        (treatmentsReportQuery as any)?.isFetching === true;
      const rangeLoading =
        (rangeAppointmentsQuery as any)?.isLoading === true ||
        (rangeAppointmentsQuery as any)?.isFetching === true;
      if (chartLoading || rangeLoading) {
        return;
      }
      if ((liveLabels.length === 0 || liveDatasets.length === 0)) {
        console.warn("[CustomTreatmentAnalytics] Live chart rows empty due to empty labels/datasets", {
          liveLabelsCount: liveLabels.length,
          liveDatasetsCount: liveDatasets.length,
        });
      } else if (Array.isArray(chartRows) && chartRows.length === 0) {
        console.warn("[CustomTreatmentAnalytics] Live chart rows computed empty despite labels/datasets present", {
          liveLabelsCount: liveLabels.length,
          liveDatasetsCount: liveDatasets.length,
        });
      } else {
        // Debug logging removed
      }
    } else {
      // Debug logging removed
    }
  }, [useSampleData, liveLabels, liveDatasets, chartRows]);

  const appointmentsQuery = useQuery({
    queryKey: [
      "/api/analytics/appointments-custom-list",
      { startDate, endDate, showAppointments, appointmentType },
    ],
    enabled: !!user && showAppointments && !useSampleData && createRunId > 0,
    retry: false,
    queryFn: async () => {
      const startDayOnly = String(startDate).slice(0, 10);
      const endDayOnly = String(endDate).slice(0, 10);
      const qs = new URLSearchParams({
        startDate: startDayOnly,
        endDate: endDayOnly,
        appointmentType,
      });
      const url = `/api/analytics/appointments-custom-list?${qs.toString()}`;
      const response = await apiRequest("GET", url);
      const json = await response.json();
      console.log("[CustomTreatmentAnalytics] Appointments list received:", {
        rows: Array.isArray(json) ? json.length : "not-array",
        sample: Array.isArray(json) ? json.slice(0, 5) : json,
      });
      return json;
    },
  });

  useEffect(() => {
    console.log("[CustomTreatmentAnalytics] List query state:", {
      enabled: !!user && showAppointments,
      isLoading: appointmentsQuery.isLoading,
      isFetching: appointmentsQuery.isFetching,
      hasError: !!appointmentsQuery.error,
      startDate,
      endDate,
      appointmentType,
    });
  }, [
    user,
    showAppointments,
    appointmentsQuery.isLoading,
    appointmentsQuery.isFetching,
    appointmentsQuery.error,
    startDate,
    endDate,
    appointmentType,
  ]);

  const appointmentRows: Array<{
    id: number;
    appointment_id: string;
    patient_id: number;
    provider_id: number;
    status: string;
    duration: number;
    appointment_type: string;
    scheduled_at: string;
    service_name: string;
  }> = Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : [];
  const activeGraphType = useSampleData ? graphType : appliedGraphType;

  const services = Array.from(new Set(chartRows.map((r) => r.service_name))).sort();
  const timeLabels = Array.from(new Set(chartRows.map((r) => r.scheduled_at))).sort();

  const byDate = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    timeLabels.forEach((t) => map.set(t, { scheduled_at: t }));
    chartRows.forEach((r) => {
      const entry = map.get(r.scheduled_at) || { scheduled_at: r.scheduled_at };
      entry[r.service_name] = (entry[r.service_name] || 0) + (r.appointment_count || 0);
      map.set(r.scheduled_at, entry);
    });
    return Array.from(map.values()).sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
  }, [chartRows, timeLabels]);

  const pieData = useMemo(() => {
    const totals = new Map<string, number>();
    chartRows.forEach((r) => {
      totals.set(r.service_name, (totals.get(r.service_name) || 0) + (r.appointment_count || 0));
    });
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [chartRows]);

  const topServices = useMemo(() => {
    const totals = new Map<string, number>();
    chartRows.forEach((r) =>
      totals.set(r.service_name, (totals.get(r.service_name) || 0) + (r.appointment_count || 0)),
    );
    return Array.from(totals.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [chartRows]);

  const totalBookings = useSampleData
    ? chartRows.reduce((acc, r) => acc + (r.appointment_count || 0), 0)
    : Number(data?.totalBookings || 0);
  const topTreatmentInsight = useSampleData
    ? (topServices[0]
        ? `Top treatment is ${topServices[0].name} with ${totalBookings > 0 ? ((topServices[0].count / totalBookings) * 100).toFixed(2) : "0"}% of total bookings`
        : "No treatment bookings found in selected date range")
    : (data?.insightText || "No treatment bookings found in selected date range");
  const treatmentResultBadges = useMemo(
    () =>
      topServices.slice(0, 12).map((s) => {
        const pct = totalBookings > 0 ? ((s.count / totalBookings) * 100).toFixed(2) : "0.00";
        return `${s.name}: ${s.count} (${pct}%)`;
      }),
    [topServices, totalBookings],
  );

  const analyticsDebug = useMemo(() => {
    const reason =
      useSampleData
        ? "Sample data is enabled, live DB queries are skipped."
        : createRunId <= 0
          ? "Live query has not started. Click Generate Analytics."
          : error
            ? `Chart query failed: ${String((error as any)?.message || error)}`
            : rows.length === 0
              ? "Query succeeded but returned 0 treatment rows for this date range/type."
              : null;
    return {
      dateRange: `${startDate} -> ${endDate}`,
      tenantSubdomain: String((tenantInfoQuery.data as any)?.subdomain || getTenantSubdomain() || "unknown"),
      organizationId: (tenantInfoQuery.data as any)?.id ?? (user as any)?.organizationId ?? null,
      tenantInfoError: tenantInfoQuery.error ? String((tenantInfoQuery.error as any)?.message || tenantInfoQuery.error) : null,
      createRunId,
      useSampleData,
      rowsCount: rows.length,
      appointmentRowsCount: appointmentRows.length,
      totalBookings,
      topTreatmentNames: topServices.map((s) => `${s.name} (${s.count})`).slice(0, 8),
      latestAppointmentsCount: Array.isArray(latestAppointmentsQuery.data) ? latestAppointmentsQuery.data.length : 0,
      latestAppointmentsSample: Array.isArray(latestAppointmentsQuery.data)
        ? latestAppointmentsQuery.data.slice(0, 10).map((a: any) => ({
            id: a.id,
            appointment_id: a.appointment_id ?? a.appointmentId,
            scheduled_at: a.scheduled_at ?? a.scheduledAt,
            appointment_type: a.appointment_type ?? a.appointmentType,
            treatment_id: a.treatment_id ?? a.treatmentId,
            status: a.status,
          }))
        : [],
      latestAppointmentsIsLoading: latestAppointmentsQuery.isLoading,
      latestAppointmentsIsFetching: latestAppointmentsQuery.isFetching,
      latestAppointmentsError: latestAppointmentsQuery.error ? String((latestAppointmentsQuery.error as any)?.message || latestAppointmentsQuery.error) : null,
      reason,
    };
  }, [
    useSampleData,
    createRunId,
    error,
    rows.length,
    appointmentRows.length,
    totalBookings,
    topServices,
    startDate,
    endDate,
    tenantInfoQuery.data,
    tenantInfoQuery.error,
    latestAppointmentsQuery.data,
    latestAppointmentsQuery.isLoading,
    latestAppointmentsQuery.isFetching,
    latestAppointmentsQuery.error,
  ]);

  return (
    <>
      {/* Quick date filter card (mirrors appointments page date picker behavior) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Calendar & Scheduling</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {startDate && endDate && String(startDate).slice(0, 10) === String(endDate).slice(0, 10)
                      ? String(startDate).slice(0, 10)
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const dd = String(d.getDate()).padStart(2, "0");
                      // Match appointments page: date-only with no timezone conversion (full-day bounds)
                      setStartDate(`${yyyy}-${mm}-${dd}T00:00`);
                      setEndDate(`${yyyy}-${mm}-${dd}T23:59`);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Custom treatment analytics</span>
          <Badge variant="secondary" className="text-xs">
            {appointmentType.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Subject / Title</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {String(startDate || "").slice(0, 10) || "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setStartDate(`${yyyy}-${mm}-${dd}T00:00`);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {String(endDate || "").slice(0, 10) || "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setEndDate(`${yyyy}-${mm}-${dd}T23:59`);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Appointment Type</Label>
            <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="treatment">Treatment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label>Graph Type</Label>
            <Select value={graphType} onValueChange={(v) => setGraphType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select graph type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line (Trends)</SelectItem>
                <SelectItem value="bar">Bar (Comparisons)</SelectItem>
                <SelectItem value="pie">Pie (Proportions)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label>Report</Label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{subject || "Untitled"}</div>
              <div>
                {startDate} → {endDate} • {rows.length} rows • {services.length} services
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Total bookings: {totalBookings}
              </div>
              <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                {topTreatmentInsight}
              </div>
              <div className="mt-2">
                <Button
                  type="button"
                  onClick={() => {
                    const orgId =
                      (tenantInfoQuery.data as any)?.id ??
                      (user as any)?.organizationId ??
                      null;
                    console.log("[CustomTreatmentAnalytics] Create clicked", {
                      startDate,
                      endDate,
                      appointmentType,
                      startDateSql: formatSqlDate(startDate),
                      endDateSql: formatSqlDate(endDate),
                      organizationId: orgId,
                    });
                    setAppliedGraphType(graphType);
                    setUseSampleData(false);
                    setShowAppointments(true);
                    setCreateRunId((v) => v + 1);
                  }}
                  disabled={isLoading || isFetching}
                >
                  {isLoading || isFetching ? "Creating..." : "Create Treatments Analytics"}
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={useSampleData}
                  onCheckedChange={(v) => setUseSampleData(Boolean(v))}
                  id="use-sample-data"
                />
                <Label htmlFor="use-sample-data" className="text-sm font-normal">
                  Use sample data (show graph instantly)
                </Label>
              </div>
              <button
                type="button"
                className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                onClick={() => setShowAppointments((v) => !v)}
              >
                {showAppointments ? "Hide appointments" : "See appointments"}
              </button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white dark:bg-slate-900">
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="font-semibold">Analytics Debug</div>
            <div>Date range: {analyticsDebug.dateRange}</div>
            <div>Tenant: {analyticsDebug.tenantSubdomain}</div>
            <div>Organization ID: {analyticsDebug.organizationId ?? "unknown"}</div>
            {analyticsDebug.tenantInfoError && (
              <div>Tenant info error: {analyticsDebug.tenantInfoError}</div>
            )}
            <div>Appointments in response: {analyticsDebug.appointmentRowsCount}</div>
            <div>Treatments in chart: {analyticsDebug.rowsCount}</div>
            <div>Total bookings: {analyticsDebug.totalBookings}</div>
            <div>Latest appointments (top 10): {analyticsDebug.latestAppointmentsCount}</div>
            <div className="text-[11px]">
              Latest query:{" "}
              {analyticsDebug.latestAppointmentsIsLoading || analyticsDebug.latestAppointmentsIsFetching ? "loading..." : "idle"}
              {analyticsDebug.latestAppointmentsError ? ` • error: ${analyticsDebug.latestAppointmentsError}` : ""}
            </div>
            {analyticsDebug.latestAppointmentsSample.length > 0 && (
              <div className="mt-1">
                <div className="font-semibold">Latest 10 sample:</div>
                <div className="text-[11px] leading-4">
                  {analyticsDebug.latestAppointmentsSample.map((a: any) => (
                    <div key={a.id}>
                      {String(a.scheduled_at).replace("T", " ").slice(0, 16)} • {a.appointment_type || "unknown"} • treatment_id: {a.treatment_id ?? "null"} • {a.status || "unknown"}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analyticsDebug.latestAppointmentsSample.length === 0 && !analyticsDebug.latestAppointmentsIsLoading && !analyticsDebug.latestAppointmentsIsFetching && !analyticsDebug.latestAppointmentsError && (
              <div className="text-[11px] mt-1">
                No latest appointments to display. Make sure you clicked <b>Create Treatments Analytics</b> and <b>Use sample data</b> is unchecked.
              </div>
            )}
            <div>
              Treatment names: {analyticsDebug.topTreatmentNames.length > 0 ? analyticsDebug.topTreatmentNames.join(", ") : "none"}
            </div>
            {analyticsDebug.reason && (
              <div className="mt-1 font-medium">
                Why "No data available right now": {analyticsDebug.reason}
              </div>
            )}
          </div>
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Query Result Badges (before graph)
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                Range: {startDate} to {endDate}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Type: {appointmentType}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Org: {analyticsDebug.organizationId ?? "unknown"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Appointments: {appointmentRows.length}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Treatments: {rows.length}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                DB preview: {Array.isArray((rebuilt as any)?.rows) ? (rebuilt as any).rows.length : 0}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Total bookings: {totalBookings}
              </Badge>
              {(isLoading || isFetching) && (
                <Badge variant="outline" className="text-xs">
                  Loading query...
                </Badge>
              )}
              {error && (
                <Badge variant="destructive" className="text-xs">
                  Query failed
                </Badge>
              )}
            </div>
            {treatmentResultBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {treatmentResultBadges.map((label, idx) => (
                  <Badge key={`${label}-${idx}`} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            <div className="text-xs font-semibold mb-1">DB Preview (from /api/appointments, client-filtered by range & type)</div>
            {Array.isArray((rebuilt as any)?.rows) && (rebuilt as any).rows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {(rebuilt as any).rows.slice(0, 8).map((a: any, i: number) => (
                  <div key={`${a.id || i}`} className="truncate">
                    {String(a?.scheduled_at ?? a?.scheduledAt ?? "").replace("T", " ").slice(0, 16)} • {String(a?.appointment_type ?? a?.appointmentType ?? "unknown")}
                    {" "}| treatment_id: {a?.treatment_id ?? a?.treatmentId ?? "null"}
                    {" "}| consultation_id: {a?.consultation_id ?? a?.consultationId ?? "null"}
                    {" "}| status: {a?.status ?? "unknown"}
                  </div>
                ))}
              </div>
            ) : (
              <div>No rows found for the selected date range and type.</div>
            )}
          </div>
          {Array.isArray((rebuilt as any)?.rows) && (rebuilt as any).rows.length > 0 && (
            <div className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-semibold mb-2">Raw rows fetched (first 20)</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">
                Columns shown: id, organization_id, appointment_id, appointment_type, scheduled_at, title, treatment_id, consultation_id, status, provider_id, patient_id
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b dark:border-slate-700">
                      <th className="p-2">id</th>
                      <th className="p-2">organization_id</th>
                      <th className="p-2">appointment_id</th>
                      <th className="p-2">appointment_type</th>
                      <th className="p-2">scheduled_at</th>
                      <th className="p-2">treatment_id</th>
                      <th className="p-2">consultation_id</th>
                      <th className="p-2">status</th>
                      <th className="p-2">provider_id</th>
                      <th className="p-2">patient_id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rebuilt as any).rows.slice(0, 20).map((a: any, i: number) => (
                      <tr key={`${a.id || i}`} className="border-b last:border-b-0 dark:border-slate-800">
                        <td className="p-2">{a?.id ?? ""}</td>
                        <td className="p-2">{a?.organization_id ?? a?.organizationId ?? ""}</td>
                        <td className="p-2">{a?.appointment_id ?? a?.appointmentId ?? ""}</td>
                        <td className="p-2">{a?.appointment_type ?? a?.appointmentType ?? ""}</td>
                        <td className="p-2">{String(a?.scheduled_at ?? a?.scheduledAt ?? "").replace("T", " ").slice(0, 19)}</td>
                        <td className="p-2">{a?.treatment_id ?? a?.treatmentId ?? ""}</td>
                        <td className="p-2">{a?.consultation_id ?? a?.consultationId ?? ""}</td>
                        <td className="p-2">{a?.status ?? ""}</td>
                        <td className="p-2">{a?.provider_id ?? a?.providerId ?? ""}</td>
                        <td className="p-2">{a?.patient_id ?? a?.patientId ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Appointment Volume</div>
          <div className="text-sm text-gray-500 mb-4">
            View appointment trends from the appointments table
          </div>
          <div className="h-[380px] w-full">
          {useSampleData ? (
            activeGraphType === "pie" ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={140}
                    label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : activeGraphType === "bar" ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
                <BarChart data={byDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scheduled_at" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {services.map((s, idx) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={COLORS[idx % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
                <LineChart data={byDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scheduled_at" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {services.map((s, idx) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={COLORS[idx % COLORS.length]} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )
          ) : (isLoading || isFetching) && rows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading chart…
            </div>
          ) : (!useSampleData && Array.isArray((rebuilt as any)?.rows) && (rebuilt as any).rows.length === 0) ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              No appointments found in selected date range.
            </div>
          ) : rows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              {error ? "No data available right now." : "No data in appointments."}
            </div>
          ) : activeGraphType === "pie" ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={140}
                  label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : activeGraphType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
              <BarChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scheduled_at" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {services.map((s, idx) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={rows.find((r: any) => r.service_name === s)?.color_code || COLORS[idx % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
              <LineChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scheduled_at" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {services.map((s, idx) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[idx % COLORS.length]} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
          </div>
        </div>

        {rows.length > 0 && (
          <div className="border rounded-lg p-4 bg-white dark:bg-slate-900">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Top {appointmentType === "treatment" ? "treatments" : "consultations"} (last 30 days)
            </div>
            <div className="flex flex-wrap gap-2">
              {topServices.map((s, idx) => (
                <Badge key={`${s.name}-${idx}`} variant="secondary" className="text-xs">
                  {s.name} ({s.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {showAppointments && (
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                Appointments in range ({appointmentRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsQuery.error ? (
                <div className="text-sm text-gray-500">
                  No data available right now.
                </div>
              ) : appointmentsQuery.isLoading || appointmentsQuery.isFetching ? (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading appointments…
                </div>
              ) : appointmentRows.length === 0 ? (
                <div className="text-sm text-gray-500">No appointments in selected date range.</div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b">
                      <tr className="text-left">
                        <th className="p-2">Scheduled</th>
                        <th className="p-2">Appointment ID</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Service</th>
                        <th className="p-2">Duration</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointmentRows.map((a) => (
                        <tr key={a.id} className="border-b last:border-b-0">
                          <td className="p-2 whitespace-nowrap">
                            {String(a.scheduled_at).replace("T", " ").slice(0, 16)}
                          </td>
                          <td className="p-2 whitespace-nowrap">{a.appointment_id}</td>
                          <td className="p-2">{a.appointment_type}</td>
                          <td className="p-2">{a.service_name}</td>
                          <td className="p-2 whitespace-nowrap">{a.duration} min</td>
                          <td className="p-2">{a.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
    </>
  );
}
const CustomAnalyticsDashboard: React.FC<{ currencySymbol: string; user: any }> = ({ currencySymbol, user }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Default to 'all' to show all appointments
  const [showManageDialog, setShowManageDialog] = useState(false);

  // Fetch analytics subjects
  const { data: subjects = [], refetch: refetchSubjects } = useQuery({
    queryKey: ['custom-analytics-subjects'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/analytics/custom-subjects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user
  });

  // Fetch analytics for selected subject
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['custom-analytics', selectedSubjectId, statusFilter],
    queryFn: async () => {
      if (!selectedSubjectId) {
        console.log('[CUSTOM-ANALYTICS] No subject selected');
        return null;
      }
      const token = localStorage.getItem('auth_token');
      const url = `/api/analytics/custom-subjects/${selectedSubjectId}/analytics?status=${statusFilter}`;
      console.log('[CUSTOM-ANALYTICS] Fetching analytics for subject:', selectedSubjectId, 'status:', statusFilter);
      console.log('[CUSTOM-ANALYTICS] URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[CUSTOM-ANALYTICS] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CUSTOM-ANALYTICS] Error response:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('[CUSTOM-ANALYTICS] Analytics data received:', {
        totalTreatments: data.totalTreatments,
        totalRevenue: data.totalRevenue,
        totalPatients: data.totalPatients,
        monthlyTrendsCount: data.monthlyTrends?.length || 0,
        treatmentDistributionCount: data.treatmentDistribution?.length || 0
      });
      return data;
    },
    enabled: !!user && !!selectedSubjectId
  });

  // Auto-select first subject if available
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const selectedSubject = subjects.find((s: any) => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* Header with Subject Selection */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <CardTitle>Custom Treatment Analytics</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select 
                value={selectedSubjectId?.toString() || undefined} 
                onValueChange={(value) => setSelectedSubjectId(parseInt(value))}
                disabled={subjects.length === 0}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder={subjects.length === 0 ? "No subjects available" : "Select analytics subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.subjectTitle} ({subject.treatmentCount} treatments)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setShowManageDialog(true)} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Subjects
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No Analytics Subjects Created
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
              Create an analytics subject to start tracking custom treatment groups. Click the button below to get started.
            </p>
            <Button onClick={() => setShowManageDialog(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Analytics Subject
            </Button>
            <p className="text-xs text-gray-400 mt-4">
              Or use the "Manage Subjects" button in the header above
            </p>
          </CardContent>
        </Card>
      ) : !selectedSubjectId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No Analytics Subject Selected
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
              Please select an analytics subject from the dropdown above, or create a new one.
            </p>
            <Button onClick={() => setShowManageDialog(true)} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Subjects
            </Button>
          </CardContent>
        </Card>
      ) : analyticsLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : analyticsError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              Error Loading Analytics
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {analyticsError instanceof Error ? analyticsError.message : 'Failed to load analytics data'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Check browser console for details
            </p>
          </CardContent>
        </Card>
      ) : analyticsData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Treatments</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalTreatments.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(analyticsData.totalRevenue)}</p>
                  </div>
                  <PoundSterling className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Patients</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalPatients.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedSubject?.subjectTitle || 'N/A'}</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends Chart */}
          {analyticsData.monthlyTrends && analyticsData.monthlyTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Treatment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month_label" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="total_treatments" 
                      stroke="#0ea5e9" 
                      strokeWidth={2}
                      name="Treatments"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Treatment Distribution Chart */}
          {analyticsData.treatmentDistribution && analyticsData.treatmentDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Treatment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={analyticsData.treatmentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.treatmentDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No Data Available
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              No treatment data found for the selected subject and status filter.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Manage Subjects Dialog */}
      <ManageAnalyticsSubjectsDialog 
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        onSubjectCreated={refetchSubjects}
        onSubjectUpdated={refetchSubjects}
        onSubjectDeleted={refetchSubjects}
      />
    </div>
  );
};

// Manage Analytics Subjects Dialog Component
function ManageAnalyticsSubjectsDialog({ 
  open, 
  onOpenChange, 
  onSubjectCreated,
  onSubjectUpdated,
  onSubjectDeleted
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubjectCreated: () => void;
  onSubjectUpdated: () => void;
  onSubjectDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [subjectTitle, setSubjectTitle] = useState('');
  const [treatmentText, setTreatmentText] = useState('');
  const [consultationText, setConsultationText] = useState('');
  const [appointmentType, setAppointmentType] = useState<"consultation" | "treatment" | "">("");
  const [loading, setLoading] = useState(false);
  const [selectedTreatmentNames, setSelectedTreatmentNames] = useState<string[]>([]);
  const [selectedConsultationNames, setSelectedConsultationNames] = useState<string[]>([]);
  const [treatmentIdsMap, setTreatmentIdsMap] = useState<Map<string, number>>(new Map());
  const [consultationIdsMap, setConsultationIdsMap] = useState<Map<string, number>>(new Map());

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSubjectTitle('');
      setTreatmentText('');
      setConsultationText('');
      setAppointmentType("");
      setEditingSubject(null);
      setSelectedTreatmentNames([]);
      setSelectedConsultationNames([]);
      setTreatmentIdsMap(new Map());
      setConsultationIdsMap(new Map());
    }
  }, [open]);

  // Function to create a new treatment and return its ID
  const createNewTreatment = async (treatmentName: string): Promise<number | null> => {
    if (!treatmentName.trim()) {
      return null;
    }

    try {
      console.log('[MANAGE-SUBJECTS] Creating treatment:', treatmentName.trim());
      
      // Use direct fetch instead of apiRequest to have more control
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const payload = {
        name: treatmentName.trim(),
        colorCode: '#2563eb', // Default color
      };
      
      console.log('[MANAGE-SUBJECTS] Calling POST /api/treatments-info with payload:', payload);
      console.log('[MANAGE-SUBJECTS] Headers:', {
        'Authorization': `Bearer ${token ? '***' : 'missing'}`,
        'X-Tenant-Subdomain': getTenantSubdomain(),
        'Content-Type': 'application/json'
      });
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[MANAGE-SUBJECTS] Request timeout - aborting');
        controller.abort();
      }, 15000); // 15 second timeout
      
      let response;
      try {
        console.log('[MANAGE-SUBJECTS] Starting fetch request...');
        console.log('[MANAGE-SUBJECTS] URL:', '/api/treatments-info');
        console.log('[MANAGE-SUBJECTS] Tenant subdomain:', getTenantSubdomain());
        const startTime = Date.now();
        
        response = await fetch('/api/treatments-info', {
          method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        const duration = Date.now() - startTime;
        console.log(`[MANAGE-SUBJECTS] Fetch completed in ${duration}ms`);
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[MANAGE-SUBJECTS] Fetch error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        if (error.name === 'AbortError') {
          throw new Error('Request timeout: The server took too long to respond. Please check your server logs.');
        }
        throw error;
      }

      console.log('[MANAGE-SUBJECTS] Treatment creation response received!');
      console.log('[MANAGE-SUBJECTS] Response status:', response.status, 'OK:', response.ok);
      console.log('[MANAGE-SUBJECTS] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        console.error('[MANAGE-SUBJECTS] Treatment creation failed:', errorData);
        throw new Error(errorData.error || errorData.message || `Failed to create treatment: ${response.status}`);
      }

      // apiRequest throws if response is not ok, so if we get here, response is ok
      const newTreatment = await response.json();
      console.log('[MANAGE-SUBJECTS] Created new treatment response:', newTreatment);
      
      // Invalidate and refetch treatments
      await queryClient.invalidateQueries({ queryKey: ['/api/analytics/available-treatments'] });
      
      // Return the treatment ID - handle different response structures
      let treatmentId: number | null = null;
      if (newTreatment.id) {
        treatmentId = newTreatment.id;
      } else if (newTreatment.data?.id) {
        treatmentId = newTreatment.data.id;
      } else if (newTreatment.data && typeof newTreatment.data === 'number') {
        treatmentId = newTreatment.data;
      } else if (Array.isArray(newTreatment) && newTreatment.length > 0 && newTreatment[0].id) {
        treatmentId = newTreatment[0].id;
      }
      
      console.log('[MANAGE-SUBJECTS] Extracted treatment ID:', treatmentId);
      
      if (treatmentId) {
        return treatmentId;
      } else {
        console.error('[MANAGE-SUBJECTS] Could not extract treatment ID from response:', newTreatment);
        throw new Error('Treatment created but ID not found in response');
      }
    } catch (error) {
      console.error('[MANAGE-SUBJECTS] Error creating treatment:', error);
      throw error;
    }
  };

  // Function to create a new consultation and return its ID
  const createNewConsultation = async (serviceName: string): Promise<number | null> => {
    if (!serviceName.trim()) {
      return null;
    }

    try {
      console.log('[MANAGE-SUBJECTS] Creating consultation:', serviceName.trim());
      
      // Use direct fetch instead of apiRequest to have more control
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const payload = {
        serviceName: serviceName.trim(),
        basePrice: '0',
        currency: 'GBP',
        duration: 30, // Default duration
      };
      
      console.log('[MANAGE-SUBJECTS] Calling POST /api/pricing/doctors-fees with payload:', payload);
      
      const response = await fetch('/api/pricing/doctors-fees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      console.log('[MANAGE-SUBJECTS] Consultation creation response received, status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        console.error('[MANAGE-SUBJECTS] Consultation creation failed:', errorData);
        throw new Error(errorData.error || errorData.message || `Failed to create consultation: ${response.status}`);
      }
      
      // apiRequest throws if response is not ok, so if we get here, response is ok
      const newConsultation = await response.json();
      console.log('[MANAGE-SUBJECTS] Created new consultation response:', newConsultation);
      
      // Invalidate and refetch consultations
      await queryClient.invalidateQueries({ queryKey: ['/api/pricing/doctors-fees'] });
      
      // Return the consultation ID - handle different response structures
      let consultationId: number | null = null;
      if (newConsultation.id) {
        consultationId = newConsultation.id;
      } else if (newConsultation.data?.id) {
        consultationId = newConsultation.data.id;
      } else if (newConsultation.data && typeof newConsultation.data === 'number') {
        consultationId = newConsultation.data;
      } else if (Array.isArray(newConsultation) && newConsultation.length > 0 && newConsultation[0].id) {
        consultationId = newConsultation[0].id;
      }
      
      console.log('[MANAGE-SUBJECTS] Extracted consultation ID:', consultationId);
      
      if (consultationId) {
        return consultationId;
      } else {
        console.error('[MANAGE-SUBJECTS] Could not extract consultation ID from response:', newConsultation);
        throw new Error('Consultation created but ID not found in response');
      }
    } catch (error) {
      console.error('[MANAGE-SUBJECTS] Error creating consultation:', error);
      throw error;
    }
  };

  // Fetch subjects separately
  const { refetch: refetchSubjects } = useQuery({
    queryKey: ['manage-analytics-subjects', open],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/analytics/custom-subjects');
      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : []);
      return data;
    },
    enabled: open,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch treatments from treatments_info table (NOT from treatments/pricing table)
  // This endpoint specifically fetches from treatments_info table for analytics subjects
  const { data: availableTreatments = [], isLoading: isLoadingTreatments, error: treatmentsError } = useQuery({
    queryKey: ['/api/analytics/available-treatments'],
    queryFn: async () => {
      try {
        // This endpoint fetches from treatments_info table (not /api/pricing/treatments)
        const response = await apiRequest('GET', '/api/analytics/available-treatments');
        const data = await response.json();
        const treatments = Array.isArray(data) ? data : [];
        console.log('[MANAGE-SUBJECTS] Fetched treatments from treatments_info table:', treatments.length);
        if (treatments.length > 0) {
          console.log('[MANAGE-SUBJECTS] Sample treatment from treatments_info:', {
            id: treatments[0].id,
            name: treatments[0].name,
            colorCode: treatments[0].colorCode
          });
        }
        return treatments;
      } catch (error: any) {
        console.error('[MANAGE-SUBJECTS] Failed to fetch treatments from treatments_info:', error);
        return [];
      }
    },
    enabled: open,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Fetch consultation services (like appointment components)
  const { data: consultationServices = [], isLoading: isLoadingConsultations, error: consultationsError } = useQuery({
    queryKey: ['/api/pricing/doctors-fees'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/pricing/doctors-fees');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[MANAGE-SUBJECTS] Consultation services fetch error:', error);
        return [];
      }
    },
    enabled: open,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Function to add a treatment to the selected list
  const addTreatment = async () => {
    console.log('[MANAGE-SUBJECTS] addTreatment called', {
      treatmentText: treatmentText.trim(),
      treatmentTextLength: treatmentText.trim().length,
      alreadyAdded: selectedTreatmentNames.includes(treatmentText.trim()),
      loading
    });

    if (!treatmentText.trim()) {
      alert('Please enter a treatment name');
      return;
    }

    // Check if already added
    if (selectedTreatmentNames.includes(treatmentText.trim())) {
      alert('This treatment is already added');
      return;
    }

    // Prevent multiple simultaneous calls
    if (loading) {
      console.log('[MANAGE-SUBJECTS] Already processing, skipping...');
      return;
    }

    try {
      setLoading(true);
      console.log('[MANAGE-SUBJECTS] Creating treatment:', treatmentText.trim());
      const treatmentId = await createNewTreatment(treatmentText.trim());
      console.log('[MANAGE-SUBJECTS] Treatment created with ID:', treatmentId);
      
      if (treatmentId) {
        const treatmentName = treatmentText.trim();
        setSelectedTreatmentNames([...selectedTreatmentNames, treatmentName]);
        setTreatmentIdsMap(new Map(treatmentIdsMap.set(treatmentName, treatmentId)));
        setTreatmentText(''); // Clear input for next addition
        console.log('[MANAGE-SUBJECTS] Treatment added successfully:', treatmentName, 'ID:', treatmentId);
      } else {
        console.error('[MANAGE-SUBJECTS] Treatment ID is null or undefined');
        alert('Failed to create treatment: No ID returned');
      }
    } catch (error) {
      console.error('[MANAGE-SUBJECTS] Error adding treatment:', error);
      alert('Failed to add treatment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Function to add a consultation to the selected list
  const addConsultation = async () => {
    if (!consultationText.trim()) {
      alert('Please enter a consultation name');
      return;
    }

    // Check if already added
    if (selectedConsultationNames.includes(consultationText.trim())) {
      alert('This consultation is already added');
      return;
    }

    try {
      const consultationId = await createNewConsultation(consultationText.trim());
      if (consultationId) {
        const consultationName = consultationText.trim();
        setSelectedConsultationNames([...selectedConsultationNames, consultationName]);
        setConsultationIdsMap(new Map(consultationIdsMap.set(consultationName, consultationId)));
        setConsultationText(''); // Clear input for next addition
        console.log('[MANAGE-SUBJECTS] Consultation added:', consultationName, 'ID:', consultationId);
      } else {
        alert('Failed to create consultation');
      }
    } catch (error) {
      console.error('[MANAGE-SUBJECTS] Error adding consultation:', error);
      alert('Failed to add consultation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Function to remove a treatment from the selected list
  const removeTreatment = (treatmentName: string) => {
    setSelectedTreatmentNames(selectedTreatmentNames.filter(name => name !== treatmentName));
    const newMap = new Map(treatmentIdsMap);
    newMap.delete(treatmentName);
    setTreatmentIdsMap(newMap);
  };

  // Function to remove a consultation from the selected list
  const removeConsultation = (consultationName: string) => {
    setSelectedConsultationNames(selectedConsultationNames.filter(name => name !== consultationName));
    const newMap = new Map(consultationIdsMap);
    newMap.delete(consultationName);
    setConsultationIdsMap(newMap);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const handleCreate = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[MANAGE-SUBJECTS] handleCreate called', {
      subjectTitle,
      appointmentType,
      treatmentText,
      consultationText,
      loading
    });
    
    if (loading) {
      console.log('[MANAGE-SUBJECTS] Already loading, ignoring click');
      return;
    }

    if (!subjectTitle.trim()) {
      alert('Please enter a subject title');
      return;
    }

    if (!appointmentType) {
      alert('Please select an appointment type (Treatment or Consultation)');
      return;
    }

    if (appointmentType === "treatment" && selectedTreatmentNames.length === 0) {
      alert('Please add at least one treatment. Type a treatment name and click "Add Treatment"');
      return;
    }

    if (appointmentType === "consultation" && selectedConsultationNames.length === 0) {
      alert('Please add at least one consultation. Type a consultation name and click "Add Consultation"');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      let treatmentIdsToSend: number[] = [];

      if (appointmentType === "treatment") {
        // Get all treatment IDs from the map
        treatmentIdsToSend = Array.from(treatmentIdsMap.values());
        console.log('[MANAGE-SUBJECTS] Sending treatment IDs:', treatmentIdsToSend);
      } else if (appointmentType === "consultation") {
        // For consultations, use consultation IDs as treatment IDs
        // (Backend currently only supports treatmentIds)
        treatmentIdsToSend = Array.from(consultationIdsMap.values());
        console.log('[MANAGE-SUBJECTS] Sending consultation IDs as treatment IDs:', treatmentIdsToSend);
      }
      
      console.log('[MANAGE-SUBJECTS] Creating subject with:', {
        subjectTitle: subjectTitle.trim(),
        treatmentIds: treatmentIdsToSend
      });

      const response = await fetch('/api/analytics/custom-subjects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectTitle: subjectTitle.trim(),
          treatmentIds: treatmentIdsToSend
        })
      });

      console.log('[MANAGE-SUBJECTS] Create response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[MANAGE-SUBJECTS] Subject created successfully:', data);
        setSubjectTitle('');
        setTreatmentText('');
        setConsultationText('');
        setAppointmentType("");
        setSelectedTreatmentNames([]);
        setSelectedConsultationNames([]);
        setTreatmentIdsMap(new Map());
        setConsultationIdsMap(new Map());
        refetchSubjects();
        onSubjectCreated();
        alert('Analytics subject created successfully!');
      } else {
        const error = await response.json();
        console.error('[MANAGE-SUBJECTS] Create failed:', error);
        alert(error.error || 'Failed to create analytics subject');
      }
    } catch (error) {
      console.error('[MANAGE-SUBJECTS] Error creating subject:', error);
      alert('Failed to create analytics subject: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject: any) => {
    setEditingSubject(subject);
    setSubjectTitle(subject.subjectTitle);
    // Fetch treatments for this subject
    fetch(`/api/analytics/custom-subjects/${subject.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'X-Tenant-Subdomain': getTenantSubdomain(),
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        // For now, assume all are treatments (backend only supports treatments)
        // Set the first treatment name as the text input value
        if (data.treatments && data.treatments.length > 0) {
          setTreatmentText(data.treatments[0].name || '');
          setAppointmentType("treatment");
        } else {
          setTreatmentText('');
          setAppointmentType("treatment");
        }
        setConsultationText('');
      });
  };

  const handleUpdate = async () => {
    if (!editingSubject || !subjectTitle.trim()) {
      alert('Please enter a subject title');
      return;
    }

    if (!appointmentType) {
      alert('Please select an appointment type (Treatment or Consultation)');
      return;
    }

    if (appointmentType === "treatment" && !treatmentText.trim()) {
      alert('Please enter a treatment name');
      return;
    }

    if (appointmentType === "consultation" && !consultationText.trim()) {
      alert('Please enter a consultation name');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      let treatmentIdsToSend: number[] = [];

      if (appointmentType === "treatment") {
        // Create or find treatment
        const treatmentId = await createNewTreatment(treatmentText.trim());
        if (treatmentId) {
          treatmentIdsToSend = [treatmentId];
        } else {
          alert('Failed to create treatment');
          setLoading(false);
          return;
        }
      } else if (appointmentType === "consultation") {
        // Create consultation
        const consultationId = await createNewConsultation(consultationText.trim());
        if (consultationId) {
          treatmentIdsToSend = [consultationId];
        } else {
          alert('Failed to create consultation');
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch(`/api/analytics/custom-subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectTitle: subjectTitle.trim(),
          treatmentIds: treatmentIdsToSend
        })
      });

      if (response.ok) {
        setEditingSubject(null);
        setSubjectTitle('');
        setTreatmentText('');
        setConsultationText('');
        setAppointmentType("");
        refetchSubjects();
        onSubjectUpdated();
        alert('Analytics subject updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update analytics subject');
      }
    } catch (error) {
      console.error('Error updating subject:', error);
      alert('Failed to update analytics subject: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subjectId: number) => {
    if (!confirm('Are you sure you want to delete this analytics subject?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/analytics/custom-subjects/${subjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain(),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        refetchSubjects();
        onSubjectDeleted();
        alert('Analytics subject deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete analytics subject');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete analytics subject');
    }
  };

  const handleCancel = () => {
    setEditingSubject(null);
    setSubjectTitle('');
    setTreatmentText('');
    setConsultationText('');
    setAppointmentType("");
    setSelectedTreatmentNames([]);
    setSelectedConsultationNames([]);
    setTreatmentIdsMap(new Map());
    setConsultationIdsMap(new Map());
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      modal={true}
    >
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus to avoid aria-hidden warnings
          // Focus will be managed by the first interactive element
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Manage Analytics Subjects</DialogTitle>
          <DialogDescription>
            Create custom analytics subjects to track specific treatments or consultations with graphical insights.
            <br /><br />
            <strong>Example:</strong> Create "Halo Treatments" and add multiple treatments like "Halo Laser", "Halo Facial", and "Halo Follow-up Sessions" to view combined analytics for all Halo-related procedures.
            <br /><br />
            <strong>How to use:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Enter a subject title (e.g., "Halo Treatments")</li>
              <li>Select appointment type (Treatment or Consultation)</li>
              <li>Type a treatment/consultation name and click "Add"</li>
              <li>Repeat step 3 to add more items</li>
              <li>Click "Create Subject" to save</li>
            </ol>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create/Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle>{editingSubject ? 'Edit' : 'Create'} Analytics Subject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subject-title">Subject Title</Label>
                <input
                  id="subject-title"
                  type="text"
                  value={subjectTitle}
                  onChange={(e) => setSubjectTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                  placeholder="e.g., Halo Treatments"
                />
              </div>

              {/* Appointment Type */}
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Appointment Type</Label>
                <select
                  value={appointmentType}
                  onChange={(e) => {
                    setAppointmentType(e.target.value as "consultation" | "treatment" | "");
                    setTreatmentText('');
                    setConsultationText('');
                    setSelectedTreatmentNames([]);
                    setSelectedConsultationNames([]);
                    setTreatmentIdsMap(new Map());
                    setConsultationIdsMap(new Map());
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select type</option>
                  <option value="treatment">Treatment</option>
                  <option value="consultation">Consultation</option>
                </select>
                  </div>

              {/* Add Treatments/Consultations */}
              {appointmentType === "treatment" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Treatment Name</Label>
                      <input
                        type="text"
                        value={treatmentText}
                        onChange={(e) => setTreatmentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTreatment();
                          }
                        }}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                        placeholder="Type treatment name (e.g., Halo Laser)"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[MANAGE-SUBJECTS] Add Treatment button clicked', {
                            treatmentText: treatmentText.trim(),
                            loading,
                            disabled: !treatmentText.trim() || loading
                          });
                          addTreatment();
                        }}
                        disabled={!treatmentText.trim() || loading}
                        variant="outline"
                        className="h-10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Treatment
                      </Button>
                    </div>
                  </div>
                  
                  {/* Selected Treatments as badges */}
                  {selectedTreatmentNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 min-h-[60px]">
                      {selectedTreatmentNames.map((treatmentName) => (
                        <Badge
                          key={treatmentName}
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1 text-sm"
                        >
                          <span className="font-medium">{treatmentName}</span>
                          <button
                            type="button"
                            onClick={() => removeTreatment(treatmentName)}
                            className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-0.5"
                            aria-label={`Remove ${treatmentName}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {selectedTreatmentNames.length === 0 && (
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 min-h-[60px] flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        No treatments added yet. Type a treatment name above and click "Add Treatment" to add it.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {appointmentType === "consultation" && (
                          <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Consultation Name</Label>
                      <input
                        type="text"
                        value={consultationText}
                        onChange={(e) => setConsultationText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addConsultation();
                          }
                        }}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                        placeholder="Type consultation name (e.g., General Consultation)"
                      />
                                </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addConsultation}
                        disabled={!consultationText.trim() || loading}
                        variant="outline"
                        className="h-10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Consultation
                      </Button>
                              </div>
                  </div>
                  
                  {/* Selected Consultations as badges */}
                  {selectedConsultationNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 min-h-[60px]">
                      {selectedConsultationNames.map((consultationName) => (
                        <Badge
                          key={consultationName}
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1 text-sm"
                        >
                          <span className="font-medium">{consultationName}</span>
                          <button
                            type="button"
                            onClick={() => removeConsultation(consultationName)}
                            className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-0.5"
                            aria-label={`Remove ${consultationName}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                            ))}
                          </div>
                  )}
                  
                  {selectedConsultationNames.length === 0 && (
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 min-h-[60px] flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        No consultations added yet. Type a consultation name above and click "Add Consultation" to add it.
                        </p>
                      </div>
                    )}
                  </div>
                )}

              <div className="flex gap-2">
                {editingSubject ? (
                  <>
                    <Button onClick={handleUpdate} disabled={loading}>
                      Update Subject
                    </Button>
                    <Button onClick={handleCancel} variant="outline">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={(e) => {
                      console.log('[MANAGE-SUBJECTS] Button clicked');
                      handleCreate(e);
                    }} 
                    disabled={loading}
                    type="button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Subject
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing Subjects List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Analytics Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-gray-500 text-sm">No analytics subjects created yet</p>
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                      <div>
                        <p className="font-medium">{subject.subjectTitle}</p>
                        <p className="text-sm text-gray-500">{subject.treatmentCount} treatments</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(subject)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(subject.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Treatment Analytics Dashboard Component
function TreatmentAnalyticsDashboard({ 
  treatmentSessions,
  treatmentPopularity,
  monthlyTrends,
  revenuePerTreatment,
  categoryDistribution,
  treatmentSummary,
  currencySymbol,
  dailyData,
  monthlyData,
  yearlyData,
  timeframe,
  setTimeframe,
  daysFilter,
  setDaysFilter,
  monthsFilter,
  setMonthsFilter,
  yearsFilter,
  setYearsFilter,
  statusFilter,
  setStatusFilter,
  paymentStatusFilter,
  setPaymentStatusFilter,
  detailedTreatments,
  user
}: { 
  treatmentSessions: any[];
  treatmentPopularity: any[];
  monthlyTrends: any[];
  revenuePerTreatment: any[];
  categoryDistribution: any[];
  treatmentSummary: any;
  currencySymbol: string;
  dailyData: any[];
  monthlyData: any[];
  yearlyData: any[];
  detailedTreatments: any[];
  timeframe: 'daily' | 'monthly' | 'yearly';
  setTimeframe: (value: 'daily' | 'monthly' | 'yearly') => void;
  daysFilter: number;
  setDaysFilter: (value: number) => void;
  monthsFilter: number;
  setMonthsFilter: (value: number) => void;
  yearsFilter: number;
  setYearsFilter: (value: number) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (value: string) => void;
  user: any;
}) {
  const { currencyCode } = useCurrency();
  
  // Process data for analytics
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencyCode || 'GBP'
    }).format(amount || 0);
  };

  // 1. Treatment Popularity Analytics - already formatted from API
  const popularityData = React.useMemo(() => {
    return treatmentPopularity.map((item: any) => ({
      name: item.name,
      sessions: parseInt(item.total_sessions) || 0
    }));
  }, [treatmentPopularity]);

  // 2. Monthly Treatment Trends - process from API data
  const monthlyTrendsData = React.useMemo(() => {
    // Group sessions by month and treatment
    const monthlyData: Record<string, Record<string, number>> = {};
    treatmentSessions.forEach((session: any) => {
      if (session.session_date) {
        try {
          const date = new Date(session.session_date);
          const monthKey = format(date, 'MMM yyyy');
          const treatmentName = session.treatment_name || 'Unknown';
          if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
          monthlyData[monthKey][treatmentName] = (monthlyData[monthKey][treatmentName] || 0) + 1;
        } catch (e) {
          // Skip invalid dates
        }
      }
    });
    
    const allTreatments = new Set<string>();
    Object.values(monthlyData).forEach(month => {
      Object.keys(month).forEach(treatment => allTreatments.add(treatment));
    });
    
    const months = Object.keys(monthlyData).sort();
    return months.map(month => {
      const data: any = { month };
      Array.from(allTreatments).slice(0, 5).forEach(treatment => {
        data[treatment] = monthlyData[month][treatment] || 0;
      });
      return data;
    });
  }, [treatmentSessions]);

  // 3. Revenue Per Treatment - already formatted from API
  const revenueData = React.useMemo(() => {
    const mapped = revenuePerTreatment
      .map((item: any) => ({
        name: item.name || 'Unknown Treatment',
      revenue: parseFloat(item.revenue) || 0
      }))
      .filter(item => item.revenue > 0); // Only show treatments with revenue > 0
    console.log('[REVENUE-DATA] Processed:', mapped.length, 'treatments with revenue from', revenuePerTreatment.length, 'total');
    return mapped;
  }, [revenuePerTreatment]);

  // 4. Patient Treatment Distribution - calculate from sessions
  const treatmentDistribution = React.useMemo(() => {
    const treatmentCounts: Record<string, number> = {};
    const total = treatmentSessions.length;
    treatmentSessions.forEach((session: any) => {
      const treatmentName = session.treatment_name || 'Unknown';
      treatmentCounts[treatmentName] = (treatmentCounts[treatmentName] || 0) + 1;
    });
    const result = Object.entries(treatmentCounts)
      .map(([name, count]) => ({ 
        name, 
        value: count, 
        percentage: total > 0 ? Math.round((count / total) * 100) : 0 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    console.log('[TREATMENT-DISTRIBUTION] Processed:', result.length, 'treatments from', total, 'sessions', result);
    return result;
  }, [treatmentSessions]);

  // 5. Repeat Treatment Analytics
  const repeatTreatmentRates = React.useMemo(() => {
    const patientTreatments: Record<number, Record<string, number>> = {};
    treatmentSessions.forEach((session: any) => {
      const patientId = session.patient_id;
      if (patientId) {
        const treatmentName = session.treatment_name || 'Unknown';
        if (!patientTreatments[patientId]) patientTreatments[patientId] = {};
        patientTreatments[patientId][treatmentName] = (patientTreatments[patientId][treatmentName] || 0) + 1;
      }
    });
    
    const treatmentStats: Record<string, { total: number; repeat: number }> = {};
    Object.values(patientTreatments).forEach(patientData => {
      Object.entries(patientData).forEach(([treatment, count]) => {
        if (!treatmentStats[treatment]) treatmentStats[treatment] = { total: 0, repeat: 0 };
        treatmentStats[treatment].total += count;
        if (count > 1) treatmentStats[treatment].repeat += 1;
      });
    });
    
    return Object.entries(treatmentStats)
      .map(([name, stats]) => ({
        name,
        repeatRate: stats.total > 0 ? Math.round((stats.repeat / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.repeatRate - a.repeatRate)
      .slice(0, 10);
  }, [treatmentSessions]);

  // 6. Practitioner Performance
  const practitionerPerformance = React.useMemo(() => {
    const practitionerCounts: Record<number, number> = {};
    treatmentSessions.forEach((session: any) => {
      const practitionerId = session.practitioner_id || session.provider_id;
      if (practitionerId) {
        practitionerCounts[practitionerId] = (practitionerCounts[practitionerId] || 0) + 1;
      }
    });
    return Object.entries(practitionerCounts)
      .map(([id, count]) => ({ name: `Practitioner ${id}`, treatments: count }))
      .sort((a, b) => b.treatments - a.treatments)
      .slice(0, 10);
  }, [treatmentSessions]);

  // 7. Treatment Growth Rate
  const treatmentGrowthRates = React.useMemo(() => {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const getMonthKey = (date: Date) => format(date, 'MMM yyyy');
    const currentMonthKey = getMonthKey(currentMonth);
    const lastMonthKey = getMonthKey(lastMonth);
    
    const currentMonthCounts: Record<string, number> = {};
    const lastMonthCounts: Record<string, number> = {};
    
    treatmentSessions.forEach((session: any) => {
      if (session.session_date) {
        try {
          const date = new Date(session.session_date);
          if (!isNaN(date.getTime())) {
            const monthKey = getMonthKey(date);
            const treatmentName = session.treatment_name || 'Unknown';
            
            if (monthKey === currentMonthKey) {
              currentMonthCounts[treatmentName] = (currentMonthCounts[treatmentName] || 0) + 1;
            } else if (monthKey === lastMonthKey) {
              lastMonthCounts[treatmentName] = (lastMonthCounts[treatmentName] || 0) + 1;
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });
    
    const allTreatments = new Set([...Object.keys(currentMonthCounts), ...Object.keys(lastMonthCounts)]);
    return Array.from(allTreatments)
      .map(treatment => {
        const current = currentMonthCounts[treatment] || 0;
        const last = lastMonthCounts[treatment] || 0;
        const growthRate = last > 0 ? Math.round(((current - last) / last) * 100) : (current > 0 ? 100 : 0);
        return { name: treatment, growthRate, current, last };
      })
      .filter(item => item.current > 0 || item.last > 0)
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 10);
  }, [treatmentSessions]);

  // 8. Category-Level Analytics - already formatted from API
  const categoryAnalytics = React.useMemo(() => {
    return categoryDistribution.map((item: any) => ({
      name: item.category_name || 'Uncategorized',
      count: parseInt(item.total) || 0
    }));
  }, [categoryDistribution]);

  // Summary from API
  const totalPatients = parseInt(treatmentSummary.total_patients) || 0;
  const totalTreatments = parseInt(treatmentSummary.total_treatments) || treatmentSessions.length;
  const revenueThisMonth = parseFloat(treatmentSummary.revenue_this_month) || 0;
  const mostPopularTreatment = treatmentSummary.most_popular_treatment || popularityData[0]?.name || 'N/A';

  // Get current timeframe data
  const currentTimeframeData = React.useMemo(() => {
    if (timeframe === 'daily') return dailyData;
    if (timeframe === 'monthly') return monthlyData;
    return yearlyData;
  }, [timeframe, dailyData, monthlyData, yearlyData]);

  // Calculate totals for current timeframe
  const timeframeTotals = React.useMemo(() => {
    const data = currentTimeframeData;
    return {
      totalTreatments: data.reduce((sum: number, item: any) => sum + (parseInt(item.total_treatments) || 0), 0),
      totalPatients: data.reduce((sum: number, item: any) => sum + (parseInt(item.total_patients) || 0), 0),
      totalPractitioners: data.reduce((sum: number, item: any) => sum + (parseInt(item.total_practitioners) || 0), 0),
      totalRevenue: data.reduce((sum: number, item: any) => sum + (parseFloat(item.revenue) || 0), 0)
    };
  }, [currentTimeframeData]);

  // Diagnostic query to check what data exists
  const { data: diagnosticData } = useQuery({
    queryKey: ['treatment-sessions-debug'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch("/api/analytics/treatment-sessions-debug", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch diagnostic data:", error);
        return null;
      }
    },
    enabled: !!user && treatmentSessions.length === 0,
    staleTime: 0
  });

  // Show message if no data (but only after we've checked)
  // Don't show immediately - let other queries load first
  // Check if we have meaningful data (not just empty objects/arrays)
  const hasData = treatmentSessions.length > 0 || 
                  treatmentPopularity.length > 0 || 
                  monthlyTrends.length > 0 ||
                  (treatmentSummary && (parseInt(treatmentSummary.total_treatments) > 0 || parseInt(treatmentSummary.total_patients) > 0));
  
  const showNoData = !hasData;

  return (
    <div className="space-y-6">
      {/* Show no data message if no data available */}
      {showNoData && (
        <Card>
          <CardContent className="p-6 text-center">
            <Activity className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No Treatment Session Data Available
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
              To see treatment analytics, you need to have completed appointments. Treatment information is retrieved from the appointments table (treatment_id field).
            </p>
            
            {diagnosticData && (
              <div className="text-left max-w-2xl mx-auto bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Database Status:</p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Total Appointments: {diagnosticData.summary?.total_appointments || 0}</p>
                  <p>Completed Appointments: {diagnosticData.summary?.completed_count || 0}</p>
                  <p>With Treatment ID: {diagnosticData.summary?.with_treatment_id || 0}</p>
                  <p>Completed + Treatment ID: {diagnosticData.summary?.completed_with_treatment_id || 0}</p>
                  <p>Completed + Any Info: {diagnosticData.summary?.completed_with_any_info || 0}</p>
                </div>
                {diagnosticData.samples && diagnosticData.samples.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Sample Appointments:</p>
                    <div className="space-y-1">
                      {diagnosticData.samples.slice(0, 3).map((apt: any, idx: number) => (
                        <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                          ID: {apt.id}, Status: {apt.status}, Treatment ID: {apt.treatment_id || 'null'}, Title: {apt.title || 'null'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-left max-w-md mx-auto bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Requirements:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Appointments must have status "completed"</li>
                <li>Treatment information is retrieved from appointments.treatment_id field (joins with treatments table)</li>
                <li>At least one completed appointment is needed to generate analytics</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Only show if we have data */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPatients}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Treatments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTreatments.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue This Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(revenueThisMonth)}</p>
                </div>
                <PoundSterling className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Most Popular Treatment</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{mostPopularTreatment}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {popularityData[0]?.sessions || 0} sessions
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeframe Selection and Analytics - Always visible */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Treatment Analytics by Timeframe</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {timeframe === 'daily' && (
                <Select value={daysFilter.toString()} onValueChange={(value) => setDaysFilter(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Today</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {timeframe === 'monthly' && (
                <Select value={monthsFilter.toString()} onValueChange={(value) => setMonthsFilter(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                    <SelectItem value="36">36 months</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {timeframe === 'yearly' && (
                <Select value={yearsFilter.toString()} onValueChange={(value) => setYearsFilter(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 years</SelectItem>
                    <SelectItem value="5">5 years</SelectItem>
                    <SelectItem value="10">10 years</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentStatusFilter} onValueChange={(value) => setPaymentStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="unpaid">Unpaid Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeframe Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Treatments ({timeframe})</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{timeframeTotals.totalTreatments.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Patients ({timeframe})</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{timeframeTotals.totalPatients.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Practitioners ({timeframe})</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{timeframeTotals.totalPractitioners.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Revenue ({timeframe})</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(timeframeTotals.totalRevenue)}</p>
            </div>
          </div>

          {/* Chart */}
          {currentTimeframeData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-sm">No {timeframe} data available</p>
                <p className="text-xs mt-1">Try adjusting the time period or status filter</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={currentTimeframeData.map((item: any) => {
              if (timeframe === 'daily' && item.date) {
                // Format date for display
                try {
                  const date = new Date(item.date);
                  return { ...item, date: format(date, 'MMM dd, yyyy'), dateSort: item.date };
                } catch {
                  return { ...item, dateSort: item.date };
                }
              }
              return item;
            }).sort((a: any, b: any) => {
              // Sort by date for proper line chart display
              if (timeframe === 'daily') {
                return new Date(a.dateSort || a.date).getTime() - new Date(b.dateSort || b.date).getTime();
                } else if (timeframe === 'monthly') {
                  return (a.month || '').localeCompare(b.month || '');
                } else if (timeframe === 'yearly') {
                  return (a.year || '').localeCompare(b.year || '');
              }
              return 0;
            })}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={timeframe === 'daily' ? 'date' : timeframe === 'monthly' ? 'month_label' : 'year'} 
                angle={timeframe === 'daily' ? -45 : -45} 
                textAnchor="end" 
                height={timeframe === 'daily' ? 120 : 100} 
              />
              <YAxis />
              <Tooltip 
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isDark = document.documentElement.classList.contains('dark');
                    return (
                      <div style={{
                        backgroundColor: isDark ? '#1e293b' : 'white',
                        border: isDark ? '1px solid #475569' : '1px solid white',
                        borderRadius: '4px',
                        padding: '8px',
                        boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <p style={{ color: isDark ? '#e2e8f0' : '#000', margin: '0 0 4px 0', fontWeight: 'bold' }}>
                          {timeframe === 'daily' ? data.date : timeframe === 'monthly' ? data.month_label : data.year}
                        </p>
                        <p style={{ color: isDark ? '#e2e8f0' : '#000', margin: '2px 0' }}>
                            Treatments: {data.total_treatments || 0}
                        </p>
                        <p style={{ color: isDark ? '#e2e8f0' : '#000', margin: '2px 0' }}>
                            Patients: {data.total_patients || 0}
                        </p>
                        {data.revenue && (
                          <p style={{ color: isDark ? '#e2e8f0' : '#000', margin: '2px 0' }}>
                            Revenue: {formatCurrency(parseFloat(data.revenue) || 0)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
                <Legend />
              <Line 
                type="monotone" 
                dataKey="total_treatments" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                dot={{ fill: '#0ea5e9', r: 4 }}
                name="Treatments"
              />
            </LineChart>
          </ResponsiveContainer>
          )}

          {/* Detailed Treatments List */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Treatments ({timeframe}) - Detailed View</h3>
            {detailedTreatments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No treatment data available for the selected timeframe</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">Date</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">Treatment Name</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium">Count</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium">Patients</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right text-sm font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedTreatments.map((item: any, index: number) => {
                      // Format date based on timeframe
                      let displayDate = item.date;
                      if (timeframe === 'daily' && item.date) {
                        try {
                          const date = new Date(item.date);
                          displayDate = format(date, 'MMM dd, yyyy');
                        } catch {
                          displayDate = item.date;
                        }
                      } else if (timeframe === 'monthly' && item.date_label) {
                        displayDate = item.date_label;
                      } else if (timeframe === 'yearly') {
                        displayDate = item.date;
                      }
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">{displayDate}</td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">{item.treatment_name || 'Unknown Treatment'}</td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">{item.treatment_count || 0}</td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">{item.patient_count || 0}</td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right text-sm">{formatCurrency(parseFloat(item.revenue) || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-800 font-semibold">
                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm" colSpan={2}>Total</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">
                        {detailedTreatments.reduce((sum: number, item: any) => sum + (parseInt(item.treatment_count) || 0), 0)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">
                        {detailedTreatments.reduce((sum: number, item: any) => sum + (parseInt(item.patient_count) || 0), 0)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-right text-sm">
                        {formatCurrency(detailedTreatments.reduce((sum: number, item: any) => sum + (parseFloat(item.revenue) || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Treatment Popularity Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Popularity Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {popularityData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-sm">No treatment popularity data available</p>
                <p className="text-xs mt-1">Data is calculated from treatment sessions</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={popularityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Treatment Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Treatment Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrendsData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-sm">No monthly trends data available</p>
                <p className="text-xs mt-1">Data is calculated from treatment sessions</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
                <Legend />
              {monthlyTrendsData.length > 0 && Array.from(new Set(monthlyTrendsData.flatMap(d => Object.keys(d).filter(k => k !== 'month')))).slice(0, 5).map((treatment, index) => (
                <Line 
                  key={treatment} 
                  type="monotone" 
                  dataKey={treatment} 
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                    name={treatment}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Per Treatment */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Per Treatment</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p className="text-sm">No revenue data available</p>
                  <p className="text-xs mt-1">Revenue is calculated from paid invoices</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip content={<CustomTooltip />} formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Patient Treatment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Treatment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {treatmentDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p className="text-sm">No treatment distribution data available</p>
                  <p className="text-xs mt-1">Data is calculated from treatment sessions</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={treatmentDistribution.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {treatmentDistribution.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repeat Treatment Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Repeat Treatment Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {repeatTreatmentRates.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="font-medium">{item.name}</span>
                <Badge variant={item.repeatRate >= 50 ? "default" : "secondary"}>
                  {item.repeatRate}% repeat rate
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practitioner Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Practitioner Performance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={practitionerPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="treatments" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Treatment Growth Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Treatment Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {treatmentGrowthRates.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <p className="text-xs text-gray-500">
                      {item.current} this month vs {item.last} last month
                    </p>
                  </div>
                  <Badge variant={item.growthRate >= 0 ? "default" : "destructive"}>
                    {item.growthRate >= 0 ? '+' : ''}{item.growthRate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category-Level Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Category-Level Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryAnalytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Appointment Analytics */}
      <AppointmentAnalyticsSection user={user} />
    </div>
  );
}

// Appointment Analytics Section Component
function AppointmentAnalyticsSection({ user }: { user: any }) {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [practitionerFilter, setPractitionerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'type' | 'day' | 'month'>('type');

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (dateRange) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Default to last 30 days if custom dates not set
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
        }
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0] + 'T00:00:00',
      endDate: endDate.toISOString().split('T')[0] + 'T23:59:59'
    };
  };

  // Fetch appointment analytics data
  const { data: appointmentAnalytics = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['/api/analytics/appointments', dateRange, customStartDate, customEndDate, practitionerFilter, statusFilter, groupBy],
    queryFn: async () => {
      try {
        const { startDate, endDate } = getDateRange();
        const params = new URLSearchParams({
          startDate,
          endDate,
          groupBy,
          status: statusFilter
        });
        if (practitionerFilter !== 'all') {
          params.append('practitionerId', practitionerFilter);
        }
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/appointments?${params.toString()}`;
        console.log('[APPOINTMENT-ANALYTICS] Fetching:', { url, dateRange, startDate, endDate, practitionerFilter, statusFilter, groupBy });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[APPOINTMENT-ANALYTICS] Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[APPOINTMENT-ANALYTICS] Failed:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[APPOINTMENT-ANALYTICS] Data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[APPOINTMENT-ANALYTICS] Sample data:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[APPOINTMENT-ANALYTICS] Error:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000
  });

  // Fetch practitioners for filter
  const { data: medicalStaffData } = useQuery({
    queryKey: ['/api/medical-staff'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/medical-staff', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) return { staff: [] };
        const data = await response.json();
        return data?.staff || [];
      } catch (error) {
        console.error('Error fetching medical staff:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // Process data for different chart types
  const appointmentByType = React.useMemo(() => {
    if (groupBy !== 'type') return [];
    return appointmentAnalytics.map((item: any) => ({
      name: item.appointment_type || 'Unknown',
      value: item.total_appointments || 0,
      patients: item.total_patients || 0,
      practitioners: item.total_practitioners || 0
    }));
  }, [appointmentAnalytics, groupBy]);

  const appointmentTrends = React.useMemo(() => {
    if (groupBy === 'type') return [];
    return appointmentAnalytics.map((item: any) => ({
      date: item.date || item.month || item.month_label || 'Unknown',
      [item.appointment_type || 'Unknown']: item.total_appointments || 0,
      total: item.total_appointments || 0
    }));
  }, [appointmentAnalytics, groupBy]);

  // Get unique appointment types for line chart
  const appointmentTypes = React.useMemo(() => {
    const types = new Set<string>();
    appointmentAnalytics.forEach((item: any) => {
      if (item.appointment_type) types.add(item.appointment_type);
    });
    return Array.from(types);
  }, [appointmentAnalytics]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  const totalAppointments = appointmentAnalytics.reduce((sum: number, item: any) => sum + (item.total_appointments || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle>Appointment Analytics</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Selector */}
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range Inputs */}
            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                />
              </>
            )}

            {/* Group By Selector */}
            <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type">By Type</SelectItem>
                <SelectItem value="day">By Day</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>

            {/* Practitioner Filter */}
            <Select value={practitionerFilter} onValueChange={(value) => setPractitionerFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Practitioners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Practitioners</SelectItem>
                {Array.isArray(medicalStaffData) && medicalStaffData.map((staff: any) => (
                  <SelectItem key={staff.id} value={staff.id.toString()}>
                    {staff.firstName} {staff.lastName} ({staff.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Appointments</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalAppointments.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Appointment Types</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{appointmentTypes.length}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Patients</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {new Set(appointmentAnalytics.map((item: any) => item.total_patients).filter(Boolean)).size || 
               appointmentAnalytics.reduce((sum: number, item: any) => sum + (item.total_patients || 0), 0)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Practitioners</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {new Set(appointmentAnalytics.map((item: any) => item.total_practitioners).filter(Boolean)).size || 
               appointmentAnalytics.reduce((sum: number, item: any) => sum + (item.total_practitioners || 0), 0)}
            </p>
          </div>
        </div>

        {isLoadingAppointments ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : appointmentAnalytics.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-sm">No appointment data available</p>
              <p className="text-xs mt-1">Try adjusting the date range or filters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bar Chart - Appointments by Type */}
            {groupBy === 'type' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={appointmentByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="value" fill="#0088FE" name="Appointments" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Line Chart - Appointment Trends */}
            {groupBy !== 'type' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appointment Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={appointmentTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {appointmentTypes.map((type, index) => (
                        <Line
                          key={type}
                          type="monotone"
                          dataKey={type}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          name={type}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Pie Chart - Distribution */}
            {groupBy === 'type' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Appointment Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={appointmentByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {appointmentByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Appointment Type Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Appointment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800">
                            <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">Type</th>
                            <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium">Count</th>
                            <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium">Patients</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointmentByType.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">{item.name}</td>
                              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">{item.value}</td>
                              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">{item.patients}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 dark:bg-gray-800 font-semibold">
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">Total</td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">{totalAppointments}</td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center text-sm">
                              {appointmentByType.reduce((sum, item) => sum + item.patients, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const { canView } = useRolePermissions();
  const [showAppointmentsDialog, setShowAppointmentsDialog] = useState(false);
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    dateRange: '30',
    department: 'all',
    provider: 'all',
    patientType: 'all'
  });

  // ── All Appointments tab ──────────────────────────────────────────────────
  const [apptPage, setApptPage] = useState(1);
  const [apptStatus, setApptStatus] = useState("all");
  const [apptSearchInput, setApptSearchInput] = useState("");
  const [apptSearch, setApptSearch] = useState("");
  const [apptStartDate, setApptStartDate] = useState("");
  const [apptEndDate, setApptEndDate] = useState("");

  const apptQuery = useQuery({
    queryKey: ["/api/analytics/appointments-paginated", apptPage, apptStatus, apptSearch, apptStartDate, apptEndDate],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(apptPage), limit: "15" });
      if (apptStatus && apptStatus !== "all") params.set("status", apptStatus);
      if (apptSearch) params.set("search", apptSearch);
      if (apptStartDate) params.set("startDate", apptStartDate);
      if (apptEndDate) params.set("endDate", apptEndDate);
      const r = await apiRequest("GET", `/api/analytics/appointments-paginated?${params.toString()}`);
      return r.json() as Promise<{ appointments: any[]; total: number; page: number; totalPages: number; limit: number }>;
    },
  });

  // ── Treatment Dashboard tab ───────────────────────────────────────────────
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const ninetyDaysAgo = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const [tdStartDate, setTdStartDate] = useState(ninetyDaysAgo);
  const [tdEndDate, setTdEndDate] = useState(todayIso);
  const [tdType, setTdType] = useState('all');
  const [tdSearch, setTdSearch] = useState('');
  const [tdSearchInput, setTdSearchInput] = useState('');
  const [tdApplied, setTdApplied] = useState({ startDate: ninetyDaysAgo, endDate: todayIso, type: 'all', search: '' });
  const [tdShowError, setTdShowError] = useState(false);
  const [tdChartTitle, setTdChartTitle] = useState('');
  const [tdChartType, setTdChartType] = useState<'bar' | 'pie' | 'line' | 'area'>('bar');
  const [tdApptPage, setTdApptPage] = useState(1);
  useEffect(() => { setTdApptPage(1); }, [tdApplied]);

  const tdQuery = useQuery({
    queryKey: ['/api/analytics/treatment-dashboard', tdApplied],
    enabled: !!user,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const p = new URLSearchParams({ startDate: tdApplied.startDate, endDate: tdApplied.endDate });
      if (tdApplied.type && tdApplied.type !== 'all') p.set('type', tdApplied.type);
      if (tdApplied.search) p.set('search', tdApplied.search);
      const r = await apiRequest('GET', `/api/analytics/treatment-dashboard?${p.toString()}`);
      return r.json() as Promise<{
        summary: { total: number; avgPerDay: number; activeDays: number; peakDay: string | null; peakDayCount: number; mostPopular: { name: string; count: number } | null; leastPopular: { name: string; count: number } | null; uniqueTypes: number; zeroBookings: string[] };
        byTreatment: { name: string; count: number; percentage: number }[];
        byDay: { date: string; count: number }[];
        byStatus: { status: string; count: number }[];
      }>;
    },
  });

  const TD_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

  const tdApptQuery = useQuery({
    queryKey: ['/api/analytics/appointments-paginated', tdApplied, tdApptPage],
    enabled: !!user,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(tdApptPage), limit: '15', startDate: tdApplied.startDate, endDate: tdApplied.endDate });
      if (tdApplied.type && tdApplied.type !== 'all') p.set('type', tdApplied.type);
      const r = await apiRequest('GET', `/api/analytics/appointments-paginated?${p.toString()}`);
      return r.json() as Promise<{ appointments: any[]; total: number; page: number; totalPages: number; limit: number }>;
    },
  });

  useEffect(() => {
    if (tdQuery.isError) setTdShowError(true);
  }, [tdQuery.isError]);

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["/api/appointments", "all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/appointments");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics', user?.id, isDoctorLike(user?.role)],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const url = isDoctorLike(user?.role) && user?.id 
        ? `/api/analytics?doctorId=${user.id}` 
        : '/api/analytics';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
    enabled: !!user
  });

  const appointmentsForCounts: any[] = useMemo(
    () => (Array.isArray(allAppointments) ? allAppointments : []),
    [allAppointments],
  );

  const { futureAndCurrentList, completedCount, futureAndCurrentCount } = useMemo(() => {
    const now = new Date();

    const futureAndCurrent = appointmentsForCounts.filter((apt: any) => {
      const dt = new Date(apt.scheduledAt || apt.scheduled_at || apt.date);
      return !Number.isNaN(dt.getTime()) && dt >= now;
    });

    const completed = futureAndCurrent.filter(
      (apt: any) => String(apt.status || "").toLowerCase() === "completed",
    );

    return {
      futureAndCurrentList: futureAndCurrent,
      completedCount: completed.length,
      futureAndCurrentCount: futureAndCurrent.length,
    };
  }, [appointmentsForCounts]);

  // Fetch daily, monthly, yearly analytics
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [daysFilter, setDaysFilter] = useState(30);
  const [monthsFilter, setMonthsFilter] = useState(12);
  const [yearsFilter, setYearsFilter] = useState(5);
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Default to 'all' to show all appointments
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all'); // Default to 'all' to show both paid and unpaid

  // Fetch treatment analytics data from dedicated endpoints - optimized for speed
  const { data: treatmentSessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['treatment-sessions-analytics', user?.id, statusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('[TREATMENT-ANALYTICS] No auth token found');
          return [];
        }
        
        const subdomain = getTenantSubdomain();
        const url = `/api/analytics/treatment-sessions?status=${encodeURIComponent(statusFilter)}`;
        console.log('[QUERY] Fetching treatment sessions:', { url, statusFilter, subdomain });
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': subdomain,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[QUERY] Treatment sessions response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch treatment sessions:', response.status, errorText);
          return [];
        }
        
        const data = await response.json();
        console.log('[QUERY] Treatment sessions data received:', Array.isArray(data) ? data.length : 0, 'items with status filter:', statusFilter);
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample treatment session:', {
            id: data[0].id,
            status: data[0].status,
            treatment_id: data[0].treatment_id,
            treatment_name: data[0].treatment_name
          });
        } else {
          console.warn('[QUERY] No treatment sessions found. Check if appointments have treatment_id set and match status filter:', statusFilter);
        }
        return Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error('[QUERY] Error fetching treatment sessions:', error);
        return [];
      }
    },
    enabled: !!user && !!user.id,
    staleTime: 300000,
    retry: 0,
    refetchOnWindowFocus: false,
    gcTime: 300000
  });

  const { data: treatmentPopularity = [] } = useQuery({
    queryKey: ['treatment-popularity', statusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/treatment-popularity?status=${encodeURIComponent(statusFilter)}`;
        console.log('[QUERY] Fetching treatment popularity:', { url, statusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Treatment popularity response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch treatment popularity:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Treatment popularity data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample treatment popularity:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching treatment popularity:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000,
    retry: 1
  });

  const { data: monthlyTrends = [] } = useQuery({
    queryKey: ['monthly-trends', statusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/monthly-trends?status=${encodeURIComponent(statusFilter)}`;
        console.log('[QUERY] Fetching monthly trends:', { url, statusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Monthly trends response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch monthly trends:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Monthly trends data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample monthly trend:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching monthly trends:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000,
    retry: 1
  });

  const { data: revenuePerTreatment = [] } = useQuery({
    queryKey: ['revenue-per-treatment', statusFilter, paymentStatusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/revenue-per-treatment?status=${encodeURIComponent(statusFilter)}&paymentStatus=${encodeURIComponent(paymentStatusFilter)}`;
        console.log('[QUERY] Fetching revenue per treatment:', { url, statusFilter, paymentStatusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Revenue per treatment response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch revenue per treatment:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Revenue per treatment data received:', Array.isArray(data) ? data.length : 0, 'items with status filter:', statusFilter);
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample revenue data:', data[0]);
        } else {
          console.warn('[QUERY] No revenue data found. Check if appointments have treatment_id, invoices are linked (service_id = appointment_id), and match status filter:', statusFilter);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching revenue per treatment:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000,
    retry: 1
  });

  const { data: categoryDistribution = [] } = useQuery({
    queryKey: ['category-distribution', statusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/category-distribution?status=${encodeURIComponent(statusFilter)}`;
        console.log('[QUERY] Fetching category distribution:', { url, statusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Category distribution response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch category distribution:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Category distribution data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample category distribution:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching category distribution:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000,
    retry: 1
  });

  const { data: treatmentSummary = {} } = useQuery({
    queryKey: ['treatment-summary'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = '/api/analytics/treatment-summary';
        console.log('[QUERY] Fetching treatment summary:', { url });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Treatment summary response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch treatment summary:', response.status, errorText);
          return {};
        }
        const data = await response.json();
        console.log('[QUERY] Treatment summary data received:', data);
        return data || {};
      } catch (error) {
        console.error('[QUERY] Error fetching treatment summary:', error);
        return {};
      }
    },
    enabled: !!user,
    staleTime: 60000,
    retry: 1
  });

  const { data: dailyData = [] } = useQuery({
    queryKey: ['treatments-daily', daysFilter, statusFilter, paymentStatusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/treatments-daily?days=${daysFilter}&status=${encodeURIComponent(statusFilter)}&paymentStatus=${encodeURIComponent(paymentStatusFilter)}`;
        console.log('[QUERY] Fetching daily treatments:', { url, daysFilter, statusFilter, paymentStatusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Daily treatments response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch daily treatments:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Daily treatments data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample daily data:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching daily analytics:', error);
        return [];
      }
    },
    enabled: !!user && timeframe === 'daily',
    staleTime: 60000
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ['treatments-monthly', monthsFilter, statusFilter, paymentStatusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/treatments-monthly?months=${monthsFilter}&status=${encodeURIComponent(statusFilter)}&paymentStatus=${encodeURIComponent(paymentStatusFilter)}`;
        console.log('[QUERY] Fetching monthly treatments:', { url, monthsFilter, statusFilter, paymentStatusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Monthly treatments response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch monthly treatments:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Monthly treatments data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample monthly data:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching monthly analytics:', error);
        return [];
      }
    },
    enabled: !!user && timeframe === 'monthly',
    staleTime: 60000
  });

  const { data: yearlyData = [] } = useQuery({
    queryKey: ['treatments-yearly', yearsFilter, statusFilter, paymentStatusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = `/api/analytics/treatments-yearly?years=${yearsFilter}&status=${encodeURIComponent(statusFilter)}&paymentStatus=${encodeURIComponent(paymentStatusFilter)}`;
        console.log('[QUERY] Fetching yearly treatments:', { url, yearsFilter, statusFilter, paymentStatusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Yearly treatments response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch yearly treatments:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Yearly treatments data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample yearly data:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching yearly analytics:', error);
        return [];
      }
    },
    enabled: !!user && timeframe === 'yearly',
    staleTime: 60000
  });

  // Fetch detailed treatments list grouped by date
  const { data: detailedTreatments = [] } = useQuery({
    queryKey: ['treatments-detailed', timeframe, daysFilter, monthsFilter, yearsFilter, statusFilter, paymentStatusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const params = new URLSearchParams({
          timeframe: timeframe,
          status: statusFilter,
          paymentStatus: paymentStatusFilter
        });
        if (timeframe === 'daily') {
          params.append('days', daysFilter.toString());
        } else if (timeframe === 'monthly') {
          params.append('months', monthsFilter.toString());
        } else {
          params.append('years', yearsFilter.toString());
        }
        const url = `/api/analytics/treatments-detailed?${params.toString()}`;
        console.log('[QUERY] Fetching detailed treatments:', { url, timeframe, daysFilter, monthsFilter, yearsFilter, statusFilter, paymentStatusFilter });
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': getTenantSubdomain(),
            'Content-Type': 'application/json'
          }
        });
        console.log('[QUERY] Detailed treatments response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[QUERY] Failed to fetch detailed treatments:', response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log('[QUERY] Detailed treatments data received:', Array.isArray(data) ? data.length : 0, 'items');
        if (Array.isArray(data) && data.length > 0) {
          console.log('[QUERY] Sample detailed treatment:', data[0]);
        }
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[QUERY] Error fetching detailed treatments:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000
  });

  // Removed verbose console summary logs used during debugging
  useEffect(() => {}, [
    statusFilter,
    timeframe,
    daysFilter,
    monthsFilter,
    yearsFilter,
    treatmentSessions,
    treatmentPopularity,
    monthlyTrends,
    revenuePerTreatment,
    categoryDistribution,
    treatmentSummary,
    dailyData,
    monthlyData,
    yearlyData,
    sessionsLoading,
    sessionsError
  ]);

  const handleAppointmentsClick = () => {
    if (futureAndCurrentList) {
      setCompletedAppointments(futureAndCurrentList);
      setShowAppointmentsDialog(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleExport = () => {
    const exportData = {
      overview: analytics.overview,
      trends: analytics.trends,
      generatedAt: new Date().toISOString(),
      dateRange: `${filters.dateRange} days`,
      filters: filters
    };

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Patients', analytics.overview.totalPatients],
      ['New Patients', analytics.overview.newPatients],
      ['Total Appointments', analytics.overview.totalAppointments],
      ['Completed Appointments', analytics.overview.completedAppointments],
      ['Revenue', formatCurrency(analytics.overview.revenue)],
      ['Average Wait Time', `${analytics.overview.averageWaitTime}min`],
      ['Patient Satisfaction', `${analytics.overview.patientSatisfaction}%`],
      ['No Show Rate', `${analytics.overview.noShowRate}%`]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Safe data access with fallbacks
  const analytics = analyticsData as AnalyticsData || {
    overview: {
      totalPatients: 0,
      newPatients: 0,
      totalAppointments: 0,
      completedAppointments: 0,
      revenue: 0,
      averageWaitTime: 0,
      patientSatisfaction: 0,
      noShowRate: 0
    },
    trends: {
      patientGrowth: [],
      appointmentVolume: [],
      revenue: []
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header title="Analytics Dashboard" subtitle="Comprehensive insights into practice performance" />
      
      <div className="w-full px-4 sm:px-5 lg:px-6 py-5">
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 mb-5">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.overview.totalPatients.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{analytics.overview.newPatients} this month
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Appointments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{futureAndCurrentCount.toLocaleString()}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  {futureAndCurrentCount > 0 ? 
                    Math.round((completedCount / futureAndCurrentCount) * 100) : 0}% completion rate
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.overview.revenue)}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.2% vs last month
                </p>
              </div>
              <CurrencyIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Wait Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.overview.averageWaitTime}min</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -2min vs last month
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className={`grid w-full ${isDoctorLike(user?.role) ? 'grid-cols-4 md:grid-cols-7' : 'grid-cols-3 md:grid-cols-6'}`}>
            {isDoctorLike(user?.role) ? (
              <>
                <TabsTrigger value="overview">Overview ({user?.firstName} {user?.lastName})</TabsTrigger>
                <TabsTrigger value="patients">Patients ({user?.firstName} {user?.lastName})</TabsTrigger>
                <TabsTrigger value="appointments">My Appointments ({user?.firstName} {user?.lastName})</TabsTrigger>
                <TabsTrigger value="clinical">Clinic ({user?.firstName} {user?.lastName})</TabsTrigger>
                <TabsTrigger value="financial">Financial ({user?.firstName} {user?.lastName})</TabsTrigger>
                <TabsTrigger value="all-appointments">All Appointments</TabsTrigger>
                <TabsTrigger value="treatments">Treatments</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
                <TabsTrigger value="clinical">Clinical</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="all-appointments">All Appointments</TabsTrigger>
                <TabsTrigger value="treatments">Treatments</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Custom treatment analytics tab removed per requirement */}

          {/* Custom Analytics Tab */}
          <TabsContent value="custom-analytics" className="space-y-4 lg:space-y-6">
            {!user ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Please log in to view custom analytics.</p>
                </CardContent>
              </Card>
            ) : (
              <CustomAnalyticsDashboard currencySymbol={currencySymbol} user={user} />
            )}
          </TabsContent>

          {/* Treatment Analytics Dashboard Tab (hidden) */}
          {/*
          <TabsContent value="treatment-analytics" className="space-y-4 lg:space-y-6">
            {!user ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Please log in to view treatment analytics.</p>
                </CardContent>
              </Card>
            ) : (
              <TreatmentAnalyticsDashboard 
                treatmentSessions={treatmentSessions || []}
                treatmentPopularity={treatmentPopularity || []}
                monthlyTrends={monthlyTrends || []}
                revenuePerTreatment={revenuePerTreatment || []}
                categoryDistribution={categoryDistribution || []}
                treatmentSummary={treatmentSummary || {}}
                currencySymbol={currencySymbol}
                dailyData={dailyData}
                monthlyData={monthlyData}
                yearlyData={yearlyData}
                detailedTreatments={detailedTreatments}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                daysFilter={daysFilter}
                setDaysFilter={setDaysFilter}
                monthsFilter={monthsFilter}
                setMonthsFilter={setMonthsFilter}
                yearsFilter={yearsFilter}
                setYearsFilter={setYearsFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                paymentStatusFilter={paymentStatusFilter}
                setPaymentStatusFilter={setPaymentStatusFilter}
                user={user}
              />
            )}
          </TabsContent>
          */}

          <TabsContent value="overview" className="space-y-4">
            {/* Compact Analytics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 auto-rows-fr">
              {/* Patients This Month */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Patients</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Patients (Month)</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 break-words mb-1 flex items-center">{analytics.overview.patientsThisMonth || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">New registrations</div>
                </Card>
              </div>

              {/* Top Doctor */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Doctors</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Top Doctor</div>
                  <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400 truncate mb-1" title={analytics.overview.topDoctor?.name || 'No data'}>{analytics.overview.topDoctor?.name || 'No data'}</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">{analytics.overview.topDoctor?.appointmentCount || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Appointments</div>
                </Card>
              </div>

              {/* Total Revenue */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Billing</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Total Revenue</div>
                  <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 break-words leading-tight mb-1 flex items-center">{formatCurrency(analytics.overview.totalRevenue || 0)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">All payments</div>
                </Card>
              </div>

              {/* Outstanding Dues */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Billing</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Outstanding</div>
                  <div className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 break-words leading-tight mb-1 flex items-center">{formatCurrency(analytics.overview.outstandingDues || 0)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Unpaid invoices</div>
                </Card>
              </div>

              {/* Total Lab Tests */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Lab Tests</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Lab Tests (7d)</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 break-words mb-1 flex items-center">{analytics.overview.labTestsCount || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Total ordered</div>
                </Card>
              </div>

              {/* Appointments Today */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Appointments</div>
                <Card 
                  className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                  onClick={handleAppointmentsClick}
                >
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Appointments</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 break-words mb-1 flex items-center">{futureAndCurrentCount || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">{completedCount || 0} completed</div>
                </Card>
              </div>

              {/* No-Shows */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Appointments</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">No-Shows</div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 break-words mb-1 flex items-center">{analytics.overview.noShowCount || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">{analytics.overview.noShowRate || 0}% rate</div>
                </Card>
              </div>

              {/* Cancellations */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Appointments</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Cancelled</div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 break-words mb-1 flex items-center">{analytics.overview.cancelledCount || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Appointments</div>
                </Card>
              </div>

              {/* Most Frequent Test */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Lab Tests</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Top Lab Test</div>
                  <div className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 truncate mb-1" title={analytics.overview.topLabTest?.name || 'No data'}>{analytics.overview.topLabTest?.name || 'No data'}</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">{analytics.overview.topLabTest?.count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Orders</div>
                </Card>
              </div>

              {/* Payment Mode */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Billing</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Top Payment</div>
                  <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400 truncate mb-1" title={analytics.overview.topPaymentMode?.mode || 'No data'}>{analytics.overview.topPaymentMode?.mode || 'No data'}</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">{analytics.overview.topPaymentMode?.count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Transactions</div>
                </Card>
              </div>

              {/* Age Distribution */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Patients</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Avg Age</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 break-words mb-1 flex items-center">{analytics.overview.averageAge || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Years</div>
                </Card>
              </div>

              {/* Gender Ratio */}
              <div className="min-w-0 flex flex-col">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide truncate">Patients</div>
                <Card className="p-3 overflow-hidden flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">Gender Ratio</div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white break-words mb-1">
                    M:{analytics.overview.maleCount || 0} F:{analytics.overview.femaleCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-auto">Patients</div>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Patient Growth */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Growth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.trends.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="new" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Appointment Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.trends.appointmentVolume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM d')} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" stackId="a" fill="#10b981" />
                    <Bar dataKey="cancelled" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="noShow" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Patient Satisfaction */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {analytics.overview.patientSatisfaction}/5.0
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16">No Shows:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${analytics.overview.noShowRate}%` }}></div>
                      </div>
                      <span className="text-sm text-red-600">{analytics.overview.noShowRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          </TabsContent>

          <TabsContent value="patients" className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Patient Growth Trend */}
            <Card className="border-white dark:border-gray-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Patient Growth Trend</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Track the growth of total and new patients over time from the patients database
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.trends.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-600" />
                    <XAxis dataKey="month" stroke="#64748b" className="dark:stroke-slate-400" />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--foreground)'
                      }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                    />
                    <Area type="monotone" dataKey="total" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.8} name="Total Patients" />
                    <Area type="monotone" dataKey="new" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} name="New Patients" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Appointment Volume */}
            <Card className="border-white dark:border-gray-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Appointment Volume</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  View appointment trends showing scheduled, completed, cancelled, and no-show appointments from the appointments table
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.trends.appointmentVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-600" />
                    <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM d')} stroke="#64748b" className="dark:stroke-slate-400" />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--foreground)'
                      }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                    />
                    <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                    <Bar dataKey="cancelled" stackId="a" fill="#f59e0b" name="Cancelled" />
                    <Bar dataKey="noShow" stackId="a" fill="#ef4444" name="No Show" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Patient Demographics - Age Distribution chart with white border */}
            <Card data-age-distribution-chart className="rounded-lg bg-card text-card-foreground shadow-sm age-distribution-card-white-border hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="age-distribution-chart-wrap rounded-lg overflow-hidden border-2" style={{ boxSizing: "border-box" }}>
                  <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analyticsData?.patientAnalytics?.demographics?.ageDistribution || {}).map(([key, value]) => ({
                        name: key,
                        value: value as number
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(analyticsData?.patientAnalytics?.demographics?.ageDistribution || {}).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip />}
                      wrapperStyle={{ border: '1px solid white', outline: 'none' }}
                      contentStyle={{ border: '1px solid white', backgroundColor: 'white' }}
                      itemStyle={{ color: '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="border-white dark:border-gray-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(analyticsData?.patientAnalytics?.demographics?.genderDistribution || {}).map(([key, value]) => ({
                    gender: key,
                    count: value as number
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-600" />
                    <XAxis dataKey="gender" stroke="#64748b" className="dark:stroke-slate-400" />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--foreground)'
                      }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                    />
                    <Bar dataKey="count" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Top Conditions */}
            <Card className="border-white dark:border-gray-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Most Common Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.patientAnalytics?.topConditions?.map((condition: any, index: number) => (
                    <div key={condition.condition} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium dark:text-gray-200">{condition.condition}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold dark:text-gray-100">{condition.count}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {analyticsData?.patientAnalytics?.totalPatients > 0 
                            ? Math.round((condition.count / analyticsData.patientAnalytics.totalPatients) * 100) 
                            : 0}% of patients
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            {/* Appointment Statistics */}
            <Card className="border-white dark:border-gray-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Patient Appointment Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded transition-colors">
                    <span className="text-gray-600 dark:text-gray-300">Total Appointments</span>
                    <span className="font-bold text-lg dark:text-gray-100">{analyticsData?.patientAnalytics?.appointmentStats?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded transition-colors">
                    <span className="text-gray-600 dark:text-gray-300">Completed</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{analyticsData?.patientAnalytics?.appointmentStats?.completed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded transition-colors">
                    <span className="text-gray-600 dark:text-gray-300">Cancelled</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">{analyticsData?.patientAnalytics?.appointmentStats?.cancelled || 0}</span>
                  </div>
                  <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded transition-colors">
                    <span className="text-gray-600 dark:text-gray-300">No Shows</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{analyticsData?.patientAnalytics?.appointmentStats?.noShow || 0}</span>
                  </div>
                  <div className="pt-4 border-t dark:border-gray-700">
                    <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded transition-colors">
                      <span className="text-gray-600 dark:text-gray-300">Completion Rate</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{analyticsData?.patientAnalytics?.appointmentStats?.completionRate || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            <Card className="border-white dark:border-gray-700 hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
              <CardHeader>
                <CardTitle className="dark:text-white">Patient Summary</CardTitle>
              </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-4 rounded transition-colors">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {analyticsData?.patientAnalytics?.totalPatients || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Patients</div>
                </div>
                <div className="text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-4 rounded transition-colors">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {analyticsData?.patientAnalytics?.newPatients || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">New Patients (30 days)</div>
                </div>
                <div className="text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 p-4 rounded transition-colors">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {analyticsData?.patientAnalytics?.appointmentStats?.completionRate || 0}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Completion Rate</div>
                </div>
              </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isDoctorLike(user?.role) && (
            <TabsContent value="appointments" className="space-y-4 lg:space-y-6">
              {/* My Appointments Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Appointments</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {analyticsData?.overview?.totalAppointments || 0}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                        <p className="text-3xl font-bold text-green-600">
                          {analyticsData?.overview?.completedAppointments || 0}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No-Shows</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {analyticsData?.overview?.noShowCount || 0}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cancelled</p>
                        <p className="text-3xl font-bold text-red-600">
                          {analyticsData?.overview?.cancelledCount || 0}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Appointment Volume Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>My Appointment Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData?.trends?.appointmentVolume || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="scheduled" fill="#0ea5e9" name="Scheduled" />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
                      <Bar dataKey="noShow" fill="#f59e0b" name="No-Show" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="clinical" className="space-y-4 lg:space-y-6">
            {/* Clinical Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Consultations</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {analyticsData?.clinicalAnalytics?.overview?.totalConsultations || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
                    <p className="text-3xl font-bold text-green-600">
                      {analyticsData?.clinicalAnalytics?.overview?.activePrescriptions || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medical Records</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {analyticsData?.clinicalAnalytics?.overview?.totalMedicalRecords || 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical AI Insights</p>
                    <p className="text-3xl font-bold text-red-600">
                      {analyticsData?.clinicalAnalytics?.overview?.criticalInsights || 0}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                </CardContent>
              </Card>
            </div>

            {/* Clinical Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Top Medications */}
            <Card>
              <CardHeader>
                <CardTitle>Top Prescribed Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.clinicalAnalytics?.medications?.topMedications || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="medication" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Consultation Types */}
            <Card>
              <CardHeader>
                <CardTitle>Consultation Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analyticsData?.clinicalAnalytics?.consultationTypes || {}).map(([type, count]) => ({
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        value: count as number
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* AI Insights Severity */}
            <Card>
              <CardHeader>
                <CardTitle>AI Insights by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <style dangerouslySetInnerHTML={{__html: `
                  .ai-insights-chart text {
                    fill: #6b7280;
                  }
                  .dark .ai-insights-chart text {
                    fill: #d1d5db;
                  }
                  .ai-insights-chart line {
                    stroke: #e5e7eb;
                  }
                  .dark .ai-insights-chart line {
                    stroke: #374151;
                  }
                `}} />
                <div className="ai-insights-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(analyticsData?.clinicalAnalytics?.aiInsights?.severityDistribution || {}).map(([severity, count]) => ({
                      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
                      count: count as number
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="severity" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Clinical Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="dark:text-white">Recent Activity (7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <span className="font-medium dark:text-gray-200">Consultations</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {analyticsData?.clinicalAnalytics?.recentActivity?.consultations || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                      <span className="font-medium dark:text-gray-200">Prescriptions</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analyticsData?.clinicalAnalytics?.recentActivity?.prescriptions || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                      <span className="font-medium dark:text-gray-200">AI Insights</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {analyticsData?.clinicalAnalytics?.recentActivity?.insights || 0}
                    </span>
                  </div>
                </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card>
            <CardHeader>
              <CardTitle>Clinical Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analyticsData?.clinicalAnalytics?.overview?.consultationCompletionRate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Consultation Completion Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {analyticsData?.clinicalAnalytics?.overview?.prescriptionActiveRate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Active Prescription Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {analyticsData?.clinicalAnalytics?.medications?.totalTypes || 0}
                  </div>
                  <div className="text-sm text-gray-600">Medication Types</div>
                </div>
              </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4 lg:space-y-6">
            <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.trends.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} />
                  <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── All Appointments Tab ─────────────────────────────────────────── */}
          <TabsContent value="all-appointments" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-blue-500" />
                  All Appointments
                  {apptQuery.data && (
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {apptQuery.data.total} total
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <Input
                    placeholder="Search patient or title…"
                    value={apptSearchInput}
                    onChange={e => setApptSearchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        setApptSearch(apptSearchInput);
                        setApptPage(1);
                      }
                    }}
                    className="w-48"
                  />
                  <Button size="sm" variant="outline" onClick={() => { setApptSearch(apptSearchInput); setApptPage(1); }}>
                    Search
                  </Button>
                  <Select value={apptStatus} onValueChange={v => { setApptStatus(v); setApptPage(1); }}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={apptStartDate}
                    onChange={e => { setApptStartDate(e.target.value); setApptPage(1); }}
                    className="w-40"
                    title="Start date"
                  />
                  <Input
                    type="date"
                    value={apptEndDate}
                    onChange={e => { setApptEndDate(e.target.value); setApptPage(1); }}
                    className="w-40"
                    title="End date"
                  />
                  {(apptSearch || apptStatus !== "all" || apptStartDate || apptEndDate) && (
                    <Button size="sm" variant="ghost" onClick={() => {
                      setApptSearchInput(""); setApptSearch(""); setApptStatus("all");
                      setApptStartDate(""); setApptEndDate(""); setApptPage(1);
                    }}>
                      Clear
                    </Button>
                  )}
                </div>

                {/* Table */}
                {apptQuery.isLoading ? (
                  <div className="text-center py-12 text-gray-500">Loading appointments…</div>
                ) : apptQuery.isError ? (
                  <div className="text-center py-12 text-red-500">Failed to load appointments.</div>
                ) : !apptQuery.data?.appointments?.length ? (
                  <div className="text-center py-12 text-gray-400">No appointments found.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Time</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Patient</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Provider</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Treatment</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Title</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Type</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Duration</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {apptQuery.data.appointments.map((apt: any, i: number) => {
                          const dt = new Date(apt.scheduled_at);
                          const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                          const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                          const patientName = apt.patient_first_name
                            ? `${apt.patient_first_name} ${apt.patient_last_name || ""}`.trim()
                            : `Patient #${apt.patient_id}`;
                          const providerName = apt.provider_first_name
                            ? `${apt.provider_first_name} ${apt.provider_last_name || ""}`.trim()
                            : apt.provider_id ? `Provider #${apt.provider_id}` : "—";
                          const statusColors: Record<string, string> = {
                            completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                            cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            no_show: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                            rescheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                          };
                          const typeLabel = apt.type_label || apt.appointment_type || apt.type || "—";
                          return (
                            <tr key={apt.id ?? i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                              <td className="px-4 py-3 whitespace-nowrap font-medium">{dateStr}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">{timeStr}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{patientName}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{providerName}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                {apt.treatment_name
                                  ? <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium">{apt.treatment_name}</span>
                                  : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-3 max-w-[180px] truncate" title={apt.title}>{apt.title || "—"}</td>
                              <td className="px-4 py-3 whitespace-nowrap capitalize">{typeLabel}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">{apt.duration ? `${apt.duration} min` : "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[apt.status] ?? "bg-gray-100 text-gray-600"}`}>
                                  {apt.status?.replace("_", " ") ?? "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                {apt.is_virtual ? "Virtual" : "In-person"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {apptQuery.data && apptQuery.data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Page {apptQuery.data.page} of {apptQuery.data.totalPages}
                      {" "}·{" "}
                      {apptQuery.data.total} appointment{apptQuery.data.total !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="outline"
                        disabled={apptPage <= 1}
                        onClick={() => setApptPage(1)}
                      >«</Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={apptPage <= 1}
                        onClick={() => setApptPage(p => Math.max(1, p - 1))}
                      >‹ Prev</Button>
                      {Array.from({ length: Math.min(5, apptQuery.data.totalPages) }, (_, i) => {
                        const half = 2;
                        const tp = apptQuery.data.totalPages;
                        let start = Math.max(1, apptPage - half);
                        if (start + 4 > tp) start = Math.max(1, tp - 4);
                        const pageNum = start + i;
                        if (pageNum > tp) return null;
                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={pageNum === apptPage ? "default" : "outline"}
                            onClick={() => setApptPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >{pageNum}</Button>
                        );
                      })}
                      <Button
                        size="sm" variant="outline"
                        disabled={apptPage >= apptQuery.data.totalPages}
                        onClick={() => setApptPage(p => Math.min(apptQuery.data!.totalPages, p + 1))}
                      >Next ›</Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={apptPage >= apptQuery.data.totalPages}
                        onClick={() => setApptPage(apptQuery.data!.totalPages)}
                      >»</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Treatment Analytics Dashboard Tab ─────────────────────────────── */}
          <TabsContent value="treatments" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Treatment Analytics Title</label>
                    <input type="text" placeholder="e.g. Q1 Treatment Summary" value={tdChartTitle} onChange={e => setTdChartTitle(e.target.value)} className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-52" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Start Date</label>
                    <input type="date" value={tdStartDate} onChange={e => setTdStartDate(e.target.value)} className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">End Date</label>
                    <input type="date" value={tdEndDate} onChange={e => setTdEndDate(e.target.value)} className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Treatment Type</label>
                    <select value={tdType} onChange={e => setTdType(e.target.value)} className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                      <option value="all">All Types</option>
                      <option value="consultation">Consultation</option>
                      <option value="checkup">Checkup</option>
                      <option value="follow-up">Follow-Up</option>
                      <option value="treatment">Treatment</option>
                      <option value="procedure">Procedure</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Chart Type</label>
                    <select value={tdChartType} onChange={e => setTdChartType(e.target.value as any)} className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                      <option value="bar">Bar Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="area">Area Chart</option>
                    </select>
                  </div>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-5 flex items-center gap-2" disabled={tdQuery.isFetching} onClick={() => setTdApplied({ startDate: tdStartDate, endDate: tdEndDate, type: tdType, search: tdSearchInput })}>
                    {tdQuery.isFetching ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Applying…
                      </>
                    ) : 'Apply Filters'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-9" onClick={() => { setTdStartDate(ninetyDaysAgo); setTdEndDate(todayIso); setTdType('all'); setTdSearchInput(''); setTdApplied({ startDate: ninetyDaysAgo, endDate: todayIso, type: 'all', search: '' }); }}>
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Loading overlay ── */}
            {tdQuery.isFetching && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[300px] max-w-sm mx-4">
                  <span className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100 text-center">Fetching treatment analytics…</p>
                  <p className="text-xs text-gray-400 text-center">Please wait while we process your filters</p>
                </div>
              </div>
            )}

            {/* ── Error popup ── */}
            <Dialog open={tdShowError} onOpenChange={setTdShowError}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 text-sm font-bold">!</span>
                    Something went wrong
                  </DialogTitle>
                  <DialogDescription>
                    We couldn’t fetch the treatment analytics. Please check your filters and try again.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setTdShowError(false)}>Close</Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setTdShowError(false); tdQuery.refetch(); }}>
                    Try Again
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* ── Results ── */}
            {tdQuery.data && !tdQuery.isError && !tdQuery.isFetching && (() => {
              const summary = tdQuery.data.summary;
              const byTreatment = (tdQuery.data.byTreatment ?? []).slice().sort((a: any, b: any) => b.count - a.count);
              const chartTotal = byTreatment.reduce((s: number, t: any) => s + t.count, 0);
              const mostPopular = summary.mostPopular?.name ?? byTreatment[0]?.name ?? '—';

              if (byTreatment.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <p className="text-gray-400 text-base">No treatments available for selected dates</p>
                    </CardContent>
                  </Card>
                );
              }

              const typeNameLabels: Record<string, string> = { 'follow-up': 'Follow-Up', 'checkup': 'Checkup', 'consultation': 'Consultation', 'procedure': 'Procedure', 'treatment': 'Treatment' };
              const selectedTypeLabel = tdApplied.type === 'all' || !tdApplied.type ? 'All Types' : (typeNameLabels[tdApplied.type] ?? tdApplied.type);

              return (
                <>
                <Card>
                  {/* Summary header */}
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap gap-6 items-center">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Total Treatments</p>
                        <p className="text-4xl font-bold text-indigo-600 tabular-nums">{chartTotal}</p>
                      </div>
                      <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Most Popular</p>
                        <p className="text-base font-semibold text-gray-800 dark:text-gray-100 capitalize">{mostPopular}</p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Chart (type controlled by dropdown) */}
                  <CardContent style={tdChartType === 'bar' ? { paddingBottom: '8px' } : {}}>
                    <ResponsiveContainer width="100%" height={tdChartType === 'bar' ? 440 : 340}>
                      {tdChartType === 'pie' ? (
                        <PieChart>
                          <Pie
                            data={byTreatment}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={({ name, percentage }: any) => `${name} ${percentage}%`}
                            labelLine={true}
                          >
                            {byTreatment.map((t: any, i: number) => (
                              <Cell key={i} fill={t.colorCode ?? TD_COLORS[i % TD_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: any, _: string, props: any) => [
                              `${val} (${props.payload?.percentage}%)`,
                              'Count'
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      ) : tdChartType === 'line' ? (
                        <LineChart data={byTreatment} margin={{ top: 28, right: 24, left: 0, bottom: 72 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} angle={-38} textAnchor="end" interval={0} height={80} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                          <Tooltip
                            formatter={(val: any, _: string, props: any) => [`${val} (${props.payload?.percentage}%)`, 'Count']}
                            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            strokeWidth={2.5}
                            dot={(props: any) => {
                              const { cx, cy, index } = props;
                              return <circle key={index} cx={cx} cy={cy} r={5} fill={byTreatment[index]?.colorCode ?? TD_COLORS[index % TD_COLORS.length]} stroke="#fff" strokeWidth={2} />;
                            }}
                            stroke="#6366f1"
                          >
                            <LabelList dataKey="percentage" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                          </Line>
                        </LineChart>
                      ) : tdChartType === 'area' ? (
                        <AreaChart data={byTreatment} margin={{ top: 28, right: 24, left: 0, bottom: 72 }}>
                          <defs>
                            <linearGradient id="tdAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} angle={-38} textAnchor="end" interval={0} height={80} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                          <Tooltip
                            formatter={(val: any, _: string, props: any) => [`${val} (${props.payload?.percentage}%)`, 'Count']}
                            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#tdAreaGradient)">
                            <LabelList dataKey="percentage" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                          </Area>
                        </AreaChart>
                      ) : (
                        <BarChart style={{ overflow: 'visible' }} data={byTreatment} margin={{ top: 28, right: 24, left: 0, bottom: 100 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-38} textAnchor="end" interval={0} height={100} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                          <Tooltip
                            cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                            formatter={(val: any, _: string, props: any) => [`${val} (${props.payload?.percentage}%)`, 'Count']}
                            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
                            {byTreatment.map((t: any, i: number) => (
                              <Cell key={i} fill={t.colorCode ?? TD_COLORS[i % TD_COLORS.length]} />
                            ))}
                            <LabelList dataKey="percentage" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>

                    {/* Chart title displayed below the graph — auto-derived from filter, or custom user text */}
                    {(() => {
                      const typeNames: Record<string, string> = { 'follow-up': 'Follow-Up', 'checkup': 'Checkup', 'consultation': 'Consultation', 'procedure': 'Procedure', 'treatment': 'Treatment' };
                      const autoTitle = (!tdApplied.type || tdApplied.type === 'all')
                        ? 'Treatments and Consultations'
                        : `${typeNames[tdApplied.type] ?? tdApplied.type} Appointments`;
                      const displayTitle = tdChartTitle.trim() || autoTitle;
                      return (
                        <p className="mt-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">
                          {displayTitle}
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* ── Filtered Appointments Table ────────────────────────────── */}
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base font-semibold">
                        {selectedTypeLabel === 'All Types' ? 'All Appointments' : `${selectedTypeLabel} Appointments`}
                      </CardTitle>
                      {tdApptQuery.data && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{tdApptQuery.data.total} total</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {tdApptQuery.isLoading ? (
                      <div className="py-10 text-center text-gray-400 text-sm">Loading appointments…</div>
                    ) : !tdApptQuery.data?.appointments?.length ? (
                      <div className="py-10 text-center text-gray-400 text-sm">No appointments found for this selection.</div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Patient</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Provider</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Service / Treatment</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Treatment Type</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {tdApptQuery.data.appointments.map((apt: any, i: number) => {
                                const dt = new Date(apt.scheduled_at);
                                const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                const patientName = apt.patient_first_name ? `${apt.patient_first_name} ${apt.patient_last_name || ''}`.trim() : `Patient #${apt.patient_id}`;
                                const providerName = apt.provider_first_name ? `${apt.provider_first_name} ${apt.provider_last_name || ''}`.trim() : apt.provider_id ? `Provider #${apt.provider_id}` : '—';
                                const typeLbl = apt.type_label || apt.appointment_type || apt.type || '—';
                                const statusColors: Record<string, string> = {
                                  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                  no_show: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                                  rescheduled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                };
                                const typeTagColors: Record<string, string> = {
                                  'Follow-Up': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                  'Checkup': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                                  'Consultation': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                                  'Procedure': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                                  'Treatment': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                                  'Emergency': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                                };
                                return (
                                  <tr key={apt.id ?? i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium">{dateStr}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{patientName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{providerName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                      {apt.treatment_name
                                        ? <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium">{apt.treatment_name}</span>
                                        : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${typeTagColors[typeLbl] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {typeLbl}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[apt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {apt.status?.replace('_', ' ') ?? '—'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {tdApptQuery.data.totalPages > 1 && (
                          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-xs text-gray-500">Page {tdApptQuery.data.page} of {tdApptQuery.data.totalPages} · {tdApptQuery.data.total} appointment{tdApptQuery.data.total !== 1 ? 's' : ''}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={tdApptPage <= 1} onClick={() => setTdApptPage(1)}>«</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={tdApptPage <= 1} onClick={() => setTdApptPage(p => Math.max(1, p - 1))}>‹</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={tdApptPage >= tdApptQuery.data.totalPages} onClick={() => setTdApptPage(p => Math.min(tdApptQuery.data!.totalPages, p + 1))}>›</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={tdApptPage >= tdApptQuery.data.totalPages} onClick={() => setTdApptPage(tdApptQuery.data!.totalPages)}>»</Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
                </>
              );
            })()}
          </TabsContent>

        </Tabs>
      </div>

      {/* Completed Appointments Dialog */}
      <Dialog open={showAppointmentsDialog} onOpenChange={setShowAppointmentsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completed Appointments (Today & Future)</DialogTitle>
            <DialogDescription>
              View completed appointments scheduled for today and future dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {completedAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No completed appointments found for today or future dates.
              </div>
            ) : (
              <div className="space-y-3">
                {completedAppointments.map((appointment: any) => {
                  const appointmentDate = new Date(appointment.scheduledAt || appointment.scheduled_at || appointment.date);
                  const patientName = appointment.patientName || 
                    (appointment.patient ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() : 'N/A');
                  const providerName = appointment.providerName || 
                    (appointment.provider ? `${appointment.provider.firstName || ''} ${appointment.provider.lastName || ''}`.trim() : 'N/A');
                  
                  return (
                    <Card key={appointment.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Patient:</p>
                          <p className="text-gray-900 dark:text-gray-100">{patientName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Provider:</p>
                          <p className="text-gray-900 dark:text-gray-100">{providerName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Date & Time:</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {format(appointmentDate, "MMM dd, yyyy")} at {format(appointmentDate, "h:mm a")}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Status:</p>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {appointment.status || 'completed'}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Type:</p>
                          <p className="text-gray-900 dark:text-gray-100">{appointment.type || appointment.appointmentType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Duration:</p>
                          <p className="text-gray-900 dark:text-gray-100">{appointment.duration || 'N/A'} minutes</p>
                        </div>
                        {appointment.notes && (
                          <div className="md:col-span-3">
                            <p className="font-medium text-gray-600 dark:text-gray-400 text-xs">Notes:</p>
                            <p className="text-gray-900 dark:text-gray-100 text-sm">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}