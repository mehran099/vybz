import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  count?: number;
}

interface ChatMessageProps {
  messageId: string;
  username: string;
  content: string;
  color: string;
  timestamp: string;
  isOwn?: boolean;
  currentUserId?: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

export const ChatMessage = ({ messageId, username, content, color, timestamp, isOwn, currentUserId }: ChatMessageProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    fetchReactions();
    setupRealtimeSubscription();
  }, [messageId]);

  const fetchReactions = async () => {
    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);

    if (data) {
      // Group reactions by emoji
      const grouped = data.reduce((acc: any, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            userIds: [],
          };
        }
        acc[reaction.emoji].count++;
        acc[reaction.emoji].userIds.push(reaction.user_id);
        return acc;
      }, {});

      setReactions(Object.values(grouped));
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;

    // Check if user already reacted with this emoji
    const { data: existing } = await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", currentUserId)
      .eq("emoji", emoji)
      .single();

    if (existing) {
      // Remove reaction
      await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      // Add reaction
      await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });
    }

    setShowEmojiPicker(false);
  };

  return (
    <div className={`group flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all ${isOwn ? 'bg-primary/5' : ''}`}>
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ 
          background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          boxShadow: `0 0 20px ${color}40`
        }}
      >
        {username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span 
            className="font-semibold text-sm"
            style={{ color }}
          >
            {username}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(timestamp), 'HH:mm')}
          </span>
          
          {/* Reaction button - shows on hover */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
              >
                <Smile className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-xl hover:bg-muted rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-sm text-foreground break-words mb-2">{content}</p>
        
        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {reactions.map((reaction: any) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                  currentUserId && reaction.userIds?.includes(currentUserId)
                    ? 'bg-primary/20 border border-primary'
                    : 'bg-muted hover:bg-muted/70'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs font-medium">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};