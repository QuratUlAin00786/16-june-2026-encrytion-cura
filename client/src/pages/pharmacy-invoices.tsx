import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Printer,
  Search,
  RotateCcw
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useState } from "react";

interface SalesInvoice {
  id: number;
  saleNumber: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  saleType: string;
  totalAmount: string;
  taxAmount: string;
  discountAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  saleDate: string;
}

interface ReturnInvoice {
  id: number;
  returnNumber: string;
  returnType: string;
  customerName: string;
  originalInvoiceNumber: string;
  totalAmount: string;
  netRefundAmount: string;
  settlementType: string;
  status: string;
  createdAt: string;
}

export default function PharmacyInvoices() {
  const [salesStartDate, setSalesStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [salesEndDate, setSalesEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStatus, setSalesStatus] = useState("all");
  
  const [returnsStartDate, setReturnsStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [returnsEndDate, setReturnsEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [returnsStatus, setReturnsStatus] = useState("all");

  const { data: salesInvoices, isLoading: salesLoading } = useQuery<SalesInvoice[]>({
    queryKey: ["/api/pharmacy/invoices/sales", salesStartDate, salesEndDate, salesSearch, salesStatus],
  });

  const { data: returnInvoices, isLoading: returnsLoading } = useQuery<ReturnInvoice[]>({
    queryKey: ["/api/pharmacy/invoices/returns", returnsStartDate, returnsEndDate, returnsStatus],
  });

  const filteredSales = salesInvoices?.filter(invoice => {
    const matchesSearch = !salesSearch || 
      invoice.invoiceNumber?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      invoice.saleNumber?.toLowerCase().includes(salesSearch.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(salesSearch.toLowerCase());
    const matchesStatus = salesStatus === "all" || invoice.status === salesStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredReturns = returnInvoices?.filter(ret => {
    return returnsStatus === "all" || ret.status === returnsStatus;
  }) || [];

  const handlePrintInvoice = (invoiceNumber: string) => {
    window.print();
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      paid: "default",
      pending: "secondary",
      voided: "destructive",
      cancelled: "destructive",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="p-4 space-y-4 page-zoom-90">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pharmacy-invoices-title">Pharmacy Invoices</h1>
          <p className="text-muted-foreground">
            View, search, and export sales and return invoices
          </p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales" data-testid="tab-sales-invoices">
            <FileText className="w-4 h-4 mr-1" />
            Sales Invoices
          </TabsTrigger>
          <TabsTrigger value="returns" data-testid="tab-return-invoices">
            <RotateCcw className="w-4 h-4 mr-1" />
            Return Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Sales Invoice List</CardTitle>
                  <CardDescription>All pharmacy sales transactions</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(filteredSales, "sales_invoices")}
                  data-testid="button-export-sales-invoices"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoice, customer..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-sales-search"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">From:</Label>
                  <Input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="w-auto"
                    data-testid="input-sales-start-date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">To:</Label>
                  <Input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="w-auto"
                    data-testid="input-sales-end-date"
                  />
                </div>
                <Select value={salesStatus} onValueChange={setSalesStatus}>
                  <SelectTrigger className="w-32" data-testid="select-sales-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {salesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length ? (
                      filteredSales.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-sales-invoice-${invoice.id}`}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber || invoice.saleNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.customerName || "Walk-in"}</p>
                              {invoice.customerPhone && (
                                <p className="text-xs text-muted-foreground">{invoice.customerPhone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {invoice.saleType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(invoice.saleDate), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{invoice.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-medium">${parseFloat(invoice.totalAmount).toFixed(2)}</p>
                              {parseFloat(invoice.discountAmount) > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Discount: ${parseFloat(invoice.discountAmount).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handlePrintInvoice(invoice.invoiceNumber)}
                              data-testid={`button-print-${invoice.id}`}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Return Invoice List</CardTitle>
                  <CardDescription>All product return transactions</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(filteredReturns, "return_invoices")}
                  data-testid="button-export-return-invoices"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">From:</Label>
                  <Input
                    type="date"
                    value={returnsStartDate}
                    onChange={(e) => setReturnsStartDate(e.target.value)}
                    className="w-auto"
                    data-testid="input-returns-start-date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">To:</Label>
                  <Input
                    type="date"
                    value={returnsEndDate}
                    onChange={(e) => setReturnsEndDate(e.target.value)}
                    className="w-auto"
                    data-testid="input-returns-end-date"
                  />
                </div>
                <Select value={returnsStatus} onValueChange={setReturnsStatus}>
                  <SelectTrigger className="w-32" data-testid="select-returns-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {returnsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Original Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Settlement</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Refund Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.length ? (
                      filteredReturns.map((ret) => (
                        <TableRow key={ret.id} data-testid={`row-return-invoice-${ret.id}`}>
                          <TableCell className="font-medium">{ret.returnNumber}</TableCell>
                          <TableCell>{ret.originalInvoiceNumber || "N/A"}</TableCell>
                          <TableCell>{ret.customerName || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {ret.returnType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(ret.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{ret.settlementType || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(ret.status)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${parseFloat(ret.netRefundAmount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handlePrintInvoice(ret.returnNumber)}
                              data-testid={`button-print-return-${ret.id}`}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No return invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
