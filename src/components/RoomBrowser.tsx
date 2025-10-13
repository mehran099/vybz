import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, MessageCircle, Hash, Search, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  is_private: boolean;
  member_count: number;
}

interface RoomBrowserProps {
  currentProfileId: string;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export const RoomBrowser = ({ currentProfileId, onJoinRoom, onCreateRoom }: RoomBrowserProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("member_count", { ascending: false });

    if (data) {
      setRooms(data);
    } else {
      console.error("Error fetching rooms:", error);
    }
  };

  const handleJoinRoom = async (roomId: string, isPrivate: boolean) => {
    if (isPrivate) {
      toast.error("This room is private. You need an invite to join.");
      return;
    }

    const { error } = await supabase
      .from("room_members")
      .insert({
        room_id: roomId,
        user_id: currentProfileId,
      });

    if (error) {
      if (error.code === '23505') {
        // Already a member
        onJoinRoom(roomId);
      } else {
        console.error("Error joining room:", error);
        toast.error("Failed to join room");
      }
    } else {
      toast.success("Joined room!");
      onJoinRoom(roomId);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'country': return <Globe className="w-4 h-4" />;
      case 'interest': return <MessageCircle className="w-4 h-4" />;
      case 'language': return <Hash className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || room.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: null, label: 'All' },
    { value: 'general', label: 'General' },
    { value: 'country', label: 'Country' },
    { value: 'interest', label: 'Interest' },
    { value: 'language', label: 'Language' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Browse Rooms</h2>
          <Button
            onClick={onCreateRoom}
            size="sm"
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms, tags..."
            className="pl-10"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat.label}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className="shrink-0"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Rooms list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredRooms.map((room) => (
          <Card
            key={room.id}
            className="p-4 hover:bg-muted/50 cursor-pointer transition-all border-border hover:border-primary/30"
            onClick={() => handleJoinRoom(room.id, room.is_private)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {getCategoryIcon(room.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{room.name}</h3>
                    {room.is_private && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {room.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {room.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{room.member_count || 0}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};