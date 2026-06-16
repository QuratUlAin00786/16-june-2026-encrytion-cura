import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { apiRequest } from "@/lib/queryClient";
import AddCategoryDialog from "./add-category-dialog";

interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
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

interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  brandName?: string;
  manufacturer?: string;
  categoryId: number;
  categoryName?: string;
  unitOfMeasurement: string;
  purchasePrice: string;
  salePrice: string;
  mrp?: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderPoint: number;
  prescriptionRequired: boolean;
  isActive: boolean;
  expiryDate?: string;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
}

// Predefined unit of measurement options
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

export default function AddItemDialog({ open, onOpenChange, itemToEdit = null }: AddItemDialogProps) {
  const { currencySymbol } = useCurrency();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [unitOfMeasurementOpen, setUnitOfMeasurementOpen] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    sku?: string;
    categoryId?: string;
  }>({});
  const [formData, setFormData] = useState({
    itemNameId: "",
    name: "",
    description: "",
    sku: "",
    barcode: "",
    genericName: "",
    brandName: "",
    manufacturer: "",
    categoryId: "",
    unitOfMeasurement: "",
    packSize: 1,
    purchasePrice: "",
    salePrice: "",
    mrp: "",
    taxRate: "20.00",
    currentStock: 0,
    minimumStock: 0,
    maximumStock: 0,
    reorderPoint: 0,
    prescriptionRequired: false,
    storageConditions: "",
    dosageInstructions: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<InventoryCategory[]>({
    queryKey: ["/api/inventory/categories"],
  });

  const { data: itemNames = [] } = useQuery<InventoryItemName[]>({
    queryKey: ["/api/inventory/item-names"],
    enabled: open,
  });

  // Fetch existing items to check for unique SKU and Barcode
  const { data: existingItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
    enabled: open && !itemToEdit, // Only fetch when adding new item
  });

  const [itemNameOpen, setItemNameOpen] = useState(false);

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure numeric fields have proper values, keep prices as strings for Zod validation
      const itemData = {
        ...data,
        categoryId: data.categoryId && data.categoryId !== "" ? parseInt(data.categoryId) : null,
        packSize: data.packSize && data.packSize !== "" ? parseInt(data.packSize) : 1,
        purchasePrice: data.purchasePrice && data.purchasePrice !== "" ? data.purchasePrice : "0.00",
        salePrice: data.salePrice && data.salePrice !== "" ? data.salePrice : "0.00",
        mrp: data.mrp && data.mrp !== "" ? data.mrp : "0.00",
        taxRate: data.taxRate && data.taxRate !== "" ? data.taxRate : "20.00",
        currentStock: data.currentStock && data.currentStock !== "" ? parseInt(data.currentStock) : 0,
        minimumStock: data.minimumStock && data.minimumStock !== "" ? parseInt(data.minimumStock) : 10,
        maximumStock: data.maximumStock && data.maximumStock !== "" ? parseInt(data.maximumStock) : 1000,
        reorderPoint: data.reorderPoint && data.reorderPoint !== "" ? parseInt(data.reorderPoint) : 20,
      };
      
      await apiRequest("POST", "/api/inventory/items", itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/value"] });
      resetForm();
      // Show success modal without closing the dialog
      setSuccessMessage("Item successfully added to inventory");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add inventory item",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!itemToEdit) return;
      
      // Ensure numeric fields have proper values, keep prices as strings for Zod validation
      const itemData = {
        ...data,
        categoryId: data.categoryId && data.categoryId !== "" ? parseInt(data.categoryId) : null,
        packSize: data.packSize && data.packSize !== "" ? parseInt(data.packSize) : 1,
        purchasePrice: data.purchasePrice && data.purchasePrice !== "" ? data.purchasePrice : "0.00",
        salePrice: data.salePrice && data.salePrice !== "" ? data.salePrice : "0.00",
        mrp: data.mrp && data.mrp !== "" ? data.mrp : "0.00",
        taxRate: data.taxRate && data.taxRate !== "" ? data.taxRate : "20.00",
        currentStock: data.currentStock && data.currentStock !== "" ? parseInt(data.currentStock) : 0,
        minimumStock: data.minimumStock && data.minimumStock !== "" ? parseInt(data.minimumStock) : 10,
        maximumStock: data.maximumStock && data.maximumStock !== "" ? parseInt(data.maximumStock) : 1000,
        reorderPoint: data.reorderPoint && data.reorderPoint !== "" ? parseInt(data.reorderPoint) : 20,
      };
      
      await apiRequest("PATCH", `/api/inventory/items/${itemToEdit.id}`, itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/value"] });
      resetForm();
      setErrors({});
      // Show success modal without closing the dialog
      setSuccessMessage("Item successfully updated");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });


  // Generate unique SKU based on item name and category
  const generateUniqueSKU = useCallback((name?: string, categoryId?: string) => {
    const existingSKUs = new Set(existingItems.map((item: InventoryItem) => item.sku));
    
    // Use provided parameters or fall back to formData
    const itemName = name || formData.name;
    const catId = categoryId || formData.categoryId;
    
    // Get category prefix (first 3 letters, uppercase)
    const category = categories.find(cat => cat.id.toString() === catId);
    const categoryPrefix = category 
      ? category.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'ITM'
      : 'ITM';
    
    // Get item name prefix (up to 8 characters, uppercase, remove spaces and special chars, keep numbers)
    // Example: "Paracetamol 500mg" -> "PARA500"
    const namePrefix = itemName
      ? itemName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 8) || 'ITEM'
      : 'ITEM';
    
    // Find the highest number suffix for this prefix pattern
    // Pattern: CAT-NAMEPREFIX-001
    const pattern = new RegExp(`^${categoryPrefix}-${namePrefix}-(\\d+)$`);
    let maxNum = 0;
    
    existingSKUs.forEach(sku => {
      const match = sku.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });
    
    // Generate new SKU with incremented number
    const newNum = (maxNum + 1).toString().padStart(3, '0');
    let sku = `${categoryPrefix}-${namePrefix}-${newNum}`;
    
    // Ensure uniqueness (in case of collision)
    let counter = 1;
    while (existingSKUs.has(sku)) {
      sku = `${categoryPrefix}-${namePrefix}-${newNum}-${counter}`;
      counter++;
    }
    
    return sku;
  }, [formData.name, formData.categoryId, categories, existingItems]);

  // Generate unique Barcode
  const generateUniqueBarcode = useCallback(() => {
    const existingBarcodes = new Set(
      existingItems
        .map((item: InventoryItem) => item.barcode)
        .filter((barcode): barcode is string => !!barcode)
    );
    
    // Generate barcode using timestamp + random component
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    let barcode = `${timestamp}${random}`;
    
    // Ensure uniqueness
    let counter = 1;
    while (existingBarcodes.has(barcode)) {
      barcode = `${timestamp}${random}${counter}`;
      counter++;
    }
    
    return barcode;
  }, [existingItems]);

  // Populate form when editing
  useEffect(() => {
    if (itemToEdit && open) {
      setSkuManuallyEdited(false);
      setBarcodeManuallyEdited(false);
      setFormData({
        itemNameId: "",
        name: itemToEdit.name || "",
        description: itemToEdit.description || "",
        sku: itemToEdit.sku || "",
        barcode: itemToEdit.barcode || "",
        genericName: "",
        brandName: itemToEdit.brandName || "",
        manufacturer: itemToEdit.manufacturer || "",
        categoryId: itemToEdit.categoryId ? itemToEdit.categoryId.toString() : "",
        unitOfMeasurement: itemToEdit.unitOfMeasurement || "",
        packSize: 1,
        purchasePrice: itemToEdit.purchasePrice || "",
        salePrice: itemToEdit.salePrice || "",
        mrp: itemToEdit.mrp || "",
        taxRate: "20.00",
        currentStock: itemToEdit.currentStock || 0,
        minimumStock: itemToEdit.minimumStock || 0,
        maximumStock: itemToEdit.maximumStock || 0,
        reorderPoint: itemToEdit.reorderPoint || 0,
        prescriptionRequired: itemToEdit.prescriptionRequired || false,
        storageConditions: "",
        dosageInstructions: "",
      });
    } else if (!itemToEdit && open) {
      setSkuManuallyEdited(false);
      setBarcodeManuallyEdited(false);
      resetForm();
    }
  }, [itemToEdit, open]);

  // Track if SKU was manually edited by user
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [barcodeManuallyEdited, setBarcodeManuallyEdited] = useState(false);

  // Auto-generate Barcode when dialog opens for new item
  useEffect(() => {
    if (open && !itemToEdit && existingItems.length >= 0 && !barcodeManuallyEdited) {
      const uniqueBarcode = generateUniqueBarcode();
      setFormData(prev => ({ ...prev, barcode: uniqueBarcode }));
    }
  }, [open, itemToEdit, generateUniqueBarcode, existingItems.length, barcodeManuallyEdited]);

  // Auto-generate SKU when dialog opens (for new items only)
  useEffect(() => {
    if (open && !itemToEdit && existingItems.length >= 0 && !skuManuallyEdited) {
      // Generate SKU immediately when dialog opens
      // If name/category aren't available, use defaults (ITM-ITEM-001)
      // It will be regenerated when name/category are provided
      const uniqueSKU = generateUniqueSKU();
      setFormData(prev => {
        // Only set if SKU is empty (to avoid overwriting user edits)
        if (!prev.sku) {
          return { ...prev, sku: uniqueSKU };
        }
        return prev;
      });
    }
  }, [open, itemToEdit, generateUniqueSKU, existingItems.length, skuManuallyEdited]);

  // Regenerate SKU when name or category changes (for new items only)
  useEffect(() => {
    if (open && !itemToEdit && formData.name && formData.categoryId && existingItems.length >= 0 && !skuManuallyEdited) {
      const uniqueSKU = generateUniqueSKU(formData.name, formData.categoryId);
      setFormData(prev => {
        // Only update if SKU is empty or matches the old pattern (to avoid overwriting user edits)
        if (!prev.sku || prev.sku.match(/^[A-Z]{3}-[A-Z0-9]{1,8}-\d{3}/)) {
          return { ...prev, sku: uniqueSKU };
        }
        return prev;
      });
    }
  }, [formData.name, formData.categoryId, open, itemToEdit, generateUniqueSKU, existingItems.length, skuManuallyEdited]);

  const resetForm = () => {
    setErrors({});
    setSkuManuallyEdited(false);
    setBarcodeManuallyEdited(false);
    setFormData({
      itemNameId: "",
      name: "",
      description: "",
      sku: "",
      barcode: "",
      genericName: "",
      brandName: "",
      manufacturer: "",
      categoryId: "",
      unitOfMeasurement: "",
      packSize: 1,
      purchasePrice: "",
      salePrice: "",
      mrp: "",
      taxRate: "20.00",
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      reorderPoint: 0,
      prescriptionRequired: false,
      storageConditions: "",
      dosageInstructions: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Basic validation
    const newErrors: { name?: string; sku?: string; categoryId?: string } = {};
    
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "Item Name is required";
    }
    
    if (!formData.sku || formData.sku.trim() === "") {
      newErrors.sku = "SKU is required";
    }
    
    if (!formData.categoryId || formData.categoryId === "") {
      newErrors.categoryId = "Category is required";
    }
    
    // If there are errors, set them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (itemToEdit) {
      updateItemMutation.mutate(formData);
    } else {
      addItemMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof errors];
        return newErrors;
      });
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={onOpenChange}
      >
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
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
            <DialogTitle>{itemToEdit ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
            <DialogDescription>
              {itemToEdit ? "Update the inventory item details. All fields marked with * are required." : "Add a new item to your healthcare inventory. All fields marked with * are required."}
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div>
                <Label htmlFor="itemName">Item Name *</Label>
                <Popover open={itemNameOpen} onOpenChange={setItemNameOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={itemNameOpen}
                      className={`w-full justify-between ${errors.name ? "border-red-500" : ""}`}
                    >
                      <span className={formData.name ? "" : "text-muted-foreground"}>
                        {formData.name || "Select or type item name..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type custom item name..."
                        value={formData.name}
                        onValueChange={(value) => {
                          handleInputChange("name", value);
                          // Clear itemNameId when typing custom name
                          if (value && !itemNames.find(item => item.name.toLowerCase() === value.toLowerCase())) {
                            handleInputChange("itemNameId", "");
                          }
                        }}
                      />
                      <CommandEmpty>
                        <div className="py-2 text-center text-sm">
                          <p>No match found.</p>
                          <p className="text-muted-foreground">Use your typed text as custom item name.</p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {itemNames
                          .filter((item) =>
                            item.name.toLowerCase().includes(formData.name.toLowerCase())
                          )
                          .map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                // Auto-fill all fields from the selected item name
                                handleInputChange("name", item.name);
                                handleInputChange("itemNameId", item.id.toString());
                                if (item.description) {
                                  handleInputChange("description", item.description);
                                }
                                if (item.brandName) {
                                  handleInputChange("brandName", item.brandName);
                                }
                                if (item.manufacturer) {
                                  handleInputChange("manufacturer", item.manufacturer);
                                }
                                if (item.unitOfMeasurement) {
                                  handleInputChange("unitOfMeasurement", item.unitOfMeasurement);
                                }
                                setItemNameOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.name === item.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {item.name}
                              {item.description && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  - {item.description}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the item"
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => {
                    handleInputChange("sku", e.target.value);
                    setSkuManuallyEdited(true);
                  }}
                  placeholder="Auto-generated (e.g., TAB-PARA500-001)"
                  required
                  className={errors.sku ? "border-red-500" : ""}
                />
                {errors.sku && (
                  <p className="text-sm text-red-500 mt-1">{errors.sku}</p>
                )}
              </div>

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => {
                    handleInputChange("barcode", e.target.value);
                    setBarcodeManuallyEdited(true);
                  }}
                  placeholder="Auto-generated"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <div className="flex space-x-2">
                  <Select value={formData.categoryId} onValueChange={(value) => handleInputChange("categoryId", value)}>
                    <SelectTrigger className={`flex-1 ${errors.categoryId ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCategoryDialog(true)}
                    className="px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.categoryId && (
                  <p className="text-sm text-red-500 mt-1">{errors.categoryId}</p>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Product Details</h3>
              
              <div>
                <Label htmlFor="genericName">Generic Name</Label>
                <Input
                  id="genericName"
                  value={formData.genericName}
                  onChange={(e) => handleInputChange("genericName", e.target.value)}
                  placeholder="e.g., Paracetamol"
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
                <Popover open={unitOfMeasurementOpen} onOpenChange={setUnitOfMeasurementOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={unitOfMeasurementOpen}
                      className="w-full justify-between"
                    >
                      <span className={formData.unitOfMeasurement ? "" : "text-muted-foreground"}>
                        {formData.unitOfMeasurement || "Select or type unit of measurement..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type custom unit..."
                        value={formData.unitOfMeasurement}
                        onValueChange={(value) => handleInputChange("unitOfMeasurement", value)}
                      />
                      <CommandEmpty>No match. Use your typed text as custom unit.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {UNIT_OF_MEASUREMENT_OPTIONS.filter((option) =>
                          option.toLowerCase().includes(formData.unitOfMeasurement.toLowerCase())
                        ).map((option) => (
                          <CommandItem
                            key={option}
                            value={option}
                            onSelect={() => {
                              handleInputChange("unitOfMeasurement", option);
                              setUnitOfMeasurementOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.unitOfMeasurement === option ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="packSize">Pack Size</Label>
                <Input
                  id="packSize"
                  type="number"
                  value={formData.packSize}
                  onChange={(e) => handleInputChange("packSize", e.target.value)}
                  placeholder="e.g., 100"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pricing</h3>
              
              <div>
                <Label htmlFor="purchasePrice">Purchase Price ({currencySymbol})</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="salePrice">Sale Price ({currencySymbol})</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => handleInputChange("salePrice", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="mrp">MRP ({currencySymbol})</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => handleInputChange("mrp", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => handleInputChange("taxRate", e.target.value)}
                  placeholder="20.00"
                />
              </div>
            </div>

            {/* Stock Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Stock Information</h3>
              
              <div>
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => handleInputChange("currentStock", e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="minimumStock">Minimum Stock</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  value={formData.minimumStock}
                  onChange={(e) => handleInputChange("minimumStock", e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="maximumStock">Maximum Stock</Label>
                <Input
                  id="maximumStock"
                  type="number"
                  value={formData.maximumStock}
                  onChange={(e) => handleInputChange("maximumStock", e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) => handleInputChange("reorderPoint", e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="prescriptionRequired"
                  checked={formData.prescriptionRequired}
                  onCheckedChange={(checked) => handleInputChange("prescriptionRequired", checked)}
                />
                <Label htmlFor="prescriptionRequired">Prescription Required</Label>
              </div>

              <div>
                <Label htmlFor="storageConditions">Storage Conditions</Label>
                <Textarea
                  id="storageConditions"
                  value={formData.storageConditions}
                  onChange={(e) => handleInputChange("storageConditions", e.target.value)}
                  placeholder="e.g., Store in cool, dry place"
                />
              </div>

              <div>
                <Label htmlFor="dosageInstructions">Dosage Instructions</Label>
                <Textarea
                  id="dosageInstructions"
                  value={formData.dosageInstructions}
                  onChange={(e) => handleInputChange("dosageInstructions", e.target.value)}
                  placeholder="e.g., 1-2 tablets every 4-6 hours"
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={itemToEdit ? updateItemMutation.isPending : addItemMutation.isPending}
          >
            {(itemToEdit ? updateItemMutation.isPending : addItemMutation.isPending) ? (
              itemToEdit ? "Updating..." : "Adding..."
            ) : (
              itemToEdit ? "Update Item" : "Add Item"
            )}
          </Button>
        </DialogFooter>
        
        {/* Add Category Dialog */}
        <AddCategoryDialog 
          open={showCategoryDialog} 
          onOpenChange={setShowCategoryDialog} 
        />

      </DialogContent>
    </Dialog>

    {/* Success Modal - Outside main dialog to ensure it displays */}
    <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Item Added Successfully</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Item Successfully Added to Inventory
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {successMessage}
          </p>
          <Button
            onClick={() => {
              setShowSuccessModal(false);
              setSuccessMessage("");
              // Close the main dialog after success modal is closed
              onOpenChange(false);
            }}
            className="mt-6 w-full"
            data-testid="button-close-item-success"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}