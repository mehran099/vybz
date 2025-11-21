import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Smile, Phone, Video } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  display_color: string;
}

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  is_read: boolean;
}

interface DirectMessageViewProps {
  currentProfileId: string;
  partner: Profile;
  onBack: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
}

export const DirectMessageView = ({ currentProfileId, partner, onBack, onVoiceCall, onVideoCall }: DirectMessageViewProps) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    setupRealtimeSubscription();
  }, [partner.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentProfileId},recipient_id.eq.${partner.id}),` +
        `and(sender_id.eq.${partner.id},recipient_id.eq.${currentProfileId})`
      )
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    } else {
      console.error("Error fetching DMs:", error);
    }
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("recipient_id", currentProfileId)
      .eq("sender_id", partner.id)
      .eq("is_read", false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`dm-${currentProfileId}-${partner.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          if (
            (newMsg.sender_id === currentProfileId && newMsg.recipient_id === partner.id) ||
            (newMsg.sender_id === partner.id && newMsg.recipient_id === currentProfileId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.sender_id === partner.id) {
              markMessagesAsRead();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
        },
        () => {
          checkTypingStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkTypingStatus = async () => {
    const { data } = await supabase
      .from("typing_indicators")
      .select("*")
      .eq("user_id", partner.id)
      .eq("dm_partner_id", currentProfileId)
      .eq("is_typing", true)
      .single();

    setIsTyping(!!data);
  };

  const updateTypingStatus = async (typing: boolean) => {
    if (typing) {
      await supabase.from("typing_indicators").upsert({
        user_id: currentProfileId,
        dm_partner_id: partner.id,
        is_typing: true,
        updated_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("user_id", currentProfileId)
        .eq("dm_partner_id", partner.id);
    }
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      updateTypingStatus(true);
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 3000);
    } else {
      updateTypingStatus(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    updateTypingStatus(false);

    try {
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: currentProfileId,
        recipient_id: partner.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending DM:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 bg-card border-b border-border px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: `linear-gradient(135deg, ${partner.display_color}, ${partner.display_color}aa)`,
          }}
        >
          {partner.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold" style={{ color: partner.display_color }}>
            {partner.username}
          </h3>
          {isTyping && (
            <p className="text-xs text-muted-foreground">typing...</p>
          )}
        </div>
        
        {/* Call Buttons */}
        <div className="flex items-center gap-2">
          {onVoiceCall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceCall}
              className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
            >
              <Phone className="w-5 h-5" />
            </Button>
          )}
          {onVideoCall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVideoCall}
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
            >
              <Video className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isSent = msg.sender_id === currentProfileId;
          return (
            <div
              key={msg.id}
              className={`flex ${isSent ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  isSent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-xs opacity-70">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                  {isSent && msg.is_read && (
                    <span className="text-xs opacity-70">✓✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-card border-t border-border">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              maxLength={500}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};