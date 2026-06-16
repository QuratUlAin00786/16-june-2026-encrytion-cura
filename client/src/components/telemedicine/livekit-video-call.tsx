import { useEffect, useRef } from "react";
import { useLiveKitRoom } from "@/hooks/use-livekit-room";
import { LiveKitControls } from "./livekit-controls";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, VideoOff, User } from "lucide-react";
import { RemoteParticipant, Track, RoomEvent } from "livekit-client";

interface LiveKitVideoCallProps {
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
  videoEnabled?: boolean;
  /** When false, show ringing UI until callee accepts (outgoing calls). */
  connectWhenReady?: boolean;
}

export function LiveKitVideoCall({
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
  videoEnabled = true,
  connectWhenReady = true,
}: LiveKitVideoCallProps) {
  const {
    room,
    isConnected,
    isConnecting,
    error,
    localParticipant,
    remoteParticipants,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
  } = useLiveKitRoom();

  const localVideoPublication = localParticipant
    ? Array.from(localParticipant.videoTrackPublications.values())[0]
    : undefined;
  const hasActiveLocalVideo = !!localVideoPublication?.track;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const connectStartedRef = useRef(false);

  // Connect when ready (outgoing: after callee accepts). Do not disconnect when
  // isConnecting/isConnected change — that re-ran this effect and killed the room.
  useEffect(() => {
    if (!connectWhenReady || connectStartedRef.current) return;
    connectStartedRef.current = true;

    connect({
      roomName,
      participantName,
      participantRole,
      audioEnabled,
      videoEnabled,
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
    videoEnabled,
    connect,
  ]);

  useEffect(() => {
    return () => {
      console.log("[LiveKitVideoCall] Component unmounting, disconnecting...");
      connectStartedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (isConnected) {
      onConnected?.();
    }
  }, [isConnected, onConnected]);

  // Attach local video track
  useEffect(() => {
    if (!room || !localParticipant || !localVideoRef.current) return;

    // Function to attach local video track
    const attachLocalVideo = () => {
      if (!localVideoRef.current) return;

      // Get the first video track publication
      const videoPublication = Array.from(
        localParticipant.videoTrackPublications.values(),
      )[0];
      if (videoPublication?.track && localVideoRef.current) {
        videoPublication.track.attach(localVideoRef.current);
        console.log("📹 Attached local video track");
      }
    };

    // Attach immediately if track exists
    attachLocalVideo();

    // Listen for local track published events
    const handleLocalTrackPublished = (publication: any, participant: any) => {
      if (publication.kind === "video" && participant.isLocal) {
        console.log("📹 Local video track published");
        attachLocalVideo();
      }
    };

    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      if (localVideoRef.current) {
        const videoPublication = Array.from(
          localParticipant.videoTrackPublications.values(),
        )[0];
        if (videoPublication?.track) {
          videoPublication.track.detach();
        }
      }
    };
  }, [room, localParticipant, hasActiveLocalVideo]);

  // When the other participant leaves the room (they ended the call), close the call UI
  useEffect(() => {
    if (!room || !onDisconnect) return;
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log("[LiveKitVideoCall] Remote participant left – ending call", participant.identity);
      
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

  // Attach remote video and audio tracks
  useEffect(() => {
    if (!room || !isConnected) return;

    // Function to attach video track for a participant
    const attachVideoTrack = (participant: RemoteParticipant) => {
      const videoPublication = Array.from(
        participant.videoTrackPublications.values(),
      )[0];
      const videoTrack = videoPublication?.track;

      if (videoTrack) {
        let videoElement = remoteVideoRefs.current.get(participant.identity);
        if (!videoElement) {
          videoElement = document.createElement("video");
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = false;
          videoElement.className = "w-full h-full object-cover rounded-lg";
          remoteVideoRefs.current.set(participant.identity, videoElement);
          console.log(
            "📹 Created video element for participant:",
            participant.identity,
          );
        }

        if (videoElement) {
          videoTrack.attach(videoElement);
          console.log(
            "📹 Attached video track for participant:",
            participant.identity,
          );
        }
      }
    };

    // Function to attach audio track for a participant
    const attachAudioTrack = (participant: RemoteParticipant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          let audioElement = remoteAudioRefs.current.get(participant.identity);

          if (!audioElement) {
            audioElement = document.createElement("audio");
            audioElement.autoplay = true;
            audioElement.setAttribute("data-participant", participant.identity);
            remoteAudioRefs.current.set(participant.identity, audioElement);
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
    remoteParticipants.forEach((participant) => {
      attachVideoTrack(participant);
      attachAudioTrack(participant);
    });

    // Listen for new tracks
    const handleTrackSubscribed = (
      track: Track,
      publication: any,
      participant: RemoteParticipant,
    ) => {
      console.log("📹 Track subscribed:", track.kind, participant.identity);

      if (track.kind === Track.Kind.Video) {
        attachVideoTrack(participant);
        // Force a small delay to ensure DOM is ready, then trigger re-render
        setTimeout(() => {
          // This will cause the ref callbacks to run again
          const event = new Event("resize");
          window.dispatchEvent(event);
        }, 100);
      } else if (track.kind === Track.Kind.Audio) {
        attachAudioTrack(participant);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    return () => {
      if (room) {
        room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      }
      remoteVideoRefs.current.forEach((element) => {
        element.remove();
      });
      remoteVideoRefs.current.clear();
      remoteAudioRefs.current.forEach((element) => {
        element.remove();
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
        <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-500 mb-4 text-center">❌ {error}</div>
          <button
            onClick={() =>
              connect({
                roomName,
                participantName,
                participantRole,
                token,
                url: serverUrl,
                audioEnabled,
                videoEnabled,
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

  if (!connectWhenReady) {
    return null;
  }

  const localProfileInitials = participantName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (isConnecting) {
    return (
      <Card className="p-6">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Connecting to call...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Remote Participants - Full Screen Layout like Google Meet */}
      <div className="absolute inset-0 flex items-center justify-center">
        {remoteParticipants.length > 0 ? (
          remoteParticipants.length === 1 ? (
            // Single participant - full screen
            <div
              key={remoteParticipants[0].identity}
              className="w-full h-full bg-gray-900 flex items-center justify-center"
              ref={(el) => {
                if (el) {
                  const videoEl = remoteVideoRefs.current.get(
                    remoteParticipants[0].identity,
                  );
                  if (videoEl) {
                    videoEl.className = "w-full h-full object-contain";
                    while (el.firstChild) {
                      el.removeChild(el.firstChild);
                    }
                    el.appendChild(videoEl);
                  }
                }
              }}
            >
              {remoteParticipants[0].videoTrackPublications.size === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar className="w-32 h-32">
                    <AvatarFallback className="bg-gray-700 text-white text-4xl">
                      <User className="w-16 h-16" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="absolute bottom-24 left-4 bg-black/60 text-white px-3 py-2 rounded-lg text-base font-medium">
                {remoteParticipants[0].name || remoteParticipants[0].identity}
              </div>
            </div>
          ) : (
            // Multiple participants - grid layout
            <div className="w-full h-full grid grid-cols-2 gap-2 p-2">
              {remoteParticipants.map((participant) => {
                const hasVideo = participant.videoTrackPublications.size > 0;
                return (
                  <div
                    key={participant.identity}
                    className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
                    ref={(el) => {
                      if (el) {
                        const videoEl = remoteVideoRefs.current.get(
                          participant.identity,
                        );
                        if (videoEl) {
                          videoEl.className = "w-full h-full object-contain";
                          while (el.firstChild) {
                            el.removeChild(el.firstChild);
                          }
                          el.appendChild(videoEl);
                        }
                      }
                    }}
                  >
                    {!hasVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="w-24 h-24">
                          <AvatarFallback>
                            <User className="w-12 h-12" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {participant.name || participant.identity}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Waiting for other participants...</p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video Preview */}
      {isConnected && localParticipant && (
        <div className="absolute bottom-20 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10">
          {hasActiveLocalVideo ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Avatar className="h-full w-full rounded-none">
                {participantImageUrl ? (
                  <AvatarImage
                    src={participantImageUrl}
                    alt="Profile picture"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <AvatarFallback className="h-full w-full rounded-none bg-gray-700 text-2xl text-white">
                  {localProfileInitials || <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
            You
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && isConnected && (
        <LiveKitControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}
