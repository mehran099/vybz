import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile } from "lucide-react";
import { toast } from "sonner";

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSending) return;

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 500) {
      toast.error("Message too long (max 500 characters)");
      return;
    }

    setIsSending(true);
    try {
      await onSendMessage(trimmedMessage);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 md:p-4 bg-card border-t border-border">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={disabled || isSending}
            className="pr-10 bg-input border-border focus:ring-2 focus:ring-primary text-sm md:text-base"
            maxLength={500}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-accent hidden sm:flex"
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground shadow-lg hover:shadow-glow h-10 w-10 md:h-auto md:w-auto md:px-4"
          size="icon"
        >
          <Send className="w-4 h-4" />
          <span className="hidden md:inline ml-2">Send</span>
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        {message.length}/500
      </div>
    </form>
  );
};