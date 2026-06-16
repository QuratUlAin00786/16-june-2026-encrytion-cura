import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Key,
  Phone,
  Shield,
  Edit,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TwilioStatus {
  configured: boolean;
  phoneNumber: string | null;
  accountSid: string | null;
  authToken: string | null;
  isConfigured: boolean;
  balance?: string;
  status?: string;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  whatsappNumber?: string;
  error?: string;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
}

export function TwilioWhatsAppConfigCard() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configTab, setConfigTab] = useState("sms");
  const [configForm, setConfigForm] = useState<TwilioConfig>({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    whatsappNumber: "",
    smsEnabled: true,
    whatsappEnabled: false,
  });

  const { data: twilioStatus, isLoading } = useQuery<TwilioStatus>({
    queryKey: ['/api/integrations/twilio/status'],
  });

  const { data: twilioConfig } = useQuery<TwilioStatus>({
    queryKey: ['/api/messaging/twilio-config'],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/twilio/test');
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
          description: `Twilio account verified. Balance: ${data.balance || 'N/A'}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Twilio",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/twilio/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/twilio-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Twilio connection",
        variant: "destructive",
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config: Partial<TwilioConfig>) => {
      const response = await apiRequest('POST', '/api/integrations/twilio/configure', config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Twilio SMS & WhatsApp settings have been updated successfully.",
      });
      setIsConfigDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/twilio/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/twilio-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save Twilio configuration",
        variant: "destructive",
      });
    },
  });

  const toggleSMSMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('POST', '/api/integrations/twilio/sms/toggle', { enabled });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle SMS');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "SMS Enabled" : "SMS Disabled",
        description: `SMS messaging has been ${data.enabled ? 'enabled' : 'disabled'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/twilio/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error.message || "Failed to toggle SMS",
        variant: "destructive",
      });
    },
  });

  const toggleWhatsAppMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('POST', '/api/integrations/twilio/whatsapp/toggle', { enabled });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle WhatsApp');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "WhatsApp Enabled" : "WhatsApp Disabled",
        description: `WhatsApp messaging has been ${data.enabled ? 'enabled' : 'disabled'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/twilio/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error.message || "Failed to toggle WhatsApp",
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

  const handleOpenConfigDialog = () => {
    setConfigForm({
      accountSid: "",
      authToken: "",
      phoneNumber: twilioConfig?.phoneNumber || "",
      whatsappNumber: twilioStatus?.whatsappNumber || "",
      smsEnabled: twilioStatus?.smsEnabled !== false,
      whatsappEnabled: twilioStatus?.whatsappEnabled || false,
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    const configToSave: Partial<TwilioConfig> = {};
    
    if (configForm.accountSid) configToSave.accountSid = configForm.accountSid;
    if (configForm.authToken) configToSave.authToken = configForm.authToken;
    if (configForm.phoneNumber) configToSave.phoneNumber = configForm.phoneNumber;
    if (configForm.whatsappNumber) configToSave.whatsappNumber = configForm.whatsappNumber;
    configToSave.smsEnabled = configForm.smsEnabled;
    configToSave.whatsappEnabled = configForm.whatsappEnabled;
    
    saveConfigMutation.mutate(configToSave);
  };

  if (isLoading) {
    return (
      <Card data-testid="card-twilio-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = twilioConfig?.isConfigured || twilioStatus?.configured || false;
  const smsEnabled = Boolean(twilioStatus?.smsEnabled);
  const whatsappEnabled = Boolean(twilioStatus?.whatsappEnabled);

  return (
    <Card data-testid="card-twilio-config">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Twilio SMS & WhatsApp</CardTitle>
              <CardDescription>Send messages via SMS and WhatsApp</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isConfigured ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">
                <Key className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
            {smsEnabled && isConfigured && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <MessageSquare className="h-3 w-3 mr-1" />
                SMS
              </Badge>
            )}
            {whatsappEnabled && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <MessageCircle className="h-3 w-3 mr-1" />
                WhatsApp
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <Label>Account SID</Label>
            </div>
            {twilioConfig?.accountSid ? (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {twilioConfig.accountSid}
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
              <Label>Auth Token</Label>
            </div>
            {twilioConfig?.authToken ? (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  ****...****
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
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label>SMS Phone Number</Label>
            </div>
            {twilioConfig?.phoneNumber ? (
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {twilioConfig.phoneNumber}
              </code>
            ) : (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Missing
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <Label>WhatsApp Number</Label>
            </div>
            {twilioStatus?.whatsappNumber ? (
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {twilioStatus.whatsappNumber}
              </code>
            ) : (
              <span className="text-sm text-muted-foreground">Not configured</span>
            )}
          </div>

          {twilioStatus?.balance && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label>Account Balance</Label>
              </div>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {twilioStatus.balance}
              </code>
            </div>
          )}

          {twilioStatus?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Connection Error</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{twilioStatus.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isConfigured && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Setup Instructions</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Go to your Twilio Console and get your credentials</li>
              <li>Click "Configure" below to enter your settings</li>
              <li>Add your Twilio phone number for SMS messaging</li>
              <li>Optionally add a WhatsApp-enabled number</li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch 
              checked={smsEnabled}
              disabled={!isConfigured}
              onCheckedChange={(checked) => toggleSMSMutation.mutate(checked)}
              data-testid="switch-twilio-sms-enabled"
            />
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">SMS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={whatsappEnabled}
              disabled={!isConfigured}
              onCheckedChange={(checked) => toggleWhatsAppMutation.mutate(checked)}
              data-testid="switch-twilio-whatsapp-enabled"
            />
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenConfigDialog}
                data-testid="button-twilio-configure"
              >
                <Edit className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Configure Twilio SMS & WhatsApp</DialogTitle>
              </DialogHeader>
              <Tabs value={configTab} onValueChange={setConfigTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sms">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    SMS Settings
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    WhatsApp Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="sms" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountSid">Account SID</Label>
                    <Input
                      id="accountSid"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={configForm.accountSid}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, accountSid: e.target.value }))}
                      data-testid="input-twilio-account-sid"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to keep existing value</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="authToken">Auth Token</Label>
                    <Input
                      id="authToken"
                      type="password"
                      placeholder="Enter new auth token"
                      value={configForm.authToken}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, authToken: e.target.value }))}
                      data-testid="input-twilio-auth-token"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to keep existing value</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">SMS Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+1234567890"
                      value={configForm.phoneNumber}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      data-testid="input-twilio-phone"
                    />
                    <p className="text-xs text-muted-foreground">Your Twilio phone number for sending SMS</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      id="smsEnabled"
                      checked={configForm.smsEnabled}
                      onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, smsEnabled: checked }))}
                      data-testid="switch-config-sms-enabled"
                    />
                    <Label htmlFor="smsEnabled">Enable SMS Messaging</Label>
                  </div>
                </TabsContent>
                
                <TabsContent value="whatsapp" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Phone Number</Label>
                    <Input
                      id="whatsappNumber"
                      placeholder="+1234567890"
                      value={configForm.whatsappNumber}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      data-testid="input-twilio-whatsapp"
                    />
                    <p className="text-xs text-muted-foreground">Your Twilio WhatsApp-enabled phone number</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      id="whatsappEnabled"
                      checked={configForm.whatsappEnabled}
                      onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, whatsappEnabled: checked }))}
                      data-testid="switch-config-whatsapp-enabled"
                    />
                    <Label htmlFor="whatsappEnabled">Enable WhatsApp Messaging</Label>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      WhatsApp requires a Twilio-approved WhatsApp Business number. 
                      Visit the Twilio Console to set up WhatsApp messaging.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  data-testid="button-twilio-save-config"
                >
                  {saveConfigMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Save Configuration
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={!isConfigured || isTesting}
            data-testid="button-twilio-test"
          >
            {isTesting ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Test
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://console.twilio.com', '_blank')}
            data-testid="button-twilio-console"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Console
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Twilio handles SMS and WhatsApp messaging securely. Your credentials are encrypted and stored safely.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default TwilioWhatsAppConfigCard;
