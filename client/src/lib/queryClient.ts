import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isPermissionError, showPermissionDenied } from "./permission-error-handler";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function buildUrl(path: string) {
  if (path.startsWith("http")) {
    return path;
  }
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
  }
  // In development, use relative paths since the server serves both frontend and backend
  // This avoids connection refused errors when the port doesn't match
  if (import.meta.env.DEV) {
    return path;
  }
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    
    if (res.status === 403 || isPermissionError(error)) {
      showPermissionDenied();
      throw error;
    }
    
    throw error;
  }
}

// Helper function to get the correct tenant subdomain
export function getTenantSubdomain(): string {
  // PRIMARY SOURCE: authenticated user's stored subdomain (keeps routes like /billing from overriding tenant)
  const userSubdomain = localStorage.getItem('user_subdomain');
  if (userSubdomain) {
    return userSubdomain;
  }

  // BACKWARD COMPATIBILITY: allow explicit ?subdomain=... parameters
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }

  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);

  // PRIORITY: Path contains subdomain as first segment (e.g., /cura/forms ...)
  if (pathParts.length >= 1) {
    const candidate = pathParts[0];
    if (candidate && candidate !== "api" && candidate !== "__vite_ping") {
      return candidate;
    }
  }

  // Legacy auth path detection
  if (pathParts.length >= 2 && pathParts[1] === 'auth' && pathParts[2] === 'login') {
    const subdomainFromPath = pathParts[0];
    if (subdomainFromPath) {
      return subdomainFromPath;
    }
  }

  const hostname = window.location.hostname;

  // Development/replit fallback
  if (
    hostname.includes('.replit.app') ||
    hostname.includes('localhost') ||
    hostname.includes('replit.dev') ||
    hostname.includes('127.0.0.1')
  ) {
    return 'demo';
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0] || 'demo';
  }

  return 'demo';
}

// Session timeout configuration
const SESSION_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'lastActivityTime';

// Check and update session timeout
function checkSessionTimeout(): void {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) {
    return; // No session, skip check
  }

  const now = Date.now();
  const lastActivityTime = parseInt(lastActivity, 10);
  const timeSinceActivity = now - lastActivityTime;

  if (timeSinceActivity >= SESSION_TIMEOUT_DURATION) {
    // Session expired
    console.log('🔐 SESSION: Session expired on API request');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_subdomain');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('sessionStartTime');
    
    // Redirect to login
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    window.location.href = `/${subdomain}/login?expired=true`;
    throw new Error('Session expired due to inactivity');
  }

  // Update last activity time
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    timeoutMs?: number;
  },
): Promise<Response> {
  // Check session timeout before making request
  checkSessionTimeout();

  const isPublic = /\/api\/public\//.test(url);
  const publicSubdomainMatch = url.match(/\/api\/public\/([^/]+)/i);
  const publicSubdomain = publicSubdomainMatch?.[1]
    ? decodeURIComponent(publicSubdomainMatch[1])
    : null;
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    // Public booking endpoints must use subdomain from URL, not authenticated app context.
    'X-Tenant-Subdomain': isPublic && publicSubdomain ? publicSubdomain : getTenantSubdomain()
  };
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Only attach auth for non-public endpoints
  if (token && !isPublic) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!token && !isPublic) {
    console.warn('[API-REQUEST] No auth token found in localStorage for request:', method, url);
  }

  // Log request details for debugging
  if (url.includes('/api/appointments')) {
    console.log('[API-REQUEST] Appointment request:', {
      method,
      url,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'missing',
      tenantSubdomain: getTenantSubdomain(),
      dataPreview: data ? {
        patientId: (data as any).patientId,
        patientIdType: typeof (data as any).patientId,
        providerId: (data as any).providerId
      } : null
    });
  }

  // Fail-fast timeout (prevents requests sitting "pending" forever if the server/DB hangs)
  const controller = new AbortController();
  const timeoutMs =
    typeof options?.timeoutMs === "number"
      ? options.timeoutMs
      : url.includes("/api/appointments")
        ? 30000
        : 45000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(buildUrl(url), {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (e: any) {
    // Convert AbortError into a clearer timeout error for easier debugging.
    if (e?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${method} ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  // Update last activity on successful request
  if (res.ok) {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  } else if (res.status === 401) {
    // Unauthorized - clear session
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_subdomain');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('sessionStartTime');
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check session timeout before making request
    checkSessionTimeout();

    const url = String(queryKey[0] || "");
    const isPublic = /\/api\/public\//.test(url);
    const publicSubdomainMatch = url.match(/\/api\/public\/([^/]+)/i);
    const publicSubdomain = publicSubdomainMatch?.[1]
      ? decodeURIComponent(publicSubdomainMatch[1])
      : null;
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      // Keep tenant scoping correct for public links even if current app tenant is different.
      'X-Tenant-Subdomain': isPublic && publicSubdomain ? publicSubdomain : getTenantSubdomain()
    };

    // Only attach auth for non-public endpoints
    if (token && !isPublic) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log("Making request to:", queryKey[0], "with auth token:", !!token && !isPublic, "(public:", isPublic, ")");
    console.log("Request headers:", headers);
    
    // Debug for patients specifically
    if (queryKey[0] === "/api/patients") {
      console.log("Patients request - token exists:", !!token);
      console.log("Patients request - headers:", headers);
    }
    
    const res = await fetch(buildUrl(queryKey[0] as string), {
      credentials: "include",
      headers
    });

    console.log("Query response status:", res.status);
    
    // Update last activity on successful request
    if (res.ok) {
      const now = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } else if (res.status === 401) {
      // Unauthorized - clear session
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_subdomain');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem('sessionStartTime');
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Query failed:", res.status, errorText);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      await throwIfResNotOk(res);
      return null;
    }
    const data = await res.json();
    console.log("Query response data:", data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
