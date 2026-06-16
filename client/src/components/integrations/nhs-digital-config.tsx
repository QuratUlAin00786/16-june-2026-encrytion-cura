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
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Key,
  Shield,
  Edit,
  Heart,
  FileText,
  Users,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NHSStatus {
  configured: boolean;
  isConfigured: boolean;
  asid?: string;
  odsCode?: string;
  pdsEnabled?: boolean;
  epsEnabled?: boolean;
  scrEnabled?: boolean;
  nhsLoginEnabled?: boolean;
  environment?: 'sandbox' | 'integration' | 'production';
  lastTestResult?: string;
  error?: string;
}

interface NHSConfig {
  asid: string;
  odsCode: string;
  apiKey: string;
  privateKey: string;
  pdsEnabled: boolean;
  epsEnabled: boolean;
  scrEnabled: boolean;
  nhsLoginEnabled: boolean;
  environment: 'sandbox' | 'integration' | 'production';
}

export function NHSDigitalConfigCard() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configTab, setConfigTab] = useState("connection");
  const [configForm, setConfigForm] = useState<NHSConfig>({
    asid: "",
    odsCode: "",
    apiKey: "",
    privateKey: "",
    pdsEnabled: false,
    epsEnabled: false,
    scrEnabled: false,
    nhsLoginEnabled: false,
    environment: "sandbox",
  });

  const { data: nhsStatus, isLoading } = useQuery<NHSStatus>({
    queryKey: ['/api/integrations/nhs/status'],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/nhs/test');
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
          description: "NHS Digital Spine connection verified successfully.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to NHS Digital",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/nhs/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test NHS Digital connection",
        variant: "destructive",
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config: Partial<NHSConfig>) => {
      const response = await apiRequest('POST', '/api/integrations/nhs/configure', config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "NHS Digital settings have been updated successfully.",
      });
      setIsConfigDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/nhs/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save NHS Digital configuration",
        variant: "destructive",
      });
    },
  });

  const togglePDSMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('POST', '/api/integrations/nhs/pds/toggle', { enabled });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle PDS');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "PDS Enabled" : "PDS Disabled",
        description: `Patient Demographics Service has been ${data.enabled ? 'enabled' : 'disabled'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/nhs/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error.message || "Failed to toggle PDS",
        variant: "destructive",
      });
    },
  });

  const toggleEPSMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('POST', '/api/integrations/nhs/eps/toggle', { enabled });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle EPS');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "EPS Enabled" : "EPS Disabled",
        description: `Electronic Prescription Service has been ${data.enabled ? 'enabled' : 'disabled'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/nhs/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error.message || "Failed to toggle EPS",
        variant: "destructive",
      });
    },
  });

  const toggleSCRMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('POST', '/api/integrations/nhs/scr/toggle', { enabled });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle SCR');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "SCR Enabled" : "SCR Disabled",
        description: `Summary Care Records has been ${data.enabled ? 'enabled' : 'disabled'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/nhs/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error.message || "Failed to toggle SCR",
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
      asid: "",
      odsCode: "",
      apiKey: "",
      privateKey: "",
      pdsEnabled: nhsStatus?.pdsEnabled || false,
      epsEnabled: nhsStatus?.epsEnabled || false,
      scrEnabled: nhsStatus?.scrEnabled || false,
      nhsLoginEnabled: nhsStatus?.nhsLoginEnabled || false,
      environment: nhsStatus?.environment || "sandbox",
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    const configToSave: Partial<NHSConfig> = {};
    
    if (configForm.asid) configToSave.asid = configForm.asid;
    if (configForm.odsCode) configToSave.odsCode = configForm.odsCode;
    if (configForm.apiKey) configToSave.apiKey = configForm.apiKey;
    if (configForm.privateKey) configToSave.privateKey = configForm.privateKey;
    configToSave.pdsEnabled = configForm.pdsEnabled;
    configToSave.epsEnabled = configForm.epsEnabled;
    configToSave.scrEnabled = configForm.scrEnabled;
    configToSave.nhsLoginEnabled = configForm.nhsLoginEnabled;
    configToSave.environment = configForm.environment;
    
    saveConfigMutation.mutate(configToSave);
  };

  if (isLoading) {
    return (
      <Card data-testid="card-nhs-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = nhsStatus?.isConfigured || nhsStatus?.configured || false;
  const pdsEnabled = nhsStatus?.pdsEnabled || false;
  const epsEnabled = nhsStatus?.epsEnabled || false;
  const scrEnabled = nhsStatus?.scrEnabled || false;

  return (
    <Card data-testid="card-nhs-config">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">NHS Digital</CardTitle>
              <CardDescription>Connect to NHS Spine services</CardDescription>
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
            {pdsEnabled && isConfigured && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Users className="h-3 w-3 mr-1" />
                PDS
              </Badge>
            )}
            {epsEnabled && isConfigured && (
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                <FileText className="h-3 w-3 mr-1" />
                EPS
              </Badge>
            )}
            {scrEnabled && isConfigured && (
              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                <Shield className="h-3 w-3 mr-1" />
                SCR
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
              <Label>ASID (Accredited System ID)</Label>
            </div>
            {nhsStatus?.asid ? (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {nhsStatus.asid}
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
              <Label>ODS Code</Label>
            </div>
            {nhsStatus?.odsCode ? (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {nhsStatus.odsCode}
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
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label>Environment</Label>
            </div>
            <Badge variant={nhsStatus?.environment === 'production' ? 'default' : 'secondary'}>
              {nhsStatus?.environment || 'Not set'}
            </Badge>
          </div>

          {nhsStatus?.lastTestResult && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <Label>Last Test</Label>
              </div>
              <span className="text-sm text-muted-foreground">
                {nhsStatus.lastTestResult}
              </span>
            </div>
          )}

          {nhsStatus?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Connection Error</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{nhsStatus.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isConfigured && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Setup Instructions</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Register with NHS Digital and obtain your ASID</li>
              <li>Get your ODS Code from the NHS Organisation Data Service</li>
              <li>Generate API credentials in the NHS Digital portal</li>
              <li>Click "Configure" to enter your connection details</li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch 
              checked={pdsEnabled}
              disabled={!isConfigured}
              onCheckedChange={(checked) => togglePDSMutation.mutate(checked)}
              data-testid="switch-nhs-pds-enabled"
            />
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">PDS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={epsEnabled}
              disabled={!isConfigured}
              onCheckedChange={(checked) => toggleEPSMutation.mutate(checked)}
              data-testid="switch-nhs-eps-enabled"
            />
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">EPS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={scrEnabled}
              disabled={!isConfigured}
              onCheckedChange={(checked) => toggleSCRMutation.mutate(checked)}
              data-testid="switch-nhs-scr-enabled"
            />
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">SCR</span>
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
                data-testid="button-nhs-configure"
              >
                <Edit className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Configure NHS Digital Integration</DialogTitle>
              </DialogHeader>
              <Tabs value={configTab} onValueChange={setConfigTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="connection">
                    <Key className="h-4 w-4 mr-1" />
                    Connection
                  </TabsTrigger>
                  <TabsTrigger value="services">
                    <Shield className="h-4 w-4 mr-1" />
                    Services
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="connection" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="asid">ASID (Accredited System ID)</Label>
                    <Input
                      id="asid"
                      placeholder="Enter your ASID"
                      value={configForm.asid}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, asid: e.target.value }))}
                      data-testid="input-nhs-asid"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to keep existing value</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="odsCode">ODS Code</Label>
                    <Input
                      id="odsCode"
                      placeholder="e.g., A12345"
                      value={configForm.odsCode}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, odsCode: e.target.value }))}
                      data-testid="input-nhs-ods-code"
                    />
                    <p className="text-xs text-muted-foreground">Your organisation's ODS code</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter API key"
                      value={configForm.apiKey}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      data-testid="input-nhs-api-key"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to keep existing value</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="environment">Environment</Label>
                    <select
                      id="environment"
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      value={configForm.environment}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, environment: e.target.value as 'sandbox' | 'integration' | 'production' }))}
                      data-testid="select-nhs-environment"
                    >
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="integration">Integration</option>
                      <option value="production">Production</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Select the NHS Digital environment</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="services" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="font-medium">Patient Demographics Service (PDS)</Label>
                        <p className="text-xs text-muted-foreground mt-1">Look up and verify patient NHS numbers</p>
                      </div>
                      <Switch
                        checked={configForm.pdsEnabled}
                        onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, pdsEnabled: checked }))}
                        data-testid="switch-config-pds-enabled"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="font-medium">Electronic Prescription Service (EPS)</Label>
                        <p className="text-xs text-muted-foreground mt-1">Send prescriptions electronically to pharmacies</p>
                      </div>
                      <Switch
                        checked={configForm.epsEnabled}
                        onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, epsEnabled: checked }))}
                        data-testid="switch-config-eps-enabled"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="font-medium">Summary Care Records (SCR)</Label>
                        <p className="text-xs text-muted-foreground mt-1">Access patient summary care records</p>
                      </div>
                      <Switch
                        checked={configForm.scrEnabled}
                        onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, scrEnabled: checked }))}
                        data-testid="switch-config-scr-enabled"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="font-medium">NHS Login</Label>
                        <p className="text-xs text-muted-foreground mt-1">Enable patient authentication via NHS Login</p>
                      </div>
                      <Switch
                        checked={configForm.nhsLoginEnabled}
                        onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, nhsLoginEnabled: checked }))}
                        data-testid="switch-config-nhs-login-enabled"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      NHS Digital services require proper accreditation and compliance with NHS data security standards.
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
                  data-testid="button-nhs-save-config"
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
            data-testid="button-nhs-test"
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
            onClick={() => window.open('https://digital.nhs.uk/developer', '_blank')}
            data-testid="button-nhs-portal"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Portal
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>NHS Digital integration enables connection to NHS Spine services for patient data and electronic prescriptions. Ensure your organisation is properly accredited.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default NHSDigitalConfigCard;
