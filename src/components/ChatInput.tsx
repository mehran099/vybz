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
    <form onSubmit={handleSubmit} className="p-3 md:p-4 bg-card border-t border-border relative">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          {/* Mention autocomplete dropdown */}
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleMentionSelect(user.username)}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors ${
                    index === selectedMentionIndex ? 'bg-muted' : ''
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ 
                      background: `linear-gradient(135deg, ${user.display_color}, ${user.display_color}aa)`,
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: user.display_color }}
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
            placeholder="Type a message... Use @ to mention users"
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
        {message.length}/500 • Use @username to mention users
      </div>
    </form>
  );
};