import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  Filter,
  BarChart3,
  ShoppingCart,
  Edit,
  MoreVertical,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Truck,
  Pill,
  Stethoscope,
  Archive,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Users,
  Building2,
  Trash2,
  Loader2,
  Printer,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";
import { Header } from "@/components/layout/header";
import AddItemDialog from "@/components/inventory/add-item-dialog";
import AddItemNameDialog from "@/components/inventory/add-item-name-dialog";
import StockAdjustmentDialog from "@/components/inventory/stock-adjustment-dialog";
import PurchaseOrderDialog from "../components/inventory/purchase-order-dialog";
import GoodsReceiptDialog from "../components/inventory/goods-receipt-dialog";
import PharmacySales from "@/components/inventory/pharmacy-sales";
import ReturnsManagement from "@/components/inventory/returns-management";
import {
  FILTER_ALL,
  InventoryFilterCombobox,
  InventoryFilterDate,
  InventoryFilterSelect,
  applyExclusiveFilter,
  buildFilterOptions,
  matchesFilterValue,
  inventoryClearButtonClass,
  inventoryIdCellClass,
  inventoryNumberCellClass,
  inventoryTableCellClass,
  inventoryTableHeadClass,
} from "@/components/inventory/inventory-filter-combobox";
import { ShoppingBag, RotateCcw } from "lucide-react";

// 1. Item Master Interface
interface InventoryItem {
  id: number; // Unique identifier
  name: string; // Item Name
  description?: string;
  sku: string;
  barcode?: string;
  brandName?: string;
  manufacturer?: string;
  categoryId: number;
  categoryName?: string; // Category (Medicine/Equipment)
  unitOfMeasurement: string; // Unit of Measurement (Strip, Bottle, etc.)
  purchasePrice: string;
  salePrice: string;
  mrp?: string;
  currentStock: number;
  batchStock?: number; // Sum of all batch remainingQuantity values
  minimumStock: number;
  reorderPoint: number; // Reorder Level (To prevent stockouts)
  prescriptionRequired: boolean;
  isActive: boolean;
  stockValue: number;
  isLowStock: boolean;
  expiryDate?: string; // Expiry Date (Critical for medicines)
  createdAt: string;
  updatedAt: string;
}

// 2. Stock/Inventory Table Interface
interface StockEntry {
  id: number;
  itemId: number; // Link to Item Master
  itemName: string;
  itemSku?: string; // Item SKU
  batchNumber: string; // Batch Number (For traceability)
  quantityAvailable: number; // Current stock
  location: string; // Location/Department (Pharmacy/Ward)
  expiryDate: string; // Expiry Date & Batch Number (For traceability)
  manufactureDate?: string;
  supplierId?: number;
  supplierName?: string;
  warehouseId?: number;
  warehouseName?: string;
  purchasePrice: string;
  receivedDate: string;
  isExpired: boolean;
}

interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

// 3. Purchase Orders (POs) Interface
interface PurchaseOrder {
  id: number;
  poNumber: string; // PO Number
  supplierId: number; // Supplier ID
  supplierName: string;
  supplierEmail?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string; // Status (Ordered/Received)
  totalAmount: string;
  taxAmount?: string; // Tax Amount
  notes?: string; // Notes
  itemsOrdered: PurchaseOrderItem[]; // Items Ordered (List with quantities)
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
}

interface PurchaseOrderItem {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  receivedQuantity: number;
}

// 4. Goods Receipt Interface
interface GoodsReceipt {
  id: number;
  receiptNumber: string; // Receipt Number
  purchaseOrderId: number;
  poNumber: string;
  supplierName: string; // Supplier Name
  receivedDate: string;
  itemsReceived: GoodsReceiptItem[]; // Items Received (With batch/expiry)
  totalAmount: string;
  receivedBy: number;
  notes?: string;
}

interface GoodsReceiptItem {
  id: number;
  itemId: number;
  itemName: string;
  quantityReceived: number;
  batchNumber: string; // Batch Number
  expiryDate: string; // Expiry Date
  manufactureDate?: string;
  unitPrice: string;
  totalPrice: string;
}

interface GoodsReceiptDetail {
  id: number;
  receiptNumber: string;
  purchaseOrderId?: number;
  poNumber?: string | null;
  supplierName?: string | null;
  receivedDate: string;
  totalAmount: number;
  notes?: string | null;
  items: Array<{
    itemId: number;
    itemName: string;
    quantity: number;
    unitPrice: string;
  }>;
  purchaseOrder?: {
    id: number;
    poNumber: string;
    orderDate: string;
    expectedDeliveryDate?: string | null;
    status: string;
    totalAmount: number;
    taxAmount: number;
    discountAmount: number;
    notes?: string | null;
    supplierId: number;
    supplierName?: string | null;
    supplierEmail?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  purchaseOrderItems?: Array<{
    id: number;
    itemId: number;
    itemName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity: number;
  }>;
}

// 5. Alerts Interface
interface StockAlert {
  id: number;
  alertType: string; // Low Stock / Expiry Alerts
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  itemId: number;
  itemName: string;
  itemSku: string;
  currentStock?: number;
  minimumStock?: number;
  expiryDate?: string; // For expiry alerts
  batchNumber?: string; // For batch-specific alerts
}

interface InventoryValue {
  totalValue: string;
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
  expiringItems: number;
  expiredItems: number;
}

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  categoryName?: string;
}

interface InventoryItemName {
  id: number;
  name: string;
  description?: string;
  brandName?: string;
  manufacturer?: string;
  unitOfMeasurement?: string;
  isActive: boolean;
}

