import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
}

interface User {
  id: string;
  username: string;
  display_color: string;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_color")
      .order("username");
    
    if (data) {
      setUsers(data);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setMessage(value);
    
    // Check for @ mention
    const beforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      
      // Only show mentions if @ is at start or has space before it
      const charBeforeAt = lastAtIndex > 0 ? beforeCursor[lastAtIndex - 1] : ' ';
      
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !afterAt.includes(' ')) {
        setMentionSearch(afterAt.toLowerCase());
        setMentionPosition(lastAtIndex);
        setShowMentions(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const beforeMention = message.slice(0, mentionPosition);
    const afterMention = message.slice(message.indexOf(' ', mentionPosition) !== -1 
      ? message.indexOf(' ', mentionPosition) 
      : message.length);
    
    const newMessage = `${beforeMention}@${username} ${afterMention}`;
    setMessage(newMessage);
    setShowMentions(false);
    
    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentions) return;
    
    const filteredUsers = users.filter(u => 
      u.username.toLowerCase().includes(mentionSearch)
    );
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev => 
        prev < filteredUsers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && filteredUsers.length > 0) {
      e.preventDefault();
      handleMentionSelect(filteredUsers[selectedMentionIndex].username);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

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
      setShowMentions(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(mentionSearch)
  ).slice(0, 5);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          {/* Mention autocomplete dropdown - Gaming Style */}
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-card/95 backdrop-blur-xl border-2 border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)] overflow-hidden z-50">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider px-3 py-2 border-b border-primary/20 bg-primary/10">
                // MENTION USER
              </div>
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleMentionSelect(user.username)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all border-l-2 ${
                    index === selectedMentionIndex 
                      ? 'bg-primary/20 border-primary' 
                      : 'border-transparent hover:bg-muted/50 hover:border-primary/50'
                  }`}
                >
                  <div 
                    className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-black border-2"
                    style={{ 
                      background: `linear-gradient(135deg, ${user.display_color}, ${user.display_color}dd)`,
                      borderColor: user.display_color,
                      boxShadow: `0 0 10px ${user.display_color}40`
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  <span 
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ 
                      color: user.display_color,
                      textShadow: `0 0 8px ${user.display_color}60`
                    }}
                  >
                    @{user.username}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          <Input
            ref={inputRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="TYPE MESSAGE... USE @ TO MENTION"
            disabled={disabled || isSending}
            className="h-12 pr-12 bg-input/60 border-2 border-border hover:border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)] text-sm font-medium placeholder:text-muted-foreground/50 placeholder:uppercase placeholder:text-xs placeholder:tracking-wider transition-all"
            maxLength={500}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-accent hover:bg-accent/10 border border-transparent hover:border-accent/30 transition-all"
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          variant="gradient"
          size="icon"
          className="h-12 w-12 shrink-0"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
          {message.length}/500 • @ TO MENTION
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
          <span className="text-[9px] text-primary font-bold uppercase tracking-wider">READY</span>
        </div>
      </div>
    </form>
  );
};