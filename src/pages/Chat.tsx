import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { UserList } from "@/components/UserList";
import { RoomBrowser } from "@/components/RoomBrowser";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { DMList } from "@/components/DMList";
import { DirectMessageView } from "@/components/DirectMessageView";
import { FriendsList } from "@/components/FriendsList";
import { UserStatsDisplay } from "@/components/UserStatsDisplay";
import { Leaderboard } from "@/components/Leaderboard";
import { ThemeSettings } from "@/components/ThemeSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModerationDashboard } from "@/components/ModerationDashboard";
import { CallInterface } from "@/components/CallInterface";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { Button } from "@/components/ui/button";
import { Hash, Menu, MessageSquare, Compass, Users, TrendingUp, Palette, Shield } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CallType } from "@/utils/webrtc";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_color: string;
  };
}

interface Profile {
  id: string;
  username: string;
  display_color: string;
  user_id: string;
  is_guest?: boolean;
}

interface CallState {
  callId: string;
  isInitiator: boolean;
  callType: CallType;
  remoteUser: Profile;
}

interface IncomingCall {
  callId: string;
  caller: Profile;
  callType: CallType;
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [view, setView] = useState<'chat' | 'rooms' | 'dms' | 'friends' | 'leaderboard' | 'theme' | 'moderation'>('chat');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [dmPartner, setDmPartner] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    checkAuth();
    fetchGlobalRoom();
  }, []);

  useEffect(() => {
    if (currentProfile) {
      setupCallSignaling();
    }
  }, [currentProfile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (roomId) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [roomId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/");
      return;
    }

    // Fetch current user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (profile) {
      setCurrentProfile(profile);
      
      // Show welcome message for guests
      if (profile.is_guest) {
        toast.info(`Welcome, ${profile.username}! You're chatting as a guest 👋`);
      }
      
      fetchOnlineUsers();
      
      // Check user role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id);
      
      if (roles && roles.length > 0) {
        // Set highest role (admin > moderator > user)
        const hasAdmin = roles.some(r => r.role === 'admin');
        const hasModerator = roles.some(r => r.role === 'moderator');
        setUserRole(hasAdmin ? 'admin' : hasModerator ? 'moderator' : 'user');
      }
    }
  };

  const fetchGlobalRoom = async () => {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("name", "Global Chat")
      .single();

    if (data) {
      setRoomId(data.id);
      setCurrentRoom(data);
    } else {
      console.error("Error fetching global room:", error);
    }
  };

  const handleJoinRoom = async (selectedRoomId: string) => {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("id", selectedRoomId)
      .single();

    if (data) {
      setRoomId(selectedRoomId);
      setCurrentRoom(data);
      setView('chat');
    } else {
      console.error("Error fetching room:", error);
    }
  };

  const handleSelectDM = (partner: Profile) => {
    setDmPartner(partner);
    setView('dms');
  };

  const fetchMessages = async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (username, display_color)
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data as any);
    } else {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchOnlineUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_color, user_id, is_guest")
      .order("username");

    if (data) {
      setOnlineUsers(data);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!roomId) return;

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the full message with profile data
          const { data } = await supabase
            .from("messages")
            .select(`
              id,
              content,
              created_at,
              user_id,
              profiles (username, display_color)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as any]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const setupCallSignaling = () => {
    if (!currentProfile) return;

    const callChannel = supabase
      .channel(`user:${currentProfile.id}:calls`)
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        setIncomingCall({
          callId: payload.callId,
          caller: payload.caller,
          callType: payload.callType
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
  };

  const initiateCall = async (targetUser: Profile, callType: CallType) => {
    if (!currentProfile) return;

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Notify the other user
    const notificationChannel = supabase.channel(`user:${targetUser.id}:calls`);
    await notificationChannel.subscribe();
    
    await notificationChannel.send({
      type: 'broadcast',
      event: 'incoming-call',
      payload: {
        callId,
        caller: {
          id: currentProfile.id,
          username: currentProfile.username,
          display_color: currentProfile.display_color
        },
        callType
      }
    });

    // Start the call
    setActiveCall({
      callId,
      isInitiator: true,
      callType,
      remoteUser: targetUser
    });

    toast.success(`Calling ${targetUser.username}...`);
  };

  const acceptCall = () => {
    if (!incomingCall || !currentProfile) return;

    setActiveCall({
      callId: incomingCall.callId,
      isInitiator: false,
      callType: incomingCall.callType,
      remoteUser: incomingCall.caller
    });

    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (incomingCall) {
      toast.info(`Call from ${incomingCall.caller.username} declined`);
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    setActiveCall(null);
    toast.info("Call ended");
  };

  const handleSendMessage = async (content: string) => {
    if (!roomId || !currentProfile) return;

    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: currentProfile.id,
      content,
    });

    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Cyber grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Gaming Style */}
      <div className={`
        fixed md:relative z-50 md:z-0
        w-72 h-full bg-card/80 backdrop-blur-xl border-r-2 border-primary/30 flex flex-col
        transition-transform duration-300 ease-in-out
        shadow-[inset_0_0_100px_hsl(var(--primary)/0.05)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 border-b-2 border-primary/20 flex items-center justify-between bg-gradient-to-b from-primary/10 to-transparent">
          <div>
            <h1 className="font-['Orbitron'] text-3xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-[0_0_20px_hsl(var(--primary))]">
                VYBE
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">CONNECTED</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden border-2 border-primary/30 hover:border-primary"
            onClick={() => setSidebarOpen(false)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Navigation - Gaming Style */}
        <div className="space-y-1 flex-1 p-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">// CHANNELS</div>
          
          <Button
            variant={view === 'chat' ? 'default' : 'ghost'}
            className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
            onClick={() => {
              setView('chat');
              setSidebarOpen(false);
            }}
          >
            <Hash className="w-4 h-4 mr-3" />
            <span>{currentRoom?.name || 'Chat'}</span>
            {view === 'chat' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
          </Button>
          
          <Button
            variant={view === 'rooms' ? 'default' : 'ghost'}
            className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
            onClick={() => {
              setView('rooms');
              setSidebarOpen(false);
            }}
          >
            <Compass className="w-4 h-4 mr-3" />
            <span>Browse Rooms</span>
            {view === 'rooms' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
          </Button>
          
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-4">// SOCIAL</div>
          
          <Button
            variant={view === 'dms' ? 'default' : 'ghost'}
            className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
            onClick={() => {
              setView('dms');
              setSidebarOpen(false);
            }}
          >
            <MessageSquare className="w-4 h-4 mr-3" />
            <span>Direct Messages</span>
            {view === 'dms' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
          </Button>

          <Button
            variant={view === 'friends' ? 'default' : 'ghost'}
            className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
            onClick={() => {
              setView('friends');
              setSidebarOpen(false);
            }}
          >
            <Users className="w-4 h-4 mr-3" />
            <span>Friends</span>
            {view === 'friends' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
          </Button>

          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-4">// EXTRAS</div>

          <Button
            variant={view === 'leaderboard' ? 'default' : 'ghost'}
            className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
            onClick={() => {
              setView('leaderboard');
              setSidebarOpen(false);
            }}
          >
            <TrendingUp className="w-4 h-4 mr-3" />
            <span>Leaderboard</span>
            {view === 'leaderboard' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
          </Button>

          <Button
            variant={view === 'theme' ? 'default' : 'ghost'}
            className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
            onClick={() => {
              setView('theme');
              setSidebarOpen(false);
            }}
          >
            <Palette className="w-4 h-4 mr-3" />
            <span>Theme</span>
            {view === 'theme' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
          </Button>

          {(userRole === 'admin' || userRole === 'moderator') && (
            <Button
              variant={view === 'moderation' ? 'default' : 'ghost'}
              className="w-full justify-start font-bold uppercase tracking-wide text-xs h-11 border-2 border-transparent hover:border-primary/30 transition-all"
              onClick={() => {
                setView('moderation');
                setSidebarOpen(false);
              }}
            >
              <Shield className="w-4 h-4 mr-3" />
              <span>Moderation</span>
              {view === 'moderation' && <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />}
            </Button>
          )}
        </div>

        {/* Support Creator - Gaming Style */}
        <div className="p-3 border-t-2 border-primary/20 space-y-2 bg-gradient-to-t from-primary/5 to-transparent">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-wider">// SUPPORT CREATOR</h3>
          <p className="text-[10px] text-muted-foreground leading-tight">Help us level up the platform!</p>
          
          <a 
            href="https://patreon.com/VYBE09?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full justify-start text-xs h-9 border-2 border-accent/50 hover:border-accent hover:bg-accent/10">
              <span className="mr-2">❤️</span>
              PATREON
            </Button>
          </a>

          <div className="text-[9px] space-y-0.5 p-2 bg-card/60 border border-border/50 font-mono">
            <p className="font-bold text-primary">PAKISTAN TIPS:</p>
            <p>RAAST: 03213512136</p>
            <p className="break-all text-[8px]">IBAN: PK02JCMA05089232135121136</p>
          </div>
        </div>

        {/* User Profile - Gaming Style */}
        {currentProfile && (
          <div className="p-3 border-t-2 border-primary/20 space-y-2 bg-gradient-to-t from-secondary/5 to-transparent">
            <UserStatsDisplay userId={currentProfile.id} compact />
            <div className="flex items-center gap-3 p-2.5 bg-card/60 backdrop-blur border-2 border-border/50 hover:border-primary/30 transition-all">
              <div 
                className="w-10 h-10 rounded-sm flex items-center justify-center text-sm font-black border-2 relative overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${currentProfile.display_color}, ${currentProfile.display_color}dd)`,
                  borderColor: currentProfile.display_color,
                  boxShadow: `0 0 15px ${currentProfile.display_color}60`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <span className="relative z-10">{currentProfile.username[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span 
                  className="font-black text-xs uppercase truncate block tracking-wide"
                  style={{ 
                    color: currentProfile.display_color,
                    textShadow: `0 0 10px ${currentProfile.display_color}80`
                  }}
                >
                  {currentProfile.username}
                </span>
                {currentProfile.is_guest && (
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    [GUEST]
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full font-bold uppercase text-xs border-2 border-destructive/50 hover:border-destructive hover:bg-destructive/10"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
                toast.success("Logged out successfully");
              }}
            >
              {currentProfile.is_guest ? "DISCONNECT" : "LOGOUT"}
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {view === 'rooms' ? (
          <RoomBrowser
            currentProfileId={currentProfile?.id || ''}
            onJoinRoom={handleJoinRoom}
            onCreateRoom={() => setShowCreateRoom(true)}
          />
        ) : view === 'leaderboard' ? (
          <Leaderboard />
        ) : view === 'theme' ? (
          <div className="flex-1 overflow-y-auto">
            <ThemeSettings userId={currentProfile?.id || ''} />
          </div>
        ) : view === 'moderation' ? (
          <ModerationDashboard 
            currentUserId={currentProfile?.id || ''} 
            userRole={userRole}
          />
        ) : view === 'friends' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Friends & Connections</p>
                <p className="text-sm mt-2">Manage your friends and see your followers</p>
              </div>
            </div>
            <FriendsList 
              currentUserId={currentProfile?.id || ''} 
              onDMClick={(userId, username) => {
                const user = onlineUsers.find(u => u.id === userId);
                if (user) {
                  setDmPartner(user);
                  setView('dms');
                }
              }}
            />
          </div>
        ) : view === 'dms' && dmPartner ? (
          <DirectMessageView
            currentProfileId={currentProfile?.id || ''}
            partner={dmPartner}
            onBack={() => setDmPartner(null)}
            onVoiceCall={() => initiateCall({
              id: dmPartner.id,
              username: dmPartner.username,
              display_color: dmPartner.display_color,
              user_id: dmPartner.user_id || dmPartner.id
            }, 'audio')}
            onVideoCall={() => initiateCall({
              id: dmPartner.id,
              username: dmPartner.username,
              display_color: dmPartner.display_color,
              user_id: dmPartner.user_id || dmPartner.id
            }, 'video')}
          />
        ) : view === 'dms' ? (
          <DMList
            currentProfileId={currentProfile?.id || ''}
            onSelectConversation={handleSelectDM}
            onlineUsers={onlineUsers}
            onToggleSidebar={() => setSidebarOpen(true)}
          />
        ) : (
          <>
            {/* Chat Header - Cyberpunk Style */}
            <div className="h-16 bg-card/60 backdrop-blur-xl border-b-2 border-primary/20 px-4 md:px-6 flex items-center justify-between relative overflow-hidden">
              {/* Accent bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent" />
              
              <div className="flex items-center gap-3 relative z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden border-2 border-primary/30 hover:border-primary"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Hash className="w-6 h-6 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
                <div className="min-w-0">
                  <h2 className="font-['Orbitron'] font-black text-base md:text-lg uppercase tracking-wide truncate">
                    <span className="text-foreground drop-shadow-[0_0_15px_hsl(var(--primary))]">
                      {currentRoom?.name || 'Chat'}
                    </span>
                  </h2>
                  <p className="text-[10px] text-muted-foreground hidden sm:block truncate uppercase tracking-wider font-bold">
                    // {currentRoom?.description || 'Welcome to VYBE!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 text-xs font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
                  <span className="text-primary">{onlineUsers.length} ONLINE</span>
                </div>
                <ThemeToggle />
              </div>
            </div>

            {/* Messages - Gaming Chat Style */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-background via-background to-background/95">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                      <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <p className="font-['Orbitron'] text-lg font-black text-foreground uppercase">NO MESSAGES YET</p>
                      <p className="text-sm text-muted-foreground mt-1">Be the first to start the conversation!</p>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    messageId={msg.id}
                    username={msg.profiles.username}
                    content={msg.content}
                    color={msg.profiles.display_color}
                    timestamp={msg.created_at}
                    isOwn={msg.user_id === currentProfile?.id}
                    currentUserId={currentProfile?.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-card/80 backdrop-blur-xl border-t-2 border-primary/20">
              <ChatInput onSendMessage={handleSendMessage} disabled={!currentProfile} />
            </div>
          </>
        )}
      </div>

      {/* User List (only shown in chat view on desktop) */}
      {view === 'chat' && (
        <div className="hidden lg:block">
          <UserList 
            users={onlineUsers} 
            currentUserId={currentProfile?.id || ''}
            onDMClick={(userId, username) => {
              const user = onlineUsers.find(u => u.id === userId);
              if (user) {
                setDmPartner(user);
                setView('dms');
              }
            }}
            onVoiceCall={(user) => initiateCall({
              id: user.id,
              username: user.username,
              display_color: user.display_color,
              user_id: user.user_id || user.id
            }, 'audio')}
            onVideoCall={(user) => initiateCall({
              id: user.id,
              username: user.username,
              display_color: user.display_color,
              user_id: user.user_id || user.id
            }, 'video')}
          />
        </div>
      )}

      {/* Create Room Dialog */}
      <CreateRoomDialog
        open={showCreateRoom}
        onOpenChange={setShowCreateRoom}
        currentProfileId={currentProfile?.id || ''}
        onRoomCreated={handleJoinRoom}
      />

      {/* Active Call Interface */}
      {activeCall && currentProfile && (
        <CallInterface
          callId={activeCall.callId}
          isInitiator={activeCall.isInitiator}
          callType={activeCall.callType}
          localUser={{
            id: currentProfile.id,
            username: currentProfile.username,
            display_color: currentProfile.display_color
          }}
          remoteUser={activeCall.remoteUser}
          onEndCall={endCall}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={true}
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </div>
  );
}