export default function Inventory() {
  const { currencySymbol, currencyCode } = useCurrency();
  const { canCreate, canEdit, canDelete, getUserRole, isAdmin, isDoctor, isNurse } = useRolePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    number | undefined
  >();
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showExistingItemsDialog, setShowExistingItemsDialog] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemNameToEdit, setItemNameToEdit] = useState<InventoryItemName | null>(null);
  const [showAddItemNameDialog, setShowAddItemNameDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedPurchaseOrderIdForReceipt, setSelectedPurchaseOrderIdForReceipt] = useState<number | undefined>(undefined);
  const [showGoodsReceiptDetails, setShowGoodsReceiptDetails] = useState(false);
  const [selectedGoodsReceiptId, setSelectedGoodsReceiptId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showPODetailsDialog, setShowPODetailsDialog] = useState(false);
  const [showItemDetailsDialog, setShowItemDetailsDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedPOForEmail, setSelectedPOForEmail] =
    useState<PurchaseOrder | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [activeTab, setActiveTab] = useState("item-master");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [showDeleteGoodsReceiptModal, setShowDeleteGoodsReceiptModal] = useState(false);
  const [goodsReceiptToDelete, setGoodsReceiptToDelete] = useState<number | null>(null);
  const [showDeleteGoodsReceiptSuccess, setShowDeleteGoodsReceiptSuccess] = useState(false);
  const [showAlertsSection, setShowAlertsSection] = useState(false);
  const [itemMasterFilters, setItemMasterFilters] = useState({
    itemId: FILTER_ALL,
    itemDatetime: FILTER_ALL,
    skuBarcode: FILTER_ALL,
    itemName: FILTER_ALL,
    status: FILTER_ALL,
  });
  const [stockFilters, setStockFilters] = useState({
    itemId: FILTER_ALL,
    itemName: FILTER_ALL,
    batchNumber: FILTER_ALL,
    location: FILTER_ALL,
    expiryDate: FILTER_ALL,
    supplier: FILTER_ALL,
    status: FILTER_ALL,
  });
  const [poFilters, setPoFilters] = useState({
    poNumber: FILTER_ALL,
    supplierId: FILTER_ALL,
    supplierName: FILTER_ALL,
    orderDate: "",
    status: FILTER_ALL,
  });
  const [goodsReceiptFilters, setGoodsReceiptFilters] = useState({
    receiptNumber: FILTER_ALL,
    poNumber: FILTER_ALL,
    supplierName: FILTER_ALL,
    receivedDate: "",
  });
  const [alertFilters, setAlertFilters] = useState({
    alertType: FILTER_ALL,
    itemName: FILTER_ALL,
    batchNumber: FILTER_ALL,
    alertDate: FILTER_ALL,
    expiryDate: FILTER_ALL,
  });
  const [historyFilters, setHistoryFilters] = useState({
    movementDate: FILTER_ALL,
    itemName: FILTER_ALL,
    movementType: FILTER_ALL,
    direction: FILTER_ALL,
    reason: FILTER_ALL,
  });
  
  // Batch edit/delete/create state
  const [showCreateBatchDialog, setShowCreateBatchDialog] = useState(false);
  const [showEditBatchDialog, setShowEditBatchDialog] = useState(false);
  const [showCreateWarehouseDialog, setShowCreateWarehouseDialog] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    warehouseName: "",
    location: "",
    status: "active" as "active" | "inactive",
  });
  const [showEditPOStatusDialog, setShowEditPOStatusDialog] = useState(false);
  const [selectedPOForStatusEdit, setSelectedPOForStatusEdit] = useState<PurchaseOrder | null>(null);
  const [poStatusForm, setPOStatusForm] = useState({ status: "pending" });
  const [selectedBatch, setSelectedBatch] = useState<StockEntry | null>(null);
  const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<StockEntry | null>(null);
  const [createBatchForm, setCreateBatchForm] = useState({
    itemId: "",
    batchNumber: "",
    quantity: "",
    expiryDate: "",
    manufactureDate: "",
    purchasePrice: "",
    receivedDate: new Date().toISOString().split('T')[0],
    supplierId: "none",
    purchaseOrderId: "none",
    warehouseId: "",
  });
  const [createBatchErrors, setCreateBatchErrors] = useState<{
    itemId?: string;
    quantity?: string;
    purchasePrice?: string;
    receivedDate?: string;
    warehouseId?: string;
  }>({});
  const [editBatchForm, setEditBatchForm] = useState({
    batchNumber: "",
    remainingQuantity: "",
    expiryDate: "",
    manufactureDate: "",
    purchasePrice: "",
    receivedDate: "",
    supplierId: "",
    warehouseId: "",
  });

  // Populate edit form when batch is selected
  useEffect(() => {
    if (selectedBatch) {
      setEditBatchForm({
        batchNumber: selectedBatch.batchNumber || "",
        remainingQuantity: String(selectedBatch.quantityAvailable || 0),
        expiryDate: selectedBatch.expiryDate ? new Date(selectedBatch.expiryDate).toISOString().split('T')[0] : "",
        manufactureDate: selectedBatch.manufactureDate ? new Date(selectedBatch.manufactureDate).toISOString().split('T')[0] : "",
        purchasePrice: selectedBatch.purchasePrice || "",
        receivedDate: selectedBatch.receivedDate ? new Date(selectedBatch.receivedDate).toISOString().split('T')[0] : "",
        supplierId: selectedBatch.supplierId ? String(selectedBatch.supplierId) : "none",
        warehouseId: selectedBatch.warehouseId ? String(selectedBatch.warehouseId) : "none",
      });
    }
  }, [selectedBatch]);
  
  // PDF Viewer state
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedReceiptForPdf, setSelectedReceiptForPdf] = useState<GoodsReceipt | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Item Master Data
  const {
    data: items = [],
    isLoading: itemsLoading,
    error: itemsError,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/items");
      return response.json();
    },
    retry: 3,
  });

  // Item Names Data (for Existing Items dialog)
  const {
    data: itemNames = [],
    isLoading: itemNamesLoading,
  } = useQuery<InventoryItemName[]>({
    queryKey: ["/api/inventory/item-names"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/item-names");
      return response.json();
    },
    enabled: showExistingItemsDialog, // Only fetch when dialog is open
    retry: 3,
  });

  // 2. Stock/Inventory Data
  const { data: stockEntries = [], isLoading: stockLoading } = useQuery<
    StockEntry[]
  >({
    queryKey: ["/api/inventory/batches"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/batches");
      return response.json();
    },
    retry: 3,
  });

  // Generate unique batch number
  const generateUniqueBatchNumber = useCallback(() => {
    const existingBatchNumbers = new Set(stockEntries.map((entry: StockEntry) => entry.batchNumber));
    let batchNumber = `BATCH-${Date.now()}`;
    let counter = 1;
    
    // Ensure uniqueness by adding a counter if needed
    while (existingBatchNumbers.has(batchNumber)) {
      batchNumber = `BATCH-${Date.now()}-${counter}`;
      counter++;
    }
    
    return batchNumber;
  }, [stockEntries]);

  // Auto-generate batch number when create dialog opens
  useEffect(() => {
    if (showCreateBatchDialog) {
      const uniqueBatchNumber = generateUniqueBatchNumber();
      setCreateBatchForm(prev => ({
        ...prev,
        batchNumber: uniqueBatchNumber,
      }));
    }
  }, [showCreateBatchDialog, generateUniqueBatchNumber]);

  // Suppliers Data (for batch edit)
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/suppliers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/suppliers");
      return response.json();
    },
    enabled: showEditBatchDialog, // Only fetch when edit dialog is open
  });

  // Stock Movements History Data
  const { data: stockMovements = [], isLoading: movementsLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory/reports/stock-movements"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/reports/stock-movements?limit=200");
      return response.json();
    },
    enabled: activeTab === "history", // Only fetch when History tab is active
    retry: 3,
  });

  // 3. Purchase Orders Data
  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery<
    PurchaseOrder[]
  >({
    queryKey: ["/api/inventory/purchase-orders"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/inventory/purchase-orders",
      );
      return response.json();
    },
    retry: 3,
  });

  // Warehouses Data
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory/warehouses"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/warehouses");
      return response.json();
    },
    enabled: activeTab === "stock-inventory" || showCreateBatchDialog || showEditBatchDialog,
    retry: 3,
  });

  // 4. Goods Receipt Data
  const { data: goodsReceiptsRaw = [], isLoading: receiptLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/inventory/goods-receipts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/goods-receipts");
      return response.json();
    },
    retry: 3,
  });

  // Group receipts by ID and calculate totals
  const goodsReceipts = useMemo(() => {
    const grouped = new Map<number, GoodsReceipt>();
    
    goodsReceiptsRaw.forEach((item: any) => {
      const receiptId = item.id;
      if (!grouped.has(receiptId)) {
        grouped.set(receiptId, {
          id: receiptId,
          receiptNumber: item.receiptNumber,
          purchaseOrderId: item.purchaseOrderId,
          poNumber: item.poNumber,
          supplierName: item.supplierName,
          receivedDate: item.receivedDate,
          itemsReceived: [],
          totalAmount: "0",
          receivedBy: item.receivedBy,
          notes: item.notes,
        });
      }
      
      const receipt = grouped.get(receiptId)!;
      if (item.itemId && item.itemName) {
        receipt.itemsReceived.push({
          itemId: item.itemId,
          itemName: item.itemName,
          quantityReceived: item.quantityReceived || 0,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
        });
      }
      
      // Store purchase order total amount if available (use first item's poTotalAmount)
      if (item.poTotalAmount != null && receipt.totalAmount === "0") {
        const poTotal = typeof item.poTotalAmount === 'number' ? item.poTotalAmount : parseFloat(String(item.poTotalAmount || "0"));
        if (!isNaN(poTotal) && poTotal > 0) {
          receipt.totalAmount = poTotal.toFixed(2);
        }
      }
      
      // Calculate total amount - use unitCost if totalAmount is NaN or invalid
      // Only calculate if we don't have a PO total amount
      if (receipt.totalAmount === "0" || parseFloat(receipt.totalAmount) === 0) {
        let itemTotal = 0;
        // Handle totalAmount as number or string
        if (item.totalAmount != null && item.totalAmount !== undefined) {
          const parsedTotal = typeof item.totalAmount === 'number' ? item.totalAmount : parseFloat(String(item.totalAmount));
          if (!isNaN(parsedTotal) && parsedTotal > 0) {
            itemTotal = parsedTotal;
          }
        }
        // Fallback: calculate from unitCost * quantity if totalAmount is 0 or invalid
        if (itemTotal === 0 && item.unitCost != null && item.quantityReceived) {
          const unitCost = typeof item.unitCost === 'number' ? item.unitCost : parseFloat(String(item.unitCost || "0"));
          const quantity = typeof item.quantityReceived === 'number' ? item.quantityReceived : parseFloat(String(item.quantityReceived || "0"));
          if (!isNaN(unitCost) && !isNaN(quantity) && unitCost > 0 && quantity > 0) {
            itemTotal = unitCost * quantity;
          }
        }
        const currentTotal = parseFloat(receipt.totalAmount || "0");
        receipt.totalAmount = (currentTotal + itemTotal).toFixed(2);
      }
    });
    
    return Array.from(grouped.values());
  }, [goodsReceiptsRaw]);

  const {
    data: selectedGoodsReceiptDetails,
    isFetching: goodsReceiptDetailsLoading,
    error: goodsReceiptDetailsError,
  } = useQuery<GoodsReceiptDetail | null>({
    queryKey: ["/api/inventory/goods-receipts", selectedGoodsReceiptId],
    enabled: Boolean(selectedGoodsReceiptId) && showGoodsReceiptDetails,
    queryFn: async ({ queryKey }) => {
      try {
        const [, receiptId] = queryKey;
        if (!receiptId) {
          throw new Error("Receipt ID is required");
        }
        const response = await apiRequest(
          "GET",
          `/api/inventory/goods-receipts/${receiptId}`,
        );
        if (!response.ok) {
          let errorMessage = `Failed to fetch goods receipt: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, use default message
          }
          throw new Error(errorMessage);
        }
        const data = await response.json();
        
        // Transform the data to match the expected interface
        const transformedData: GoodsReceiptDetail = {
          id: data.id,
          receiptNumber: data.receiptNumber || `GR-${data.id}`,
          purchaseOrderId: data.purchaseOrderId || undefined,
          poNumber: data.poNumber || null,
          supplierName: data.supplierName || null,
          receivedDate: data.receivedDate || data.createdAt || new Date().toISOString(),
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount || '0'),
          notes: data.notes || null,
          items: Array.isArray(data.items) ? data.items.map((item: any) => ({
            itemId: item.itemId,
            itemName: item.itemName || 'Unknown Item',
            quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity || '0'),
            unitPrice: typeof item.unitPrice === 'string' ? item.unitPrice : String(item.unitPrice || '0'),
          })) : [],
          purchaseOrder: data.purchaseOrder || null,
          purchaseOrderItems: Array.isArray(data.purchaseOrderItems) ? data.purchaseOrderItems.map((item: any) => ({
            id: item.id || 0,
            itemId: item.itemId || 0,
            itemName: item.itemName || null,
            quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity || '0'),
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice || '0'),
            totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : parseFloat(item.totalPrice || '0'),
            receivedQuantity: typeof item.receivedQuantity === 'number' ? item.receivedQuantity : parseFloat(item.receivedQuantity || '0'),
          })) : [],
        };
        
        return transformedData;
      } catch (error) {
        console.error("Error fetching goods receipt details:", error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // 5. Alerts Data (Low Stock & Expiry)
  const { data: alerts = [] } = useQuery<StockAlert[]>({
    queryKey: ["/api/inventory/alerts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/alerts");
      return response.json();
    },
    retry: 3,
  });

  // View Purchase Order function
  const viewPurchaseOrder = (po: PurchaseOrder) => {
    console.log("Viewing purchase order:", po);
    setSelectedPO(po);
    setShowPODetailsDialog(true);
  };

  const openGoodsReceiptDetails = (receiptId: number) => {
    setSelectedGoodsReceiptId(receiptId);
    setShowGoodsReceiptDetails(true);
  };

  const closeGoodsReceiptDetails = () => {
    setShowGoodsReceiptDetails(false);
    setSelectedGoodsReceiptId(null);
  };

  // Delete goods receipt mutation
  const deleteGoodsReceiptMutation = useMutation({
    mutationFn: async (receiptId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/inventory/goods-receipts/${receiptId}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete goods receipt" }));
        throw new Error(errorData.error || "Failed to delete goods receipt");
      }
      return response.json();
    },
    onSuccess: () => {
      setShowDeleteGoodsReceiptSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/goods-receipts"] });
    },
    onError: (error: any) => {
      console.error("Error deleting goods receipt:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete goods receipt",
        variant: "destructive",
      });
    },
  });

  const handleDeleteGoodsReceipt = (receiptId: number) => {
    setGoodsReceiptToDelete(receiptId);
    setShowDeleteGoodsReceiptModal(true);
  };

  const handleViewGoodsReceiptPdfById = async (receiptId: number) => {
    try {
      setPdfLoading(true);
      setShowPdfViewer(true);
      
      // First, check if PDF exists
      const checkResponse = await apiRequest('GET', `/api/inventory/goods-receipts/${receiptId}/pdf/check`);
      if (!checkResponse.ok) {
        throw new Error(`Failed to check PDF: ${checkResponse.status}`);
      }
      
      const checkData = await checkResponse.json();
      
      // If PDF doesn't exist, generate it
      if (!checkData.exists) {
        toast({
          title: "Generating PDF",
          description: "PDF not found. Generating now...",
        });
        
        const generateResponse = await apiRequest('POST', `/api/inventory/goods-receipts/${receiptId}/pdf/generate`);
        if (!generateResponse.ok) {
          throw new Error(`Failed to generate PDF: ${generateResponse.status}`);
        }
      }
      
      // Fetch PDF with authentication
      const response = await apiRequest('GET', `/api/inventory/goods-receipts/${receiptId}/pdf`);
      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.status}`);
      }
      
      // Create blob URL from response
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setPdfLoading(false);
    } catch (error: any) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load PDF",
        variant: "destructive",
      });
      setPdfLoading(false);
      setShowPdfViewer(false);
    }
  };

  const handleViewGoodsReceiptPdf = async (receipt: GoodsReceipt) => {
    setSelectedReceiptForPdf(receipt);
    await handleViewGoodsReceiptPdfById(receipt.id);
  };

  const confirmDeleteGoodsReceipt = () => {
    if (goodsReceiptToDelete !== null) {
      deleteGoodsReceiptMutation.mutate(goodsReceiptToDelete);
      setShowDeleteGoodsReceiptModal(false);
      setGoodsReceiptToDelete(null);
    }
  };

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      console.log("Starting deletion API call for ID:", itemId);
      const response = await apiRequest(
        "DELETE",
        `/api/inventory/items/${itemId}`,
      );
      console.log("Delete API response:", response);
      return response;
    },
    onSuccess: (data, variables) => {
      console.log("Delete mutation onSuccess called for ID:", variables);
      setSuccessMessage("Inventory item has been deleted successfully.");
      setShowSuccessModal(true);
      // Force cache invalidation with refetch
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.refetchQueries({ queryKey: ["/api/inventory/items"] });
      console.log("Cache invalidated and refetch triggered");
    },
    onError: (error: any) => {
      console.log("Delete mutation onError called:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item",
        variant: "destructive",
      });
    },
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (warehouseData: { warehouseName: string; location?: string; status: string }) => {
      const response = await apiRequest("POST", "/api/inventory/warehouses", warehouseData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create warehouse" }));
        throw new Error(errorData.error || errorData.message || "Failed to create warehouse");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      setShowCreateWarehouseDialog(false);
      setWarehouseForm({ warehouseName: "", location: "", status: "active" });
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create warehouse",
        variant: "destructive",
      });
    },
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (batchData: any) => {
      console.log("[createBatchMutation] Sending batch data:", batchData);
      const response = await apiRequest(
        "POST",
        "/api/inventory/batches",
        batchData
      );
      console.log("[createBatchMutation] Response status:", response.status, response.statusText);
      console.log("[createBatchMutation] Response ok:", response.ok);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Failed to create batch";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            // If it's HTML, it's likely a 404 or server error page
            const text = await response.text();
            console.error("[createBatchMutation] Non-JSON error response:", text.substring(0, 200));
            if (response.status === 404) {
              errorMessage = "Endpoint not found. Please check if the server route is registered.";
            } else {
              errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
          }
        } catch (parseError) {
          console.error("[createBatchMutation] Error parsing error response:", parseError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log("[createBatchMutation] Batch created successfully:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      toast({
        title: "Success",
        description: "Batch created successfully",
      });
      setShowCreateBatchDialog(false);
      setCreateBatchForm({
        itemId: "",
        batchNumber: "",
        quantity: "",
        expiryDate: "",
        manufactureDate: "",
        purchasePrice: "",
        receivedDate: new Date().toISOString().split('T')[0],
        supplierId: "none",
      });
    },
    onError: (error: any) => {
      console.error("Error creating batch:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create batch",
        variant: "destructive",
      });
    },
  });

  // Update batch mutation
  const updateBatchMutation = useMutation({
    mutationFn: async ({ batchId, updates }: { batchId: number; updates: any }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/inventory/batches/${batchId}`,
        updates
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      toast({
        title: "Success",
        description: "Batch updated successfully",
      });
      setShowEditBatchDialog(false);
      setSelectedBatch(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update batch",
        variant: "destructive",
      });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/inventory/batches/${batchId}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
      setShowDeleteBatchModal(false);
      setBatchToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete batch",
        variant: "destructive",
      });
    },
  });

  // Delete item function with confirmation modal
  const deleteItem = (item: InventoryItem) => {
    console.log("Delete item clicked for:", item.name, "ID:", item.id);
    // Add a small delay to ensure the dropdown closes properly
    setTimeout(() => {
      setItemToDelete(item);
      setShowDeleteConfirmModal(true);
    }, 100);
  };

  // Confirm delete action
  const confirmDeleteItem = () => {
    if (itemToDelete) {
      console.log("Calling deleteItemMutation.mutate with ID:", itemToDelete.id);
      deleteItemMutation.mutate(itemToDelete.id);
      setShowDeleteConfirmModal(false);
      setItemToDelete(null);
    }
  };

  // Generate Item Report function
  const generateItemReport = (item: InventoryItem) => {
    const reportData = {
      reportDate: new Date().toLocaleDateString(),
      reportTime: new Date().toLocaleTimeString(),
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.categoryName || "Uncategorized",
        description: item.description || "No description available",
        barcode: item.barcode || "N/A",
        unitOfMeasurement: item.unitOfMeasurement,
        brandName: item.brandName || "N/A",
        manufacturer: item.manufacturer || "N/A",
        prescriptionRequired: item.prescriptionRequired ? "Yes" : "No",
        isActive: item.isActive ? "Active" : "Inactive",
      },
      pricing: {
        purchasePrice: parseFloat(item.purchasePrice).toFixed(2),
        salePrice: parseFloat(item.salePrice).toFixed(2),
        mrp: item.mrp ? parseFloat(item.mrp).toFixed(2) : "N/A",
        stockValue: parseFloat(item.stockValue.toString()).toFixed(2),
      },
      inventory: {
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        reorderPoint: item.reorderPoint,
        stockStatus: item.isLowStock ? "Low Stock" : "In Stock",
        expiryDate: item.expiryDate
          ? format(new Date(item.expiryDate), "MMM dd, yyyy")
          : "No expiry date",
        isExpired: item.expiryDate
          ? new Date(item.expiryDate) < new Date()
          : false,
      },
      timestamps: {
        created: format(new Date(item.createdAt), "MMM dd, yyyy HH:mm"),
        lastUpdated: format(new Date(item.updatedAt), "MMM dd, yyyy HH:mm"),
      },
    };

    // Generate CSV content
    const csvContent = [
      "CURA EMR - INVENTORY ITEM REPORT",
      `Generated: ${reportData.reportDate} at ${reportData.reportTime}`,
      "",
      "BASIC INFORMATION",
      `Item ID,${reportData.item.id}`,
      `SKU,${reportData.item.sku}`,
      `Name,${reportData.item.name}`,
      `Category,${reportData.item.category}`,
      `Description,${reportData.item.description}`,
      `Barcode,${reportData.item.barcode}`,
      `Unit of Measurement,${reportData.item.unitOfMeasurement}`,
      `Brand,${reportData.item.brandName}`,
      `Manufacturer,${reportData.item.manufacturer}`,
      `Prescription Required,${reportData.item.prescriptionRequired}`,
      `Status,${reportData.item.isActive}`,
      "",
      "PRICING INFORMATION",
      `Purchase Price (${currencyCode || "GBP"}),${reportData.pricing.purchasePrice}`,
      `Sale Price (${currencyCode || "GBP"}),${reportData.pricing.salePrice}`,
      `MRP (${currencyCode || "GBP"}),${reportData.pricing.mrp}`,
      `Total Stock Value (${currencyCode || "GBP"}),${reportData.pricing.stockValue}`,
      "",
      "INVENTORY MANAGEMENT",
      `Current Stock,${reportData.inventory.currentStock}`,
      `Minimum Stock Level,${reportData.inventory.minimumStock}`,
      `Reorder Point,${reportData.inventory.reorderPoint}`,
      `Stock Status,${reportData.inventory.stockStatus}`,
      `Expiry Date,${reportData.inventory.expiryDate}`,
      `Expired Status,${reportData.inventory.isExpired ? "EXPIRED" : "Valid"}`,
      "",
      "RECORD INFORMATION",
      `Created,${reportData.timestamps.created}`,
      `Last Updated,${reportData.timestamps.lastUpdated}`,
      "",
      "Report generated by Cura EMR System",
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inventory-report-${item.sku}-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMessage(`Inventory report for ${item.name} has been downloaded as CSV file.`);
    setShowSuccessModal(true);
  };

  const { data: categories = [], error: categoriesError } = useQuery<
    InventoryCategory[]
  >({
    queryKey: ["/api/inventory/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/categories");
      return response.json();
    },
    retry: 3,
  });

  const { data: inventoryValue } = useQuery<InventoryValue>({
    queryKey: ["/api/inventory/reports/value"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/reports/value");
      return response.json();
    },
    retry: 3,
  });

  const { data: lowStockItems = [] } = useQuery<LowStockItem[]>({
    queryKey: ["/api/inventory/reports/low-stock"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/reports/low-stock");
      return response.json();
    },
    retry: 3,
  });

  // Send purchase order email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({
      purchaseOrderId,
      email,
    }: {
      purchaseOrderId: number;
      email: string;
    }) => {
      await apiRequest(
        "POST",
        `/api/inventory/purchase-orders/${purchaseOrderId}/send-email`,
        { email },
      );
    },
    onSuccess: () => {
      setSuccessMessage("Purchase order has been sent successfully.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({
        queryKey: ["/api/inventory/purchase-orders"],
      });
      setShowEmailDialog(false);
      setEmailAddress("");
      setSelectedPOForEmail(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send purchase order email",
        variant: "destructive",
      });
    },
  });

  // Handle send email button click
  const handleSendEmail = (po: PurchaseOrder) => {
    setSelectedPOForEmail(po);
    setEmailAddress(po.supplierEmail || "");
    setShowEmailDialog(true);
  };

  // Confirm and send email
  const confirmSendEmail = () => {
    if (!selectedPOForEmail || !emailAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate({
      purchaseOrderId: selectedPOForEmail.id,
      email: emailAddress.trim(),
    });
  };

  // Update purchase order status mutation
  const updatePOStatusMutation = useMutation({
    mutationFn: async ({ purchaseOrderId, status }: { purchaseOrderId: number; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/inventory/purchase-orders/${purchaseOrderId}`,
        { status }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update purchase order status" }));
        throw new Error(errorData.error || errorData.message || "Failed to update purchase order status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
      setShowEditPOStatusDialog(false);
      setSelectedPOForStatusEdit(null);
      toast({
        title: "Success",
        description: "Purchase order status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order status",
        variant: "destructive",
      });
    },
  });

  // Delete purchase order mutation
  const deletePurchaseOrderMutation = useMutation({
    mutationFn: async (purchaseOrderId: number) => {
      await apiRequest(
        "DELETE",
        `/api/inventory/purchase-orders/${purchaseOrderId}`,
      );
    },
    onSuccess: () => {
      setSuccessMessage("Purchase order has been deleted successfully.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({
        queryKey: ["/api/inventory/purchase-orders"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      pending: { variant: "outline", className: "bg-gray-50 text-gray-700 border-gray-200" },
      sent: { variant: "secondary", className: "bg-blue-100 text-blue-700 border-blue-200" },
      received: { variant: "default", className: "bg-blue-500 text-white border-blue-600" },
      completed: { variant: "default", className: "bg-blue-500 text-white border-blue-600" },
      cancelled: { variant: "destructive", className: "bg-red-100 text-red-700 border-red-200" },
      ordered: { variant: "secondary", className: "bg-blue-100 text-blue-700 border-blue-200" },
      delivered: { variant: "default", className: "bg-blue-500 text-white border-blue-600" },
      active: { variant: "default", className: "bg-blue-500 text-white border-blue-600" },
      inactive: { variant: "outline", className: "bg-gray-50 text-gray-700 border-gray-200" },
      "low_stock": { variant: "destructive", className: "bg-orange-100 text-orange-700 border-orange-200" },
      "in_stock": { variant: "default", className: "bg-blue-500 text-white border-blue-600" },
      "out_of_stock": { variant: "destructive", className: "bg-red-100 text-red-700 border-red-200" },
    };
    
    const config = statusConfig[status.toLowerCase()] || { variant: "outline" as const, className: "bg-gray-50 text-gray-700 border-gray-200" };
    
    return (
      <Badge 
        variant={config.variant} 
        className={`${config.className || ""} font-medium px-2.5 py-0.5 rounded-full border`}
      >
        {status.replace("_", " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
      </Badge>
    );
  };

  const getAlertTypeLabel = (alertType: string) =>
    alertType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const getAlertTypeBadge = (alertType: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      low_stock: "destructive",
      expired: "destructive",
      expiring_soon: "outline",
    };
    return (
      <Badge variant={variants[alertType] || "outline"}>
        {getAlertTypeLabel(alertType).toUpperCase()}
      </Badge>
    );
  };

  const MOVEMENT_TYPE_LABELS: Record<string, string> = {
    purchase: "Purchase",
    sale: "Sale",
    return: "Return",
    expired: "Waste/Expired",
    damaged: "Damaged",
    adjustment: "Manual Adjustment",
    transfer: "Transfer",
  };

  const getMovementTypeLabel = (movementType: string) =>
    MOVEMENT_TYPE_LABELS[movementType] || movementType;

  const extractMovementReason = (notes?: string | null) => {
    if (!notes) return "-";
    const reasonMatch = notes.match(/Reason:\s*([^.]+)/);
    return reasonMatch ? reasonMatch[1].trim() : "-";
  };

  const getMovementDirection = (quantity: number) => (quantity > 0 ? "IN" : "OUT");

  // Helper function to format date (display time as stored, without timezone conversion)
  const formatUTC = (dateInput: string | Date, formatStr: string) => {
    if (!dateInput) return "";
    
    try {
      // Convert to string if it's a Date object
      let dateString: string;
      if (dateInput instanceof Date) {
        // If it's already a Date object, convert to ISO string
        dateString = dateInput.toISOString();
      } else {
        dateString = String(dateInput).trim();
      }
      
      if (!dateString) return "";
      
      // Check if the date string has explicit timezone info
      const hasTimezone = dateString.includes('Z') || dateString.match(/[+-]\d{2}:?\d{2}$/);
      
      let date: Date;
      
      if (hasTimezone) {
        // Has timezone info (e.g., "2026-03-14T10:41:34Z") - parse as UTC
        date = new Date(dateString);
      } else {
        // No timezone info - treat as UTC
        // PostgreSQL returns timestamps without timezone, which should be treated as UTC
        // Normalize the string format: convert space to 'T' and add 'Z'
        let utcString = dateString;
        
        // Handle different formats:
        // "2026-03-14 10:41:34" -> "2026-03-14T10:41:34Z"
        // "2026-03-14 10:41:34.123" -> "2026-03-14T10:41:34.123Z"
        // "2026-03-14T10:41:34" -> "2026-03-14T10:41:34Z"
        if (utcString.includes(' ')) {
          // Replace first space with 'T', keep the rest (including milliseconds if present)
          utcString = utcString.replace(' ', 'T');
        }
        
        // Add 'Z' if not already present and no timezone offset
        if (!utcString.endsWith('Z') && !utcString.match(/[+-]\d{2}:?\d{2}$/)) {
          utcString = utcString + 'Z';
        }
        
        date = new Date(utcString);
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date input:', dateInput);
        return "";
      }
      
      // Always use UTC components since we've normalized to UTC
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      
      // Format manually
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[month];
      const dayStr = day.toString().padStart(2, "0");
      const hoursStr = hours.toString().padStart(2, "0");
      const minutesStr = minutes.toString().padStart(2, "0");
      const secondsStr = seconds.toString().padStart(2, "0");
      
      // Handle different format strings
      if (formatStr === "MMM dd, yyyy") {
        return `${monthName} ${dayStr}, ${year}`;
      } else if (formatStr === "HH:mm:ss") {
        return `${hoursStr}:${minutesStr}:${secondsStr}`;
      } else if (formatStr === "MMM dd, HH:mm") {
        return `${monthName} ${dayStr}, ${hoursStr}:${minutesStr}`;
      }
      
      // Fallback to date-fns format
      return format(date, formatStr);
    } catch (error) {
      console.warn('Error formatting date:', dateInput, error);
      return "";
    }
  };

  const getItemStatusLabel = (item: InventoryItem) => {
    if (item.currentStock === 0) return "Out of Stock";
    if (item.isLowStock) return "Low Stock";
    return "In Stock";
  };

  const getStockEntryStatusLabel = (entry: StockEntry) => {
    if (entry.isExpired) return "Expired";
    if (new Date(entry.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return "Expiring Soon";
    }
    return "Valid";
  };

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await apiRequest("DELETE", `/api/inventory/alerts/${alertId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete alert" }));
        throw new Error(errorData.error || "Failed to delete alert");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      toast({ title: "Alert deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId: number) => {
      const response = await apiRequest("POST", `/api/inventory/stock-movements/${movementId}/delete`);
      if (!response.ok) {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Failed to delete movement");
        } catch {
          throw new Error(
            text.includes("Cannot POST")
              ? "Delete history API is unavailable. Please restart the server and try again."
              : text.slice(0, 200) || "Failed to delete movement",
          );
        }
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/stock-movements"] });
      toast({ title: "History entry deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const itemMasterFilterOptions = useMemo(() => ({
    itemId: buildFilterOptions(
      items.map((_, index) => `#${index + 1}`),
      "All Item IDs",
    ),
    itemDatetime: buildFilterOptions(
      items.map((item) => (item.createdAt ? formatUTC(item.createdAt, "MMM dd, yyyy HH:mm") : "")),
      "All Item Datetimes",
    ),
    skuBarcode: buildFilterOptions(
      items.flatMap((item) => [item.sku, item.barcode].filter(Boolean)),
      "All SKU / Barcode",
    ),
    itemName: buildFilterOptions(items.map((item) => item.name), "All Item Names"),
    status: buildFilterOptions(items.map((item) => getItemStatusLabel(item)), "All Statuses"),
  }), [items]);

  const categoryFilterOptions = useMemo(
    () => [
      { value: "all", label: "All Categories" },
      ...categories.map((category) => ({
        value: category.id.toString(),
        label: category.name,
      })),
    ],
    [categories],
  );

  const itemMasterFilterDefaults = {
    itemId: FILTER_ALL,
    itemDatetime: FILTER_ALL,
    skuBarcode: FILTER_ALL,
    itemName: FILTER_ALL,
    status: FILTER_ALL,
  };

  const applyItemMasterFilter = (
    key: keyof typeof itemMasterFilterDefaults,
    value: string,
  ) => {
    applyExclusiveFilter(itemMasterFilterDefaults, setItemMasterFilters, key, value);
    if (value !== FILTER_ALL) {
      setSelectedCategory(undefined);
    }
  };

  const applyItemMasterCategoryFilter = (value: string) => {
    if (value === "all") {
      setSelectedCategory(undefined);
      return;
    }

    const categoryId = parseInt(value, 10);
    if (!isNaN(categoryId)) {
      setItemMasterFilters({ ...itemMasterFilterDefaults });
      setSelectedCategory(categoryId);
    }
  };

  const stockFilterOptions = useMemo(() => ({
    itemId: buildFilterOptions(stockEntries.map((entry, index) => `#${index + 1}`), "All Item IDs"),
    itemName: buildFilterOptions(stockEntries.map((entry) => entry.itemName), "All Item Names"),
    batchNumber: buildFilterOptions(stockEntries.map((entry) => entry.batchNumber), "All Batch Numbers"),
    location: buildFilterOptions(stockEntries.map((entry) => entry.location), "All Locations"),
    expiryDate: buildFilterOptions(
      stockEntries.map((entry) => format(new Date(entry.expiryDate), "MMM dd, yyyy")),
      "All Expiry Dates",
    ),
    supplier: buildFilterOptions(stockEntries.map((entry) => entry.supplierName || "Unknown"), "All Suppliers"),
    status: buildFilterOptions(stockEntries.map((entry) => getStockEntryStatusLabel(entry)), "All Statuses"),
  }), [stockEntries]);

  const stockFilterDefaults = {
    itemId: FILTER_ALL,
    itemName: FILTER_ALL,
    batchNumber: FILTER_ALL,
    location: FILTER_ALL,
    expiryDate: FILTER_ALL,
    supplier: FILTER_ALL,
    status: FILTER_ALL,
  };

  const applyStockFilter = (
    key: keyof typeof stockFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(stockFilterDefaults, setStockFilters, key, value);

  const poFilterDefaults = {
    poNumber: FILTER_ALL,
    supplierId: FILTER_ALL,
    supplierName: FILTER_ALL,
    orderDate: "",
    status: FILTER_ALL,
  };

  const applyPoFilter = (
    key: keyof typeof poFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(
    poFilterDefaults,
    setPoFilters,
    key,
    value,
    (field) => (field === "orderDate" ? "" : FILTER_ALL),
  );

  const goodsReceiptFilterDefaults = {
    receiptNumber: FILTER_ALL,
    poNumber: FILTER_ALL,
    supplierName: FILTER_ALL,
    receivedDate: "",
  };

  const applyGoodsReceiptFilter = (
    key: keyof typeof goodsReceiptFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(
    goodsReceiptFilterDefaults,
    setGoodsReceiptFilters,
    key,
    value,
    (field) => (field === "receivedDate" ? "" : FILTER_ALL),
  );

  const alertFilterDefaults = {
    alertType: FILTER_ALL,
    itemName: FILTER_ALL,
    batchNumber: FILTER_ALL,
    alertDate: FILTER_ALL,
    expiryDate: FILTER_ALL,
  };

  const applyAlertFilter = (
    key: keyof typeof alertFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(alertFilterDefaults, setAlertFilters, key, value);

  const historyFilterDefaults = {
    movementDate: FILTER_ALL,
    itemName: FILTER_ALL,
    movementType: FILTER_ALL,
    direction: FILTER_ALL,
    reason: FILTER_ALL,
  };

  const applyHistoryFilter = (
    key: keyof typeof historyFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(historyFilterDefaults, setHistoryFilters, key, value);

  const poFilterOptions = useMemo(() => ({
    poNumber: buildFilterOptions(purchaseOrders.map((po) => po.poNumber), "All PO Numbers"),
    supplierId: buildFilterOptions(purchaseOrders.map((po) => String(po.supplierId)), "All Supplier IDs"),
    supplierName: buildFilterOptions(purchaseOrders.map((po) => po.supplierName), "All Supplier Names"),
    status: buildFilterOptions(purchaseOrders.map((po) => po.status), "All Statuses"),
  }), [purchaseOrders]);

  const goodsReceiptFilterOptions = useMemo(() => ({
    receiptNumber: buildFilterOptions(goodsReceipts.map((receipt) => receipt.receiptNumber), "All Receipt Numbers"),
    poNumber: buildFilterOptions(
      goodsReceipts.map((receipt) =>
        receipt.poNumber || (receipt.purchaseOrderId ? `PO-${receipt.purchaseOrderId}` : "N/A"),
      ),
      "All PO Numbers",
    ),
    supplierName: buildFilterOptions(goodsReceipts.map((receipt) => receipt.supplierName), "All Suppliers"),
  }), [goodsReceipts]);

  const alertFilterOptions = useMemo(() => ({
    alertType: buildFilterOptions(alerts.map((alert) => getAlertTypeLabel(alert.alertType)), "All Alert Types"),
    itemName: buildFilterOptions(alerts.map((alert) => alert.itemName), "All Item Names"),
    batchNumber: buildFilterOptions(alerts.map((alert) => alert.batchNumber), "All Batch Numbers"),
    alertDate: buildFilterOptions(
      alerts.map((alert) => formatUTC(alert.createdAt, "MMM dd, yyyy")),
      "All Dates",
    ),
    expiryDate: buildFilterOptions(
      alerts
        .filter((alert) => alert.expiryDate)
        .map((alert) => format(new Date(alert.expiryDate!), "MMM dd, yyyy")),
      "All Expiry Dates",
    ),
  }), [alerts]);

  const historyFilterOptions = useMemo(() => ({
    movementDate: buildFilterOptions(
      stockMovements.map((movement: { createdAt: string }) => formatUTC(movement.createdAt, "MMM dd, yyyy")),
      "All Dates",
    ),
    itemName: buildFilterOptions(
      stockMovements.map((movement: { itemName?: string }) => movement.itemName || "Unknown Item"),
      "All Item Names",
    ),
    movementType: buildFilterOptions(
      stockMovements.map((movement: { movementType: string }) => getMovementTypeLabel(movement.movementType)),
      "All Movement Types",
    ),
    direction: buildFilterOptions(
      stockMovements.map((movement: { quantity: number }) => getMovementDirection(movement.quantity)),
      "All Directions",
    ),
    reason: buildFilterOptions(
      stockMovements.map((movement: { notes?: string }) => extractMovementReason(movement.notes)),
      "All Reasons",
    ),
  }), [stockMovements]);

  // Filter items based on search and filters
  const filteredItems = items.filter((item, index) => {
    if (!matchesFilterValue(itemMasterFilters.itemId, `#${index + 1}`)) return false;

    const itemDatetime = item.createdAt ? formatUTC(item.createdAt, "MMM dd, yyyy HH:mm") : "";
    if (!matchesFilterValue(itemMasterFilters.itemDatetime, itemDatetime)) return false;

    const skuBarcodeValues = [item.sku, item.barcode].filter(Boolean).map(String);
    if (
      itemMasterFilters.skuBarcode !== FILTER_ALL &&
      !skuBarcodeValues.includes(itemMasterFilters.skuBarcode)
    ) {
      return false;
    }

    if (!matchesFilterValue(itemMasterFilters.itemName, item.name)) return false;
    if (!matchesFilterValue(itemMasterFilters.status, getItemStatusLabel(item))) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !item.name.toLowerCase().includes(searchLower) &&
        !item.sku.toLowerCase().includes(searchLower) &&
        !item.barcode?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    if (selectedCategory !== undefined && selectedCategory !== null) {
      const selectedCategoryData = categories.find((cat) => cat.id === selectedCategory);
      const selectedCategoryName = selectedCategoryData?.name;

      if (selectedCategoryName) {
        const itemCategoryName = (item.categoryName || "").toLowerCase().trim();
        const matchCategoryName = selectedCategoryName.toLowerCase().trim();

        if (itemCategoryName !== matchCategoryName) {
          return false;
        }
      } else {
        const itemCategoryId = item.categoryId !== undefined ? Number(item.categoryId) : null;
        if (itemCategoryId === null || itemCategoryId !== Number(selectedCategory)) {
          return false;
        }
      }
    }

    if (showLowStock && !item.isLowStock) {
      return false;
    }

    return true;
  })
  .sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const filteredStockEntries = stockEntries.filter((entry, index) => {
    if (!matchesFilterValue(stockFilters.itemId, `#${index + 1}`)) return false;
    if (!matchesFilterValue(stockFilters.itemName, entry.itemName)) return false;
    if (!matchesFilterValue(stockFilters.batchNumber, entry.batchNumber)) return false;
    if (!matchesFilterValue(stockFilters.location, entry.location)) return false;
    if (!matchesFilterValue(stockFilters.expiryDate, format(new Date(entry.expiryDate), "MMM dd, yyyy"))) return false;
    if (!matchesFilterValue(stockFilters.supplier, entry.supplierName || "Unknown")) return false;
    if (!matchesFilterValue(stockFilters.status, getStockEntryStatusLabel(entry))) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !entry.itemName.toLowerCase().includes(searchLower) &&
        !entry.batchNumber.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    if (!matchesFilterValue(poFilters.poNumber, po.poNumber)) return false;
    if (!matchesFilterValue(poFilters.supplierId, String(po.supplierId))) return false;
    if (!matchesFilterValue(poFilters.supplierName, po.supplierName)) return false;
    if (!matchesFilterValue(poFilters.status, po.status)) return false;
    if (poFilters.orderDate) {
      const orderDateValue = format(new Date(po.orderDate), "yyyy-MM-dd");
      if (orderDateValue !== poFilters.orderDate) return false;
    }
    return true;
  });

  const filteredGoodsReceipts = goodsReceipts.filter((receipt) => {
    if (!matchesFilterValue(goodsReceiptFilters.receiptNumber, receipt.receiptNumber)) return false;
    const poNumberLabel =
      receipt.poNumber || (receipt.purchaseOrderId ? `PO-${receipt.purchaseOrderId}` : "N/A");
    if (!matchesFilterValue(goodsReceiptFilters.poNumber, poNumberLabel)) return false;
    if (!matchesFilterValue(goodsReceiptFilters.supplierName, receipt.supplierName)) return false;
    if (goodsReceiptFilters.receivedDate) {
      const receivedDateValue = format(new Date(receipt.receivedDate), "yyyy-MM-dd");
      if (receivedDateValue !== goodsReceiptFilters.receivedDate) return false;
    }
    return true;
  });

  const filteredAlerts = alerts.filter((alert) => {
    if (!matchesFilterValue(alertFilters.alertType, getAlertTypeLabel(alert.alertType))) return false;
    if (!matchesFilterValue(alertFilters.itemName, alert.itemName)) return false;
    if (!matchesFilterValue(alertFilters.batchNumber, alert.batchNumber)) return false;
    if (!matchesFilterValue(alertFilters.alertDate, formatUTC(alert.createdAt, "MMM dd, yyyy"))) return false;
    if (alertFilters.expiryDate !== FILTER_ALL) {
      if (!alert.expiryDate) return false;
      const expiryLabel = format(new Date(alert.expiryDate), "MMM dd, yyyy");
      if (expiryLabel !== alertFilters.expiryDate) return false;
    }
    return true;
  });

  const filteredStockMovements = stockMovements.filter((movement: any) => {
    if (!matchesFilterValue(historyFilters.movementDate, formatUTC(movement.createdAt, "MMM dd, yyyy"))) return false;
    if (!matchesFilterValue(historyFilters.itemName, movement.itemName || "Unknown Item")) return false;
    if (!matchesFilterValue(historyFilters.movementType, getMovementTypeLabel(movement.movementType))) return false;
    if (!matchesFilterValue(historyFilters.direction, getMovementDirection(movement.quantity))) return false;
    if (!matchesFilterValue(historyFilters.reason, extractMovementReason(movement.notes))) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header title="Comprehensive Inventory Management" subtitle="Complete healthcare inventory system with Item Master, Stock Tracking, Purchase Orders, Goods Receipt & Alerts" />
      
      <div className="w-full px-3 sm:px-4 lg:px-5 py-4">
        <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-3 mb-4">
          {/* Alert Icon with Badge */}
          {alerts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowAlertsSection(!showAlertsSection)}
              className="relative"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts
              <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {alerts.length}
              </span>
            </Button>
          )}
          <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
              {canCreate('inventory') && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item Price
                </Button>
              )}
              {canCreate('inventory') && (
                <Button variant="outline" onClick={() => setShowPODialog(true)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  New Purchase Order
                </Button>
              )}
              {canCreate('inventory') && (
                <Button
                  variant="outline"
                  onClick={() => setShowReceiptDialog(true)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Goods Receipt
                </Button>
              )}
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {alerts.length > 0 && showAlertsSection && (
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Critical Inventory Alerts ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getAlertTypeBadge(alert.alertType)}
                        <span className="font-medium">{alert.itemName}</span>
                        <span className="text-sm text-gray-600">
                          {alert.message}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatUTC(alert.createdAt, "MMM dd, HH:mm")}
                      </span>
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <p className="text-sm text-gray-600 text-center pt-2">
                      +{alerts.length - 3} more alerts - View all in Alerts tab
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currencySymbol}
                {inventoryValue?.totalValue
                  ? parseFloat(inventoryValue.totalValue).toFixed(2)
                  : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {inventoryValue?.totalItems || 0} items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventoryValue?.totalStock?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-muted-foreground">Units in stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Low Stock Items
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {lowStockItems.length || inventoryValue?.lowStockItems || 0}
              </div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Expiring Soon
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {inventoryValue?.expiringItems || 0}
              </div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Expired Items
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {inventoryValue?.expiredItems || 0}
              </div>
              <p className="text-xs text-muted-foreground">Remove from stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger
              value="item-master"
              className="flex items-center space-x-2"
            >
              <Package className="h-4 w-4" />
              <span>Item Master</span>
            </TabsTrigger>
            <TabsTrigger
              value="stock-inventory"
              className="flex items-center space-x-2"
            >
              <Archive className="h-4 w-4" />
              <span>Stock/Inventory</span>
            </TabsTrigger>
            <TabsTrigger
              value="purchase-orders"
              className="flex items-center space-x-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Purchase Orders</span>
            </TabsTrigger>
            <TabsTrigger
              value="goods-receipt"
              className="flex items-center space-x-2"
            >
              <Truck className="h-4 w-4" />
              <span>Goods Receipt</span>
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="flex items-center space-x-2"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Sales</span>
            </TabsTrigger>
            <TabsTrigger
              value="returns"
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Returns</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. Item Master Tab */}
          <TabsContent value="item-master" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Item Master
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Complete item database management
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowExistingItemsDialog(true);
                      }}
                      variant="outline"
                      className="h-9"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Create New Items
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <InventoryFilterCombobox
                    label="Item ID"
                    value={itemMasterFilters.itemId}
                    onChange={(value) => applyItemMasterFilter("itemId", value)}
                    options={itemMasterFilterOptions.itemId}
                  />
                  <InventoryFilterCombobox
                    label="Item Datetime"
                    value={itemMasterFilters.itemDatetime}
                    onChange={(value) => applyItemMasterFilter("itemDatetime", value)}
                    options={itemMasterFilterOptions.itemDatetime}
                  />
                  <InventoryFilterCombobox
                    label="SKU / Barcode"
                    value={itemMasterFilters.skuBarcode}
                    onChange={(value) => applyItemMasterFilter("skuBarcode", value)}
                    options={itemMasterFilterOptions.skuBarcode}
                  />
                  <InventoryFilterCombobox
                    label="Item Name"
                    value={itemMasterFilters.itemName}
                    onChange={(value) => applyItemMasterFilter("itemName", value)}
                    options={itemMasterFilterOptions.itemName}
                  />
                  <InventoryFilterSelect
                    label="Category"
                    value={selectedCategory !== undefined ? selectedCategory.toString() : "all"}
                    onChange={applyItemMasterCategoryFilter}
                    options={categoryFilterOptions}
                    placeholder="All Categories"
                  />
                  <InventoryFilterCombobox
                    label="Status"
                    value={itemMasterFilters.status}
                    onChange={(value) => applyItemMasterFilter("status", value)}
                    options={itemMasterFilterOptions.status}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={inventoryClearButtonClass}
                    onClick={() => {
                      setItemMasterFilters({ ...itemMasterFilterDefaults });
                      setSelectedCategory(undefined);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    className={inventoryClearButtonClass}
                    onClick={() => setShowLowStock(!showLowStock)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Low Stock Only
                  </Button>
                </div>

                {/* Items Table */}
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                        <TableHead className={inventoryTableHeadClass}>Item ID</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Item Datetime</TableHead>
                        <TableHead className={inventoryTableHeadClass}>SKU/barcode</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Item Name & Category</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Unit of Measurement</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Current Stock</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Reorder Level</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                        <TableHead className={`${inventoryTableHeadClass} text-right`}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2 text-gray-400" />
                              <span className="text-gray-500">Loading items...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-12 text-gray-500"
                          >
                            No items found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item, index) => (
                          <TableRow key={item.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                            <TableCell className={inventoryIdCellClass}>
                              #{index + 1}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {item.createdAt ? (
                                <>
                                  {formatUTC(item.createdAt, "MMM dd, yyyy")}
                                  <br />
                                  <span className="text-gray-500 text-base">
                                    {formatUTC(item.createdAt, "HH:mm:ss")}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div className="font-bold">{item.sku}</div>
                              {item.barcode && (
                                <div className="text-base text-gray-500 mt-0.5">
                                  {item.barcode}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div>
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-lg text-gray-600 mt-0.5">
                                  {item.categoryName || "Uncategorized"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>{item.unitOfMeasurement}</TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {/* Display currentStock from inventory_items table */}
                              {(() => {
                                const stockValue = item.currentStock || 0;
                                
                                if (stockValue === 0) {
                                  return (
                                    <Badge 
                                      variant="destructive" 
                                      className="bg-red-100 text-red-700 border-red-200 font-medium px-2.5 py-0.5 rounded-full border"
                                    >
                                      Out of Stock (0)
                                    </Badge>
                                  );
                                }
                                
                                return (
                                  <div
                                    className={`font-semibold ${item.isLowStock ? "text-orange-600" : "text-gray-900"}`}
                                  >
                                    {stockValue}
                                    {item.isLowStock && (
                                      <AlertTriangle className="h-3 w-3 inline ml-1 text-orange-500" />
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>{item.reorderPoint}</TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {getStatusBadge(item.isLowStock ? "low_stock" : "in_stock")}
                            </TableCell>
                            <TableCell className={`${inventoryTableCellClass} text-right`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {(canEdit('inventory') || isAdmin() || isDoctor() || isNurse()) && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setItemToEdit(item);
                                        setShowEditDialog(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Item
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowItemDetailsDialog(true);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {canEdit('inventory') && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setShowStockDialog(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Adjust Stock
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => generateItemReport(item)}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generate Report
                                  </DropdownMenuItem>
                                  {(canDelete('inventory') || isAdmin() || isDoctor() || isNurse()) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          deleteItem(item);
                                        }}
                                        className="text-red-600 focus:text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={deleteItemMutation.isPending}
                                      >
                                        {deleteItemMutation.isPending ? (
                                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="mr-2 h-4 w-4" />
                                        )}
                                        {deleteItemMutation.isPending
                                          ? "Deleting..."
                                          : "Delete Item"}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Stock/Inventory Tab */}
          <TabsContent value="stock-inventory" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Archive className="h-5 w-5 mr-2" />
                      Stock/Inventory Table - Batch & Location Tracking
                    </CardTitle>
                    <CardDescription>
                      Track stock by batch number, location/department, expiry dates
                      for complete traceability
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {canCreate('inventory') && (
                      <Button
                        onClick={() => {
                          setCreateBatchForm({
                            itemId: "",
                            batchNumber: "",
                            quantity: "",
                            expiryDate: "",
                            manufactureDate: "",
                            purchasePrice: "",
                            receivedDate: new Date().toISOString().split('T')[0],
                            supplierId: "none",
                            purchaseOrderId: "none",
                            warehouseId: "",
                          });
                          setShowCreateBatchDialog(true);
                        }}
                        className="ml-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Batch
                      </Button>
                    )}
                    {isAdmin() && (
                      <Button
                        onClick={() => {
                          setWarehouseForm({
                            warehouseName: "",
                            location: "",
                            status: "active",
                          });
                          setShowCreateWarehouseDialog(true);
                        }}
                        variant="outline"
                        className="ml-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Warehouses
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <InventoryFilterCombobox
                    label="Item ID"
                    value={stockFilters.itemId}
                    onChange={(value) => applyStockFilter("itemId", value)}
                    options={stockFilterOptions.itemId}
                  />
                  <InventoryFilterCombobox
                    label="Item Name"
                    value={stockFilters.itemName}
                    onChange={(value) => applyStockFilter("itemName", value)}
                    options={stockFilterOptions.itemName}
                  />
                  <InventoryFilterCombobox
                    label="Batch Number"
                    value={stockFilters.batchNumber}
                    onChange={(value) => applyStockFilter("batchNumber", value)}
                    options={stockFilterOptions.batchNumber}
                  />
                  <InventoryFilterCombobox
                    label="Location/Department"
                    value={stockFilters.location}
                    onChange={(value) => applyStockFilter("location", value)}
                    options={stockFilterOptions.location}
                  />
                  <InventoryFilterCombobox
                    label="Expiry Date"
                    value={stockFilters.expiryDate}
                    onChange={(value) => applyStockFilter("expiryDate", value)}
                    options={stockFilterOptions.expiryDate}
                  />
                  <InventoryFilterCombobox
                    label="Supplier"
                    value={stockFilters.supplier}
                    onChange={(value) => applyStockFilter("supplier", value)}
                    options={stockFilterOptions.supplier}
                  />
                  <InventoryFilterCombobox
                    label="Status"
                    value={stockFilters.status}
                    onChange={(value) => applyStockFilter("status", value)}
                    options={stockFilterOptions.status}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={inventoryClearButtonClass}
                    onClick={() => setStockFilters({ ...stockFilterDefaults })}
                  >
                    Clear
                  </Button>
                </div>

                {/* Stock Table */}
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                        <TableHead className={inventoryTableHeadClass}>Item ID & Name</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Batch Number</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Quantity Available</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Location/Department</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Expiry Date</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Supplier</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                        {(canEdit('inventory') || canDelete('inventory')) && (
                          <TableHead className={`${inventoryTableHeadClass} text-right`}>Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLoading ? (
                        <TableRow>
                          <TableCell colSpan={(canEdit('inventory') || canDelete('inventory')) ? 8 : 7} className="text-center py-12">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2 text-gray-400" />
                              <span className="text-gray-500">Loading stock entries...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredStockEntries.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={canEdit('inventory') || canDelete('inventory') ? 8 : 7}
                            className="text-center py-12 text-gray-500"
                          >
                            No stock entries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStockEntries.map((entry, index) => (
                          <TableRow key={entry.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                            <TableCell className={inventoryTableCellClass}>
                              <div>
                                <div className="text-gray-900">
                                  <span className="font-bold font-mono">#{index + 1}</span>
                                  <span> - {entry.itemName}</span>
                                </div>
                                {entry.itemSku && (
                                  <div className="text-base text-gray-500 mt-0.5 font-mono">
                                    SKU: {entry.itemSku}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={inventoryIdCellClass}>
                              {entry.batchNumber}
                            </TableCell>
                            <TableCell className={inventoryNumberCellClass}>
                              {entry.quantityAvailable}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div className="flex items-center text-gray-700">
                                <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                {entry.location}
                              </div>
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <span
                                className={
                                  entry.isExpired
                                    ? "text-red-600 font-medium"
                                    : new Date(entry.expiryDate) <=
                                        new Date(
                                          Date.now() + 30 * 24 * 60 * 60 * 1000,
                                        )
                                      ? "text-yellow-600"
                                      : "text-gray-700"
                                }
                              >
                                {format(
                                  new Date(entry.expiryDate),
                                  "MMM dd, yyyy",
                                )}
                              </span>
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {entry.supplierName || "Unknown"}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {entry.isExpired ? (
                                <Badge className="bg-red-50 text-red-700 border-red-200">Expired</Badge>
                              ) : new Date(entry.expiryDate) <=
                                new Date(
                                  Date.now() + 30 * 24 * 60 * 60 * 1000,
                                ) ? (
                                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Expiring Soon
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500 text-white border-0">Valid</Badge>
                              )}
                            </TableCell>
                            {(canEdit('inventory') || canDelete('inventory')) && (
                              <TableCell className={`${inventoryTableCellClass} text-right`}>
                                <div className="flex items-center justify-end gap-1">
                                  {canEdit('inventory') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBatch(entry);
                                        setShowEditBatchDialog(true);
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-gray-100"
                                    >
                                      <Edit className="h-4 w-4 text-gray-600" />
                                    </Button>
                                  )}
                                  {canDelete('inventory') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setBatchToDelete(entry);
                                        setShowDeleteBatchModal(true);
                                      }}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Purchase Orders
                </CardTitle>
                <CardDescription className="mt-1">
                  Supplier & order management
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <InventoryFilterCombobox
                    label="PO Number"
                    value={poFilters.poNumber}
                    onChange={(value) => applyPoFilter("poNumber", value)}
                    options={poFilterOptions.poNumber}
                  />
                  <InventoryFilterCombobox
                    label="Supplier ID"
                    value={poFilters.supplierId}
                    onChange={(value) => applyPoFilter("supplierId", value)}
                    options={poFilterOptions.supplierId}
                  />
                  <InventoryFilterCombobox
                    label="Supplier Name"
                    value={poFilters.supplierName}
                    onChange={(value) => applyPoFilter("supplierName", value)}
                    options={poFilterOptions.supplierName}
                  />
                  <InventoryFilterDate
                    label="Order Date"
                    value={poFilters.orderDate}
                    onChange={(value) => applyPoFilter("orderDate", value)}
                  />
                  <InventoryFilterCombobox
                    label="Status"
                    value={poFilters.status}
                    onChange={(value) => applyPoFilter("status", value)}
                    options={poFilterOptions.status}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={inventoryClearButtonClass}
                    onClick={() => setPoFilters({ ...poFilterDefaults })}
                  >
                    Clear
                  </Button>
                </div>
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                        <TableHead className={inventoryTableHeadClass}>PO Number</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Supplier ID & Name</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Order Date</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Total Amount</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Items Ordered</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Quantity</TableHead>
                        <TableHead className={`${inventoryTableHeadClass} text-right`}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2 text-gray-400" />
                              <span className="text-gray-500">Loading purchase orders...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredPurchaseOrders.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-12 text-gray-500"
                          >
                            No purchase orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPurchaseOrders.map((po) => {
                          const totalQuantity = po.itemsOrdered?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                          return (
                          <TableRow key={po.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                            <TableCell className={inventoryIdCellClass}>
                              {po.poNumber}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div>
                                <div className="text-gray-900">
                                  <span className="font-bold font-mono">#{po.supplierId}</span>
                                  <span> - {po.supplierName}</span>
                                </div>
                                {po.supplierEmail && (
                                  <div className="text-sm text-gray-500 mt-0.5">
                                    {po.supplierEmail}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {format(new Date(po.orderDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(po.status)}
                                {(canEdit('inventory') || isAdmin() || isDoctor() || isNurse()) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-gray-100"
                                    onClick={() => {
                                      setSelectedPOForStatusEdit(po);
                                      setPOStatusForm({ status: po.status });
                                      setShowEditPOStatusDialog(true);
                                    }}
                                    title="Edit Status"
                                  >
                                    <Edit className="h-3 w-3 text-gray-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={inventoryNumberCellClass}>
                              {currencySymbol}{parseFloat(po.totalAmount).toFixed(2)}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div>
                                {po.itemsOrdered?.length || 0} items
                              </div>
                            </TableCell>
                            <TableCell className={inventoryNumberCellClass}>
                              {totalQuantity}
                            </TableCell>
                            <TableCell className={`${inventoryTableCellClass} text-right`}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => viewPurchaseOrder(po)}
                                  className="h-8 px-2 hover:bg-gray-100"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSendEmail(po)}
                                  disabled={sendEmailMutation.isPending}
                                  className="h-8 px-2 hover:bg-gray-100"
                                >
                                  {po.emailSent ? "Resend" : "Send"}
                                </Button>
                                {canDelete('inventory') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      deletePurchaseOrderMutation.mutate(po.id)
                                    }
                                    disabled={
                                      deletePurchaseOrderMutation.isPending
                                    }
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Goods Receipt Tab */}
          <TabsContent value="goods-receipt" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Goods Receipt
                </CardTitle>
                <CardDescription className="mt-1">
                  Delivery & batch recording
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <InventoryFilterCombobox
                    label="Receipt Number"
                    value={goodsReceiptFilters.receiptNumber}
                    onChange={(value) => applyGoodsReceiptFilter("receiptNumber", value)}
                    options={goodsReceiptFilterOptions.receiptNumber}
                  />
                  <InventoryFilterCombobox
                    label="PO Number"
                    value={goodsReceiptFilters.poNumber}
                    onChange={(value) => applyGoodsReceiptFilter("poNumber", value)}
                    options={goodsReceiptFilterOptions.poNumber}
                  />
                  <InventoryFilterCombobox
                    label="Supplier Name"
                    value={goodsReceiptFilters.supplierName}
                    onChange={(value) => applyGoodsReceiptFilter("supplierName", value)}
                    options={goodsReceiptFilterOptions.supplierName}
                  />
                  <InventoryFilterDate
                    label="Received Date"
                    value={goodsReceiptFilters.receivedDate}
                    onChange={(value) => applyGoodsReceiptFilter("receivedDate", value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={inventoryClearButtonClass}
                    onClick={() => setGoodsReceiptFilters({ ...goodsReceiptFilterDefaults })}
                  >
                    Clear
                  </Button>
                </div>
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                        <TableHead className={inventoryTableHeadClass}>Receipt Number</TableHead>
                        <TableHead className={inventoryTableHeadClass}>PO Number</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Supplier Name</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Received Date</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Items Received</TableHead>
                        <TableHead className={inventoryTableHeadClass}>Total Amount</TableHead>
                        <TableHead className={`${inventoryTableHeadClass} text-right`}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2 text-gray-400" />
                              <span className="text-gray-500">Loading goods receipts...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredGoodsReceipts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-12 text-gray-500"
                          >
                            No goods receipts found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGoodsReceipts.map((receipt) => (
                          <TableRow key={receipt.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                            <TableCell className={inventoryIdCellClass}>
                              {receipt.receiptNumber}
                            </TableCell>
                            <TableCell className={inventoryIdCellClass}>
                              {receipt.poNumber ||
                                (receipt.purchaseOrderId
                                  ? `PO-${receipt.purchaseOrderId}`
                                  : "N/A")}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {receipt.supplierName}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              {format(
                                new Date(receipt.receivedDate),
                                "MMM dd, yyyy",
                              )}
                            </TableCell>
                            <TableCell className={inventoryTableCellClass}>
                              <div>
                                {receipt.itemsReceived?.length || 0} items
                              </div>
                            </TableCell>
                            <TableCell className={inventoryNumberCellClass}>
                              {currencySymbol}{parseFloat(receipt.totalAmount).toFixed(2)}
                            </TableCell>
                            <TableCell className={`${inventoryTableCellClass} text-right`}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openGoodsReceiptDetails(receipt.id)}
                                  title="View Details"
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                  <Eye className="h-3 w-3 text-gray-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewGoodsReceiptPdf(receipt)}
                                  title="View PDF"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                                {canDelete('inventory') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteGoodsReceipt(receipt.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <Dialog
            open={showGoodsReceiptDetails}
            onOpenChange={(open) => {
              if (!open) {
                closeGoodsReceiptDetails();
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Goods Receipt Details</DialogTitle>
                <DialogDescription>
                  Review the source purchase order and received items for this
                  goods receipt.
                </DialogDescription>
              </DialogHeader>
              {goodsReceiptDetailsLoading ? (
                <div className="flex items-center justify-center py-6 space-x-2 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading receipt...
                </div>
              ) : selectedGoodsReceiptDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Receipt #
                      </p>
                      <p className="font-mono font-semibold">
                        {selectedGoodsReceiptDetails.receiptNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Received Date
                      </p>
                      <p className="font-medium">
                        {format(
                          new Date(selectedGoodsReceiptDetails.receivedDate),
                          "PPP"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Purchase Order
                      </p>
                      <p className="font-medium">
                        {selectedGoodsReceiptDetails.purchaseOrder?.poNumber ||
                          selectedGoodsReceiptDetails.poNumber ||
                          (selectedGoodsReceiptDetails.purchaseOrderId
                            ? `PO-${selectedGoodsReceiptDetails.purchaseOrderId}`
                            : "N/A")}
                      </p>
                      {selectedGoodsReceiptDetails.purchaseOrder?.status && (
                        <p className="text-xs text-gray-500 mt-1">
                          Status: <span className="capitalize">{selectedGoodsReceiptDetails.purchaseOrder.status}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Supplier
                      </p>
                      <p className="font-medium">
                        {selectedGoodsReceiptDetails.supplierName || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Purchase Order Details Section */}
                  {selectedGoodsReceiptDetails.purchaseOrder && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Purchase Order Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            PO Number
                          </p>
                          <p className="font-medium">
                            {selectedGoodsReceiptDetails.purchaseOrder.poNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Order Date
                          </p>
                          <p className="font-medium">
                            {selectedGoodsReceiptDetails.purchaseOrder.orderDate
                              ? format(
                                  new Date(selectedGoodsReceiptDetails.purchaseOrder.orderDate),
                                  "PPP"
                                )
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Expected Delivery
                          </p>
                          <p className="font-medium">
                            {selectedGoodsReceiptDetails.purchaseOrder.expectedDeliveryDate
                              ? format(
                                  new Date(selectedGoodsReceiptDetails.purchaseOrder.expectedDeliveryDate),
                                  "PPP"
                                )
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Status
                          </p>
                          <p className="font-medium capitalize">
                            {selectedGoodsReceiptDetails.purchaseOrder.status || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Total Amount
                          </p>
                          <p className="font-semibold text-emerald-600">
                            {currencySymbol}{typeof selectedGoodsReceiptDetails.purchaseOrder.totalAmount === 'number'
                              ? selectedGoodsReceiptDetails.purchaseOrder.totalAmount.toFixed(2)
                              : parseFloat(String(selectedGoodsReceiptDetails.purchaseOrder.totalAmount || '0')).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Tax Amount
                          </p>
                          <p className="font-medium">
                            {currencySymbol}{typeof selectedGoodsReceiptDetails.purchaseOrder.taxAmount === 'number'
                              ? selectedGoodsReceiptDetails.purchaseOrder.taxAmount.toFixed(2)
                              : parseFloat(String(selectedGoodsReceiptDetails.purchaseOrder.taxAmount || '0')).toFixed(2)}
                          </p>
                        </div>
                        {selectedGoodsReceiptDetails.purchaseOrder.supplierName && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Supplier
                            </p>
                            <p className="font-medium">
                              {selectedGoodsReceiptDetails.purchaseOrder.supplierName}
                            </p>
                          </div>
                        )}
                        {selectedGoodsReceiptDetails.purchaseOrder.supplierEmail && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Supplier Email
                            </p>
                            <p className="font-medium text-sm">
                              {selectedGoodsReceiptDetails.purchaseOrder.supplierEmail}
                            </p>
                          </div>
                        )}
                      </div>
                      {selectedGoodsReceiptDetails.purchaseOrder.notes && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Notes
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedGoodsReceiptDetails.purchaseOrder.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Notes
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedGoodsReceiptDetails.notes || "No notes provided."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Total Amount
                      </p>
                      <p className="text-base font-semibold text-emerald-600">
                        {currencySymbol}{selectedGoodsReceiptDetails.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                      Items from Purchase Order
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className={inventoryTableHeadClass}>Item</TableHead>
                            <TableHead className={inventoryTableHeadClass}>Qty</TableHead>
                            <TableHead className={`${inventoryTableHeadClass} text-right`}>
                              Unit Price
                            </TableHead>
                            <TableHead className={`${inventoryTableHeadClass} text-right`}>
                              Line Total
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Use purchaseOrderItems if available, otherwise fall back to items
                            const displayItems = selectedGoodsReceiptDetails.purchaseOrderItems && selectedGoodsReceiptDetails.purchaseOrderItems.length > 0
                              ? selectedGoodsReceiptDetails.purchaseOrderItems
                              : selectedGoodsReceiptDetails.items;

                            if (!displayItems || displayItems.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="text-center py-4 text-sm text-gray-500"
                                  >
                                    No ordered items found for this receipt.
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return displayItems.map((item: any, index: number) => (
                              <TableRow key={`${item.itemId || item.id || index}-${item.quantity}`}>
                                <TableCell className={inventoryTableCellClass}>{item.itemName || 'Unknown Item'}</TableCell>
                                <TableCell className={inventoryNumberCellClass}>{item.quantity}</TableCell>
                                <TableCell className={`${inventoryNumberCellClass} text-right`}>
                                  {currencySymbol}{typeof item.unitPrice === 'number' 
                                    ? item.unitPrice.toFixed(2) 
                                    : parseFloat(item.unitPrice || "0").toFixed(2)}
                                </TableCell>
                                <TableCell className={`${inventoryNumberCellClass} text-right`}>
                                  {currencySymbol}{typeof item.totalPrice === 'number'
                                    ? item.totalPrice.toFixed(2)
                                    : (item.quantity * (typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice || "0"))).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : goodsReceiptDetailsError ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-red-600 font-medium">
                    Error loading goods receipt details
                  </p>
                  <p className="text-xs text-gray-500 break-words">
                    {goodsReceiptDetailsError instanceof Error 
                      ? goodsReceiptDetailsError.message 
                      : String(goodsReceiptDetailsError) || "An unexpected error occurred"}
                  </p>
                </div>
              ) : (
                <p className="text-center py-6 text-sm text-gray-500">
                  Unable to load goods receipt details.
                </p>
              )}
            </DialogContent>
          </Dialog>

          {/* 5. Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <PharmacySales />
          </TabsContent>

          {/* 6. Returns Tab */}
          <TabsContent value="returns" className="space-y-6">
            <ReturnsManagement />
          </TabsContent>

          {/* 7. Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Critical Alerts - Low Stock & Expiry Monitoring
                </CardTitle>
                <CardDescription>
                  Monitor Low Stock alerts based on reorder levels and Expiry
                  Alerts for patient safety
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <InventoryFilterCombobox
                    label="Alert Type"
                    value={alertFilters.alertType}
                    onChange={(value) => applyAlertFilter("alertType", value)}
                    options={alertFilterOptions.alertType}
                  />
                  <InventoryFilterCombobox
                    label="Item Name"
                    value={alertFilters.itemName}
                    onChange={(value) => applyAlertFilter("itemName", value)}
                    options={alertFilterOptions.itemName}
                  />
                  <InventoryFilterCombobox
                    label="Batch Number"
                    value={alertFilters.batchNumber}
                    onChange={(value) => applyAlertFilter("batchNumber", value)}
                    options={alertFilterOptions.batchNumber}
                  />
                  <InventoryFilterCombobox
                    label="Alert Date"
                    value={alertFilters.alertDate}
                    onChange={(value) => applyAlertFilter("alertDate", value)}
                    options={alertFilterOptions.alertDate}
                  />
                  <InventoryFilterCombobox
                    label="Expiry Date"
                    value={alertFilters.expiryDate}
                    onChange={(value) => applyAlertFilter("expiryDate", value)}
                    options={alertFilterOptions.expiryDate}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={inventoryClearButtonClass}
                    onClick={() => setAlertFilters({ ...alertFilterDefaults })}
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-lg font-medium">No Critical Alerts</p>
                      <p className="text-sm">
                        All inventory levels and expiry dates are within safe
                        limits
                      </p>
                    </div>
                  ) : filteredAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No Matching Alerts</p>
                      <p className="text-sm">Try adjusting or clearing your filters</p>
                    </div>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <Card
                        key={alert.id}
                        className={`${
                          alert.alertType === "expired" ||
                          alert.alertType === "low_stock"
                            ? "border-red-200 bg-red-50 dark:bg-red-950"
                            : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              <AlertTriangle
                                className={`h-5 w-5 ${
                                  alert.alertType === "expired" ||
                                  alert.alertType === "low_stock"
                                    ? "text-red-500"
                                    : "text-yellow-500"
                                }`}
                              />
                              {getAlertTypeBadge(alert.alertType)}
                              <div>
                                <div className="font-medium">
                                  {alert.itemName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {alert.message}
                                </div>
                                {alert.batchNumber && (
                                  <div className="text-xs text-gray-500">
                                    Batch: {alert.batchNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm text-gray-500">
                                  {formatUTC(alert.createdAt, "MMM dd, HH:mm")}
                                </div>
                                {alert.currentStock !== undefined && (
                                  <div className="text-xs">
                                    Stock: {alert.currentStock}/
                                    {alert.minimumStock}
                                  </div>
                                )}
                                {alert.expiryDate && (
                                  <div className="text-xs">
                                    Expires:{" "}
                                    {format(
                                      new Date(alert.expiryDate),
                                      "MMM dd, yyyy",
                                    )}
                                  </div>
                                )}
                              </div>
                              {(canDelete("inventory") || isAdmin() || isDoctor() || isNurse()) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteAlertMutation.mutate(alert.id)}
                                  disabled={deleteAlertMutation.isPending}
                                  title="Delete alert"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Stock Movement History
                </CardTitle>
                <CardDescription>
                  Complete log of all stock adjustments, purchases, sales, and transfers with timestamps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <InventoryFilterCombobox
                    label="Movement Date"
                    value={historyFilters.movementDate}
                    onChange={(value) => applyHistoryFilter("movementDate", value)}
                    options={historyFilterOptions.movementDate}
                  />
                  <InventoryFilterCombobox
                    label="Item Name"
                    value={historyFilters.itemName}
                    onChange={(value) => applyHistoryFilter("itemName", value)}
                    options={historyFilterOptions.itemName}
                  />
                  <InventoryFilterCombobox
                    label="Movement Type"
                    value={historyFilters.movementType}
                    onChange={(value) => applyHistoryFilter("movementType", value)}
                    options={historyFilterOptions.movementType}
                  />
                  <InventoryFilterCombobox
                    label="Direction"
                    value={historyFilters.direction}
                    onChange={(value) => applyHistoryFilter("direction", value)}
                    options={historyFilterOptions.direction}
                  />
                  <InventoryFilterCombobox
                    label="Reason"
                    value={historyFilters.reason}
                    onChange={(value) => applyHistoryFilter("reason", value)}
                    options={historyFilterOptions.reason}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={inventoryClearButtonClass}
                    onClick={() => setHistoryFilters({ ...historyFilterDefaults })}
                  >
                    Clear
                  </Button>
                </div>
                {movementsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Loading history...</span>
                  </div>
                ) : stockMovements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No Stock Movements</p>
                    <p className="text-sm">
                      Stock movement history will appear here when items are adjusted
                    </p>
                  </div>
                ) : filteredStockMovements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No Matching History</p>
                    <p className="text-sm">Try adjusting or clearing your filters</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                          <TableHead className={inventoryTableHeadClass}>Date & Time</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Item Name</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Movement Type</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Direction</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Quantity</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Previous Stock</TableHead>
                          <TableHead className={inventoryTableHeadClass}>New Stock</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Reason</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Notes</TableHead>
                          {(canDelete("inventory") || isAdmin() || isDoctor() || isNurse()) && (
                            <TableHead className={`${inventoryTableHeadClass} text-right`}>Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStockMovements.map((movement: any) => {
                          const isIn = movement.quantity > 0;
                          const direction = isIn ? "IN" : "OUT";
                          const quantity = Math.abs(movement.quantity);
                          
                          // Extract reason from notes (format: "Reason: {reason}. Notes: {notes}" or "Reason: {reason}")
                          let reason = "";
                          let notes = movement.notes || "";
                          if (movement.notes) {
                            const reasonMatch = movement.notes.match(/Reason:\s*([^.]+)/);
                            if (reasonMatch) {
                              reason = reasonMatch[1].trim();
                              const notesMatch = movement.notes.match(/Notes:\s*(.+)/);
                              if (notesMatch) {
                                notes = notesMatch[1].trim();
                              } else {
                                notes = "";
                              }
                            } else {
                              notes = movement.notes;
                            }
                          }

                          const movementTypeLabel = getMovementTypeLabel(movement.movementType);

                          return (
                            <TableRow key={movement.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                              <TableCell className={inventoryTableCellClass}>
                                {formatUTC(movement.createdAt, "MMM dd, yyyy")}
                                <br />
                                <span className="text-gray-500 text-sm">
                                  {formatUTC(movement.createdAt, "HH:mm:ss")}
                                </span>
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                {movement.itemName || "Unknown Item"}
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{movementTypeLabel}</Badge>
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                <Badge
                                  className={
                                    isIn
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                >
                                  {isIn ? (
                                    <>
                                      <ArrowUp className="h-3 w-3 mr-1 inline" />
                                      IN
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDown className="h-3 w-3 mr-1 inline" />
                                      OUT
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className={inventoryNumberCellClass}>
                                {quantity}
                              </TableCell>
                              <TableCell className={inventoryNumberCellClass}>{movement.previousStock}</TableCell>
                              <TableCell className={inventoryNumberCellClass}>
                                {movement.newStock}
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                {reason || "-"}
                              </TableCell>
                              <TableCell className={`${inventoryTableCellClass} max-w-xs truncate`} title={notes}>
                                {notes || "-"}
                              </TableCell>
                              {(canDelete("inventory") || isAdmin() || isDoctor() || isNurse()) && (
                                <TableCell className={`${inventoryTableCellClass} text-right`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => deleteMovementMutation.mutate(movement.id)}
                                    disabled={deleteMovementMutation.isPending}
                                    title="Delete history entry"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {showAddDialog && (
          <AddItemDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        )}

        {showEditDialog && (
          <AddItemDialog 
            open={showEditDialog} 
            onOpenChange={(open) => {
              setShowEditDialog(open);
              if (!open) {
                setItemToEdit(null);
              }
            }} 
            itemToEdit={itemToEdit}
          />
        )}

        {/* Existing Items Dialog */}
        <Dialog open={showExistingItemsDialog} onOpenChange={setShowExistingItemsDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Item Names (inventory_items_name)
                </div>
                {canCreate('inventory') && (
                  <Button
                    onClick={() => {
                      setItemNameToEdit(null);
                      setShowAddItemNameDialog(true);
                    }}
                    size="sm"
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Item Name
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription>
                View, edit, and delete item names from inventory_items_name table
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-gray-200 bg-white overflow-hidden mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                    <TableHead className={inventoryTableHeadClass}>ID</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Item Name</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Brand Name</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Manufacturer</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Unit of Measurement</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Description</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                    <TableHead className={`${inventoryTableHeadClass} text-right`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemNamesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2 text-gray-400" />
                          <span className="text-gray-500">Loading item names...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : itemNames.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        No item names found
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemNames.map((itemName) => (
                      <TableRow key={itemName.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                        <TableCell className={inventoryIdCellClass}>
                          #{itemName.id}
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          <div className="font-medium text-gray-900">{itemName.name}</div>
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          <div>
                            {itemName.brandName || <span className="text-gray-400">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          <div>
                            {itemName.manufacturer || <span className="text-gray-400">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          <div className="capitalize">
                            {itemName.unitOfMeasurement || <span className="text-gray-400">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          <div>
                            {itemName.description || <span className="text-gray-400">No description</span>}
                          </div>
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          {getStatusBadge(itemName.isActive ? "active" : "inactive")}
                        </TableCell>
                        <TableCell className={`${inventoryTableCellClass} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            {(canEdit('inventory') || isAdmin() || isDoctor() || isNurse()) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setItemNameToEdit(itemName);
                                  setShowAddItemNameDialog(true);
                                }}
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                title="Edit Item Name"
                              >
                                <Edit className="h-4 w-4 text-gray-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExistingItemsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Item Name Dialog */}
        <AddItemNameDialog
          open={showAddItemNameDialog}
          onOpenChange={(open) => {
            setShowAddItemNameDialog(open);
            if (!open) {
              setItemNameToEdit(null);
            }
          }}
          editingItemName={itemNameToEdit}
        />

        {showStockDialog && selectedItem && (
          <StockAdjustmentDialog
            open={showStockDialog}
            onOpenChange={(open) => {
              setShowStockDialog(open);
              if (!open) {
                // Refresh the selected item when dialog closes
                queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
                queryClient.invalidateQueries({ queryKey: [`/api/inventory/items/${selectedItem.id}`] });
              }
            }}
            item={selectedItem}
          />
        )}

        {showPODialog && (
          <PurchaseOrderDialog
            open={showPODialog}
            onOpenChange={(open) => {
              setShowPODialog(open);
              if (!open) {
                // Clear selected PO when PO dialog closes
                setSelectedPurchaseOrderIdForReceipt(undefined);
              }
            }}
            items={items}
            onPurchaseOrderCreated={(purchaseOrderId) => {
              // Set the selected PO ID and open Goods Receipt dialog
              setSelectedPurchaseOrderIdForReceipt(purchaseOrderId);
              setShowReceiptDialog(true);
            }}
          />
        )}

        {showReceiptDialog && (
          <GoodsReceiptDialog
            open={showReceiptDialog}
            onOpenChange={(open) => {
              setShowReceiptDialog(open);
              if (!open) {
                // Clear selected PO when Goods Receipt dialog closes
                setSelectedPurchaseOrderIdForReceipt(undefined);
              }
            }}
            items={items}
            defaultPurchaseOrderId={selectedPurchaseOrderIdForReceipt}
            onReceiptCreated={async (receiptId) => {
              // Show PDF popup after receipt creation
              await handleViewGoodsReceiptPdfById(receiptId);
            }}
          />
        )}

        {showPODetailsDialog && selectedPO && (
          <Dialog
            open={showPODetailsDialog}
            onOpenChange={setShowPODetailsDialog}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Purchase Order Details - {selectedPO.poNumber}
                </DialogTitle>
                <DialogDescription>
                  Complete purchase order information and supplier details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      PO Number
                    </Label>
                    <div className="font-mono font-semibold">
                      {selectedPO.poNumber}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Status
                    </Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedPO.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Order Date
                    </Label>
                    <div>
                      {format(new Date(selectedPO.orderDate), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Expected Delivery
                    </Label>
                    <div>
                      {selectedPO.expectedDeliveryDate
                        ? format(
                            new Date(selectedPO.expectedDeliveryDate),
                            "MMM dd, yyyy",
                          )
                        : "Not specified"}
                    </div>
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-sm font-semibold mb-3 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Supplier Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Supplier ID
                      </Label>
                      <div>#{selectedPO.supplierId}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Supplier Name
                      </Label>
                      <div className="font-medium">
                        {selectedPO.supplierName}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Email Address
                      </Label>
                      <div className="font-mono text-sm">
                        {selectedPO.supplierEmail || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-sm font-semibold mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Financial Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Total Amount
                      </Label>
                      <div className="text-lg font-bold text-green-600">
                        {currencySymbol}{parseFloat(selectedPO.totalAmount).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Tax Amount
                      </Label>
                      <div className="font-medium">
                        {currencySymbol}{parseFloat(selectedPO.taxAmount || "0").toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Items Count
                      </Label>
                      <div className="font-medium">
                        {selectedPO.itemsOrdered?.length || 0} items
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Email Status
                      </Label>
                      <div className="font-medium">
                        {selectedPO.emailSent ? (
                          <Badge variant="default" className="text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes if any */}
                {selectedPO.notes && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedPO.notes}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleSendEmail(selectedPO);
                      setShowPODetailsDialog(false);
                    }}
                    disabled={sendEmailMutation.isPending}
                    className="flex items-center"
                    variant={selectedPO.emailSent ? "outline" : "default"}
                  >
                    {sendEmailMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {selectedPO.emailSent
                      ? "Resend to Supplier"
                      : "Send to Supplier"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPODetailsDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Item Details Dialog */}
        {showItemDetailsDialog && selectedItem && (
          <Dialog
            open={showItemDetailsDialog}
            onOpenChange={setShowItemDetailsDialog}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Item Details - {selectedItem.name}
                </DialogTitle>
                <DialogDescription>
                  Complete information about {selectedItem.name} including
                  inventory, pricing, and status details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Item ID
                          </Label>
                          <p className="font-mono text-sm">{selectedItem.id}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            SKU
                          </Label>
                          <p className="font-mono text-sm">
                            {selectedItem.sku}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Name
                          </Label>
                          <p className="font-medium">{selectedItem.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Category
                          </Label>
                          <p>{selectedItem.categoryName || "Uncategorized"}</p>
                        </div>
                        {selectedItem.description && (
                          <div className="col-span-2">
                            <Label className="text-sm font-medium text-gray-600">
                              Description
                            </Label>
                            <p className="text-sm">
                              {selectedItem.description}
                            </p>
                          </div>
                        )}
                        {selectedItem.barcode && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">
                              Barcode
                            </Label>
                            <p className="font-mono text-sm">
                              {selectedItem.barcode}
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Unit of Measurement
                          </Label>
                          <p>{selectedItem.unitOfMeasurement}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Pricing Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Purchase Price
                          </Label>
                          <p className="font-bold text-lg">
                            {currencySymbol}{parseFloat(selectedItem.purchasePrice).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Sale Price
                          </Label>
                          <p className="font-bold text-lg text-green-600">
                            {currencySymbol}{parseFloat(selectedItem.salePrice).toFixed(2)}
                          </p>
                        </div>
                        {selectedItem.mrp && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">
                              MRP
                            </Label>
                            <p className="font-medium">
                              {currencySymbol}{parseFloat(selectedItem.mrp).toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Stock Value
                          </Label>
                          <p className="font-bold text-lg text-blue-600">
                            {currencySymbol}
                            {parseFloat(
                              selectedItem.stockValue.toString(),
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Inventory Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Inventory Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Label className="text-sm font-medium text-gray-600">
                          Current Stock
                        </Label>
                        <p className="text-2xl font-bold mt-1">
                          {selectedItem.batchStock !== undefined && selectedItem.batchStock !== null 
                            ? selectedItem.batchStock 
                            : selectedItem.currentStock}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedItem.unitOfMeasurement}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Label className="text-sm font-medium text-gray-600">
                          Minimum Stock
                        </Label>
                        <p className="text-2xl font-bold mt-1 text-orange-600">
                          {selectedItem.minimumStock}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedItem.unitOfMeasurement}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Label className="text-sm font-medium text-gray-600">
                          Reorder Point
                        </Label>
                        <p className="text-2xl font-bold mt-1 text-red-600">
                          {selectedItem.reorderPoint}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedItem.unitOfMeasurement}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Label className="text-sm font-medium text-gray-600">
                          Stock Status
                        </Label>
                        <div className="mt-1">
                          {selectedItem.isLowStock ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Additional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {selectedItem.brandName && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">
                              Brand
                            </Label>
                            <p>{selectedItem.brandName}</p>
                          </div>
                        )}
                        {selectedItem.manufacturer && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">
                              Manufacturer
                            </Label>
                            <p>{selectedItem.manufacturer}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Prescription Required
                          </Label>
                          <p>
                            {selectedItem.prescriptionRequired ? "Yes" : "No"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Active Status
                          </Label>
                          <p>{selectedItem.isActive ? "Active" : "Inactive"}</p>
                        </div>
                        {selectedItem.expiryDate && (
                          <div className="col-span-2">
                            <Label className="text-sm font-medium text-gray-600">
                              Expiry Date
                            </Label>
                            <p
                              className={
                                new Date(selectedItem.expiryDate) < new Date()
                                  ? "text-red-600 font-medium"
                                  : ""
                              }
                            >
                              {format(
                                new Date(selectedItem.expiryDate),
                                "MMM dd, yyyy",
                              )}
                              {new Date(selectedItem.expiryDate) <
                                new Date() && (
                                <Badge variant="destructive" className="ml-2">
                                  Expired
                                </Badge>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Record Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Created
                          </Label>
                          <p className="text-sm">
                            {format(
                              new Date(selectedItem.createdAt),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Last Updated
                          </Label>
                          <p className="text-sm">
                            {format(
                              new Date(selectedItem.updatedAt),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  {canEdit('inventory') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowItemDetailsDialog(false);
                        setShowStockDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Adjust Stock
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowItemDetailsDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Email Dialog */}
        {showEmailDialog && selectedPOForEmail && (
          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Send Purchase Order
                </DialogTitle>
                <DialogDescription>
                  Enter the email address to send purchase order{" "}
                  {selectedPOForEmail.poNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="supplier@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Purchase order will be sent to this email address
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmailDialog(false);
                      setEmailAddress("");
                      setSelectedPOForEmail(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmSendEmail}
                    disabled={
                      sendEmailMutation.isPending || !emailAddress.trim()
                    }
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Are you sure you want to delete <strong>"{itemToDelete?.name}"</strong> (SKU: {itemToDelete?.sku})?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone and will permanently remove the item from your inventory database.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteItem}
                disabled={deleteItemMutation.isPending}
              >
                {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="sr-only">Item Deleted Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Success
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {successMessage}
              </p>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage("");
                }}
                className="mt-6 w-full"
                data-testid="button-close-delete-success"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Goods Receipt Confirmation Modal */}
        <Dialog open={showDeleteGoodsReceiptModal} onOpenChange={setShowDeleteGoodsReceiptModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this goods receipt? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteGoodsReceiptModal(false);
                  setGoodsReceiptToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteGoodsReceipt}
                disabled={deleteGoodsReceiptMutation.isPending}
              >
                {deleteGoodsReceiptMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Goods Receipt Success Modal */}
        <Dialog open={showDeleteGoodsReceiptSuccess} onOpenChange={setShowDeleteGoodsReceiptSuccess}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="sr-only">Goods Receipt Deleted Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Success
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Goods receipt deleted successfully.
              </p>
              <Button
                onClick={() => {
                  setShowDeleteGoodsReceiptSuccess(false);
                }}
                className="mt-6 w-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF Viewer Dialog */}
        <Dialog open={showPdfViewer} onOpenChange={(open) => {
          if (!open) {
            // Clean up blob URL when closing
            if (pdfUrl && pdfUrl.startsWith('blob:')) {
              URL.revokeObjectURL(pdfUrl);
            }
            setPdfUrl(null);
            setSelectedReceiptForPdf(null);
          }
          setShowPdfViewer(open);
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>
                Goods Receipt PDF: {selectedReceiptForPdf?.receiptNumber || 'Receipt'}.pdf
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden px-6 pb-4" style={{ minHeight: '600px', height: 'calc(90vh - 120px)' }}>
              {pdfLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading PDF...</span>
                </div>
              ) : pdfUrl ? (
                <iframe 
                  src={pdfUrl} 
                  className="w-full h-full border rounded" 
                  title="Goods Receipt PDF" 
                  style={{ minHeight: '600px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500">No PDF available</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t">
              <Button onClick={() => {
                if (pdfUrl && pdfUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(pdfUrl);
                }
                setShowPdfViewer(false);
                setPdfUrl(null);
                setSelectedReceiptForPdf(null);
              }}>Close</Button>
              {pdfUrl && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        // Download PDF file
                        const response = await apiRequest('GET', `/api/inventory/goods-receipts/${selectedReceiptForPdf?.id}/pdf`);
                        if (!response.ok) {
                          throw new Error('Failed to download PDF');
                        }
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        
                        // Create download link
                        const purchaseOrderId = selectedReceiptForPdf?.purchaseOrderId || selectedReceiptForPdf?.id;
                        const fileName = `${purchaseOrderId}.pdf`;
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Clean up blob URL after a delay
                        setTimeout(() => {
                          URL.revokeObjectURL(blobUrl);
                        }, 100);
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to download PDF",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      if (pdfUrl.startsWith('blob:')) {
                        window.open(pdfUrl, '_blank');
                      } else {
                        // If it's not a blob URL, fetch it again with auth
                        try {
                          const response = await apiRequest('GET', `/api/inventory/goods-receipts/${selectedReceiptForPdf?.id}/pdf`);
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          window.open(blobUrl, '_blank');
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to open PDF",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" /> Open in New Tab
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        let urlToPrint = pdfUrl;
                        if (!pdfUrl.startsWith('blob:')) {
                          const response = await apiRequest('GET', `/api/inventory/goods-receipts/${selectedReceiptForPdf?.id}/pdf`);
                          const blob = await response.blob();
                          urlToPrint = URL.createObjectURL(blob);
                        }
                        const printWindow = window.open(urlToPrint, '_blank');
                        printWindow?.addEventListener('load', () => {
                          printWindow.print();
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to print PDF",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Batch Dialog */}
        <Dialog open={showCreateBatchDialog} onOpenChange={setShowCreateBatchDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>
                Add a new batch entry to track inventory stock
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="createItemId">Item *</Label>
                  <Select
                    value={createBatchForm.itemId}
                    onValueChange={(value) => {
                      // Clear error when field is changed
                      setCreateBatchErrors(prev => ({ ...prev, itemId: undefined }));
                      
                      // Find the selected item
                      const selectedItem = items.find((item) => String(item.id) === value);
                      if (selectedItem) {
                        // Auto-fill quantity from currentStock from inventory_items table
                        const stockValue = selectedItem.currentStock || 0;
                        
                        // Auto-fill purchase price
                        const purchasePrice = selectedItem.purchasePrice || "";
                        
                        setCreateBatchForm({ 
                          ...createBatchForm, 
                          itemId: value,
                          quantity: String(stockValue),
                          purchasePrice: purchasePrice
                        });
                      } else {
                        setCreateBatchForm({ ...createBatchForm, itemId: value });
                      }
                    }}
                  >
                    <SelectTrigger className={createBatchErrors.itemId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Get item IDs that already have batches
                        const itemsWithBatches = new Set(
                          stockEntries.map((entry: StockEntry) => entry.itemId)
                        );
                        
                        // Filter items: only show active items that don't have batches yet
                        const availableItems = items.filter((item) => {
                          return item.isActive && !itemsWithBatches.has(item.id);
                        });
                        
                        if (availableItems.length === 0) {
                          return (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No items available. All items already have batches created.
                            </div>
                          );
                        }
                        
                        return availableItems.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  {createBatchErrors.itemId && (
                    <p className="text-sm text-red-500 mt-1">{createBatchErrors.itemId}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="createBatchNumber">Batch Number</Label>
                  <Input
                    id="createBatchNumber"
                    value={createBatchForm.batchNumber}
                    onChange={(e) => setCreateBatchForm({ ...createBatchForm, batchNumber: e.target.value })}
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <Label htmlFor="createQuantity">Quantity *</Label>
                  <Input
                    id="createQuantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createBatchForm.quantity}
                    onChange={(e) => {
                      setCreateBatchForm({ ...createBatchForm, quantity: e.target.value });
                      setCreateBatchErrors(prev => ({ ...prev, quantity: undefined }));
                    }}
                    className={createBatchErrors.quantity ? "border-red-500" : ""}
                    required
                  />
                  {createBatchErrors.quantity && (
                    <p className="text-sm text-red-500 mt-1">{createBatchErrors.quantity}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="createExpiryDate">Expiry Date</Label>
                  <Input
                    id="createExpiryDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={createBatchForm.expiryDate}
                    onChange={(e) => setCreateBatchForm({ ...createBatchForm, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createManufactureDate">Manufacture Date</Label>
                  <Input
                    id="createManufactureDate"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={createBatchForm.manufactureDate}
                    onChange={(e) => setCreateBatchForm({ ...createBatchForm, manufactureDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createPurchasePrice">Purchase Price ({currencySymbol}) *</Label>
                  <Input
                    id="createPurchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={createBatchForm.purchasePrice}
                    onChange={(e) => {
                      setCreateBatchForm({ ...createBatchForm, purchasePrice: e.target.value });
                      setCreateBatchErrors(prev => ({ ...prev, purchasePrice: undefined }));
                    }}
                    className={createBatchErrors.purchasePrice ? "border-red-500" : ""}
                    required
                  />
                  {createBatchErrors.purchasePrice && (
                    <p className="text-sm text-red-500 mt-1">{createBatchErrors.purchasePrice}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="createReceivedDate">Received Date *</Label>
                  <Input
                    id="createReceivedDate"
                    type="date"
                    value={createBatchForm.receivedDate}
                    onChange={(e) => {
                      setCreateBatchForm({ ...createBatchForm, receivedDate: e.target.value });
                      setCreateBatchErrors(prev => ({ ...prev, receivedDate: undefined }));
                    }}
                    className={createBatchErrors.receivedDate ? "border-red-500" : ""}
                    required
                  />
                  {createBatchErrors.receivedDate && (
                    <p className="text-sm text-red-500 mt-1">{createBatchErrors.receivedDate}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="createPurchaseOrderId">Supplier (from Purchase Order)</Label>
                  <Select
                    value={createBatchForm.purchaseOrderId || undefined}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setCreateBatchForm({ ...createBatchForm, purchaseOrderId: "none", supplierId: "none" });
                      } else {
                        const po = purchaseOrders.find((po: any) => String(po.id) === value);
                        setCreateBatchForm({ 
                          ...createBatchForm, 
                          purchaseOrderId: value,
                          supplierId: po ? String(po.supplierId) : "none"
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purchase order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {purchaseOrders
                        .filter((po: any) => po.status === "received" || po.status === "sent")
                        .map((po: any) => (
                          <SelectItem key={po.id} value={String(po.id)}>
                            {po.poNumber} - {po.supplierName || "Unknown Supplier"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="createWarehouseId">Location/Department/Warehouse *</Label>
                  <Select
                    value={createBatchForm.warehouseId || undefined}
                    onValueChange={(value) => {
                      setCreateBatchForm({ ...createBatchForm, warehouseId: value });
                      setCreateBatchErrors(prev => ({ ...prev, warehouseId: undefined }));
                    }}
                    disabled={warehousesLoading}
                  >
                    <SelectTrigger className={createBatchErrors.warehouseId ? "border-red-500" : ""}>
                      <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : warehouses.filter((w: any) => w.status === "active").length === 0 ? "No warehouses available" : "Select warehouse"} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesLoading ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">Loading warehouses...</div>
                      ) : warehouses.filter((w: any) => w.status === "active").length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">No active warehouses found. Please create a warehouse first.</div>
                      ) : (
                        warehouses
                          .filter((w: any) => w.status === "active")
                          .map((warehouse: any) => (
                            <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                              {warehouse.warehouseName}
                              {warehouse.location && ` - ${warehouse.location}`}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  {createBatchErrors.warehouseId && (
                    <p className="text-sm text-red-500 mt-1">{createBatchErrors.warehouseId}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateBatchDialog(false);
                  setCreateBatchForm({
                    itemId: "",
                    batchNumber: "",
                    quantity: "",
                    expiryDate: "",
                    manufactureDate: "",
                    purchasePrice: "",
                    receivedDate: new Date().toISOString().split('T')[0],
                    supplierId: "none",
                    purchaseOrderId: "none",
                    warehouseId: "",
                  });
                  setCreateBatchErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Validate all required fields and set individual errors
                  const errors: {
                    itemId?: string;
                    quantity?: string;
                    purchasePrice?: string;
                    receivedDate?: string;
                    warehouseId?: string;
                  } = {};
                  
                  if (!createBatchForm.itemId) {
                    errors.itemId = "Item is required";
                  } else {
                    // Check if item already has a batch
                    const itemId = parseInt(createBatchForm.itemId);
                    const itemHasBatch = stockEntries.some((entry: StockEntry) => entry.itemId === itemId);
                    if (itemHasBatch) {
                      const selectedItem = items.find((item) => item.id === itemId);
                      errors.itemId = `Item "${selectedItem?.name || 'Unknown'}" (SKU: ${selectedItem?.sku || 'N/A'}) already has a batch. Please select a different item.`;
                    }
                  }
                  if (!createBatchForm.quantity) {
                    errors.quantity = "Quantity is required";
                  }
                  if (!createBatchForm.purchasePrice) {
                    errors.purchasePrice = "Purchase Price is required";
                  }
                  if (!createBatchForm.receivedDate) {
                    errors.receivedDate = "Received Date is required";
                  }
                  if (!createBatchForm.warehouseId) {
                    errors.warehouseId = "Location/Department/Warehouse is required";
                  }
                  
                  // If there are errors, set them and return
                  if (Object.keys(errors).length > 0) {
                    setCreateBatchErrors(errors);
                    toast({
                      title: "Validation Error",
                      description: "Please fill in all required fields",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Clear errors if validation passes
                  setCreateBatchErrors({});

                  const batchData: any = {
                    itemId: parseInt(createBatchForm.itemId),
                    quantity: parseFloat(createBatchForm.quantity),
                    purchasePrice: createBatchForm.purchasePrice,
                    receivedDate: createBatchForm.receivedDate,
                    warehouseId: parseInt(createBatchForm.warehouseId),
                  };

                  if (createBatchForm.batchNumber) {
                    batchData.batchNumber = createBatchForm.batchNumber;
                  }
                  if (createBatchForm.expiryDate) {
                    batchData.expiryDate = createBatchForm.expiryDate;
                  }
                  if (createBatchForm.manufactureDate) {
                    batchData.manufactureDate = createBatchForm.manufactureDate;
                  }
                  if (createBatchForm.purchaseOrderId && createBatchForm.purchaseOrderId !== "none") {
                    batchData.purchaseOrderId = parseInt(createBatchForm.purchaseOrderId);
                    // Get supplier from purchase order
                    const po = purchaseOrders.find((po: any) => String(po.id) === createBatchForm.purchaseOrderId);
                    if (po && po.supplierId) {
                      batchData.supplierId = po.supplierId;
                    }
                  } else if (createBatchForm.supplierId && createBatchForm.supplierId !== "none") {
                    batchData.supplierId = parseInt(createBatchForm.supplierId);
                  }

                  createBatchMutation.mutate(batchData);
                }}
                disabled={createBatchMutation.isPending}
              >
                {createBatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Batch"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Batch Dialog */}
        <Dialog open={showEditBatchDialog} onOpenChange={setShowEditBatchDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Batch</DialogTitle>
              <DialogDescription>
                Update batch information for {selectedBatch?.itemName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    value={editBatchForm.batchNumber}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, batchNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="remainingQuantity">Quantity Available</Label>
                  <Input
                    id="remainingQuantity"
                    type="number"
                    value={editBatchForm.remainingQuantity}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, remainingQuantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={editBatchForm.expiryDate}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="manufactureDate">Manufacture Date</Label>
                  <Input
                    id="manufactureDate"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={editBatchForm.manufactureDate}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, manufactureDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price ({currencySymbol})</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    value={editBatchForm.purchasePrice}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, purchasePrice: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="receivedDate">Received Date</Label>
                  <Input
                    id="receivedDate"
                    type="date"
                    value={editBatchForm.receivedDate}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, receivedDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select
                    value={editBatchForm.supplierId || undefined}
                    onValueChange={(value) => {
                      // Use "none" as a special value to represent no supplier
                      if (value === "none") {
                        setEditBatchForm({ ...editBatchForm, supplierId: "" });
                      } else {
                        setEditBatchForm({ ...editBatchForm, supplierId: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {suppliers.filter((s: any) => s.isActive).map((supplier: any) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editWarehouseId">Location/Department/Warehouse</Label>
                  <Select
                    value={editBatchForm.warehouseId || "none"}
                    onValueChange={(value) => {
                      setEditBatchForm({ ...editBatchForm, warehouseId: value });
                    }}
                    disabled={warehousesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : warehouses.filter((w: any) => w.status === "active").length === 0 ? "No warehouses available" : "Select warehouse"} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesLoading ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">Loading warehouses...</div>
                      ) : warehouses.filter((w: any) => w.status === "active").length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">No active warehouses found. Please create a warehouse first.</div>
                      ) : (
                        <>
                          <SelectItem value="none">None</SelectItem>
                          {warehouses
                            .filter((w: any) => w.status === "active")
                            .map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                                {warehouse.warehouseName}
                                {warehouse.location && ` - ${warehouse.location}`}
                              </SelectItem>
                            ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditBatchDialog(false);
                  setSelectedBatch(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedBatch) {
                    const updates: any = {};
                    if (editBatchForm.batchNumber) updates.batchNumber = editBatchForm.batchNumber;
                    if (editBatchForm.remainingQuantity) updates.remainingQuantity = parseFloat(editBatchForm.remainingQuantity);
                    if (editBatchForm.expiryDate) updates.expiryDate = editBatchForm.expiryDate;
                    if (editBatchForm.manufactureDate) updates.manufactureDate = editBatchForm.manufactureDate;
                    if (editBatchForm.purchasePrice) updates.purchasePrice = editBatchForm.purchasePrice;
                    if (editBatchForm.receivedDate) updates.receivedDate = editBatchForm.receivedDate;
                    if (editBatchForm.supplierId && editBatchForm.supplierId !== "none" && editBatchForm.supplierId !== "") {
                      updates.supplierId = parseInt(editBatchForm.supplierId);
                    } else {
                      updates.supplierId = null;
                    }
                    if (editBatchForm.warehouseId && editBatchForm.warehouseId !== "none" && editBatchForm.warehouseId !== "") {
                      updates.warehouseId = parseInt(editBatchForm.warehouseId);
                    } else {
                      updates.warehouseId = null;
                    }

                    updateBatchMutation.mutate({ batchId: selectedBatch.id, updates });
                  }
                }}
                disabled={updateBatchMutation.isPending}
              >
                {updateBatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Batch"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Batch Confirmation Dialog */}
        <AlertDialog open={showDeleteBatchModal} onOpenChange={setShowDeleteBatchModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Batch</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete batch "{batchToDelete?.batchNumber}" for item "{batchToDelete?.itemName}"? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteBatchModal(false);
                setBatchToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (batchToDelete) {
                    deleteBatchMutation.mutate(batchToDelete.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteBatchMutation.isPending}
              >
                {deleteBatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Warehouse Dialog */}
        <Dialog open={showCreateWarehouseDialog} onOpenChange={setShowCreateWarehouseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Warehouse</DialogTitle>
              <DialogDescription>
                Add a new warehouse location to track inventory storage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="warehouseName">Warehouse Name *</Label>
                <Input
                  id="warehouseName"
                  value={warehouseForm.warehouseName}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, warehouseName: e.target.value })
                  }
                  placeholder="e.g., Main Warehouse, Pharmacy, Emergency Room"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="warehouseLocation">Location</Label>
                <Input
                  id="warehouseLocation"
                  value={warehouseForm.location}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, location: e.target.value })
                  }
                  placeholder="e.g., Building A, Floor 2, Room 201"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="warehouseStatus">Status</Label>
                <Select
                  value={warehouseForm.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setWarehouseForm({ ...warehouseForm, status: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateWarehouseDialog(false);
                  setWarehouseForm({ warehouseName: "", location: "", status: "active" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!warehouseForm.warehouseName.trim()) {
                    toast({
                      title: "Validation Error",
                      description: "Warehouse name is required",
                      variant: "destructive",
                    });
                    return;
                  }
                  const warehouseData: { warehouseName: string; location?: string; status: string } = {
                    warehouseName: warehouseForm.warehouseName.trim(),
                    status: warehouseForm.status,
                  };
                  
                  // Only include location if it's not empty
                  if (warehouseForm.location && warehouseForm.location.trim() !== "") {
                    warehouseData.location = warehouseForm.location.trim();
                  }
                  
                  createWarehouseMutation.mutate(warehouseData);
                }}
                disabled={createWarehouseMutation.isPending}
              >
                {createWarehouseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Warehouse"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Purchase Order Status Dialog */}
        <Dialog open={showEditPOStatusDialog} onOpenChange={setShowEditPOStatusDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order Status</DialogTitle>
              <DialogDescription>
                Update the status for purchase order: {selectedPOForStatusEdit?.poNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="poStatus">Status *</Label>
                <Select
                  value={poStatusForm.status}
                  onValueChange={(value) => setPOStatusForm({ status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditPOStatusDialog(false);
                  setSelectedPOForStatusEdit(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedPOForStatusEdit) {
                    updatePOStatusMutation.mutate({
                      purchaseOrderId: selectedPOForStatusEdit.id,
                      status: poStatusForm.status,
                    });
                  }
                }}
                disabled={updatePOStatusMutation.isPending}
              >
                {updatePOStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
