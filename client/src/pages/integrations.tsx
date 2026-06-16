import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus,
  Settings,
  Zap,
  Database,
  Globe,
  Key,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Code,
  Webhook,
  Mail,
  Smartphone,
  Calendar,
  FileText,
  Activity,
  Shield,
  Trash2,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import StripeConfigCard from "@/components/integrations/stripe-config";
import QuickBooksConfigCard from "@/components/integrations/quickbooks-config";
import TwilioWhatsAppConfigCard from "@/components/integrations/twilio-whatsapp-config";
import NHSDigitalConfigCard from "@/components/integrations/nhs-digital-config";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'messaging' | 'clinical' | 'billing' | 'analytics' | 'compliance' | 'workflow';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  provider: string;
  icon: string;
  features: string[];
  lastSync?: string;
  syncFrequency: string;
  config: {
    apiKey?: string;
    webhookUrl?: string;
    settings: Record<string, any>;
  };
  isActive: boolean;
  connectionCount: number;
  errorMessage?: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'error';
  lastTriggered?: string;
  totalCalls: number;
  successRate: number;
  headers: Record<string, string>;
  retryPolicy: 'none' | 'linear' | 'exponential';
  timeout: number;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
  rateLimit: number;
}

export default function IntegrationsPage() {
  const [, setLocation] = useLocation();
  const { canCreate, canEdit, canDelete } = useRolePermissions();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  const { toast } = useToast();

  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['/api/integrations'],
  });

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ['/api/integrations/webhooks'],
  });

  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery({
    queryKey: ['/api/integrations/api-keys'],
  });

  const connectIntegrationMutation = useMutation({
    mutationFn: async (integrationData: any) => {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrationData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setIsConnectionDialogOpen(false);
      toast({
        title: "Integration Connected",
        description: "The integration has been successfully connected.",
      });
    }
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (webhookData: any) => {
      const response = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/webhooks'] });
      setIsWebhookDialogOpen(false);
      toast({
        title: "Webhook Created",
        description: "The webhook has been successfully created.",
      });
    }
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (apiKeyData: any) => {
      const response = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiKeyData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/api-keys'] });
      setIsApiKeyDialogOpen(false);
      toast({
        title: "API Key Created",
        description: "A new API key has been generated.",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending': return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'messaging': return <Mail className="h-5 w-5" />;
      case 'clinical': return <Activity className="h-5 w-5" />;
      case 'billing': return <FileText className="h-5 w-5" />;
      case 'analytics': return <Database className="h-5 w-5" />;
      case 'compliance': return <Shield className="h-5 w-5" />;
      case 'workflow': return <Zap className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      default: return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  const handleConnectIntegration = (category: string) => {
    // Simulate connecting to integration
    connectIntegrationMutation.mutate({
      category,
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Integration`,
      provider: `${category}-provider`,
      status: 'connected'
    });
  };

  // Removed marketplace-related functions

  if (integrationsLoading || webhooksLoading || apiKeysLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 page-zoom-90">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-1">Connect external services and manage API access</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
            {canCreate('integrations') && (
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Integration</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Integration Categories */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleConnectIntegration('messaging')}>
                    <CardContent className="p-4 text-center">
                      <Mail className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <h3 className="font-medium">Messaging</h3>
                      <p className="text-sm text-gray-600 mt-1">SMS, Email, WhatsApp</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleConnectIntegration('clinical')}>
                    <CardContent className="p-4 text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h3 className="font-medium">Clinical</h3>
                      <p className="text-sm text-gray-600 mt-1">HL7, FHIR, Labs</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleConnectIntegration('billing')}>
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <h3 className="font-medium">Billing</h3>
                      <p className="text-sm text-gray-600 mt-1">Payment, Insurance</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleConnectIntegration('analytics')}>
                    <CardContent className="p-4 text-center">
                      <Database className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                      <h3 className="font-medium">Analytics</h3>
                      <p className="text-sm text-gray-600 mt-1">Reports, BI Tools</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleConnectIntegration('compliance')}>
                    <CardContent className="p-4 text-center">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <h3 className="font-medium">Compliance</h3>
                      <p className="text-sm text-gray-600 mt-1">HIPAA, Audit Tools</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleConnectIntegration('workflow')}>
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <h3 className="font-medium">Workflow</h3>
                      <p className="text-sm text-gray-600 mt-1">Automation, APIs</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Popular Integrations */}
                <div>
                  <h3 className="font-medium mb-3">Popular Integrations</h3>
                  <div className="space-y-2">
                    {[
                      { name: "Twilio SMS", category: "messaging", description: "Send SMS notifications and reminders" },
                      { name: "HL7 FHIR", category: "clinical", description: "Exchange clinical data with other systems" },
                      { name: "Stripe Payment", category: "billing", description: "Process patient payments securely" },
                      { name: "Google Analytics", category: "analytics", description: "Track website and app usage" }
                    ].map((integration) => (
                      <div key={integration.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnectIntegration(integration.category);
                          }}
                        >
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connected</p>
                <p className="text-2xl font-bold">
                  {integrations.filter((i: Integration) => i.status === 'connected').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Webhooks</p>
                <p className="text-2xl font-bold">
                  {webhooks.filter((w: Webhook) => w.status === 'active').length}
                </p>
              </div>
              <Webhook className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Keys</p>
                <p className="text-2xl font-bold">
                  {apiKeys.filter((k: ApiKey) => k.isActive).length}
                </p>
              </div>
              <Key className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sync Issues</p>
                <p className="text-2xl font-bold">
                  {integrations.filter((i: Integration) => i.status === 'error').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Payment Integrations</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StripeConfigCard />
              <QuickBooksConfigCard />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Messaging Integrations</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TwilioWhatsAppConfigCard />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Healthcare Integrations</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NHSDigitalConfigCard />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {integrations.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No other integrations configured</h3>
                  <p className="text-sm text-gray-600">Connect external services to enhance your EMR system.</p>
                </CardContent>
              </Card>
            ) : (
              integrations.map((integration: Integration) => (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getCategoryIcon(integration.category)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <p className="text-sm text-gray-600">{integration.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(integration.status)}
                        {getStatusBadge(integration.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Last Sync:</span>
                        <span>{integration.lastSync || 'Never'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Frequency:</span>
                        <span>{integration.syncFrequency}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Connections:</span>
                        <Badge variant="outline">{integration.connectionCount}</Badge>
                      </div>
                      
                      {integration.errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Connection Error</p>
                              <p className="text-sm text-red-600 mt-1">{integration.errorMessage}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.isActive}
                            onCheckedChange={(checked) => {
                              // Handle toggle
                              toast({
                                title: checked ? "Integration Enabled" : "Integration Disabled",
                                description: `${integration.name} has been ${checked ? 'enabled' : 'disabled'}.`,
                              });
                            }}
                          />
                          <span className="text-sm text-gray-600">Active</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Configure
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Webhooks</h3>
              <p className="text-sm text-gray-600">Manage webhook endpoints for real-time notifications.</p>
            </div>
            <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
              {canCreate('integrations') && (
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              )}
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-name">Name</Label>
                    <Input id="webhook-name" placeholder="Webhook name" />
                  </div>
                  <div>
                    <Label htmlFor="webhook-url">URL</Label>
                    <Input id="webhook-url" placeholder="https://example.com/webhook" />
                  </div>
                  <div>
                    <Label htmlFor="webhook-events">Events</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select events" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment.created">Appointment Created</SelectItem>
                        <SelectItem value="patient.updated">Patient Updated</SelectItem>
                        <SelectItem value="prescription.new">New Prescription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsWebhookDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => createWebhookMutation.mutate({})}>
                      Create Webhook
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {webhooks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
                  <p className="text-sm text-gray-600">Create webhooks to receive real-time notifications.</p>
                </CardContent>
              </Card>
            ) : (
              webhooks.map((webhook: Webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Webhook className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{webhook.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{webhook.url}</p>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{event}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(webhook.status)}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        {canDelete('integrations') && (
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Last Triggered:</span>
                        <p className="font-medium">{webhook.lastTriggered || 'Never'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Calls:</span>
                        <p className="font-medium">{webhook.totalCalls.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Success Rate:</span>
                        <p className="font-medium">{webhook.successRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">API Keys</h3>
              <p className="text-sm text-gray-600">Manage API keys for external integrations.</p>
            </div>
            <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
              {canCreate('integrations') && (
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Key
                </Button>
              </DialogTrigger>
              )}
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input id="key-name" placeholder="API key name" />
                  </div>
                  <div>
                    <Label htmlFor="key-permissions">Permissions</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permissions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read Only</SelectItem>
                        <SelectItem value="write">Read & Write</SelectItem>
                        <SelectItem value="admin">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="key-expiry">Expiry Date (Optional)</Label>
                    <Input id="key-expiry" type="date" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => createApiKeyMutation.mutate({})}>
                      Generate Key
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No API keys generated</h3>
                  <p className="text-sm text-gray-600">Generate API keys for external integrations.</p>
                </CardContent>
              </Card>
            ) : (
              apiKeys.map((apiKey: ApiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Key className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{apiKey.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {apiKey.keyPrefix}••••••••••••••••••••••••••••
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {apiKey.permissions.map((permission, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{permission}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {apiKey.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        {canDelete('integrations') && (
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Last Used:</span>
                        <p className="font-medium">{apiKey.lastUsed || 'Never'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Usage Count:</span>
                        <p className="font-medium">{apiKey.usageCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Rate Limit:</span>
                        <p className="font-medium">{apiKey.rateLimit}/hour</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}



