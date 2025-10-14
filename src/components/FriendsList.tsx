import { useEffect, useState } from "react";
import { Users, Check, X, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  friend?: {
    id: string;
    username: string;
    display_color: string;
    is_online?: boolean;
  };
  user?: {
    id: string;
    username: string;
    display_color: string;
  };
}

interface FriendsListProps {
  currentUserId: string;
  onDMClick?: (userId: string, username: string) => void;
}

export const FriendsList = ({ currentUserId, onDMClick }: FriendsListProps) => {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriendships();

    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchFriendships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchFriendships = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:profiles!friendships_friend_id_fkey(id, username, display_color),
        user:profiles!friendships_user_id_fkey(id, username, display_color)
      `)
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

    if (error) {
      console.error('Error fetching friendships:', error);
      return;
    }

    const accepted = data.filter((f: Friendship) => f.status === 'accepted');
    const pending = data.filter((f: Friendship) => 
      f.status === 'pending' && f.friend_id === currentUserId
    );

    setFriendships(accepted);
    setPendingRequests(pending);
  };

  const handleAcceptRequest = async (friendshipId: string, username: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Friend Added",
        description: `You're now friends with ${username}`,
      });
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 bg-card/50 backdrop-blur-xl border-l border-white/10 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Friends</h3>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {pendingRequests.length > 0 && (
          <div className="p-4 border-b border-white/10">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Pending Requests</h4>
            <div className="space-y-2">
              {pendingRequests.map((request) => {
                const requester = request.user;
                if (!requester) return null;
                
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${requester.display_color}, ${requester.display_color}aa)`,
                        }}
                      >
                        {requester.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: requester.display_color }}>
                        {requester.username}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                        onClick={() => handleAcceptRequest(request.id, requester.username)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 space-y-2">
          {friendships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No friends yet</p>
              <p className="text-xs mt-1">Start adding friends to connect!</p>
            </div>
          ) : (
            friendships.map((friendship) => {
              const friend = friendship.user_id === currentUserId ? friendship.friend : friendship.user;
              if (!friend) return null;

              return (
                <div
                  key={friendship.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
                  onClick={() => onDMClick?.(friend.id, friend.username)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${friend.display_color}, ${friend.display_color}aa)`,
                        }}
                      >
                        {friend.username[0].toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
                    </div>
                    <span className="font-medium" style={{ color: friend.display_color }}>
                      {friend.username}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
