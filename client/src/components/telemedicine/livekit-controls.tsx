import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveKitControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onDisconnect: () => void;
  audioOnly?: boolean;
  className?: string;
}

export function LiveKitControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onDisconnect,
  audioOnly = false,
  className,
}: LiveKitControlsProps) {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2',
        className
      )}
    >
      {/* Audio Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleAudio}
        className={cn(
          'rounded-full w-12 h-12',
          isAudioEnabled
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        )}
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </Button>

      {/* Video Toggle (only for video calls) */}
      {!audioOnly && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleVideo}
          className={cn(
            'rounded-full w-12 h-12',
            isVideoEnabled
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          )}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </Button>
      )}

      {/* Disconnect Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDisconnect}
        className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white"
        title="End call"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  );
}

