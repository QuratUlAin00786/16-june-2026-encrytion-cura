import { Card, CardContent } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface OutgoingCallWaitingProps {
  calleeName: string;
  isVideo?: boolean;
  onCancel?: () => void;
}

/** Shown for the caller while ringing — LiveKit connects after the callee accepts. */
export function OutgoingCallWaiting({
  calleeName,
  isVideo = true,
  onCancel,
}: OutgoingCallWaitingProps) {
  return (
    <Card className="border-0 shadow-none">
      <CardContent className="relative flex flex-col items-center justify-center min-h-[400px] gap-6">
        <span
          className="pointer-events-none absolute w-32 h-32 rounded-full border-2 border-primary/30 animate-ping"
          aria-hidden
        />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
          <Phone className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">
            {isVideo ? "Calling" : "Audio call to"} {calleeName}
          </p>
          <p className="text-sm text-muted-foreground">Ringing… waiting for them to answer</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 px-6 py-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Cancel call
          </button>
        )}
      </CardContent>
    </Card>
  );
}
