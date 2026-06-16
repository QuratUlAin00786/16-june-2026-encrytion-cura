import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { 
  Building2,
  RefreshCw, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  PoundSterling,
  Calendar,
  Activity,
  TrendingUp,
  Download,
  Upload,
  Link2,
  Unlink,
  Loader2,
  RotateCcw
} from "lucide-react";

// Types
interface QuickBooksConnection {
  id: number;
  organizationId: number;
  companyId: string;
  companyName: string;
  realmId: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncSettings: {
    autoSync?: boolean;
    syncIntervalHours?: number;
    syncCustomers?: boolean;
    syncInvoices?: boolean;
    syncPayments?: boolean;
    syncItems?: boolean;
    syncAccounts?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: number;
  syncType: string;
  operation: string;
  status: 'pending' | 'success' | 'failed' | 'partial';
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  createdAt: string;
}

interface CustomerMapping {
  id: number;
  patientId: number;
  quickbooksCustomerId: string;
  quickbooksDisplayName?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAt?: string;
  errorMessage?: string;
}

interface InvoiceMapping {
  id: number;
  emrInvoiceId: string;
  quickbooksInvoiceId: string;
  quickbooksInvoiceNumber?: string;
  patientId: number;
  amount: string;
  status: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAt?: string;
  errorMessage?: string;
}

export default function QuickBooks() {
  const { currencySymbol } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<QuickBooksConnection | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Listen for QuickBooks OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[QB FRONTEND] Received postMessage:', event.data);
      
      // Direct message from popup window
      if (event.data && event.data.type === 'quickbooks-connected') {
        console.log('[QB FRONTEND] QuickBooks connected! Realm ID:', event.data.realmId);
        toast({
          title: "QuickBooks Connected",
          description: "Successfully connected to QuickBooks!",
        });
        // Refresh connections list
        queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
      }
      
      // Handle wrapped message from dev tools (Eruda/Replit debugging)
      if (event.data && event.data.type === 'forward-log' && event.data.message) {
        try {
          const parsedMessage = JSON.parse(event.data.message);
          if (Array.isArray(parsedMessage) && parsedMessage.length > 1) {
            const actualData = parsedMessage[1];
            if (typeof actualData === 'object' && actualData.type === 'quickbooks-connected') {
              console.log('[QB FRONTEND] QuickBooks connected (via wrapped message)! Realm ID:', actualData.realmId);
              toast({
                title: "QuickBooks Connected",
                description: "Successfully connected to QuickBooks!",
              });
              queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
              queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
            }
          }
        } catch (e) {
          // Ignore parse errors from non-QB messages
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient, toast]);

  // Fetch QuickBooks connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<QuickBooksConnection[]>({
    queryKey: ['/api/quickbooks/connections'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active connection
  const { data: activeConnection, isLoading: activeConnectionLoading, error: activeConnectionError } = useQuery<QuickBooksConnection>({
    queryKey: ['/api/quickbooks/connection/active'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      try {
        const res = await fetch('/api/quickbooks/connection/active', {
          credentials: 'include',
          headers
        });
        if (!res.ok) {
          if (res.status === 404) return null;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            throw new Error(errorData.error || errorData.message || 'QuickBooks connection issue please fix');
          } else {
            throw new Error('QuickBooks connection issue please fix');
          }
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await res.json();
        } else {
          throw new Error('QuickBooks connection issue please fix');
        }
      } catch (error: any) {
        // Handle JSON parsing errors
        if (error.message && error.message.includes('JSON')) {
          throw new Error('QuickBooks connection issue please fix');
        }
        throw error;
      }
    },
    retry: false,
    refetchInterval: 30000,
  });

  // Debug logging for active connection query
  useEffect(() => {
    console.log('[QB DEBUG] Active connection query state:', {
      isLoading: activeConnectionLoading,
      hasData: !!activeConnection,
      data: activeConnection,
      error: activeConnectionError,
      errorMessage: activeConnectionError?.message || 'none'
    });
    
    if (activeConnectionError) {
      console.error('[QB DEBUG] Full error object:', activeConnectionError);
      let userFriendlyMessage = activeConnectionError?.message || "QuickBooks connection issue please fix";
      if (userFriendlyMessage.includes('JSON') || 
          userFriendlyMessage.includes('<!DOCTYPE') || 
          userFriendlyMessage.includes('Unexpected token')) {
        userFriendlyMessage = "QuickBooks connection issue please fix";
      }
      // Do not show the connection error modal for the generic QuickBooks connection message
      if (userFriendlyMessage !== "QuickBooks connection issue please fix") {
        setErrorMessage(userFriendlyMessage);
        setErrorModalOpen(true);
      }
    }
  }, [activeConnection, activeConnectionLoading, activeConnectionError]);

  // Fetch sync logs
  const { data: syncLogs = [], isLoading: syncLogsLoading } = useQuery<SyncLog[]>({
    queryKey: ['/api/quickbooks/sync-logs'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch customer mappings
  const { data: customerMappings = [] } = useQuery<CustomerMapping[]>({
    queryKey: ['/api/quickbooks/customer-mappings'],
    enabled: !!activeConnection,
  });

  // Fetch invoice mappings
  const { data: invoiceMappings = [] } = useQuery<InvoiceMapping[]>({
    queryKey: ['/api/quickbooks/invoice-mappings'],
    enabled: !!activeConnection,
  });

  // Fetch QuickBooks dashboard data
  const { data: qbCompanyInfo, isLoading: companyInfoLoading } = useQuery<any>({
    queryKey: ['/api/quickbooks/data/company-info'],
    enabled: !!activeConnection,
    retry: false,
  });

  const { data: qbInvoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ['/api/quickbooks/data/invoices'],
    enabled: !!activeConnection,
    retry: false,
  });

  const { data: qbProfitLoss, isLoading: profitLossLoading } = useQuery<any>({
    queryKey: ['/api/quickbooks/data/profit-loss'],
    enabled: !!activeConnection,
    retry: false,
  });

  const { data: qbExpenses = [], isLoading: expensesLoading } = useQuery<any[]>({
    queryKey: ['/api/quickbooks/data/expenses'],
    enabled: !!activeConnection,
    retry: false,
  });

  const { data: qbAccounts = [], isLoading: accountsLoading } = useQuery<any[]>({
    queryKey: ['/api/quickbooks/data/accounts'],
    enabled: !!activeConnection,
    retry: false,
  });

  const { data: qbCustomers = [], isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ['/api/quickbooks/data/customers'],
    enabled: !!activeConnection,
    retry: false,
  });

  // Connect to QuickBooks mutation - opens popup window
  const connectMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/quickbooks/auth/url');
        
        // Check if response is ok before parsing JSON
        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            throw new Error(errorData.error || errorData.message || 'QuickBooks connection issue please fix');
          } else {
            throw new Error('QuickBooks connection issue please fix');
          }
        }
        
