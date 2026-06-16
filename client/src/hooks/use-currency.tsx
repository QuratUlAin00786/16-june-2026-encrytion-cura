import { useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getCountryData } from "@/lib/country-data";
import { TenantContext } from "./use-tenant";

/**
 * Hook to get currency information from the current organization
 * Falls back to default values (GBP/£) if TenantProvider is not available
 * Automatically updates when currency changes via events or context updates
 * @returns Currency symbol, code, country name, and refresh function
 */
export function useCurrency() {
  // Debug logging removed
  
  // Safely access tenant context - it may be undefined in SaaS portal
  const tenantContext = useContext(TenantContext);
  const tenant = tenantContext?.tenant || null;
  
  // Log when hook is called (only once per mount) - use ref to track
  const hookMountRef = useRef(false);
  useEffect(() => {
    if (!hookMountRef.current) {
      console.log('🚀 useCurrency: Hook mounted and useEffect running');
      hookMountRef.current = true;
    }
  }, []);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currencyVersion, setCurrencyVersion] = useState(0);
  // Store latest currency from events for cases where TenantContext isn't available
  const [eventCurrency, setEventCurrency] = useState<{
    currencySymbol?: string;
    currencyCode?: string;
    countryCode?: string;
  } | null>(null);
  // Store country name from events
  const [eventCountryName, setEventCountryName] = useState<string | null>(null);
  
  // Use ref to track latest tenantContext to avoid stale closures
  const tenantContextRef = useRef(tenantContext);
  useEffect(() => {
    tenantContextRef.current = tenantContext;
    // Log when context becomes available
    if (tenantContext && !tenantContextRef.current) {
      console.log('✅ TenantContext is now available in useCurrency');
    }
  }, [tenantContext]);
  
  // Log context availability for debugging (only log once on mount and when context changes)
  const hasLoggedContext = useRef(false);
  useEffect(() => {
    if (!hasLoggedContext.current || tenantContext) {
      console.log('🔍 useCurrency: TenantContext status:', {
        hasContext: !!tenantContext,
        hasTenant: !!tenant,
        hasRefresh: !!tenantContext?.refresh,
        tenantId: tenant?.id,
        currencySymbol: tenant?.currency_symbol,
        loading: tenantContext?.loading
      });
      hasLoggedContext.current = true;
    }
  }, [tenantContext, tenant]);

  // Use ref to track eventCurrency to avoid stale closures in event handlers
  const eventCurrencyRef = useRef(eventCurrency);
  useEffect(() => {
    eventCurrencyRef.current = eventCurrency;
  }, [eventCurrency]);
  
  // Use refs to track state setters to avoid stale closures
  const setEventCurrencyRef = useRef(setEventCurrency);
  const setEventCountryNameRef = useRef(setEventCountryName);
  const setCurrencyVersionRef = useRef(setCurrencyVersion);
  const setRefreshTriggerRef = useRef(setRefreshTrigger);
  
  useEffect(() => {
    setEventCurrencyRef.current = setEventCurrency;
    setEventCountryNameRef.current = setEventCountryName;
    setCurrencyVersionRef.current = setCurrencyVersion;
    setRefreshTriggerRef.current = setRefreshTrigger;
  }, [setEventCurrency, setEventCountryName, setCurrencyVersion, setRefreshTrigger]);
  
  // Listen for currency update events to trigger re-render
  useEffect(() => {
    // CRITICAL: This log MUST appear if the useEffect runs
    console.log('🔧🔧🔧 useCurrency: useEffect STARTED - setting up event listeners', {
      timestamp: Date.now(),
      hasTenantContext: !!tenantContext,
      hasTenant: !!tenant,
      hookExecuted: true
    });
    
    // Force immediate log to verify execution
    console.error('🔴 FORCE LOG: useCurrency useEffect is running!');
    
    const handleCurrencyUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail || {};
      
      console.log('🔄 Currency update event received in useCurrency, triggering refresh...', {
        hasTenantContext: !!tenantContextRef.current,
        hasRefresh: !!tenantContextRef.current?.refresh,
        eventDetail,
        hasCurrencyInEvent: !!(eventDetail.currencySymbol || eventDetail.currencyCode || eventDetail.countryCode),
        currentEventCurrency: eventCurrencyRef.current
      });
      
      // If currency data is in the event, update immediately (before any API calls)
      if (eventDetail.currencySymbol || eventDetail.currencyCode || eventDetail.countryCode) {
        console.log('✅ Currency data found in event, updating immediately:', {
          currencySymbol: eventDetail.currencySymbol,
          currencyCode: eventDetail.currencyCode,
          countryCode: eventDetail.countryCode,
          countryName: eventDetail.countryName
        });
        
        // Use functional update to ensure we're working with latest state
        setEventCurrency(prev => {
          const newCurrency = {
            currencySymbol: eventDetail.currencySymbol || prev?.currencySymbol || null,
            currencyCode: eventDetail.currencyCode || prev?.currencyCode || null,
            countryCode: eventDetail.countryCode || prev?.countryCode || null
          };
          console.log('✅ Setting eventCurrency (functional update):', newCurrency);
          return newCurrency;
        });
        
        if (eventDetail.countryName) {
          setEventCountryName(eventDetail.countryName);
        }
        
        setCurrencyVersion(prev => prev + 1);
        setRefreshTrigger(prev => prev + 1);
      }
      
      // Use ref to get latest context (avoids stale closure)
      const currentContext = tenantContextRef.current;
      
      // Always update version immediately to trigger re-render
      setCurrencyVersion(prev => prev + 1);
      setRefreshTrigger(prev => prev + 1);
      
      // Trigger a refresh if tenant context has a refresh function
      // Check both ref and current context to handle timing issues
      const contextToUse = currentContext || tenantContextRef.current;
      
      // If we have eventCurrency from Socket.IO, don't refresh tenant context
      // Socket.IO events are authoritative and more recent
      const hasEventCurrency = eventCurrencyRef.current?.currencySymbol || 
                               eventCurrencyRef.current?.currencyCode || 
                               eventCurrencyRef.current?.countryCode;
      
      if (contextToUse?.refresh && !hasEventCurrency) {
        console.log('📞 Calling tenantContext.refresh()...', {
          hasContext: !!currentContext,
          hasRefContext: !!tenantContextRef.current,
          usingRef: !currentContext && !!tenantContextRef.current,
          hasEventCurrency: false
        });
        // Use setTimeout to ensure state updates happen first
        setTimeout(() => {
          contextToUse.refresh()
            .then(() => {
              // Force another re-render after refresh completes to ensure latest data
              console.log('✅ Tenant refresh completed, updating currency display');
              setRefreshTrigger(prev => prev + 1);
              setCurrencyVersion(prev => prev + 1);
            })
            .catch((err) => {
              console.error('❌ Error refreshing tenant:', err);
              // Still update trigger to force re-render even if refresh fails
              setRefreshTrigger(prev => prev + 1);
              setCurrencyVersion(prev => prev + 1);
            });
        }, 100); // Small delay to ensure event propagation
      } else {
        // No TenantContext available (e.g., in SaaS portal) - fetch fresh data from API
        // But if event already has currency data, use it immediately and only fetch if needed
        console.log('⚠️ No tenant context available', {
          eventDetail,
          hasCurrencyInEvent: !!(eventDetail.currencySymbol || eventDetail.currencyCode || eventDetail.countryCode)
        });
        
        // If event has currency data, use it immediately and DON'T overwrite with API fetch
        // The Socket.IO event comes from the server after database update, so it's authoritative
        if (eventDetail.currencySymbol || eventDetail.currencyCode || eventDetail.countryCode) {
          console.log('✅ Currency data in event, using it directly (no API fetch needed):', {
            currencySymbol: eventDetail.currencySymbol,
            currencyCode: eventDetail.currencyCode,
            countryCode: eventDetail.countryCode,
            countryName: eventDetail.countryName
          });
          
          // Event data is authoritative - use it and don't fetch from API
          // The Socket.IO event is sent AFTER database update, so it's the source of truth
          return; // Exit early - don't fetch from API
        }
        
        // Only fetch from API if event doesn't have currency data
        console.log('⚠️ No currency data in event, fetching from API...');
        const fetchFreshCurrency = async () => {
          try {
            // Get the organization ID from event
            const orgId = eventDetail?.organizationId;
            const subdomain = localStorage.getItem('user_subdomain') || 'demo';
            
            // If we have a specific orgId from the event, try to fetch that organization's data
            // Otherwise, use the current user's organization
            if (orgId) {
              // Try to fetch the specific organization using SaaS API (if available)
              // First, check if we're in a context where we can use SaaS API
              const saasToken = localStorage.getItem('saasToken');
              
              if (saasToken) {
                // We're in SaaS portal context, use SaaS API to fetch specific organization
                try {
                  const saasResponse = await fetch(`/api/saas/customers/${orgId}`, {
                    headers: {
                      'Authorization': `Bearer ${saasToken}`,
                      'Content-Type': 'application/json'
                    },
                    cache: 'no-store'
                  });
                  
                  if (saasResponse.ok) {
                    const orgData = await saasResponse.json();
                    console.log('✅ Fresh currency fetched from SaaS API for org:', {
                      organizationId: orgId,
                      currencySymbol: orgData.currency_symbol,
                      currencyCode: orgData.currency_code,
                      countryCode: orgData.country_code,
                      hasCurrency: !!(orgData.currency_symbol || orgData.currency_code || orgData.country_code),
                      orgData: orgData
                    });
                    
                    // Get country name from country data
                    let fetchedCountryName = null;
                    if (orgData.country_code) {
                      const countryData = getCountryData(orgData.country_code);
                      fetchedCountryName = countryData?.country_name || orgData.country_code;
                    }
                    
                    // Use the fetched currency data (even if null, it's the actual database value)
                    setEventCurrency({
                      currencySymbol: orgData.currency_symbol || null,
                      currencyCode: orgData.currency_code || null,
                      countryCode: orgData.country_code || null
                    });
                    if (fetchedCountryName) {
                      setEventCountryName(fetchedCountryName);
                    }
                    setCurrencyVersion(prev => prev + 1);
                    setRefreshTrigger(prev => prev + 1);
                    return; // Success, exit early
                  } else {
                    console.warn('⚠️ SaaS API returned error:', saasResponse.status, saasResponse.statusText);
                  }
                } catch (saasErr) {
                  console.warn('⚠️ Could not fetch from SaaS API, falling back to tenant/info:', saasErr);
                }
              } else {
                // No SaaS token, but we have orgId - try using the organization's subdomain if available
                const orgSubdomain = eventDetail?.organizationSubdomain;
                if (orgSubdomain) {
                  try {
                    const cacheBuster = `?t=${Date.now()}`;
                    const response = await fetch(`/api/tenant/info${cacheBuster}`, {
                      headers: {
                        'X-Tenant-Subdomain': orgSubdomain,
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                      },
                      cache: 'no-store'
                    });
                    
                    if (response.ok) {
                      const tenantData = await response.json();
                      // Verify it's the correct organization
                      if (tenantData.id === orgId) {
                        // Get country name from country data
                        let fetchedCountryName = null;
                        if (tenantData.country_code) {
                          const countryData = getCountryData(tenantData.country_code);
                          fetchedCountryName = countryData?.country_name || tenantData.country_code;
                        }
                        
                        console.log('✅ Fresh currency fetched using organization subdomain:', {
                          organizationId: orgId,
                          subdomain: orgSubdomain,
                          currencySymbol: tenantData.currency_symbol,
                          currencyCode: tenantData.currency_code,
                          countryCode: tenantData.country_code,
                          countryName: fetchedCountryName
                        });
                        setEventCurrency({
                          currencySymbol: tenantData.currency_symbol || null,
                          currencyCode: tenantData.currency_code || null,
                          countryCode: tenantData.country_code || null
                        });
                        if (fetchedCountryName) {
                          setEventCountryName(fetchedCountryName);
                        }
                        setCurrencyVersion(prev => prev + 1);
                        setRefreshTrigger(prev => prev + 1);
                        return; // Success, exit early
                      }
                    }
                  } catch (subdomainErr) {
                    console.warn('⚠️ Could not fetch using subdomain, falling back:', subdomainErr);
                  }
                }
              }
            }
            
            // Fallback: Use tenant/info endpoint (gets current user's organization)
            // This will work if the updated organization is the current user's organization
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(`/api/tenant/info${cacheBuster}`, {
              headers: {
                'X-Tenant-Subdomain': subdomain,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              },
              cache: 'no-store'
            });
            
            if (response.ok) {
              const tenantData = await response.json();
              console.log('✅ Fresh currency fetched from tenant/info API:', {
                currencySymbol: tenantData.currency_symbol,
                currencyCode: tenantData.currency_code,
                countryCode: tenantData.country_code,
                organizationId: tenantData.id,
                requestedOrgId: orgId,
                match: tenantData.id === orgId
              });
              
              // Only use this data if it matches the updated organization
              if (!orgId || tenantData.id === orgId) {
                // Get country name from country data
                let fetchedCountryName = null;
                if (tenantData.country_code) {
                  const countryData = getCountryData(tenantData.country_code);
                  fetchedCountryName = countryData?.country_name || tenantData.country_code;
                }
                
                setEventCurrency({
                  currencySymbol: tenantData.currency_symbol,
                  currencyCode: tenantData.currency_code,
                  countryCode: tenantData.country_code
                });
                if (fetchedCountryName) {
                  setEventCountryName(fetchedCountryName);
                }
                setCurrencyVersion(prev => prev + 1);
                setRefreshTrigger(prev => prev + 1);
              } else {
                console.warn('⚠️ Fetched organization does not match updated organization:', {
                  fetched: tenantData.id,
                  updated: orgId
                });
              }
            } else {
              console.error('❌ Failed to fetch currency from API:', response.status, response.statusText);
            }
          } catch (err) {
            console.error('❌ Error fetching currency directly:', err);
          }
        };
        
        // Fetch with a small delay to ensure database update is complete
        setTimeout(fetchFreshCurrency, 300);
      }
    };

    // Listen for window events (same-tab updates)
    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('organization-updated', handleCurrencyUpdate);
    
    // Listen for localStorage events (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currency-update-trigger' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          console.log('🔄 Currency update detected via localStorage (cross-tab):', data);
          // Trigger the same handler as window events with full currency data
          handleCurrencyUpdate(new CustomEvent('currency-updated', {
            detail: {
              organizationId: data.organizationId,
              organizationSubdomain: data.organizationSubdomain,
              countryCode: data.countryCode,
              countryName: data.countryName,
              currencyCode: data.currencyCode,
              currencySymbol: data.currencySymbol,
              currencyUpdated: data.currencyUpdated || true,
              timestamp: data.timestamp
            }
          }));
        } catch (err) {
          console.error('❌ Error parsing currency update from localStorage:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for Socket.IO events (real-time updates)
    let socketUnsubscribe: (() => void) | null = null;
    
    console.log('🔧 useCurrency: About to set up Socket.IO listeners');
    
    // Set up Socket.IO listeners using dynamic import (browser-compatible)
    // Use async IIFE to handle the Promise from import()
    (async () => {
      try {
        console.log('🔧 useCurrency: Attempting to import socket-manager...');
        const socketModule = await import('@/lib/socket-manager');
        console.log('✅ useCurrency: socket-manager imported successfully', {
          hasSocketModule: !!socketModule,
          keys: socketModule ? Object.keys(socketModule) : []
        });
        
        const { socketManager, SocketEvents } = socketModule;
        
        if (!socketManager || !SocketEvents) {
          console.error('[useCurrency] ❌ SocketManager or SocketEvents not available', {
            hasSocketManager: !!socketManager,
            hasSocketEvents: !!SocketEvents,
            socketModuleKeys: Object.keys(socketModule)
          });
        } else {
        console.log('✅ useCurrency: SocketManager and SocketEvents available, setting up listeners', {
          socketManagerAvailable: !!socketManager,
          SocketEventsAvailable: !!SocketEvents,
          CURRENCY_UPDATED: SocketEvents.CURRENCY_UPDATED,
          ORGANIZATION_CURRENCY_UPDATED: SocketEvents.ORGANIZATION_CURRENCY_UPDATED,
          socketConnected: socketManager.isConnected?.() || false,
          socketManagerType: typeof socketManager,
          socketManagerHasOn: typeof socketManager.on === 'function'
        });
        
        const handleSocketCurrencyUpdate = (data: any) => {
        console.log('📡 useCurrency received Socket.IO currency update:', data);
        
        // Update currency immediately from Socket.IO event data
        // Socket.IO events are sent AFTER database update, so they're authoritative
        // Don't trigger API fetch - the event data is the source of truth
        if (data.currencySymbol || data.currencyCode || data.countryCode || data.countryName) {
          console.log('✅ Updating currency from Socket.IO event (authoritative, no API fetch):', {
            currencySymbol: data.currencySymbol,
            currencyCode: data.currencyCode,
            countryCode: data.countryCode,
            countryName: data.countryName
          });
          
          // Always update eventCurrency with all available data
          // Socket.IO data is authoritative - always use it directly, don't merge with previous
          const newCurrency = {
            currencySymbol: data.currencySymbol || null,
            currencyCode: data.currencyCode || null,
            countryCode: data.countryCode || null
          };
          console.log('✅ Setting eventCurrency from Socket.IO (authoritative):', newCurrency);
          
          // Use refs to ensure we're calling the latest state setters
          setEventCurrencyRef.current(newCurrency);
          
          // Always update country name if provided
          if (data.countryName) {
            console.log('✅ Setting country name from Socket.IO event:', data.countryName);
            setEventCountryNameRef.current(data.countryName);
          } else if (data.countryCode) {
            // If country name not provided but country code is, fetch it
            try {
              const countryData = getCountryData(data.countryCode);
              if (countryData?.country_name) {
                console.log('✅ Setting country name from country code:', countryData.country_name);
                setEventCountryNameRef.current(countryData.country_name);
              }
            } catch (err) {
              console.warn('⚠️ Could not get country name from code:', err);
            }
          }
          
          // Force immediate re-render with multiple state updates to ensure React picks it up
          setCurrencyVersionRef.current(prev => {
            const newVersion = prev + 1;
            console.log('✅ Incrementing currencyVersion to:', newVersion);
            return newVersion;
          });
          setRefreshTriggerRef.current(prev => {
            const newTrigger = prev + 1;
            console.log('✅ Incrementing refreshTrigger to:', newTrigger);
            return newTrigger;
          });
          
          console.log('✅ Currency state updated from Socket.IO, triggering re-render');
          
          // DON'T call handleCurrencyUpdate - Socket.IO events are authoritative
          // and we don't want to trigger API fetches that might overwrite with undefined
          return; // Exit early - don't trigger window event handler
        } else {
          console.warn('⚠️ Socket.IO currency update event has no currency data:', data);
        }
      };
      
        // Listen for both room-based and global currency update events
        console.log('🔌 useCurrency: Subscribing to Socket.IO events:', {
          CURRENCY_UPDATED: SocketEvents.CURRENCY_UPDATED,
          ORGANIZATION_CURRENCY_UPDATED: SocketEvents.ORGANIZATION_CURRENCY_UPDATED,
          socketConnected: socketManager.isConnected()
        });
        
        console.log('🔧 useCurrency: About to call socketManager.on() for CURRENCY_UPDATED');
        const unsubscribe1 = socketManager.on(SocketEvents.CURRENCY_UPDATED, handleSocketCurrencyUpdate);
        console.log('🔧 useCurrency: First subscription complete, unsubscribe1:', typeof unsubscribe1);
        
        console.log('🔧 useCurrency: About to call socketManager.on() for ORGANIZATION_CURRENCY_UPDATED');
        const unsubscribe2 = socketManager.on(SocketEvents.ORGANIZATION_CURRENCY_UPDATED, handleSocketCurrencyUpdate);
        console.log('🔧 useCurrency: Second subscription complete, unsubscribe2:', typeof unsubscribe2);
        
        console.log('✅ useCurrency: Socket.IO listeners registered successfully', {
          event1: SocketEvents.CURRENCY_UPDATED,
          event2: SocketEvents.ORGANIZATION_CURRENCY_UPDATED,
          unsubscribe1Type: typeof unsubscribe1,
          unsubscribe2Type: typeof unsubscribe2,
          bothAreFunctions: typeof unsubscribe1 === 'function' && typeof unsubscribe2 === 'function'
        });
        
        socketUnsubscribe = () => {
          console.log('🔌 useCurrency: Unsubscribing from Socket.IO events');
          if (typeof unsubscribe1 === 'function') unsubscribe1();
          if (typeof unsubscribe2 === 'function') unsubscribe2();
        };
        
        console.log('✅✅✅ useCurrency: Socket.IO subscription COMPLETE!', {
          event1: SocketEvents.CURRENCY_UPDATED,
          event2: SocketEvents.ORGANIZATION_CURRENCY_UPDATED
        });
        }
      } catch (err) {
        console.error('[useCurrency] ❌ Error setting up Socket.IO listeners:', err);
        console.warn('[useCurrency] Socket.IO not available, using fallback events only');
      }
    })(); // Immediately invoke async function

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('organization-updated', handleCurrencyUpdate);
      window.removeEventListener('storage', handleStorageChange);
      // Clean up Socket.IO listeners
      if (socketUnsubscribe) {
        socketUnsubscribe();
      }
    };
  }, []); // Empty deps - use refs instead to avoid stale closures
  
  // Re-subscribe to Socket.IO when socket connects (in case subscription happened before connection)
  useEffect(() => {
    try {
      const { socketManager, SocketEvents } = require('@/lib/socket-manager');
      
      if (socketManager.isConnected()) {
        console.log('🔌 useCurrency: Socket is connected, ensuring listeners are registered');
        // The listeners should already be registered from the main useEffect above
        // But we can verify they're still there
      } else {
        console.log('⚠️ useCurrency: Socket is not connected yet');
      }
    } catch (err) {
      // Socket.IO not available
    }
  }, []); // Only check once on mount

  // Track previous currency values to detect changes
  const prevCurrencyRef = useRef<string>('');
  
  // Watch for tenant currency changes and update both triggers
  // Use tenant object reference as dependency to catch any tenant updates
  // Also watch context version to detect when tenant context updates
  const contextVersion = tenantContext?._version || 0;
  
  useEffect(() => {
    if (tenant) {
      const currentCurrency = `${tenant.currency_symbol || ''}-${tenant.currency_code || ''}-${tenant.country_code || ''}`;
      if (prevCurrencyRef.current !== currentCurrency) {
        if (prevCurrencyRef.current !== '') {
          // Currency actually changed (not just initial load)
          console.log('💱 Currency values changed in useCurrency:', {
            currencySymbol: tenant.currency_symbol,
            currencyCode: tenant.currency_code,
            countryCode: tenant.country_code,
            previous: prevCurrencyRef.current,
            current: currentCurrency,
            contextVersion: contextVersion
          });
          // Force a re-render when currency actually changes
          setRefreshTrigger(prev => prev + 1);
          setCurrencyVersion(prev => prev + 1);
        }
        // Update ref (both for initial load and changes)
        prevCurrencyRef.current = currentCurrency;
      }
    }
  }, [tenant, contextVersion]); // Watch entire tenant object and context version to catch any updates
  
  // Also watch context version changes directly to force updates
  useEffect(() => {
    if (contextVersion > 0) {
      console.log('🔄 Context version changed, forcing currency update:', contextVersion);
      setCurrencyVersion(prev => prev + 1);
      setRefreshTrigger(prev => prev + 1);
    }
  }, [contextVersion]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (tenantContext?.refresh) {
      tenantContext.refresh().then(() => {
        setRefreshTrigger(prev => prev + 1);
        setCurrencyVersion(prev => prev + 1);
      });
    } else {
      setRefreshTrigger(prev => prev + 1);
      setCurrencyVersion(prev => prev + 1);
    }
  }, [tenantContext]);

  // Calculate currency values - recalculate on every render to ensure fresh values
  // The refreshTrigger and currencyVersion ensure this component re-renders when currency updates
  // Priority: eventCurrency (from Socket.IO/events) > tenant (from context) > defaults
  // This ensures real-time updates take precedence over potentially stale context data
  const currencySymbol = eventCurrency?.currencySymbol || tenant?.currency_symbol || "£";
  const currencyCode = eventCurrency?.currencyCode || tenant?.currency_code || "GBP";
  const countryCode = eventCurrency?.countryCode || tenant?.country_code || "GB";
  
  // Get country name - prioritize event country name (most recent), then country data, then default
  // If eventCountryName is set, use it immediately (it's from the latest update)
  // Otherwise, try to get from country data based on countryCode
  const countryData = countryCode ? getCountryData(countryCode) : null;
  // Priority: eventCountryName (from latest Socket.IO event) > countryData > default
  const countryName = eventCountryName || countryData?.country_name || "United Kingdom";
  
  // Debug logging to track currency source
  // Debug summary logging removed

  // Return currency values - use useMemo to ensure object reference changes when currency updates
  // This forces React to re-render components using this hook when currency updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({
    currencySymbol,
    currencyCode,
    countryCode,
    countryName,
    refresh,
    // Include currencyVersion to ensure object reference changes when currency updates
    _version: currencyVersion, // This ensures the return object has a new reference when currency changes
  }), [currencySymbol, currencyCode, countryCode, countryName, currencyVersion, refresh]);
}
