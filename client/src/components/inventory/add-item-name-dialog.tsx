import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { CheckCircle } from "lucide-react";

const UNIT_OF_MEASUREMENT_OPTIONS = [
  "Tablet",
  "Capsule",
  "Bottle",
  "Vial",
  "Ampoule",
  "Injection",
  "Piece",
  "Pack",
  "Box",
  "Roll",
  "Pair",
  "Kit",
  "ml",
  "Liter",
];

interface InventoryItemName {
  id: number;
  name: string;
  description?: string;
  brandName?: string;
  manufacturer?: string;
  unitOfMeasurement?: string;
  isActive: boolean;
}

interface AddItemNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemNameAdded?: (itemNameId: number, itemName: string) => void;
  editingItemName?: InventoryItemName | null;
}

export default function AddItemNameDialog({ open, onOpenChange, onItemNameAdded, editingItemName }: AddItemNameDialogProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const isEditMode = !!editingItemName;
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    brandName: "",
    manufacturer: "",
    unitOfMeasurement: "Piece",
  });
  const [nameError, setNameError] = useState<string>("");

  // Populate form when editing
  useEffect(() => {
    if (editingItemName && open) {
      setFormData({
        name: editingItemName.name || "",
        description: editingItemName.description || "",
        brandName: editingItemName.brandName || "",
        manufacturer: editingItemName.manufacturer || "",
        unitOfMeasurement: editingItemName.unitOfMeasurement || "Piece",
      });
    } else if (!editingItemName && open) {
      resetForm();
    }
  }, [editingItemName, open]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all item names to check for duplicates
  const { data: allItemNames = [] } = useQuery<InventoryItemName[]>({
    queryKey: ["/api/inventory/item-names"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/item-names");
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
    retry: 3,
  });

  const addItemNameMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/inventory/item-names", data);
      
      // Check if response is ok
      if (!response.ok) {
        let errorMessage = "Failed to add item name";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          const text = await response.text();
          if (text.includes("<!DOCTYPE")) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          } else {
            errorMessage = text || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      const itemNameId = data?.id;
      const itemName = data?.name;
      setSuccessMessage("Item name has been added successfully.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/item-names"] });
      resetForm();
      onOpenChange(false);
      // Notify parent component about the new item name
      if (onItemNameAdded && itemNameId && itemName) {
        onItemNameAdded(itemNameId, itemName);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item name",
        variant: "destructive",
      });
    },
  });

  const updateItemNameMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!editingItemName) throw new Error("No item name to update");
      
      try {
        const response = await apiRequest("PATCH", `/api/inventory/item-names/${editingItemName.id}`, data);
        
        // Check content type to ensure it's JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            throw new Error("Server error: Received HTML instead of JSON. The endpoint may not exist or there's a server configuration issue.");
          }
          throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        return jsonData;
      } catch (error: any) {
        // Handle errors from apiRequest or JSON parsing
        const errorMessage = error.message || String(error);
        
        // Check if error message contains HTML (from throwIfResNotOk)
        if (errorMessage.includes("<!DOCTYPE") || errorMessage.includes("<html") || errorMessage.includes("<!doctype")) {
          // Extract status code if available
          const statusMatch = errorMessage.match(/^(\d+):/);
          const statusCode = statusMatch ? statusMatch[1] : "Unknown";
          throw new Error(`Server error (${statusCode}): The endpoint returned an HTML error page. This usually means the route doesn't exist or there's a server configuration issue. Please check server logs.`);
        }
        
        // Re-throw the original error if it's not HTML-related
        throw error;
      }
    },
    onSuccess: (data: any) => {
      const itemNameId = data?.id;
      const itemName = data?.name;
      setSuccessMessage("Item name has been updated successfully.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/item-names"] });
      resetForm();
      onOpenChange(false);
      // Notify parent component about the updated item name
      if (onItemNameAdded && itemNameId && itemName) {
        onItemNameAdded(itemNameId, itemName);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item name",
        variant: "destructive",
      });
    },
  });

  const deleteItemNameMutation = useMutation({
    mutationFn: async () => {
      if (!editingItemName) throw new Error("No item name to delete");
      
      const response = await apiRequest("DELETE", `/api/inventory/item-names/${editingItemName.id}`);
      
      if (!response.ok) {
        let errorMessage = "Failed to delete item name";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const text = await response.text();
          if (text.includes("<!DOCTYPE")) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          } else {
            errorMessage = text || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage("Item name has been deleted successfully.");
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/item-names"] });
      setShowDeleteDialog(false);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item name",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      brandName: "",
      manufacturer: "",
      unitOfMeasurement: "Piece",
    });
    setNameError("");
  };

  const checkDuplicateName = (name: string): boolean => {
    if (!name.trim()) return false;
    
    const trimmedName = name.trim().toLowerCase();
    // Check if name already exists (excluding current item being edited)
    const existingItem = allItemNames.find(
      (item) => item.name.toLowerCase() === trimmedName && 
      (!isEditMode || item.id !== editingItemName?.id)
    );
    
    return !!existingItem;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setNameError("");
    
    // Basic validation
    if (!formData.name.trim()) {
      setNameError("Item name is required");
      toast({
        title: "Validation Error",
        description: "Please enter an item name.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate name
    if (checkDuplicateName(formData.name)) {
      setNameError("Item name already exists. Please add another item name.");
      toast({
        title: "Validation Error",
        description: "Item name already exists. Please use a different name.",
        variant: "destructive",
      });
      return;
    }

    if (isEditMode) {
      updateItemNameMutation.mutate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        brandName: formData.brandName.trim() || undefined,
        manufacturer: formData.manufacturer.trim() || undefined,
        unitOfMeasurement: formData.unitOfMeasurement || "Piece",
      });
    } else {
      addItemNameMutation.mutate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        brandName: formData.brandName.trim() || undefined,
        manufacturer: formData.manufacturer.trim() || undefined,
        unitOfMeasurement: formData.unitOfMeasurement || "Piece",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate name in real-time when user types
    if (field === "name") {
      if (!value.trim()) {
        setNameError("");
      } else if (checkDuplicateName(value)) {
        setNameError("Item name already exists. Please add another item name.");
      } else {
        setNameError("");
      }
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={onOpenChange}
      >
        <DialogContent 
          className="max-w-md"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click - only close via X button or Cancel
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on Escape key - only close via X button or Cancel
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Item Name" : "Add New Item Name"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the item name details. All fields marked with * are required."
                : "Add a new item name to your inventory system. All fields marked with * are required."
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Paracetamol 500mg"
                className={nameError ? "border-red-500" : ""}
                required
              />
              {nameError && (
                <p className="text-sm text-red-500 mt-1">{nameError}</p>
              )}
            </div>

            <div>
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of the item name"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={formData.brandName}
                onChange={(e) => handleInputChange("brandName", e.target.value)}
                placeholder="e.g., Panadol"
              />
            </div>

            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                placeholder="e.g., GSK"
              />
            </div>

            <div>
              <Label htmlFor="unitOfMeasurement">Unit of Measurement</Label>
              <Select
                value={formData.unitOfMeasurement}
                onValueChange={(value) => handleInputChange("unitOfMeasurement", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit of measurement" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OF_MEASUREMENT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>

          <DialogFooter>
            {isEditMode && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteItemNameMutation.isPending}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={isEditMode ? updateItemNameMutation.isPending : addItemNameMutation.isPending}
            >
              {isEditMode 
                ? (updateItemNameMutation.isPending ? "Updating..." : "Update Item Name")
                : (addItemNameMutation.isPending ? "Adding..." : "Add Item Name")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Item Name Added Successfully</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {successMessage.includes("deleted") 
                ? "Item Name Successfully Deleted" 
                : isEditMode 
                  ? "Item Name Successfully Updated" 
                  : "Item Name Successfully Added"}
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
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Name</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{editingItemName?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemNameMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteItemNameMutation.isPending}
            >
              {deleteItemNameMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