        let response;
        try {
          response = await res.json();
        } catch (jsonError: any) {
          // Handle JSON parsing errors
          if (jsonError.message && jsonError.message.includes('JSON')) {
            throw new Error('QuickBooks connection issue please fix');
          }
          throw jsonError;
        }
        
        console.log('[QB FRONTEND] Received OAuth URL response:', response);
        if (response.url) {
          console.log('[QB FRONTEND] Opening OAuth popup window:', response.url);
          // Open popup window for OAuth - avoids CSP iframe blocking
          const width = 600;
          const height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          window.open(
            response.url,
            'quickbooks-oauth',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
          );
        } else {
          console.error('[QB FRONTEND] No URL in response!');
          throw new Error('QuickBooks connection issue please fix');
        }
        return response;
      } catch (error: any) {
        // Handle JSON parsing errors
        if (error.message && (error.message.includes('JSON') || error.message.includes('<!DOCTYPE') || error.message.includes('Unexpected token'))) {
          throw new Error('QuickBooks connection issue please fix');
        }
        throw error;
      }
    },
    onError: (error: any) => {
      console.error('[QB FRONTEND] Error getting OAuth URL:', error);
      let userFriendlyMessage = error.message || "QuickBooks connection issue please fix";
      if (userFriendlyMessage.includes('JSON') || 
          userFriendlyMessage.includes('<!DOCTYPE') || 
          userFriendlyMessage.includes('Unexpected token')) {
        userFriendlyMessage = "QuickBooks connection issue please fix";
      }
      // Do not show the connection error modal for the generic QuickBooks connection message
      if (userFriendlyMessage !== "QuickBooks connection issue please fix") {
        setErrorMessage(userFriendlyMessage);
        setErrorModalOpen(true);
      }
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const res = await apiRequest('DELETE', `/api/quickbooks/connections/${connectionId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from QuickBooks.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect from QuickBooks",
        variant: "destructive",
      });
    },
  });

  // Update connection settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ connectionId, settings }: { connectionId: number; settings: any }) => {
      const res = await apiRequest('PATCH', `/api/quickbooks/connections/${connectionId}`, { syncSettings: settings });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
      toast({
        title: "Settings Updated",
        description: "QuickBooks sync settings have been updated.",
      });
      setSettingsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Manual sync mutations
  const syncCustomersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/quickbooks/sync/customers');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
      toast({ title: "Customer Sync Initiated", description: "Customer synchronization has started." });
    },
  });

  const syncInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/quickbooks/sync/invoices');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
      toast({ title: "Invoice Sync Initiated", description: "Invoice synchronization has started." });
    },
  });

  const syncPaymentsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/quickbooks/sync/payments');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
      toast({ title: "Payment Sync Initiated", description: "Payment synchronization has started." });
    },
  });

  // Get status color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Pending</Badge>;
      case 'partial':
        return <Badge variant="outline" className="text-yellow-800 border-yellow-300"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-100 text-green-800">Synced</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Connection Status Component
  const ConnectionStatus = () => {
    if (activeConnectionLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking connection status...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!activeConnection) {
      return (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Not Connected to QuickBooks</h3>
            <p className="text-gray-600 mb-4">
              Connect your QuickBooks account to sync financial data and automate your accounting workflow.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button 
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                data-testid="button-connect-quickbooks"
              >
                {connectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Connect to QuickBooks
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
                }}
                data-testid="button-refresh-data"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <h3 className="font-semibold text-green-900">Connected to QuickBooks</h3>
                <p className="text-sm text-green-700">
                  Company: {activeConnection.companyName} | 
                  Last Sync: {activeConnection.lastSyncAt ? new Date(activeConnection.lastSyncAt).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedConnection(activeConnection);
                  setSettingsDialogOpen(true);
                }}
                data-testid="button-quickbooks-settings"
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate(activeConnection.id)}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect-quickbooks"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 mr-1" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Sync Actions Component
  const SyncActions = () => {
    if (!activeConnection) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RotateCcw className="w-5 h-5 mr-2" />
            Manual Synchronization
          </CardTitle>
          <CardDescription>
            Manually trigger synchronization between your EMR and QuickBooks data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => syncCustomersMutation.mutate()}
              disabled={syncCustomersMutation.isPending}
              data-testid="button-sync-customers"
            >
              {syncCustomersMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Sync Customers
            </Button>
            <Button
              variant="outline"
              onClick={() => syncInvoicesMutation.mutate()}
              disabled={syncInvoicesMutation.isPending}
              data-testid="button-sync-invoices"
            >
              {syncInvoicesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Sync Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => syncPaymentsMutation.mutate()}
              disabled={syncPaymentsMutation.isPending}
              data-testid="button-sync-payments"
            >
              {syncPaymentsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Sync Payments
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Sync Logs Component
  const SyncLogsTable = () => {
    if (syncLogsLoading) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Loading sync logs...
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Sync Activity
          </CardTitle>
          <CardDescription>
            Monitor synchronization status and results between EMR and QuickBooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sync activity found. Start by running a manual sync above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.slice(0, 10).map((log) => (
                  <TableRow key={log.id} data-testid={`sync-log-${log.id}`}>
                    <TableCell className="font-medium">{log.syncType}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Processed: {log.recordsProcessed}</div>
                        {log.recordsSuccessful > 0 && (
                          <div className="text-green-600">Success: {log.recordsSuccessful}</div>
                        )}
                        {log.recordsFailed > 0 && (
                          <div className="text-red-600">Failed: {log.recordsFailed}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.endTime ? (
                        `${Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000)}s`
                      ) : (
                        'In progress'
                      )}
                    </TableCell>
                    <TableCell>{new Date(log.startTime).toLocaleString()}</TableCell>
                    <TableCell>
                      {log.errorMessage && (
                        <Button variant="ghost" size="sm" data-testid={`button-view-error-${log.id}`}>
                          View Error
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  // Data Mappings Overview
  const DataMappingsOverview = () => {
    if (!activeConnection) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Customer Mappings
            </CardTitle>
            <CardDescription>
              Patient to QuickBooks customer synchronization status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerMappings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No customer mappings found. Run customer sync to create mappings.
              </div>
            ) : (
              <div className="space-y-3">
                {customerMappings.slice(0, 5).map((mapping) => (
                  <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{mapping.quickbooksDisplayName || `Customer ${mapping.patientId}`}</div>
                      <div className="text-sm text-gray-600">Patient ID: {mapping.patientId}</div>
                    </div>
                    {getSyncStatusBadge(mapping.syncStatus)}
                  </div>
                ))}
                {customerMappings.length > 5 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm">
                      View All ({customerMappings.length} total)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Invoice Mappings
            </CardTitle>
            <CardDescription>
              EMR invoice to QuickBooks invoice synchronization status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceMappings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No invoice mappings found. Run invoice sync to create mappings.
              </div>
            ) : (
              <div className="space-y-3">
                {invoiceMappings.slice(0, 5).map((mapping) => (
                  <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{mapping.quickbooksInvoiceNumber || mapping.quickbooksInvoiceId}</div>
                      <div className="text-sm text-gray-600">
                        EMR: {mapping.emrInvoiceId} | Amount: ${mapping.amount}
                      </div>
                    </div>
                    {getSyncStatusBadge(mapping.syncStatus)}
                  </div>
                ))}
                {invoiceMappings.length > 5 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm">
                      View All ({invoiceMappings.length} total)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Settings Dialog Component
  const SettingsDialog = () => {
    const [settings, setSettings] = useState(selectedConnection?.syncSettings || {});

    useEffect(() => {
      if (selectedConnection) {
        setSettings(selectedConnection.syncSettings || {});
      }
    }, [selectedConnection]);

    const handleSaveSettings = () => {
      if (!selectedConnection) return;
      updateSettingsMutation.mutate({
        connectionId: selectedConnection.id,
        settings,
      });
    };

    return (
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QuickBooks Sync Settings</DialogTitle>
            <DialogDescription>
              Configure how your EMR data synchronizes with QuickBooks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-sync">Automatic Synchronization</Label>
              <Switch
                id="auto-sync"
                checked={settings.autoSync || false}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoSync: checked }))
                }
              />
            </div>
            
            <div className="space-y-4">
              <Label>Sync Data Types</Label>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-customers">Customers/Patients</Label>
                <Switch
                  id="sync-customers"
                  checked={settings.syncCustomers !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncCustomers: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-invoices">Invoices</Label>
                <Switch
                  id="sync-invoices"
                  checked={settings.syncInvoices !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncInvoices: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-payments">Payments</Label>
                <Switch
                  id="sync-payments"
                  checked={settings.syncPayments !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncPayments: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-items">Services/Items</Label>
                <Switch
                  id="sync-items"
                  checked={settings.syncItems !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncItems: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-accounts">Chart of Accounts</Label>
                <Switch
                  id="sync-accounts"
                  checked={settings.syncAccounts !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncAccounts: checked }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-full-width page-zoom-90">
      <Header title="QuickBooks Integration" subtitle="Manage your accounting synchronization and financial data integration" />
      
      <div className="w-full px-3 sm:px-4 lg:px-5 py-4">
      <ConnectionStatus />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dashboard">QuickBooks Dashboard</TabsTrigger>
          <TabsTrigger value="sync-activity">Sync Activity</TabsTrigger>
          <TabsTrigger value="data-mappings">Data Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SyncActions />
          
          {activeConnection && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Customer Mappings</p>
                      <p className="text-2xl font-bold" data-testid="text-customer-count">{customerMappings.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Invoice Mappings</p>
                      <p className="text-2xl font-bold" data-testid="text-invoice-count">{invoiceMappings.length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Recent Syncs</p>
                      <p className="text-2xl font-bold" data-testid="text-sync-count">{syncLogs.length}</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {!activeConnection ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Connect to QuickBooks to view dashboard data</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Company Info Card */}
              {companyInfoLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    <p>Loading company information...</p>
                  </CardContent>
                </Card>
              ) : qbCompanyInfo ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Company Name</p>
                        <p className="font-semibold">{qbCompanyInfo.CompanyName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Legal Name</p>
                        <p className="font-semibold">{qbCompanyInfo.LegalName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold">{qbCompanyInfo.Email?.Address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Country</p>
                        <p className="font-semibold">{qbCompanyInfo.Country || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                        <p className="text-2xl font-bold">{qbInvoices.length}</p>
                      </div>
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                        <p className="text-2xl font-bold">{qbExpenses.length}</p>
                      </div>
                      <PoundSterling className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Customers</p>
                        <p className="text-2xl font-bold">{qbCustomers.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Recent Invoices
                  </CardTitle>
                  <CardDescription>Latest invoices from QuickBooks</CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      <p>Loading invoices...</p>
                    </div>
                  ) : qbInvoices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No invoices found in QuickBooks
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qbInvoices.slice(0, 10).map((invoice: any) => (
                          <TableRow key={invoice.Id}>
                            <TableCell className="font-medium">{invoice.DocNumber}</TableCell>
                            <TableCell>{invoice.CustomerRef?.name || 'N/A'}</TableCell>
                            <TableCell>{invoice.TxnDate}</TableCell>
                            <TableCell>{currencySymbol}{invoice.TotalAmt?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>{currencySymbol}{invoice.Balance?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>
                              {invoice.Balance === 0 ? (
                                <Badge className="bg-green-100 text-green-800">Paid</Badge>
                              ) : (
                                <Badge variant="outline">Unpaid</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Recent Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CurrencyIcon className="w-5 h-5 mr-2" />
                    Recent Expenses
                  </CardTitle>
                  <CardDescription>Latest expense transactions from QuickBooks</CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      <p>Loading expenses...</p>
                    </div>
                  ) : qbExpenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No expenses found in QuickBooks
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Payment Type</TableHead>
                          <TableHead>Vendor/Entity</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qbExpenses.slice(0, 10).map((expense: any) => (
                          <TableRow key={expense.Id}>
                            <TableCell className="font-medium">{expense.Id}</TableCell>
                            <TableCell>{expense.TxnDate}</TableCell>
                            <TableCell>{expense.PaymentType || 'N/A'}</TableCell>
                            <TableCell>{expense.EntityRef?.name || 'N/A'}</TableCell>
                            <TableCell>{currencySymbol}{expense.TotalAmt?.toFixed(2) || '0.00'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Chart of Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Chart of Accounts
                  </CardTitle>
                  <CardDescription>Account structure from QuickBooks</CardDescription>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      <p>Loading accounts...</p>
                    </div>
                  ) : qbAccounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No accounts found in QuickBooks
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {qbAccounts.slice(0, 10).map((account: any) => (
                        <div key={account.Id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{account.Name}</p>
                              <p className="text-sm text-gray-600">{account.AccountType}</p>
                            </div>
                            <Badge variant="outline">{account.AccountSubType || 'N/A'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sync-activity" className="space-y-6">
          <SyncLogsTable />
        </TabsContent>

        <TabsContent value="data-mappings" className="space-y-6">
          <DataMappingsOverview />
        </TabsContent>
      </Tabs>

      </div>

      <SettingsDialog />

      {/* Connection Error Modal */}
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Connection Error
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{errorMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setErrorModalOpen(false)} variant="destructive">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}