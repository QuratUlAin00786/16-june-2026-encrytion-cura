import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, MessageCircle, Code, BarChart3, Settings, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChatWidget } from '@/components/ChatWidget';

interface ChatbotConfig {
  id: number;
  organizationId: number;
  name: string;
  description: string;
  welcomeMessage: string;
  primaryColor: string;
  isActive: boolean;
  apiKey: string;
  position: 'bottom-right' | 'bottom-left';
  allowedDomains: string[];
}

interface ChatbotSession {
  id: number;
  sessionId: string;
  visitorId: string;
  status: string;
  currentIntent: string;
  extractedPatientName: string;
  extractedPhone: string;
  extractedEmail: string;
  createdAt: string;
}

interface ChatbotAnalytics {
  totalSessions: number;
  completedSessions: number;
  totalMessages: number;
  appointmentsBooked: number;
  prescriptionRequests: number;
  date: string;
}

export default function ChatbotPage() {
  const [activeTab, setActiveTab] = useState('config');
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chatbot config
  const { data: config, isLoading } = useQuery<ChatbotConfig>({
    queryKey: ['/api/chatbot/config'],
    retry: false
  });

  // Fetch chatbot sessions
  const { data: sessions = [] } = useQuery<ChatbotSession[]>({
    queryKey: ['/api/chatbot/sessions'],
    enabled: activeTab === 'sessions'
  });

  // Fetch analytics
  const { data: analytics } = useQuery<ChatbotAnalytics>({
    queryKey: ['/api/chatbot/analytics'],
    enabled: activeTab === 'analytics'
  });

  // Create/update config mutation
  const configMutation = useMutation({
    mutationFn: async (data: Partial<ChatbotConfig>) => {
      const response = await fetch('/api/chatbot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/config'] });
      setSuccessMessage("Configuration saved successfully!");
      setShowSuccessModal(true);
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    }
  });

  const [formData, setFormData] = useState({
    name: 'Healthcare Assistant',
    description: 'AI-powered assistant for appointment booking and prescription requests',
    welcomeMessage: "Hello! I'm here to help you book appointments and request prescriptions. How can I assist you today?",
    primaryColor: '#4A7DFF',
    isActive: true,
    position: 'bottom-right' as const,
    allowedDomains: ['*']
  });

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name || 'Healthcare Assistant',
        description: config.description || 'AI-powered assistant for appointment booking and prescription requests',
        welcomeMessage: config.welcomeMessage || "Hello! I'm here to help you book appointments and request prescriptions. How can I assist you today?",
        primaryColor: config.primaryColor || '#4A7DFF',
        isActive: config.isActive,
        position: config.position || 'bottom-right',
        allowedDomains: config.allowedDomains || ['*']
      });
    }
  }, [config]);

  const handleSave = () => {
    configMutation.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const generateEmbedCode = () => {
    if (!config) return '';
    
    return `<!-- Cura Healthcare Chatbot -->
<script>
(function() {
  // Create chatbot container
  const chatbotContainer = document.createElement('div');
  chatbotContainer.id = 'cura-chatbot';
  document.body.appendChild(chatbotContainer);
  
  // Chatbot configuration
  window.CuraChatbot = {
    organizationId: ${config.organizationId},
    apiKey: '${config.apiKey}',
    title: '${formData.name}',
    primaryColor: '${formData.primaryColor}',
    position: '${formData.position}',
    welcomeMessage: '${formData.welcomeMessage}'
  };
  
  // Load chatbot script
  const script = document.createElement('script');
  script.src = '${window.location.origin}/chatbot-embed.js';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;
  };

  if (isLoading) {
    return <div className="p-4 page-zoom-90">Loading chatbot configuration...</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto page-zoom-90">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">AI Chatbot</h1>
          <p className="text-gray-600">Configure and manage your AI-powered patient assistant</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          {config && (
            <Badge variant={config.isActive ? "default" : "secondary"}>
              {config.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Integration
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chatbot Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Chatbot Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={configMutation.isPending}
                className="w-full"
              >
                {configMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config ? (
                <>
                  <div>
                    <Label>API Key</Label>
                    <div className="flex mt-1">
                      <Input
                        value={config.apiKey}
                        readOnly
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.apiKey)}
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Embed Code</Label>
                    <div className="mt-1">
                      <Textarea
                        value={generateEmbedCode()}
                        readOnly
                        className="font-mono text-sm"
                        rows={15}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateEmbedCode())}
                        className="mt-2"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Embed Code
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Integration Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Copy the embed code above</li>
                      <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                      <li>The chatbot will appear on your website automatically</li>
                      <li>Visitors can start conversations immediately</li>
                    </ol>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Configure your chatbot first to get integration code</p>
                  <Button onClick={() => setActiveTab('config')} className="mt-4">
                    Go to Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Chat Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="border p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{session.status}</Badge>
                          {session.currentIntent && (
                            <Badge variant="secondary">{session.currentIntent}</Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {session.extractedPatientName && (
                        <p className="text-sm"><strong>Patient:</strong> {session.extractedPatientName}</p>
                      )}
                      {session.extractedPhone && (
                        <p className="text-sm"><strong>Phone:</strong> {session.extractedPhone}</p>
                      )}
                      {session.extractedEmail && (
                        <p className="text-sm"><strong>Email:</strong> {session.extractedEmail}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No chat sessions yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analytics?.totalSessions || 0}</div>
                <p className="text-gray-600">Total Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analytics?.appointmentsBooked || 0}</div>
                <p className="text-gray-600">Appointments Booked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analytics?.prescriptionRequests || 0}</div>
                <p className="text-gray-600">Prescription Requests</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Chat Widget Preview */}
      {showPreview && config && (
        <ChatWidget
          organizationId={config.organizationId}
          apiKey={config.apiKey}
          title={formData.name}
          primaryColor={formData.primaryColor}
          position={formData.position}
          welcomeMessage={formData.welcomeMessage}
        />
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}