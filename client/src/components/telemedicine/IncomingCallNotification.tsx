import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { getGlobalSocketManager, IncomingCall } from '@/services/GlobalSocketManager';

interface IncomingCallNotificationProps {
  onAccept: (call: IncomingCall) => void;
  onReject: (call: IncomingCall) => void;
}

export function IncomingCallNotification({
  onAccept,
  onReject,
}: IncomingCallNotificationProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    const socketManager = getGlobalSocketManager();
    const handleIncomingCall = (call: IncomingCall) => {
      console.log('[IncomingCallNotification] Incoming call received:', call);
      setIncomingCall(call);
      setIsRinging(true);
      playRingtone();
    };

    socketManager.on('incoming-call', handleIncomingCall);

    return () => {
      socketManager.off('incoming-call', handleIncomingCall);
      stopRingtone();
    };
  }, []);

  const playRingtone = () => {
    const audio = new Audio('/ringtone.mp3');
    audio.loop = true;
    audio.play().catch((error) => {
      console.error('[IncomingCallNotification] Failed to play ringtone:', error);
    });
  };

  const stopRingtone = () => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const handleAccept = () => {
    if (!incomingCall) return;

    stopRingtone();
    setIsRinging(false);
    onAccept(incomingCall);
    setIncomingCall(null);
  };

  const handleReject = () => {
    if (!incomingCall) return;

    stopRingtone();
    setIsRinging(false);
    onReject(incomingCall);
    setIncomingCall(null);
  };

  const handleClose = () => {
    handleReject();
  };

  return (
    <Dialog open={isRinging && !!incomingCall} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-incoming-call">
        <DialogHeader>
          <DialogTitle className="text-center">Incoming Call</DialogTitle>
          <DialogDescription className="text-center">
            {incomingCall?.callerName || 'Unknown'} is calling...
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Phone className="h-12 w-12 text-primary" />
          </div>

          <h3 className="text-2xl font-semibold" data-testid="text-caller-name">
            {incomingCall?.callerName || 'Unknown Caller'}
          </h3>

          <div className="flex items-center gap-6">
            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={handleReject}
              data-testid="button-reject-call"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>

            <Button
              variant="default"
              size="icon"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={handleAccept}
              data-testid="button-accept-call"
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
