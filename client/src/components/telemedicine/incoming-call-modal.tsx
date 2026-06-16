import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface IncomingCallData {
  roomId: string;
  fromUserId: string;
  toUserId?: string;
  fromUsername: string;
  isVideo: boolean;
  participants: Array<{
    userId: string;
    username: string;
    isOnline: boolean;
  }>;
  isGroup: boolean;
  groupName: string | null;
  token: string;
  serverUrl: string;
  e2eeKey?: string;
  isDelayedCall: boolean;
}

interface IncomingCallModalProps {
  callData: IncomingCallData | null;
  onAccept: (callData: IncomingCallData) => void;
  onDecline: () => void;
  onTimeout?: () => void;
  isJoining?: boolean;
}

export function IncomingCallModal({
  callData,
  onAccept,
  onDecline,
  onTimeout,
  isJoining = false,
}: IncomingCallModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const { toast } = useToast();

  useEffect(() => {
    console.log('[IncomingCallModal] callData changed:', callData ? 'HAS DATA' : 'NULL');
    if (callData) {
      console.log('[IncomingCallModal] Opening with call from:', callData.fromUsername);
      console.log('[IncomingCallModal] Token present:', !!callData.token);
    }
    
    if (!callData) {
      setTimeRemaining(30);
      return;
    }

    // Countdown timer
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeout) {
            onTimeout();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [callData, onTimeout]);

  if (!callData) {
    return null;
  }

  // Force stop all audio elements in the document (ringtones)
  const forceStopAllAudio = () => {
    console.log('[IncomingCallModal] Force stopping all audio elements...');
    
    // First, call the global stop function if available
    if ((window as any).__stopIncomingCallRingtone) {
      try {
        (window as any).__stopIncomingCallRingtone();
        console.log('[IncomingCallModal] Called __stopIncomingCallRingtone');
      } catch (e) {
        console.log('[IncomingCallModal] Error calling global stop function:', e);
      }
    }
    
    // Also directly stop the audio element if it exists
    if ((window as any).__incomingCallRingtone) {
      try {
        const audio = (window as any).__incomingCallRingtone;
        audio.muted = true;
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
        (window as any).__incomingCallRingtone = null;
        console.log('[IncomingCallModal] Directly stopped __incomingCallRingtone');
      } catch (e) {
        console.log('[IncomingCallModal] Error stopping audio element:', e);
      }
    }
    
    // Also stop all audio elements in the document as fallback
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio, index) => {
      try {
        audio.muted = true;
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
        console.log(`[IncomingCallModal] Stopped document audio element ${index}`);
      } catch (e) {
        console.log(`[IncomingCallModal] Error stopping audio ${index}:`, e);
      }
    });
  };

  const handleAccept = () => {
    console.log('[IncomingCallModal] handleAccept called - stopping ringtone first');
    forceStopAllAudio();
    onAccept(callData);
  };

  const handleDecline = () => {
    console.log('[IncomingCallModal] handleDecline called - stopping ringtone first');
    forceStopAllAudio();
    console.trace('[IncomingCallModal] handleDecline stack trace');
    onDecline();
  };

  const callerName = callData.fromUsername || callData.fromUserId;
  const isGroupCall = callData.isGroup && callData.participants.length > 1;

  const handleOpenChange = (open: boolean) => {
    console.log('[IncomingCallModal] onOpenChange called with:', open);
    if (!open) {
      console.log('[IncomingCallModal] Dialog closing - triggering decline');
      handleDecline();
    }
  };

  return (
    <Dialog open={!!callData} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {callData.isVideo ? 'Incoming Video Call' : 'Incoming Audio Call'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Caller Avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            <Avatar className="w-24 h-24 relative z-10 border-4 border-white">
              <AvatarFallback className="bg-blue-500 text-white text-2xl">
                {callerName.split(' ').map(n => n[0]).join('').slice(0, 2) || <User className="w-12 h-12" />}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-semibold">{callerName}</h3>
            {isGroupCall && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {callData.groupName || `${callData.participants.length} participants`}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {callData.isVideo ? (
                <span className="flex items-center justify-center gap-1">
                  <Video className="w-4 h-4" />
                  Video Call
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <Phone className="w-4 h-4" />
                  Audio Call
                </span>
              )}
            </p>
          </div>

          {/* Timer */}
          <div className="text-sm text-gray-500">
            Auto-decline in {timeRemaining}s
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDecline}
              className="flex-1"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              Decline
            </Button>
            <Button
              size="lg"
              onClick={handleAccept}
              disabled={isJoining}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {callData.isVideo ? (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Accept
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Accept
                </>
              )}
            </Button>
          </div>

          {/* Participants List (for group calls) */}
          {isGroupCall && callData.participants.length > 0 && (
            <div className="w-full mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Participants:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {callData.participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span>{participant.username || participant.userId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

