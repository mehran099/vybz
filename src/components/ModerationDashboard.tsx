import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Shield, Ban, Volume2, VolumeX, AlertTriangle, Clock, ArrowLeft, Menu } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  is_banned: boolean;
  is_muted: boolean;
  mute_until: string | null;
  ban_reason: string | null;
}

interface ModerationLog {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  moderator: { username: string };
  target_user: { username: string };
}

interface ModerationDashboardProps {
  currentUserId: string;
  userRole: string;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export function ModerationDashboard({ currentUserId, userRole, onBack, onToggleSidebar }: ModerationDashboardProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [muteDuration, setMuteDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRole === "admin" || userRole === "moderator") {
      loadUsers();
      loadLogs();
    }
  }, [userRole]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, is_banned, is_muted, mute_until, ban_reason")
        .order("username");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("moderation_logs")
        .select(`
          id,
          action,
          reason,
          created_at,
          moderator:profiles!moderation_logs_moderator_id_fkey(username),
          target_user:profiles!moderation_logs_target_user_id_fkey(username)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data as any || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !actionReason) {
      toast.error("Please select a user and provide a reason");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_banned: true,
          ban_reason: actionReason,
          banned_at: new Date().toISOString(),
          banned_by: currentUserId,
        })
        .eq("id", selectedUser.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("moderation_logs")
        .insert({
          moderator_id: currentUserId,
          target_user_id: selectedUser.id,
          action: "ban",
          reason: actionReason,
        });

      if (logError) throw logError;

      toast.success(`${selectedUser.username} has been banned`);
      setActionReason("");
      setSelectedUser(null);
      loadUsers();
      loadLogs();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user");
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async (user: Profile) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("moderation_logs")
        .insert({
          moderator_id: currentUserId,
          target_user_id: user.id,
          action: "unban",
        });

      if (logError) throw logError;

      toast.success(`${user.username} has been unbanned`);
      loadUsers();
      loadLogs();
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user");
    } finally {
      setLoading(false);
    }
  };

  const handleMuteUser = async () => {
    if (!selectedUser || !actionReason) {
      toast.error("Please select a user and provide a reason");
      return;
    }

    setLoading(true);
    try {
      const muteUntil = new Date();
      muteUntil.setMinutes(muteUntil.getMinutes() + muteDuration);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_muted: true,
          mute_until: muteUntil.toISOString(),
        })
        .eq("id", selectedUser.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("moderation_logs")
        .insert({
          moderator_id: currentUserId,
          target_user_id: selectedUser.id,
          action: "mute",
          reason: actionReason,
          duration_minutes: muteDuration,
        });

      if (logError) throw logError;

      toast.success(`${selectedUser.username} has been muted for ${muteDuration} minutes`);
      setActionReason("");
      setSelectedUser(null);
      loadUsers();
      loadLogs();
    } catch (error) {
      console.error("Error muting user:", error);
      toast.error("Failed to mute user");
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "admin" && userRole !== "moderator") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need moderator permissions to access this dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {(onBack || onToggleSidebar) && (
        <div className="flex items-center gap-2 p-4 border-b border-border md:hidden">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xl font-bold">Moderation</h2>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        <div className="space-y-4">
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Select a user to moderate</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedUser?.id === user.id ? "bg-muted border-primary" : ""
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{user.username}</span>
                      <div className="flex gap-2">
                        {user.is_banned && (
                          <Badge variant="destructive">
                            <Ban className="h-3 w-3 mr-1" />
                            Banned
                          </Badge>
                        )}
                        {user.is_muted && (
                          <Badge variant="secondary">
                            <VolumeX className="h-3 w-3 mr-1" />
                            Muted
                          </Badge>
                        )}
                      </div>
                    </div>
                    {user.ban_reason && (
                      <p className="text-sm text-muted-foreground mt-1">Reason: {user.ban_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Moderate: {selectedUser.username}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter moderation reason..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {selectedUser.is_banned ? (
                  <Button
                    variant="outline"
                    onClick={() => handleUnbanUser(selectedUser)}
                    disabled={loading}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Unban User
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleBanUser}
                    disabled={loading}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Ban User
                  </Button>
                )}

                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={muteDuration}
                    onChange={(e) => setMuteDuration(Number(e.target.value))}
                    className="w-20"
                    min="1"
                  />
                  <Button variant="secondary" onClick={handleMuteUser} disabled={loading}>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Mute
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Moderation Logs
          </CardTitle>
          <CardDescription>Recent moderation actions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.action === "ban" ? "destructive" :
                            log.action === "unban" ? "outline" :
                            "secondary"
                          }
                        >
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium">
                          {log.target_user?.username}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-sm text-muted-foreground">{log.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        By {log.moderator?.username} • {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
