import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import type { TenantInfo } from "@/types";

interface TenantContextType {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  _version?: number; // Version number that increments when tenant data changes
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextVersion, setContextVersion] = useState(0);
  // Use ref to track current tenant ID for event handler without causing re-renders
  const tenantIdRef = useRef<number | null>(null);
  // Use ref to track current tenant for currency comparison (avoids stale closure)
  const tenantRef = useRef<TenantInfo | null>(null);

  // Fetch tenant data function - memoized to prevent unnecessary re-renders
  const fetchTenant = useCallback(async () => {
    // Get subdomain from localStorage (set during login) instead of hostname
    // This ensures we use the user's actual organization subdomain, not the Replit subdomain
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    
    try {
      setLoading(true);
      setError(null);
      
      // Add cache-busting to ensure we always get fresh data
      // Add aggressive cache-busting to ensure we always get fresh data
      const cacheBuster = `?t=${Date.now()}&_=${Math.random()}`;
      const response = await fetch(`/api/tenant/info${cacheBuster}`, {
        headers: {
          'X-Tenant-Subdomain': subdomain,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load tenant information');
      }
      
      const tenantData = await response.json();
      // Always create a new object reference to ensure React detects the change
      // Deep clone to ensure all nested objects are new references
      const newTenant: TenantInfo = {
        id: tenantData.id,
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        region: tenantData.region,
        brandName: tenantData.brandName,
        settings: tenantData.settings ? { ...tenantData.settings } : {},
        country_code: tenantData.country_code || null,
        currency_code: tenantData.currency_code || null,
        currency_symbol: tenantData.currency_symbol || null,
        language_code: tenantData.language_code || null,
      };
      // Use ref to get current tenant (avoids stale closure issue)
      const currentTenant = tenantRef.current;
      const currencyChanged = currentTenant?.currency_symbol !== newTenant.currency_symbol ||
                              currentTenant?.currency_code !== newTenant.currency_code ||
                              currentTenant?.country_code !== newTenant.country_code;
      
      console.log('🔄 Tenant data fetched, updating context:', {
        id: newTenant.id,
        subdomain: newTenant.subdomain,
        currencySymbol: newTenant.currency_symbol,
        currencyCode: newTenant.currency_code,
        countryCode: newTenant.country_code,
        previousCurrency: currentTenant?.currency_symbol,
        previousCode: currentTenant?.currency_code,
        previousCountry: currentTenant?.country_code,
        currencyChanged: currencyChanged,
        subdomainUsed: subdomain
      });
      
      setTenant(newTenant);
      // Update refs with current tenant data
      tenantRef.current = newTenant;
      tenantIdRef.current = tenantData?.id || null;
      
      // Increment context version to force all consumers to re-render
      setContextVersion(prev => prev + 1);
      
      if (currencyChanged) {
        console.log('💱 Currency values changed in TenantProvider, context updated with new currency');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Tenant loading error:', err);
      tenantIdRef.current = null;
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - function doesn't depend on any props or state

  // Update tenant ref whenever tenant state changes
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Set up event listeners separately to ensure they always use the latest fetchTenant
  useEffect(() => {
    // Import socket manager for Socket.IO events
    let socketUnsubscribe: (() => void) | null = null;
    
    // Set up Socket.IO listener for currency updates (real-time)
    try {
      const { socketManager, SocketEvents } = require('@/lib/socket-manager');
      
      const handleSocketCurrencyUpdate = (data: any) => {
        const updatedOrganizationId = data?.organizationId;
        const currentTenantId = tenantIdRef.current;
        
        console.log('📡 TenantProvider received Socket.IO currency update:', {
          updatedOrganizationId,
          currentTenantId,
          data
        });
        
        // Always refresh if it's for our organization or if we don't have a tenant ID yet
        if (!currentTenantId || !updatedOrganizationId || updatedOrganizationId === currentTenantId) {
          if (data.currencyUpdated || data.currencyCode || data.currencySymbol || data.countryCode) {
            console.log('✅ Socket.IO currency update detected, refreshing tenant data...', {
              organizationId: updatedOrganizationId,
              currencyCode: data.currencyCode,
              currencySymbol: data.currencySymbol,
              countryCode: data.countryCode
            });
            // Add a small delay to ensure database update is complete
            setTimeout(() => {
              fetchTenant();
            }, 200);
          }
        }
      };
      
      // Listen for both room-based and global currency update events
      socketManager.on(SocketEvents.CURRENCY_UPDATED, handleSocketCurrencyUpdate);
      socketManager.on(SocketEvents.ORGANIZATION_CURRENCY_UPDATED, handleSocketCurrencyUpdate);
      
      socketUnsubscribe = () => {
        socketManager.off(SocketEvents.CURRENCY_UPDATED, handleSocketCurrencyUpdate);
        socketManager.off(SocketEvents.ORGANIZATION_CURRENCY_UPDATED, handleSocketCurrencyUpdate);
      };
    } catch (err) {
      console.warn('[TenantProvider] Socket.IO not available, using fallback events only:', err);
    }
    
    // Listen for currency/organization update events (fallback for non-Socket.IO scenarios)
    const handleCurrencyUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail || {};
      const updatedOrganizationId = eventDetail?.organizationId;
      const currentTenantId = tenantIdRef.current;
      
      console.log('📨 TenantProvider received currency update event:', {
        eventType: customEvent.type,
        updatedOrganizationId,
        currentTenantId,
        eventDetail
      });
      
      // Always refresh if currencyUpdated flag is set or currency-related fields are present
      // This ensures currency updates work even if IDs don't match exactly
      if (eventDetail?.currencyUpdated || eventDetail?.currencyCode || eventDetail?.currencySymbol || eventDetail?.countryCode) {
        console.log('✅ Currency update detected in event, refreshing tenant data immediately...', {
          organizationId: updatedOrganizationId,
          currentTenantId: currentTenantId,
          currencyCode: eventDetail?.currencyCode,
          currencySymbol: eventDetail?.currencySymbol,
          countryCode: eventDetail?.countryCode,
          currencyUpdated: eventDetail?.currencyUpdated,
          organizationSubdomain: eventDetail?.organizationSubdomain
        });
        
        // Always refresh - the fetchTenant will use the current user's subdomain
        // which should be the same as the updated organization if the user is logged into that org
        // Add a small delay to ensure database update is complete
        setTimeout(() => {
          console.log('🔄 Executing delayed tenant refresh after currency update...');
          fetchTenant();
        }, 200);
        return;
      }
      
      // If event has organizationId, check if it matches current tenant
      // If no organizationId in event, refresh anyway (for safety)
      if (updatedOrganizationId && currentTenantId) {
        if (updatedOrganizationId === currentTenantId) {
          console.log('✅ Currency update event matches current organization, refreshing tenant data...', {
            organizationId: updatedOrganizationId,
            currencyCode: eventDetail?.currencyCode,
            currencySymbol: eventDetail?.currencySymbol
          });
          fetchTenant();
        } else {
          console.log('⏭️ Currency update event for different organization, but refreshing anyway to be safe...', {
            updatedOrgId: updatedOrganizationId,
            currentOrgId: currentTenantId
          });
          // Refresh anyway - the user might have updated their own organization
          fetchTenant();
        }
      } else {
        // No organizationId in event or no current tenant - refresh for safety
        console.log('🔄 Currency update event received (no org filter), refreshing tenant data...');
      fetchTenant();
      }
    };

    // Listen for custom events with capture phase to ensure we catch them early
    window.addEventListener('currency-updated', handleCurrencyUpdate, true);
    window.addEventListener('organization-updated', handleCurrencyUpdate, true);
    
    // Listen for localStorage events (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currency-update-trigger' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          console.log('🔄 TenantProvider: Currency update detected via localStorage (cross-tab):', data);
          // Always refresh when currency update is detected, regardless of organization ID
          // This ensures updates work even if IDs don't match exactly
          if (data.currencyUpdated || data.currencyCode || data.currencySymbol || data.countryCode) {
            console.log('✅ Refreshing tenant data due to currency update from localStorage...', {
              organizationId: data.organizationId,
              currencyCode: data.currencyCode,
              currencySymbol: data.currencySymbol,
              countryCode: data.countryCode
            });
            // Add a small delay to ensure database update is complete
            setTimeout(() => {
              fetchTenant();
            }, 200);
          }
        } catch (err) {
          console.error('❌ Error parsing currency update from localStorage:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll localStorage periodically as a fallback mechanism
    // This ensures updates are detected even if events fail
    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem('currency-update-trigger');
        if (stored) {
          const data = JSON.parse(stored);
          // Check if this is a recent update (within last 5 seconds)
          const updateAge = Date.now() - (data.timestamp || 0);
          if (updateAge < 5000 && (data.currencyUpdated || data.currencyCode || data.currencySymbol || data.countryCode)) {
            const currentTenantId = tenantIdRef.current;
            // Only refresh if it's for our organization or if we don't have a tenant ID yet
            if (!currentTenantId || !data.organizationId || data.organizationId === currentTenantId) {
              console.log('🔄 Polling detected recent currency update, refreshing...', {
                updateAge,
                organizationId: data.organizationId,
                currentTenantId
              });
              fetchTenant();
              // Clear the trigger after processing to avoid repeated refreshes
              localStorage.removeItem('currency-update-trigger');
            }
          }
        }
      } catch (err) {
        console.error('❌ Error polling localStorage for currency updates:', err);
      }
    }, 1000); // Poll every second

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate, true);
      window.removeEventListener('organization-updated', handleCurrencyUpdate, true);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
      // Clean up Socket.IO listeners
      if (socketUnsubscribe) {
        socketUnsubscribe();
      }
    };
  }, [fetchTenant]); // Include fetchTenant to ensure we always use the latest version

  // Memoize context value to ensure it only changes when tenant, loading, or error actually change
  // This prevents unnecessary re-renders while ensuring updates are detected
  // Include contextVersion to force re-renders when tenant data changes
  const contextValue = useMemo(() => ({
    tenant,
    loading,
    error,
    refresh: fetchTenant,
    _version: contextVersion, // Include version to force re-renders when tenant updates
  }), [tenant, loading, error, fetchTenant, contextVersion]);

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
