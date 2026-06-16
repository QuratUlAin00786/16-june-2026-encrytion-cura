import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PoundSterling, 
  ShoppingCart, 
  RotateCcw, 
  AlertTriangle, 
  Clock, 
  CreditCard,
  Package,
  TrendingUp,
  Play,
  Square,
  Plus,
  Search,
  Trash2,
  Banknote,
  Shield,
  FileText,
  User,
  Phone,
  X,
  UserCircle,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  salePrice: string;
  currentStock: number;
  prescriptionRequired: boolean;
  batchStock: number;
}

interface CartItem {
  itemId: number;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  maxStock: number;
  prescriptionRequired: boolean;
}

interface Sale {
  id: number;
  saleNumber: string;
  invoiceNumber: string;
  customerName: string | null;
  totalAmount: string;
  status: string;
  saleDate: string;
  paymentMethod: string;
}

interface SaleItem {
  id: number;
  itemId: number;
  itemName: string;
  batchId: number;
  batchNumber: string | null;
  quantity: number;
  returnedQuantity?: number;
  unitPrice: string;
  totalPrice: string;
}

interface SaleWithItems extends Sale {
  items?: SaleItem[];
}

interface ReturnItem {
  originalSaleItemId: number;
  itemId: number;
  itemName: string;
  batchId: number;
  batchNumber: string | null;
  returnedQuantity: number;
  maxReturnableQty: number;
  conditionOnReturn: 'sealed' | 'opened' | 'damaged' | 'expired';
  isRestockable: boolean;
  unitPrice: string;
}

interface SalesReturn {
  id: number;
  returnNumber: string;
  returnDate: string;
  totalAmount: string;
  netRefundAmount: string;
  settlementType: string;
  status: string;
  returnReason: string;
}

interface DashboardData {
  todaySales: { count: number; amount: number };
  todayReturns: { count: number; amount: number };
  lowStockItems: Array<{
    id: number;
    name: string;
    sku: string;
    currentStock: number;
    minimumStock: number;
    reorderPoint: number;
  }>;
  nearExpiryItems: Array<{
    id: number;
    itemId: number;
    batchNumber: string;
    expiryDate: string;
    remainingQuantity: number;
    itemName: string;
    itemSku: string;
  }>;
  pendingInsurance: { count: number; amount: number };
  pendingCredit: { count: number; amount: number };
}

interface ShiftData {
  id: number;
  shiftDate: string;
  shiftStartTime: string;
  status: string;
  openingCash: string;
}

const safeFormatDate = (dateValue: string | null | undefined, formatStr: string): string => {
  if (!dateValue) return "N/A";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatStr);
  } catch {
    return "N/A";
  }
};

