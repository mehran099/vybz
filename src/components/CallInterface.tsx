import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { WebRTCManager, CallParticipant, CallType } from "@/utils/webrtc";
import { toast } from "sonner";

interface CallInterfaceProps {
  callId: string;
  isInitiator: boolean;
  callType: CallType;
  localUser: CallParticipant;
  remoteUser: CallParticipant;
  onEndCall: () => void;
}

export const CallInterface = ({
  callId,
  isInitiator,
  callType,
  localUser,
  remoteUser,
  onEndCall
}: CallInterfaceProps) => {
  const [webrtc, setWebrtc] = useState<WebRTCManager | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isConnecting, setIsConnecting] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initializeCall();

    return () => {
      webrtc?.endCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      const manager = new WebRTCManager(callId, isInitiator);
      
      const localStream = await manager.initialize(
        callType,
        (remoteStream) => {
          // Remote stream received
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnecting(false);
          toast.success("Call connected!");
        },
        () => {
          // Call ended
          onEndCall();
        }
      );

      // Set local stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      setWebrtc(manager);
    } catch (error) {
      console.error('Error initializing call:', error);
      toast.error("Failed to start call");
      onEndCall();
    }
  };

  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    webrtc?.toggleAudio(newState);
    setIsAudioEnabled(newState);
  };

  const toggleVideo = () => {
    const newState = !isVideoEnabled;
    webrtc?.toggleVideo(newState);
    setIsVideoEnabled(newState);
  };

  const handleEndCall = () => {
    webrtc?.endCall();
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col bg-card/90 backdrop-blur-xl border-primary/20">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: remoteUser.display_color }}
            >
              {remoteUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-lg">{remoteUser.username}</h2>
              <p className="text-sm text-muted-foreground">
                {isConnecting ? "Connecting..." : "Connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            <span className="text-sm text-muted-foreground">
              {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </span>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-muted/50 overflow-hidden">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local Video (Picture-in-Picture) */}
          {callType === 'video' && (
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div 
                  className="absolute inset-0 flex items-center justify-center text-white font-semibold text-2xl"
                  style={{ backgroundColor: localUser.display_color }}
                >
                  {localUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          {/* Remote user avatar (when video is off) */}
          {callType === 'audio' || !isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-2xl"
                style={{ backgroundColor: remoteUser.display_color }}
              >
                {remoteUser.username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-center gap-4">
            {/* Mute Audio */}
            <Button
              variant={isAudioEnabled ? "outline" : "destructive"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>

            {/* Toggle Video (only for video calls) */}
            {callType === 'video' && (
              <Button
                variant={isVideoEnabled ? "outline" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
            )}

            {/* End Call */}
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
