import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  ShoppingBag,
  CreditCard,
  Banknote,
  Shield,
  Receipt,
  Trash2,
  Eye,
  X,
  User,
  Phone,
  FileText,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  FILTER_ALL,
  InventoryFilterCombobox,
  InventoryFilterDate,
  applyExclusiveFilter,
  buildFilterOptions,
  matchesFilterValue,
  inventoryClearButtonClass,
  inventoryIdCellClass,
  inventoryNumberCellClass,
  inventoryTableCellClass,
  inventoryTableHeadClass,
} from "@/components/inventory/inventory-filter-combobox";

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  salePrice: string;
  currentStock: number;
  prescriptionRequired: boolean;
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
  saleType: string;
  customerName: string | null;
  totalAmount: string;
  paymentStatus: string;
  status: string;
  saleDate: string;
}

interface Payment {
  method: 'cash' | 'card' | 'insurance' | 'credit_note';
  amount: number;
  cardLast4?: string;
  cardType?: string;
  authorizationCode?: string;
  insuranceProviderId?: number;
  claimNumber?: string;
}

interface SaleItem {
  id: number;
  itemId: number;
  itemName: string;
  batchId: number;
  batchNumber: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  discountPercent: string;
}

interface SalePayment {
  id: number;
  paymentMethod: string;
  amount: string;
  status: string;
}

interface SaleDetails extends Sale {
  subtotalAmount: string;
  taxAmount: string;
  discountAmount: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  prescriptionNumber?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
    genericAllowed: boolean;
  }>;
  diagnosis: string;
  status: "active" | "completed" | "cancelled" | "pending" | "signed";
  prescribedAt: string;
}

interface SaleCreatePayload {
  saleType: 'walk_in' | 'prescription';
  customerName?: string;
  customerPhone?: string;
  prescriptionId?: number;
  items: Array<{
    itemId: number;
    quantity: number;
    discountPercent?: number;
  }>;
  payments: Array<{
    method: 'cash' | 'card' | 'insurance' | 'credit_note';
    amount: number;
    cardLast4?: string;
    cardType?: string;
    authorizationCode?: string;
    insuranceProviderId?: number;
    claimNumber?: string;
  }>;
  discountType?: 'percentage' | 'fixed';
  discountAmount?: number;
  notes?: string;
}

