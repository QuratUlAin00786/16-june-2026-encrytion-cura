import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  FileText,
  CreditCard,
  AlertTriangle,
  Package,
  User,
  Phone,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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

interface Return {
  id: number;
  returnNumber: string;
  returnType: string;
  originalSaleId: number | null;
  originalInvoiceNumber: string | null;
  customerName: string | null;
  totalAmount: string;
  netRefundAmount: string;
  settlementType: string;
  status: string;
  returnDate: string;
  returnReason: string;
}

interface Sale {
  id: number;
  saleNumber: string;
  invoiceNumber: string;
  customerName: string | null;
  totalAmount: string;
  status: string;
  items?: SaleItem[];
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

interface CreditNote {
  id: number;
  creditNoteNumber: string;
  creditNoteType: string;
  originalInvoiceNumber: string | null;
  recipientName: string | null;
  originalAmount: string;
  usedAmount: string;
  remainingAmount: string;
  status: string;
  issueDate: string;
  expiryDate: string | null;
}

interface ReturnedItemDetail {
  id: number;
  itemId: number;
  itemName: string;
  batchId: number;
  batchNumber: string | null;
  returnedQuantity: number;
  conditionOnReturn: string;
  isRestockable: boolean;
  disposition: string | null;
  lineTotal: string;
}

interface ReturnDetails extends Return {
  restockingFee: string;
  creditNoteNumber: string | null;
  items?: ReturnedItemDetail[];
}

export default function ReturnsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showNewReturnDialog, setShowNewReturnDialog] = useState(false);
  const [showReturnDetailsDialog, setShowReturnDetailsDialog] = useState(false);
  const [showDeleteReturnDialog, setShowDeleteReturnDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [returnToDelete, setReturnToDelete] = useState<Return | null>(null);
  const [activeTab, setActiveTab] = useState<'returns' | 'credit-notes'>('returns');

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnReasonDetails, setReturnReasonDetails] = useState('');
  const [settlementType, setSettlementType] = useState<'refund' | 'credit_note' | 'exchange'>('credit_note');
  const [restockingFeePercent, setRestockingFeePercent] = useState(0);
  const [internalNotes, setInternalNotes] = useState('');
  const [returnFilters, setReturnFilters] = useState({
    returnNumber: FILTER_ALL,
    returnDate: "",
  });

  const returnFilterDefaults = {
    returnNumber: FILTER_ALL,
    returnDate: "",
  };

  const applyReturnFilter = (
    key: keyof typeof returnFilterDefaults,
    value: string,
  ) => applyExclusiveFilter(
    returnFilterDefaults,
    setReturnFilters,
    key,
    value,
    (field) => (field === "returnDate" ? "" : FILTER_ALL),
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

  const { data: returns = [], isLoading: returnsLoading } = useQuery<Return[]>({
    queryKey: ['/api/inventory/returns'],
  });

  const returnNumberOptions = useMemo(
    () => buildFilterOptions(returns.map((ret) => ret.returnNumber), "All Return #"),
    [returns],
  );

  const filteredReturns = useMemo(() => returns.filter((ret) => {
    if (!matchesFilterValue(returnFilters.returnNumber, ret.returnNumber)) return false;
    if (returnFilters.returnDate) {
      const returnDateValue = format(new Date(ret.returnDate), "yyyy-MM-dd");
      if (returnDateValue !== returnFilters.returnDate) return false;
    }
    return true;
  }), [returns, returnFilters]);

  const { data: creditNotes = [], isLoading: creditNotesLoading } = useQuery<CreditNote[]>({
    queryKey: ['/api/inventory/credit-notes'],
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/inventory/sales'],
  });

  const { data: selectedSaleDetails } = useQuery<Sale>({
    queryKey: ['/api/inventory/sales', selectedSaleId],
    enabled: !!selectedSaleId,
    queryFn: async ({ queryKey }) => {
      const [, saleId] = queryKey;
      const response = await apiRequest("GET", `/api/inventory/sales/${saleId}`);
      return response.json();
    },
  });

  const { data: returnDetails } = useQuery<ReturnDetails>({
    queryKey: ['/api/inventory/returns', selectedReturn?.id],
    enabled: !!selectedReturn?.id,
    queryFn: async ({ queryKey }) => {
      const [, returnId] = queryKey;
      const response = await apiRequest("GET", `/api/inventory/returns/${returnId}`);
      return response.json();
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const response = await apiRequest('POST', '/api/inventory/returns/sales', returnData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/returns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/credit-notes'] });
      resetReturnForm();
      setShowNewReturnDialog(false);
      showFeedback(
        "success",
        "Return Created",
        "Your return request has been submitted successfully.",
        data?.returnNumber ? `Return #${data.returnNumber}` : undefined
      );
    },
    onError: (error: Error) => {
      showFeedback(
        "error",
        "Return Failed",
        "There was an error creating the return.",
        error.message
      );
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: async (returnId: number) => {
      const throwDeleteError = (text: string) => {
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || "Failed to delete return");
        } catch (err) {
          if (err instanceof Error && !text.trim().startsWith("<!DOCTYPE")) {
            throw err;
          }
          throw new Error("Failed to delete return. Please restart the server and try again.");
        }
      };

      let response = await apiRequest("POST", `/api/inventory/returns/${returnId}/delete`);
      if (!response.ok) {
        const text = await response.text();
        if (response.status === 404) {
          response = await apiRequest("DELETE", `/api/inventory/returns/${returnId}`);
          if (!response.ok) {
            throwDeleteError(await response.text());
          }
        } else {
          throwDeleteError(text);
        }
      }
      return response.json();
    },
    onSuccess: (_data, returnId) => {
      queryClient.setQueryData<Return[]>(["/api/inventory/returns"], (current) =>
        current?.filter((ret) => ret.id !== returnId) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/credit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      setShowDeleteReturnDialog(false);
      setReturnToDelete(null);
      setSelectedReturn((current) => {
        if (current?.id === returnId) {
          setShowReturnDetailsDialog(false);
          return null;
        }
        return current;
      });
      showFeedback(
        "success",
        "Return Deleted",
        "The return has been removed from the list.",
      );
    },
    onError: (error: Error) => {
      showFeedback(
        "error",
        "Delete Failed",
        "There was an error deleting the return.",
        error.message,
      );
    },
  });

  const approveReturnMutation = useMutation({
    mutationFn: async ({ returnId, decision, notes }: { returnId: number; decision: 'approved' | 'rejected'; notes?: string }) => {
      const response = await apiRequest('POST', `/api/inventory/returns/${returnId}/approval`, { decision, notes });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/returns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/credit-notes'] });
      setShowReturnDetailsDialog(false);
      showFeedback(
        "success",
        variables.decision === 'approved' ? "Return Approved" : "Return Rejected",
        variables.decision === 'approved' 
          ? "The return has been approved and stock has been updated."
          : "The return has been rejected."
      );
    },
    onError: (error: Error) => {
      showFeedback(
        "error",
        "Processing Failed",
        "There was an error processing the return.",
        error.message
      );
    },
  });

  const resetReturnForm = () => {
    setSelectedSaleId(null);
    setReturnItems([]);
    setReturnReason('');
    setReturnReasonDetails('');
    setSettlementType('credit_note');
    setRestockingFeePercent(0);
    setInternalNotes('');
  };

  const handleSaleSelect = (saleId: number) => {
    setSelectedSaleId(saleId);
    setReturnItems([]);
  };

  const handleAddReturnItem = (saleItem: SaleItem) => {
    const maxReturnable = saleItem.quantity - (saleItem.returnedQuantity || 0);
    if (maxReturnable <= 0) {
      toast({ title: "All items from this line have already been returned", variant: "destructive" });
      return;
    }

    const existingItem = returnItems.find(i => i.originalSaleItemId === saleItem.id);
    if (existingItem) {
      toast({ title: "Item already added to return", variant: "destructive" });
      return;
    }

    setReturnItems([...returnItems, {
      originalSaleItemId: saleItem.id,
      itemId: saleItem.itemId,
      itemName: saleItem.itemName,
      batchId: saleItem.batchId,
      batchNumber: saleItem.batchNumber,
      returnedQuantity: 1,
      maxReturnableQty: maxReturnable,
      conditionOnReturn: 'sealed',
      isRestockable: true,
      unitPrice: saleItem.unitPrice,
    }]);
  };

  const updateReturnItem = (originalSaleItemId: number, field: string, value: any) => {
    setReturnItems(returnItems.map(item => {
      if (item.originalSaleItemId !== originalSaleItemId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'conditionOnReturn') {
        updated.isRestockable = value === 'sealed';
      }
      return updated;
    }));
  };

  const removeReturnItem = (originalSaleItemId: number) => {
    setReturnItems(returnItems.filter(i => i.originalSaleItemId !== originalSaleItemId));
  };

  const returnSubtotal = returnItems.reduce((sum, item) => 
    sum + (item.returnedQuantity * parseFloat(item.unitPrice)), 0);
  const restockingFee = returnSubtotal * (restockingFeePercent / 100);
  const netRefund = returnSubtotal - restockingFee;

  const handleCreateReturn = () => {
    if (!selectedSaleId) {
      toast({ title: "Please select a sale", variant: "destructive" });
      return;
    }
    if (returnItems.length === 0) {
      toast({ title: "Please add at least one item to return", variant: "destructive" });
      return;
    }
    if (!returnReason) {
      toast({ title: "Please provide a return reason", variant: "destructive" });
      return;
    }

    createReturnMutation.mutate({
      originalSaleId: selectedSaleId,
      customerName: selectedSaleDetails?.customerName,
      items: returnItems.map(item => ({
        originalSaleItemId: item.originalSaleItemId,
        itemId: item.itemId,
        batchId: item.batchId,
        returnedQuantity: item.returnedQuantity,
        conditionOnReturn: item.conditionOnReturn,
        isRestockable: item.isRestockable,
      })),
      returnReason,
      returnReasonDetails: returnReasonDetails || undefined,
      settlementType,
      restockingFeePercent: restockingFeePercent > 0 ? restockingFeePercent : undefined,
      internalNotes: internalNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Completed</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Approved</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending Approval</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rejected</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Active</Badge>;
      case 'exhausted':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Exhausted</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get list of sale IDs that have already been returned
  const returnedSaleIds = new Set(
    returns
      .filter(r => r.returnType === 'sales_return' && r.originalSaleId !== null)
      .map(r => r.originalSaleId as number)
  );

  // Filter completed sales to exclude those that have already been returned
  const completedSales = sales.filter(
    s => s.status === 'completed' && !returnedSaleIds.has(s.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Returns Management</h2>
          <p className="text-muted-foreground">Process sales returns and manage credit notes</p>
        </div>
        <Button onClick={() => setShowNewReturnDialog(true)} data-testid="button-new-return">
          <Plus className="h-4 w-4 mr-2" />
          New Return
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'returns' ? 'default' : 'outline'}
          onClick={() => setActiveTab('returns')}
          data-testid="tab-returns"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Returns ({returns.length})
        </Button>
        <Button
          variant={activeTab === 'credit-notes' ? 'default' : 'outline'}
          onClick={() => setActiveTab('credit-notes')}
          data-testid="tab-credit-notes"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Credit Notes ({creditNotes.length})
        </Button>
      </div>

      {activeTab === 'returns' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Returns History
            </CardTitle>
            <CardDescription>View and manage product returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <InventoryFilterCombobox
                label="Return #"
                value={returnFilters.returnNumber}
                onChange={(value) => applyReturnFilter("returnNumber", value)}
                options={returnNumberOptions}
              />
              <InventoryFilterDate
                label="Return Date"
                value={returnFilters.returnDate}
                onChange={(value) => applyReturnFilter("returnDate", value)}
              />
              <Button
                variant="outline"
                size="sm"
                className={inventoryClearButtonClass}
                onClick={() => setReturnFilters({ ...returnFilterDefaults })}
              >
                Clear
              </Button>
            </div>
            {returnsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading returns...</div>
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No returns recorded yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={inventoryTableHeadClass}>Return #</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Type</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Original Invoice</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Customer</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Reason</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Total</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Net Refund</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Settlement</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Date</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((ret) => (
                    <TableRow key={ret.id} data-testid={`row-return-${ret.id}`}>
                      <TableCell className={inventoryIdCellClass}>{ret.returnNumber}</TableCell>
                      <TableCell className={inventoryTableCellClass}>
                        <Badge variant="outline">
                          {ret.returnType === 'sales_return' ? 'Sales' : 'Purchase'}
                        </Badge>
                      </TableCell>
                      <TableCell className={inventoryIdCellClass}>{ret.originalInvoiceNumber || '-'}</TableCell>
                      <TableCell className={inventoryTableCellClass}>{ret.customerName || 'Walk-in'}</TableCell>
                      <TableCell className={`${inventoryTableCellClass} max-w-32 truncate`}>{ret.returnReason}</TableCell>
                      <TableCell className={inventoryNumberCellClass}>${parseFloat(ret.totalAmount).toFixed(2)}</TableCell>
                      <TableCell className={inventoryNumberCellClass}>${parseFloat(ret.netRefundAmount).toFixed(2)}</TableCell>
                      <TableCell className={inventoryTableCellClass}>
                        <Badge variant="outline" className="capitalize">{ret.settlementType.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className={inventoryTableCellClass}>{getStatusBadge(ret.status)}</TableCell>
                      <TableCell className={inventoryTableCellClass}>{format(new Date(ret.returnDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className={inventoryTableCellClass}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedReturn(ret);
                              setShowReturnDetailsDialog(true);
                            }}
                            data-testid={`button-view-return-${ret.id}`}
                            title="View return"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setReturnToDelete(ret);
                              setShowDeleteReturnDialog(true);
                            }}
                            disabled={deleteReturnMutation.isPending}
                            data-testid={`button-delete-return-${ret.id}`}
                            title="Delete return"
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
      )}

      {activeTab === 'credit-notes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Credit Notes
            </CardTitle>
            <CardDescription>Track and manage credit notes issued from returns</CardDescription>
          </CardHeader>
          <CardContent>
            {creditNotesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading credit notes...</div>
            ) : creditNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No credit notes issued yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={inventoryTableHeadClass}>Credit Note #</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Type</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Original Invoice</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Recipient</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Original Amount</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Used</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Remaining</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Status</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Issue Date</TableHead>
                    <TableHead className={inventoryTableHeadClass}>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id} data-testid={`row-credit-note-${cn.id}`}>
                      <TableCell className={inventoryIdCellClass}>{cn.creditNoteNumber}</TableCell>
                      <TableCell className={inventoryTableCellClass}>
                        <Badge variant="outline" className="capitalize">
                          {cn.creditNoteType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className={inventoryIdCellClass}>{cn.originalInvoiceNumber || '-'}</TableCell>
                      <TableCell className={inventoryTableCellClass}>{cn.recipientName || '-'}</TableCell>
                      <TableCell className={inventoryNumberCellClass}>${parseFloat(cn.originalAmount).toFixed(2)}</TableCell>
                      <TableCell className={inventoryNumberCellClass}>${parseFloat(cn.usedAmount || '0').toFixed(2)}</TableCell>
                      <TableCell className={inventoryNumberCellClass}>${parseFloat(cn.remainingAmount).toFixed(2)}</TableCell>
                      <TableCell className={inventoryTableCellClass}>{getStatusBadge(cn.status)}</TableCell>
                      <TableCell className={inventoryTableCellClass}>{format(new Date(cn.issueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className={inventoryTableCellClass}>
                        {cn.expiryDate ? format(new Date(cn.expiryDate), 'MMM dd, yyyy') : 'No expiry'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showNewReturnDialog} onOpenChange={setShowNewReturnDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Create Sales Return
            </DialogTitle>
            <DialogDescription>Process a return for a completed sale</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Original Sale</Label>
              <Select
                value={selectedSaleId?.toString() || ''}
                onValueChange={(v) => handleSaleSelect(parseInt(v))}
              >
                <SelectTrigger data-testid="select-original-sale">
                  <SelectValue placeholder="Select a sale to return" />
                </SelectTrigger>
                <SelectContent>
                  {completedSales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      {sale.invoiceNumber} - {sale.customerName || 'Walk-in'} - ${parseFloat(sale.totalAmount).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSaleDetails && (
              <>
                <div>
                  <Label>Items from Sale (click to add to return)</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={inventoryTableHeadClass}>Item</TableHead>
                          <TableHead className={inventoryTableHeadClass}>Batch</TableHead>
                          <TableHead className={`${inventoryTableHeadClass} text-right`}>Sold Qty</TableHead>
                          <TableHead className={`${inventoryTableHeadClass} text-right`}>Already Returned</TableHead>
                          <TableHead className={`${inventoryTableHeadClass} text-right`}>Returnable</TableHead>
                          <TableHead className={inventoryTableHeadClass}></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSaleDetails.items && selectedSaleDetails.items.length > 0 ? (
                          selectedSaleDetails.items.map((item: SaleItem) => {
                            const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                            const isAdded = returnItems.some(i => i.originalSaleItemId === item.id);
                            return (
                              <TableRow key={item.id}>
                                <TableCell className={inventoryTableCellClass}>{item.itemName}</TableCell>
                                <TableCell className={inventoryIdCellClass}>{item.batchNumber || '-'}</TableCell>
                                <TableCell className={`${inventoryNumberCellClass} text-right`}>{item.quantity}</TableCell>
                                <TableCell className={`${inventoryNumberCellClass} text-right`}>{item.returnedQuantity || 0}</TableCell>
                                <TableCell className={`${inventoryNumberCellClass} text-right`}>{maxReturnable}</TableCell>
                                <TableCell className={inventoryTableCellClass}>
                                  <Button
                                    size="sm"
                                    variant={isAdded ? "secondary" : "outline"}
                                    onClick={() => handleAddReturnItem(item)}
                                    disabled={maxReturnable <= 0 || isAdded}
                                    data-testid={`button-add-return-item-${item.id}`}
                                  >
                                    {isAdded ? 'Added' : 'Add'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No items found in this sale.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {returnItems.length > 0 && (
                  <div>
                    <Label>Return Items</Label>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className={inventoryTableHeadClass}>Item</TableHead>
                            <TableHead className={`${inventoryTableHeadClass} w-24`}>Qty</TableHead>
                            <TableHead className={`${inventoryTableHeadClass} w-32`}>Condition</TableHead>
                            <TableHead className={`${inventoryTableHeadClass} w-24`}>Restockable</TableHead>
                            <TableHead className={`${inventoryTableHeadClass} text-right`}>Line Total</TableHead>
                            <TableHead className={`${inventoryTableHeadClass} w-10`}></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnItems.map((item) => (
                            <TableRow key={item.originalSaleItemId}>
                              <TableCell className={inventoryTableCellClass}>
                                <div>{item.itemName}</div>
                                <div className="text-base text-muted-foreground font-mono">{item.batchNumber}</div>
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.maxReturnableQty}
                                  value={item.returnedQuantity}
                                  onChange={(e) => updateReturnItem(item.originalSaleItemId, 'returnedQuantity', parseInt(e.target.value) || 1)}
                                  className="w-20 h-8"
                                  data-testid={`input-return-qty-${item.originalSaleItemId}`}
                                />
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                <Select
                                  value={item.conditionOnReturn}
                                  onValueChange={(v) => updateReturnItem(item.originalSaleItemId, 'conditionOnReturn', v)}
                                >
                                  <SelectTrigger className="h-10 text-base" data-testid={`select-condition-${item.originalSaleItemId}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sealed">Sealed</SelectItem>
                                    <SelectItem value="opened">Opened</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                <Checkbox
                                  checked={item.isRestockable}
                                  onCheckedChange={(checked) => updateReturnItem(item.originalSaleItemId, 'isRestockable', !!checked)}
                                  data-testid={`checkbox-restockable-${item.originalSaleItemId}`}
                                />
                              </TableCell>
                              <TableCell className={`${inventoryNumberCellClass} text-right`}>
                                ${(item.returnedQuantity * parseFloat(item.unitPrice)).toFixed(2)}
                              </TableCell>
                              <TableCell className={inventoryTableCellClass}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeReturnItem(item.originalSaleItemId)}
                                  className="h-8 w-8"
                                  data-testid={`button-remove-return-item-${item.originalSaleItemId}`}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Return Reason *</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger data-testid="select-return-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">Defective Product</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item Dispensed</SelectItem>
                    <SelectItem value="expired">Product Expired</SelectItem>
                    <SelectItem value="allergic_reaction">Allergic Reaction</SelectItem>
                    <SelectItem value="prescription_change">Prescription Changed</SelectItem>
                    <SelectItem value="overcharge">Overcharged</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Settlement Type</Label>
                <Select value={settlementType} onValueChange={(v) => setSettlementType(v as any)}>
                  <SelectTrigger data-testid="select-settlement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                    <SelectItem value="refund">Cash Refund</SelectItem>
                    <SelectItem value="exchange">Exchange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason Details</Label>
              <Textarea
                value={returnReasonDetails}
                onChange={(e) => setReturnReasonDetails(e.target.value)}
                placeholder="Additional details about the return..."
                rows={2}
                data-testid="textarea-return-reason-details"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Restocking Fee (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={restockingFeePercent}
                  onChange={(e) => setRestockingFeePercent(parseFloat(e.target.value) || 0)}
                  data-testid="input-restocking-fee"
                />
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Input
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Staff notes..."
                  data-testid="input-internal-notes"
                />
              </div>
            </div>

            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Return Subtotal</span>
                  <span>${returnSubtotal.toFixed(2)}</span>
                </div>
                {restockingFeePercent > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Restocking Fee ({restockingFeePercent}%)</span>
                    <span>-${restockingFee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Refund</span>
                  <span>${netRefund.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetReturnForm} data-testid="button-reset-return">
                Reset
              </Button>
              <Button
                onClick={handleCreateReturn}
                disabled={!selectedSaleId || returnItems.length === 0 || !returnReason || createReturnMutation.isPending}
                data-testid="button-create-return"
              >
                {createReturnMutation.isPending ? 'Processing...' : 'Create Return'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDetailsDialog} onOpenChange={setShowReturnDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>
              {selectedReturn?.returnNumber}
            </DialogDescription>
          </DialogHeader>

          {returnDetails ? (
            <div className="space-y-4" data-testid="return-details-content">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p data-testid="text-return-customer">{returnDetails.customerName || 'Walk-in'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Original Invoice</Label>
                  <p className="font-mono" data-testid="text-return-invoice">{returnDetails.originalInvoiceNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p data-testid="text-return-reason">{returnDetails.returnReason}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  {getStatusBadge(returnDetails.status)}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Returned Items</Label>
                <Table data-testid="table-return-items">
                  <TableHeader>
                    <TableRow>
                      <TableHead className={inventoryTableHeadClass}>Item</TableHead>
                      <TableHead className={inventoryTableHeadClass}>Batch</TableHead>
                      <TableHead className={`${inventoryTableHeadClass} text-right`}>Qty</TableHead>
                      <TableHead className={inventoryTableHeadClass}>Condition</TableHead>
                      <TableHead className={inventoryTableHeadClass}>Restockable</TableHead>
                      <TableHead className={inventoryTableHeadClass}>Disposition</TableHead>
                      <TableHead className={`${inventoryTableHeadClass} text-right`}>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnDetails.items?.map((item) => (
                      <TableRow key={item.id} data-testid={`row-return-item-${item.id}`}>
                        <TableCell className={inventoryTableCellClass}>{item.itemName}</TableCell>
                        <TableCell className={inventoryIdCellClass}>{item.batchNumber || '-'}</TableCell>
                        <TableCell className={`${inventoryNumberCellClass} text-right`}>{item.returnedQuantity}</TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          <Badge variant="outline" className="capitalize">{item.conditionOnReturn}</Badge>
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          {item.isRestockable ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className={inventoryTableCellClass}>
                          {item.disposition && (
                            <Badge variant="outline" className="capitalize">{item.disposition}</Badge>
                          )}
                        </TableCell>
                        <TableCell className={`${inventoryNumberCellClass} text-right`}>
                          ${parseFloat(item.lineTotal).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Settlement</Label>
                  <Badge className="capitalize" data-testid="badge-settlement-type">{returnDetails.settlementType?.replace('_', ' ')}</Badge>
                  {returnDetails.creditNoteNumber && (
                    <p className="text-sm mt-1 font-mono" data-testid="text-credit-note-number">
                      Credit Note: {returnDetails.creditNoteNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Amount</span>
                    <span data-testid="text-return-total">${parseFloat(returnDetails.totalAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restocking Fee</span>
                    <span data-testid="text-restocking-fee">-${parseFloat(returnDetails.restockingFee || '0').toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Refund</span>
                    <span data-testid="text-net-refund">${parseFloat(returnDetails.netRefundAmount || '0').toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {returnDetails.status === 'pending_approval' && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const notes = prompt('Please enter rejection reason:');
                      if (notes) {
                        approveReturnMutation.mutate({ returnId: selectedReturn!.id, decision: 'rejected', notes });
                      }
                    }}
                    disabled={approveReturnMutation.isPending}
                    data-testid="button-reject-return"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      approveReturnMutation.mutate({ returnId: selectedReturn!.id, decision: 'approved' });
                    }}
                    disabled={approveReturnMutation.isPending}
                    data-testid="button-approve-return"
                  >
                    {approveReturnMutation.isPending ? 'Processing...' : 'Approve Return'}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteReturnDialog} onOpenChange={setShowDeleteReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return</AlertDialogTitle>
            <AlertDialogDescription>
              Delete return {returnToDelete?.returnNumber}? This will permanently remove the return
              from the list and revert related sale quantities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReturnToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (returnToDelete) {
                  deleteReturnMutation.mutate(returnToDelete.id);
                }
              }}
              disabled={deleteReturnMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteReturnMutation.isPending ? "Deleting..." : "Delete Return"}
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
