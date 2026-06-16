import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactSelect from "react-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, DollarSterling, PoundSterling, AlertTriangle, TrendingUp, Plus, Filter, Download, Eye, Edit, Trash2, FileText, Printer, Share, X } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { queryClient, saasApiRequest } from "@/lib/saasQueryClient";
import { useToast } from "@/hooks/use-toast";
import InvoiceTemplate from "./InvoiceTemplate";

// Payment status colors and icons
const getPaymentStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Failed</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">Cancelled</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">Refunded</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getSubscriptionBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>;
    case "trial":
      return <Badge className="bg-cyan-100 text-cyan-800">Trial</Badge>;
    case "expired":
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    case "cancelled":
      return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
    case "suspended":
      return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const REMINDER_LEVELS = [
  { key: "reminder_7d", label: "7-day notice" },
  { key: "reminder_1d", label: "1-day notice" },
  { key: "reminder_day_of", label: "Day-of notice" },
];

const FEATURE_LABELS: Record<string, string> = {
  maxUsers: "Max users",
  maxPatients: "Max patients",
  aiEnabled: "AI enabled",
  telemedicineEnabled: "Telemedicine",
  billingEnabled: "Billing",
  analyticsEnabled: "Analytics",
  customBranding: "Custom branding",
  prioritySupport: "Priority support",
  storageGB: "Storage (GB)",
  apiCallsPerMonth: "API calls / month",
};

const formatPackageFeatures = (features?: Record<string, any>) => {
  if (!features) return [];
  return Object.entries(features)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([key, value]) => {
      const label = FEATURE_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim();
      return typeof value === "boolean" ? label : `${label}: ${value}`;
    });
};

const getPaymentMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'stripe':
      return <CreditCard className="w-4 h-4" />;
    case 'paypal':
      return <PoundSterling className="w-4 h-4" />;
    case 'bank_transfer':
      return <TrendingUp className="w-4 h-4" />;
    case 'cash':
      return <PoundSterling className="w-4 h-4" />;
    default:
      return <CreditCard className="w-4 h-4" />;
  }
};

