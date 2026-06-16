import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Plus, Trash2, Check } from "lucide-react";
import SimpleAddItem from "./simple-add-item";
import AddSupplierDialog from "./add-supplier-dialog";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: string;
  unitOfMeasurement: string;
}

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  onPurchaseOrderCreated?: (purchaseOrderId: number) => void;
}

interface POItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export default function PurchaseOrderDialog({ open, onOpenChange, items, onPurchaseOrderCreated }: PurchaseOrderDialogProps) {
  const { toast } = useToast();
  const { currencySymbol } = useCurrency();
  const queryClient = useQueryClient();
  
  // Fetch suppliers from API
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/inventory/suppliers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/suppliers");
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [createdPONumber, setCreatedPONumber] = useState<string | null>(null);
  const [createdPOId, setCreatedPOId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    supplierId: suppliers.length > 0 ? suppliers[0].id : 0, // Default to first supplier if available
    expectedDeliveryDate: "",
    notes: "",
    taxAmount: "0.00",
    discountAmount: "0.00"
  });
  
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [newItem, setNewItem] = useState({
    itemId: "",
    quantity: 1,
    unitPrice: ""
  });

  // Set default supplier when suppliers are loaded
  useEffect(() => {
    if (suppliers.length > 0 && formData.supplierId === 0) {
      setFormData(prev => ({ ...prev, supplierId: suppliers[0].id }));
    }
  }, [suppliers]);

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/inventory/purchase-orders", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      const poNumber = data?.purchaseOrder?.poNumber;
      const poId = data?.purchaseOrder?.id;
      setCreatedPONumber(poNumber || null);
      setCreatedPOId(poId || null);
      setSuccessMessage(
        poNumber
          ? `Purchase order ${poNumber} created successfully`
          : "Purchase order created successfully",
      );
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: suppliers.length > 0 ? suppliers[0].id : 0,
      expectedDeliveryDate: "",
      notes: "",
      taxAmount: "0.00",
      discountAmount: "0.00"
    });
    setPOItems([]);
    setNewItem({
      itemId: "",
      quantity: 1,
      unitPrice: ""
    });
    setCreatedPOId(null);
    setCreatedPONumber(null);
  };

  const addItem = () => {
    console.log("Add item called with:", newItem);
    console.log("Current poItems before add:", poItems);
    
    if (!newItem.itemId || !newItem.unitPrice) {
      toast({
        title: "Error",
        description: "Please select an item and enter unit price",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = items.find(item => item.id === parseInt(newItem.itemId));
    if (!selectedItem) {
      console.log("Selected item not found for ID:", newItem.itemId);
      return;
    }

    const totalPrice = (newItem.quantity * parseFloat(newItem.unitPrice)).toFixed(2);

    const poItem: POItem = {
      itemId: parseInt(newItem.itemId),
      itemName: selectedItem.name,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      totalPrice
    };

    console.log("Adding poItem:", poItem);
    const newPOItems = [...poItems, poItem];
    setPOItems(newPOItems);
    console.log("New poItems array:", newPOItems);
    
    setNewItem({
      itemId: "",
      quantity: 1,
      unitPrice: ""
    });
  };

  const removeItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    const subtotal = poItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const tax = parseFloat(formData.taxAmount);
    const discount = parseFloat(formData.discountAmount);
    return (subtotal + tax - discount).toFixed(2);
  };

  const handleSubmit = () => {
    console.log("Handle submit called, poItems.length:", poItems.length);
    console.log("poItems:", poItems);
    
    if (poItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = calculateTotalAmount();

    createPOMutation.mutate({
      ...formData,
      totalAmount,
      items: poItems
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-4 flex flex-col">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle>Create New Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2" style={{ fontSize: '12px' }}>
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier" style={{ fontSize: '12px', marginBottom: '4px' }}>Supplier</Label>
              <div className="flex space-x-2">
                <Select 
                  value={formData.supplierId > 0 ? formData.supplierId.toString() : ""} 
                  onValueChange={(value) => setFormData({...formData, supplierId: parseInt(value)})}
                  disabled={suppliersLoading || suppliers.length === 0}
                  className="flex-1"
                >
                  <SelectTrigger className="h-9" style={{ fontSize: '12px' }}>
                    <SelectValue placeholder={suppliersLoading ? "Loading suppliers..." : suppliers.length === 0 ? "No suppliers available" : "Select supplier"} />
                  </SelectTrigger>
                  <SelectContent style={{ fontSize: '12px' }}>
                    {suppliersLoading ? (
                      <SelectItem value="loading" disabled>Loading suppliers...</SelectItem>
                    ) : suppliers.length === 0 ? (
                      <SelectItem value="no-suppliers" disabled>No suppliers available. Please add suppliers first.</SelectItem>
                    ) : (
                      suppliers.filter(s => s.isActive).map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSupplierDialog(true)}
                  className="px-3 h-9"
                  title="Add new supplier"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="deliveryDate" style={{ fontSize: '12px', marginBottom: '4px' }}>Expected Delivery Date</Label>
              <Input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({...formData, expectedDeliveryDate: e.target.value})}
                className="h-9"
                style={{ fontSize: '12px' }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Quick Add Item */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="mb-3 font-medium text-gray-900 dark:text-gray-100" style={{ fontSize: '12px' }}>Quick Add Item</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <Label htmlFor="item" style={{ fontSize: '12px', marginBottom: '4px' }}>Item</Label>
                <Select value={newItem.itemId} onValueChange={(value) => setNewItem({...newItem, itemId: value})}>
                  <SelectTrigger className="bg-white dark:bg-gray-900 h-9" style={{ fontSize: '12px' }}>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent style={{ fontSize: '12px' }}>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quantity" style={{ fontSize: '12px', marginBottom: '4px' }}>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                  className="bg-white dark:bg-gray-900 h-9"
                  style={{ fontSize: '12px' }}
                />
              </div>
              
              <div>
                <Label htmlFor="unitPrice" style={{ fontSize: '12px', marginBottom: '4px' }}>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value})}
                  className="bg-white dark:bg-gray-900 h-9"
                  style={{ fontSize: '12px' }}
                />
              </div>
              
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  console.log("DIRECT BUTTON CLICKED!");
                  
                  if (!newItem.itemId || !newItem.unitPrice) {
                    console.log("Missing required fields");
                    toast({
                      title: "Error",
                      description: "Please select an item and enter unit price",
                      variant: "destructive",
                    });
                    return;
                  }

                  const selectedItem = items.find(item => item.id === parseInt(newItem.itemId));
                  if (!selectedItem) {
                    console.log("Selected item not found");
                    return;
                  }

                  const totalPrice = (newItem.quantity * parseFloat(newItem.unitPrice)).toFixed(2);
                  const itemToAdd = {
                    itemId: parseInt(newItem.itemId),
                    itemName: selectedItem.name,
                    quantity: newItem.quantity,
                    unitPrice: newItem.unitPrice,
                    totalPrice
                  };

                  console.log("Adding item directly:", itemToAdd);
                  setPOItems(prev => [...prev, itemToAdd]);
                  
                  // Reset form
                  setNewItem({ itemId: "", quantity: 1, unitPrice: "" });
                }}
                className="bg-green-600 hover:bg-green-700 text-white h-9"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Item NOW
              </Button>
            </div>
          </div>

          {/* Items Table */}
          {poItems.length > 0 && (
            <div>
              <h3 className="font-medium mb-2" style={{ fontSize: '12px' }}>Purchase Order Items</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ fontSize: '12px', padding: '8px' }}>Item</TableHead>
                      <TableHead style={{ fontSize: '12px', padding: '8px' }}>Quantity</TableHead>
                      <TableHead style={{ fontSize: '12px', padding: '8px' }}>Unit Price</TableHead>
                      <TableHead style={{ fontSize: '12px', padding: '8px' }}>Total</TableHead>
                      <TableHead style={{ fontSize: '12px', padding: '8px' }}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell style={{ fontSize: '12px', padding: '8px' }}>{item.itemName}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px' }}>{item.quantity}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px' }}>{currencySymbol}{item.unitPrice}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px' }}>{currencySymbol}{item.totalPrice}</TableCell>
                        <TableCell style={{ fontSize: '12px', padding: '8px' }}>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="h-7 w-7 p-0">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Financial Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label style={{ fontSize: '12px', marginBottom: '4px' }}>Tax Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.taxAmount}
                onChange={(e) => setFormData({...formData, taxAmount: e.target.value})}
                className="h-9"
                style={{ fontSize: '12px' }}
              />
            </div>
            <div>
              <Label style={{ fontSize: '12px', marginBottom: '4px' }}>Discount Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.discountAmount}
                onChange={(e) => setFormData({...formData, discountAmount: e.target.value})}
                className="h-9"
                style={{ fontSize: '12px' }}
              />
            </div>
            <div>
              <Label style={{ fontSize: '12px', marginBottom: '4px' }}>Total Amount</Label>
              <Input value={`${currencySymbol}${calculateTotalAmount()}`} disabled className="h-9" style={{ fontSize: '12px' }} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label style={{ fontSize: '12px', marginBottom: '4px' }}>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes or special instructions"
              className="min-h-[80px]"
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 flex-shrink-0 border-t mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9" style={{ fontSize: '12px', padding: '6px 16px' }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createPOMutation.isPending} className="h-9" style={{ fontSize: '12px', padding: '6px 16px' }}>
            {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </DialogContent>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 dark:text-green-400">Success</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Check className="h-6 w-6" />
            </span>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {createdPONumber
                ? `Purchase order ${createdPONumber} created successfully`
                : "Purchase order created successfully"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
                const poId = createdPOId;
                setCreatedPONumber(null);
                setCreatedPOId(null);
                // Close the Purchase Order dialog
                onOpenChange(false);
                // Call callback if provided (to open Goods Receipt dialog)
                if (onPurchaseOrderCreated && poId) {
                  setTimeout(() => {
                    onPurchaseOrderCreated(poId);
                  }, 100);
                }
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <AddSupplierDialog 
        open={showSupplierDialog} 
        onOpenChange={setShowSupplierDialog}
        onSupplierAdded={(supplierId) => {
          // Auto-select the newly added supplier
          setFormData(prev => ({ ...prev, supplierId }));
          // Refresh suppliers list
          queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] });
        }}
      />
    </Dialog>
  );
}