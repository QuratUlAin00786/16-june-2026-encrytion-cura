import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON and extract message
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        throw new Error(errorData.message);
      }
    } catch (parseError) {
      // If JSON parsing fails, use the text as-is
    }
    
    throw new Error(text);
  }
}

// Simplified URL building that works in all environments
function buildApiUrl(path: string): string {
  // Always use relative URLs - this works in both dev and production
  // The browser will automatically resolve to the correct domain
  return path.startsWith('/') ? path : `/${path}`;
}

export async function saasApiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('saasToken');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Log warning if token is missing for protected endpoints
    if (!url.includes('/login')) {
      console.warn('⚠️ SaaS API Request: No token found in localStorage for:', url);
    }
  }

  // Build the correct URL for both dev and production environments
  const apiUrl = buildApiUrl(url);
  
  // Add logging to debug production issues
  console.log('🔍 SaaS API Call:', {
    method,
    originalUrl: url,
    finalUrl: apiUrl,
    location: window.location.href,
    hostname: window.location.hostname,
    hasToken: !!token
  });

  try {
    // Log request details including headers (without exposing full token)
    console.log('📤 SaaS API Request Details:', {
      method,
      url: apiUrl,
      hasAuthHeader: !!headers['Authorization'],
      authHeaderPreview: headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : 'none',
      hasContentType: !!headers['Content-Type'],
      bodySize: data ? JSON.stringify(data).length : 0
    });
    
    const res = await fetch(apiUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log('📡 SaaS API Response:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      url: res.url,
      headers: Object.fromEntries(res.headers.entries())
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Only clear token for specific authentication failures, not all 401s
    if (error?.message?.includes('401')) {
      console.log('🔑 Authentication error detected, clearing token...');
      localStorage.removeItem('saasToken');
      localStorage.removeItem('saas_owner');
      // Don't immediately reload - let the UI handle it gracefully
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      throw error;
    }
    console.error('❌ SaaS API Error:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      finalUrl: apiUrl
    });
    throw error;
  }
}

export const getSaaSQueryFn: QueryFunction = async ({ queryKey }) => {
  const token = localStorage.getItem('saasToken');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build the correct URL for both dev and production environments
  const apiUrl = buildApiUrl(queryKey[0] as string);
  
  const res = await fetch(apiUrl, {
    headers
  });

  if (!res.ok) {
    // Only clear token for specific authentication failures
    if (res.status === 401) {
      const errorText = await res.text();
      if (errorText.includes('Invalid token')) {
        localStorage.removeItem('saasToken');
        // Add delay to prevent immediate logout during temporary issues
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }
      // For other 401s, just throw error without clearing token
      throw new Error(`${res.status}: ${errorText}`);
    }
    const errorText = await res.text();
    throw new Error(`${res.status}: ${errorText}`);
  }

  return res.json();
};

export const saasQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getSaaSQueryFn,
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 30000, // Cache data for 30 seconds to prevent excessive requests
      gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
    },
  },
});