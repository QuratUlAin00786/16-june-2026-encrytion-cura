import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Key,
  Shield,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StripeStatus {
  configured: boolean;
  connected: boolean;
  hasSecretKey: boolean;
  hasPublishableKey: boolean;
  publishableKey: string | null;
  mode: 'test' | 'live';
  accountId?: string;
  error?: string;
}

export function StripeConfigCard() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);

  const { data: stripeStatus, isLoading, refetch } = useQuery<StripeStatus>({
    queryKey: ['/api/integrations/stripe/status'],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/stripe/test');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test connection');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to Stripe account: ${data.accountId}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Stripe",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/stripe/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Stripe connection",
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      await testConnectionMutation.mutateAsync();
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="card-stripe-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = stripeStatus?.configured || false;
  const isConnected = stripeStatus?.connected || false;
  const mode = stripeStatus?.mode || 'test';

  return (
    <Card data-testid="card-stripe-config">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Stripe Payment Integration</CardTitle>
              <CardDescription>Process payments securely with Stripe</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : isConfigured ? (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Not Verified
              </Badge>
            ) : (
              <Badge variant="outline">
                <Key className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
            <Badge variant={mode === 'live' ? 'default' : 'secondary'}>
              {mode === 'live' ? 'Live' : 'Test'} Mode
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <Label>Publishable Key</Label>
            </div>
            {stripeStatus?.hasPublishableKey ? (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {stripeStatus.publishableKey || 'pk_****...'}
                </code>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Missing
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label>Secret Key</Label>
            </div>
            {stripeStatus?.hasSecretKey ? (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  sk_****...****
                </code>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Missing
              </Badge>
            )}
          </div>

          {stripeStatus?.accountId && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <Label>Account ID</Label>
              </div>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {stripeStatus.accountId}
              </code>
            </div>
          )}

          {stripeStatus?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Connection Error</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{stripeStatus.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isConfigured && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Setup Instructions</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Go to your Stripe Dashboard and get your API keys</li>
              <li>Add <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">STRIPE_PUBLISHABLE_KEY</code> to your secrets</li>
              <li>Add <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">STRIPE_SECRET_KEY</code> to your secrets</li>
              <li>Restart the application to apply the changes</li>
            </ol>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch 
              checked={isConnected}
              disabled={!isConfigured}
              data-testid="switch-stripe-enabled"
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Payments Enabled' : 'Payments Disabled'}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!isConfigured || isTesting}
              data-testid="button-stripe-test"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Test Connection
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://dashboard.stripe.com/apikeys', '_blank')}
              data-testid="button-stripe-dashboard"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Stripe Dashboard
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Stripe handles all payment processing securely. Your API keys are stored as encrypted secrets and never exposed to the frontend.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StripeConfigCard;
