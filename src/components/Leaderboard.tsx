import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Award, TrendingUp, ArrowLeft, Menu } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  xp: number;
  level: number;
  message_count: number;
  profiles: {
    username: string;
    display_color: string;
  };
}

interface LeaderboardProps {
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export const Leaderboard = ({ onBack, onToggleSidebar }: LeaderboardProps = {}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        xp,
        level,
        message_count,
        profiles (
          username,
          display_color
        )
      `)
      .order('xp', { ascending: false })
      .limit(50);

    if (data) {
      setLeaderboard(data as any);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40";
      case 1:
        return "bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300/40";
      case 2:
        return "bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/40";
      default:
        return "bg-card/50 border-white/10";
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 md:p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={onToggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
              Leaderboard
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">Top VYBE chatters</p>
          </div>
        </div>

        {/* Timeframe selector - for future implementation */}
        {/* <div className="flex gap-2">
          <Button
            variant={timeframe === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeframe('all')}
          >
            All Time
          </Button>
          <Button
            variant={timeframe === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeframe('week')}
          >
            This Week
          </Button>
          <Button
            variant={timeframe === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeframe('month')}
          >
            This Month
          </Button>
        </div> */}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`p-4 rounded-lg border backdrop-blur-xl transition-all hover:scale-[1.02] ${getRankBg(index)}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 flex justify-center">
                  {getRankIcon(index)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${entry.profiles.display_color}, ${entry.profiles.display_color}aa)`,
                      }}
                    >
                      {entry.profiles.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold truncate"
                        style={{ color: entry.profiles.display_color }}
                      >
                        {entry.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.message_count.toLocaleString()} messages
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Level</span>
                      <span className="font-bold text-primary">{entry.level}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">XP</span>
                      <span className="font-semibold">{entry.xp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
