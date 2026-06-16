// Map of module names to their routes
const MODULE_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  patients: "/patients",
  appointments: "/appointments",
  prescriptions: "/prescriptions",
  lab_results: "/lab-results",
  medical_imaging: "/imaging",
  forms: "/forms",
  messaging: "/messaging",
  analytics: "/analytics",
  clinical_decision_support: "/clinical-decision-support",
  symptom_checker: "/symptom-checker",
  telemedicine: "/telemedicine",
  voice_documentation: "/voice-documentation",
  financial_intelligence: "/financial-intelligence",
  billing: "/billing",
  quickbooks: "/quickbooks",
  inventory: "/inventory",
  user_management: "/users",
  shift_management: "/shifts",
  settings: "/settings",
  subscription: "/subscription",
  user_manual: "/user-manual",
};

// Order of modules to check (priority order)
const MODULE_CHECK_ORDER = [
  "dashboard",
  "patients",
  "appointments",
  "prescriptions",
  "lab_results",
  "medical_imaging",
  "forms",
  "messaging",
  "analytics",
  "clinical_decision_support",
  "symptom_checker",
  "telemedicine",
  "voice_documentation",
  "financial_intelligence",
  "billing",
  "quickbooks",
  "inventory",
  "user_management",
  "shift_management",
  "settings",
  "subscription",
  "user_manual",
];

/**
 * Gets the first accessible page route for the current user based on permissions
 * @param canView - Function to check if user can view a module
 * @param subdomain - The subdomain to prepend to the route
 * @param isLoading - Whether permissions are still loading
 * @returns The first accessible route
 */
export function getFirstAccessiblePage(
  canView: (module: string) => boolean,
  subdomain: string,
  isLoading: boolean = false
): string {
  if (isLoading) {
    return `/${subdomain}/dashboard`; // Default while loading
  }

  // Check modules in priority order
  for (const module of MODULE_CHECK_ORDER) {
    if (canView(module)) {
      const route = MODULE_ROUTES[module];
      if (route) {
        return `/${subdomain}${route}`;
      }
    }
  }

  // Fallback to dashboard (will show access restricted message)
  return `/${subdomain}/dashboard`;
}
