import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Crown, Users, Calendar, Zap, Check, X, Package, Heart, Brain, Shield, Stethoscope, Phone, FileText, Activity, Pill, UserCheck, TrendingUp, Download, CreditCard, Printer, AlertTriangle, User, Trash2 } from "lucide-react";
import { PaymentMethodDialog } from "@/components/payment-method-dialog";
import { getTenantSubdomain, queryClient, apiRequest } from "@/lib/queryClient";
import InvoiceTemplate from "@/pages/saas/components/InvoiceTemplate";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useCurrency } from "@/hooks/use-currency";
import type { Subscription } from "@/types";
import type { SaaSPackage } from "@shared/schema";

// Plans are now fetched from database - see dbPackages query below

// Helper function to map package names to icons
const getPackageIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('telehealth') || lowerName.includes('video') || lowerName.includes('phone')) return Phone;
  if (lowerName.includes('ai') || lowerName.includes('brain') || lowerName.includes('clinical')) return Brain;
  if (lowerName.includes('cardio') || lowerName.includes('heart')) return Heart;
  if (lowerName.includes('pharmacy') || lowerName.includes('drug') || lowerName.includes('medication')) return Pill;
  if (lowerName.includes('analytics') || lowerName.includes('reporting') || lowerName.includes('activity')) return Activity;
  if (lowerName.includes('patient') || lowerName.includes('portal')) return UserCheck;
  if (lowerName.includes('security') || lowerName.includes('hipaa') || lowerName.includes('compliance')) return Shield;
  if (lowerName.includes('specialty') || lowerName.includes('stethoscope')) return Stethoscope;
  if (lowerName.includes('document') || lowerName.includes('file')) return FileText;
  return Package; // Default icon
};

// Helper function to convert database features to array of strings
const formatPackageFeatures = (features: any): string[] => {
  if (!features) return [];

  const featureList: string[] = [];

  if (features.maxUsers) featureList.push(`Up to ${features.maxUsers} users`);
  if (features.maxPatients) featureList.push(`Up to ${features.maxPatients} patients`);
  if (features.aiEnabled) featureList.push('AI-powered insights');
  if (features.telemedicineEnabled) featureList.push('Telemedicine support');
  if (features.billingEnabled) featureList.push('Advanced billing');
  if (features.analyticsEnabled) featureList.push('Analytics & reporting');
  if (features.customBranding) featureList.push('Custom branding');
  if (features.prioritySupport) featureList.push('Priority support');
  if (features.storageGB) featureList.push(`${features.storageGB}GB storage`);
  if (features.apiCallsPerMonth) featureList.push(`${features.apiCallsPerMonth.toLocaleString()} API calls/month`);

  return featureList;
};

const getCountdown = (target?: string | Date | null) => {
  if (!target) return { label: "N/A", isDanger: false };
  
  // Parse the target date - handle both Date objects and strings
  let targetDate: Date;
  if (target instanceof Date) {
    targetDate = target;
  } else {
    // Parse string - treat as UTC to match database storage
    const str = String(target).trim();
    const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(str);
    
    if (hasTimezone) {
      targetDate = new Date(str);
    } else {
      // No timezone indicator - parse manually and treat as UTC
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
      if (isoMatch) {
        const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
        // Use Date.UTC to create date in UTC timezone
        targetDate = new Date(Date.UTC(
          Number(y),
          Number(mo) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          ss ? Number(ss) : 0,
          ms ? Number(ms.substring(0, 3)) : 0
        ));
      } else {
        // Fallback: try standard parsing
        targetDate = new Date(str);
      }
    }
  }
  
  if (Number.isNaN(targetDate.getTime())) {
    return { label: "N/A", isDanger: false };
  }
  
  // Calculate difference in milliseconds
  const diffMs = targetDate.getTime() - Date.now();
  
  if (diffMs <= 0) {
    return { label: "Expired", isDanger: true };
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const labelParts = [];
  if (days) labelParts.push(`${days}d`);
  if (hours || days) labelParts.push(`${hours}h`);
  if (minutes || hours || days) labelParts.push(`${minutes}m`);
  labelParts.push(`${seconds}s`);
  return {
    label: labelParts.join(" "),
    isDanger: diffMs <= 24 * 60 * 60 * 1000,
  };
};

const parseDateParts = (value?: string | Date | null) => {
  if (!value) return null;
  
  // Convert to Date object if it's a string, then use UTC methods
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    // Parse string - always treat as UTC to match database storage
    const str = String(value).trim();
    
    // Check if string ends with Z (UTC indicator) or has timezone offset
    const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(str);
    
    if (hasTimezone) {
      // Has timezone info, parse normally
      date = new Date(str);
    } else {
      // No timezone indicator - parse manually and treat as UTC
      // Extract date/time components and create UTC date
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
      if (isoMatch) {
        const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
        // Use Date.UTC to create date in UTC timezone (treating input values as UTC)
        date = new Date(Date.UTC(
          Number(y),
          Number(mo) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          ss ? Number(ss) : 0,
          ms ? Number(ms.substring(0, 3)) : 0
        ));
      } else {
        // Fallback: try standard parsing
        date = new Date(str);
      }
    }
  }
  
  if (Number.isNaN(date.getTime())) return null;
  
  // Always use UTC methods to display time as stored in database (UTC) without timezone conversion
  // This ensures "6:09 am UTC" displays as "6:09 am" regardless of user's timezone
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDate = (date?: string | Date | null) => {
  const parts = parseDateParts(date);
  if (!parts) return "Not set";
  return `${parts.day.toString().padStart(2, "0")} ${monthNames[parts.month]} ${parts.year}`;
};

const formatDateTime = (value?: string | Date | null) => {
  const parts = parseDateParts(value);
  if (!parts) return "Not set";
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const period = parts.hour >= 12 ? "pm" : "am";
  const minute = parts.minute.toString().padStart(2, "0");
  return `${parts.day.toString().padStart(2, "0")} ${monthNames[parts.month]} ${parts.year}, ${hour12}:${minute} ${period}`;
};

/** Safe label for Stripe session fields (subscription/invoice) - never render objects as React children */
function safeSessionLabel(val: unknown): string {
  if (val == null) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "id" in val && typeof (val as { id?: unknown }).id === "string") {
    return (val as { id: string }).id;
  }
  return "—";
}

