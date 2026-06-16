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
  Download, 
  Calendar,
  TrendingUp,
  Package,
  User,
  FileText
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useState } from "react";

interface SalesReportData {
  date: string;
  sales: Array<{
    id: number;
    saleNumber: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: string;
    paymentMethod: string;
    saleDate: string;
  }>;
  paymentSummary: Array<{
    paymentMethod: string;
    count: number;
    totalAmount: string;
  }>;
  totalSales: number;
  totalAmount: number;
}

interface ReturnReportData {
  returns: Array<{
    id: number;
    returnNumber: string;
    customerName: string;
    returnReason: string;
    totalAmount: string;
    status: string;
    createdAt: string;
  }>;
  reasonSummary: Array<{
    returnReason: string;
    count: number;
    totalAmount: string;
  }>;
  totalReturns: number;
  totalAmount: number;
}

interface ItemSalesData {
  item_id: number;
  item_name: string;
  sku: string;
  brand_name: string;
  total_quantity_sold: string;
  total_sales_amount: string;
  number_of_sales: string;
}

interface PharmacistActivityData {
  pharmacistId: number;
  firstName: string;
  lastName: string;
  email: string;
  salesCount: number;
  returnsCount: number;
  totalActions: number;
}

export default function PharmacyReports() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: dailySalesReport, isLoading: salesLoading } = useQuery<SalesReportData>({
    queryKey: ["/api/pharmacy/reports/daily-sales", selectedDate],
  });

  const { data: returnsReport, isLoading: returnsLoading } = useQuery<ReturnReportData>({
    queryKey: ["/api/pharmacy/reports/returns", startDate, endDate],
  });

  const { data: itemWiseReport, isLoading: itemsLoading } = useQuery<ItemSalesData[]>({
    queryKey: ["/api/pharmacy/reports/item-wise-sales", startDate, endDate],
  });

  const { data: activityReport, isLoading: activityLoading } = useQuery<PharmacistActivityData[]>({
    queryKey: ["/api/pharmacy/reports/pharmacist-activity", startDate, endDate],
  });

  const safeFormatDate = (dateValue: string | null | undefined, formatStr: string): string => {
    if (!dateValue) return "N/A";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, formatStr);
    } catch {
      return "N/A";
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!Array.isArray(data) || data.length === 0 || !data[0]) return;
    
    const firstRow = data[0];
    if (typeof firstRow !== "object" || firstRow === null) return;
    
    const headers = Object.keys(firstRow).join(",");
    const rows = data
      .filter(row => row && typeof row === "object")
      .map(row => Object.values(row).map(v => v ?? "").join(","))
      .join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="p-4 space-y-4 page-zoom-90">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pharmacy-reports-title">Pharmacy Reports</h1>
          <p className="text-muted-foreground">
            View and export pharmacy sales, returns, and activity reports
          </p>
        </div>
      </div>

      <Tabs defaultValue="daily-sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="daily-sales" data-testid="tab-daily-sales">
            <Calendar className="w-4 h-4 mr-1" />
            Daily Sales
          </TabsTrigger>
          <TabsTrigger value="returns" data-testid="tab-returns">
            <FileText className="w-4 h-4 mr-1" />
            Returns Summary
          </TabsTrigger>
          <TabsTrigger value="item-wise" data-testid="tab-item-wise">
            <Package className="w-4 h-4 mr-1" />
            Item-wise Sales
          </TabsTrigger>
          <TabsTrigger value="pharmacist-activity" data-testid="tab-activity">
            <User className="w-4 h-4 mr-1" />
            Pharmacist Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily-sales" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Daily Sales Report</CardTitle>
                  <CardDescription>Sales transactions for a specific day</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    data-testid="input-report-date"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(dailySalesReport?.sales || [], "daily_sales")}
                    data-testid="button-export-daily-sales"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Sales</div>
                        <div className="text-2xl font-bold" data-testid="text-total-sales">{dailySalesReport?.totalSales ?? 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="text-2xl font-bold" data-testid="text-total-amount">
                          ${(dailySalesReport?.totalAmount ?? 0).toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Payment Methods</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dailySalesReport?.paymentSummary?.map((ps) => (
                            <Badge key={ps.paymentMethod} variant="outline" className="text-xs">
                              {ps.paymentMethod}: {ps.count}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dailySalesReport?.sales ?? []).length > 0 ? (
                        (dailySalesReport?.sales ?? []).map((sale) => (
                          <TableRow key={sale?.id ?? 0} data-testid={`row-sale-${sale?.id ?? 0}`}>
                            <TableCell className="font-medium">{sale?.invoiceNumber ?? sale?.saleNumber ?? "N/A"}</TableCell>
                            <TableCell>{sale?.customerName ?? "Walk-in"}</TableCell>
                            <TableCell>{safeFormatDate(sale?.saleDate, "h:mm a")}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{sale?.paymentMethod ?? "N/A"}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${parseFloat(sale?.totalAmount ?? "0").toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No sales found for this date
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Returns Summary Report</CardTitle>
                  <CardDescription>Product returns within date range</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">From:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-returns-start-date"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">To:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-returns-end-date"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(returnsReport?.returns || [], "returns_summary")}
                    data-testid="button-export-returns"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {returnsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Returns</div>
                        <div className="text-2xl font-bold" data-testid="text-total-returns">{returnsReport?.totalReturns ?? 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Refund Amount</div>
                        <div className="text-2xl font-bold">
                          ${(returnsReport?.totalAmount ?? 0).toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {(returnsReport?.reasonSummary ?? []).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Return Reasons Breakdown</h4>
                      <div className="flex flex-wrap gap-2">
                        {(returnsReport?.reasonSummary ?? []).map((rs) => (
                          <Badge key={rs?.returnReason ?? "unknown"} variant="secondary">
                            {rs?.returnReason ?? "Unknown"}: {rs?.count ?? 0} (${parseFloat(rs?.totalAmount ?? "0").toFixed(2)})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Return #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(returnsReport?.returns ?? []).length > 0 ? (
                        (returnsReport?.returns ?? []).map((ret) => (
                          <TableRow key={ret?.id ?? 0} data-testid={`row-return-${ret?.id ?? 0}`}>
                            <TableCell className="font-medium">{ret?.returnNumber ?? "N/A"}</TableCell>
                            <TableCell>{ret?.customerName ?? "N/A"}</TableCell>
                            <TableCell>{ret?.returnReason ?? "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={ret?.status === "completed" ? "default" : "secondary"}>
                                {ret?.status ?? "unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>{safeFormatDate(ret?.createdAt, "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${parseFloat(ret?.totalAmount ?? "0").toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No returns found for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="item-wise" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Item-wise Sales Report</CardTitle>
                  <CardDescription>Sales breakdown by product</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">From:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-item-start-date"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">To:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-item-end-date"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(itemWiseReport || [], "item_wise_sales")}
                    data-testid="button-export-item-wise"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right"># Sales</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itemWiseReport ?? []).length > 0 ? (
                      (itemWiseReport ?? []).map((item) => (
                        <TableRow key={item?.item_id ?? 0} data-testid={`row-item-${item?.item_id ?? 0}`}>
                          <TableCell className="font-medium">{item?.item_name ?? "Unknown"}</TableCell>
                          <TableCell className="text-muted-foreground">{item?.sku ?? "N/A"}</TableCell>
                          <TableCell>{item?.brand_name ?? "N/A"}</TableCell>
                          <TableCell className="text-right">{item?.total_quantity_sold ?? 0}</TableCell>
                          <TableCell className="text-right">{item?.number_of_sales ?? 0}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${parseFloat(item?.total_sales_amount ?? "0").toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No sales data found for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacist-activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Pharmacist Activity Report</CardTitle>
                  <CardDescription>Staff performance summary</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">From:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-activity-start-date"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">To:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-activity-end-date"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(activityReport || [], "pharmacist_activity")}
                    data-testid="button-export-activity"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacist</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Returns</TableHead>
                      <TableHead className="text-right">Total Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityReport?.length ? (
                      activityReport.map((activity) => (
                        <TableRow key={activity.pharmacistId} data-testid={`row-pharmacist-${activity.pharmacistId}`}>
                          <TableCell className="font-medium">
                            {activity.firstName} {activity.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{activity.email}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{activity.salesCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{activity.returnsCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{activity.totalActions}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No activity data found for this period
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
