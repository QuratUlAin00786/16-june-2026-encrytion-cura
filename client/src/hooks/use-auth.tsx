import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Helper function to get the correct tenant subdomain
function getTenantSubdomain(): string {
  // PRIORITY 1: Check for user's stored subdomain (from their organization)
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }
  
  // PRIORITY 2: Check for subdomain in URL path (e.g., /medicare/auth/login)
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[1] === 'auth' && pathParts[2] === 'login') {
    const subdomainFromPath = pathParts[0];
    if (subdomainFromPath) {
      return subdomainFromPath;
    }
  }
  
  // PRIORITY 3: Check for subdomain query parameter (for backward compatibility)
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
  const hostname = window.location.hostname;
  
  // PRIORITY 3: For development/replit environments, use 'demo'
  if (hostname.includes('.replit.app') || hostname.includes('localhost') || hostname.includes('replit.dev') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }
  
  // PRIORITY 4: For production environments, extract subdomain from hostname
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0] || 'demo';
  }
  
  // PRIORITY 5: Fallback to 'demo'
  return 'demo';
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        
        // Store user's organization subdomain from the response
        if (userData.organization && userData.organization.subdomain) {
          const currentSubdomain = localStorage.getItem('user_subdomain');
          if (currentSubdomain !== userData.organization.subdomain) {
            localStorage.setItem('user_subdomain', userData.organization.subdomain);
            console.log('🔐 SUBDOMAIN: Updated user subdomain on validation:', userData.organization.subdomain);
            // Clear cache to force all queries to use the new subdomain
            queryClient.clear();
          }
        }
      } else {
        console.log('🔐 Token validation failed - clearing auth data and forcing re-login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
        queryClient.clear();
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_subdomain');
      queryClient.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // First clear any existing token and cache
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_subdomain');
      localStorage.removeItem('lastActivityTime');
      localStorage.removeItem('sessionStartTime');
      queryClient.clear();
      setUser(null);
      
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password
      });

      const data = await response.json();
      
      // Set new token and user
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      
      // Initialize session timeout
      const now = Date.now();
      localStorage.setItem('lastActivityTime', now.toString());
      localStorage.setItem('sessionStartTime', now.toString());
      console.log('🔐 SESSION: Session initialized on login at', new Date(now).toISOString());
      
      // Store user's organization subdomain from the response
      if (data.organization && data.organization.subdomain) {
        localStorage.setItem('user_subdomain', data.organization.subdomain);
        console.log('🔐 SUBDOMAIN: Stored user subdomain:', data.organization.subdomain);
      }
      
      // Clear React Query cache again to force fresh API calls with new token
      queryClient.clear();
      
      console.log('🔐 LOGIN: Successfully logged in as', data.user.email, 'with role', data.user.role);
    } catch (error: any) {
      // Try to extract the original error message from the API response
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error?.message) {
        // The error message format from throwIfResNotOk is: "403: {...}"
        // Try to parse JSON from the error message
        const match = error.message.match(/^\d+:\s*(.+)$/);
        if (match) {
          try {
            const errorData = JSON.parse(match[1]);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // If parsing fails, check if the message contains subscription-related text
            if (error.message.includes('subscription') || error.message.includes('expired')) {
              errorMessage = error.message.replace(/^\d+:\s*/, '');
            }
          }
        } else if (error.message.includes('subscription') || error.message.includes('expired')) {
          // Direct subscription error message
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    // Clear session data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_subdomain');
    localStorage.removeItem('lastActivityTime');
    localStorage.removeItem('sessionStartTime');
    setUser(null);
    // Clear React Query cache when logging out
    queryClient.clear();
    console.log('🔐 SESSION: Session cleared on logout');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
