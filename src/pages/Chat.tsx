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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 md:z-0
        w-64 h-full bg-card border-r border-border p-4 flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            VYBE
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-2 flex-1">
          <Button
            variant={view === 'chat' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setView('chat');
              setSidebarOpen(false);
            }}
          >
            <Hash className="w-5 h-5 mr-2" />
            <span>{currentRoom?.name || 'Chat'}</span>
          </Button>
          
          <Button
            variant={view === 'rooms' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setView('rooms');
              setSidebarOpen(false);
            }}
          >
            <Compass className="w-5 h-5 mr-2" />
            <span>Browse Rooms</span>
          </Button>
          
          <Button
            variant={view === 'dms' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setView('dms');
              setSidebarOpen(false);
            }}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            <span>Direct Messages</span>
          </Button>

          <Button
            variant={view === 'friends' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setView('friends');
              setSidebarOpen(false);
            }}
          >
            <Users className="w-5 h-5 mr-2" />
            <span>Friends</span>
          </Button>

          <Button
            variant={view === 'leaderboard' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setView('leaderboard');
              setSidebarOpen(false);
            }}
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            <span>Leaderboard</span>
          </Button>

          <Button
            variant={view === 'theme' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setView('theme');
              setSidebarOpen(false);
            }}
          >
            <Palette className="w-5 h-5 mr-2" />
            <span>Theme</span>
          </Button>

          {(userRole === 'admin' || userRole === 'moderator') && (
            <Button
              variant={view === 'moderation' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setView('moderation');
                setSidebarOpen(false);
              }}
            >
              <Shield className="w-5 h-5 mr-2" />
              <span>Moderation</span>
            </Button>
          )}
        </div>

        {/* Support Creator Section */}
        <div className="mt-4 p-4 border-t border-border space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Support Creator</h3>
          <p className="text-xs text-muted-foreground">Your tips help us make the site bigger!</p>
          
          <a 
            href="https://patreon.com/VYBE09?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full justify-start" size="sm">
              <span className="mr-2">❤️</span>
              Support on Patreon
            </Button>
          </a>

          <div className="text-xs space-y-1 p-2 rounded-lg bg-muted/50">
            <p className="font-medium">Pakistan Tips:</p>
            <p className="font-mono">RAAST: 03213512136</p>
            <p className="font-mono break-all">IBAN: PK02JCMA05089232135121136</p>
          </div>
        </div>

        {currentProfile && (
          <div className="mt-auto pt-4 border-t border-border space-y-3">
            <UserStatsDisplay userId={currentProfile.id} compact />
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ 
                  background: `linear-gradient(135deg, ${currentProfile.display_color}, ${currentProfile.display_color}aa)`,
                }}
              >
                {currentProfile.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span 
                  className="font-medium text-sm truncate block"
                  style={{ color: currentProfile.display_color }}
                >
                  {currentProfile.username}
                </span>
                {currentProfile.is_guest && (
                  <span className="text-[10px] text-muted-foreground">Guest User</span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
                toast.success("Logged out successfully");
              }}
            >
              {currentProfile.is_guest ? "Leave Chat" : "Logout"}
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
            {/* Chat Header */}
            <div className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Hash className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-base md:text-lg truncate">{currentRoom?.name || 'Chat'}</h2>
                  <p className="text-xs text-muted-foreground hidden sm:block truncate">
                    {currentRoom?.description || 'Welcome to VYBE!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((msg) => (
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
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSendMessage={handleSendMessage} disabled={!currentProfile} />
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