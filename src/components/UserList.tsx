import { Users } from "lucide-react";
import { UserActionsMenu } from "./UserActionsMenu";

interface User {
  id: string;
  username: string;
  display_color: string;
  user_id?: string;
  is_online?: boolean;
  is_guest?: boolean;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
  onDMClick?: (userId: string, username: string) => void;
  onVoiceCall?: (user: User) => void;
  onVideoCall?: (user: User) => void;
}

export const UserList = ({ users, currentUserId, onDMClick, onVoiceCall, onVideoCall }: UserListProps) => {
  return (
    <div className="w-64 bg-card/60 backdrop-blur-xl border-l-2 border-primary/30 flex flex-col overflow-hidden shadow-[inset_0_0_100px_hsl(var(--primary)/0.05)]">
      {/* Header */}
      <div className="p-4 border-b-2 border-primary/20 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
          <h3 className="font-['Orbitron'] font-black uppercase text-sm tracking-wider">
            ONLINE
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
          <span className="font-bold text-primary">{users.length} PLAYERS</span>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {users.map((user) => (
          <div 
            key={user.id}
            className="group flex items-center gap-3 p-2.5 hover:bg-primary/10 transition-all border-2 border-transparent hover:border-primary/30 cursor-pointer relative"
          >
            {/* Avatar with neon glow */}
            <div className="relative">
              <div 
                className="w-9 h-9 rounded-sm flex items-center justify-center text-xs font-black border-2 relative overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${user.display_color}, ${user.display_color}dd)`,
                  borderColor: user.display_color,
                  boxShadow: `0 0 15px ${user.display_color}60, inset 0 0 15px ${user.display_color}30`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-card shadow-[0_0_10px_hsl(var(--primary))]" />
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <span 
                className="text-xs font-black uppercase truncate block tracking-wide"
                style={{ 
                  color: user.display_color,
                  textShadow: `0 0 8px ${user.display_color}60`
                }}
              >
                {user.username}
              </span>
              {user.is_guest && (
                <span className="text-[9px] px-1.5 py-0.5 bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border border-border/50 inline-block mt-0.5">
                  [GUEST]
                </span>
              )}
            </div>

            {/* Actions menu */}
            {user.id !== currentUserId && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <UserActionsMenu
                  userId={user.id}
                  username={user.username}
                  currentUserId={currentUserId}
                  onDMClick={() => onDMClick?.(user.id, user.username)}
                  onVoiceCall={onVoiceCall ? () => onVoiceCall(user) : undefined}
                  onVideoCall={onVideoCall ? () => onVideoCall(user) : undefined}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};