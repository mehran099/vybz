-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for moderation
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role((SELECT id FROM profiles WHERE user_id = auth.uid()), 'admin'));

-- Create user_preferences table for themes
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  bubble_style TEXT DEFAULT 'default' CHECK (bubble_style IN ('default', 'rounded', 'minimal', 'fancy')),
  font_family TEXT DEFAULT 'inter' CHECK (font_family IN ('inter', 'comic', 'mono', 'serif')),
  background_theme TEXT DEFAULT 'solid' CHECK (background_theme IN ('solid', 'gradient', 'pattern')),
  theme_mode TEXT DEFAULT 'dark' CHECK (theme_mode IN ('light', 'dark')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;

-- Update trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add moderation fields to profiles
ALTER TABLE public.profiles
ADD COLUMN is_banned BOOLEAN DEFAULT false,
ADD COLUMN is_muted BOOLEAN DEFAULT false,
ADD COLUMN mute_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN ban_reason TEXT,
ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN banned_by UUID REFERENCES public.profiles(id);

-- Create moderation_logs table for audit trail
CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES public.profiles(id),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('ban', 'unban', 'mute', 'unmute', 'warn', 'delete_message')),
  reason TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on moderation_logs
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for moderation_logs
CREATE POLICY "Moderators can view logs"
  ON public.moderation_logs FOR SELECT
  USING (
    public.has_role((SELECT id FROM profiles WHERE user_id = auth.uid()), 'admin')
    OR public.has_role((SELECT id FROM profiles WHERE user_id = auth.uid()), 'moderator')
  );

CREATE POLICY "Moderators can create logs"
  ON public.moderation_logs FOR INSERT
  WITH CHECK (
    public.has_role((SELECT id FROM profiles WHERE user_id = auth.uid()), 'admin')
    OR public.has_role((SELECT id FROM profiles WHERE user_id = auth.uid()), 'moderator')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_logs;