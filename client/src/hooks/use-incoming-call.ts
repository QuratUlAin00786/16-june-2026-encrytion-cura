import { useState, useEffect, useCallback } from 'react';
import { socketManager, buildSocketUserIdentifier, isIncomingCallForUser } from '@/lib/socket-manager';
import { resolveLiveKitServerUrl } from '@/lib/livekit-url';
import { useAuth } from '@/hooks/use-auth';
import type { IncomingCallData } from '@/components/telemedicine/incoming-call-modal';

export interface UseIncomingCallReturn {
  incomingCall: IncomingCallData | null;
  acceptCall: (callData: IncomingCallData) => void;
  declineCall: () => void;
  clearIncomingCall: () => void;
}

export function useIncomingCall(): UseIncomingCallReturn {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    // Listen for incoming call events
    const unsubscribe = socketManager.on('incoming_call', (callData: any) => {
      if (!isIncomingCallForUser(callData, user)) {
        console.log('📞 Ignoring incoming call (not for this user or user is caller):', {
          fromUserId: callData?.fromUserId,
          toUserId: callData?.toUserId || callData?.to,
        });
        return;
      }

      console.log('📞 Incoming call received in hook:', callData);
      console.log('📞 Incoming call - roomId:', callData.roomId);
      console.log('📞 Incoming call - fromUserId:', callData.fromUserId);
      console.log('📞 Incoming call - fromUsername:', callData.fromUsername);
      console.log('📞 Incoming call - token exists:', !!callData.token);
      console.log('📞 Incoming call - serverUrl:', callData.serverUrl);
      console.log('📞 Incoming call - isVideo:', callData.isVideo);

      // Check if token is missing - this would prevent accepting the call
      if (!callData.token) {
        console.error('📞 WARNING: Incoming call is missing token - call may not work properly');
      }

      // Transform the call data to match our interface
      const transformedCallData: IncomingCallData = {
        roomId: callData.roomId,
        fromUserId: callData.fromUserId,
        toUserId: callData.toUserId || callData.to,
        fromUsername: callData.fromUsername,
        isVideo: callData.isVideo || false,
        participants: callData.participants || [],
        isGroup: callData.isGroup || false,
        groupName: callData.groupName || null,
        token: callData.token,
        serverUrl: resolveLiveKitServerUrl(callData.serverUrl),
        e2eeKey: callData.e2eeKey,
        isDelayedCall: callData.isDelayedCall || false,
      };

      console.log('📞 Transformed call data:', transformedCallData);
      setIncomingCall(transformedCallData);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const acceptCall = useCallback((callData: IncomingCallData) => {
    console.log('✅ Accepting incoming call:', callData);
    setIncomingCall(null);
    // The actual joining will be handled by the component that uses this hook
  }, []);

  const declineCall = useCallback(() => {
    console.log('❌ Declining incoming call');
    const currentCall = incomingCall;
    setIncomingCall(null);
    
    if (currentCall) {
      const calleeId = buildSocketUserIdentifier(user);
      socketManager.emitToServer('call_declined', {
        roomId: currentCall.roomId,
        fromUserId: calleeId || undefined,
        toUserId: currentCall.fromUserId,
        isGroup: currentCall.isGroup || false,
      });

      console.log('[IncomingCall] Emitted call_declined to caller:', currentCall.fromUserId);
    }
  }, [incomingCall, user]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    acceptCall,
    declineCall,
    clearIncomingCall,
  };
}

