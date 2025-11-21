import { Users } from "lucide-react";
import { UserActionsMenu } from "./UserActionsMenu";

interface User {
  id: string;
  username: string;
  display_color: string;
  is_online?: boolean;
  is_guest?: boolean;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
  onDMClick?: (userId: string, username: string) => void;
}

export const UserList = ({ users, currentUserId, onDMClick }: UserListProps) => {
  return (
    <div className="w-64 bg-card/50 backdrop-blur-xl border-l border-white/10 p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Online ({users.length})</h3>
      </div>
      <div className="space-y-2">
        {users.map((user) => (
          <div 
            key={user.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all group"
          >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ 
                      background: `linear-gradient(135deg, ${user.display_color}, ${user.display_color}aa)`,
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span 
                    className="text-sm font-medium truncate"
                    style={{ color: user.display_color }}
                  >
                    {user.username}
                  </span>
                  {user.is_guest && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium w-fit">
                      GUEST
                    </span>
                  )}
                </div>
              </div>
            {user.id !== currentUserId && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <UserActionsMenu
                  userId={user.id}
                  username={user.username}
                  currentUserId={currentUserId}
                  onDMClick={() => onDMClick?.(user.id, user.username)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};