export default function PharmacyDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [startShiftOpen, setStartShiftOpen] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState("0.00");
  const [closingCash, setClosingCash] = useState("0.00");
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

  // Point of Sale state
  const [showPOSDialog, setShowPOSDialog] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<'walk_in' | 'prescription'>('walk_in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [posNotes, setPosNotes] = useState('');
  const [posDiscountType, setPosDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [posDiscountAmount, setPosDiscountAmount] = useState(0);
  // Multi-payment support
  const [payments, setPayments] = useState<Array<{ method: 'cash' | 'card' | 'insurance' | 'credit'; amount: number }>>([
    { method: 'cash', amount: 0 }
  ]);
  // Stock validation error
  const [stockError, setStockError] = useState<string>('');

  // Invoice View state
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  // Sales Return state
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<SaleWithItems | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnReasonDetails, setReturnReasonDetails] = useState('');
  const [settlementType, setSettlementType] = useState<'refund' | 'credit_note' | 'store_credit'>('credit_note');
  const [restockingFee, setRestockingFee] = useState(0);
  const [returnInternalNotes, setReturnInternalNotes] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/pharmacy/dashboard"],
  });

  const { data: currentShift, isLoading: shiftLoading } = useQuery<ShiftData | null>({
    queryKey: ["/api/pharmacy/shifts/current"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory/items'],
  });

  const { data: completedSales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/inventory/sales'],
  });

  const { data: salesReturns = [] } = useQuery<SalesReturn[]>({
    queryKey: ['/api/inventory/returns'],
  });

  const { data: saleDetails, isLoading: saleDetailsLoading } = useQuery<SaleWithItems>({
    queryKey: ['/api/inventory/sales', selectedSaleForReturn?.id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/sales/${selectedSaleForReturn!.id}`, {
        headers: {
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || '',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch sale details');
      return res.json();
    },
    enabled: !!selectedSaleForReturn?.id,
  });

  const { data: invoiceDetails, isLoading: invoiceDetailsLoading } = useQuery<SaleWithItems>({
    queryKey: ['/api/inventory/sales/invoice', selectedSaleForInvoice?.id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/sales/${selectedSaleForInvoice!.id}`, {
        headers: {
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || '',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      return res.json();
    },
    enabled: !!selectedSaleForInvoice?.id,
  });

  // POS Mutations
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await apiRequest('POST', '/api/inventory/sales', saleData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sale completed successfully" });
      qc.invalidateQueries({ queryKey: ['/api/inventory/sales'] });
      qc.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      qc.invalidateQueries({ queryKey: ['/api/pharmacy/dashboard'] });
      resetPOS();
      setShowPOSDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating sale", description: error.message, variant: "destructive" });
    },
  });

  // Return Mutations
  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const response = await apiRequest('POST', '/api/inventory/returns/sales', returnData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Return processed successfully" });
      qc.invalidateQueries({ queryKey: ['/api/inventory/returns'] });
      qc.invalidateQueries({ queryKey: ['/api/inventory/sales'] });
      qc.invalidateQueries({ queryKey: ['/api/pharmacy/dashboard'] });
      resetReturn();
      setShowReturnDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error processing return", description: error.message, variant: "destructive" });
    },
  });

  const resetPOS = () => {
    setCart([]);
    setSaleType('walk_in');
    setCustomerName('');
    setCustomerPhone('');
    setSearchQuery('');
    setPosNotes('');
    setPosDiscountType('percentage');
    setPosDiscountAmount(0);
    setPayments([{ method: 'cash', amount: 0 }]);
    setStockError('');
  };

  const resetReturn = () => {
    setSelectedSaleForReturn(null);
    setReturnReason('');
    setReturnReasonDetails('');
    setSettlementType('credit_note');
    setRestockingFee(0);
    setReturnInternalNotes('');
    setReturnItems([]);
  };

  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: InventoryItem) => {
    // Clear previous stock error
    setStockError('');
    
    // Check batch stock availability (actual sellable stock)
    const availableBatchStock = item.batchStock || 0;
    
    if (availableBatchStock <= 0) {
      setStockError(`Item not available for sale. No batch stock available.`);
      return;
    }
    
    if (item.prescriptionRequired && saleType === 'walk_in') {
      toast({
        title: "Prescription Required",
        description: "This item requires a prescription. Please switch to Prescription sale type.",
        variant: "destructive"
      });
      return;
    }
    
    const existingIndex = cart.findIndex(c => c.itemId === item.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      const requestedQty = newCart[existingIndex].quantity + 1;
      if (requestedQty > availableBatchStock) {
        setStockError(`Insufficient batch stock. Available: ${availableBatchStock}, Requested: ${requestedQty}`);
        return;
      }
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].lineTotal = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice * (1 - newCart[existingIndex].discountPercent / 100);
      setCart(newCart);
    } else {
      const unitPrice = parseFloat(item.salePrice);
      setCart([...cart, {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        quantity: 1,
        unitPrice,
        discountPercent: 0,
        lineTotal: unitPrice,
        maxStock: availableBatchStock,
        prescriptionRequired: item.prescriptionRequired
      }]);
    }
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const updateCartQuantity = (itemId: number, quantity: number) => {
    const newCart = cart.map(c => {
      if (c.itemId === itemId) {
        const newQty = Math.max(1, Math.min(quantity, c.maxStock));
        return { ...c, quantity: newQty, lineTotal: newQty * c.unitPrice * (1 - c.discountPercent / 100) };
      }
      return c;
    });
    setCart(newCart);
  };

  const updateCartDiscount = (itemId: number, discount: number) => {
    const newCart = cart.map(c => {
      if (c.itemId === itemId) {
        const discPct = Math.max(0, Math.min(discount, 100));
        return { ...c, discountPercent: discPct, lineTotal: c.quantity * c.unitPrice * (1 - discPct / 100) };
      }
      return c;
    });
    setCart(newCart);
  };

  const addPayment = () => {
    if (payments.length < 4) {
      setPayments([...payments, { method: 'cash', amount: 0 }]);
    }
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index: number, field: 'method' | 'amount', value: any) => {
    const newPayments = [...payments];
    if (field === 'method') {
      newPayments[index] = { ...newPayments[index], method: value };
    } else {
      newPayments[index] = { ...newPayments[index], amount: parseFloat(value) || 0 };
    }
    setPayments(newPayments);
  };

  const subtotal = cart.reduce((sum, c) => sum + c.lineTotal, 0);
  const maxDiscount = posDiscountType === 'percentage' ? subtotal : subtotal;
  const effectiveDiscountAmount = Math.min(posDiscountAmount, posDiscountType === 'percentage' ? 100 : subtotal);
  const discountValue = posDiscountType === 'percentage' 
    ? subtotal * (Math.min(effectiveDiscountAmount, 100) / 100) 
    : Math.min(effectiveDiscountAmount, subtotal);
  const total = subtotal - discountValue;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = total - totalPaid;
  const hasValidPayment = payments.some(p => p.amount > 0);

  // Auto-populate payment amount with total
  useEffect(() => {
    if (total > 0 && payments.length === 1 && payments[0].amount === 0) {
      setPayments([{ method: payments[0].method, amount: parseFloat(total.toFixed(2)) }]);
    }
  }, [total]);

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (total <= 0) {
      toast({ title: "Invalid total", description: "Order total must be greater than zero", variant: "destructive" });
      return;
    }
    if (!hasValidPayment) {
      toast({ title: "No payment entered", description: "Please enter at least one payment amount", variant: "destructive" });
      return;
    }
    if (totalPaid < total - 0.01) {
      toast({ title: "Insufficient payment", description: `Amount due: £${amountDue.toFixed(2)}`, variant: "destructive" });
      return;
    }
    createSaleMutation.mutate({
      saleType,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      items: cart.map(c => ({ itemId: c.itemId, quantity: c.quantity, discountPercent: c.discountPercent })),
      payments: payments.filter(p => p.amount > 0),
      discountType: posDiscountType,
      discountAmount: posDiscountAmount,
      notes: posNotes || undefined,
    });
  };

  const handleSelectSaleForReturn = (sale: Sale) => {
    setSelectedSaleForReturn(sale as SaleWithItems);
    setReturnItems([]);
  };

  // Auto-populate return items when sale details are loaded
  useEffect(() => {
    if (saleDetails?.items && saleDetails.items.length > 0 && returnItems.length === 0 && selectedSaleForReturn) {
      const autoSelectedItems: ReturnItem[] = saleDetails.items.map(item => {
        const maxReturnable = item.quantity - (item.returnedQuantity || 0);
        return {
          originalSaleItemId: item.id,
          itemId: item.itemId,
          itemName: item.itemName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          returnedQuantity: maxReturnable > 0 ? maxReturnable : 0,
          maxReturnableQty: maxReturnable,
          conditionOnReturn: 'sealed' as const,
          isRestockable: true,
          unitPrice: item.unitPrice,
        };
      }).filter(item => item.returnedQuantity > 0);
      
      if (autoSelectedItems.length > 0) {
        setReturnItems(autoSelectedItems);
      }
    }
  }, [saleDetails?.items, selectedSaleForReturn]);

  const handleCreateReturn = () => {
    if (!selectedSaleForReturn || returnItems.length === 0) {
      toast({ title: "Please select items to return", variant: "destructive" });
      return;
    }
    if (!returnReason) {
      toast({ title: "Please select a return reason", variant: "destructive" });
      return;
    }
    createReturnMutation.mutate({
      originalSaleId: selectedSaleForReturn.id,
      returnType: 'partial',
      returnReason,
      returnReasonDetails,
      settlementType,
      restockingFeePercent: restockingFee,
      internalNotes: returnInternalNotes,
      items: returnItems.map(item => ({
        originalSaleItemId: item.originalSaleItemId,
        itemId: item.itemId,
        batchId: item.batchId,
        returnedQuantity: item.returnedQuantity,
        conditionOnReturn: item.conditionOnReturn,
        isRestockable: item.isRestockable,
      })),
    });
  };

  const returnSubtotal = returnItems.reduce((sum, item) => sum + (item.returnedQuantity * parseFloat(item.unitPrice)), 0);
  const returnFee = returnSubtotal * (restockingFee / 100);
  const netRefund = returnSubtotal - returnFee;

  const handleStartShift = async () => {
    try {
      await apiRequest("POST", "/api/pharmacy/shifts/start", { openingCash, notes: shiftNotes });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/shifts/current"] });
      toast({
        title: "Shift Started",
        description: "Your pharmacy shift has been started successfully.",
      });
      setStartShiftOpen(false);
      setOpeningCash("0.00");
      setShiftNotes("");
    } catch (error) {
      let description = "Failed to start shift. Please try again.";
      if (error instanceof Error) {
        const brace = error.message.indexOf("{");
        if (brace >= 0) {
          try {
            const body = JSON.parse(error.message.slice(brace)) as { error?: string };
            if (body.error) description = body.error;
          } catch {
            /* keep default */
          }
        }
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    try {
      await apiRequest("POST", `/api/pharmacy/shifts/${currentShift.id}/close`, { 
        closingCash, 
        discrepancyNotes,
        notes: shiftNotes 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/shifts/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/dashboard"] });
      toast({
        title: "Shift Closed",
        description: "Your pharmacy shift has been closed successfully.",
      });
      setCloseShiftOpen(false);
      setClosingCash("0.00");
      setDiscrepancyNotes("");
      setShiftNotes("");
    } catch (error) {
      let description = "Failed to close shift. Please try again.";
      if (error instanceof Error) {
        const brace = error.message.indexOf("{");
        if (brace >= 0) {
          try {
            const body = JSON.parse(error.message.slice(brace)) as { error?: string };
            if (body.error) description = body.error;
          } catch {
            /* keep default */
          }
        }
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  if (dashboardLoading || shiftLoading) {
    return (
      <div className="p-4 space-y-4 page-zoom-90">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 page-zoom-90">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pharmacy-dashboard-title">Pharmacy Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentShift ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                <Clock className="w-3 h-3 mr-1" />
                Shift Active since {safeFormatDate(currentShift?.shiftStartTime, "h:mm a")}
              </Badge>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setCloseShiftOpen(true)}
                data-testid="button-close-shift"
              >
                <Square className="w-4 h-4 mr-1" />
                Close Shift
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => setStartShiftOpen(true)}
              data-testid="button-start-shift"
            >
              <Play className="w-4 h-4 mr-1" />
              Start Shift
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button 
          size="lg"
          onClick={() => setShowPOSDialog(true)}
          data-testid="button-point-of-sale"
          disabled={!currentShift}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Point of Sale
        </Button>
        <Button 
          variant="outline"
          size="lg"
          onClick={() => setShowReturnDialog(true)}
          data-testid="button-create-return"
          disabled={!currentShift}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Create Sales Return
        </Button>
        {!currentShift && (
          <span className="text-sm text-muted-foreground">Start a shift to process sales and returns</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-todays-sales">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sales-amount">
              £{(dashboardData?.todaySales?.amount ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-sales-count">
              {dashboardData?.todaySales?.count ?? 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-todays-returns">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-returns-amount">
              £{(dashboardData?.todayReturns?.amount ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-returns-count">
              {dashboardData?.todayReturns?.count ?? 0} returns
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-insurance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Insurance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-insurance-amount">
              £{(dashboardData?.pendingInsurance?.amount ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-insurance-count">
              {dashboardData?.pendingInsurance?.count ?? 0} pending claims
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-credit">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Credit</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credit-amount">
              £{(dashboardData?.pendingCredit?.amount ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-credit-count">
              {dashboardData?.pendingCredit?.count ?? 0} credit accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-low-stock">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Medicines
            </CardTitle>
            <CardDescription>
              Items below reorder point
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(dashboardData?.lowStockItems ?? []).length > 0 ? (
              <div className="space-y-3">
                {(dashboardData?.lowStockItems ?? []).slice(0, 10).map((item) => (
                  <div 
                    key={item?.id ?? 0} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    data-testid={`row-low-stock-${item?.id ?? 0}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{item?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{item?.sku ?? "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {item?.currentStock ?? 0} left
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reorder at: {item?.reorderPoint ?? 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No low stock items</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-near-expiry">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              Near Expiry Medicines
            </CardTitle>
            <CardDescription>
              Expiring within 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(dashboardData?.nearExpiryItems ?? []).length > 0 ? (
              <div className="space-y-3">
                {(dashboardData?.nearExpiryItems ?? []).slice(0, 10).map((item) => (
                  <div 
                    key={item?.id ?? 0} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    data-testid={`row-near-expiry-${item?.id ?? 0}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{item?.itemName ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        Batch: {item?.batchNumber ?? "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline"
                        className="text-xs bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      >
                        Exp: {safeFormatDate(item?.expiryDate, "MMM d, yyyy")}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty: {item?.remainingQuantity ?? 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No near-expiry items</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales History Grid */}
      <Card data-testid="card-sales-history">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Sales History
            </CardTitle>
            <CardDescription>
              All completed sales transactions
            </CardDescription>
          </div>
          <Badge variant="secondary">{completedSales.length} sales</Badge>
        </CardHeader>
        <CardContent>
          {completedSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Invoice</th>
                    <th className="text-left p-2 font-medium">Customer</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Payment</th>
                    <th className="text-right p-2 font-medium">Amount</th>
                    <th className="text-center p-2 font-medium">Status</th>
                    <th className="text-center p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSales.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b hover-elevate"
                      data-testid={`row-sale-${sale.id}`}
                    >
                      <td className="p-2 font-medium">{sale.invoiceNumber}</td>
                      <td className="p-2">{sale.customerName || 'Walk-in'}</td>
                      <td className="p-2 text-muted-foreground">
                        {safeFormatDate(sale.saleDate, "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {sale.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-medium">
                        £{parseFloat(sale.totalAmount).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Badge 
                          variant={sale.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedSaleForInvoice(sale);
                            setShowInvoiceDialog(true);
                          }}
                          data-testid={`button-view-invoice-${sale.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sales recorded yet</p>
              <p className="text-sm">Complete a sale to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Returns Grid */}
      <Card data-testid="card-sales-returns">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              Sales Returns
            </CardTitle>
            <CardDescription>
              All processed sales returns
            </CardDescription>
          </div>
          <Badge variant="secondary">{salesReturns.length} returns</Badge>
        </CardHeader>
        <CardContent>
          {salesReturns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Return No.</th>
                    <th className="text-right p-2 font-medium">Total</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Reason</th>
                    <th className="text-left p-2 font-medium">Settlement</th>
                    <th className="text-right p-2 font-medium">Refund</th>
                    <th className="text-center p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReturns.map((returnItem) => (
                    <tr 
                      key={returnItem.id} 
                      className="border-b hover-elevate"
                      data-testid={`row-return-${returnItem.id}`}
                    >
                      <td className="p-2 font-medium">{returnItem.returnNumber}</td>
                      <td className="p-2 text-muted-foreground">
                        £{parseFloat(returnItem.totalAmount || '0').toFixed(2)}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {safeFormatDate(returnItem.returnDate, "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {returnItem.returnReason}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs capitalize"
                        >
                          {returnItem.settlementType?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-medium text-orange-600">
                        £{parseFloat(returnItem.netRefundAmount || '0').toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Badge 
                          variant={returnItem.status === 'approved' ? 'default' : 
                                  returnItem.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {returnItem.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No returns processed yet</p>
              <p className="text-sm">Process a return to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice View Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {selectedSaleForInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Sale invoice details
            </DialogDescription>
          </DialogHeader>
          
          {selectedSaleForInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedSaleForInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{safeFormatDate(selectedSaleForInvoice.saleDate, "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedSaleForInvoice.customerName || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{selectedSaleForInvoice.paymentMethod}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Items</p>
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Item</th>
                        <th className="text-right p-2">Qty</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails?.items?.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">{item.itemName}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">£{parseFloat(item.unitPrice).toFixed(2)}</td>
                          <td className="p-2 text-right">£{parseFloat(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <div className="flex justify-between gap-8">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>£{parseFloat(selectedSaleForInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-lg font-bold">
                    <span>Total:</span>
                    <span>£{parseFloat(selectedSaleForInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Badge variant={selectedSaleForInvoice.status === 'completed' ? 'default' : 'secondary'}>
                  {selectedSaleForInvoice.status}
                </Badge>
                <Badge variant="outline">
                  PAID
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={startShiftOpen} onOpenChange={setStartShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Shift</DialogTitle>
            <DialogDescription>
              Starting a shift tracks your sales, returns, and cash for accountability and audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium" data-testid="text-pharmacist-name">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-pharmacist-role">
                      Pharmacist
                    </p>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <span className="ml-2 font-medium">{format(new Date(), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <span className="ml-2 font-medium">{format(new Date(), "h:mm a")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label htmlFor="openingCash">Opening Cash Amount ($)</Label>
              <Input
                id="openingCash"
                type="number"
                step="0.01"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="Enter cash in drawer"
                data-testid="input-opening-cash"
              />
              <p className="text-xs text-muted-foreground">
                Count and enter the total cash currently in the register drawer.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftNotes">Notes (Optional)</Label>
              <Textarea
                id="shiftNotes"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="Any notes for this shift..."
                data-testid="input-shift-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartShiftOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartShift} data-testid="button-confirm-start-shift">
              <Play className="h-4 w-4 mr-2" />
              Start Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeShiftOpen} onOpenChange={setCloseShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              Enter the closing cash amount to complete your shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closingCash">Closing Cash Amount</Label>
              <Input
                id="closingCash"
                type="number"
                step="0.01"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                data-testid="input-closing-cash"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discrepancyNotes">Discrepancy Notes (if any)</Label>
              <Textarea
                id="discrepancyNotes"
                value={discrepancyNotes}
                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                placeholder="Explain any cash discrepancies..."
                data-testid="input-discrepancy-notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeShiftNotes">Closing Notes (Optional)</Label>
              <Textarea
                id="closeShiftNotes"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="Any notes for shift closing..."
                data-testid="input-close-shift-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseShiftOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseShift} variant="destructive" data-testid="button-confirm-close-shift">
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Point of Sale Dialog */}
      <Dialog open={showPOSDialog} onOpenChange={(open) => { if (!open) resetPOS(); setShowPOSDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Point of Sale
            </DialogTitle>
            <DialogDescription>Create a new pharmacy sale</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Item Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sale Type</Label>
                <Select value={saleType} onValueChange={(v: 'walk_in' | 'prescription') => setSaleType(v)}>
                  <SelectTrigger data-testid="select-sale-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><User className="h-3 w-3" /> Customer Name</Label>
                  <Input 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    placeholder="Optional"
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                  <Input 
                    value={customerPhone} 
                    onChange={(e) => setCustomerPhone(e.target.value)} 
                    placeholder="Optional"
                    data-testid="input-customer-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Search Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setStockError('');
                    }}
                    placeholder="Search by name or SKU..."
                    className="pl-10"
                    data-testid="input-search-items"
                  />
                </div>
                {stockError && (
                  <div className="text-sm text-red-500 font-medium" data-testid="text-stock-error">
                    {stockError}
                  </div>
                )}
                {searchQuery && filteredItems.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredItems.slice(0, 10).map(item => {
                      const isUnavailable = (item.batchStock || 0) <= 0;
                      return (
                        <div 
                          key={item.id}
                          className={`p-2 flex items-center justify-between ${isUnavailable ? 'opacity-70 cursor-not-allowed' : 'hover-elevate cursor-pointer'}`}
                          onClick={() => !isUnavailable && addToCart(item)}
                          data-testid={`item-${item.id}`}
                        >
                          <div>
                            <div className={`font-medium text-sm ${isUnavailable ? 'text-red-500' : ''}`}>{item.name}</div>
                            <div className={`text-xs ${isUnavailable ? 'text-red-400' : 'text-muted-foreground'}`}>{item.sku}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${isUnavailable ? 'text-red-500' : ''}`}>£{parseFloat(item.salePrice).toFixed(2)}</div>
                            <div className={`text-xs ${isUnavailable ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                              {isUnavailable ? 'Not Available' : `Available: ${item.batchStock || 0}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Cart Items</Label>
                <div className="border rounded-md min-h-[150px] max-h-[250px] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Cart is empty. Search and add items above.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {cart.map(item => (
                        <div key={item.itemId} className="p-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.itemName}</div>
                              <div className="text-xs text-muted-foreground">
                                £{item.unitPrice.toFixed(2)} x {item.quantity} = £{(item.unitPrice * item.quantity).toFixed(2)}
                              </div>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => removeFromCart(item.itemId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Qty:</span>
                            <Input
                              type="number"
                              min={1}
                              max={item.maxStock}
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item.itemId, parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-xs"
                            />
                            <span className="text-muted-foreground">Disc %:</span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={item.discountPercent}
                              onChange={(e) => updateCartDiscount(item.itemId, parseFloat(e.target.value) || 0)}
                              className="w-14 h-7 text-xs"
                            />
                            <span className="ml-auto font-medium">£{item.lineTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Discount</span>
                    <Select value={posDiscountType} onValueChange={(v: 'percentage' | 'fixed') => setPosDiscountType(v)}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">£</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      value={posDiscountAmount}
                      onChange={(e) => setPosDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                    <span className="ml-auto">-£{discountValue.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-lg">Payment</CardTitle>
                  <Button size="sm" variant="outline" onClick={addPayment} disabled={payments.length >= 4}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select 
                        value={payment.method} 
                        onValueChange={(v: 'cash' | 'card' | 'insurance' | 'credit') => updatePayment(index, 'method', v)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={payment.amount || ''}
                        onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        className="flex-1 h-8"
                      />
                      {payments.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removePayment(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between">
                    <span>Total Paid</span>
                    <span>£{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-medium ${amountDue > 0.01 ? 'text-destructive' : 'text-green-600'}`}>
                    <span>{amountDue < 0 ? 'Change' : 'Amount Due'}</span>
                    <span>£{Math.abs(amountDue).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><FileText className="h-3 w-3" /> Notes</Label>
                <Textarea
                  value={posNotes}
                  onChange={(e) => setPosNotes(e.target.value)}
                  placeholder="Optional sale notes..."
                  className="h-20"
                  data-testid="input-pos-notes"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { resetPOS(); setShowPOSDialog(false); }}>
              Clear
            </Button>
            <Button 
              onClick={handleCompleteSale} 
              disabled={cart.length === 0 || total <= 0 || !hasValidPayment || totalPaid < total - 0.01 || createSaleMutation.isPending}
              data-testid="button-complete-sale"
            >
              {createSaleMutation.isPending ? "Processing..." : `Complete Sale (£${total.toFixed(2)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sales Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={(open) => { if (!open) resetReturn(); setShowReturnDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Create Sales Return
            </DialogTitle>
            <DialogDescription>Process a return for a completed sale</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Original Sale</Label>
              <Select 
                value={selectedSaleForReturn?.id?.toString() || ''} 
                onValueChange={(v) => {
                  const sale = completedSales.find(s => s.id.toString() === v);
                  if (sale) handleSelectSaleForReturn(sale);
                }}
              >
                <SelectTrigger data-testid="select-original-sale">
                  <SelectValue placeholder="Select a sale to return" />
                </SelectTrigger>
                <SelectContent>
                  {completedSales.filter(s => s.status === 'completed').map(sale => (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      {sale.invoiceNumber} - {sale.customerName || 'Walk-in'} - £{parseFloat(sale.totalAmount).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSaleForReturn && saleDetails?.items && (
              <div className="space-y-2">
                <Label>Select Items to Return</Label>
                <div className="border rounded-md divide-y">
                  {saleDetails.items.map(item => {
                    const returnItem = returnItems.find(ri => ri.originalSaleItemId === item.id);
                    const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                    
                    return (
                      <div key={item.id} className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={!!returnItem}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setReturnItems([...returnItems, {
                                  originalSaleItemId: item.id,
                                  itemId: item.itemId,
                                  itemName: item.itemName,
                                  batchId: item.batchId,
                                  batchNumber: item.batchNumber,
                                  returnedQuantity: 1,
                                  maxReturnableQty: maxReturnable,
                                  conditionOnReturn: 'sealed',
                                  isRestockable: true,
                                  unitPrice: item.unitPrice,
                                }]);
                              } else {
                                setReturnItems(returnItems.filter(ri => ri.originalSaleItemId !== item.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-sm text-muted-foreground">
                              Qty: {item.quantity} | Max returnable: {maxReturnable} | £{parseFloat(item.unitPrice).toFixed(2)} each
                            </div>
                          </div>
                        </div>
                        {returnItem && (
                          <div className="ml-6 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Qty:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={maxReturnable}
                                value={returnItem.returnedQuantity}
                                onChange={(e) => {
                                  const qty = Math.max(1, Math.min(parseInt(e.target.value) || 1, maxReturnable));
                                  setReturnItems(returnItems.map(ri => 
                                    ri.originalSaleItemId === item.id ? { ...ri, returnedQuantity: qty } : ri
                                  ));
                                }}
                                className="w-16 h-8"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Condition:</Label>
                              <Select
                                value={returnItem.conditionOnReturn}
                                onValueChange={(v: 'sealed' | 'opened' | 'damaged' | 'expired') => {
                                  setReturnItems(returnItems.map(ri => 
                                    ri.originalSaleItemId === item.id ? { ...ri, conditionOnReturn: v, isRestockable: v === 'sealed' } : ri
                                  ));
                                }}
                              >
                                <SelectTrigger className="w-28 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sealed">Sealed</SelectItem>
                                  <SelectItem value="opened">Opened</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Return Reason *</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger data-testid="select-return-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wrong_item">Wrong Item</SelectItem>
                    <SelectItem value="defective">Defective Product</SelectItem>
                    <SelectItem value="expired">Expired Product</SelectItem>
                    <SelectItem value="customer_request">Customer Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Settlement Type</Label>
                <Select value={settlementType} onValueChange={(v: 'refund' | 'credit_note' | 'store_credit') => setSettlementType(v)}>
                  <SelectTrigger data-testid="select-settlement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason Details</Label>
              <Textarea
                value={returnReasonDetails}
                onChange={(e) => setReturnReasonDetails(e.target.value)}
                placeholder="Additional details about the return..."
                className="h-16"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Restocking Fee (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={restockingFee}
                  onChange={(e) => setRestockingFee(parseFloat(e.target.value) || 0)}
                  data-testid="input-restocking-fee"
                />
              </div>
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Input
                  value={returnInternalNotes}
                  onChange={(e) => setReturnInternalNotes(e.target.value)}
                  placeholder="Staff notes..."
                />
              </div>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between">
                  <span>Return Subtotal</span>
                  <span>£{returnSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Restocking Fee ({restockingFee}%)</span>
                  <span>-£{returnFee.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Net Refund</span>
                  <span className="text-green-600">£{netRefund.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { resetReturn(); setShowReturnDialog(false); }}>
              Reset
            </Button>
            <Button 
              onClick={handleCreateReturn} 
              disabled={returnItems.length === 0 || !returnReason || createReturnMutation.isPending}
              data-testid="button-create-return"
            >
              {createReturnMutation.isPending ? "Processing..." : "Create Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
