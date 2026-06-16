import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { getGlobalSocketManager } from '@/services/GlobalSocketManager';
import { roomService } from '@/services/RoomService';
import { useToast } from '@/hooks/use-toast';

interface AudioCallDialogProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  patientName: string;
  patientId: string;
  currentUserId: string;
  mode?: 'caller' | 'callee';
  onCallEnd: () => void;
}

export function AudioCallDialog({
  open,
  onClose,
  roomId,
  patientName,
  patientId,
  currentUserId,
  mode = 'caller',
  onCallEnd,
}: AudioCallDialogProps) {
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remotePeerIdRef = useRef<string>(patientId);

  useEffect(() => {
    let cleanupListeners: (() => void) | undefined;
    
    if (open) {
      initializeCall();
      cleanupListeners = setupWebSocketListeners();
    }

    return () => {
      if (cleanupListeners) {
        cleanupListeners();
      }
      cleanupCall();
    };
  }, [open]);

  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      console.log(`[AudioCallDialog] Initializing call as ${mode}`);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      setupPeerConnection();

      console.log('[AudioCallDialog] Call initialized');
    } catch (error) {
      console.error('[AudioCallDialog] Failed to initialize call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Microphone Access Error',
        description: `Failed to access microphone: ${errorMessage}`,
        variant: 'destructive',
      });
      setCallStatus('ended');
    }
  };

  const setupPeerConnection = () => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        getGlobalSocketManager().sendSignal({
          type: 'ice-candidate',
          from: currentUserId,
          to: remotePeerIdRef.current,
          data: event.candidate,
          roomId,
        });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      console.log('[AudioCallDialog] Remote track received');
      remoteStreamRef.current = event.streams[0];
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
      
      setCallStatus('connected');
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      const state = peerConnectionRef.current?.connectionState;
      console.log('[AudioCallDialog] Connection state:', state);

      if (state === 'connected') {
        setCallStatus('connected');
      } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        handleEndCall();
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
      });
    }
  };

  const setupWebSocketListeners = () => {
    const socketManager = getGlobalSocketManager();
    const handleSignal = async (signal: any) => {
      if (signal.roomId !== roomId) return;

      try {
        if (signal.from && signal.from !== remotePeerIdRef.current) {
          remotePeerIdRef.current = signal.from;
          console.log('[AudioCallDialog] Updated remote peer ID:', signal.from);
        }

        if (signal.type === 'offer' && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          socketManager.sendSignal({
            type: 'answer',
            from: currentUserId,
            to: signal.from,
            data: answer,
            roomId,
          });
        } else if (signal.type === 'answer' && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.data));
        } else if (signal.type === 'ice-candidate' && peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.data));
        } else if (signal.type === 'call-end') {
          handleEndCall();
        }
      } catch (error) {
        console.error('[AudioCallDialog] Error handling signal:', error);
      }
    };

    socketManager.on('call-signal', handleSignal);
    socketManager.on('call-ended', handleEndCall);

    return () => {
      socketManager.off('call-signal', handleSignal);
      socketManager.off('call-ended', handleEndCall);
    };
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      getGlobalSocketManager().sendSignal({
        type: 'offer',
        from: currentUserId,
        to: patientId,
        data: offer,
        roomId,
      });

      console.log('[AudioCallDialog] Offer created and sent');
    } catch (error) {
      console.error('[AudioCallDialog] Failed to create offer:', error);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerMuted(!remoteAudioRef.current.muted);
    }
  };

  const handleEndCall = async () => {
    await cleanupCall();
    getGlobalSocketManager().endCall(roomId);
    setCallStatus('ended');
    onCallEnd();
    onClose();
  };

  const cleanupCall = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCallDuration(0);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (mode === 'caller' && callStatus === 'connecting' && peerConnectionRef.current) {
      const timer = setTimeout(() => {
        createOffer();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [callStatus, mode]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-audio-call">
        <DialogHeader>
          <DialogTitle className="text-center">Audio Call</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold" data-testid="text-patient-name">{patientName}</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-call-status">
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'connected' && formatDuration(callDuration)}
              {callStatus === 'ended' && 'Call Ended'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={toggleMute}
              data-testid="button-toggle-mute"
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={handleEndCall}
              data-testid="button-end-call"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>

            <Button
              variant={isSpeakerMuted ? 'destructive' : 'outline'}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={toggleSpeaker}
              data-testid="button-toggle-speaker"
            >
              {isSpeakerMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </Button>
          </div>

          <audio ref={localAudioRef} autoPlay muted />
          <audio ref={remoteAudioRef} autoPlay />
        </div>
      </DialogContent>
    </Dialog>
  );
}
