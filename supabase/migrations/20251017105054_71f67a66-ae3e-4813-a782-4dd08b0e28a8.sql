-- Make it easier for users to join rooms by allowing auto-join for public rooms
-- Update room_members policies to allow easier joining

-- Drop the old restrictive policy and create a simpler one
DROP POLICY IF EXISTS "Users can join public rooms" ON public.room_members;

-- Allow users to join any public room easily
CREATE POLICY "Users can join public rooms easily"
ON public.room_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = room_members.room_id
    AND chat_rooms.is_private = false
  )
  AND user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Ensure users can see all public rooms
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.chat_rooms;

CREATE POLICY "Public rooms are viewable by everyone"
ON public.chat_rooms
FOR SELECT
USING (is_private = false OR created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Make direct messages easier - ensure users can see DMs they're part of
DROP POLICY IF EXISTS "Users can view their DMs" ON public.direct_messages;

CREATE POLICY "Users can view their DMs"
ON public.direct_messages
FOR SELECT
USING (
  sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Allow users to send DMs to anyone
DROP POLICY IF EXISTS "Users can send DMs" ON public.direct_messages;

CREATE POLICY "Users can send DMs"
ON public.direct_messages
FOR INSERT
WITH CHECK (
  sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);