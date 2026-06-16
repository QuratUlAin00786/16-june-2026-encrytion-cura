import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Zap, 
  Brain, 
  Code, 
  Webhook, 
  Database, 
  Shield, 
  Globe, 
  Palette,
  Bell,
  Users,
  Lock,
  QrCode,
  Mail,
  Smartphone,
  Calendar,
  FileCheck,
  Workflow,
  Settings,
  ChevronRight
} from "lucide-react";

// Advanced Features like semble.io
interface AdvancedFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'automation' | 'integration' | 'security' | 'analytics' | 'communication' | 'compliance';
  enabled: boolean;
  config?: Record<string, any>;
}

const advancedFeatures: AdvancedFeature[] = [
  {
    id: "smart_routing",
    title: "Smart Form Routing",
    description: "Automatically route form responses to appropriate departments based on responses",
    icon: Workflow,
    category: "automation",
    enabled: false,
    config: {
      rules: [],
      defaultRoute: "general"
    }
  },
  {
    id: "conditional_logic",
    title: "Advanced Conditional Logic",
    description: "Show/hide fields based on previous responses with complex logic rules",
    icon: Brain,
    category: "automation",
    enabled: true,
    config: {
      maxDepth: 5,
      allowJavaScript: false
    }
  },
  {
    id: "ai_validation",
    title: "AI-Powered Response Validation",
    description: "Use AI to validate and flag inconsistent or concerning responses",
    icon: Zap,
    category: "automation",
    enabled: true,
    config: {
      confidenceThreshold: 0.8,
      flagSensitiveContent: true
    }
  },
  {
    id: "webhook_integration",
    title: "Webhook Integration",
    description: "Send form data to external systems via webhooks in real-time",
    icon: Webhook,
    category: "integration",
    enabled: false,
    config: {
      endpoints: [],
      retryPolicy: "exponential",
      timeout: 30
    }
  },
  {
    id: "database_sync",
    title: "External Database Sync",
    description: "Synchronize form responses with external databases and CRM systems",
    icon: Database,
    category: "integration",
    enabled: false,
    config: {
      connections: [],
      syncFrequency: "real-time"
    }
  },
  {
    id: "api_access",
    title: "REST API Access",
    description: "Programmatic access to forms and responses via RESTful API",
    icon: Code,
    category: "integration",
    enabled: true,
    config: {
      rateLimit: 1000,
      requireAuth: true
    }
  },
  {
    id: "encryption",
    title: "End-to-End Encryption",
    description: "Encrypt sensitive form data with industry-standard encryption",
    icon: Shield,
    category: "security",
    enabled: true,
    config: {
      algorithm: "AES-256",
      keyRotation: 90
    }
  },
  {
    id: "access_control",
    title: "Role-Based Access Control",
    description: "Fine-grained permissions for form access and response viewing",
    icon: Lock,
    category: "security",
    enabled: true,
    config: {
      roles: ["admin", "manager", "viewer"],
      inheritance: true
    }
  },
  {
    id: "audit_trail",
    title: "Comprehensive Audit Trail",
    description: "Track all form interactions and changes with detailed logging",
    icon: FileCheck,
    category: "security",
    enabled: true,
    config: {
      retentionDays: 2555, // 7 years for medical compliance
      includeIpAddress: true
    }
  },
  {
    id: "analytics_dashboard",
    title: "Advanced Analytics Dashboard",
    description: "Deep insights into form performance and user behavior",
    icon: Settings,
    category: "analytics",
    enabled: true,
    config: {
      realTimeUpdates: true,
      customMetrics: []
    }
  },
  {
    id: "predictive_analytics",
    title: "Predictive Analytics",
    description: "Use machine learning to predict form completion rates and optimize",
    icon: Brain,
    category: "analytics",
    enabled: false,
    config: {
      modelType: "completion_prediction",
      retrainFrequency: "weekly"
    }
  },
  {
    id: "automated_notifications",
    title: "Automated Notifications",
    description: "Send automated emails, SMS, and push notifications based on responses",
    icon: Bell,
    category: "communication",
    enabled: true,
    config: {
      channels: ["email", "sms"],
      templates: []
    }
  },
  {
    id: "multi_language",
    title: "Dynamic Multi-Language Support",
    description: "Automatically translate forms and responses into multiple languages",
    icon: Globe,
    category: "communication",
    enabled: true,
    config: {
      autoDetect: true,
      supportedLanguages: ["en", "es", "fr", "de", "ar"]
    }
  },
  {
    id: "mobile_optimization",
    title: "Mobile App Integration",
    description: "Optimized mobile experience with offline support",
    icon: Smartphone,
    category: "communication",
    enabled: true,
    config: {
      offlineMode: true,
      pushNotifications: true
    }
  },
  {
    id: "hipaa_compliance",
    title: "HIPAA Compliance Suite",
    description: "Complete HIPAA compliance with BAA, encryption, and audit controls",
    icon: Shield,
    category: "compliance",
    enabled: true,
    config: {
      baaRequired: true,
      automaticDeletion: true,
      accessLogging: true
    }
  },
  {
    id: "gdpr_compliance",
    title: "GDPR Compliance Tools",
    description: "Data protection features for EU/UK compliance including right to erasure",
    icon: Users,
    category: "compliance",
    enabled: true,
    config: {
      consentTracking: true,
      dataMinimization: true,
      erasureRequests: true
    }
  }
];

