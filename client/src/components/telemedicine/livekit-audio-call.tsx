import { useEffect, useRef } from "react";
import { useLiveKitRoom } from "@/hooks/use-livekit-room";
import { LiveKitControls } from "./livekit-controls";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, User, Users } from "lucide-react";
import { RemoteParticipant, Track, RoomEvent } from "livekit-client";

interface LiveKitAudioCallProps {
  roomName: string;
  participantName: string;
  participantRole?: string;
  participantImageUrl?: string | null;
  token?: string;
  serverUrl?: string;
  onDisconnect?: (disconnectedParticipant?: { name: string; role?: string }) => void;
  onConnected?: () => void;
  showControls?: boolean;
  audioEnabled?: boolean;
  connectWhenReady?: boolean;
}

export function LiveKitAudioCall({
  roomName,
  participantName,
  participantRole,
  participantImageUrl,
  token,
  serverUrl,
  onDisconnect,
  onConnected,
  showControls = true,
  audioEnabled = true,
  connectWhenReady = true,
}: LiveKitAudioCallProps) {
  const {
    room,
    isConnected,
    isConnecting,
    error,
    remoteParticipants,
    connect,
    disconnect,
    toggleAudio,
    isAudioEnabled,
  } = useLiveKitRoom();

  // Store audio elements for remote participants
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const connectStartedRef = useRef(false);

  useEffect(() => {
    if (!connectWhenReady || connectStartedRef.current) return;
    connectStartedRef.current = true;

    connect({
      roomName,
      participantName,
      participantRole,
      audioEnabled,
      videoEnabled: false,
      token,
      url: serverUrl,
    });
  }, [
    connectWhenReady,
    roomName,
    participantName,
    participantRole,
    token,
    serverUrl,
    audioEnabled,
    connect,
  ]);

  useEffect(() => {
    return () => {
      connectStartedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (isConnected) {
      onConnected?.();
    }
  }, [isConnected, onConnected]);

  // When the other participant leaves the room (they ended the call), close the call UI
  useEffect(() => {
    if (!room || !onDisconnect) return;
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log("[LiveKitAudioCall] Remote participant left – ending call", participant.identity);
      
      // Extract participant info from identity
      let disconnectedParticipantName = '';
      let disconnectedParticipantRole: string | undefined;
      
      const identityParts = participant.identity?.split(':') || [];
      if (identityParts.length >= 5) {
        disconnectedParticipantRole = identityParts[0];
        const firstName = identityParts[2];
        const lastName = identityParts[3];
        if (firstName && lastName) {
          disconnectedParticipantName = `${firstName} ${lastName}`;
        }
      } else {
        disconnectedParticipantName = participant.name || participant.identity || 'Unknown';
      }
      
      onDisconnect({
        name: disconnectedParticipantName,
        role: disconnectedParticipantRole,
      });
    };
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, onDisconnect]);

  // Attach remote audio tracks to audio elements
  useEffect(() => {
    if (!room || !isConnected) return;

    const attachAudioTracks = (participant: RemoteParticipant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          let audioElement = remoteAudioRefs.current.get(participant.identity);

          if (!audioElement) {
            audioElement = document.createElement("audio");
            audioElement.autoplay = true;
            audioElement.setAttribute("data-participant", participant.identity);
            remoteAudioRefs.current.set(participant.identity, audioElement);
            // Add to DOM (hidden) so it can play
            audioElement.style.display = "none";
            document.body.appendChild(audioElement);
          }

          publication.track.attach(audioElement);
          console.log(
            "🔊 Attached audio track for participant:",
            participant.identity,
          );
        }
      });
    };

    // Attach tracks for existing remote participants
    remoteParticipants.forEach(attachAudioTracks);

    // Listen for new tracks
    const handleTrackSubscribed = (
      track: Track,
      publication: any,
      participant: RemoteParticipant,
    ) => {
      if (track.kind === Track.Kind.Audio) {
        attachAudioTracks(participant);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      // Cleanup audio elements
      remoteAudioRefs.current.forEach((audioElement) => {
        audioElement.remove();
      });
      remoteAudioRefs.current.clear();
    };
  }, [room, isConnected, remoteParticipants]);

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-red-500 mb-4 text-center">❌ {error}</div>
          <button
            onClick={() =>
              connect({
                roomName,
                participantName,
                participantRole,
                token,
                url: serverUrl,
                videoEnabled: false,
                audioEnabled,
              })
            }
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry Connection
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="p-6">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Connecting to call...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      {/* Call Status */}
      <div className="mb-8 text-center">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-blue-500 rounded-full p-6">
            <Phone className="w-12 h-12 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isConnected ? "Call in Progress" : "Connecting..."}
        </h3>
        <p className="text-gray-600">
          {remoteParticipants.length > 0
            ? `${remoteParticipants.length} participant${remoteParticipants.length > 1 ? "s" : ""} in call`
            : "Waiting for other participants..."}
        </p>
      </div>

      {/* Participants List */}
      {remoteParticipants.length > 0 && (
        <Card className="w-full max-w-md mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold">Participants</h4>
            </div>
            <div className="space-y-3">
              {remoteParticipants.map((participant) => (
                <div
                  key={participant.identity}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                >
                  <Avatar>
                    {participantImageUrl ? (
                      <AvatarImage src={participantImageUrl} alt="Profile picture" />
                    ) : null}
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {participant.name || participant.identity}
                    </p>
                    <p className="text-sm text-gray-500">
                      {participant.isMicrophoneEnabled ? "Speaking" : "Muted"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {showControls && isConnected && (
        <LiveKitControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={false}
          onToggleAudio={toggleAudio}
          onToggleVideo={() => {}} // No video in audio call
          onDisconnect={handleDisconnect}
          audioOnly={true}
        />
      )}
    </div>
  );
}
