import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, MessageCircle, Code2, Zap, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatbotIntegrationPage() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const basicIntegrationCode = `<!-- Add this before closing </body> tag -->
<script>
window.CuraChatbot = {
  organizationId: YOUR_ORG_ID,
  apiKey: 'YOUR_API_KEY',
  title: 'Healthcare Assistant',
  primaryColor: '#4A7DFF',
  position: 'bottom-right'
};
</script>
<script src="https://your-domain.com/chatbot-embed.js"></script>`;

  const advancedIntegrationCode = `<!-- Advanced Configuration -->
<script>
window.CuraChatbot = {
  organizationId: YOUR_ORG_ID,
  apiKey: 'YOUR_API_KEY',
  title: 'Your Clinic Assistant',
  primaryColor: '#your-brand-color',
  position: 'bottom-left', // or 'bottom-right'
  welcomeMessage: 'Welcome to Your Clinic! How can I help you today?',
  // Custom styling options
  borderRadius: '12px',
  fontFamily: 'Your Brand Font',
  // Event callbacks
  onSessionStart: function(sessionId) {
    console.log('Chat session started:', sessionId);
  },
  onMessageSent: function(message) {
    console.log('Message sent:', message);
  },
  onAppointmentBooked: function(appointmentData) {
    console.log('Appointment booked:', appointmentData);
    // Send to your analytics
  }
};
</script>
<script src="https://your-domain.com/chatbot-embed.js"></script>`;

  const reactIntegrationCode = `import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Configure chatbot
    window.CuraChatbot = {
      organizationId: process.env.REACT_APP_CURA_ORG_ID,
      apiKey: process.env.REACT_APP_CURA_API_KEY,
      title: 'Healthcare Assistant',
      primaryColor: '#4A7DFF'
    };

    // Load chatbot script
    const script = document.createElement('script');
    script.src = 'https://your-domain.com/chatbot-embed.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const existingScript = document.querySelector('script[src*="chatbot-embed.js"]');
      if (existingScript) {
        existingScript.remove();
      }
      delete window.CuraChatbot;
      delete window.CuraChatbotLoaded;
    };
  }, []);

  return (
    <div>
      {/* Your app content */}
      <div id="cura-chatbot"></div>
    </div>
  );
}`;

  const wordpressIntegrationCode = `<?php
// Add to your theme's functions.php
function add_cura_chatbot() {
    $org_id = get_option('cura_org_id');
    $api_key = get_option('cura_api_key');
    
    if ($org_id && $api_key) {
        ?>
        <script>
        window.CuraChatbot = {
            organizationId: <?php echo $org_id; ?>,
            apiKey: '<?php echo $api_key; ?>',
            title: '<?php echo get_bloginfo('name'); ?> Assistant',
            primaryColor: '#4A7DFF'
        };
        </script>
        <script src="https://your-domain.com/chatbot-embed.js" async></script>
        <div id="cura-chatbot"></div>
        <?php
    }
}
add_action('wp_footer', 'add_cura_chatbot');

// Add settings page for WordPress admin
function cura_chatbot_settings_page() {
    add_options_page(
        'Cura Chatbot Settings',
        'Cura Chatbot',
        'manage_options',
        'cura-chatbot',
        'cura_chatbot_settings_html'
    );
}
add_action('admin_menu', 'cura_chatbot_settings_page');
?>`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chatbot Integration Guide</h1>
        <p className="text-gray-600">
          Learn how to embed the Cura AI chatbot on your website to help patients book appointments and request prescriptions.
        </p>
      </div>

      {/* Features Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-500 mt-1" />
              <div>
                <h4 className="font-medium">Appointment Booking</h4>
                <p className="text-sm text-gray-600">AI extracts patient details and preferred appointment times</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Pill className="h-5 w-5 text-green-500 mt-1" />
              <div>
                <h4 className="font-medium">Prescription Requests</h4>
                <p className="text-sm text-gray-600">Intelligent processing of medication requests and renewals</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-purple-500 mt-1" />
              <div>
                <h4 className="font-medium">Natural Conversation</h4>
                <p className="text-sm text-gray-600">Context-aware responses with intent recognition</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-red-500 mt-1" />
              <div>
                <h4 className="font-medium">GDPR Compliant</h4>
                <p className="text-sm text-gray-600">Secure, compliant data handling for healthcare</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Start Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">3-Step Integration:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>Get your credentials</strong> from the Chatbot Configuration page</li>
              <li><strong>Add the embed code</strong> to your website before the closing &lt;/body&gt; tag</li>
              <li><strong>Test the chatbot</strong> - it will appear automatically on your site</li>
            </ol>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Basic Embed Code</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(basicIntegrationCode)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{basicIntegrationCode}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Platform-Specific Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              React/Next.js
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Badge variant="secondary">Modern Framework</Badge>
              <p className="text-sm text-gray-600">
                Integration for React-based applications with proper cleanup.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(reactIntegrationCode)}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy React Code
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WordPress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Badge variant="secondary">CMS Integration</Badge>
              <p className="text-sm text-gray-600">
                PHP integration with WordPress admin settings page.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(wordpressIntegrationCode)}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy WordPress Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Configuration */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Advanced Options</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(advancedIntegrationCode)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{advancedIntegrationCode}</code>
            </pre>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Configuration Options:</h4>
            <ul className="text-sm space-y-1">
              <li><code>organizationId</code> - Your unique organization ID (required)</li>
              <li><code>apiKey</code> - Your chatbot API key (required)</li>
              <li><code>title</code> - Custom chatbot title</li>
              <li><code>primaryColor</code> - Brand color (hex format)</li>
              <li><code>position</code> - 'bottom-right' or 'bottom-left'</li>
              <li><code>welcomeMessage</code> - Custom greeting message</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Testing */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Testing Your Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Test Scenarios:</h4>
              <ul className="text-sm space-y-2">
                <li><strong>Appointment Booking:</strong> "I'd like to book an appointment for John Smith on Friday morning"</li>
                <li><strong>Prescription Request:</strong> "Can I get a refill for my blood pressure medication?"</li>
                <li><strong>General Inquiry:</strong> "What are your opening hours?"</li>
                <li><strong>Emergency Detection:</strong> "I'm having chest pains"</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">What to Expect:</h4>
              <ul className="text-sm space-y-1">
                <li>• AI will identify appointment booking or prescription intents</li>
                <li>• Patient information is extracted and stored securely</li>
                <li>• Appropriate follow-up questions guide the conversation</li>
                <li>• Emergency situations are detected and handled appropriately</li>
                <li>• All interactions are logged for your review</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Support & Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Documentation</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  API Reference
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Code2 className="h-4 w-4 mr-2" />
                  Code Examples
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Help & Support</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Video Tutorial
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}