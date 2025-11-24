import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, UserPlus, Check, X, Search, Users } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  display_color: string;
  last_seen: string;
  bio?: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend_profile?: Profile;
  user_profile?: Profile;
}

export default function Friends() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadFriends();
      loadRequests();
      setupRealtimeSubscription();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (profile) {
        setCurrentUserId(profile.id);
      }
    }
  };

  const loadFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        *,
        friend_profile:profiles!friendships_friend_id_fkey(*)
      `)
      .eq("user_id", currentUserId)
      .eq("status", "accepted");

    if (data) {
      setFriends(data);
    }
  };

  const loadRequests = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        *,
        user_profile:profiles!friendships_user_id_fkey(*)
      `)
      .eq("friend_id", currentUserId)
      .eq("status", "pending");

    if (data) {
      setRequests(data);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("friendships-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        () => {
          loadFriends();
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${searchQuery}%`)
      .neq("id", currentUserId)
      .limit(10);

    if (data) {
      setSearchResults(data);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    const { error } = await supabase
      .from("friendships")
      .insert({
        user_id: currentUserId,
        friend_id: friendId,
        status: "pending",
      });

    if (error) {
      toast.error("Failed to send friend request");
    } else {
      toast.success("Friend request sent!");
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (!error) {
      // Create reciprocal friendship
      const request = requests.find(r => r.id === friendshipId);
      if (request) {
        await supabase.from("friendships").insert({
          user_id: currentUserId,
          friend_id: request.user_id,
          status: "accepted",
        });
      }
      toast.success("Friend request accepted!");
      loadFriends();
      loadRequests();
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (!error) {
      toast.success("Friend request rejected");
      loadRequests();
    }
  };

  const isOnline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    return (now.getTime() - lastSeenDate.getTime()) < 5 * 60 * 1000; // 5 minutes
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Friends
              </h1>
            </div>
            <Button onClick={() => navigate("/chat")} variant="outline">
              Back to Chat
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <Card className="p-4 mb-6 bg-card/50 backdrop-blur-xl border-2 border-primary/20">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="pl-10 bg-background/50"
              />
            </div>
            <Button onClick={searchUsers} className="bg-gradient-to-r from-primary to-accent">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2" style={{ borderColor: user.display_color }}>
                      <AvatarFallback style={{ background: user.display_color }}>
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
                    </div>
                  </div>
                  <Button
                    onClick={() => sendFriendRequest(user.id)}
                    size="sm"
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-xl border-2 border-primary/20">
            <TabsTrigger value="friends">
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({requests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {friends.map((friendship) => {
                const friend = friendship.friend_profile;
                if (!friend) return null;

                return (
                  <Card
                    key={friendship.id}
                    className="p-4 bg-card/50 backdrop-blur-xl border-2 border-primary/20 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2" style={{ borderColor: friend.display_color }}>
                            <AvatarFallback style={{ background: friend.display_color }}>
                              {friend.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline(friend.last_seen) && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{friend.username}</p>
                          <Badge variant={isOnline(friend.last_seen) ? "default" : "secondary"} className="text-xs">
                            {isOnline(friend.last_seen) ? "Online" : "Offline"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigate(`/chat?dm=${friend.id}`)}
                        size="sm"
                        className="bg-gradient-to-r from-primary to-accent"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {friends.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No friends yet. Search for users to add them!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="space-y-3">
              {requests.map((request) => {
                const user = request.user_profile;
                if (!user) return null;

                return (
                  <Card
                    key={request.id}
                    className="p-4 bg-card/50 backdrop-blur-xl border-2 border-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2" style={{ borderColor: user.display_color }}>
                          <AvatarFallback style={{ background: user.display_color }}>
                            {user.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => acceptRequest(request.id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => rejectRequest(request.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {requests.length === 0 && (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending friend requests</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
