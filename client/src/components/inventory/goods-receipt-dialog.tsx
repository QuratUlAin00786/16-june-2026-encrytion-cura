import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Plus, Trash2, Check, ChevronsUpDown, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: string;
  unitOfMeasurement: string;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierName: string;
  status: string;
  totalAmount: string;
  expectedDeliveryDate?: string;
}

interface PurchaseOrderItem {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
}

interface PurchaseOrderDetail {
  id: number;
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  totalAmount: string;
  taxAmount: string;
  discountAmount: string;
  notes?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  emailSent: boolean;
  emailSentAt?: string | null;
  itemsOrdered: Array<{
    id: number;
    itemId: number;
    itemName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
}
interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  defaultPurchaseOrderId?: number;
  onReceiptCreated?: (receiptId: number) => void;
}

interface ReceiptItem {
  itemId: number;
  itemName: string;
  quantityReceived: number;
  unitPrice: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
}

// Validation schema for goods receipt form
const goodsReceiptSchema = z.object({
  purchaseOrderId: z.number().min(1, "Purchase order is required"),
  receivedDate: z.string().min(1, "Received date is required"),
  notes: z.string().optional(),
});

// Validation schema for adding new items
const addItemSchema = z.object({
  itemId: z.string().min(1, "Item selection is required"),
  quantityReceived: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  manufacturingDate: z.string().min(1, "Manufacturing date is required"),
});

type GoodsReceiptFormData = z.infer<typeof goodsReceiptSchema>;
type AddItemFormData = z.infer<typeof addItemSchema>;

