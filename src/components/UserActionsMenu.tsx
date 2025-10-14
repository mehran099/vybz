import { useState } from "react";
import { UserPlus, MessageSquare, UserMinus, Flag, UserX, Heart, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface UserActionsMenuProps {
  userId: string;
  username: string;
  currentUserId: string;
  onDMClick?: () => void;
}

export const UserActionsMenu = ({ userId, username, currentUserId, onDMClick }: UserActionsMenuProps) => {
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  const handleFollow = async () => {
    const { error } = await supabase.from('follows').insert({
      follower_id: currentUserId,
      following_id: userId,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      });
    } else {
      setIsFollowing(true);
      toast({
        title: "Success",
        description: `You're now following ${username}`,
      });
    }
  };

  const handleUnfollow = async () => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    } else {
      setIsFollowing(false);
      toast({
        title: "Success",
        description: `Unfollowed ${username}`,
      });
    }
  };

  const handleAddFriend = async () => {
    const { error } = await supabase.from('friendships').insert({
      user_id: currentUserId,
      friend_id: userId,
      status: 'pending',
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${username}`,
      });
    }
  };

  const handleBlock = async () => {
    const { error } = await supabase.from('blocks').insert({
      user_id: currentUserId,
      blocked_user_id: userId,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Blocked",
        description: `${username} has been blocked`,
      });
    }
  };

  const handleReport = async () => {
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      reported_user_id: userId,
      reason: 'inappropriate_behavior',
      context: 'Reported from user menu',
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to report user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Reported",
        description: "Thank you for keeping VYBE safe",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-white/10">
        {onDMClick && (
          <>
            <DropdownMenuItem onClick={onDMClick} className="cursor-pointer">
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
          </>
        )}
        
        <DropdownMenuItem onClick={handleAddFriend} className="cursor-pointer">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Friend
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={isFollowing ? handleUnfollow : handleFollow}
          className="cursor-pointer"
        >
          <Heart className={`mr-2 h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
          {isFollowing ? 'Unfollow' : 'Follow'}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem onClick={handleBlock} className="cursor-pointer text-orange-400">
          <UserX className="mr-2 h-4 w-4" />
          Block User
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleReport} className="cursor-pointer text-red-400">
          <Flag className="mr-2 h-4 w-4" />
          Report User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
