import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FlaskConical, Calendar, Users, Clock, CheckCircle, AlertCircle, Droplet, TestTube, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

interface LabRequest {
  id: number;
  patientId: number;
  testId: string;
  testType: string;
  priority: string;
  orderedAt: string;
  status: string;
  reportStatus: string;
  Lab_Request_Generated: boolean;
  Sample_Collected: boolean;
  notes?: string;
  doctorName?: string;
  patientName?: string;
  // Invoice fields from join
  invoice?: any;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  totalAmount?: string | null;
  invoiceDate?: string | null;
}

function getTenantSubdomain(): string {
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
  return 'demo';
}

export function SampleTakerDashboard() {
  const { currencySymbol } = useCurrency();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{ id: number; currentValue: boolean } | null>(null);
  const [isPaidInvoiceToggle, setIsPaidInvoiceToggle] = useState(false);

  // Filter states for Paid Lab Result Invoices
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSampleCollected, setFilterSampleCollected] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterInvoiceDate, setFilterInvoiceDate] = useState<string>("");

  // Fetch lab results with invoices (joined data)
  const { data: labRequests = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/lab-results/with-invoices"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/lab-results/with-invoices', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    retry: false,
    staleTime: 30000,
  });

  // Fetch patients to get patient names
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
  });

  // Fetch paid lab invoices with joined lab results details
  const { data: paidLabInvoices = [] } = useQuery({
    queryKey: ["/api/invoices/paid-lab-results"],
    queryFn: async () => {
      console.log('[SAMPLE TAKER] Fetching paid lab invoices...');
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('[SAMPLE TAKER] Request headers:', headers);
      
      const response = await fetch('/api/invoices/paid-lab-results', {
        headers,
        credentials: 'include'
      });
      
      console.log('[SAMPLE TAKER] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[SAMPLE TAKER] Received paid lab invoices:', data);
      return Array.isArray(data) ? data : [];
    },
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch collected paid lab invoices (where Sample_Collected = true)
  const { data: collectedPaidLabInvoices = [] } = useQuery({
    queryKey: ["/api/invoices/paid-lab-results", { sampleCollected: true }],
    queryFn: async () => {
      console.log('[SAMPLE TAKER] Fetching collected paid lab invoices...');
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('[SAMPLE TAKER] Request headers:', headers);
      
      const response = await fetch('/api/invoices/paid-lab-results?sampleCollected=true', {
        headers,
        credentials: 'include'
      });
      
      console.log('[SAMPLE TAKER] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[SAMPLE TAKER] Received collected paid lab invoices:', data);
      return Array.isArray(data) ? data : [];
    },
    retry: false,
    staleTime: 30000,
  });

  // Helper function to get patient name
  const getPatientName = (patientId: number) => {
    const patient = Array.isArray(patients) 
      ? patients.find((p: any) => p.id === patientId) 
      : null;
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  // Filter lab requests based on status - show all lab results with invoices where status is NOT paid
  const pendingCollection = labRequests.filter((req: LabRequest) => 
    req.invoiceStatus && req.invoiceStatus !== 'paid'
  );
  const collectedToday = labRequests.filter((req: LabRequest) => 
    req.Sample_Collected === true && 
    new Date(req.orderedAt).toDateString() === new Date().toDateString()
  );
  const allCollected = labRequests.filter((req: LabRequest) => 
    req.Sample_Collected === true
  );
  const urgentRequests = pendingCollection.filter((req: LabRequest) => 
    req.priority === 'urgent' || req.priority === 'stat'
  );
  const totalRequests = labRequests.filter((req: LabRequest) => 
    req.Sample_Collected === false
  );

  // Mutation to mark sample as collected (using existing endpoint)
  const collectSampleMutation = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      return await apiRequest('POST', `/api/lab-results/${data.id}/collect-sample`, {
        body: JSON.stringify({ notes: data.notes }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results/with-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      toast({
        title: "Sample Collected",
        description: "Sample has been marked as collected and ready for testing.",
        variant: "default"
      });
      setShowCollectionDialog(false);
      setSelectedRequest(null);
      setCollectionNotes("");
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Collection Failed",
        description: error.message || "Failed to mark sample as collected.",
        variant: "destructive"
      });
    }
  });

  // Mutation to toggle Sample_Collected status
  const toggleSampleMutation = useMutation({
    mutationFn: async (data: { id: number; sampleCollected: boolean }) => {
      return await apiRequest('PATCH', `/api/lab-results/${data.id}/toggle-sample-collected`, {
        sampleCollected: data.sampleCollected
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results/with-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/paid-lab-results"] });
      
      // Custom message for paid invoice toggles (irreversible action)
      if (isPaidInvoiceToggle && variables.sampleCollected) {
        toast({
          title: "Sample Collected & Locked",
          description: "Sample has been marked as collected. This action cannot be reversed for paid invoices.",
          variant: "default"
        });
        setIsPaidInvoiceToggle(false);
      } else {
        toast({
          title: variables.sampleCollected ? "Sample Collected" : "Sample Uncollected",
          description: variables.sampleCollected 
            ? "Sample has been marked as collected." 
            : "Sample has been marked as not collected.",
          variant: "default"
        });
      }
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update sample collection status.",
        variant: "destructive"
      });
      setIsPaidInvoiceToggle(false); // Reset flag on error
    }
  });

  const handleCollectSample = (request: LabRequest) => {
    setSelectedRequest(request);
    setShowCollectionDialog(true);
  };

  const handleConfirmCollection = () => {
    if (selectedRequest) {
      collectSampleMutation.mutate({
        id: selectedRequest.id,
        notes: collectionNotes
      });
    }
  };

  const handleToggleSampleCollected = (id: number, currentValue: boolean) => {
    toggleSampleMutation.mutate({
      id,
      sampleCollected: !currentValue
    });
  };

  // Separate handler for paid lab invoices with confirmation dialog
  const handlePaidInvoiceToggle = (id: number, currentValue: boolean) => {
    // If already collected, don't allow toggling (uneditable once collected)
    if (currentValue) {
      return;
    }
    
    // Show confirmation dialog before marking as collected
    setPendingToggle({ id, currentValue });
    setIsPaidInvoiceToggle(true);
    setShowConfirmDialog(true);
  };

  const confirmToggleSample = () => {
    if (pendingToggle) {
      toggleSampleMutation.mutate({
        id: pendingToggle.id,
        sampleCollected: !pendingToggle.currentValue
      });
    }
    setShowConfirmDialog(false);
    setPendingToggle(null);
  };

  const cancelToggleSample = () => {
    setShowConfirmDialog(false);
    setPendingToggle(null);
    setIsPaidInvoiceToggle(false);
  };

  // Apply filters to paid lab invoices
  const filteredPaidLabInvoices = paidLabInvoices.filter((invoice: any) => {
    // Filter by status
    if (filterStatus !== "all" && invoice.invoiceStatus !== filterStatus) {
      return false;
    }

    // Filter by sample collected
    if (filterSampleCollected === "collected" && !invoice.Sample_Collected) {
      return false;
    }
    if (filterSampleCollected === "not_collected" && invoice.Sample_Collected) {
      return false;
    }

    // Unified search filter (searches Invoice #, Patient, and Test ID)
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      const patientName = `${invoice.patientFirstName || ''} ${invoice.patientLastName || ''}`.toLowerCase();
      const invoiceNumber = invoice.invoiceNumber.toLowerCase();
      const testId = invoice.testId.toLowerCase();
      
      const matchesSearch = 
        invoiceNumber.includes(searchLower) ||
        patientName.includes(searchLower) ||
        testId.includes(searchLower);
      
      if (!matchesSearch) {
        return false;
      }
    }

    // Filter by invoice date
    if (filterInvoiceDate) {
      const invoiceDate = new Date(invoice.invoiceDate).toISOString().split('T')[0];
      if (invoiceDate !== filterInvoiceDate) {
        return false;
      }
    }

    return true;
  });

  const sampleTakerCards = [
    {
      title: "Pending Collection",
      value: pendingCollection.length.toString(),
      description: "Lab requests awaiting sample",
      icon: FlaskConical,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    },
    {
      title: "Urgent Requests",
      value: urgentRequests.length.toString(),
      description: "Priority collections needed",
      icon: AlertCircle,
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    },
    {
      title: "Collected Today",
      value: collectedToday.length.toString(),
      description: "Samples processed today",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    },
    {
      title: "Total Requests",
      value: totalRequests.length.toString(),
      description: "All lab requests",
      icon: TestTube,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sample Taker Dashboard</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage laboratory sample collection and specimen processing
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sampleTakerCards.map((card) => (
          <Card key={card.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paid Lab Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Paid Lab Result Invoices</CardTitle>
          <CardDescription>All paid invoices for lab results with complete details from both invoices and lab results tables</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" data-testid="filter-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sample Collected Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-sample-collected" className="text-sm font-medium">Sample Collected</Label>
                <Select value={filterSampleCollected} onValueChange={setFilterSampleCollected}>
                  <SelectTrigger id="filter-sample-collected" data-testid="filter-sample-collected">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="not_collected">Not Collected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-invoice-date" className="text-sm font-medium">Invoice Date</Label>
                <Input
                  id="filter-invoice-date"
                  type="date"
                  value={filterInvoiceDate}
                  onChange={(e) => setFilterInvoiceDate(e.target.value)}
                  data-testid="filter-invoice-date"
                  className="w-full"
                />
              </div>

              {/* Unified Search - Invoice #, Patient, Test ID */}
              <div className="space-y-2">
                <Label htmlFor="filter-search" className="text-sm font-medium">Search (Invoice # / Patient / Test ID)</Label>
                <Input
                  id="filter-search"
                  type="text"
                  placeholder="Search by Invoice #, Patient Name, or Test ID"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  data-testid="filter-search"
                  className="w-full"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterSampleCollected("all");
                  setFilterSearch("");
                  setFilterInvoiceDate("");
                }}
                data-testid="clear-filters"
              >
                Clear All Filters
              </Button>
            </div>
          </div>

          {paidLabInvoices.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No paid lab invoices found</p>
            </div>
          ) : filteredPaidLabInvoices.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invoices match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice #</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Patient</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Test ID</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Test Type</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Sample Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaidLabInvoices.map((invoice: any) => (
                    <tr 
                      key={invoice.invoiceId} 
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="p-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                        {invoice.patientFirstName && invoice.patientLastName 
                          ? `${invoice.patientFirstName} ${invoice.patientLastName}` 
                          : 'Unknown Patient'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {invoice.testId}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {invoice.testType}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {currencySymbol}{invoice.totalAmount}
                      </td>
                      <td className="p-3">
                        <Badge variant="default" className="text-xs bg-green-600 dark:bg-green-700">
                          {invoice.invoiceStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {invoice.Sample_Collected ? (
                          <Badge variant="default" className="text-xs bg-green-600 dark:bg-green-700">
                            Collected
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={invoice.Sample_Collected || false}
                              onCheckedChange={() => {
                                const labResultId = labRequests.find((lr: LabRequest) => lr.testId === invoice.testId)?.id;
                                if (labResultId) {
                                  handlePaidInvoiceToggle(labResultId, invoice.Sample_Collected || false);
                                }
                              }}
                              data-testid={`toggle-sample-${invoice.testId}`}
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              No
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collected Paid Lab Results */}
      <Card>
        <CardHeader>
          <CardTitle>Collected Paid Lab Results</CardTitle>
          <CardDescription>Paid lab invoices where samples have been collected (Sample_Collected = true)</CardDescription>
        </CardHeader>
        <CardContent>
          {collectedPaidLabInvoices.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No collected paid lab invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice #</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Patient</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Test ID</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Test Type</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Doctor</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Sample Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedPaidLabInvoices.map((invoice: any) => (
                    <tr 
                      key={invoice.invoiceId} 
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="p-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                        {invoice.patientFirstName && invoice.patientLastName 
                          ? `${invoice.patientFirstName} ${invoice.patientLastName}` 
                          : 'Unknown Patient'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {invoice.testId}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {invoice.testType}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {currencySymbol}{invoice.totalAmount}
                      </td>
                      <td className="p-3">
                        <Badge variant="default" className="text-xs bg-green-600 dark:bg-green-700">
                          {invoice.invoiceStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {invoice.doctorName || 'N/A'}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={invoice.priority === 'urgent' || invoice.priority === 'stat' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {invoice.priority?.toUpperCase() || 'ROUTINE'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="default" className="text-xs bg-green-600 dark:bg-green-700">
                          Collected
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Collect Sample</DialogTitle>
            <DialogDescription>
              Mark this sample as collected and ready for testing
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient</Label>
                  <p className="font-medium">{getPatientName(selectedRequest.patientId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Test ID</Label>
                  <p className="font-medium">{selectedRequest.testId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Test Type</Label>
                  <p className="font-medium">{selectedRequest.testType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority</Label>
                  <Badge variant={selectedRequest.priority === 'urgent' || selectedRequest.priority === 'stat' ? 'destructive' : 'default'}>
                    {selectedRequest.priority?.toUpperCase() || 'ROUTINE'}
                  </Badge>
                </div>
                {selectedRequest.invoiceNumber && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoice Number</Label>
                      <p className="font-medium">{selectedRequest.invoiceNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount</Label>
                      <p className="font-medium">£{selectedRequest.totalAmount}</p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="collection-notes">Collection Notes (Optional)</Label>
                <Textarea
                  id="collection-notes"
                  placeholder="Add any notes about the specimen collection (e.g., blood from left arm, fasting sample, etc.)"
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCollectionDialog(false);
                setSelectedRequest(null);
                setCollectionNotes("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmCollection}
              disabled={collectSampleMutation.isPending}
              data-testid="confirm-collection-button"
            >
              {collectSampleMutation.isPending ? "Collecting..." : "Confirm Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Sample Collection */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sample Collection Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Have you taken the sample?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelToggleSample}>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleSample}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