export default function PharmacySales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showPOSDialog, setShowPOSDialog] = useState(false);
  const [showSaleDetailsDialog, setShowSaleDetailsDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<'walk_in' | 'prescription'>('walk_in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItemCombobox, setOpenItemCombobox] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [showVoidSaleDialog, setShowVoidSaleDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [showDeleteSaleDialog, setShowDeleteSaleDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [salesFilters, setSalesFilters] = useState({
    saleNumber: FILTER_ALL,
    invoiceNumber: FILTER_ALL,
    saleType: FILTER_ALL,
    customer: FILTER_ALL,
    status: FILTER_ALL,
    saleDate: "",
  });

  const salesFilterDefaults = {
    saleNumber: FILTER_ALL,
    invoiceNumber: FILTER_ALL,
    saleType: FILTER_ALL,
    customer: FILTER_ALL,
    status: FILTER_ALL,
    saleDate: "",
  };

  const applySalesFilter = (
    key: keyof typeof salesFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(
    salesFilterDefaults,
    setSalesFilters,
    key,
    value,
    (field) => (field === "saleDate" ? "" : FILTER_ALL),
  );
  
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const showFeedback = (type: "success" | "error", title: string, message: string, details?: string) => {
    setFeedbackModal({ isOpen: true, type, title, message, details });
  };

  const closeFeedback = () => {
    setFeedbackModal(prev => ({ ...prev, isOpen: false }));
  };

  const { data: items = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory/items'],
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['/api/inventory/sales'],
  });

  const salesFilterOptions = useMemo(() => ({
    saleNumber: buildFilterOptions(sales.map((sale) => sale.saleNumber), "All Sale #"),
    invoiceNumber: buildFilterOptions(sales.map((sale) => sale.invoiceNumber), "All Invoice #"),
    saleType: buildFilterOptions(
      sales.map((sale) => (sale.saleType === "walk_in" ? "Walk-in" : "Prescription")),
      "All Types",
    ),
    customer: buildFilterOptions(
      sales.map((sale) => sale.customerName || "Walk-in Customer"),
      "All Customers",
    ),
    status: buildFilterOptions(sales.map((sale) => sale.status), "All Statuses"),
  }), [sales]);

  const filteredSales = useMemo(() => sales.filter((sale) => {
    if (!matchesFilterValue(salesFilters.saleNumber, sale.saleNumber)) return false;
    if (!matchesFilterValue(salesFilters.invoiceNumber, sale.invoiceNumber)) return false;

    const saleTypeLabel = sale.saleType === "walk_in" ? "Walk-in" : "Prescription";
    if (!matchesFilterValue(salesFilters.saleType, saleTypeLabel)) return false;

    const customerLabel = sale.customerName || "Walk-in Customer";
    if (!matchesFilterValue(salesFilters.customer, customerLabel)) return false;
    if (!matchesFilterValue(salesFilters.status, sale.status)) return false;

    if (salesFilters.saleDate) {
      const saleDateValue = format(new Date(sale.saleDate), "yyyy-MM-dd");
      if (saleDateValue !== salesFilters.saleDate) return false;
    }

    return true;
  }), [sales, salesFilters]);

  // Fetch prescriptions when sale type is prescription
  const { data: prescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['/api/prescriptions'],
    enabled: saleType === 'prescription' && showPOSDialog,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/prescriptions');
      return response.json();
    },
  });

  // Get selected prescription from the list
  const selectedPrescription = prescriptions.find(p => p.id === selectedPrescriptionId);

  // Auto-fill customer name when prescription is selected
  useEffect(() => {
    if (selectedPrescription && saleType === 'prescription') {
      setCustomerName(selectedPrescription.patientName);
    }
  }, [selectedPrescription, saleType]);

  const { data: saleDetails } = useQuery<SaleDetails>({
    queryKey: ['/api/inventory/sales', selectedSale?.id],
    enabled: !!selectedSale?.id,
    queryFn: async ({ queryKey }) => {
      const [, saleId] = queryKey;
      const response = await apiRequest("GET", `/api/inventory/sales/${saleId}`);
      return response.json();
    },
  });

  const handleSaleTypeChange = (newType: 'walk_in' | 'prescription') => {
    if (newType === 'walk_in' && cart.some(c => c.prescriptionRequired)) {
      toast({
        title: "Cannot change to Walk-in",
        description: "Cart contains prescription-only items. Remove them first or keep as Prescription sale.",
        variant: "destructive"
      });
      return;
    }
    setSaleType(newType);
    // Reset prescription selection when changing sale type
    if (newType === 'walk_in') {
      setSelectedPrescriptionId(null);
      setCustomerName('');
    }
  };

  const handlePrescriptionSelect = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
  };

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: SaleCreatePayload) => {
      const response = await apiRequest('POST', '/api/inventory/sales', saleData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      resetPOS();
      setShowPOSDialog(false);
      showFeedback(
        "success",
        "Sale Completed",
        "Your sale has been processed successfully.",
        data?.saleNumber ? `Sale #${data.saleNumber}` : undefined
      );
    },
    onError: (error: any) => {
      let errorMessage = "There was an error processing your sale.";
      let errorDetails = error.message || "Unknown error";
      
      // Parse error message for user-friendly display
      try {
        // Check if error message contains JSON
        if (error.message && error.message.includes('{')) {
          const jsonMatch = error.message.match(/\{.*\}/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[0]);
            if (errorData.error) {
              errorDetails = errorData.error;
              
              // Handle "Insufficient stock" error with user-friendly message
              if (errorData.error.includes("Insufficient stock")) {
                // Try to parse new format: "Only X unit(s) available, but Y unit(s) requested."
                let stockMatch = errorData.error.match(/Only (\d+) unit\(s\) available, but (\d+) unit\(s\) requested/);
                // Fallback to old format: "Available: X, Requested: Y"
                if (!stockMatch) {
                  stockMatch = errorData.error.match(/Available: (\d+), Requested: (\d+)/);
                }
                if (stockMatch) {
                  const available = stockMatch[1];
                  const requested = stockMatch[2];
                  errorMessage = `Insufficient stock available. Only ${available} unit(s) available, but ${requested} unit(s) requested.`;
                  errorDetails = `Please reduce the quantity or select a different item.`;
                } else {
                  // Use the error message as-is if it already contains the formatted message
                  if (errorData.error.includes("Only") && errorData.error.includes("unit(s) available")) {
                    errorMessage = errorData.error;
                    errorDetails = `Please reduce the quantity or select a different item.`;
                  } else {
                    errorMessage = "Insufficient stock available for one or more items in your cart.";
                    errorDetails = "Please check the stock levels and adjust quantities accordingly.";
                  }
                }
              } else {
                errorMessage = errorData.error;
              }
            }
          }
        } else if (error.message && error.message.includes("Insufficient stock")) {
          // Try to parse the error message directly
          let stockMatch = error.message.match(/Only (\d+) unit\(s\) available, but (\d+) unit\(s\) requested/);
          if (!stockMatch) {
            stockMatch = error.message.match(/Available: (\d+), Requested: (\d+)/);
          }
          if (stockMatch) {
            const available = stockMatch[1];
            const requested = stockMatch[2];
            errorMessage = `Insufficient stock available. Only ${available} unit(s) available, but ${requested} unit(s) requested.`;
            errorDetails = `Please reduce the quantity or select a different item.`;
          } else if (error.message.includes("Only") && error.message.includes("unit(s) available")) {
            // Use the error message as-is if it's already formatted
            errorMessage = error.message;
            errorDetails = `Please reduce the quantity or select a different item.`;
          } else {
            errorMessage = "Insufficient stock available for one or more items in your cart.";
            errorDetails = "Please check the stock levels and adjust quantities accordingly.";
          }
        }
      } catch (parseError) {
        // If parsing fails, use the original error message
        console.error("Error parsing error message:", parseError);
      }
      
      showFeedback(
        "error",
        "Sale Failed",
        errorMessage,
        errorDetails
      );
    },
  });

  const voidSaleMutation = useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: number; reason: string }) => {
      const response = await apiRequest('POST', `/api/inventory/sales/${saleId}/void`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      setShowSaleDetailsDialog(false);
      showFeedback(
        "success",
        "Sale Voided",
        "The sale has been voided successfully and stock has been restored."
      );
    },
    onError: (error: Error) => {
      showFeedback(
        "error",
        "Void Failed",
        "There was an error voiding the sale.",
        error.message
      );
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: number) => {
      const response = await apiRequest('DELETE', `/api/inventory/sales/${saleId}`);
      if (!response.ok) {
        const text = await response.text();
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || "Failed to delete sale");
        } catch {
          throw new Error(
            text.includes("Cannot DELETE")
              ? "Sale delete API is unavailable. Please restart the server and try again."
              : text.slice(0, 200) || "Failed to delete sale",
          );
        }
      }
      return response.json();
    },
    onSuccess: (_data, saleId) => {
      queryClient.setQueryData<Sale[]>(['/api/inventory/sales'], (current) =>
        current?.filter((sale) => sale.id !== saleId) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      setShowDeleteSaleDialog(false);
      setSaleToDelete(null);
      setSelectedSale((current) => {
        if (current?.id === saleId) {
          setShowSaleDetailsDialog(false);
          return null;
        }
        return current;
      });
      showFeedback(
        "success",
        "Sale Deleted",
        "The sale has been removed from the list.",
      );
    },
    onError: (error: Error) => {
      showFeedback(
        "error",
        "Delete Failed",
        "There was an error deleting the sale.",
        error.message,
      );
    },
  });

  const resetPOS = () => {
    setCart([]);
    setSaleType('walk_in');
    setCustomerName('');
    setCustomerPhone('');
    setSearchQuery('');
    setOpenItemCombobox(false);
    setPayments([]);
    setNotes('');
    setDiscountType('percentage');
    setDiscountAmount(0);
    setSelectedPrescriptionId(null);
  };

  // Filter items - show all items with stock > 0, optionally filtered by search query
  const filteredItems = items.filter(item =>
    item.currentStock > 0 &&
    (!searchQuery || 
     item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToCart = (item: InventoryItem) => {
    if (item.prescriptionRequired && saleType === 'walk_in') {
      toast({ 
        title: "Prescription Required", 
        description: `${item.name} requires a prescription. Please change sale type to Prescription.`,
        variant: "destructive" 
      });
      return;
    }

    const existingItem = cart.find(c => c.itemId === item.id);
    if (existingItem) {
      if (existingItem.quantity < item.currentStock) {
        setCart(cart.map(c =>
          c.itemId === item.id
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice * (1 - c.discountPercent / 100) }
            : c
        ));
      } else {
        toast({ title: "Insufficient stock", variant: "destructive" });
      }
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
        maxStock: item.currentStock,
        prescriptionRequired: item.prescriptionRequired,
      }]);
    }
    setSearchQuery('');
  };

  const updateCartItem = (itemId: number, field: 'quantity' | 'discountPercent', value: number) => {
    setCart(cart.map(c => {
      if (c.itemId !== itemId) return c;
      const updated = { ...c, [field]: value };
      if (field === 'quantity' && value > c.maxStock) {
        toast({ title: "Insufficient stock", variant: "destructive" });
        return c;
      }
      updated.lineTotal = updated.quantity * updated.unitPrice * (1 - updated.discountPercent / 100);
      return updated;
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.lineTotal, 0);
  const orderDiscount = discountType === 'percentage' 
    ? subtotal * (discountAmount / 100) 
    : discountAmount;
  const total = subtotal - orderDiscount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = Math.max(0, total - totalPaid);
  const changeGiven = Math.max(0, totalPaid - total);

  const addPayment = (method: Payment['method']) => {
    setPayments([...payments, { method, amount: amountDue }]);
  };

  const updatePayment = (index: number, amount: number) => {
    setPayments(payments.map((p, i) => i === index ? { ...p, amount } : p));
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (totalPaid < total) {
      toast({ title: "Payment incomplete", variant: "destructive" });
      return;
    }

    createSaleMutation.mutate({
      saleType,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      prescriptionId: selectedPrescriptionId ? parseInt(selectedPrescriptionId) : undefined,
      items: cart.map(c => ({
        itemId: c.itemId,
        quantity: c.quantity,
        discountPercent: c.discountPercent,
      })),
      payments,
      discountType: discountAmount > 0 ? discountType : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      notes: notes || undefined,
    });
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'insurance': return <Shield className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Completed</Badge>;
      case 'sales_returned':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Sales returned</Badge>;
      case 'voided':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Voided</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pharmacy Sales</h2>
          <p className="text-muted-foreground">Point of sale for prescription and walk-in sales</p>
        </div>
        <Button onClick={() => setShowPOSDialog(true)} data-testid="button-new-sale">
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Recent Sales
          </CardTitle>
          <CardDescription>View and manage pharmacy sales transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <InventoryFilterCombobox
              label="Sale #"
              value={salesFilters.saleNumber}
              onChange={(value) => applySalesFilter("saleNumber", value)}
              options={salesFilterOptions.saleNumber}
            />
            <InventoryFilterCombobox
              label="Invoice #"
              value={salesFilters.invoiceNumber}
              onChange={(value) => applySalesFilter("invoiceNumber", value)}
              options={salesFilterOptions.invoiceNumber}
            />
            <InventoryFilterCombobox
              label="Sale Type"
              value={salesFilters.saleType}
              onChange={(value) => applySalesFilter("saleType", value)}
              options={salesFilterOptions.saleType}
            />
            <InventoryFilterCombobox
              label="Customer"
              value={salesFilters.customer}
              onChange={(value) => applySalesFilter("customer", value)}
              options={salesFilterOptions.customer}
            />
            <InventoryFilterCombobox
              label="Status"
              value={salesFilters.status}
              onChange={(value) => applySalesFilter("status", value)}
              options={salesFilterOptions.status}
            />
            <InventoryFilterDate
              label="Sale Date"
              value={salesFilters.saleDate}
              onChange={(value) => applySalesFilter("saleDate", value)}
            />
            <Button
              variant="outline"
              size="sm"
              className={inventoryClearButtonClass}
              onClick={() => setSalesFilters({ ...salesFilterDefaults })}
            >
              Clear
            </Button>
          </div>
          {salesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No sales recorded yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={inventoryTableHeadClass}>Sale #</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Invoice #</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Type</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Customer</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Total</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Payment</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Date</TableHead>
                  <TableHead className={inventoryTableHeadClass}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                    <TableCell className={inventoryIdCellClass}>{sale.saleNumber}</TableCell>
                    <TableCell className={inventoryIdCellClass}>{sale.invoiceNumber}</TableCell>
                    <TableCell className={inventoryTableCellClass}>
                      <Badge variant="outline">
                        {sale.saleType === 'walk_in' ? 'Walk-in' : 'Prescription'}
                      </Badge>
                    </TableCell>
                    <TableCell className={inventoryTableCellClass}>{sale.customerName || 'Walk-in Customer'}</TableCell>
                    <TableCell className={inventoryNumberCellClass}>${parseFloat(sale.totalAmount).toFixed(2)}</TableCell>
                    <TableCell className={inventoryTableCellClass}>
                      <Badge className={sale.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}>
                        {sale.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className={inventoryTableCellClass}>{getStatusBadge(sale.status)}</TableCell>
                    <TableCell className={inventoryTableCellClass}>{format(new Date(sale.saleDate), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell className={inventoryTableCellClass}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowSaleDetailsDialog(true);
                          }}
                          data-testid={`button-view-sale-${sale.id}`}
                          title="View sale"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSaleToDelete(sale);
                            setShowDeleteSaleDialog(true);
                          }}
                          disabled={deleteSaleMutation.isPending}
                          data-testid={`button-delete-sale-${sale.id}`}
                          title="Delete sale"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPOSDialog} onOpenChange={setShowPOSDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Point of Sale
            </DialogTitle>
            <DialogDescription>Create a new pharmacy sale</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sale Type</Label>
                  <Select value={saleType} onValueChange={(v) => handleSaleTypeChange(v as 'walk_in' | 'prescription')}>
                    <SelectTrigger data-testid="select-sale-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in" data-testid="select-item-walk-in">Walk-in</SelectItem>
                      <SelectItem value="prescription" data-testid="select-item-prescription">Prescription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {saleType === 'prescription' && (
                <div>
                  <Label>Select Prescription</Label>
                  <Select
                    value={selectedPrescriptionId || ''}
                    onValueChange={handlePrescriptionSelect}
                  >
                    <SelectTrigger data-testid="select-prescription">
                      <SelectValue placeholder="Select a prescription" />
                    </SelectTrigger>
                    <SelectContent>
                      {prescriptions
                        .filter(p => p.status === 'active' || p.status === 'signed')
                        .map((prescription) => (
                          <SelectItem key={prescription.id} value={prescription.id}>
                            {prescription.prescriptionNumber || `RX-${prescription.id}`} - {prescription.patientName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedPrescription && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <div className="text-sm font-medium mb-2">Prescription Details</div>
                      <div className="text-xs space-y-1">
                        <div><strong>Patient:</strong> {selectedPrescription.patientName}</div>
                        <div><strong>Provider:</strong> {selectedPrescription.providerName}</div>
                        <div><strong>Diagnosis:</strong> {selectedPrescription.diagnosis || 'N/A'}</div>
                        <div><strong>Medications:</strong></div>
                        <ul className="ml-4 list-disc">
                          {selectedPrescription.medications.map((med, idx) => (
                            <li key={idx}>
                              {med.name} - {med.dosage} ({med.frequency}) - Qty: {med.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Customer Name
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={saleType === 'prescription' ? "Auto-filled from prescription" : "Optional"}
                    disabled={saleType === 'prescription' && !!selectedPrescription}
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Optional"
                    data-testid="input-customer-phone"
                  />
                </div>
              </div>

              <div>
                <Label>Search Items</Label>
                <Popover open={openItemCombobox} onOpenChange={setOpenItemCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openItemCombobox}
                      className="w-full justify-between"
                      data-testid="button-select-item"
                    >
                      <span className="text-muted-foreground">
                        {searchQuery ? `Searching: ${searchQuery}` : "Select or search items..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search by name or SKU..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {filteredItems.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={`${item.name} ${item.sku}`}
                              onSelect={() => {
                                addToCart(item);
                                setSearchQuery('');
                                setOpenItemCombobox(false);
                              }}
                              className="cursor-pointer"
                              data-testid={`item-search-result-${item.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  cart.some(c => c.itemId === item.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  SKU: {item.sku} | Stock: {item.currentStock}
                                </div>
                              </div>
                              <div className="font-medium ml-2">${parseFloat(item.salePrice).toFixed(2)}</div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Cart Items</Label>
                <div className="border rounded-md">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Cart is empty. Search and add items above.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-20">Qty</TableHead>
                          <TableHead className="w-20">Disc%</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item) => (
                          <TableRow key={item.itemId} data-testid={`cart-item-${item.itemId}`}>
                            <TableCell>
                              <div className="font-medium">{item.itemName}</div>
                              <div className="text-xs text-muted-foreground">
                                ${item.unitPrice.toFixed(2)} each
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={item.maxStock}
                                value={item.quantity}
                                onChange={(e) => updateCartItem(item.itemId, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 h-8"
                                data-testid={`input-cart-qty-${item.itemId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={item.discountPercent}
                                onChange={(e) => updateCartItem(item.itemId, 'discountPercent', parseFloat(e.target.value) || 0)}
                                className="w-16 h-8"
                                data-testid={`input-cart-disc-${item.itemId}`}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${item.lineTotal.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.itemId)}
                                className="h-8 w-8"
                                data-testid={`button-remove-cart-${item.itemId}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1">Discount</span>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                      data-testid="input-order-discount"
                    />
                    <span className="w-20 text-right">-${orderDiscount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addPayment('cash')} data-testid="button-add-cash">
                      <Banknote className="h-4 w-4 mr-1" /> Cash
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addPayment('card')} data-testid="button-add-card">
                      <CreditCard className="h-4 w-4 mr-1" /> Card
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addPayment('insurance')} data-testid="button-add-insurance">
                      <Shield className="h-4 w-4 mr-1" /> Insurance
                    </Button>
                  </div>

                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      {getPaymentIcon(payment.method)}
                      <span className="capitalize flex-1">{payment.method}</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={payment.amount}
                        onChange={(e) => updatePayment(index, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8"
                        data-testid={`input-payment-amount-${index}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayment(index)}
                        className="h-8 w-8"
                        data-testid={`button-remove-payment-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Separator />
                  <div className="flex justify-between">
                    <span>Amount Paid</span>
                    <span>${totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Amount Due</span>
                    <span className={amountDue > 0 ? 'text-red-500' : 'text-green-500'}>
                      ${amountDue.toFixed(2)}
                    </span>
                  </div>
                  {changeGiven > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Change</span>
                      <span>${changeGiven.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div>
                <Label className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Notes
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional sale notes..."
                  rows={2}
                  data-testid="textarea-sale-notes"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetPOS}
                  data-testid="button-clear-sale"
                >
                  Clear
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || totalPaid < total || createSaleMutation.isPending}
                  data-testid="button-complete-sale"
                >
                  {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaleDetailsDialog} onOpenChange={setShowSaleDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              {selectedSale?.saleNumber} - {selectedSale?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {saleDetails ? (
            <div className="space-y-4" data-testid="sale-details-content">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p data-testid="text-sale-customer">{saleDetails.customerName || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p data-testid="text-sale-date">{format(new Date(saleDetails.saleDate), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge variant="outline" data-testid="badge-sale-type">
                    {saleDetails.saleType === 'walk_in' ? 'Walk-in' : 'Prescription'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  {getStatusBadge(saleDetails.status)}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Items</Label>
                <Table data-testid="table-sale-items">
                  <TableHeader>
                    <TableRow>
                      <TableHead className={inventoryTableHeadClass}>Item</TableHead>
                      <TableHead className={inventoryTableHeadClass}>Batch</TableHead>
                      <TableHead className={`${inventoryTableHeadClass} text-right`}>Qty</TableHead>
                      <TableHead className={`${inventoryTableHeadClass} text-right`}>Unit Price</TableHead>
                      <TableHead className={`${inventoryTableHeadClass} text-right`}>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleDetails.items?.map((item) => (
                      <TableRow key={item.id} data-testid={`row-sale-item-${item.id}`}>
                        <TableCell className={inventoryTableCellClass}>{item.itemName}</TableCell>
                        <TableCell className={inventoryIdCellClass}>{item.batchNumber || '-'}</TableCell>
                        <TableCell className={`${inventoryNumberCellClass} text-right`}>{item.quantity}</TableCell>
                        <TableCell className={`${inventoryNumberCellClass} text-right`}>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className={`${inventoryNumberCellClass} text-right`}>${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Payments</Label>
                  <div className="space-y-2 mt-2" data-testid="sale-payments-list">
                    {saleDetails.payments?.map((payment, index) => (
                      <div key={index} className="flex items-center gap-2" data-testid={`payment-item-${index}`}>
                        {getPaymentIcon(payment.paymentMethod)}
                        <span className="capitalize">{payment.paymentMethod}</span>
                        <span className="ml-auto font-medium">${parseFloat(payment.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="text-sale-subtotal">${parseFloat(saleDetails.subtotalAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span data-testid="text-sale-tax">${parseFloat(saleDetails.taxAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span data-testid="text-sale-discount">-${parseFloat(saleDetails.discountAmount || '0').toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span data-testid="text-sale-total">${parseFloat(saleDetails.totalAmount || '0').toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {saleDetails.status !== 'voided' && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setVoidReason("");
                      setShowVoidSaleDialog(true);
                    }}
                    disabled={voidSaleMutation.isPending}
                    data-testid="button-void-sale"
                  >
                    {voidSaleMutation.isPending ? 'Voiding...' : 'Void Sale'}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Void Sale Dialog */}
      <AlertDialog open={showVoidSaleDialog} onOpenChange={setShowVoidSaleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter a reason for voiding this sale:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding this sale..."
              rows={4}
              className="w-full"
            />
            {voidReason && voidReason.length > 0 && voidReason.length < 5 && (
              <p className="text-sm text-red-600 mt-2">
                Void reason must be at least 5 characters
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowVoidSaleDialog(false);
              setVoidReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (voidReason.trim().length >= 5) {
                  voidSaleMutation.mutate({ saleId: selectedSale!.id, reason: voidReason.trim() });
                  setShowVoidSaleDialog(false);
                  setVoidReason("");
                } else {
                  toast({ 
                    title: "Validation Error", 
                    description: "Void reason must be at least 5 characters", 
                    variant: "destructive" 
                  });
                }
              }}
              disabled={voidSaleMutation.isPending || voidReason.trim().length < 5}
              className="bg-red-600 hover:bg-red-700"
            >
              {voidSaleMutation.isPending ? 'Voiding...' : 'Void Sale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteSaleDialog} onOpenChange={setShowDeleteSaleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Delete sale {saleToDelete?.saleNumber}? This will permanently remove the sale from the list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (saleToDelete) {
                  deleteSaleMutation.mutate(saleToDelete.id);
                }
              }}
              disabled={deleteSaleMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSaleMutation.isPending ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={closeFeedback}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        details={feedbackModal.details}
      />
    </div>
  );
}
