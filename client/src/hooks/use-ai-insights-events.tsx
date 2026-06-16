import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from './use-tenant';

interface AiInsightSSEEvent {
  type: 'ai_insight.status_updated';
  id: string;
  patientId: string;
  status: string;
  previousStatus?: string;
  updatedAt: string;
  organizationId: number;
}

interface ClinicalInsight {
  id: number;
  organizationId: number;
  patientId: number;
  type: string;
  title: string;
  description: string;
  severity: string;
  actionRequired: boolean;
  confidence: number;
  metadata: any;
  status: string;
  aiStatus?: string;
  createdAt: string;
}

export function useAiInsightsEvents() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectToSSE = () => {
    // Only skip if we explicitly know there's no tenant, but try anyway if undefined (loading state)
    if (tenant?.subdomain === null) {
      console.log('[SSE] No tenant available, skipping SSE connection');
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('[SSE] No auth token available, skipping SSE connection');
      return;
    }

    const subdomain =
      tenant?.subdomain ||
      localStorage.getItem('user_subdomain') ||
      new URLSearchParams(window.location.search).get('subdomain') ||
      'demo';

    try {
      // Create EventSource with credentials for authentication
      const url = `/api/ai-insights/events?token=${encodeURIComponent(token)}&subdomain=${encodeURIComponent(
        subdomain,
      )}`;
      const eventSource = new EventSource(url, {
        withCredentials: true,
      });
      
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connected to AI insights events');
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Received event:', data);
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      // Handle specific AI insight status update events
      eventSource.addEventListener('ai_insight.status_updated', (event) => {
        try {
          const eventData: AiInsightSSEEvent = JSON.parse(event.data);
          console.log('[SSE] 🎯 AI insight status updated received:', eventData);

          // Update React Query cache for all AI insights queries
          queryClient.setQueriesData(
            { predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === '/api/ai-insights' },
            (old?: ClinicalInsight[]) => {
              if (!old) return old;
              
              console.log('[SSE] 📝 Updating cache with new status:', eventData.status);
              
              return old.map(insight => 
                insight.id.toString() === eventData.id 
                  ? { 
                      ...insight, 
                      aiStatus: eventData.status,
                      updatedAt: eventData.updatedAt 
                    }
                  : insight
              );
            }
          );

          // Also update any specific insight detail queries
          queryClient.setQueriesData(
            { predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === '/api/ai-insights' && query.queryKey[1] === eventData.id },
            (old?: ClinicalInsight) => {
              if (!old) return old;
              
              return {
                ...old,
                aiStatus: eventData.status,
                updatedAt: eventData.updatedAt
              };
            }
          );

          console.log(`[SSE] ✅ Updated cache for insight ${eventData.id}: ${eventData.previousStatus} -> ${eventData.status}`);
          
        } catch (error) {
          console.error('[SSE] ❌ Error processing ai_insight.status_updated event:', error);
        }
      });

      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Connection established:', data.message);
        } catch (error) {
          console.error('[SSE] Error parsing connected event:', error);
        }
      });

      eventSource.onerror = (error) => {
        console.error('[SSE] EventSource error:', error);
        console.error('[SSE] EventSource readyState:', eventSource.readyState);
        
        // Don't immediately reconnect on error - let it try to recover
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[SSE] Connection closed, attempting to reconnect...');
          
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`[SSE] Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
              connectToSSE();
            }, delay);
          } else {
            console.error('[SSE] Max reconnection attempts reached, giving up');
          }
        }
      };

    } catch (error) {
      console.error('[SSE] Error creating EventSource:', error);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('[SSE] Disconnected from AI insights events');
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    connectToSSE();

    return () => {
      disconnect();
    };
  }, [tenant?.subdomain]);

  // Keep connection alive during component lifecycle
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't disconnect on page navigation - let the browser handle it
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    connected: eventSourceRef.current?.readyState === EventSource.OPEN,
    disconnect
  };
}