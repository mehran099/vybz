import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  username: string;
  display_color: string;
}

interface DMConversation {
  profile: Profile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface DMListProps {
  currentProfileId: string;
  onSelectConversation: (profile: Profile) => void;
  onlineUsers: Profile[];
}

export const DMList = ({ currentProfileId, onSelectConversation, onlineUsers }: DMListProps) => {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchConversations();
    setupRealtimeSubscription();
  }, [currentProfileId]);

  const fetchConversations = async () => {
    // Fetch recent DMs grouped by conversation partner
    const { data, error } = await supabase
      .from("direct_messages")
      .select(`
        *,
        sender:sender_id(id, username, display_color),
        recipient:recipient_id(id, username, display_color)
      `)
      .or(`sender_id.eq.${currentProfileId},recipient_id.eq.${currentProfileId}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      // Group by conversation partner
      const conversationMap = new Map<string, DMConversation>();

      data.forEach((dm: any) => {
        const partnerId = dm.sender_id === currentProfileId ? dm.recipient_id : dm.sender_id;
        const partner = dm.sender_id === currentProfileId ? dm.recipient : dm.sender;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            profile: partner,
            lastMessage: dm.content,
            lastMessageTime: dm.created_at,
            unreadCount: dm.recipient_id === currentProfileId && !dm.is_read ? 1 : 0,
          });
        } else {
          const existing = conversationMap.get(partnerId)!;
          if (dm.recipient_id === currentProfileId && !dm.is_read) {
            existing.unreadCount++;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } else {
      console.error("Error fetching DMs:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("dm-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `or(sender_id.eq.${currentProfileId},recipient_id.eq.${currentProfileId})`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredConversations = conversations.filter(conv =>
    conv.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold mb-3">Direct Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Recent conversations */}
        {filteredConversations.length > 0 ? (
          <div className="p-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.profile.id}
                onClick={() => onSelectConversation(conv.profile)}
                className="w-full p-3 rounded-lg hover:bg-muted/50 transition-all text-left flex items-start gap-3"
              >
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${conv.profile.display_color}, ${conv.profile.display_color}aa)`,
                    }}
                  >
                    {conv.profile.username[0].toUpperCase()}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="font-semibold text-sm truncate"
                      style={{ color: conv.profile.display_color }}
                    >
                      {conv.profile.username}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(new Date(conv.lastMessageTime), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Click on a user to start chatting!</p>
          </div>
        )}

        {/* Online users to start new DM */}
        <div className="p-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Start a conversation</h3>
          <div className="space-y-1">
            {onlineUsers
              .filter(u => u.id !== currentProfileId)
              .slice(0, 5)
              .map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelectConversation(user)}
                  className="w-full p-2 rounded-lg hover:bg-muted/50 transition-all text-left flex items-center gap-2"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
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
                    {user.username}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};