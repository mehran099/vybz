import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Video, PhoneOff } from "lucide-react";
import { CallParticipant, CallType } from "@/utils/webrtc";

interface IncomingCallModalProps {
  isOpen: boolean;
  caller: CallParticipant;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal = ({
  isOpen,
  caller,
  callType,
  onAccept,
  onReject
}: IncomingCallModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Incoming Call</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Caller Avatar */}
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-xl animate-pulse"
            style={{ backgroundColor: caller.display_color }}
          >
            {caller.username.charAt(0).toUpperCase()}
          </div>

          {/* Caller Info */}
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-1">{caller.username}</h3>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              {callType === 'video' ? (
                <>
                  <Video className="w-4 h-4" />
                  Video Call
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Voice Call
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={onReject}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              variant="default"
              size="lg"
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              {callType === 'video' ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
