import { useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfileId: string;
  onRoomCreated: (roomId: string) => void;
}

export const CreateRoomDialog = ({ open, onOpenChange, currentProfileId, onRoomCreated }: CreateRoomDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [rules, setRules] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }

    setIsCreating(true);

    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name: name.trim(),
          description: description.trim(),
          category,
          tags: tagsArray,
          is_private: isPrivate,
          rules: rules.trim() || null,
          created_by: currentProfileId,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: currentProfileId,
          role: 'owner',
        });

      if (memberError) throw memberError;

      toast.success("Room created!");
      onRoomCreated(room.id);
      onOpenChange(false);
      
      // Reset form
      setName("");
      setDescription("");
      setCategory("general");
      setTags("");
      setIsPrivate(false);
      setRules("");
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Room"
              maxLength={50}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about?"
              maxLength={200}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="interest">Interest</SelectItem>
                <SelectItem value="language">Language</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="gaming, fun, casual"
              maxLength={100}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="private">Private Room</Label>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {isPrivate && (
            <p className="text-xs text-muted-foreground">
              Private rooms require invites to join
            </p>
          )}

          <div>
            <Label htmlFor="rules">Room Rules (optional)</Label>
            <Textarea
              id="rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Be respectful, no spam..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
            >
              {isCreating ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};