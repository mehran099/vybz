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
    <div className={`group flex gap-3 p-2 hover:bg-muted/30 rounded-xl transition-all relative ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 shadow-lg"
        style={{ 
          background: color,
        }}
      >
        <span className="text-white">
          {username[0].toUpperCase()}
        </span>
      </div>

      {/* Message content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'flex flex-col items-end' : ''}`}>
        {/* Header */}
        <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span 
            className="font-semibold text-sm"
            style={{ color }}
          >
            {username}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(timestamp), 'HH:mm')}
          </span>
          
          {/* Reaction button */}
          {!isOwn && (
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
              <PopoverContent className="w-auto p-2 bg-card/95 backdrop-blur-xl border-2 border-primary/30">
                <div className="flex gap-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="text-xl hover:bg-primary/20 rounded p-1.5 transition-all hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Message bubble */}
        <div 
          className={`inline-block max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card border border-border'
          }`}
        >
          <p className="text-sm leading-relaxed break-words">
            {content.split(/(@\w+)/g).map((part, index) => {
              if (part.startsWith('@')) {
                return (
                  <span 
                    key={index}
                    className="font-semibold bg-accent/20 px-1.5 py-0.5 rounded-lg"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={index}>{part}</span>;
            })}
          </p>
        </div>
        
        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex gap-1.5 flex-wrap mt-2 ${isOwn ? 'justify-end' : ''}`}>
            {reactions.map((reaction: any) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all ${
                  currentUserId && reaction.userIds?.includes(currentUserId)
                    ? 'bg-primary/20 border-2 border-primary/50'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-semibold">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};