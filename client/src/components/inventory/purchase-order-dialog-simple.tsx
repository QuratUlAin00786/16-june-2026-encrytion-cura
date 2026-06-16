import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

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
}

// Validation schema for adding items to purchase order
const addItemSchema = z.object({
  itemId: z.string().min(1, "Item selection is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
});

type AddItemFormData = z.infer<typeof addItemSchema>;

export default function PurchaseOrderDialogSimple({ open, onOpenChange, items }: PurchaseOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [poItems, setPOItems] = useState<any[]>([]);
  
  // Form for adding items
  const form = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      itemId: "",
      quantity: 1,
      unitPrice: "",
    },
  });

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory/purchase-orders", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
      onOpenChange(false);
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
    form.reset();
    setPOItems([]);
  };

  const handleAddItem = (data: AddItemFormData) => {
    const selectedItem = items.find(item => item.id === parseInt(data.itemId));
    if (!selectedItem) {
      form.setError("itemId", {
        type: "manual",
        message: "Selected item not found"
      });
      return;
    }

    const totalPrice = (data.quantity * parseFloat(data.unitPrice)).toFixed(2);
    const newItem = {
      itemId: parseInt(data.itemId),
      itemName: selectedItem.name,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalPrice
    };

    setPOItems([...poItems, newItem]);
    form.reset();
  };

  const handleSubmit = () => {
    if (poItems.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "Please add at least one item to the purchase order"
      });
      return;
    }

    const totalAmount = poItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toFixed(2);

    createPOMutation.mutate({
      supplierId: 1,
      expectedDeliveryDate: new Date().toISOString().split('T')[0],
      notes: "Test purchase order",
      taxAmount: "0.00",
      discountAmount: "0.00",
      totalAmount,
      items: poItems
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order (Simple)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Item Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Add Item</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddItem)}>
                <div className="grid grid-cols-4 gap-3 items-end">
                  <FormField
                    control={form.control}
                    name="itemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-item">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map(item => (
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
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            data-testid="input-quantity"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            data-testid="input-unit-price"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    data-testid="button-add-item"
                  >
                    Add Item
                  </Button>
                </div>
                
                {/* Form-level error for add item */}
                {form.formState.errors.root && (
                  <div className="text-red-600 text-sm mt-2" data-testid="error-add-item">
                    {form.formState.errors.root.message}
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Items List */}
          {poItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Purchase Order Items ({poItems.length})</h3>
              <div className="space-y-2">
                {poItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span>{item.itemName}</span>
                    <span>Qty: {item.quantity}</span>
                    <span>Price: £{item.unitPrice}</span>
                    <span>Total: £{item.totalPrice}</span>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setPOItems(poItems.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createPOMutation.isPending}>
              {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}