export default function GoodsReceiptDialog({ open, onOpenChange, items, defaultPurchaseOrderId, onReceiptCreated }: GoodsReceiptDialogProps) {
  const { currencySymbol } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [purchaseOrderOpen, setPurchaseOrderOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddExtraItems, setShowAddExtraItems] = useState(false);
  const [showDuplicateErrorModal, setShowDuplicateErrorModal] = useState(false);
  const [duplicateErrorMessage, setDuplicateErrorMessage] = useState("");

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading: purchaseOrdersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/inventory/purchase-orders"],
    enabled: true,
  });
  
  // Main form for receipt details
  const form = useForm<GoodsReceiptFormData>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      purchaseOrderId: defaultPurchaseOrderId || 0,
      receivedDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });
  
  // Form for adding new items
  const addItemForm = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      itemId: "",
      quantityReceived: 1,
      unitPrice: "",
      batchNumber: "",
      expiryDate: "",
      manufacturingDate: ""
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/inventory/goods-receipts", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create goods receipt" }));
        throw new Error(errorData.message || errorData.error || "Failed to create goods receipt");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/goods-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/value"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      resetForm();
      // Close the Create Goods Receipt dialog on success
      onOpenChange(false);
      // Call callback to show PDF popup
      const receiptId = data?.id || data?.items?.[0]?.id;
      if (receiptId && onReceiptCreated) {
        setTimeout(() => {
          onReceiptCreated(receiptId);
        }, 300);
      }
    },
    onError: (error: any) => {
      // Parse error message to extract user-friendly message
      let errorMessage = error.message || "Failed to create goods receipt";
      
      // Try to parse JSON from error message if it contains JSON
      try {
        // Check if error message contains JSON (e.g., "400: {...}")
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          errorMessage = errorData.message || errorData.error || errorMessage;
        }
      } catch {
        // If parsing fails, use the original message
      }
      
      // Check if it's a duplicate purchase order error
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("purchase order")) {
        // Show user-friendly message
        setDuplicateErrorMessage("This Purchase Order has already been received. Please select a different Purchase Order to create a new Goods Receipt.");
        setShowDuplicateErrorModal(true);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const resetForm = () => {
    form.reset({
      purchaseOrderId: defaultPurchaseOrderId || 0,
      receivedDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    addItemForm.reset();
    setReceiptItems([]);
  };

  const addItem = (data: AddItemFormData) => {
    // Validate all fields are filled
    if (!data.itemId || data.itemId.trim() === "") {
      addItemForm.setError("itemId", {
        type: "manual",
        message: "Item selection is required"
      });
      return;
    }
    if (!data.quantityReceived || data.quantityReceived < 1) {
      addItemForm.setError("quantityReceived", {
        type: "manual",
        message: "Quantity must be at least 1"
      });
      return;
    }
    if (!data.unitPrice || data.unitPrice.trim() === "") {
      addItemForm.setError("unitPrice", {
        type: "manual",
        message: "Unit price is required"
      });
      return;
    }
    if (!data.batchNumber || data.batchNumber.trim() === "") {
      addItemForm.setError("batchNumber", {
        type: "manual",
        message: "Batch number is required"
      });
      return;
    }
    if (!data.expiryDate || data.expiryDate.trim() === "") {
      addItemForm.setError("expiryDate", {
        type: "manual",
        message: "Expiry date is required"
      });
      return;
    }
    if (!data.manufacturingDate || data.manufacturingDate.trim() === "") {
      addItemForm.setError("manufacturingDate", {
        type: "manual",
        message: "Manufacturing date is required"
      });
      return;
    }

    const selectedItem = items.find(item => item.id === parseInt(data.itemId));
    if (!selectedItem) {
      addItemForm.setError("itemId", {
        type: "manual",
        message: "Selected item not found"
      });
      return;
    }

    const receiptItem: ReceiptItem = {
      itemId: parseInt(data.itemId),
      itemName: selectedItem.name,
      quantityReceived: data.quantityReceived,
      unitPrice: data.unitPrice,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      manufacturingDate: data.manufacturingDate
    };

    setReceiptItems([...receiptItems, receiptItem]);
    addItemForm.reset();
  };

  const removeItem = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    return receiptItems.reduce((sum, item) => sum + (item.quantityReceived * parseFloat(item.unitPrice)), 0).toFixed(2);
  };

  const purchaseOrderId = form.watch("purchaseOrderId");
  const selectedPO = purchaseOrders.find((po) => po.id === purchaseOrderId);

  const {
    data: purchaseOrderItems = [],
    isFetching: purchaseOrderItemsLoading,
  } = useQuery<PurchaseOrderItem[]>({
    queryKey: ["inventory", "purchase-order-items", purchaseOrderId],
    enabled: Boolean(purchaseOrderId),
    queryFn: async ({ queryKey }) => {
      const [, , id] = queryKey;
      const response = await apiRequest(
        "GET",
        `/api/inventory/purchase-orders/${id}/items`,
      );
      return response.json();
    },
  });

  const {
    data: purchaseOrderDetail,
    isFetching: purchaseOrderDetailLoading,
  } = useQuery<PurchaseOrderDetail | null>({
    queryKey: ["/api/inventory/purchase-orders", purchaseOrderId],
    enabled: Boolean(purchaseOrderId),
    queryFn: async ({ queryKey }) => {
      const [, id] = queryKey;
      const response = await apiRequest(
        "GET",
        `/api/inventory/purchase-orders/${id}`,
      );
      return response.json();
    },
    retry: 3,
    initialData: null,
  });

  const computedPurchaseOrderMeta = purchaseOrderDetail || {
    id: selectedPO?.id || 0,
    poNumber: selectedPO?.poNumber || "PO -",
    orderDate: selectedPO?.orderDate || new Date().toISOString(),
    expectedDeliveryDate: selectedPO?.expectedDeliveryDate || null,
    status: selectedPO?.status || "draft",
    totalAmount: selectedPO?.totalAmount || "0.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
    notes: selectedPO?.notes || "",
    supplierName: selectedPO?.supplierName || "",
    supplierEmail: selectedPO?.supplierEmail || "",
    createdAt: selectedPO?.orderDate || new Date().toISOString(),
    updatedAt: selectedPO?.orderDate || new Date().toISOString(),
    emailSent: false,
    emailSentAt: null,
    itemsOrdered: [],
  };

  const displayedPurchaseOrderItems =
    purchaseOrderDetail?.itemsOrdered.length
      ? purchaseOrderDetail.itemsOrdered
      : purchaseOrderItems.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (item.quantity * parseFloat(item.unitPrice || "0")).toFixed(
            2,
          ),
        }));

  const { setValue, getValues } = form;
  useEffect(() => {
    if (!open) return;
    if (!purchaseOrders.length) return;
    const currentId = getValues("purchaseOrderId");
    
    // If defaultPurchaseOrderId is provided, use it
    if (defaultPurchaseOrderId && purchaseOrders.some((po) => po.id === defaultPurchaseOrderId)) {
      if (currentId !== defaultPurchaseOrderId) {
        setValue("purchaseOrderId", defaultPurchaseOrderId);
        setReceiptItems([]);
      }
      return;
    }
    
    // Otherwise, check if current selection is valid
    const hasSelected = purchaseOrders.some((po) => po.id === currentId);
    if (!hasSelected) {
      setValue("purchaseOrderId", purchaseOrders[0].id);
      setReceiptItems([]);
    }
  }, [open, purchaseOrders, getValues, setValue, setReceiptItems, defaultPurchaseOrderId]);

  useEffect(() => {
    if (!purchaseOrderItems.length) return;
    if (receiptItems.length > 0) return;
    const newItems = purchaseOrderItems.map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      quantityReceived: item.quantity,
      unitPrice: item.unitPrice,
      batchNumber: "",
      expiryDate: "",
      manufacturingDate: "",
    }));
    if (newItems.length) {
      setReceiptItems(newItems);
    }
  }, [purchaseOrderItems, receiptItems.length]);

  const handleSubmit = (data: GoodsReceiptFormData) => {
    // Validate purchase order is selected
    if (!data.purchaseOrderId || data.purchaseOrderId === 0) {
      form.setError("purchaseOrderId", {
        type: "manual",
        message: "Purchase order is required"
      });
      return;
    }

    // Validate received date
    if (!data.receivedDate || data.receivedDate.trim() === "") {
      form.setError("receivedDate", {
        type: "manual",
        message: "Received date is required"
      });
      return;
    }

    // Removed validation: "Please add at least one item to the receipt"
    // Allow creating receipt even without items

    // Separate PO items from manually added items
    // PO items are those that were auto-populated (have empty batch numbers initially)
    // Manually added items are those added via "Add extra items" form
    const poItemIds = new Set((purchaseOrderItems || []).map(item => item.itemId));
    const manuallyAddedItems = receiptItems.filter(item => !poItemIds.has(item.itemId));
    
    // Validate all manually added items have required fields
    const invalidItems = manuallyAddedItems.filter(item => 
      !item.itemId || 
      !item.quantityReceived || 
      item.quantityReceived < 1 ||
      !item.batchNumber || 
      item.batchNumber.trim() === "" ||
      !item.expiryDate || 
      item.expiryDate.trim() === "" ||
      !item.manufacturingDate || 
      item.manufacturingDate.trim() === ""
    );

    if (invalidItems.length > 0) {
      form.setError("root", {
        type: "manual",
        message: "Please ensure all manually added items have item, quantity, batch number, expiry date, and manufacturing date filled"
      });
      return;
    }

    // Map receipt items to backend expected format
    // Use receiptItems which includes both PO items and manually added items
    const mappedItems = receiptItems.map(item => ({
      itemId: item.itemId,
      quantityReceived: item.quantityReceived,
      batchNumber: item.batchNumber && item.batchNumber.trim() !== "" ? item.batchNumber : undefined,
      expiryDate: item.expiryDate && item.expiryDate.trim() !== "" ? item.expiryDate : undefined
    }));

    createReceiptMutation.mutate({
      purchaseOrderId: data.purchaseOrderId,
      receivedDate: data.receivedDate,
      notes: data.notes,
      items: mappedItems
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6 flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Create Goods Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchaseOrderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Order *</FormLabel>
                      <FormControl>
                        <Popover open={purchaseOrderOpen} onOpenChange={setPurchaseOrderOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={purchaseOrderOpen}
                              className="w-full justify-between text-left h-10"
                              data-testid="select-purchase-order"
                            >
                              <span className="truncate">
                                {selectedPO ? selectedPO.poNumber : "Select purchase order..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <div className="max-h-[300px] overflow-y-auto">
                              <Command>
                                <CommandInput placeholder="Search purchase orders..." />
                                <CommandEmpty>No purchase order found.</CommandEmpty>
                                <CommandGroup>
                                  {purchaseOrders.map((po) => (
                                    <CommandItem
                                      key={po.id}
                                      value={po.poNumber}
                                      onSelect={() => {
                                        field.onChange(po.id);
                                        setPurchaseOrderOpen(false);
                                        setReceiptItems([]);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === po.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{po.poNumber}</span>
                                        <span className="text-gray-500 truncate text-sm">
                                          {po.supplierName} — {currencySymbol}{po.totalAmount}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receivedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Received Date *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-received-date" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="textarea-notes"
                        placeholder="Additional notes about this goods receipt..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {selectedPO && (
            <div className="space-y-4">
              <Card className="border bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Purchase Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">PO Number</p>
                      <p className="font-semibold">{computedPurchaseOrderMeta.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Supplier</p>
                      <p className="font-medium">{computedPurchaseOrderMeta.supplierName}</p>
                      {computedPurchaseOrderMeta.supplierEmail && (
                        <p className="text-sm text-gray-500">{computedPurchaseOrderMeta.supplierEmail}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Order Date</p>
                      <p className="font-medium">
                        {format(new Date(computedPurchaseOrderMeta.orderDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Status</p>
                      <Badge variant="secondary" className="capitalize">
                        {computedPurchaseOrderMeta.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 pt-2 border-t">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                      <p className="text-lg font-semibold">
                        {currencySymbol}{parseFloat(computedPurchaseOrderMeta.totalAmount || "0").toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Items Count</p>
                      <p className="text-lg font-semibold">
                        {purchaseOrderItems.length || receiptItems.length} items
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Receipt Value</p>
                      <p className="text-lg font-semibold">
                        {currencySymbol}{calculateTotalAmount()}
                      </p>
                    </div>
                  </div>

                  {computedPurchaseOrderMeta.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-500 mb-1">PO Notes</p>
                      <p className="text-sm text-gray-700">{computedPurchaseOrderMeta.notes}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items in Purchase Order</p>
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedPurchaseOrderItems.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-4 text-gray-500"
                              >
                                {purchaseOrderDetailLoading || purchaseOrderItemsLoading
                                  ? "Loading purchase order items..."
                                  : "No items were found for this purchase order."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            displayedPurchaseOrderItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  {currencySymbol}{parseFloat(item.unitPrice || "0").toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {currencySymbol}{parseFloat(item.totalPrice || "0").toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!showAddExtraItems ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddExtraItems(true)}
                className="h-10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Extra Items
              </Button>
            </div>
          ) : (
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Add Extra Items</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddExtraItems(false);
                      addItemForm.reset();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Add items not included in the purchase order</p>
              </CardHeader>
              <CardContent>
                <Form {...addItemForm}>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <FormField
                        control={addItemForm.control}
                        name="itemId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item *</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-item" className="h-10">
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addItemForm.control}
                        name="quantityReceived"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                data-testid="input-quantity"
                                className="h-10"
                                placeholder="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addItemForm.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                data-testid="input-unit-price"
                                className="h-10"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addItemForm.control}
                        name="batchNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch Number *</FormLabel>
                            <FormControl>
                              <Input data-testid="input-batch-number" className="h-10" placeholder="Batch #" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={addItemForm.control}
                        name="expiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date *</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-expiry-date" className="h-10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addItemForm.control}
                        name="manufacturingDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturing Date *</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                data-testid="input-manufacturing-date"
                                className="h-10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          className="w-full h-10"
                          onClick={addItemForm.handleSubmit(addItem)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>
          )}

          {form.formState.errors.root && (
            <div className="text-red-600 font-medium text-sm" data-testid="error-form-root">
              {form.formState.errors.root.message}
            </div>
          )}
          {form.formState.errors.purchaseOrderId && (
            <div className="text-red-600 font-medium text-sm">
              {form.formState.errors.purchaseOrderId.message}
            </div>
          )}
          {form.formState.errors.receivedDate && (
            <div className="text-red-600 font-medium text-sm">
              {form.formState.errors.receivedDate.message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={resetForm} className="h-10">
            Reset
          </Button>
          <Button
            onClick={() => form.handleSubmit(handleSubmit)()}
            disabled={createReceiptMutation.isPending}
            className="h-10"
          >
            {createReceiptMutation.isPending ? "Processing..." : "Create Goods Receipt"}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </span>
            <p className="text-lg font-semibold text-gray-900">{successMessage}</p>
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

      {/* Duplicate Purchase Order Error Modal */}
      <Dialog open={showDuplicateErrorModal} onOpenChange={setShowDuplicateErrorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Purchase Order Already Received
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <p className="text-base font-medium text-gray-700 leading-relaxed">
              {duplicateErrorMessage || "This Purchase Order has already been received. Please select a different Purchase Order to create a new Goods Receipt."}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              You can view the existing Goods Receipt in the list above.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowDuplicateErrorModal(false);
                setDuplicateErrorMessage("");
              }}
              className="min-w-[80px]"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}