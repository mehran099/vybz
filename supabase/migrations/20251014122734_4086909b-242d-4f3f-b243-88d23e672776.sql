-- Create user_stats table for XP and levels
CREATE TABLE public.user_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL,
  requirement_type text NOT NULL CHECK (requirement_type IN ('message_count', 'xp', 'level', 'special')),
  requirement_value integer,
  color text NOT NULL DEFAULT '#8B5CF6',
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- User stats policies
CREATE POLICY "User stats are viewable by everyone"
  ON public.user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own stats"
  ON public.user_stats FOR UPDATE
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Badges policies
CREATE POLICY "Badges are viewable by everyone"
  ON public.badges FOR SELECT
  USING (true);

-- User badges policies
CREATE POLICY "User badges are viewable by everyone"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "Users can earn badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;

-- Add triggers for updated_at
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value, color) VALUES
  ('Newbie', 'Welcome to VYBE! First login achieved.', '👋', 'special', 0, '#10B981'),
  ('Chatter', 'Sent 1,000 messages', '💬', 'message_count', 1000, '#3B82F6'),
  ('VYBE Star', 'Top 10 on the leaderboard', '⭐', 'special', 0, '#FBBF24'),
  ('Moderator', 'Verified community leader', '🛡️', 'special', 0, '#EC4899'),
  ('Level 5', 'Reached level 5', '🔥', 'level', 5, '#EF4444'),
  ('Level 10', 'Reached level 10', '⚡', 'level', 10, '#8B5CF6'),
  ('Veteran', 'Sent 5,000 messages', '🏆', 'message_count', 5000, '#F59E0B'),
  ('Legend', 'Reached level 25', '👑', 'level', 25, '#DC2626');

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Level = floor(sqrt(xp / 100))
  -- Level 1: 0-99 XP
  -- Level 2: 100-399 XP
  -- Level 3: 400-899 XP
  -- etc.
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount / 100.0))::integer);
END;
$$;

-- Function to award XP for messages
CREATE OR REPLACE FUNCTION public.award_message_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_stats_id uuid;
  v_new_xp integer;
  v_new_level integer;
  v_new_message_count integer;
BEGIN
  -- Check if user_stats exists, if not create it
  INSERT INTO public.user_stats (user_id, xp, level, message_count)
  VALUES (NEW.user_id, 10, 1, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    xp = user_stats.xp + 10,
    message_count = user_stats.message_count + 1,
    level = calculate_level(user_stats.xp + 10)
  RETURNING id, xp, level, message_count INTO v_user_stats_id, v_new_xp, v_new_level, v_new_message_count;

  -- Auto-award badges based on achievements
  -- Newbie badge (first message)
  IF v_new_message_count = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM public.badges WHERE name = 'Newbie'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Chatter badge (1,000 messages)
  IF v_new_message_count = 1000 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM public.badges WHERE name = 'Chatter'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Veteran badge (5,000 messages)
  IF v_new_message_count = 5000 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM public.badges WHERE name = 'Veteran'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Level badges
  IF v_new_level = 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM public.badges WHERE name = 'Level 5'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_new_level = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM public.badges WHERE name = 'Level 10'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_new_level = 25 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM public.badges WHERE name = 'Legend'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to award XP when messages are sent
CREATE TRIGGER award_xp_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.award_message_xp();

-- Also award XP for DMs
CREATE TRIGGER award_xp_on_dm
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.award_message_xp();