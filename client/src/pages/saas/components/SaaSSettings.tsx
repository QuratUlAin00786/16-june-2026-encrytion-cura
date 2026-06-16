import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saasApiRequest, saasQueryFn } from '@/lib/saasApiClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Shield, 
  Mail, 
  Database,
  Key,
  Globe,
  Save,
  RotateCcw
} from 'lucide-react';

export default function SaaSSettings() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch SaaS settings with proper authentication
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/saas/settings'],
    queryFn: async () => {
      const token = localStorage.getItem('saasToken');
      const response = await fetch('/api/saas/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      return response.json();
    },
  });

  const [formData, setFormData] = useState({
    systemSettings: {
      platformName: settings?.systemSettings?.platformName || 'Cura EMR Platform',
      supportEmail: settings?.systemSettings?.supportEmail || 'support@curaemr.ai',
      maintenanceMode: settings?.systemSettings?.maintenanceMode || false,
      registrationEnabled: settings?.systemSettings?.registrationEnabled || true,
      trialPeriodDays: settings?.systemSettings?.trialPeriodDays || 14,
    },
    emailSettings: {
      smtpHost: settings?.emailSettings?.smtpHost || '',
      smtpPort: settings?.emailSettings?.smtpPort || 587,
      smtpUsername: settings?.emailSettings?.smtpUsername || '',
      smtpPassword: settings?.emailSettings?.smtpPassword || '',
      fromEmail: settings?.emailSettings?.fromEmail || '',
      fromName: settings?.emailSettings?.fromName || 'Cura Software Limited',
    },
    securitySettings: {
      passwordMinLength: settings?.securitySettings?.passwordMinLength || 8,
      requireTwoFactor: settings?.securitySettings?.requireTwoFactor || false,
      sessionTimeoutMinutes: settings?.securitySettings?.sessionTimeoutMinutes || 30,
      maxLoginAttempts: settings?.securitySettings?.maxLoginAttempts || 5,
    },
    billingSettings: {
      currency: settings?.billingSettings?.currency || 'GBP',
      taxRate: settings?.billingSettings?.taxRate || 20,
      invoicePrefix: settings?.billingSettings?.invoicePrefix || 'CURA',
      paymentMethods: settings?.billingSettings?.paymentMethods || ['stripe', 'paypal'],
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await saasApiRequest('PUT', '/api/saas/settings', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/settings'] });
      setSuccessMessage("System settings have been updated successfully");
      setShowSuccessModal(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await saasApiRequest('POST', '/api/saas/settings/test-email', {});
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage("Test email sent successfully");
      setShowSuccessModal(true);
    },
    onError: () => {
      toast({
        title: "Email Test Failed",
        description: "Failed to send test email. Check your email settings.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const resetToDefaults = () => {
    setFormData({
      systemSettings: {
        platformName: 'Cura EMR Platform',
        supportEmail: 'support@curaemr.ai',
        maintenanceMode: false,
        registrationEnabled: true,
        trialPeriodDays: 14,
      },
      emailSettings: {
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: 'Cura Software Limited',
      },
      securitySettings: {
        passwordMinLength: 8,
        requireTwoFactor: false,
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
      },
      billingSettings: {
        currency: 'GBP',
        taxRate: 20,
        invoicePrefix: 'CURA',
        paymentMethods: ['stripe', 'paypal'],
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <span>System Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={formData.systemSettings.platformName}
                onChange={(e) => setFormData({
                  ...formData,
                  systemSettings: { ...formData.systemSettings, platformName: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={formData.systemSettings.supportEmail}
                onChange={(e) => setFormData({
                  ...formData,
                  systemSettings: { ...formData.systemSettings, supportEmail: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trialPeriod">Trial Period (Days)</Label>
              <Input
                id="trialPeriod"
                type="number"
                value={formData.systemSettings.trialPeriodDays}
                onChange={(e) => setFormData({
                  ...formData,
                  systemSettings: { ...formData.systemSettings, trialPeriodDays: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.systemSettings.maintenanceMode}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    systemSettings: { ...formData.systemSettings, maintenanceMode: checked }
                  })}
                />
                <Label>Maintenance Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.systemSettings.registrationEnabled}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    systemSettings: { ...formData.systemSettings, registrationEnabled: checked }
                  })}
                />
                <Label>Allow New Registrations</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-green-600" />
            <span>Email Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input
                id="smtpHost"
                value={formData.emailSettings.smtpHost}
                onChange={(e) => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, smtpHost: e.target.value }
                })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                type="number"
                value={formData.emailSettings.smtpPort}
                onChange={(e) => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, smtpPort: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpUsername">SMTP Username</Label>
              <Input
                id="smtpUsername"
                value={formData.emailSettings.smtpUsername}
                onChange={(e) => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, smtpUsername: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">SMTP Password</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={formData.emailSettings.smtpPassword}
                onChange={(e) => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, smtpPassword: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.emailSettings.fromEmail}
                onChange={(e) => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, fromEmail: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={formData.emailSettings.fromName}
                onChange={(e) => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, fromName: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-red-600" />
            <span>Security Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={formData.securitySettings.passwordMinLength}
                onChange={(e) => setFormData({
                  ...formData,
                  securitySettings: { ...formData.securitySettings, passwordMinLength: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={formData.securitySettings.sessionTimeoutMinutes}
                onChange={(e) => setFormData({
                  ...formData,
                  securitySettings: { ...formData.securitySettings, sessionTimeoutMinutes: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={formData.securitySettings.maxLoginAttempts}
                onChange={(e) => setFormData({
                  ...formData,
                  securitySettings: { ...formData.securitySettings, maxLoginAttempts: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch
                checked={formData.securitySettings.requireTwoFactor}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  securitySettings: { ...formData.securitySettings, requireTwoFactor: checked }
                })}
              />
              <Label>Require Two-Factor Authentication</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-purple-600" />
            <span>Billing Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={formData.billingSettings.currency}
                onChange={(e) => setFormData({
                  ...formData,
                  billingSettings: { ...formData.billingSettings, currency: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                value={formData.billingSettings.taxRate}
                onChange={(e) => setFormData({
                  ...formData,
                  billingSettings: { ...formData.billingSettings, taxRate: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input
                id="invoicePrefix"
                value={formData.billingSettings.invoicePrefix}
                onChange={(e) => setFormData({
                  ...formData,
                  billingSettings: { ...formData.billingSettings, invoicePrefix: e.target.value }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={resetToDefaults}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        
        <Button
          type="submit"
          disabled={updateSettingsMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

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
    </form>
  );
}