const formatPercentage = (value: number) => {
  const formatted = Math.abs(value).toFixed(1);
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatted}%`;
};

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const insightColorClass = (color: string) => {
  switch (color) {
    case "destructive":
      return "text-destructive";
    case "emerald":
      return "text-emerald-600";
    case "secondary":
      return "text-slate-600";
    default:
      return "text-gray-900";
  }
};

const parseDateParts = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
};

const formatDate = (date?: string | Date | null) => {
  const parts = parseDateParts(date);
  if (!parts) return "Not set";
  return `${parts.day.toString().padStart(2, "0")} ${monthNames[parts.month]} ${parts.year}`;
};

interface BillingStats {
  totalRevenue: number;
  monthlyRecurring: number;
  activeSubscriptions: number;
  pendingPayments: number;
  overduePayments: number;
  paymentMethods: {
    stripe: number;
    paypal: number;
    bankTransfer: number;
    cash: number;
  };
}

export default function SaaSBilling() {
  const { currencySymbol } = useCurrency();
  const [dateRange, setDateRange] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showStatusEditDialog, setShowStatusEditDialog] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<any>(null);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [subscriptionDialogMode, setSubscriptionDialogMode] = useState<"create" | "edit">("create");
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    organizationId: "",
    packageId: "",
    status: "active",
    paymentStatus: "pending",
    currentPeriodStart: "",
    currentPeriodEnd: "",
    expiresAt: "",
    details: "",
    maxUsers: "",
    maxPatients: "",
  });
  const [subscriptionErrors, setSubscriptionErrors] = useState<Record<string, string>>({});
  const [isSubscriptionDeleteDialogOpen, setIsSubscriptionDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<any>(null);
  const [isCancelSubscriptionDialogOpen, setIsCancelSubscriptionDialogOpen] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<any>(null);
  const [manualReminderLevels, setManualReminderLevels] = useState<Record<number, string>>({});
  const [sendingReminderIds, setSendingReminderIds] = useState<Record<number, boolean>>({});
  const manualReminderDefault = REMINDER_LEVELS[REMINDER_LEVELS.length - 1]?.key ?? "reminder_day_of";
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [activeReminderSubscription, setActiveReminderSubscription] = useState<any>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareTargetPayment, setShareTargetPayment] = useState<any>(null);
  const [, setTick] = useState(0);
  const [analyticsOrgFilter, setAnalyticsOrgFilter] = useState("all");
  const [analyticsPackageFilter, setAnalyticsPackageFilter] = useState("all");
  const [analyticsPaymentMethodFilter, setAnalyticsPaymentMethodFilter] = useState("all");

  // Fetch subscription history
  const { data: subscriptionHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/saas/billing/subscription-history'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/billing/subscription-history');
      if (!response.ok) throw new Error('Failed to fetch subscription history');
      return response.json();
    },
  });

  // Fetch billing statistics
  const { data: billingStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<BillingStats>({
    queryKey: ['/api/saas/billing/stats', dateRange],
    queryFn: async () => {
      const response = await saasApiRequest('GET', `/api/saas/billing/stats?dateRange=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch billing stats');
      return response.json();
    },
  });

  // Fetch billing data (invoices/payments)
  const { data: billingData, isLoading: dataLoading, refetch: refetchData } = useQuery({
    queryKey: ['/api/saas/billing/data', searchTerm, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateRange) params.append('dateRange', dateRange);
      
      const response = await saasApiRequest('GET', `/api/saas/billing/data?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      return response.json();
    },
  });

  // Fetch overdue invoices
  const { data: overdueInvoices, isLoading: overdueLoading } = useQuery({
    queryKey: ['/api/saas/billing/overdue'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/billing/overdue');
      if (!response.ok) throw new Error('Failed to fetch overdue invoices');
      return response.json();
    },
  });

  const { data: subscriptionPackages } = useQuery({
    queryKey: ['/api/saas/packages'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/packages');
      if (!response.ok) throw new Error('Failed to fetch billing packages');
      return response.json();
    },
  });

  const { data: subscriptionsData, isLoading: subscriptionsLoading, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['/api/saas/billing/subscriptions'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/billing/subscriptions');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    },
  });

  const isOverduePayment = (payment?: any) => {
    if (!payment) return false;
    const status = (payment.paymentStatus || "").toLowerCase();
    if (status !== "pending") return false;
    if (!payment.dueDate) return false;
    return new Date(payment.dueDate).getTime() < Date.now();
  };

  const overduePayments = useMemo(() => {
    if (!billingData?.invoices) return [];
    return billingData.invoices.filter((payment: any) => isOverduePayment(payment));
  }, [billingData?.invoices]);

  const overdueInvoiceNumbers = useMemo(() => {
    if (overduePayments.length > 0) {
      return new Set(overduePayments.map((payment: any) => payment.invoiceNumber));
    }
    if (!overdueInvoices) return new Set<string>();
    return new Set(overdueInvoices.map((invoice: any) => invoice.invoiceNumber));
  }, [overdueInvoices, overduePayments]);

  const latestInvoiceIds = useMemo(() => {
    if (!billingData?.invoices) return new Set<number>();
    const byOrg = new Map<string, { id: number; timestamp: number }>();
    billingData.invoices.forEach((payment: any) => {
      const key = payment.organizationId ?? payment.organizationEmail ?? payment.organizationName;
      const timestamp = new Date(payment.paymentDate || payment.createdAt).getTime();
      const existing = byOrg.get(String(key));
      if (!existing || timestamp > existing.timestamp) {
        byOrg.set(String(key), { id: payment.id, timestamp });
      }
    });
    return new Set(Array.from(byOrg.values()).map((value) => value.id));
  }, [billingData?.invoices]);

  const visiblePayments = useMemo(() => billingData?.invoices ?? [], [billingData?.invoices]);

  const invoiceHistory = useMemo(() => {
    if (!billingData?.invoices) return [];
    return billingData.invoices
      .filter((payment: any) => !latestInvoiceIds.has(payment.id))
      .sort(
        (a: any, b: any) =>
          new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime(),
      );
  }, [billingData?.invoices, latestInvoiceIds]);

  const analyticsInvoices = useMemo(() => {
    if (!billingData?.invoices) return [];
    const pkg = subscriptionPackages?.find((p: any) => String(p.id) === analyticsPackageFilter);
    return billingData.invoices.filter((payment: any) => {
      if (analyticsOrgFilter && analyticsOrgFilter !== "all" && payment.organizationName !== analyticsOrgFilter) {
        return false;
      }
      if (analyticsPaymentMethodFilter && analyticsPaymentMethodFilter !== "all" && payment.paymentMethod !== analyticsPaymentMethodFilter) {
        return false;
      }
      if (pkg && pkg.id !== "all" && payment.description && !payment.description.includes(pkg.name)) {
        return false;
      }
      return true;
    });
  }, [
    billingData?.invoices,
    analyticsOrgFilter,
    analyticsPackageFilter,
    analyticsPaymentMethodFilter,
    subscriptionPackages,
  ]);

  const rangeDays = Math.max(1, parseInt(dateRange) || 30);
  const now = useMemo(() => new Date(), []);
  const periodStart = useMemo(() => {
    const date = new Date(now);
    date.setDate(date.getDate() - rangeDays);
    return date;
  }, [now, rangeDays]);

  const previousPeriodKey = useMemo(() => {
    const prevEnd = new Date(periodStart);
    prevEnd.setSeconds(prevEnd.getSeconds() - 1);
    const prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - rangeDays);
    return { prevStart, prevEnd };
  }, [periodStart, rangeDays]);

  const currentPeriodInvoices = useMemo(() => {
    return analyticsInvoices.filter((payment: any) => {
      const createdAt = new Date(payment.paymentDate || payment.createdAt);
      return createdAt >= periodStart && createdAt <= now;
    });
  }, [analyticsInvoices, periodStart, now]);

  const previousPeriodInvoices = useMemo(() => {
    const { prevStart, prevEnd } = previousPeriodKey;
    return analyticsInvoices.filter((payment: any) => {
      const createdAt = new Date(payment.paymentDate || payment.createdAt);
      return createdAt >= prevStart && createdAt <= prevEnd;
    });
  }, [analyticsInvoices, previousPeriodKey]);

  const totalRevenue = currentPeriodInvoices.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const paidAmount = currentPeriodInvoices.reduce(
    (sum, payment) =>
      sum + (payment.paymentStatus?.toLowerCase() === "completed" ? Number(payment.amount || 0) : 0),
    0,
  );
  const outstandingAmount = currentPeriodInvoices.reduce(
    (sum, payment) =>
      sum +
      (["pending", "failed", "refunded"].includes((payment.paymentStatus || "").toLowerCase())
        ? Number(payment.amount || 0)
        : 0),
    0,
  );
  const overdueAmount = overduePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const revenueChangePercent = previousPeriodInvoices.length
    ? ((totalRevenue - previousPeriodInvoices.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)) /
        Math.max(1, previousPeriodInvoices.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))) *
      100
    : 0;

  const paymentMethodTotals = currentPeriodInvoices.reduce<Record<string, number>>((acc, payment) => {
    const method = payment.paymentMethod || "Unknown";
    acc[method] = (acc[method] || 0) + Number(payment.amount || 0);
    return acc;
  }, {});

  const totalMethodSum = Object.values(paymentMethodTotals).reduce((sum, value) => sum + value, 0);

  const paymentStatusCounts = currentPeriodInvoices.reduce<Record<string, number>>((acc, payment) => {
    const key = (payment.paymentStatus || "pending").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const paymentsSuccessRate =
    currentPeriodInvoices.length > 0
      ? (paymentStatusCounts.completed || 0) / currentPeriodInvoices.length
      : 0;

  const agingBuckets = {
    "0-7": 0,
    "8-30": 0,
    "31-60": 0,
    "60+": 0,
  };
  overduePayments.forEach((payment) => {
    if (!payment.dueDate) return;
    const days = Math.floor((Date.now() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) agingBuckets["0-7"] += 1;
    else if (days <= 30) agingBuckets["8-30"] += 1;
    else if (days <= 60) agingBuckets["31-60"] += 1;
    else agingBuckets["60+"] += 1;
  });

  const invoiceStatusCounts = currentPeriodInvoices.reduce<Record<string, number>>((acc, payment) => {
    const status = (payment.paymentStatus || "pending").toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const topOrganizations = Object.values(
    currentPeriodInvoices.reduce<Record<string, { name: string; paid: number; outstanding: number }>>(
      (acc, payment) => {
        const org = payment.organizationName || "Unknown";
        if (!acc[org]) {
          acc[org] = { name: org, paid: 0, outstanding: 0 };
        }
        if ((payment.paymentStatus || "").toLowerCase() === "completed") {
          acc[org].paid += Number(payment.amount || 0);
        } else {
          acc[org].outstanding += Number(payment.amount || 0);
        }
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.paid - a.paid);

  const paymentBehavior = useMemo(() => {
    const onTime = currentPeriodInvoices.filter((payment) => {
      if (!payment.paymentDate || !payment.dueDate) return false;
      return new Date(payment.paymentDate) <= new Date(payment.dueDate);
    }).length;
    const late = currentPeriodInvoices.length - onTime;
    const avgDelay =
      currentPeriodInvoices.reduce((sum, payment) => {
        if (!payment.paymentDate || !payment.dueDate) return sum;
        const delay =
          (new Date(payment.paymentDate).getTime() - new Date(payment.dueDate).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + Math.max(0, delay);
      }, 0) /
      Math.max(1, currentPeriodInvoices.length);
    return { onTime, late, avgDelay: avgDelay.toFixed(1) };
  }, [currentPeriodInvoices]);

  const bestRevenueDay = currentPeriodInvoices.reduce((best: any, payment: any) => {
    const day = formatDate(payment.createdAt);
    const total = currentPeriodInvoices
      .filter((p: any) => formatDate(p.createdAt) === day)
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    if (!best || total > best.total) {
      return { day, total };
    }
    return best;
  }, null as any);

  const insightCards = [
    {
      label: "Invoices > 30 days overdue",
      value: overduePayments.filter((payment) => {
        if (!payment.dueDate) return false;
        const days = Math.floor((Date.now() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        return days > 30;
      }).length,
      color: "destructive",
    },
    {
      label: "Revenue change vs last period",
      value: formatPercentage(revenueChangePercent),
      color: revenueChangePercent >= 0 ? "emerald" : "destructive",
    },
    {
      label: "Highest revenue day",
      value: bestRevenueDay?.day || "—",
      color: "secondary",
    },
  ];

  const recentPayments = useMemo(() => {
    if (!billingData?.invoices) return [];
    return [...billingData.invoices]
      .sort(
        (a: any, b: any) =>
          new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [billingData?.invoices]);

  const overdueInvoicesOver30 = overduePayments.filter((payment) => {
    if (!payment.dueDate) return false;
    const days = Math.floor((Date.now() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return days > 30;
  }).length;

  const pendingPaymentsCount = paymentStatusCounts.pending ?? 0;
  const activeSubscriptionsCount = subscriptionsData?.filter((sub: any) => sub.status === "active").length || 0;

  const overviewAlerts = [
    {
      label: "Invoices overdue > 30 days",
      value: overdueInvoicesOver30,
      color: "destructive",
    },
    {
      label: "Payments pending approval",
      value: pendingPaymentsCount,
      color: "amber",
    },
    {
      label: "Active subscriptions",
      value: activeSubscriptionsCount,
      color: "emerald",
    },
  ];

  const { data: rawOrganizationOptions } = useQuery({
    queryKey: ['/api/saas/customers', 'subscription-options'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/customers?status=all');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      return response.json();
    },
  });

  const organizationOptions = useMemo(() => {
    if (!rawOrganizationOptions) {
      return [];
    }
    const seen = new Map<number, any>();
    rawOrganizationOptions.forEach((org: any) => {
      if (!seen.has(org.id)) {
        seen.set(org.id, org);
      }
    });
    return Array.from(seen.values());
  }, [rawOrganizationOptions]);

  useEffect(() => {
    const interval = setInterval(() => setTick((prev) => prev + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await saasApiRequest('POST', '/api/saas/billing/payments', paymentData);
      if (!response.ok) throw new Error('Failed to create payment');
      return response.json();
    },
    onSuccess: () => {
      refetchData();
      refetchStats();
      setShowCreatePayment(false);
      setModalMessage("Payment created successfully");
      setIsSuccessModalOpen(true);
    },
    onError: (error: Error) => {
      setModalMessage(error.message || "Failed to create payment");
      setIsErrorModalOpen(true);
    },
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ paymentId, status, transactionId }: { paymentId: number; status: string; transactionId?: string }) => {
      const response = await saasApiRequest('PUT', `/api/saas/billing/payments/${paymentId}/status`, {
        status,
        transactionId
      });
      if (!response.ok) throw new Error('Failed to update payment status');
      return response.json();
    },
    onSuccess: () => {
      setModalMessage("Payment status updated successfully");
      setIsSuccessModalOpen(true);
      setShowStatusEditDialog(false);
      setSelectedPaymentForEdit(null);
      refetchData();
      refetchStats();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (selectedPaymentForEdit) {
      updatePaymentStatusMutation.mutate({
        paymentId: selectedPaymentForEdit.id,
        status: newStatus
      });
    }
  };

  const handleShareInvoice = (payment: any) => {
    setShareTargetPayment(payment);
    setIsShareDialogOpen(true);
  };

  const handleStatusEdit = (payment: any) => {
    setSelectedPaymentForEdit(payment);
    setShowStatusEditDialog(true);
  };

  // Suspend unpaid subscriptions mutation
  const suspendUnpaidMutation = useMutation({
    mutationFn: async () => {
      const response = await saasApiRequest('POST', '/api/saas/billing/suspend-unpaid');
      if (!response.ok) throw new Error('Failed to suspend unpaid subscriptions');
      return response.json();
    },
    onSuccess: () => {
      setModalMessage("Unpaid subscriptions suspended successfully");
      setIsSuccessModalOpen(true);
      refetchData();
      refetchStats();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handle invoice viewing and printing
  const handleViewInvoice = (payment: any) => {
    setSelectedInvoice({
      ...payment,
      organizationAddress: `${payment.organizationName}\nHealthcare Organization\nUnited Kingdom`, // Default address format
      lineItems: [
        {
          description: payment.description || 'Cura EMR Software Subscription',
          quantity: 1,
          unitPrice: parseFloat(payment.amount),
          total: parseFloat(payment.amount)
        }
      ]
    });
    setShowInvoiceDialog(true);
  };

  const handlePrintInvoice = () => {
    if (invoiceRef.current) {
      const printContent = invoiceRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const VAT_RATE = 0.2;
  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getAmountWithVAT = (value?: string | number) => {
    const subtotal = Number(value ?? 0);
    const vatAmount = Number((subtotal * VAT_RATE).toFixed(2));
    const totalWithVAT = Number((subtotal + vatAmount).toFixed(2));
    return { subtotal, vatAmount, totalWithVAT };
  };

const formatDateTime = (value?: string | Date | null) => {
  const parts = parseDateParts(value);
  if (!parts) return "Not set";
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const period = parts.hour >= 12 ? "pm" : "am";
  const minute = parts.minute.toString().padStart(2, "0");
  return `${parts.day.toString().padStart(2, "0")} ${monthNames[parts.month]} ${parts.year}, ${hour12}:${minute} ${period}`;
};

const formatDaysActive = (value?: number | null) => {
  if (value === null || value === undefined) return "—";
  return `${value} day${value === 1 ? "" : "s"}`;
};

const formatDurationDays = (start?: string, end?: string) => {
  if (!start || !end) return "Not set";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "Not set";
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return "Invalid";
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? "" : "s"}`;
};

const formatGracePeriod = (value?: number | null) => {
  if (value === null || value === undefined) return "Not set";
  if (value === 0) return "None";
  return `${value} day${value === 1 ? "" : "s"}`;
};

const formatReminderTimestamp = (timestamp?: string) => {
  if (!timestamp) return "Not sent yet";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const addDays = (value: Date, days: number) => {
  const copy = new Date(value);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const billingCycleDurations: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  "half-yearly": 6,
  yearly: 12,
  "2 years": 24,
  "3 years": 36,
};

  const getSelectedPackage = () => {
    return subscriptionPackages?.find((pkg: any) => String(pkg.id) === subscriptionForm.packageId);
  };

  const getSelectedOrganization = () => {
    return organizationOptions?.find((org: any) => String(org.id) === subscriptionForm.organizationId);
  };

  const formatDaysLeft = (value?: number | null) => {
    if (value === null || value === undefined) return "Not set";
    if (value <= 0) return value === 0 ? "Expiring today" : `${Math.abs(value)} day${Math.abs(value) === 1 ? "" : "s"} overdue`;
    return `${value} day${value === 1 ? "" : "s"} left`;
  };

  const formatTimeLeft = (dueDate?: string) => {
    if (!dueDate) return "Not set";
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return "Invalid date";
    const diffMs = due.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return `Overdue by ${days > 0 ? `${days}d ` : ""}${hours}h`;
    }

    if (diffMs < 1000 * 60 * 60) {
      return `Expires in ${Math.ceil(diffMs / (1000 * 60))}m`;
    }
    if (diffMs < 1000 * 60 * 60 * 24) {
      return `Expires in ${hours}h ${minutes}m`;
    }

    return `${days}d ${hours}h left`;
  };

  const selectedPackage = getSelectedPackage();
  const selectedPackageFeatures = formatPackageFeatures(selectedPackage?.features);

const getReminderEntries = (metadata?: any) => {
  const reminders = metadata?.expiryReminders || {};
  return REMINDER_LEVELS.map((level) => ({
    key: level.key,
    label: level.label,
    timestamp: reminders[level.key] ? formatReminderTimestamp(reminders[level.key]) : "Not sent yet",
  }));
};

  const toDateTimeLocal = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  };

  const validateSubscriptionForm = (): boolean => {
    const errors: Record<string, string> = {};
    const org = getSelectedOrganization();
    const pkg = getSelectedPackage();
    const {
      organizationId,
      packageId,
      status,
      paymentStatus,
      currentPeriodStart,
      currentPeriodEnd,
      expiresAt,
      maxUsers,
      maxPatients,
    } = subscriptionForm;

    if (!organizationId) {
      errors.organizationId = "Organization is required";
    } else if (!org) {
      errors.organizationId = "This organization is invalid";
    }

    if (!packageId) {
      errors.packageId = "Please select a package";
    } else if (!pkg) {
      errors.packageId = "Selected package is no longer available";
    }

    const validStatuses = ["active", "pending", "expired", "cancelled", "trial", "suspended"];
    if (!status || !validStatuses.includes(status)) {
      errors.status = "Invalid subscription status";
    }

    const validPayments = ["pending", "paid", "failed", "trial"];
    if (!paymentStatus || !validPayments.includes(paymentStatus)) {
      errors.paymentStatus = "Payment status is required";
    }

    if (!currentPeriodStart) {
      errors.currentPeriodStart = "Period start date is required";
    } else if (isNaN(new Date(currentPeriodStart).getTime())) {
      errors.currentPeriodStart = "Period start must be a valid date";
    }

    if (!currentPeriodEnd) {
      errors.currentPeriodEnd = "Period end date is required";
    } else if (isNaN(new Date(currentPeriodEnd).getTime())) {
      errors.currentPeriodEnd = "Period end must be a valid date";
    }

    if (currentPeriodStart && currentPeriodEnd) {
      const start = new Date(currentPeriodStart);
      const end = new Date(currentPeriodEnd);
      if (start > end) {
        errors.currentPeriodEnd = "Period end must be after period start";
      }
    }

    if (status === "active" && !currentPeriodStart) {
      errors.status = "Active subscription must have a start date";
    }

    if (paymentStatus === "paid" && status !== "active") {
      errors.paymentStatus = "Paid subscriptions must be active";
    }

    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        errors.expiresAt = "Expiration date must be valid";
      } else if (currentPeriodEnd && expiresDate < new Date(currentPeriodEnd)) {
        errors.expiresAt = "Expiration date cannot be before period end";
      }
    }

    if (maxUsers) {
      const num = Number(maxUsers);
      if (Number.isNaN(num) || num <= 0) {
        errors.maxUsers = "Max users must be greater than 0";
      }
    }

    if (maxPatients) {
      const num = Number(maxPatients);
      if (Number.isNaN(num) || num <= 0) {
        errors.maxPatients = "Max patients must be a valid number";
      }
    }

    const isCurrentlyActive = (subscription: any) => {
      if (!subscription) return false;
      const statusValue = typeof subscription.status === "string" ? subscription.status.toLowerCase() : "";
      if (statusValue !== "active") return false;
      if (!subscription.expiresAt) return true;
      const expires = new Date(subscription.expiresAt);
      return expires.getTime() > Date.now();
    };

    if (org && subscriptionsData && subscriptionDialogMode === "create") {
      const hasActive = subscriptionsData.some((subscription: any) => {
        return (
          Number(subscription.organizationId) === Number(org.id) &&
          isCurrentlyActive(subscription)
        );
      });
      if (hasActive) {
        errors.organizationId = "This organization already has an active subscription";
      }
    }

    setSubscriptionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExportPayments = () => {
    if (!billingData?.invoices || billingData.invoices.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no payments to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const csvHeaders = ['Invoice', 'Customer', 'Amount', 'Currency', 'Method', 'Status', 'Date'];
    
    const csvData = billingData.invoices.map((payment: any) => [
      payment.invoiceNumber,
      payment.organizationName || 'Unknown',
      parseFloat(payment.amount).toFixed(2),
      payment.currency || 'GBP',
      payment.paymentMethod.replace('_', ' '),
      payment.paymentStatus,
      formatDate(payment.createdAt)
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setModalMessage(`Exported ${billingData.invoices.length} payments to CSV file.`);
    setIsSuccessModalOpen(true);
  };

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await saasApiRequest('DELETE', `/api/saas/billing/payments/${paymentId}`);
      if (!response.ok) throw new Error('Failed to delete payment');
      return response.json();
    },
    onSuccess: () => {
      setModalMessage('Payment deleted successfully');
      setIsSuccessModalOpen(true);
      refetchData();
      refetchStats();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeletePayment = (paymentId: number) => {
    if (deletePaymentMutation.isPending) return;

    const confirmed = window.confirm("Delete this payment permanently?");
    if (!confirmed) return;

    deletePaymentMutation.mutate(paymentId);
  };

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      organizationId: "",
      packageId: "",
      status: "active",
      paymentStatus: "pending",
      currentPeriodStart: "",
      currentPeriodEnd: "",
      expiresAt: "",
      details: "",
      maxUsers: "",
      maxPatients: "",
    });
    setSelectedSubscription(null);
  };

  const handleOpenSubscriptionDialog = (mode: "create" | "edit", subscription?: any) => {
    setSubscriptionDialogMode(mode);
    if (mode === "edit" && subscription) {
      setSelectedSubscription(subscription);
      setSubscriptionForm({
        organizationId: String(subscription.organizationId),
        packageId: String(subscription.packageId),
        status: subscription.status || "active",
        paymentStatus: subscription.paymentStatus || "pending",
        currentPeriodStart: toDateTimeLocal(subscription.currentPeriodStart),
        currentPeriodEnd: toDateTimeLocal(subscription.currentPeriodEnd),
        expiresAt: toDateTimeLocal(subscription.expiresAt),
        details: subscription.details || "",
        maxUsers: subscription.maxUsers ? String(subscription.maxUsers) : "",
        maxPatients: subscription.maxPatients ? String(subscription.maxPatients) : "",
      });
    } else {
      resetSubscriptionForm();
    }
    setIsSubscriptionDialogOpen(true);
  };

  const createSubscriptionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await saasApiRequest('POST', '/api/saas/billing/subscriptions', payload);
      if (!response.ok) throw new Error('Failed to create subscription');
      return response.json();
    },
    onSuccess: () => {
      refetchSubscriptions();
      setModalMessage("Subscription created successfully");
      setIsSuccessModalOpen(true);
      setIsSubscriptionDialogOpen(false);
      resetSubscriptionForm();
    },
    onError: (error: Error) => {
      setModalMessage(error.message);
      setIsErrorModalOpen(true);
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const response = await saasApiRequest('PATCH', `/api/saas/billing/subscriptions/${id}`, payload);
      if (!response.ok) throw new Error('Failed to update subscription');
      return response.json();
    },
    onSuccess: () => {
      refetchSubscriptions();
      setModalMessage("Subscription updated successfully");
      setIsSuccessModalOpen(true);
      setIsSubscriptionDialogOpen(false);
      resetSubscriptionForm();
    },
    onError: (error: Error) => {
      setModalMessage(error.message);
      setIsErrorModalOpen(true);
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await saasApiRequest('DELETE', `/api/saas/billing/subscriptions/${id}`);
      if (!response.ok) throw new Error('Failed to delete subscription');
      return response.json();
    },
    onSuccess: () => {
      refetchSubscriptions();
      setModalMessage("Subscription deleted");
      setIsSuccessModalOpen(true);
    },
    onError: (error: Error) => {
      setModalMessage(error.message);
      setIsErrorModalOpen(true);
    },
  });

  // Cancel subscription mutation (SaaS Admin)
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, immediate }: { subscriptionId: number; immediate: boolean }) => {
      // Get organizationId from subscription for verification
      const subscription = subscriptionsData?.find((s: any) => s.id === subscriptionId);
      if (!subscription) throw new Error('Subscription not found');
      
      // Call SaaS admin cancel endpoint (uses /api/saas/admin/billing/cancel to avoid conflict with regular user route)
      const response = await saasApiRequest('POST', `/api/saas/admin/billing/cancel`, {
        subscriptionId,
        immediate,
        organizationId: subscription.organizationId, // Pass for verification
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to cancel subscription' }));
        throw new Error(errorData.error || errorData.message || 'Failed to cancel subscription');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchSubscriptions();
      refetchStats();
      setModalMessage("Subscription cancelled successfully");
      setIsSuccessModalOpen(true);
      setIsCancelSubscriptionDialogOpen(false);
      setSubscriptionToCancel(null);
    },
    onError: (error: Error) => {
      setModalMessage(error.message);
      setIsErrorModalOpen(true);
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ subscriptionId, level }: { subscriptionId: number; level: string }) => {
      const response = await saasApiRequest('POST', `/api/saas/billing/reminders/${subscriptionId}`, { level });
      if (!response.ok) throw new Error('Failed to send reminder');
      return response.json();
    },
    onSuccess: () => {
      refetchSubscriptions();
      setModalMessage("Reminder sent successfully");
      setIsSuccessModalOpen(true);
    },
    onError: (error: Error) => {
      setModalMessage(error.message);
      setIsErrorModalOpen(true);
    },
  });

  const shareInvoiceMutation = useMutation({
    mutationFn: async ({ paymentId, email }: { paymentId: number; email: string }) => {
      const response = await saasApiRequest('POST', `/api/saas/billing/payments/${paymentId}/share`, { email });
      if (!response.ok) throw new Error('Failed to share invoice');
      return response.json();
    },
    onSuccess: () => {
      setIsShareDialogOpen(false);
      setShareTargetPayment(null);
      setModalMessage("Invoice shared successfully");
      setIsSuccessModalOpen(true);
    },
    onError: (error: Error) => {
      setModalMessage(error.message);
      setIsErrorModalOpen(true);
    },
  });

  const handleManualReminderLevelChange = (subscriptionId: number, level: string) => {
    setManualReminderLevels((prev) => ({ ...prev, [subscriptionId]: level }));
  };

  const handleSendManualReminder = (subscriptionId: number) => {
    const level = manualReminderLevels[subscriptionId] || manualReminderDefault;
    setSendingReminderIds((prev) => ({ ...prev, [subscriptionId]: true }));
    sendReminderMutation.mutate({ subscriptionId, level }, {
      onSettled: () => {
        setSendingReminderIds((prev) => {
          const next = { ...prev };
          delete next[subscriptionId];
          return next;
        });
      },
    });
  };

  const handleShowReminderDetails = (subscription: any) => {
    setActiveReminderSubscription(subscription);
    setIsReminderDialogOpen(true);
  };

  useEffect(() => {
    if (!selectedPackage || subscriptionDialogMode !== "create") return;

    const startDate = new Date();
    const durationMonths =
      billingCycleDurations[(selectedPackage.billingCycle || "").toLowerCase()] || 1;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    const expiresDate = addDays(endDate, 7);

    let parsedFeatures: Record<string, any> = {};
    if (selectedPackage.features) {
      if (typeof selectedPackage.features === "string") {
        try {
          parsedFeatures = JSON.parse(selectedPackage.features);
        } catch {
          parsedFeatures = {};
        }
      } else {
        parsedFeatures = selectedPackage.features;
      }
    }

    const maxUsersValue =
      typeof parsedFeatures.maxUsers === "number" ? String(parsedFeatures.maxUsers) : "";
    const maxPatientsValue =
      typeof parsedFeatures.maxPatients === "number" ? String(parsedFeatures.maxPatients) : "";

    setSubscriptionForm((prev) => ({
      ...prev,
      currentPeriodStart: toDateTimeLocal(startDate),
      currentPeriodEnd: toDateTimeLocal(endDate),
      expiresAt: toDateTimeLocal(expiresDate),
      maxUsers: maxUsersValue,
      maxPatients: maxPatientsValue,
    }));
  }, [selectedPackage, subscriptionDialogMode]);

  useEffect(() => {
    if (!selectedPackage) return;

    let parsedFeatures: Record<string, any> = {};
    if (selectedPackage.features) {
      if (typeof selectedPackage.features === "string") {
        try {
          parsedFeatures = JSON.parse(selectedPackage.features);
        } catch {
          parsedFeatures = {};
        }
      } else {
        parsedFeatures = selectedPackage.features;
      }
    }

    const maxUsersValue =
      typeof parsedFeatures.maxUsers === "number" ? String(parsedFeatures.maxUsers) : subscriptionForm.maxUsers;
    const maxPatientsValue =
      typeof parsedFeatures.maxPatients === "number" ? String(parsedFeatures.maxPatients) : subscriptionForm.maxPatients;

    setSubscriptionForm((prev) => ({
      ...prev,
      maxUsers: maxUsersValue,
      maxPatients: maxPatientsValue,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackage?.id]);


  const handleSaveSubscription = () => {
    if (!validateSubscriptionForm()) return;
    const payload = {
      organizationId: Number(subscriptionForm.organizationId),
      packageId: Number(subscriptionForm.packageId),
      status: subscriptionForm.status,
      paymentStatus: subscriptionForm.paymentStatus,
      currentPeriodStart: subscriptionForm.currentPeriodStart || undefined,
      currentPeriodEnd: subscriptionForm.currentPeriodEnd || undefined,
      expiresAt: subscriptionForm.expiresAt || undefined,
      details: subscriptionForm.details || null,
      maxUsers: subscriptionForm.maxUsers ? Number(subscriptionForm.maxUsers) : undefined,
      maxPatients: subscriptionForm.maxPatients ? Number(subscriptionForm.maxPatients) : undefined,
    };

    if (subscriptionDialogMode === "edit" && selectedSubscription) {
      updateSubscriptionMutation.mutate({ id: selectedSubscription.id, payload });
    } else {
      createSubscriptionMutation.mutate(payload);
    }
  };

  const handleDeleteSubscription = (subscription: any) => {
    setSubscriptionToDelete(subscription);
    setIsSubscriptionDeleteDialogOpen(true);
  };
  const confirmDeleteSubscription = () => {
    if (!subscriptionToDelete) return;
    deleteSubscriptionMutation.mutate(subscriptionToDelete.id);
    setIsSubscriptionDeleteDialogOpen(false);
    setSubscriptionToDelete(null);
  };

  const handleCancelSubscription = (subscription: any) => {
    setSubscriptionToCancel(subscription);
    setIsCancelSubscriptionDialogOpen(true);
  };

  const confirmCancelSubscription = (immediate: boolean) => {
    if (!subscriptionToCancel) return;
    cancelSubscriptionMutation.mutate({
      subscriptionId: subscriptionToCancel.id,
      immediate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing & Payments</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive billing system with multi-payment method support
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => suspendUnpaidMutation.mutate()} variant="outline" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Suspend Unpaid
          </Button>
          <Dialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Payment</DialogTitle>
              </DialogHeader>
              <CreatePaymentForm 
                onSubmit={(data) => createPaymentMutation.mutate(data)}
                isLoading={createPaymentMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invoice Viewer Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Invoice #{selectedInvoice?.invoiceNumber}</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={handlePrintInvoice} variant="outline" size="sm" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button onClick={() => setShowInvoiceDialog(false)} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </div>

            {selectedPackage && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Package</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPackage.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPackage.billingCycle}</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(parseFloat(String(selectedPackage.price || 0)))}
                    </p>
                  </div>
                </div>
                {selectedPackage.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {selectedPackage.description}
                  </p>
                )}
                {selectedPackageFeatures.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-300">
                    {selectedPackageFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceTemplate ref={invoiceRef} invoice={selectedInvoice} />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-green-600 dark:text-green-400">Success</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{modalMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsSuccessModalOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
        <DialogContent className="sm:max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{modalMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsErrorModalOpen(false)} variant="destructive">OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reminder details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">
              {activeReminderSubscription
                ? `${activeReminderSubscription.organizationName || "Organization"} • ${activeReminderSubscription.packageName || "Package"}`
                : "Select a reminder row to see history"}
            </p>
            {getReminderEntries(activeReminderSubscription?.metadata).map((entry) => (
              <div key={entry.key} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{entry.label}</span>
                <span className="text-gray-700 dark:text-gray-300">{entry.timestamp}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsReminderDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={(open) => !open && setIsShareDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">
              {shareTargetPayment
                ? `Invoice ${shareTargetPayment.invoiceNumber} • ${shareTargetPayment.organizationName}`
                : "Select a payment to share"}
            </p>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Recipient Email</p>
              <p className="text-sm font-semibold text-gray-900">
                {shareTargetPayment?.organizationEmail || "Email not available"}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!shareTargetPayment?.organizationEmail) return;
                shareInvoiceMutation.mutate({
                  paymentId: shareTargetPayment.id,
                  email: shareTargetPayment.organizationEmail,
                });
              }}
              disabled={!shareTargetPayment?.organizationEmail || shareInvoiceMutation.isPending}
            >
              {shareInvoiceMutation.isPending ? "Sending..." : "Send email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubscriptionDialogOpen} onOpenChange={(open) => setIsSubscriptionDialogOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {subscriptionDialogMode === "edit" ? "Edit Subscription" : "Add New Subscription"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Organization</Label>
                <Select
                  value={subscriptionForm.organizationId}
                  onValueChange={(value) => setSubscriptionForm((prev) => ({ ...prev, organizationId: value }))}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationOptions && organizationOptions.length > 0 ? (
                      organizationOptions.map((org: any) => (
                        <SelectItem key={org.id} value={String(org.id)}>
                          {org.name} ({org.subdomain})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-organizations" disabled>
                        No organizations
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {subscriptionErrors.organizationId && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.organizationId}</p>
                )}
              </div>
              <div>
                <Label>Package</Label>
                <Select
                  value={subscriptionForm.packageId}
                  onValueChange={(value) => setSubscriptionForm((prev) => ({ ...prev, packageId: value }))}
                >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select package">
                    {selectedPackage ? `${selectedPackage.name} - £${selectedPackage.price}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                  <SelectContent>
                    {subscriptionPackages && subscriptionPackages.length > 0 ? (
                      subscriptionPackages.map((pkg: any) => (
                        <SelectItem key={pkg.id} value={String(pkg.id)}>
                          {pkg.name} - £{pkg.price}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-packages" disabled>
                        No packages
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {subscriptionErrors.packageId && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.packageId}</p>
                )}
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={subscriptionForm.status}
                    onValueChange={(value) => setSubscriptionForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  {subscriptionErrors.status && (
                    <p className="text-xs text-red-600 mt-1">{subscriptionErrors.status}</p>
                  )}
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={subscriptionForm.paymentStatus}
                    onValueChange={(value) => setSubscriptionForm((prev) => ({ ...prev, paymentStatus: value }))}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                  {subscriptionErrors.paymentStatus && (
                    <p className="text-xs text-red-600 mt-1">{subscriptionErrors.paymentStatus}</p>
                  )}
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="datetime-local"
                  value={subscriptionForm.currentPeriodStart}
                  onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, currentPeriodStart: e.target.value }))}
                />
                {subscriptionErrors.currentPeriodStart && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.currentPeriodStart}</p>
                )}
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="datetime-local"
                  value={subscriptionForm.currentPeriodEnd}
                  onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, currentPeriodEnd: e.target.value }))}
                />
                {subscriptionErrors.currentPeriodEnd && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.currentPeriodEnd}</p>
                )}
              </div>
              <div>
                <Label>Expires At</Label>
                <Input
                  type="datetime-local"
                  value={subscriptionForm.expiresAt}
                  onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                />
                {subscriptionErrors.expiresAt && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.expiresAt}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Includes 7-day grace period</p>
              </div>
            </div>

            {selectedPackage && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Package</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPackage.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPackage.billingCycle}</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(parseFloat(String(selectedPackage.price || 0)))}
                    </p>
                  </div>
                </div>
                {selectedPackage.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {selectedPackage.description}
                  </p>
                )}
                {selectedPackageFeatures.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-300">
                    {selectedPackageFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Max Users</Label>
                <Input
                  type="number"
                  min="0"
                  value={subscriptionForm.maxUsers}
                  readOnly
                  className="cursor-not-allowed bg-gray-50"
                />
                {subscriptionErrors.maxUsers && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.maxUsers}</p>
                )}
              </div>
              <div>
                <Label>Max Patients</Label>
                <Input
                  type="number"
                  min="0"
                  value={subscriptionForm.maxPatients}
                  readOnly
                  className="cursor-not-allowed bg-gray-50"
                />
                {subscriptionErrors.maxPatients && (
                  <p className="text-xs text-red-600 mt-1">{subscriptionErrors.maxPatients}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Details</Label>
              <Textarea
                value={subscriptionForm.details}
                onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, details: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsSubscriptionDialogOpen(false);
                resetSubscriptionForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSubscription}
              disabled={(createSubscriptionMutation.isPending && subscriptionDialogMode === "create") || (updateSubscriptionMutation.isPending && subscriptionDialogMode === "edit")}
            >
              {subscriptionDialogMode === "edit" ? "Save Changes" : "Create Subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSubscriptionDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsSubscriptionDeleteDialogOpen(open);
          if (!open) {
            setSubscriptionToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-gray-700">
            <p>
              Are you sure you want to delete the subscription for{" "}
              <strong>{subscriptionToDelete?.organizationName || "this organization"}</strong>?
            </p>
            <p className="text-xs text-gray-500">
              This will remove the billing record and cannot be undone. Please confirm to proceed.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSubscriptionDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (subscriptionToDelete) {
                  const id = subscriptionToDelete.id ?? subscriptionToDelete.subscriptionId;
                  if (typeof id !== "undefined") {
                    deleteSubscriptionMutation.mutate(Number(id));
                  }
                }
                setIsSubscriptionDeleteDialogOpen(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Edit Dialog */}
      <Dialog open={showStatusEditDialog} onOpenChange={setShowStatusEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedPaymentForEdit && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Invoice: <span className="font-mono font-semibold">{selectedPaymentForEdit.invoiceNumber}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Organization: <span className="font-semibold">{selectedPaymentForEdit.organizationName}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current Status: {getPaymentStatusBadge(selectedPaymentForEdit.paymentStatus)}
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Select New Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedPaymentForEdit.paymentStatus === 'pending' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('pending')}
                      disabled={updatePaymentStatusMutation.isPending}
                      className="w-full"
                      data-testid="button-status-pending"
                    >
                      Pending
                    </Button>
                    <Button
                      variant={selectedPaymentForEdit.paymentStatus === 'completed' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('completed')}
                      disabled={updatePaymentStatusMutation.isPending}
                      className="w-full"
                      data-testid="button-status-completed"
                    >
                      Completed
                    </Button>
                    <Button
                      variant={selectedPaymentForEdit.paymentStatus === 'failed' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('failed')}
                      disabled={updatePaymentStatusMutation.isPending}
                      className="w-full"
                      data-testid="button-status-failed"
                    >
                      Failed
                    </Button>
                    <Button
                      variant={selectedPaymentForEdit.paymentStatus === 'refunded' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('refunded')}
                      disabled={updatePaymentStatusMutation.isPending}
                      className="w-full"
                      data-testid="button-status-refunded"
                    >
                      Refunded
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStatusEditDialog(false);
                setSelectedPaymentForEdit(null);
              }}
              disabled={updatePaymentStatusMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoicesHistory">Invoices History</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="subscriptionHistory">Subscription History</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <span className="h-4 w-4 text-muted-foreground flex items-center justify-center text-sm font-bold">
                  {currencySymbol}
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.totalRevenue || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.monthlyRecurring || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">MRR estimate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.pendingPayments || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.overduePayments || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Past due</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {billingStats?.paymentMethods?.stripe || 0}
                  </div>
                  <p className="text-sm text-gray-600">Stripe</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {billingStats?.paymentMethods?.paypal || 0}
                  </div>
                  <p className="text-sm text-gray-600">PayPal</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {billingStats?.paymentMethods?.bankTransfer || 0}
                  </div>
                  <p className="text-sm text-gray-600">Bank Transfer</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {billingStats?.paymentMethods?.cash || 0}
                  </div>
                  <p className="text-sm text-gray-600">Cash</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <p className="text-xs text-gray-500">Last 5 records</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Organization</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">
                          No payments yet
                        </td>
                      </tr>
                    ) : (
                      recentPayments.map((payment: any) => (
                        <tr key={payment.id} className="border-b">
                          <td className="py-2">{payment.organizationName || "Unknown"}</td>
                          <td className="py-2">{formatCurrency(Number(payment.amount || 0), payment.currency)}</td>
                          <td className="py-2 capitalize">{payment.paymentMethod?.replace("_", " ")}</td>
                          <td className="py-2">{formatDateTime(payment.paymentDate || payment.createdAt)}</td>
                          <td className="py-2">
                            {getPaymentStatusBadge(payment.paymentStatus || "pending")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {overviewAlerts.map((alert) => (
                <Card key={alert.label}>
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-500">{alert.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-semibold ${insightColorClass(alert.color)}`}>
                      {alert.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Payments</Label>
              <Input
                id="search"
                placeholder="Search by customer, invoice, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Payments</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleExportPayments}
                  disabled={dataLoading || !billingData?.invoices?.length}
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="max-h-[640px] overflow-y-auto">
                    <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Invoice</th>
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Method</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Created At</th>
                        <th className="text-left py-2 px-3">Invoice Date</th>
                        <th className="text-left py-2 px-3">Due Date</th>
                        <th className="text-left py-2 px-3">Time Left</th>
                        <th className="text-left py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePayments?.length > 0 ? (
                        visiblePayments.map((payment: any) => {
                          const statusLower = (payment.paymentStatus || "").toLowerCase();
                          const isPending = statusLower === "pending";
                          const isOverdue =
                            payment.dueDate && new Date(payment.dueDate).getTime() < Date.now() && isPending;
                          return (
                            <tr
                              key={payment.id}
                              className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                isOverdue ? "bg-red-50 dark:bg-red-900/10" : ""
                              }`}
                            >
                              <td className="py-3 px-3">
                                <span className="font-mono text-sm">{payment.invoiceNumber}</span>
                              </td>
                              <td className="py-3 px-3">{payment.organizationName || 'Unknown'}</td>
                            <td className="py-3 px-3">
                              {(() => {
                                const { totalWithVAT, vatAmount } = getAmountWithVAT(payment.amount);
                                return (
                                  <div>
                                    <div className="font-semibold">
                                      {formatCurrency(totalWithVAT, payment.currency)}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      Incl. {formatCurrency(vatAmount, payment.currency)} VAT (20%)
                                    </p>
                                  </div>
                                );
                              })()}
                            </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  {getPaymentMethodIcon(payment.paymentMethod)}
                                  <span className="capitalize">
                                    {payment.paymentMethod.replace('_', ' ')}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  {getPaymentStatusBadge(payment.paymentStatus)}
                                  {isOverdue && (
                                    <Badge variant="destructive">Overdue</Badge>
                                  )}
                                </div>
                              </td>
                            <td className="py-3 px-3 text-sm text-gray-600">
                              {formatDateTime(payment.paymentDate || payment.createdAt)}
                            </td>
                              <td className="py-3 px-3 text-sm text-gray-600">
                                {formatDateTime(payment.createdAt)}
                              </td>
                              <td
                                className={`py-3 px-3 text-sm ${
                                  isOverdue ? "text-red-600 font-semibold" : ""
                                }`}
                              >
                                {formatDateTime(payment.dueDate)}
                              </td>
                              <td className="py-3 px-3 text-sm">
                                {isPending ? formatTimeLeft(payment.dueDate) : "—"}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleViewInvoice(payment)}
                                    title="View Invoice"
                                    data-testid={`button-view-invoice-${payment.id}`}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleShareInvoice(payment)}
                                    title="Share Invoice"
                                    data-testid={`button-share-invoice-${payment.id}`}
                                  >
                                    <Share className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleStatusEdit(payment)}
                                    title="Edit Status"
                                    data-testid={`button-edit-status-${payment.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePayment(payment.id)}
                                    title="Delete Payment"
                                    data-testid={`button-delete-payment-${payment.id}`}
                                    disabled={deletePaymentMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-gray-500">
                            No payments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoicesHistory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoices History</CardTitle>
              <p className="text-sm text-gray-500">All past invoices (older than the latest per organization).</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Invoice</th>
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Method</th>
                        <th className="text-left py-2 px-3">Created At</th>
                        <th className="text-left py-2 px-3">Due Date</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                    {invoiceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-500">
                          No historical invoices yet.
                        </td>
                      </tr>
                    ) : (
                      invoiceHistory.map((invoice: any) => {
                        const { totalWithVAT, vatAmount } = getAmountWithVAT(invoice.amount);
                        return (
                          <tr key={invoice.id} className="border-b">
                            <td className="py-3 px-3">
                              <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div>{invoice.organizationName || "Unknown"}</div>
                              <div className="text-xs text-gray-500">{invoice.organizationEmail}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div>{formatCurrency(totalWithVAT, invoice.currency)}</div>
                              <p className="text-xs text-gray-500">
                                Incl. {formatCurrency(vatAmount, invoice.currency)} VAT
                              </p>
                            </td>
                            <td className="py-3 px-3 capitalize">{invoice.paymentMethod?.replace("_", " ") || "—"}</td>
                            <td className="py-3 px-3 text-sm">{formatDateTime(invoice.createdAt)}</td>
                            <td className="py-3 px-3 text-sm">{formatDateTime(invoice.dueDate)}</td>
                            <td className="py-3 px-3">
                              {getPaymentStatusBadge(invoice.paymentStatus || "pending")}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} title="View Invoice">
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleShareInvoice(invoice)} title="Share Invoice">
                                  <Share className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Overdue Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Invoice</th>
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Created At</th>
                        <th className="text-left py-2 px-3">Due Date</th>
                        <th className="text-left py-2 px-3">Time Left</th>
                        <th className="text-left py-2 px-3">Days Overdue</th>
                        <th className="text-left py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overduePayments.length > 0 ? (
                        overduePayments.map((invoice: any) => {
                          const { totalWithVAT, vatAmount } = getAmountWithVAT(invoice.amount);
                          const timeText = formatTimeLeft(invoice.dueDate);
                          const isPending = (invoice.paymentStatus || "pending").toLowerCase() === "pending";
                          return (
                            <tr
                              key={invoice.id}
                              className="border-b hover:bg-red-50 dark:hover:bg-red-900/10"
                            >
                              <td className="py-3 px-3">
                                <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                              </td>
                              <td className="py-3 px-3">{invoice.organizationName}</td>
                              <td className="py-3 px-3 font-semibold text-red-600">
                                <div>{formatCurrency(totalWithVAT, invoice.currency)}</div>
                                <p className="text-xs text-gray-400">
                                  Incl. {formatCurrency(vatAmount, invoice.currency)} VAT (20%)
                                </p>
                              </td>
                            <td className="py-3 px-3 text-sm">{formatDate(invoice.createdAt)}</td>
                          <td className="py-3 px-3 text-sm">{formatDateTime(invoice.dueDate)}</td>
                              <td className="py-3 px-3 text-sm">{timeText}</td>
                              <td className="py-3 px-3">
                                <Badge variant="destructive">{invoice.daysPastDue ?? "—"} days</Badge>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewInvoice(invoice)}
                                    title="View Invoice"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleShareInvoice(invoice)}
                                    title="Share Invoice"
                                  >
                                    <Share className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusEdit(invoice)}
                                    title="Edit Status"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePayment(invoice.id)}
                                    title="Delete Payment"
                                    disabled={deletePaymentMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-500">
                            No overdue invoices
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscriptions</h3>
              <p className="text-sm text-gray-500">Manage all SaaS subscriptions.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleOpenSubscriptionDialog("create")}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Subscription
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All SaaS Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-3 text-left">Organization</th>
                        <th className="py-2 px-3 text-left">Package</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3 text-left">Payment</th>
                        <th className="py-2 px-3 text-left">Period Start</th>
                        <th className="py-2 px-3 text-left">Period End</th>
                        <th className="py-2 px-3 text-left">Duration</th>
                        <th className="py-2 px-3 text-left">Grace Period</th>
                        <th className="py-2 px-3 text-left">Expires (Grace)</th>
                        <th className="py-2 px-3 text-left">Days Left</th>
                        <th className="py-2 px-3 text-left">Reminders</th>
                        <th className="py-2 px-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionsData?.length ? (
                        subscriptionsData.map((subscription: any) => (
                          <tr
                            key={subscription.id}
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/60"
                          >
                            <td className="py-3 px-3">
                              <div className="font-medium">{subscription.organizationName || "N/A"}</div>
                              <div className="text-xs text-gray-500">{subscription.organizationId}</div>
                            </td>
                            <td className="py-3 px-3">{subscription.packageName || "Unassigned"}</td>
                            <td className="py-3 px-3">{getSubscriptionBadge(subscription.status || "active")}</td>
                            <td className="py-3 px-3">
                              {getPaymentStatusBadge(subscription.paymentStatus || "pending")}
                            </td>
                            <td className="py-3 px-3 text-sm">{formatDateTime(subscription.currentPeriodStart)}</td>
                            <td className="py-3 px-3 text-sm">{formatDateTime(subscription.currentPeriodEnd)}</td>
                            <td className="py-3 px-3 text-sm">
                              {formatDurationDays(subscription.currentPeriodStart, subscription.currentPeriodEnd)}
                            </td>
                            <td className="py-3 px-3 text-sm">
                              {formatGracePeriod(subscription.gracePeriodDays)}
                            </td>
                            <td className="py-3 px-3 text-sm">{formatDateTime(subscription.expiresAt)}</td>
                            <td className="py-3 px-3 text-sm">
                              {formatDaysLeft(subscription.daysRemaining)}
                            </td>
                            <td className="py-3 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowReminderDetails(subscription)}
                                title="View reminder history"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenSubscriptionDialog("edit", subscription)}
                                  title="Edit Subscription"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {(subscription.status === 'active' || subscription.status === 'trial') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelSubscription(subscription)}
                                    title="Cancel Subscription"
                                    disabled={cancelSubscriptionMutation.isPending}
                                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSubscription(subscription)}
                                  title="Delete Subscription"
                                  disabled={deleteSubscriptionMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={12} className="text-center py-8 text-gray-500">
                            No subscriptions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptionHistory" className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription History</h3>
              <p className="text-sm text-gray-500">Complete audit trail of all subscription changes across all organizations.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Subscription Changes</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-3 text-left">Date & Time</th>
                        <th className="py-2 px-3 text-left">Organization</th>
                        <th className="py-2 px-3 text-left">Action</th>
                        <th className="py-2 px-3 text-left">From Package</th>
                        <th className="py-2 px-3 text-left">To Package</th>
                        <th className="py-2 px-3 text-left">Billing Cycle</th>
                        <th className="py-2 px-3 text-left">Price Change</th>
                        <th className="py-2 px-3 text-left">Performed By</th>
                        <th className="py-2 px-3 text-left">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionHistory?.length ? (
                        subscriptionHistory.map((item: any) => {
                          const actionColors: Record<string, string> = {
                            upgrade: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
                            downgrade: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
                            cancel: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
                            change_cycle: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
                            renew: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
                            create: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
                            update: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
                          };

                          const formatDateTime = (date: string | Date) => {
                            if (!date) return "N/A";
                            const d = new Date(date);
                            return d.toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          };

                          const formatPrice = (price: string | number | null) => {
                            if (!price) return "N/A";
                            const numPrice = typeof price === "string" ? parseFloat(price) : price;
                            return `£${numPrice.toFixed(2)}`;
                          };

                          return (
                            <tr
                              key={item.id}
                              className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/60"
                            >
                              <td className="py-3 px-3 text-sm">{formatDateTime(item.createdAt)}</td>
                              <td className="py-3 px-3">
                                <div className="font-medium">{item.organizationName || "N/A"}</div>
                                <div className="text-xs text-gray-500">{item.organizationSubdomain || ""}</div>
                              </td>
                              <td className="py-3 px-3">
                                <Badge className={actionColors[item.action] || "bg-gray-100 text-gray-800"}>
                                  {item.action.charAt(0).toUpperCase() + item.action.slice(1).replace("_", " ")}
                                </Badge>
                              </td>
                              <td className="py-3 px-3">{item.oldPackageName || "N/A"}</td>
                              <td className="py-3 px-3">{item.newPackageName || "N/A"}</td>
                              <td className="py-3 px-3">
                                {item.oldBillingCycle && item.newBillingCycle ? (
                                  <span>
                                    {item.oldBillingCycle} → {item.newBillingCycle}
                                  </span>
                                ) : (
                                  item.oldBillingCycle || item.newBillingCycle || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {item.oldPrice && item.newPrice ? (
                                  <span>
                                    {formatPrice(item.oldPrice)} → {formatPrice(item.newPrice)}
                                  </span>
                                ) : (
                                  item.oldPrice ? formatPrice(item.oldPrice) : item.newPrice ? formatPrice(item.newPrice) : "N/A"
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="text-xs">
                                  <div className="font-medium">{item.performedByType === "saas_admin" ? "SaaS Admin" : "Org Admin"}</div>
                                  {item.details?.reason && (
                                    <div className="text-gray-500 mt-1">{item.details.reason}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="text-xs space-y-1">
                                  {item.details?.prorationAmount && (
                                    <div>Proration: £{item.details.prorationAmount.toFixed(2)}</div>
                                  )}
                                  {item.details?.immediate !== undefined && (
                                    <div>{item.details.immediate ? "Immediate" : "At period end"}</div>
                                  )}
                                  {item.details?.effectiveDate && (
                                    <div>Effective: {formatDateTime(item.details.effectiveDate)}</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-gray-500">
                            No subscription history found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reminders</h3>
              <p className="text-sm text-gray-500">See reminder history and trigger new notices.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manual Reminder Controls</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-3 text-left">Organization</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3 text-left">Payment</th>
                        <th className="py-2 px-3 text-left">Expires (Grace)</th>
                        <th className="py-2 px-3 text-left">Reminders</th>
                        <th className="py-2 px-3 text-left">Manual send</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionsData?.length ? (
                        subscriptionsData.map((subscription: any) => {
                          const manualLevel =
                            manualReminderLevels[subscription.id] || manualReminderDefault;
                          return (
                            <tr
                              key={subscription.id}
                              className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/60"
                            >
                              <td className="py-3 px-3">
                                <div className="font-medium">{subscription.organizationName || "N/A"}</div>
                                <div className="text-xs text-gray-500">{subscription.organizationId}</div>
                              </td>
                              <td className="py-3 px-3">
                                {getSubscriptionBadge(subscription.status || "active")}
                              </td>
                              <td className="py-3 px-3">
                                {getPaymentStatusBadge(subscription.paymentStatus || "pending")}
                              </td>
                              <td className="py-3 px-3">{formatDateTime(subscription.expiresAt)}</td>
                            <td className="py-3 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowReminderDetails(subscription)}
                                title="View reminder history"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                              <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Select
                                  className="w-32"
                                  value={manualLevel}
                                  onValueChange={(value) =>
                                    handleManualReminderLevelChange(subscription.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-full mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {REMINDER_LEVELS.map((level) => (
                                      <SelectItem key={level.key} value={level.key}>
                                        {level.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => handleSendManualReminder(subscription.id)}
                                  disabled={sendingReminderIds[subscription.id] || sendReminderMutation.isPending}
                                  className="px-3 py-1"
                                >
                                  {sendReminderMutation.isPending ? "Sending..." : "Send"}
                                </Button>
                              </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No subscriptions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4 items-end">
              <div>
                <p className="text-sm font-medium text-gray-500">Organization</p>
                <Select
                  value={analyticsOrgFilter}
                  onValueChange={setAnalyticsOrgFilter}
                  className="mt-1 w-full"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All organizations</SelectItem>
                    {organizationOptions.map((org: any) => (
                      <SelectItem key={org.id} value={org.name}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Package</p>
                <Select
                  value={analyticsPackageFilter}
                  onValueChange={setAnalyticsPackageFilter}
                  className="mt-1 w-full"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All packages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All packages</SelectItem>
                    {subscriptionPackages?.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={String(pkg.id)}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Method</p>
                <Select
                  value={analyticsPaymentMethodFilter}
                  onValueChange={setAnalyticsPaymentMethodFilter}
                  className="mt-1 w-full"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {Array.from(
                      new Set(
                        (billingData?.invoices || []).map(
                          (payment: any) => payment.paymentMethod || "Unknown",
                        ),
                      ),
                    ).map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-500">
                <p className="font-medium">Date Range</p>
                <p className="mt-1 text-gray-600">{`Last ${rangeDays} days`}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {[
                { label: "Total Revenue", value: formatCurrency(totalRevenue) },
                { label: "Paid Amount", value: formatCurrency(paidAmount) },
                { label: "Outstanding", value: formatCurrency(outstandingAmount) },
                { label: "Overdue", value: formatCurrency(overdueAmount) },
              ].map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">{card.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <p className="text-sm text-gray-500">
                    {formatPercentage(revenueChangePercent)} vs last period
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-40 rounded-md bg-gradient-to-r from-blue-100 to-blue-50 flex items-center justify-center text-sm text-gray-500">
                    Placeholder for daily / weekly / monthly trend chart
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Object.entries(paymentMethodTotals).length === 0 ? (
                    <p className="text-sm text-gray-500">No payment data yet.</p>
                  ) : (
                    Object.entries(paymentMethodTotals).map(([method, amount]) => {
                      const percentage =
                          totalMethodSum === 0 ? 0 : (amount / totalMethodSum) * 100;
                      return (
                        <div key={method}>
                          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                            <span>{method}</span>
                            <span>{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(invoiceStatusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                  <div className="mt-4 text-xs text-gray-500">
                    Bonus: Average Invoice Value {formatCurrency(totalRevenue / Math.max(1, currentPeriodInvoices.length))}
                  </div>
                  <div className="text-xs text-gray-500">
                    Average Payment Time {paymentBehavior.avgDelay} days
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Aging Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(agingBuckets).map(([bucket, count]) => (
                    <div key={bucket} className="flex items-center justify-between text-sm">
                      <span>{bucket} days</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Paying Organizations</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Organization</th>
                        <th className="py-2 text-right">Paid</th>
                        <th className="py-2 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topOrganizations.slice(0, 5).map((org) => (
                        <tr key={org.name}>
                          <td className="py-2">{org.name}</td>
                          <td className="py-2 text-right">{formatCurrency(org.paid)}</td>
                          <td className="py-2 text-right">{formatCurrency(org.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    On-time payers: <strong>{paymentBehavior.onTime}</strong>
                  </div>
                  <div className="text-sm">
                    Late payers: <strong>{paymentBehavior.late}</strong>
                  </div>
                  <div className="text-sm">
                    Average delay: <strong>{paymentBehavior.avgDelay} days</strong>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Payment success rate: {(paymentsSuccessRate * 100).toFixed(1)}%
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(paymentsSuccessRate * 100).toFixed(1)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {insightCards.map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">{card.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-semibold ${insightColorClass(card.color)}`}>{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Cancel Subscription Dialog */}
      <Dialog
        open={isCancelSubscriptionDialogOpen}
        onOpenChange={(open) => {
          setIsCancelSubscriptionDialogOpen(open);
          if (!open) {
            setSubscriptionToCancel(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Are you sure?</p>
                <p className="text-sm">
                  Cancelling the subscription for{" "}
                  <strong>{subscriptionToCancel?.organizationName || "this organization"}</strong> will downgrade
                  their account to the Basic (free) plan.
                </p>
                {subscriptionToCancel?.currentPeriodEnd && (
                  <p className="text-sm mt-2">
                    The subscription will remain active until{" "}
                    <strong>
                      {new Date(subscriptionToCancel.currentPeriodEnd).toLocaleDateString()}
                    </strong>
                    .
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelSubscriptionDialogOpen(false);
                setSubscriptionToCancel(null);
              }}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmCancelSubscription(false)}
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? "Processing..." : "Cancel at Period End"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Payment Form Component
interface CreatePaymentFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CreatePaymentForm({ onSubmit, isLoading }: CreatePaymentFormProps) {
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    organizationId: '',
    organizationName: '',
    amount: '',
    currency: 'GBP',
    paymentMethod: 'stripe',
    description: '',
    dueDate: '',
  });

  // Fetch organizations for dropdown
  const { data: organizations } = useQuery({
    queryKey: ['/api/saas/organizations'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      return response.json();
    },
  });

  // Format organizations for react-select
  const organizationOptions = organizations?.map((org: any) => ({
    value: org.id,
    label: org.name,
    subdomain: org.subdomain,
  })) || [];

  // Handle organization selection
  const handleOrganizationChange = async (selectedOption: any) => {
    setSelectedOrganization(selectedOption);
    setValidationError('');
    setSubscriptionData(null);

    if (!selectedOption) {
      setFormData({
        organizationId: '',
        organizationName: '',
        amount: '',
        currency: 'GBP',
        paymentMethod: 'stripe',
        description: '',
        dueDate: '',
      });
      return;
    }

    setIsCheckingSubscription(true);

    try {
      const response = await saasApiRequest('GET', `/api/saas/organizations/${selectedOption.value}/subscription`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setValidationError(errorData.message || 'No active subscription found for this organization.');
        toast({
          variant: "destructive",
          title: "No Active Subscription",
          description: "This organization does not have an active subscription. Payment creation is disabled.",
        });
        return;
      }

      const subscription = await response.json();

      if (!subscription.hasActiveSubscription) {
        setValidationError('This organization does not have an active subscription. Payment creation is disabled.');
        toast({
          variant: "destructive",
          title: "Inactive Subscription",
          description: `Subscription status: ${subscription.status}`,
        });
        return;
      }

      // Subscription is active - populate form
      setSubscriptionData(subscription);
      
      // Auto-populate form fields
      const billingAmount = subscription.packagePrice || '0';
      const billingCycle = subscription.billingCycle || 'monthly';
      
      setFormData({
        organizationId: selectedOption.value.toString(),
        organizationName: selectedOption.label,
        amount: billingAmount,
        currency: 'GBP',
        paymentMethod: 'stripe',
        description: `${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} subscription payment - ${subscription.packageName}`,
        dueDate: '',
      });

      toast({
        title: "Subscription Verified",
        description: `Active ${subscription.packageName} subscription found. Form auto-populated.`,
      });

    } catch (error: any) {
      console.error('Error validating subscription:', error);
      setValidationError('Failed to validate organization subscription.');
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Could not verify subscription status. Please try again.",
      });
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validationError) {
      toast({
        variant: "destructive",
        title: "Cannot Create Payment",
        description: validationError,
      });
      return;
    }

    onSubmit({
      organizationId: parseInt(formData.organizationId),
      organizationName: formData.organizationName,
      amount: parseFloat(formData.amount).toString(),
      currency: formData.currency,
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString(),
      paymentStatus: 'pending'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="organizationId">Organization *</Label>
        <ReactSelect
          id="organizationId"
          options={organizationOptions}
          value={selectedOrganization}
          onChange={handleOrganizationChange}
          placeholder="Search and select organization..."
          isClearable
          isSearchable
          isLoading={isCheckingSubscription}
          isDisabled={isLoading}
          className="mt-1"
          classNamePrefix="react-select"
          styles={{
            control: (base) => ({
              ...base,
              borderColor: validationError ? '#ef4444' : base.borderColor,
              '&:hover': {
                borderColor: validationError ? '#ef4444' : base.borderColor,
              },
            }),
          }}
        />
        {isCheckingSubscription && (
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Validating subscription status...
          </p>
        )}
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {subscriptionData && !validationError && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <AlertDescription className="text-green-800 dark:text-green-200">
            ✓ Active subscription verified: {subscriptionData.packageName} ({subscriptionData.billingCycle})
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            disabled={!selectedOrganization || !!validationError}
            required
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
            disabled={!selectedOrganization || !!validationError}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <Select 
          value={formData.paymentMethod} 
          onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
          disabled={!selectedOrganization || !!validationError}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date &amp; Time *</Label>
        <Input
          id="dueDate"
          type="datetime-local"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          disabled={!selectedOrganization || !!validationError}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Payment description..."
          disabled={!selectedOrganization || !!validationError}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="submit" 
          disabled={isLoading || !selectedOrganization || !!validationError || isCheckingSubscription}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Create Payment
        </Button>
      </div>
    </form>
  );
}