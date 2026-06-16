import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  unitOfMeasurement: string;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

// Movement Type Master List - Source of Truth
const MOVEMENT_TYPES = {
  purchase: { label: "Purchase (Stock In)", direction: "IN" as const },
  sale: { label: "Sale (Stock Out)", direction: "OUT" as const },
  return: { label: "Return (Stock In)", direction: "IN" as const },
  waste: { label: "Waste / Expired", direction: "OUT" as const },
  damaged: { label: "Damaged", direction: "OUT" as const },
  adjustment_in: { label: "Manual Adjustment (In)", direction: "IN" as const },
  adjustment_out: { label: "Manual Adjustment (Out)", direction: "OUT" as const },
  transfer_in: { label: "Transfer In", direction: "IN" as const },
  transfer_out: { label: "Transfer Out", direction: "OUT" as const },
} as const;

// Reason Master List - Dependent on Movement Type
const REASONS = {
  purchase: [
    { value: "new_stock", label: "New Stock Received" },
  ],
  sale: [
    { value: "patient_sale", label: "Sold to Patient" },
    { value: "prescription_dispensed", label: "Prescription Dispensed" },
  ],
  return: [
    { value: "returned_by_patient", label: "Returned by Patient" },
    { value: "returned_from_location", label: "Returned from Location" },
  ],
  waste: [
    { value: "expired_items", label: "Expired Items" },
  ],
  damaged: [
    { value: "damaged_items", label: "Damaged Items" },
  ],
  adjustment_in: [
    { value: "stock_correction", label: "Stock Count Correction" },
    { value: "other", label: "Other" },
  ],
  adjustment_out: [
    { value: "stock_correction", label: "Stock Count Correction" },
    { value: "other", label: "Other" },
  ],
  transfer_in: [
    { value: "transferred_from_location", label: "Transferred from Another Location" },
  ],
  transfer_out: [
    { value: "transferred_to_location", label: "Transferred to Another Location" },
  ],
} as const;

