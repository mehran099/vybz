import { Users } from "lucide-react";

interface User {
  id: string;
  username: string;
  display_color: string;
  is_online?: boolean;
}

interface UserListProps {
  users: User[];
}

export const UserList = ({ users }: UserListProps) => {
  return (
    <div className="w-64 bg-card border-l border-border p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Online ({users.length})</h3>
      </div>
      <div className="space-y-2">
        {users.map((user) => (
          <div 
            key={user.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
          >
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
            <span 
              className="text-sm font-medium truncate"
              style={{ color: user.display_color }}
            >
              {user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};