import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, TrendingUp } from "lucide-react";

interface UserStats {
  xp: number;
  level: number;
  message_count: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface UserStatsDisplayProps {
  userId: string;
  compact?: boolean;
}

export const UserStatsDisplay = ({ userId, compact = false }: UserStatsDisplayProps) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    fetchStats();
    fetchBadges();

    const channel = supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchStats = async () => {
    const { data } = await supabase
      .from('user_stats')
      .select('xp, level, message_count')
      .eq('user_id', userId)
      .single();

    if (data) {
      setStats(data);
    }
  };

  const fetchBadges = async () => {
    const { data } = await supabase
      .from('user_badges')
      .select(`
        badge_id,
        badges (
          id,
          name,
          icon,
          color,
          description
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(5);

    if (data) {
      const badgeList = data
        .map(item => item.badges)
        .filter(Boolean) as Badge[];
      setBadges(badgeList);
    }
  };

  if (!stats) {
    return null;
  }

  const xpForCurrentLevel = stats.level * stats.level * 100;
  const xpForNextLevel = (stats.level + 1) * (stats.level + 1) * 100;
  const xpInCurrentLevel = stats.xp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Lv {stats.level}</span>
        </div>
        {badges.slice(0, 3).map((badge) => (
          <div
            key={badge.id}
            className="text-lg"
            title={badge.description}
          >
            {badge.icon}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-card/50 backdrop-blur-xl border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="text-2xl font-bold">{stats.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Messages</p>
          <p className="text-lg font-semibold">{stats.message_count.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">XP Progress</span>
          <span className="font-medium">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {(xpNeededForNextLevel - xpInCurrentLevel).toLocaleString()} XP until Level {stats.level + 1}
        </p>
      </div>

      {badges.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="px-3 py-1.5 rounded-full border transition-all hover:scale-105 cursor-help"
                style={{
                  borderColor: badge.color + '40',
                  background: `linear-gradient(135deg, ${badge.color}20, ${badge.color}10)`,
                }}
                title={badge.description}
              >
                <span className="text-sm flex items-center gap-1.5">
                  <span className="text-base">{badge.icon}</span>
                  <span style={{ color: badge.color }}>{badge.name}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
