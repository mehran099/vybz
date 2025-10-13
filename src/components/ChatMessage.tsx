import { format } from "date-fns";

interface ChatMessageProps {
  username: string;
  content: string;
  color: string;
  timestamp: string;
  isOwn?: boolean;
}

export const ChatMessage = ({ username, content, color, timestamp, isOwn }: ChatMessageProps) => {
  return (
    <div className={`flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all ${isOwn ? 'bg-primary/5' : ''}`}>
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ 
          background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          boxShadow: `0 0 20px ${color}40`
        }}
      >
        {username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span 
            className="font-semibold text-sm"
            style={{ color }}
          >
            {username}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(timestamp), 'HH:mm')}
          </span>
        </div>
        <p className="text-sm text-foreground break-words">{content}</p>
      </div>
    </div>
  );
};