export default function StockAdjustmentDialog({ open, onOpenChange, item }: StockAdjustmentDialogProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    movementType: "",
    quantity: "",
    reason: "",
    notes: "",
  });
  const [quantityError, setQuantityError] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Clear reason when movement type changes
  useEffect(() => {
    if (formData.movementType) {
      setFormData(prev => ({ ...prev, reason: "" }));
    }
  }, [formData.movementType]);

  const adjustStockMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!item) throw new Error("No item selected");
      
      await apiRequest("POST", "/api/inventory/stock-movements", {
        itemId: item.id,
        movementType: data.movementType,
        quantity: parseInt(String(data.quantity), 10),
        reason: data.reason,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      setSuccessMessage("Stock adjustment has been recorded successfully.");
      setShowSuccessModal(true);
      setShowConfirmModal(false);
      
      // Invalidate all inventory-related queries for auto-refresh
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/value"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-adjustments"] });
      
      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive",
      });
      setShowConfirmModal(false);
    },
  });

  const resetForm = () => {
    setFormData({
      movementType: "",
      quantity: "",
      reason: "",
      notes: "",
    });
    setQuantityError("");
  };

  const getMovementDirection = (): "IN" | "OUT" | null => {
    if (!formData.movementType) return null;
    return MOVEMENT_TYPES[formData.movementType as keyof typeof MOVEMENT_TYPES]?.direction || null;
  };

  const getAvailableReasons = () => {
    if (!formData.movementType) return [];
    return REASONS[formData.movementType as keyof typeof REASONS] || [];
  };

  const validateForm = (): { valid: boolean; error?: string } => {
    // Check required fields
    if (!formData.movementType) {
      return { valid: false, error: "Please select a movement type." };
    }

    if (!formData.reason) {
      return { valid: false, error: "Please select a reason." };
    }

    if (!formData.quantity || formData.quantity.trim() === "") {
      return { valid: false, error: "Please enter a quantity." };
    }

    const quantity = parseFloat(formData.quantity);
    
    // Quantity must be a whole number (integer)
    if (isNaN(quantity) || !Number.isInteger(quantity)) {
      return { valid: false, error: "Quantity must be a whole number (e.g. 5, 10)." };
    }
    
    // Quantity must be greater than 0
    if (quantity <= 0) {
      return { valid: false, error: "Quantity must be greater than 0." };
    }

    // For OUT movements, check if we have enough stock
    const direction = getMovementDirection();
    if (direction === "OUT" && item) {
      if (quantity > item.currentStock) {
        return { 
          valid: false, 
          error: `Cannot remove ${quantity} units. Only ${item.currentStock} units available.` 
        };
      }
    }

    return { valid: true };
  };

  const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setQuantityError("");
    
    const validation = validateForm();
    if (!validation.valid) {
      const isQuantityError =
        validation.error?.includes("Quantity must be a whole number") ||
        validation.error?.includes("Quantity must be greater than 0") ||
        validation.error?.includes("Cannot remove");
      if (isQuantityError) {
        setQuantityError(validation.error || "Invalid quantity.");
      } else {
        toast({
          title: "Validation Error",
          description: validation.error,
          variant: "destructive",
        });
      }
      return;
    }

    // Show confirmation modal for OUT movements
    const direction = getMovementDirection();
    if (direction === "OUT") {
      setShowConfirmModal(true);
    } else {
      adjustStockMutation.mutate(formData);
    }
  };

  const handleConfirmSubmit = () => {
    adjustStockMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === "quantity") setQuantityError("");
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getNewStockLevel = (): number => {
    if (!item || !formData.quantity || !formData.movementType) return item?.currentStock || 0;
    
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity)) return item.currentStock;
    
    const direction = getMovementDirection();
    if (direction === "IN") {
      return item.currentStock + quantity;
    } else if (direction === "OUT") {
      return Math.max(0, item.currentStock - quantity);
    }
    return item.currentStock;
  };

  const isFormValid = () => {
    return validateForm().valid;
  };

  const direction = getMovementDirection();
  const availableReasons = getAvailableReasons();
  const newStockLevel = getNewStockLevel();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
            <DialogDescription>
              {item && (
                <>
                  Update stock for <strong>{item.name}</strong> (SKU: {item.sku})
                  <br />
                  Current Stock: <strong>{item.currentStock} {item.unitOfMeasurement}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="movementType">Movement Type *</Label>
              <Select 
                value={formData.movementType} 
                onValueChange={(value) => handleInputChange("movementType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOVEMENT_TYPES).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="quantity">Quantity *</Label>
                {direction && (
                  <Badge variant={direction === "IN" ? "default" : "destructive"} className="text-xs">
                    {direction === "IN" ? (
                      <><ArrowUp className="h-3 w-3 mr-1" />Stock In (+)</>
                    ) : (
                      <><ArrowDown className="h-3 w-3 mr-1" />Stock Out (−)</>
                    )}
                  </Badge>
                )}
              </div>
              <Input
                id="quantity"
                type="number"
                step="1"
                min="1"
                value={formData.quantity}
                onChange={(e) => {
                  setQuantityError("");
                  handleInputChange("quantity", e.target.value);
                }}
                placeholder="Enter whole number (e.g. 5, 10)"
                required
              />
              {quantityError && (
                <p className="text-sm text-destructive mt-1" role="alert">
                  {quantityError}
                </p>
              )}
              {!quantityError && direction === "OUT" && item && formData.quantity && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {item.currentStock} {item.unitOfMeasurement}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Select 
                value={formData.reason} 
                onValueChange={(value) => handleInputChange("reason", value)}
                disabled={!formData.movementType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.movementType ? "Select reason" : "Select movement type first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.movementType && (
                <p className="text-xs text-muted-foreground mt-1">
                  Please select a movement type first
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>

            {formData.movementType && formData.quantity && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                <p className="text-sm font-medium mb-1">
                  <strong>New Stock Level:</strong> {newStockLevel.toFixed(2)} {item?.unitOfMeasurement}
                </p>
                {direction === "OUT" ? (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ArrowDown className="h-3 w-3" />
                    Stock will decrease by {formData.quantity} {item?.unitOfMeasurement}
                  </p>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    Stock will increase by {formData.quantity} {item?.unitOfMeasurement}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isFormValid() || adjustStockMutation.isPending}
              >
                {adjustStockMutation.isPending ? "Adjusting..." : "Adjust Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Stock Out */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Stock Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <strong>REMOVE {formData.quantity} {item?.unitOfMeasurement}</strong> from stock.
              <br /><br />
              <strong>Current Stock:</strong> {item?.currentStock} {item?.unitOfMeasurement}
              <br />
              <strong>New Stock:</strong> {newStockLevel.toFixed(2)} {item?.unitOfMeasurement}
              <br /><br />
              <span className="text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 flex items-center gap-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Success
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{successMessage}</p>
            {item && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Updated stock: <strong>{item.currentStock} {item.unitOfMeasurement}</strong>
              </p>
            )}
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
    </>
  );
}
