import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle, 
  Save,
  Eye,
  EyeOff,
  Edit,
  RefreshCw,
  XCircle,
  Copy,
  Webhook,
  Link,
  Unlink,
  Building2,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QuickBooksConnection {
  companyName: string;
  realmId: string;
  connectedAt: string;
}

interface QuickBooksStatus {
  configured: boolean;
  isActive?: boolean;
  configuredAt?: string;
  connected?: boolean;
  connection?: QuickBooksConnection | null;
}

export function QuickBooksConfigCard() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: status, isLoading, refetch } = useQuery<QuickBooksStatus>({
    queryKey: ['/api/integrations/quickbooks/status'],
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config: { clientId: string; clientSecret: string }) => {
      const response = await apiRequest('POST', '/api/integrations/quickbooks/config', config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "QuickBooks integration settings have been saved successfully.",
      });
      setClientId("");
      setClientSecret("");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/quickbooks/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save QuickBooks configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({ clientId, clientSecret });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setClientId("");
    setClientSecret("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setClientId("");
    setClientSecret("");
  };

  const handleConnectToQuickBooks = async () => {
    setIsConnecting(true);
    try {
      const response = await apiRequest('GET', '/api/quickbooks/auth/url');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get authorization URL');
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate QuickBooks connection",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await apiRequest('DELETE', '/api/quickbooks/connection/active');
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "QuickBooks company has been disconnected successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations/quickbooks/status'] });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect QuickBooks",
        variant: "destructive",
      });
    }
  };

  const webhookUrl = "https://app.curaemr.ai/api/webhooks/quickbooks";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <Card data-testid="card-quickbooks-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = status?.configured || false;
  const isConnected = status?.connected || false;
  const connection = status?.connection;

  return (
    <Card data-testid="card-quickbooks-config">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                QuickBooks Integration
                <Badge variant="outline" className="text-xs">Accounting</Badge>
              </CardTitle>
              <CardDescription>
                Connect to QuickBooks for accounting and invoicing
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {isConfigured && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Configured
              </Badge>
            )}
            {isConnected ? (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                <Link className="h-3 w-3" />
                Connected
              </Badge>
            ) : isConfigured ? (
              <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-300">
                <XCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Not Configured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="quickbooks-client-id">Client ID</Label>
              <Input
                id="quickbooks-client-id"
                type="text"
                placeholder="Enter QuickBooks Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                data-testid="input-quickbooks-client-id"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quickbooks-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="quickbooks-client-secret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter QuickBooks Client Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  data-testid="input-quickbooks-client-secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                  data-testid="button-toggle-secret"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                data-testid="button-cancel-quickbooks"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
                data-testid="button-save-quickbooks"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Get your Client ID and Secret from the{" "}
              <a 
                href="https://developer.intuit.com/app/developer/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Intuit Developer Dashboard
              </a>
            </p>
          </>
        ) : isConnected && connection ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Connected Company</span>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold" data-testid="text-company-name">
                  {connection.companyName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Realm ID: {connection.realmId}
                </p>
                {connection.connectedAt && (() => {
                  try {
                    const date = new Date(connection.connectedAt);
                    if (!isNaN(date.getTime())) {
                      return (
                        <p className="text-xs text-muted-foreground">
                          Connected on {format(date, 'MMM d, yyyy')}
                        </p>
                      );
                    }
                  } catch {
                    return null;
                  }
                  return null;
                })()}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="flex-1"
                data-testid="button-disconnect-quickbooks"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex-1"
                data-testid="button-edit-quickbooks"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Credentials
              </Button>
            </div>
          </div>
        ) : isConfigured ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Credentials Configured</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Connect to QuickBooks" to authorize access to your QuickBooks company.
              </p>
            </div>
            <Button
              onClick={handleConnectToQuickBooks}
              disabled={isConnecting}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-connect-quickbooks"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to QuickBooks
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
              className="w-full"
              data-testid="button-edit-quickbooks"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Credentials
            </Button>
          </div>
        ) : null}

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Webhook URL</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-xs bg-muted"
              data-testid="input-quickbooks-webhook-url"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyWebhook}
              data-testid="button-copy-webhook"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Add this URL in your QuickBooks Developer portal under Webhooks settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickBooksConfigCard;
