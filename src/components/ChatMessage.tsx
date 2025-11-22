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
    <div className={`group flex gap-3 p-3 hover:bg-muted/10 transition-all relative ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar with neon glow */}
      <div 
        className="w-10 h-10 rounded-sm flex items-center justify-center text-sm font-black shrink-0 border-2 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          borderColor: color,
          boxShadow: `0 0 20px ${color}60, inset 0 0 20px ${color}30`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {username[0].toUpperCase()}
        </span>
      </div>

      {/* Message content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'flex flex-col items-end' : ''}`}>
        {/* Header */}
        <div className={`flex items-baseline gap-2 mb-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span 
            className="font-bold text-sm tracking-wide"
            style={{ 
              color,
              textShadow: `0 0 10px ${color}80`
            }}
          >
            {username.toUpperCase()}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase">
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
          className={`inline-block max-w-[85%] px-4 py-2.5 relative group/bubble ${
            isOwn 
              ? 'bg-primary/20 border-2 border-primary/40 rounded-l-lg rounded-br-lg' 
              : 'bg-card/60 border-2 border-border/50 rounded-r-lg rounded-bl-lg'
          }`}
          style={isOwn ? {
            boxShadow: `0 0 20px ${color}30, inset 0 0 20px ${color}10`
          } : {}}
        >
          {/* Corner accent */}
          <div 
            className={`absolute w-2 h-2 ${isOwn ? '-left-1 bottom-0' : '-right-1 bottom-0'}`}
            style={{ 
              background: isOwn ? color : 'hsl(var(--border))',
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)'
            }}
          />
          
          <p className="text-sm leading-relaxed break-words">
            {content.split(/(@\w+)/g).map((part, index) => {
              if (part.startsWith('@')) {
                return (
                  <span 
                    key={index}
                    className="font-bold bg-accent/30 px-1.5 py-0.5 rounded border border-accent/50"
                    style={{ 
                      color: 'hsl(var(--accent))',
                      textShadow: '0 0 10px hsl(var(--accent) / 0.5)'
                    }}
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
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold transition-all border-2 ${
                  currentUserId && reaction.userIds?.includes(currentUserId)
                    ? 'bg-primary/20 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.4)] scale-105'
                    : 'bg-muted/50 border-border hover:bg-muted hover:border-primary/50 hover:scale-105'
                }`}
              >
                <span className="text-base">{reaction.emoji}</span>
                <span className="font-black">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};