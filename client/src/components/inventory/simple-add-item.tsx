import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: string;
  unitOfMeasurement: string;
}

interface SimpleAddItemProps {
  items: InventoryItem[];
  onItemAdded: (item: any) => void;
}

export default function SimpleAddItem({ items, onItemAdded }: SimpleAddItemProps) {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [unitPrice, setUnitPrice] = useState("2");

  const handleAddClick = () => {
    console.log("SIMPLE ADD ITEM CLICKED!");
    console.log("Selected item ID:", selectedItemId);
    console.log("Quantity:", quantity);
    console.log("Unit price:", unitPrice);
    
    if (!selectedItemId || !unitPrice) {
      toast({
        title: "Error",
        description: "Please select an item and enter unit price",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = items.find(item => item.id === parseInt(selectedItemId));
    if (!selectedItem) {
      console.log("Selected item not found");
      return;
    }

    const totalPrice = (quantity * parseFloat(unitPrice)).toFixed(2);
    const newItem = {
      itemId: parseInt(selectedItemId),
      itemName: selectedItem.name,
      quantity,
      unitPrice,
      totalPrice
    };

    console.log("Adding item:", newItem);
    onItemAdded(newItem);
    
    // Reset form
    setSelectedItemId("");
    setQuantity(100);
    setUnitPrice("2");
    
    toast({
      title: "Success",
      description: `Added ${selectedItem.name} to purchase order`,
    });
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', margin: '16px 0' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '500' }}>Quick Add Item</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Item</label>
          <select 
            value={selectedItemId} 
            onChange={(e) => setSelectedItemId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Select item</option>
            {items.map(item => (
              <option key={item.id} value={item.id.toString()}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Unit Price</label>
          <input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <button
          onClick={handleAddClick}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#059669';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#10b981';
          }}
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>
    </div>
  );
}