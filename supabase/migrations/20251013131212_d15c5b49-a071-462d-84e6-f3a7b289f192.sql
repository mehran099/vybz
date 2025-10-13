-- Expand chat_rooms with categories and metadata
ALTER TABLE public.chat_rooms
ADD COLUMN category TEXT CHECK (category IN ('country', 'interest', 'language', 'general')),
ADD COLUMN country_code TEXT,
ADD COLUMN language_code TEXT,
ADD COLUMN tags TEXT[],
ADD COLUMN rules TEXT,
ADD COLUMN max_members INTEGER DEFAULT 100,
ADD COLUMN member_count INTEGER DEFAULT 0;

-- Create room_members table for private room access
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create direct_messages table for DMs
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'sticker', 'voice')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (sender_id != recipient_id)
);

-- Create reactions table
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create typing_indicators table
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  dm_partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK ((room_id IS NOT NULL AND dm_partner_id IS NULL) OR (room_id IS NULL AND dm_partner_id IS NOT NULL))
);

-- Enable RLS on new tables
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Room members policies
CREATE POLICY "Room members viewable by room participants"
  ON public.room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = room_id AND (is_private = false OR id IN (
        SELECT room_id FROM public.room_members WHERE user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can join public rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = room_id AND is_private = false
    ) AND user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Room owners can add members"
  ON public.room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_members.room_id 
      AND rm.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND rm.role = 'owner'
    )
  );

CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Direct messages policies
CREATE POLICY "Users can view their DMs"
  ON public.direct_messages FOR SELECT
  USING (
    sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send DMs"
  ON public.direct_messages FOR INSERT
  WITH CHECK (sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their sent DMs"
  ON public.direct_messages FOR UPDATE
  USING (sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Message reactions policies
CREATE POLICY "Reactions viewable in accessible rooms"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_rooms r ON m.room_id = r.id
      WHERE m.id = message_id AND (r.is_private = false OR r.id IN (
        SELECT room_id FROM public.room_members WHERE user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Authenticated users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can remove their reactions"
  ON public.message_reactions FOR DELETE
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Typing indicators policies
CREATE POLICY "Typing indicators viewable in accessible contexts"
  ON public.typing_indicators FOR SELECT
  USING (true);

CREATE POLICY "Users can update their typing status"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can clear their typing status"
  ON public.typing_indicators FOR DELETE
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- Update global chat with category
UPDATE public.chat_rooms 
SET category = 'general', tags = ARRAY['welcome', 'global', 'general'] 
WHERE name = 'Global Chat';

-- Add some sample public rooms
INSERT INTO public.chat_rooms (name, description, category, country_code, tags)
VALUES 
  ('USA Chat', 'Connect with people from the United States', 'country', 'US', ARRAY['usa', 'america', 'english']),
  ('Tech Talk', 'Discuss technology, coding, and innovation', 'interest', NULL, ARRAY['tech', 'coding', 'innovation']),
  ('Gaming Hub', 'Gamers unite! Discuss your favorite games', 'interest', NULL, ARRAY['gaming', 'esports', 'multiplayer']),
  ('Español', 'Chat en español', 'language', NULL, ARRAY['spanish', 'latino', 'hispanic']);

-- Function to auto-cleanup old typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$;