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
    <div className="w-64 bg-card/80 backdrop-blur-xl border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">
            Online
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>{users.length} members</span>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {users.map((user) => (
          <div 
            key={user.id}
            className="group flex items-center gap-3 p-2 hover:bg-muted rounded-xl transition-all cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shadow-md"
                style={{ 
                  background: user.display_color,
                }}
              >
                <span className="text-white">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-card rounded-full" />
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <span 
                className="text-sm font-medium truncate block"
                style={{ color: user.display_color }}
              >
                {user.username}
              </span>
              {user.is_guest && (
                <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded inline-block">
                  Guest
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