// Reserved routes that should NOT be treated as subdomains
const RESERVED_ROUTES = [
  'landing', 'auth', 'legal', 'saas',
  'dashboard', 'patients', 'appointments', 'prescriptions', 'lab-results',
  'imaging', 'forms', 'messaging', 'integrations', 'billing', 'analytics',
  'automation', 'patient-portal', 'ai-insights', 'chatbot', 'clinical-decision-support',
  'telemedicine', 'population-health', 'mobile-health', 'voice-documentation',
  'financial-intelligence', 'emergency-protocols', 'medication-guide',
  'prevention-guidelines', 'clinical-procedures', 'inventory', 'gdpr-compliance',
  'ai-agent', 'quickbooks', 'font-test', 'tech-spec-export', 'users',
  'user-management', 'shifts', 'permissions-reference', 'staff', 'subscription', 'settings'
];

/**
 * Get the active subdomain from the current location
 * Priority: URL path (if valid subdomain) > localStorage > default 'demo'
 */
export function getActiveSubdomain(options?: { ignorePath?: boolean }): string {
  // Option to skip path checking (useful for legacy redirects)
  if (!options?.ignorePath) {
    // Try to extract from current URL path
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const potentialSubdomain = pathParts[0];
    
    // Check if it's a valid subdomain (not a reserved/public route)
    if (potentialSubdomain && !RESERVED_ROUTES.includes(potentialSubdomain)) {
      return potentialSubdomain;
    }
  }
  
  // Fallback to localStorage
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }
  
  // Last resort default
  return 'demo';
}

/**
 * Store the subdomain for future use
 */
export function storeSubdomain(subdomain: string): void {
  localStorage.setItem('user_subdomain', subdomain);
}
