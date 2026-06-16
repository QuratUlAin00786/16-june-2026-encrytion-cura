import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error";
  title: string;
  message: string;
  details?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
}: FeedbackModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="feedback-modal">
        <div className="flex flex-col items-center gap-4 py-4">
          {type === "success" ? (
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle2 
                className="h-12 w-12 text-green-600 dark:text-green-400" 
                data-testid="icon-success"
              />
            </div>
          ) : (
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
              <XCircle 
                className="h-12 w-12 text-red-600 dark:text-red-400" 
                data-testid="icon-error"
              />
            </div>
          )}
          
          <DialogTitle 
            className={`text-xl font-semibold ${
              type === "success" 
                ? "text-green-700 dark:text-green-400" 
                : "text-red-700 dark:text-red-400"
            }`}
            data-testid="feedback-title"
          >
            {title}
          </DialogTitle>
          
          <p 
            className="text-center text-muted-foreground"
            data-testid="feedback-message"
          >
            {message}
          </p>
          
          {details && (
            <p 
              className="text-center text-sm text-muted-foreground/80 bg-muted px-3 py-2 rounded-md max-w-full overflow-auto"
              data-testid="feedback-details"
            >
              {details}
            </p>
          )}
          
          <Button 
            onClick={onClose} 
            className="mt-2 min-w-[120px]"
            variant={type === "success" ? "default" : "outline"}
            data-testid="button-close-feedback"
          >
            {type === "success" ? "Continue" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