export default function Subscription() {
  const { currencySymbol } = useCurrency();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCurrentPlanDialog, setShowCurrentPlanDialog] = useState(false);
  const [currentPlanData, setCurrentPlanData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ryft' | 'paypal' | 'stripe'>('ryft');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [stripeAlertOpen, setStripeAlertOpen] = useState(false);
  const [stripeAlertMessage, setStripeAlertMessage] = useState("");
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [postCheckoutSession, setPostCheckoutSession] = useState<any>(null);
  const [postCheckoutLoading, setPostCheckoutLoading] = useState(false);
  const [postCheckoutError, setPostCheckoutError] = useState("");
  
  // Subscription management state
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [downgradeLoading, setDowngradeLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [changeCycleLoading, setChangeCycleLoading] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlanForDowngrade, setSelectedPlanForDowngrade] = useState<any>(null);
  const [downgradeErrors, setDowngradeErrors] = useState<string[]>([]);
  const [requiredDeletions, setRequiredDeletions] = useState<{ users: number; patients: number } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChangeCycleDialog, setShowChangeCycleDialog] = useState(false);
  const [selectedBillingCycleFilter, setSelectedBillingCycleFilter] = useState<'monthly' | 'yearly' | null>(null);
  const [showNoPackagesDialog, setShowNoPackagesDialog] = useState(false);
  const [noPackagesMessage, setNoPackagesMessage] = useState<{ title: string; description: string } | null>(null);
  const [showUpgradeConfirmDialog, setShowUpgradeConfirmDialog] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);
  const [upgradeDetails, setUpgradeDetails] = useState<{
    currentPlanName: string;
    currentPlanPrice: number;
    newPlanName: string;
    newPlanPrice: number;
    daysRemaining: number;
    remainingCredit: number;
    amountDueToday: number;
  } | null>(null);

  // Signature box state
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isSignatureDarkTheme = () => theme === "dark";

  // Signature Canvas Drawing Functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

    if (!moved && lastPosition) {
      ctx.lineWidth = 2;
      ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(lastPosition.x, lastPosition.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsDrawing(false);
    setLastPosition(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    setLastPosition({ x, y });
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

    if (!moved && lastPosition) {
      ctx.lineWidth = 2;
      ctx.fillStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(lastPosition.x, lastPosition.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsDrawing(false);
    setLastPosition(null);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = isSignatureDarkTheme() ? "#ffffff" : "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    setLastPosition({ x, y });
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas and set background based on theme
    const isDark = isSignatureDarkTheme();
    ctx.fillStyle = isDark ? "#1a1a1a" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset stroke color
    ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
    ctx.fillStyle = isDark ? "#ffffff" : "#000000";
    
    setSignature("");
  };

  // Initialize canvas with theme-aware colors
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas background based on theme
      const isDark = isSignatureDarkTheme();
      const backgroundColor = isDark ? "#1a1a1a" : "#ffffff";
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set stroke color based on theme
      ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
      ctx.fillStyle = isDark ? "#ffffff" : "#000000";
    }
  }, [theme, showSignatureDialog]);

  const handleStripeCheckout = async (plan: any) => {
    if (!plan.stripePriceId) {
      setStripeAlertMessage("Stripe price ID is missing for the selected plan.");
      setStripeAlertOpen(true);
      return;
    }
    setLoadingPlanId(plan.id);
    try {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          stripePriceId: plan.stripePriceId
        })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL received:', data);
        setStripeAlertMessage(data?.error || data?.message || 'Failed to create checkout session. Please try again.');
        setStripeAlertOpen(true);
      }
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      setStripeAlertMessage('Failed to connect to payment service. Please try again.');
      setStripeAlertOpen(true);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleInvoicePayment = async (payment: any) => {
    setIsStripeLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          planId: payment.id,
          planName: `Invoice ${payment.invoiceNumber}`,
          amount: parseFloat(payment.amount)
        })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL received:', data);
        setStripeAlertMessage(data?.error || data?.message || 'Failed to create checkout session. Please try again.');
        setStripeAlertOpen(true);
      }
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      setStripeAlertMessage('Failed to connect to payment service. Please try again.');
      setStripeAlertOpen(true);
    } finally {
      setIsStripeLoading(false);
    }
  };

  // Subscription management functions
  const handleUpgrade = async (plan: any) => {
    setUpgradeLoading(plan.id);
    try {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // If user has an existing subscription, use direct upgrade endpoint with proration
      if (subscription && subscription.id && subscription.stripeSubscriptionId) {
        const response = await fetch('/api/saas/billing/upgrade', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            subscriptionId: subscription.id,
            newPackageId: plan.id,
            billingCycle: subscription.billingCycle || 'monthly',
          }),
        });

        // Try to parse JSON response, handle non-JSON responses
        let data: any;
        try {
          const text = await response.text();
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('[UPGRADE] Failed to parse response:', parseError);
          throw new Error(`Server error (${response.status}): ${response.statusText || 'Invalid response'}`);
        }

        if (!response.ok) {
          // Log detailed error for debugging
          console.error('[UPGRADE] Upgrade failed:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            message: data.message,
            details: data.details,
            fullResponse: data,
          });
          
          // Construct a more detailed error message
          let errorMessage = 'Failed to upgrade subscription';
          if (data.error) {
            errorMessage = data.error;
            if (data.message && data.message !== data.error) {
              errorMessage += `: ${data.message}`;
            }
          } else if (data.message) {
            errorMessage = data.message;
          }
          
          // Add details if available
          if (data.details) {
            errorMessage += ` (${data.details})`;
          }
          
          throw new Error(errorMessage);
        }

        // Check if payment is required - redirect to Checkout Session
        // Support both 'url' (new) and 'paymentUrl' (old) for compatibility
        const checkoutUrl = data.url || data.paymentUrl;
        if (checkoutUrl) {
          // Redirect to Stripe Checkout for payment
          console.log('[UPGRADE] Redirecting to Stripe Checkout:', checkoutUrl);
          window.location.href = checkoutUrl;
          return;
        }
        
        // Success - refresh subscription data
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        queryClient.invalidateQueries({ queryKey: ["/api/billing-history"] });
        
        toast({
          title: "Upgrade Successful",
          description: data.message || "Your subscription has been upgraded successfully. New features are now active.",
        });
        
        setUpgradeLoading(null);
        return;
      }

      // If no existing subscription, use Stripe Checkout for new subscription
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          isUpgrade: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create checkout session');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        console.error('No checkout URL received:', data);
        setStripeAlertMessage(data?.error || data?.message || 'Failed to create checkout session. Please try again.');
        setStripeAlertOpen(true);
        setUpgradeLoading(null);
      }
    } catch (error: any) {
      console.error('[UPGRADE] Upgrade error:', error);
      
      // Handle different error types
      let errorMessage = 'Failed to upgrade subscription';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
        if (error.message && error.message !== error.error) {
          errorMessage += `: ${error.message}`;
        }
      }
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      // Handle authentication errors
      if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Authentication')) {
        errorMessage = 'Authentication error. Please refresh the page and log in again, then try upgrading your subscription.';
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
      }
      
      setStripeAlertMessage(errorMessage);
      setStripeAlertOpen(true);
      setUpgradeLoading(null);
    }
  };

  const handleDowngrade = async (plan: any) => {
    setSelectedPlanForDowngrade(plan);
    setDowngradeErrors([]);
    setRequiredDeletions(null);

    // If subscription query succeeded, user is authenticated - proceed with downgrade
    if (!subscription || !subscription.id) {
      console.error('[DOWNGRADE] No subscription found - user may not be authenticated');
      setDowngradeErrors(['Unable to find your subscription. Please refresh the page and try again.']);
      setShowDowngradeDialog(true);
      return;
    }

    // First, validate usage BEFORE calling Stripe or updating database
    try {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      
      // Update last activity time to prevent session timeout
      const now = Date.now();
      localStorage.setItem('lastActivityTime', now.toString());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': subdomain,
      };
      
      // Only add Authorization header if token exists
      // If subscription exists, user is authenticated (subscription query succeeded)
      // Backend will handle authentication validation
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('[DOWNGRADE] No auth token in localStorage, but subscription exists - proceeding (backend may use session/cookies)');
      }

      console.log('[DOWNGRADE] Validating usage before downgrade...', {
        subscriptionId: subscription?.id,
        newPackageId: plan.id,
        planName: plan.name,
      });

      const response = await fetch('/api/saas/billing/downgrade', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: subscription?.id,
          newPackageId: plan.id,
          billingCycle: subscription?.billingCycle || 'monthly',
          immediate: false,
        }),
      });

      // Handle 401 Unauthorized - token expired or invalid
      // This is an authentication error, NOT a validation error
      if (response.status === 401) {
        const data = await response.json().catch(() => ({ error: 'Unauthorized', message: 'Invalid token' }));
        console.error('[DOWNGRADE] ❌ Authentication failed:', {
          status: response.status,
          error: data.error,
          details: data.details,
        });
        
        // Clear invalid token immediately
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
        localStorage.removeItem('lastActivityTime');
        localStorage.removeItem('sessionStartTime');
        
        // Show authentication error in alert, NOT in downgrade dialog
        setStripeAlertMessage('Your session has expired. Please refresh the page and log in again, then try downgrading your subscription.');
        setStripeAlertOpen(true);
        setCancelLoading(false);
        return;
      }

      const data = await response.json();

      // Only show downgrade dialog for validation errors (400 status)
      // Other errors (500, etc.) should show in alert
      if (!response.ok) {
        // If it's not a validation error (400), show in alert instead
        if (response.status !== 400) {
          setStripeAlertMessage(data.error || data.message || 'Failed to downgrade subscription');
          setStripeAlertOpen(true);
          setCancelLoading(false);
          return;
        }
        // Validation failed - show error dialog with required deletions
        console.log('[DOWNGRADE] ❌ Validation failed - Full response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          errors: data.errors,
          requiredDeletions: data.requiredDeletions,
          usersToRemove: data.usersToRemove,
          patientsToRemove: data.patientsToRemove,
        });
        
        // Extract required deletions from response (try multiple possible structures)
        // Priority: direct fields > nested object > 0
        let usersToRemove = 0;
        let patientsToRemove = 0;
        
        // Try direct fields first
        if (typeof data.usersToRemove === 'number') {
          usersToRemove = data.usersToRemove;
        }
        if (typeof data.patientsToRemove === 'number') {
          patientsToRemove = data.patientsToRemove;
        }
        
        // If direct fields are 0 or missing, try nested object
        if ((usersToRemove === 0 || patientsToRemove === 0) && data.requiredDeletions) {
          if (typeof data.requiredDeletions === 'object' && data.requiredDeletions !== null) {
            if (typeof data.requiredDeletions.users === 'number' && usersToRemove === 0) {
              usersToRemove = data.requiredDeletions.users;
            }
            if (typeof data.requiredDeletions.patients === 'number' && patientsToRemove === 0) {
              patientsToRemove = data.requiredDeletions.patients;
            }
          }
        }
        
        console.log('[DOWNGRADE] Extracted deletion counts:', {
          usersToRemove,
          patientsToRemove,
          rawUsersToRemove: data.usersToRemove,
          rawPatientsToRemove: data.patientsToRemove,
          rawRequiredDeletions: data.requiredDeletions,
          hasRequiredDeletions: !!data.requiredDeletions,
          requiredDeletionsType: typeof data.requiredDeletions,
        });
        
        // If we still don't have deletion counts, try to parse from error messages
        if (usersToRemove === 0 && patientsToRemove === 0) {
          // Try to extract numbers from error messages as fallback
          const allErrorText = [
            ...(Array.isArray(data.errors) ? data.errors : []),
            data.error || '',
            data.message || '',
          ].join(' ');
          
          const userMatch = allErrorText.match(/(\d+)\s+user/i);
          const patientMatch = allErrorText.match(/(\d+)\s+patient/i);
          
          if (userMatch) {
            usersToRemove = parseInt(userMatch[1], 10);
            console.log('[DOWNGRADE] Parsed usersToRemove from error message:', usersToRemove);
          }
          if (patientMatch) {
            patientsToRemove = parseInt(patientMatch[1], 10);
            console.log('[DOWNGRADE] Parsed patientsToRemove from error message:', patientsToRemove);
          }
        }
        
        // Set required deletions with calculated values
        // Always set the state if we have any values > 0 OR if the response indicates validation failed
        // This ensures the UI can display the information even if values are 0 (edge case)
        if (usersToRemove > 0 || patientsToRemove > 0 || response.status === 400) {
          // If status is 400 (validation error), we should have deletion counts
          // If they're still 0, it might mean usage is within limits but there's another validation issue
          setRequiredDeletions({
            users: usersToRemove,
            patients: patientsToRemove,
          });
          console.log('[DOWNGRADE] ✅ Set requiredDeletions:', { 
            users: usersToRemove, 
            patients: patientsToRemove,
            status: response.status,
            hasValues: usersToRemove > 0 || patientsToRemove > 0,
          });
        } else {
          // If we can't extract any deletion info, set to null
          setRequiredDeletions(null);
          console.warn('[DOWNGRADE] ⚠️ No deletion counts found in response:', {
            status: response.status,
            dataKeys: Object.keys(data),
          });
        }
        
        // Set errors - prefer detailed errors from backend, fallback to generic message
        const errorMessages = Array.isArray(data.errors) ? data.errors : [];
        if (data.error && !errorMessages.includes(data.error)) {
          errorMessages.push(data.error);
        }
        if (data.message && !errorMessages.includes(data.message)) {
          errorMessages.push(data.message);
        }
        
        // If we have deletion counts but no detailed errors, create helpful error messages
        if (errorMessages.length === 0) {
          if (usersToRemove > 0 || patientsToRemove > 0) {
            // Create detailed error message from deletion counts
            const parts: string[] = [];
            if (usersToRemove > 0) {
              parts.push(`${usersToRemove} user${usersToRemove !== 1 ? 's' : ''}`);
            }
            if (patientsToRemove > 0) {
              parts.push(`${patientsToRemove} patient${patientsToRemove !== 1 ? 's' : ''}`);
            }
            if (parts.length > 0) {
              errorMessages.push(`Please remove ${parts.join(' and ')} before downgrading.`);
            } else {
              errorMessages.push('Failed to downgrade subscription');
            }
          } else {
            errorMessages.push('Failed to downgrade subscription');
          }
        }
        
        setDowngradeErrors(errorMessages);
        setShowDowngradeDialog(true);
        return;
      }

      // Success - validation passed, downgrade processed
      console.log('[DOWNGRADE] ✅ Downgrade successful');
      setStripeAlertMessage(data.message || "Subscription will be downgraded at the next billing cycle.");
      setStripeAlertOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    } catch (error: any) {
      console.error('[DOWNGRADE] Error:', error);
      
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setDowngradeErrors(['Network error. Please check your connection and try again.']);
      } else if (error.message?.includes('token') || error.message?.includes('auth')) {
        setDowngradeErrors(['Authentication error. Please refresh the page and log in again.']);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
        localStorage.removeItem('lastActivityTime');
        localStorage.removeItem('sessionStartTime');
      } else {
        setDowngradeErrors([error.message || 'Failed to downgrade subscription']);
      }
      setRequiredDeletions(null);
      setShowDowngradeDialog(true);
    }
  };

  const handleCancel = async (immediate: boolean) => {
    setCancelLoading(true);
    try {
      // If subscription query succeeded, user is authenticated - proceed with cancel
      if (!subscription || !subscription.id) {
        console.error('[CANCEL] No subscription found - user may not be authenticated');
        setStripeAlertMessage('Unable to find your subscription. Please refresh the page and try again.');
        setStripeAlertOpen(true);
        setCancelLoading(false);
        return;
      }

      // Get token and verify it exists
      let token = localStorage.getItem('auth_token');
      
      // Double-check token exists (might have been cleared by checkSessionTimeout)
      if (!token) {
        // Try one more time - sometimes checkSessionTimeout clears it
        token = localStorage.getItem('auth_token');
        if (!token) {
          console.error('[CANCEL] No auth token available - session may have expired');
          setStripeAlertMessage('Your session has expired. Please refresh the page and log in again, then try canceling your subscription.');
          setStripeAlertOpen(true);
          setCancelLoading(false);
          return;
        }
      }

      // Update last activity time BEFORE making request to prevent timeout
      const activityTime = Date.now();
      localStorage.setItem('lastActivityTime', activityTime.toString());

      console.log('[CANCEL] Sending cancel request:', {
        subscriptionId: subscription?.id,
        immediate,
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'missing',
        timestamp: new Date().toISOString(),
      });

      console.log('[CANCEL] Sending cancel request to Stripe...');

      // Use fetch directly instead of apiRequest to avoid token clearing issues
      // apiRequest calls checkSessionTimeout which might clear the token
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': subdomain,
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch('/api/saas/billing/cancel', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: subscription?.id,
          immediate: immediate,
        }),
      });

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({ error: 'Unauthorized', message: 'Invalid token' }));
        console.error('[CANCEL] ❌ Authentication failed:', {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });
        
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
        localStorage.removeItem('lastActivityTime');
        localStorage.removeItem('sessionStartTime');
        
        // Check if it's the SaaS admin token error
        if (errorData.message?.includes('Invalid token or inactive owner')) {
          setStripeAlertMessage('Authentication error: Invalid token. Please refresh the page and log in again, then try canceling your subscription.');
        } else {
          setStripeAlertMessage(`Authentication failed: ${errorData.message || errorData.error || 'Invalid token'}. Please refresh the page and log in again.`);
        }
        setStripeAlertOpen(true);
        setCancelLoading(false);
        return;
      }

      // Parse response JSON
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to cancel subscription');
      }

      // Update last activity on success
      const successTime = Date.now();
      localStorage.setItem('lastActivityTime', successTime.toString());

      setStripeAlertMessage(data.message || "Subscription cancelled successfully.");
      setStripeAlertOpen(true);
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    } catch (error: any) {
      console.error('[CANCEL] Cancel error:', error);
      
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setStripeAlertMessage('Network error. Please check your connection and try again.');
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Authentication')) {
        setStripeAlertMessage('Authentication error. Please refresh the page and log in again, then try canceling your subscription.');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
        localStorage.removeItem('lastActivityTime');
        localStorage.removeItem('sessionStartTime');
      } else {
        setStripeAlertMessage(error.message || 'Failed to cancel subscription');
      }
      setStripeAlertOpen(true);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleChangeCycle = async (newCycle: 'monthly' | 'annual') => {
    setChangeCycleLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/saas/billing/change-cycle', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: subscription?.id,
          newBillingCycle: newCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to change billing cycle');
      }

      setStripeAlertMessage(data.message || "Billing cycle changed successfully.");
      setStripeAlertOpen(true);
      setShowChangeCycleDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    } catch (error: any) {
      console.error('Change cycle error:', error);
      setStripeAlertMessage(error.message || 'Failed to change billing cycle');
      setStripeAlertOpen(true);
    } finally {
      setChangeCycleLoading(false);
    }
  };

  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  const { data: dbPackages = [], isLoading: packagesLoading } = useQuery<SaaSPackage[]>({
    queryKey: ["/api/website/packages"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch("/api/website/packages", {
        credentials: "include",
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    }
  });

  // Fetch billing history
  const { data: billingHistory = [], isLoading: billingLoading } = useQuery<any[]>({
    queryKey: ["/api/billing-history"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch("/api/billing-history", {
        credentials: "include",
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch billing history');
      return res.json();
    }
  });

  // Sort billing history by date (most recent first) and separate latest invoice
  const sortedBillingHistory = [...billingHistory].sort((a, b) => {
    const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : new Date(a.periodStart).getTime();
    const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : new Date(b.periodStart).getTime();
    return dateB - dateA; // Most recent first
  });

  // Helper function to check if invoice is expired
  // Invoice end date is subscription.expiresAt (from saas_subscription) for the latest invoice
  const isInvoiceExpired = (invoice: any, isLatest: boolean = false) => {
    // For latest invoice, use subscription.expiresAt as invoice end date
    // For other invoices, use invoice.expiresAt or periodEnd as fallback
    const invoiceEndDate = isLatest 
      ? (subscription?.expiresAt || invoice.expiresAt || invoice.periodEnd)
      : (invoice.expiresAt || invoice.periodEnd || subscription?.expiresAt);
    
    if (!invoiceEndDate) return false;

    // Parse invoice end date
    const endDateStr = String(invoiceEndDate).trim();
    const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(endDateStr);
    let endDate: Date;
    
    if (hasTimezone) {
      endDate = new Date(endDateStr);
    } else {
      const isoMatch = endDateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
      if (isoMatch) {
        const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
        endDate = new Date(Date.UTC(
          Number(y),
          Number(mo) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          ss ? Number(ss) : 0,
          ms ? Number(ms.substring(0, 3)) : 0
        ));
      } else {
        endDate = new Date(endDateStr);
      }
    }

    // Set time to start of day for date comparison (ignore time component)
    const now = new Date();
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Invoice is expired if end date is equal to or past current date
    return endDateOnly.getTime() <= nowDate.getTime();
  };

  // Get the latest invoice (most recent)
  const latestInvoiceRaw = sortedBillingHistory.length > 0 ? sortedBillingHistory[0] : null;
  
  // Check if latest invoice is expired (use subscription.expiresAt as invoice end date)
  const isLatestInvoiceExpired = latestInvoiceRaw ? isInvoiceExpired(latestInvoiceRaw, true) : false;
  
  // Only show latest invoice in "Current Invoice" if it's not expired
  const latestInvoice = latestInvoiceRaw && !isLatestInvoiceExpired ? latestInvoiceRaw : null;

  // Get previous invoices (all except the latest, plus expired latest invoice)
  const previousInvoices = isLatestInvoiceExpired 
    ? sortedBillingHistory // Include expired latest invoice in billing history
    : sortedBillingHistory.length > 1 ? sortedBillingHistory.slice(1) : [];

  // Split packages into subscription plans (have maxUsers) and add-ons (don't have maxUsers)
  const dbPlans = dbPackages.filter(pkg => pkg.features?.maxUsers);
  const dbAddons = dbPackages.filter(pkg => !pkg.features?.maxUsers);

  // Determine the billing cycle filter (default to subscription's billing cycle, or 'monthly' if no subscription)
  const billingCycleFilter = selectedBillingCycleFilter || 
    (subscription?.billingCycle === 'annual' ? 'yearly' : 'monthly');

  // Filter plans by billing cycle if filter is set
  const filteredDbPlans = billingCycleFilter 
    ? dbPlans.filter(pkg => {
        // Normalize billing cycle values: 'annual' -> 'yearly', 'monthly' -> 'monthly'
        const pkgCycle = pkg.billingCycle?.toLowerCase();
        const filterCycle = billingCycleFilter.toLowerCase();
        return (pkgCycle === filterCycle) || 
               (pkgCycle === 'annual' && filterCycle === 'yearly') ||
               (pkgCycle === 'yearly' && filterCycle === 'annual');
      })
    : dbPlans;

  // Transform database plans to component format for "Available Plans" section
  const plans = filteredDbPlans.map(pkg => ({
    id: pkg.id.toString(),
    name: pkg.name,
    price: parseFloat(pkg.price),
    userLimit: pkg.features?.maxUsers || 0,
    popular: pkg.name.toLowerCase().includes('professional') || pkg.name.toLowerCase().includes('pro'),
    features: formatPackageFeatures(pkg.features),
    notIncluded: [] as string[], // Database doesn't store not-included features
    stripePriceId: pkg.stripePriceId || "",
    billingCycle: pkg.billingCycle, // Include billing cycle for reference
  }));

  // Transform database add-ons to component format for "Add-on Packages" section
  const packages = dbAddons.map(pkg => ({
    id: pkg.id.toString(),
    name: pkg.name,
    price: parseFloat(pkg.price),
    icon: getPackageIcon(pkg.name),
    description: pkg.description || '',
    features: formatPackageFeatures(pkg.features)
  }));

  const [countdown, setCountdown] = useState<{ label: string; isDanger: boolean }>({
    label: "Loading...",
    isDanger: false,
  });
  const userRole = localStorage.getItem("user_role");
  const isSaasAdmin = userRole === "admin";

  useEffect(() => {
    // Use expiresAt first (end date), then nextBillingAt (billing cycle end), as fallback
    const targetDate = subscription?.expiresAt || subscription?.nextBillingAt;
    
    if (!targetDate) {
      setCountdown({ label: "Not scheduled", isDanger: false });
      return;
    }
    
    const update = () => {
      setCountdown(getCountdown(targetDate));
    };
    update();
    const timer = setInterval(update, 15 * 1000);
    return () => clearInterval(timer);
  }, [subscription?.expiresAt, subscription?.nextBillingAt]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const isSuccess = params.get("success") === "true";

    if (!isSuccess || !sessionId) {
      return;
    }

    const fetchSession = async () => {
      setPostCheckoutLoading(true);
      setPostCheckoutError("");
      try {
        const token = localStorage.getItem("auth_token");
        const subdomain = localStorage.getItem("user_subdomain") || "demo";
        const headers: Record<string, string> = {
          "X-Tenant-Subdomain": subdomain,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/stripe/checkout-session/${sessionId}`, {
          credentials: "include",
          headers,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to retrieve checkout session");
        }

        const sessionData = await response.json();
        setPostCheckoutSession(sessionData);
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        queryClient.invalidateQueries({ queryKey: ["/api/billing-history"] });
      } catch (error: any) {
        setPostCheckoutError(error?.message || "Failed to fetch checkout session");
      } finally {
        setPostCheckoutLoading(false);
      }
    };

    fetchSession();

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("success");
    cleanUrl.searchParams.delete("session_id");
    window.history.replaceState({}, document.title, cleanUrl.toString());
  }, []);

  if (isLoading || packagesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
        <Header
          title="Subscription"
          subtitle="Manage your subscription and billing."
        />
        <div className="w-full px-3 sm:px-4 lg:px-6 py-4 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header
        title="Subscription"
        subtitle="Manage your subscription and billing."
      />
      <div className="w-full flex-1 overflow-auto bg-white dark:bg-gray-900 px-3 sm:px-4 lg:px-5 py-4">
        <div className="space-y-4">
          {/* Check if subscription is expired */}
          {(() => {
            if (!subscription?.expiresAt) return null;
            
            // Parse expiresAt as UTC
            const expiresAtStr = String(subscription.expiresAt).trim();
            const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(expiresAtStr);
            let expiresDate: Date;
            
            if (hasTimezone) {
              expiresDate = new Date(expiresAtStr);
            } else {
              // No timezone - treat as UTC
              const isoMatch = expiresAtStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
              if (isoMatch) {
                const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
                expiresDate = new Date(Date.UTC(
                  Number(y),
                  Number(mo) - 1,
                  Number(d),
                  Number(hh),
                  Number(mm),
                  ss ? Number(ss) : 0,
                  ms ? Number(ms.substring(0, 3)) : 0
                ));
              } else {
                expiresDate = new Date(expiresAtStr);
              }
            }
            
            // Set time to start of day for date comparison (ignore time component)
            const now = new Date();
            const expiresAtDate = new Date(expiresDate.getFullYear(), expiresDate.getMonth(), expiresDate.getDate());
            const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            // Check if expiresAt is equal to or past current date
            const isExpired = expiresAtDate.getTime() <= nowDate.getTime();
            
            if (isExpired) {
              // Show expiration message in red
              return (
                <div className="rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-6 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      Your subscription has expired
                    </p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your active subscription has expired on {formatDateTime(subscription.expiresAt)}. Please subscribe to a package again to continue using the service.
                  </p>
                </div>
              );
            }
            
            // Show active subscription banner
            if ((subscription?.status === "active" || subscription?.status === "trial") && subscription?.planName) {
              return (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 relative">
                  {/* Countdown in top right corner */}
                  <div className="absolute top-4 right-6">
                    <div className="space-y-1 text-right">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Countdown</p>
                      <p className={`text-sm font-semibold ${countdown.isDanger ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
                        {countdown.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 capitalize">
                      {subscription.planName}
                    </span>
                    <Badge className="bg-emerald-600 text-white">
                      {subscription.status === "trial" ? "Trial" : "Active"}
                    </Badge>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      Subscription active
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 text-sm text-emerald-800 dark:text-emerald-200">
                    <span>
                      <strong>Active from:</strong> {formatDateTime(subscription.currentPeriodStart ?? subscription.createdAt)}
                    </span>
                    <span>
                      <strong>End date:</strong> {formatDateTime(subscription.expiresAt ?? subscription.nextBillingAt)}
                    </span>
                  </div>
                </div>
              );
            }
            
            return null;
          })()}

          {postCheckoutLoading && (
            <Alert>
              <AlertTitle className="text-sm">Confirming your subscription</AlertTitle>
              <AlertDescription className="text-sm">
                We are retrieving your checkout session to finalize billing. This should only take a moment.
              </AlertDescription>
            </Alert>
          )}

          {postCheckoutError && (
            <Alert variant="destructive">
              <AlertTitle className="text-sm">Could not verify checkout session</AlertTitle>
              <AlertDescription className="text-sm">{postCheckoutError}</AlertDescription>
            </Alert>
          )}

          {postCheckoutSession && (
            <Alert variant="default" className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
              <AlertTitle className="text-sm">Payment successful</AlertTitle>
              <AlertDescription className="text-sm">
                Your subscription has been activated. Subscription ID: {safeSessionLabel(postCheckoutSession.subscription)}. Invoice: {safeSessionLabel(postCheckoutSession.invoice)}.
              </AlertDescription>
            </Alert>
          )}

          {/* Package Expired Message */}
          {!subscription && !isLoading && (
            <div className="rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  Your package is expired
                </p>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Your latest subscription package has expired. Please subscribe to a package again to continue using the service.
              </p>
            </div>
          )}

          {/* Current Subscription */}
          {subscription && (
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <Crown className="h-5 w-5 text-primary" />
                  <span>Current Subscription</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>Active Plan</span>
                    </div>
                    <p className="text-2xl font-bold capitalize">
                      {subscription.planName}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={
                          subscription.status === 'active'
                            ? "bg-green-500 text-white"
                            : subscription.status === 'trial'
                              ? "bg-blue-500 text-white"
                              : subscription.status === 'expired'
                                ? "bg-red-500 text-white"
                                : "bg-yellow-500 text-white"
                        }
                      >
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </Badge>
                      {subscription.paymentStatus && (
                        <Badge
                          className={
                            subscription.paymentStatus === 'paid'
                              ? "bg-green-600 text-white"
                              : subscription.paymentStatus === 'trial'
                                ? "bg-blue-600 text-white"
                                : subscription.paymentStatus === 'unpaid'
                                  ? "bg-orange-500 text-white"
                                  : subscription.paymentStatus === 'failed'
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-500 text-white"
                          }
                        >
                          Payment: {subscription.paymentStatus.charAt(0).toUpperCase() + subscription.paymentStatus.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>User Capacity</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {subscription.currentUsers} <span className="text-lg text-muted-foreground">/ {subscription.features?.maxUsers || subscription.userLimit || 0}</span>
                    </p>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min((subscription.currentUsers / (subscription.features?.maxUsers || subscription.userLimit || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Stethoscope className="h-4 w-4" />
                      <span>Patient Capacity</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {subscription.currentPatients || 0} <span className="text-lg text-muted-foreground">/ {subscription.features?.maxPatients || 0}</span>
                    </p>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(((subscription.currentPatients || 0) / (subscription.features?.maxPatients || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {subscription.status === 'trial' ? 'Trial Period' : 'Billing Cycle'}
                      </span>
                    </div>
                    <p className="text-xl font-bold">
                      {subscription.nextBillingAt
                        ? formatDateTime(subscription.nextBillingAt)
                        : "—"
                      }
                    </p>
                    {subscription.monthlyPrice && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-lg font-semibold text-foreground">{currencySymbol}{subscription.monthlyPrice}</span>/month
                      </p>
                    )}
                  </div>
                </div>
                </div>

                {/* Current Invoice */}
                {latestInvoice ? (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Current Invoice</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Use subscription.expiresAt as invoice due date (at the time of invoice generation)
                          // This is the expires_at datetime from saas_subscription
                          const invoiceDueDate = subscription?.expiresAt || latestInvoice.expiresAt || latestInvoice.periodEnd;
                          const dueDate = invoiceDueDate ? new Date(invoiceDueDate) : new Date(latestInvoice.periodEnd);
                          
                          setSelectedInvoice({
                            id: latestInvoice.id,
                            invoiceNumber: latestInvoice.invoiceNumber,
                            organizationName: subscription?.plan || 'Organization',
                            organizationAddress: `${subscription?.plan || 'Healthcare'}\nHealthcare Organization\nUnited Kingdom`,
                            amount: latestInvoice.amount,
                            currency: latestInvoice.currency || 'GBP',
                            paymentMethod: latestInvoice.paymentMethod,
                            paymentStatus: latestInvoice.paymentStatus,
                            createdAt: latestInvoice.paymentDate || latestInvoice.periodStart,
                            dueDate: dueDate.toISOString(),
                            description: `Monthly subscription payment - ${subscription?.plan || 'Subscription'}`
                          });
                          setShowInvoiceDialog(true);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{latestInvoice.invoiceNumber}</span>
                        </div>
                        <Badge
                          className={
                            latestInvoice.paymentStatus === 'completed' ? 'bg-green-500 text-white' :
                              latestInvoice.paymentStatus === 'pending' ? 'bg-yellow-500 text-white' :
                                latestInvoice.paymentStatus === 'failed' ? 'bg-red-500 text-white' :
                                  ''
                          }
                        >
                          {latestInvoice.paymentStatus}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">
                            {latestInvoice.paymentDate 
                              ? new Date(latestInvoice.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Pending'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">
                            {latestInvoice.currency} {parseFloat(latestInvoice.amount).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Method</p>
                          <p className="font-medium capitalize">
                            {latestInvoice.paymentMethod?.replace('_', ' ') || 'N/A'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-base font-medium text-muted-foreground mb-1">Period</p>
                          <p className="font-medium text-base">
                            Active from: {formatDateTime(latestInvoice.periodStart)} · End date: {formatDateTime(latestInvoice.expiresAt || latestInvoice.periodEnd || subscription?.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isLatestInvoiceExpired && latestInvoiceRaw ? (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-6 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          Your invoice is expired
                        </p>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Your invoice has expired on {formatDateTime(latestInvoiceRaw.expiresAt || latestInvoiceRaw.periodEnd || subscription?.expiresAt)}. This invoice has been moved to Billing History.
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {subscription && (
            <Card>
              <CardHeader className="relative">
                <CardTitle>Current SaaS Subscription Snapshot</CardTitle>
                {/* Countdown in top right corner */}
                <div className="absolute top-4 right-4">
                  <div className="space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">Countdown</p>
                    <p className={`text-lg font-semibold ${countdown.isDanger ? "text-red-600" : "text-emerald-600"}`}>
                      {countdown.label}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Created at: {formatDateTime(subscription.createdAt)}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Package</p>
                    <p className="text-lg font-semibold">{subscription.planName || subscription.plan || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold">
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <p className="text-lg font-semibold">
                      {subscription.paymentStatus || "pending"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Monthly Recurring</p>
                    <p className="text-lg font-semibold">{currencySymbol}{subscription.monthlyPrice || "0"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Expires at</p>
                    <p className="text-lg font-semibold">
                      {subscription.expiresAt ? formatDateTime(subscription.expiresAt) : "—"}
                    </p>
                  </div>
                </div>
                
                {/* Billing Cycle Change */}
                {subscription && subscription.status === 'active' && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-1">Billing Cycle</h4>
                        <p className="text-sm text-muted-foreground">
                          Current: {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                    </p>
                  </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChangeCycleDialog(true)}
                        disabled={changeCycleLoading}
                      >
                        Change Cycle
                      </Button>
                </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Available Plans</h3>
              <p className="text-sm text-muted-foreground">Select a plan that fits your practice needs</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                // Only apply "Currently Subscribed" logic for admin users
                const shouldCheckSubscription = isSaasAdmin;
                
                return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col h-full ${plan.popular
                    ? "border-primary"
                    : ""
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pt-6">
                    <CardTitle className="text-xl mb-4">{plan.name}</CardTitle>
                    <div className="space-y-2">
                      <div>
                        <span className="text-4xl font-bold">
                          {currencySymbol}{plan.price}
                        </span>
                        <span className="text-muted-foreground ml-2">/month</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Up to {plan.userLimit} users</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1">
                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}

                      {plan.notIncluded.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-2 opacity-50">
                          <X className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-sm line-through">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <div className="px-6 pb-6">
                    {(() => {
                      // If no subscription, show upgrade button
                      if (!subscription) {
                        return (
                    <Button
                      key={`upgrade-no-sub-${plan.id}`}
                      className="w-full text-sm"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={loadingPlanId === plan.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStripeCheckout(plan);
                            }}
                            data-testid={`button-plan-${plan.id}`}
                          >
                            {loadingPlanId === plan.id 
                              ? "Loading..." 
                              : `Upgrade ${plan.name} Package`
                            }
                          </Button>
                        );
                      }
                      
                      // Compare by packageId first (most reliable), then by plan name
                      const subscriptionPackageId = subscription?.packageId;
                      const subscriptionPlanName = (subscription?.planName || subscription?.plan || '').toLowerCase().trim();
                      const planIdStr = plan.id.toString();
                      const planNameLower = (plan.name || '').toLowerCase().trim();
                      
                      // Check if this plan matches the user's currently active subscription
                      // Priority: packageId match > plan name match
                      const isCurrentPlan = (subscriptionPackageId && subscriptionPackageId.toString() === planIdStr) ||
                                           (subscriptionPlanName && planNameLower && subscriptionPlanName === planNameLower);
                      
                      if (!isCurrentPlan) {
                        // Not the current plan - determine if upgrade or downgrade
                        const currentPlanPrice = dbPackages.find(p => p.id === subscription.packageId)?.price 
                          ? parseFloat(String(dbPackages.find(p => p.id === subscription.packageId)?.price || 0))
                          : 0;
                        const planPrice = parseFloat(String(plan.price || 0));
                        const isHigherPlan = planPrice > currentPlanPrice;
                        const isLowerPlan = planPrice < currentPlanPrice;

                        if (isHigherPlan) {
                          // Upgrade button - show confirmation dialog
                          return (
                            <Button
                              key={`upgrade-${plan.id}`}
                              className="w-full text-sm"
                              variant={plan.popular ? "default" : "outline"}
                              disabled={upgradeLoading === plan.id}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                try {
                                  // Fetch preview invoice from Stripe to get exact amounts
                                  const token = localStorage.getItem('auth_token');
                                  const subdomain = localStorage.getItem('user_subdomain') || 'demo';
                                  if (!token) {
                                    // Don't call preview endpoint without auth; it will always 401 and spam console
                                    setStripeAlertMessage('Your session has expired. Please refresh and log in again to preview/upgrade your subscription.');
                                    setStripeAlertOpen(true);
                                    return;
                                  }
                                  const headers: Record<string, string> = {
                                    'Content-Type': 'application/json',
                                    'X-Tenant-Subdomain': subdomain
                                  };
                                  headers['Authorization'] = `Bearer ${token}`;

                                  const previewResponse = await fetch('/api/saas/billing/preview-upgrade', {
                                    method: 'POST',
                                    headers,
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      subscriptionId: subscription?.id,
                                      newPackageId: plan.id,
                                      billingCycle: subscription?.billingCycle || 'monthly',
                                    }),
                                  });

                                  // Handle auth failures explicitly (avoid falling back and then failing on confirm)
                                  if (previewResponse.status === 401) {
                                    localStorage.removeItem('auth_token');
                                    localStorage.removeItem('user_subdomain');
                                    localStorage.removeItem('lastActivityTime');
                                    localStorage.removeItem('sessionStartTime');
                                    setStripeAlertMessage('Authentication required. Please log in again, then retry the upgrade.');
                                    setStripeAlertOpen(true);
                                    return;
                                  }
                                  if (previewResponse.status === 403) {
                                    setStripeAlertMessage('You do not have permission to upgrade subscriptions. Please contact your administrator.');
                                    setStripeAlertOpen(true);
                                    return;
                                  }

                                  if (previewResponse.ok) {
                                    // Try to parse JSON response, handle non-JSON responses
                                    let previewData: any;
                                    try {
                                      const text = await previewResponse.text();
                                      previewData = text ? JSON.parse(text) : {};
                                    } catch (parseError) {
                                      console.error('[PREVIEW] Failed to parse preview response:', parseError);
                                      throw new Error(`Server error (${previewResponse.status}): Invalid response`);
                                    }
                                    
                                    setUpgradeDetails({
                                      currentPlanName: previewData.currentPlan?.name || 'Current Plan',
                                      currentPlanPrice: previewData.currentPlan?.price || 0,
                                      newPlanName: previewData.newPlan?.name || plan.name,
                                      newPlanPrice: previewData.newPlan?.price || planPrice,
                                      daysRemaining: previewData.daysRemaining || 0,
                                      remainingCredit: previewData.prorationCredit || 0,
                                      amountDueToday: previewData.amountDue || 0,
                                    });
                                  } else {
                                    // Log error for debugging
                                    let errorData: any = {};
                                    try {
                                      const text = await previewResponse.text();
                                      try {
                                        errorData = text ? JSON.parse(text) : {};
                                      } catch {
                                        errorData = { message: text };
                                      }
                                    } catch (parseError) {
                                      console.error('[PREVIEW] Failed to parse error response:', parseError);
                                    }
                                    
                                    console.warn('[PREVIEW] Preview upgrade failed, using fallback calculation:', {
                                      status: previewResponse.status,
                                      error: errorData.error,
                                      message: errorData.message,
                                      code: errorData.code,
                                    });
                                    
                                    // Fallback to manual calculation if preview fails
                                    const currentPlan = dbPackages.find(p => p.id === subscription.packageId);
                                    const currentPlanName = currentPlan?.name || subscription?.planName || subscription?.plan || 'Current Plan';
                                    const currentPlanPriceValue = currentPlanPrice || 0;
                                    const newPlanPrice = planPrice;
                                    
                                    const periodEnd = subscription?.currentPeriodEnd || subscription?.expiresAt || subscription?.nextBillingAt;
                                    const now = new Date();
                                    const endDate = periodEnd ? new Date(periodEnd) : null;
                                    const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                                    
                                    const billingCycleDays = subscription?.billingCycle === 'annual' ? 365 : 30;
                                    const remainingCredit = daysRemaining > 0 && billingCycleDays > 0
                                      ? (currentPlanPriceValue * daysRemaining) / billingCycleDays
                                      : 0;
                                    
                                    const amountDueToday = Math.max(0, newPlanPrice - remainingCredit);
                                    
                                    setUpgradeDetails({
                                      currentPlanName,
                                      currentPlanPrice: currentPlanPriceValue,
                                      newPlanName: plan.name,
                                      newPlanPrice,
                                      daysRemaining,
                                      remainingCredit,
                                      amountDueToday,
                                    });
                                  }
                                  
                                  setSelectedUpgradePlan(plan);
                                  setShowUpgradeConfirmDialog(true);
                                } catch (error) {
                                  console.error('Error previewing upgrade:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to preview upgrade details. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              data-testid={`button-plan-${plan.id}`}
                            >
                              {upgradeLoading === plan.id 
                                ? "Processing..." 
                                : `Upgrade ${plan.name} Package`
                              }
                            </Button>
                          );
                        } else if (isLowerPlan) {
                          // Downgrade button
                          // If downgrading to Basic Plan, use light grey color
                          const isBasicPlan = plan.name?.toLowerCase().includes('basic');
                          return (
                            <Button
                              className={`w-full text-sm ${isBasicPlan ? 'bg-gray-300 hover:bg-gray-400 text-gray-800 border-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-500' : ''}`}
                              variant={isBasicPlan ? "outline" : "outline"}
                              disabled={downgradeLoading === plan.id}
                              onClick={() => handleDowngrade(plan)}
                              data-testid={`button-plan-${plan.id}`}
                            >
                              {downgradeLoading === plan.id 
                                ? "Processing..." 
                                : `Downgrade to ${plan.name}`
                              }
                            </Button>
                          );
                        } else {
                          // Same price - switch plan
                          return (
                            <Button
                              key={`switch-${plan.id}`}
                              className="w-full text-sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStripeCheckout(plan);
                              }}
                            >
                              Switch to {plan.name}
                            </Button>
                          );
                        }
                      }
                      
                      // This is the current plan - check if subscription is active, not expired, and not cancelled
                      const status = subscription?.status?.toLowerCase();
                      
                      // Check if subscription is active (status is "active" or "trial")
                      const isActive = status === "active" || status === "trial";
                      
                      // Check if subscription is not cancelled
                      const isNotCancelled = status !== "cancelled";
                      
                      // Check if subscription is not expired
                      // expiresAt must be > current date (not equal to or past current date)
                      // Parse dates as UTC to match database storage
                      const now = new Date();
                      let isNotExpired = true;
                      
                      if (subscription?.expiresAt) {
                        // Parse expiresAt as UTC
                        const expiresAtStr = String(subscription.expiresAt).trim();
                        const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(expiresAtStr);
                        let expiresDate: Date;
                        
                        if (hasTimezone) {
                          expiresDate = new Date(expiresAtStr);
                        } else {
                          // No timezone - treat as UTC
                          const isoMatch = expiresAtStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
                          if (isoMatch) {
                            const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
                            expiresDate = new Date(Date.UTC(
                              Number(y),
                              Number(mo) - 1,
                              Number(d),
                              Number(hh),
                              Number(mm),
                              ss ? Number(ss) : 0,
                              ms ? Number(ms.substring(0, 3)) : 0
                            ));
                          } else {
                            expiresDate = new Date(expiresAtStr);
                          }
                        }
                        
                        // Set time to start of day for date comparison (ignore time component)
                        const expiresAtDate = new Date(expiresDate.getFullYear(), expiresDate.getMonth(), expiresDate.getDate());
                        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        
                        // expiresAt must be > current date (not equal to or past current date)
                        isNotExpired = expiresAtDate.getTime() > nowDate.getTime();
                      } else if (subscription?.nextBillingAt) {
                        // Parse nextBillingAt as UTC
                        const nextBillingStr = String(subscription.nextBillingAt).trim();
                        const hasTimezone = /[Z+-]\d{2}:?\d{2}$/.test(nextBillingStr);
                        let nextBillingDate: Date;
                        
                        if (hasTimezone) {
                          nextBillingDate = new Date(nextBillingStr);
                        } else {
                          // No timezone - treat as UTC
                          const isoMatch = nextBillingStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
                          if (isoMatch) {
                            const [, y, mo, d, hh, mm, ss, ms] = isoMatch;
                            nextBillingDate = new Date(Date.UTC(
                              Number(y),
                              Number(mo) - 1,
                              Number(d),
                              Number(hh),
                              Number(mm),
                              ss ? Number(ss) : 0,
                              ms ? Number(ms.substring(0, 3)) : 0
                            ));
                          } else {
                            nextBillingDate = new Date(nextBillingStr);
                          }
                        }
                        
                        // Set time to start of day for date comparison (ignore time component)
                        const nextBillingDateOnly = new Date(nextBillingDate.getFullYear(), nextBillingDate.getMonth(), nextBillingDate.getDate());
                        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        
                        // nextBillingAt must be > current date (not equal to or past current date)
                        isNotExpired = nextBillingDateOnly.getTime() > nowDate.getTime();
                      }
                      
                      // Also check status - if status is "expired", it's expired regardless of dates
                      if (status === "expired") {
                        isNotExpired = false;
                      }
                      
                      // Determine if this is the currently subscribed plan
                      // Must match plan ID, be active, not expired (expiresAt > current date), and not cancelled
                      const isCurrentlySubscribed = isActive && isNotExpired && isNotCancelled;
                      
                      // Debug logging (only for admin users)
                      if (isSaasAdmin) {
                        console.log('[Subscription Match]', {
                          planId: plan.id,
                          planName: plan.name,
                          subscriptionPackageId: subscription?.packageId,
                          subscriptionPlanName: subscription?.planName,
                          subscriptionPlan: subscription?.plan,
                          isCurrentPlan,
                          status: subscription?.status,
                          expiresAt: subscription?.expiresAt,
                          nextBillingAt: subscription?.nextBillingAt,
                          isActive,
                          isNotCancelled,
                          isNotExpired,
                          isCurrentlySubscribed
                        });
                      }
                      
                      // This is the current plan
                      return (
                        <div className="space-y-2">
                          {isCurrentlySubscribed ? (
                            <>
                              <Button
                                className="w-full text-sm"
                                variant="outline"
                                disabled={true}
                                data-testid={`button-plan-${plan.id}`}
                              >
                                Currently Subscribed
                              </Button>
                              <Button
                                className="w-full text-sm"
                                variant="destructive"
                                onClick={() => setShowCancelDialog(true)}
                              >
                                Cancel Subscription
                              </Button>
                            </>
                          ) : (
                            <Button
                              className="w-full text-sm"
                              variant="default"
                              onClick={() => handleStripeCheckout(plan)}
                              data-testid={`button-plan-${plan.id}`}
                            >
                              Subscribe Again
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </Card>
                );
              })}
            </div>
          </div>

          {/* Add-on Packages */}
          {packages.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Add-on Packages</h3>
                <p className="text-sm text-muted-foreground">Extend your capabilities with specialized modules</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => {
                  const IconComponent = pkg.icon;
                  return (
                    <Card key={pkg.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold">{currencySymbol}{pkg.price}</span>
                            <span className="text-sm text-muted-foreground">/mo</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{pkg.name}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="space-y-2 mb-4">
                          {pkg.features.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            console.log('Selected package:', pkg.id);
                          }}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Add to Plan
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Billing History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : previousInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">No previous invoices</h4>
                  <p className="text-sm text-muted-foreground">
                    {latestInvoice 
                      ? "Your latest invoice is shown in the Current Subscription section above."
                      : "Billing records will appear here once your subscription becomes active."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Period</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previousInvoices.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{payment.invoiceNumber}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                            {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              className={
                                payment.paymentStatus === 'completed' ? 'bg-green-500 text-white' :
                                  payment.paymentStatus === 'pending' ? 'bg-yellow-500 text-white' :
                                    payment.paymentStatus === 'failed' ? 'bg-red-500 text-white' :
                                      ''
                              }
                            >
                              {payment.paymentStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">
                            {payment.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {new Date(payment.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(payment.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Use subscription.expiresAt as invoice due date (at the time of invoice generation)
                                  // This is the expires_at datetime from saas_subscription
                                  // For historical invoices, use invoice.expiresAt if available, otherwise subscription.expiresAt
                                  const invoiceDueDate = payment.expiresAt || subscription?.expiresAt || payment.periodEnd;
                                  const dueDate = invoiceDueDate ? new Date(invoiceDueDate) : new Date(payment.periodEnd);
                                  
                                  setSelectedInvoice({
                                    id: payment.id,
                                    invoiceNumber: payment.invoiceNumber,
                                    organizationName: subscription?.plan || 'Organization',
                                    organizationAddress: `${subscription?.plan || 'Healthcare'}\nHealthcare Organization\nUnited Kingdom`,
                                    amount: payment.amount,
                                    currency: payment.currency || 'GBP',
                                    paymentMethod: payment.paymentMethod,
                                    paymentStatus: payment.paymentStatus,
                                    createdAt: payment.paymentDate || payment.periodStart,
                                    dueDate: dueDate.toISOString(),
                                    description: `Monthly subscription payment - ${subscription?.plan || 'Subscription'}`
                                  });
                                  setShowInvoiceDialog(true);
                                }}
                                data-testid={`button-download-invoice-${payment.id}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Invoice
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Current Plan Payment Dialog */}
      <Dialog open={showCurrentPlanDialog} onOpenChange={setShowCurrentPlanDialog}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Manage {currentPlanData?.name}
            </DialogTitle>
          </DialogHeader>

          {currentPlanData && (
            <div className="space-y-6">
              {/* Plan Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentPlanData.name}</h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{currencySymbol}{currentPlanData.price}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">/month</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  <span>Up to {currentPlanData.userLimit} users</span>
                </div>

                <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">30-day money-back guarantee</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <Tabs value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'ryft' | 'paypal' | 'stripe')} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ryft">Ryft</TabsTrigger>
                  <TabsTrigger value="paypal">PayPal</TabsTrigger>
                  <TabsTrigger value="stripe">Stripe</TabsTrigger>
                </TabsList>

                <TabsContent value="ryft" className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by Ryft</span>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment with Ryft</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      PCI DSS Level 1 certified payment processing with advanced fraud protection and real-time transaction monitoring.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>256-bit SSL encryption</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>FCA regulated</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    data-testid="button-pay-ryft"
                  >
                    Pay {currencySymbol}{currentPlanData.price}/month with Ryft
                  </Button>
                </TabsContent>

                <TabsContent value="paypal" className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by PayPal</span>
                  </div>

                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold">Secure Payment with PayPal</h4>
                    <p className="text-sm text-muted-foreground">
                      Industry-leading security with buyer protection and fraud monitoring for safe online transactions.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>Buyer protection</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>Secure checkout</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    data-testid="button-pay-paypal"
                  >
                    Pay {currencySymbol}{currentPlanData.price}/month with PayPal
                  </Button>
                </TabsContent>

                <TabsContent value="stripe" className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by Stripe</span>
                  </div>

                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold">Secure Payment with Stripe</h4>
                    <p className="text-sm text-muted-foreground">
                      PCI-certified payment platform with advanced security features and real-time fraud detection.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>PCI DSS compliant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>3D Secure</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    data-testid="button-pay-stripe"
                  >
                    Pay {currencySymbol}{currentPlanData.price}/month with Stripe
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Terms */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                By proceeding, you agree to our Terms of Service and Privacy Policy. You can cancel your subscription at any time.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      {selectedPlan && (
        <PaymentMethodDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          plan={selectedPlan}
        />
      )}

      {/* Invoice Viewer Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button.absolute]:hidden">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <DialogTitle>Invoice #{selectedInvoice?.invoiceNumber}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  if (invoiceRef.current && selectedInvoice) {
                    try {
                      const { jsPDF } = await import("jspdf");
                      const html2canvas = (await import("html2canvas")).default;
                      
                      // Convert invoice content to canvas
                      const canvas = await html2canvas(invoiceRef.current, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                      });
                      
                      const imgData = canvas.toDataURL('image/png');
                      
                      // Create PDF
                      const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                      });
                      
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = pdf.internal.pageSize.getHeight();
                      const imgWidth = canvas.width;
                      const imgHeight = canvas.height;
                      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
                      const imgScaledWidth = imgWidth * ratio;
                      const imgScaledHeight = imgHeight * ratio;
                      const xOffset = (pdfWidth - imgScaledWidth) / 2;
                      
                      pdf.addImage(imgData, 'PNG', xOffset, 10, imgScaledWidth, imgScaledHeight);
                      
                      // Download PDF
                      pdf.save(`Invoice-${selectedInvoice.invoiceNumber}.pdf`);
                    } catch (error) {
                      console.error('Error generating PDF:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate PDF. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-download-invoice"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={() => {
                  if (invoiceRef.current) {
                    const printContent = invoiceRef.current.innerHTML;
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Invoice ${selectedInvoice?.invoiceNumber}</title>
                            <meta charset="UTF-8">
                            <style>
                              * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                              }
                              body {
                                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #000;
                                background: #fff;
                                padding: 20px;
                              }
                              @media print {
                                body {
                                  padding: 0;
                                  margin: 0;
                                }
                                @page {
                                  size: A4;
                                  margin: 1cm;
                                }
                              }
                              .max-w-4xl {
                                max-width: 100%;
                                margin: 0 auto;
                                background: #fff;
                              }
                              .flex {
                                display: flex;
                              }
                              .justify-between {
                                justify-content: space-between;
                              }
                              .items-start {
                                align-items: flex-start;
                              }
                              .items-center {
                                align-items: center;
                              }
                              .space-x-4 > * + * {
                                margin-left: 1rem;
                              }
                              .mb-8 {
                                margin-bottom: 2rem;
                              }
                              .mb-2 {
                                margin-bottom: 0.5rem;
                              }
                              .mb-4 {
                                margin-bottom: 1rem;
                              }
                              .mt-2 {
                                margin-top: 0.5rem;
                              }
                              .mt-4 {
                                margin-top: 1rem;
                              }
                              .p-8 {
                                padding: 2rem;
                              }
                              .p-6 {
                                padding: 1.5rem;
                              }
                              .p-4 {
                                padding: 1rem;
                              }
                              .p-3 {
                                padding: 0.75rem;
                              }
                              .text-2xl {
                                font-size: 1.5rem;
                                line-height: 2rem;
                              }
                              .text-3xl {
                                font-size: 1.875rem;
                                line-height: 2.25rem;
                              }
                              .text-lg {
                                font-size: 1.125rem;
                                line-height: 1.75rem;
                              }
                              .text-sm {
                                font-size: 0.875rem;
                                line-height: 1.25rem;
                              }
                              .font-bold {
                                font-weight: 700;
                              }
                              .font-semibold {
                                font-weight: 600;
                              }
                              .font-medium {
                                font-weight: 500;
                              }
                              .text-gray-900 {
                                color: #111827;
                              }
                              .text-gray-700 {
                                color: #374151;
                              }
                              .text-gray-600 {
                                color: #4b5563;
                              }
                              .text-gray-500 {
                                color: #6b7280;
                              }
                              .bg-white {
                                background-color: #fff;
                              }
                              .bg-gray-50 {
                                background-color: #f9fafb;
                              }
                              .bg-green-100 {
                                background-color: #dcfce7;
                              }
                              .text-green-800 {
                                color: #166534;
                              }
                              .rounded-lg {
                                border-radius: 0.5rem;
                              }
                              .rounded {
                                border-radius: 0.25rem;
                              }
                              .border-b {
                                border-bottom-width: 1px;
                              }
                              .border-gray-200 {
                                border-color: #e5e7eb;
                              }
                              .border-gray-100 {
                                border-color: #f3f4f6;
                              }
                              .grid {
                                display: grid;
                              }
                              .grid-cols-2 {
                                grid-template-columns: repeat(2, minmax(0, 1fr));
                              }
                              .gap-8 {
                                gap: 2rem;
                              }
                              .gap-4 {
                                gap: 1rem;
                              }
                              .w-full {
                                width: 100%;
                              }
                              .w-80 {
                                width: 20rem;
                              }
                              .w-20 {
                                width: 5rem;
                              }
                              .h-16 {
                                height: 4rem;
                              }
                              .text-left {
                                text-align: left;
                              }
                              .text-right {
                                text-align: right;
                              }
                              .text-center {
                                text-align: center;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                              }
                              th, td {
                                padding: 0.75rem;
                                text-align: left;
                              }
                              th {
                                font-weight: 600;
                                border-bottom: 1px solid #e5e7eb;
                              }
                              td {
                                border-bottom: 1px solid #f3f4f6;
                              }
                              .w-24 {
                                width: 6rem;
                              }
                              .w-32 {
                                width: 8rem;
                              }
                              .object-contain {
                                object-fit: contain;
                              }
                              .whitespace-pre-line {
                                white-space: pre-line;
                              }
                              img {
                                max-width: 100%;
                                height: auto;
                              }
                              @media print {
                                .print\\:p-0 {
                                  padding: 0;
                                }
                                body {
                                  padding: 0;
                                  margin: 0;
                                }
                              }
                            </style>
                          </head>
                          <body>${printContent}</body>
                        </html>
                      `);
                      printWindow.document.close();
                      setTimeout(() => {
                      printWindow.print();
                      }, 250);
                    }
                  }
                }}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-print-invoice"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceTemplate ref={invoiceRef} invoice={selectedInvoice} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={stripeAlertOpen} onOpenChange={setStripeAlertOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stripe</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">{stripeAlertMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStripeAlertOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Downgrade Validation Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cannot Downgrade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-lg font-semibold">Usage Exceeds Plan Limits</AlertTitle>
              <AlertDescription className="mt-2">
                Your current usage exceeds the limits of the selected plan. Please reduce your usage before downgrading.
              </AlertDescription>
            </Alert>
            
            {requiredDeletions && (requiredDeletions.users > 0 || requiredDeletions.patients > 0) && (
              <div className="p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="font-bold text-base text-red-900 dark:text-red-100">Required Actions to Downgrade:</p>
                </div>
                <div className="space-y-3">
                  {requiredDeletions.users > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                          <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-red-900 dark:text-red-100">Users</p>
                          <p className="text-xs text-red-700 dark:text-red-300">Remove users to continue</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{requiredDeletions.users}</p>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          {requiredDeletions.users === 1 ? 'user' : 'users'} to remove
                        </p>
                      </div>
                    </div>
                  )}
                  {requiredDeletions.patients > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                          <User className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-red-900 dark:text-red-100">Patients</p>
                          <p className="text-xs text-red-700 dark:text-red-300">Remove patients to continue</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{requiredDeletions.patients}</p>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          {requiredDeletions.patients === 1 ? 'patient' : 'patients'} to remove
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Total: <span className="font-bold">{requiredDeletions.users + requiredDeletions.patients}</span> item{(requiredDeletions.users + requiredDeletions.patients) === 1 ? '' : 's'} need to be removed
                  </p>
                </div>
              </div>
            )}

            {downgradeErrors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Details:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {downgradeErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> Once you've reduced your usage to within the plan limits, you can try downgrading again.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => {
                setShowDowngradeDialog(false);
                setDowngradeErrors([]);
                setRequiredDeletions(null);
              }}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Are you sure?</AlertTitle>
              <AlertDescription>
                Cancelling your subscription will downgrade your account to the Basic (free) plan.
                {subscription?.currentPeriodEnd && (
                  <div className="mt-2">
                    Your subscription will remain active until{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCancel(false)}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Processing..." : "Cancel at Period End"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Billing Cycle Change Dialog */}
      <Dialog open={showChangeCycleDialog} onOpenChange={setShowChangeCycleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Billing Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p>Current cycle: <strong>{subscription?.billingCycle === 'annual' ? 'Annual' : 'Monthly'}</strong></p>
              <p className="text-sm text-muted-foreground mt-2">
                {subscription?.billingCycle === 'monthly' 
                  ? "Switching to annual billing will take effect immediately. Unused monthly credit will be applied."
                  : "Switching to monthly billing will take effect at the next renewal date."}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowChangeCycleDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const newCycle = subscription?.billingCycle === 'annual' ? 'monthly' : 'annual';
                  const newCycleFilter: 'monthly' | 'yearly' = newCycle === 'annual' ? 'yearly' : 'monthly';
                  
                  // Check if packages exist for the new billing cycle
                  const availablePackages = dbPackages.filter(pkg => {
                    const pkgCycle = pkg.billingCycle?.toLowerCase();
                    if (!pkgCycle) return false;
                    // Normalize 'annual' to 'yearly' for comparison
                    const normalizedPkgCycle = pkgCycle === 'annual' ? 'yearly' : pkgCycle;
                    return normalizedPkgCycle === newCycleFilter;
                  });
                  
                  if (availablePackages.length === 0) {
                    setNoPackagesMessage({
                      title: "No packages available",
                      description: `No ${newCycleFilter === 'yearly' ? 'yearly' : 'monthly'} packages are available. Please contact support.`,
                    });
                    setShowNoPackagesDialog(true);
                    return;
                  }
                  
                  // Set the billing cycle filter to show/hide packages
                  setSelectedBillingCycleFilter(newCycleFilter);
                  
                  // Change the billing cycle
                  handleChangeCycle(newCycle);
                }}
                disabled={changeCycleLoading}
              >
                {changeCycleLoading ? "Processing..." : `Switch to ${subscription?.billingCycle === 'annual' ? 'Monthly' : 'Annual'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Packages Available Dialog */}
      <Dialog open={showNoPackagesDialog} onOpenChange={setShowNoPackagesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noPackagesMessage?.title || "No packages available"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {noPackagesMessage?.description || "No packages are available. Please contact support."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNoPackagesDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Confirmation Dialog */}
      <Dialog open={showUpgradeConfirmDialog} onOpenChange={setShowUpgradeConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to {upgradeDetails?.newPlanName || 'New Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {upgradeDetails && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    You are upgrading from <strong>{upgradeDetails.currentPlanName}</strong> ({currencySymbol}{upgradeDetails.currentPlanPrice.toFixed(2)}/month) to <strong>{upgradeDetails.newPlanName}</strong> ({currencySymbol}{upgradeDetails.newPlanPrice.toFixed(2)}/month).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your current billing cycle has <strong>{upgradeDetails.daysRemaining} days</strong> remaining.
                  </p>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Billing Breakdown:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Plan:</span>
                      <span>{currencySymbol}{upgradeDetails.currentPlanPrice.toFixed(2)}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining Credit:</span>
                      <span>{currencySymbol}{upgradeDetails.remainingCredit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Plan Price:</span>
                      <span>{currencySymbol}{upgradeDetails.newPlanPrice.toFixed(2)}/month</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span>Amount Due Today:</span>
                      <span>{currencySymbol}{upgradeDetails.amountDueToday.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    ✓ Your {upgradeDetails.newPlanName} benefits will activate immediately after confirmation.
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    ✓ Your next billing date will remain the same.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Do you want to proceed with the upgrade?
                </p>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowUpgradeConfirmDialog(false);
                setSelectedUpgradePlan(null);
                setUpgradeDetails(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedUpgradePlan) {
                    setShowUpgradeConfirmDialog(false);
                    handleUpgrade(selectedUpgradePlan);
                  }
                }}
                disabled={upgradeLoading === selectedUpgradePlan?.id}
              >
                {upgradeLoading === selectedUpgradePlan?.id ? "Processing..." : "Confirm Upgrade"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Box Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              Digital Signature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Digital Signature Pad
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Signature Quality: Real-time Analysis
                </div>
              </div>

              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg relative overflow-hidden bg-white dark:bg-gray-900 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={450}
                  height={200}
                  className="cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawingTouch}
                  onTouchMove={drawTouch}
                  onTouchEnd={stopDrawingTouch}
                />
                <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500">
                  Advanced Capture Mode
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearSignature}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    const signatureData = canvas.toDataURL();
                    setSignature(signatureData);
                    toast({
                      title: "Signature Saved",
                      description: "Your signature has been captured successfully.",
                    });
                    setShowSignatureDialog(false);
                  }
                }}
              >
                Save Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