const categoryIcons = {
  automation: Zap,
  integration: Code,
  security: Shield,
  analytics: Settings,
  communication: Bell,
  compliance: FileCheck
};

const categoryColors = {
  automation: "bg-blue-100 text-blue-800",
  integration: "bg-green-100 text-green-800",
  security: "bg-red-100 text-red-800",
  analytics: "bg-purple-100 text-purple-800",
  communication: "bg-yellow-100 text-yellow-800",
  compliance: "bg-indigo-100 text-indigo-800"
};

export function AdvancedFeatures() {
  const [selectedFeature, setSelectedFeature] = useState<AdvancedFeature | null>(null);
  const [features, setFeatures] = useState(advancedFeatures);

  const toggleFeature = (featureId: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, enabled: !feature.enabled }
        : feature
    ));
  };

  const updateFeatureConfig = (featureId: string, config: Record<string, any>) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, config: { ...feature.config, ...config } }
        : feature
    ));
  };

  const getFeaturesByCategory = (category: string) => {
    return features.filter(feature => feature.category === category);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Features</h2>
          <p className="text-gray-600 mt-1">
            Enhance your forms with powerful automation, integrations, and compliance tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-300">
            {features.filter(f => f.enabled).length} of {features.length} enabled
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(categoryIcons).map(([category, Icon]) => {
              const categoryFeatures = getFeaturesByCategory(category);
              const enabledCount = categoryFeatures.filter(f => f.enabled).length;
              
              return (
                <Card key={category}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <h3 className="font-medium capitalize">{category}</h3>
                      </div>
                      <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                        {enabledCount}/{categoryFeatures.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {categoryFeatures.slice(0, 3).map(feature => (
                        <div key={feature.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{feature.title}</span>
                          <div className={`w-2 h-2 rounded-full ${feature.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feature Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Enable AI Validation</h4>
                    <p className="text-sm text-blue-700">Improve data quality with AI-powered response validation</p>
                  </div>
                  <Button size="sm" variant="outline">Enable</Button>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Webhook className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900">Set Up Webhooks</h4>
                    <p className="text-sm text-green-700">Connect your forms to external systems automatically</p>
                  </div>
                  <Button size="sm" variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {Object.entries(categoryIcons).map(([category, CategoryIcon]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CategoryIcon className="h-5 w-5" />
              <h3 className="text-lg font-semibold capitalize">{category} Features</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {getFeaturesByCategory(category).map(feature => {
                const FeatureIcon = feature.icon;
                
                return (
                  <Card key={feature.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <FeatureIcon className={`h-5 w-5 ${feature.enabled ? 'text-green-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{feature.title}</h4>
                            <Badge className={`text-xs ${feature.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {feature.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                        <Switch
                          checked={feature.enabled}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                      
                      {feature.enabled && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedFeature(feature)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Feature Configuration Modal */}
      {selectedFeature && (
        <Card className="fixed inset-4 z-50 bg-white shadow-2xl rounded-lg overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <selectedFeature.icon className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>{selectedFeature.title}</CardTitle>
                  <p className="text-sm text-gray-600">{selectedFeature.description}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setSelectedFeature(null)}>
                ×
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 max-h-96 overflow-y-auto">
            {selectedFeature.id === 'conditional_logic' && (
              <div className="space-y-4">
                <div>
                  <Label>Maximum Logic Depth</Label>
                  <Select defaultValue={selectedFeature.config?.maxDepth?.toString()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 levels</SelectItem>
                      <SelectItem value="5">5 levels</SelectItem>
                      <SelectItem value="10">10 levels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Allow Custom JavaScript</Label>
                  <Switch defaultChecked={selectedFeature.config?.allowJavaScript} />
                </div>
              </div>
            )}
            
            {selectedFeature.id === 'webhook_integration' && (
              <div className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://api.example.com/webhook" />
                </div>
                <div>
                  <Label>Authentication Method</Label>
                  <Select defaultValue="bearer">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Retry Policy</Label>
                  <Select defaultValue={selectedFeature.config?.retryPolicy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Retry</SelectItem>
                      <SelectItem value="linear">Linear Backoff</SelectItem>
                      <SelectItem value="exponential">Exponential Backoff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {selectedFeature.id === 'ai_validation' && (
              <div className="space-y-4">
                <div>
                  <Label>Confidence Threshold</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="1" 
                    defaultValue={selectedFeature.config?.confidenceThreshold} 
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher values mean stricter validation</p>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Flag Sensitive Content</Label>
                  <Switch defaultChecked={selectedFeature.config?.flagSensitiveContent} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-route Concerning Responses</Label>
                  <Switch defaultChecked={false} />
                </div>
              </div>
            )}

            {selectedFeature.id === 'multi_language' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Auto-detect Language</Label>
                  <Switch defaultChecked={selectedFeature.config?.autoDetect} />
                </div>
                <div>
                  <Label>Supported Languages</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { code: 'en', name: 'English' },
                      { code: 'es', name: 'Spanish' },
                      { code: 'fr', name: 'French' },
                      { code: 'de', name: 'German' },
                      { code: 'ar', name: 'Arabic' },
                      { code: 'zh', name: 'Chinese' }
                    ].map(lang => (
                      <div key={lang.code} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          defaultChecked={selectedFeature.config?.supportedLanguages?.includes(lang.code)}
                        />
                        <label className="text-sm">{lang.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedFeature(null)}>
                Cancel
              </Button>
              <Button onClick={() => setSelectedFeature(null)}>
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}