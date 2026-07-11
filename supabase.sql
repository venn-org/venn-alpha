CREATE TYPE public.enum_user_type AS ENUM ('seeking', 'owner');
CREATE TYPE public.enum_gender AS ENUM ('man', 'woman', 'non_binary', 'prefer_not_to_say');
CREATE TYPE public.enum_lifestyle AS ENUM ('yes', 'sometimes', 'no', 'prefer_not_to_say');
CREATE TYPE public.enum_pref_role AS ENUM ('seeking', 'owner');
CREATE TYPE public.enum_pref_gender AS ENUM ('women_only', 'men_only', 'any_gender');
CREATE TYPE public.enum_pref_age AS ENUM ('18_22', '22_26', '26_30', '30_35', '35_plus', 'flexible');
CREATE TYPE public.enum_budget AS ENUM ('under_10k', '10k_20k', '20k_35k', '35k_50k', '50k_plus');
CREATE TYPE public.enum_move_in AS ENUM ('asap', 'jul_2026', 'aug_2026', 'sep_2026', 'oct_2026', 'flexible');
CREATE TYPE public.enum_flat_type AS ENUM ('1_bhk', '2_bhk', '3_bhk', 'studio', 'private_room', 'shared_room', 'pg');
CREATE TYPE public.enum_occupation AS ENUM ('working_professional', 'student', 'freelancer', 'entrepreneur');
CREATE TYPE public.enum_food_habit AS ENUM ('veg_only', 'eggetarian_ok', 'non_veg_ok', 'vegan_only');
CREATE TYPE public.enum_smoking_pref AS ENUM ('non_smoker', 'smoker_ok', 'outside_only');
CREATE TYPE public.enum_drinking_pref AS ENUM ('teetotaller_only', 'social_drinker_ok', 'fine_with_drinking');
CREATE TYPE public.enum_pets_pref AS ENUM ('have_pet', 'fine_with_pets', 'no_pets', 'allergic');

CREATE TABLE public.waitlist (
  email text NOT NULL,
  CONSTRAINT waitlist_pkey PRIMARY KEY (email)
);
CREATE TABLE public.profiles (
  id text NOT NULL,
  name text,
  age integer,
  bio text,
  location text,
  budget_min integer,
  budget_max integer,
  move_in_date date,
  photos text[],
  created_at timestamp with time zone DEFAULT now(),
  pronouns text[],
  gender public.enum_gender,
  drink public.enum_lifestyle,
  tobacco public.enum_lifestyle,
  areas text[],
  budget public.enum_budget,
  onboarding_done boolean DEFAULT false,
  birthday date,
  weed public.enum_lifestyle,
  preferred_areas text[],
  user_type public.enum_user_type,
  pref_move_in public.enum_move_in,
  pref_gender public.enum_pref_gender,
  pref_age public.enum_pref_age,
  pref_occupation public.enum_occupation[],
  pref_food public.enum_food_habit[],
  pref_smoking public.enum_smoking_pref,
  pref_drinking public.enum_drinking_pref,
  pref_pets public.enum_pets_pref[],
  pref_role public.enum_pref_role,
  pref_areas text[],
  pref_budget public.enum_budget,
  pref_flat_type public.enum_flat_type[],
  job_company text,
  job_title text,
  education_school text,
  education_level text,
  prompts jsonb DEFAULT '[]'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  last_active_at timestamp with time zone,
  flat_type public.enum_flat_type,
  paused boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id text,
  user2_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  sender_id text,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_user_id text NOT NULL,
  to_user_id text NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reported_id text NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text,
  moderator_notes text,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id),
  CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL,
  actor_id text,
  match_id uuid,
  content text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.preregistrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  email text UNIQUE,
  age text,
  role text,
  city text,
  budget text,
  move_in text,
  looking_for text,
  sleep_schedule text,
  cleanliness text,
  guests text,
  wfh text,
  CONSTRAINT preregistrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Adapted for Firebase Auth (using auth.jwt()->>'sub')
-- ==========================================

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.jwt()->>'sub' IS NOT NULL);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.jwt()->>'sub' = id) WITH CHECK (auth.jwt()->>'sub' = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.jwt()->>'sub' = id);

-- 2. LIKES
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select" ON public.likes
  FOR SELECT USING (auth.jwt()->>'sub' = from_user_id OR auth.jwt()->>'sub' = to_user_id);
CREATE POLICY "likes_insert" ON public.likes
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = from_user_id);
CREATE POLICY "likes_delete" ON public.likes
  FOR DELETE USING (auth.jwt()->>'sub' = from_user_id);

-- 3. MATCHES
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (auth.jwt()->>'sub' = user1_id OR auth.jwt()->>'sub' = user2_id);
CREATE POLICY "matches_delete" ON public.matches
  FOR DELETE USING (auth.jwt()->>'sub' = user1_id OR auth.jwt()->>'sub' = user2_id);

-- 4. MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  );
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.jwt()->>'sub' = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
        AND (m.user1_id = auth.jwt()->>'sub' OR m.user2_id = auth.jwt()->>'sub')
    ) AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.blocks b ON
        (b.blocker_id = m.user1_id AND b.blocked_id = m.user2_id) OR
        (b.blocker_id = m.user2_id AND b.blocked_id = m.user1_id)
      WHERE m.id = messages.match_id
    )
  );
CREATE POLICY "messages_update_read" ON public.messages
  FOR UPDATE USING (
    sender_id != auth.jwt()->>'sub' AND
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  );
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  );

-- 5. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id) WITH CHECK (auth.jwt()->>'sub' = user_id);

-- 6. REPORTS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.jwt()->>'sub' = reporter_id);
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = reporter_id);

-- 7. BLOCKS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_select" ON public.blocks
  FOR SELECT USING (auth.jwt()->>'sub' = blocker_id);
CREATE POLICY "blocks_insert" ON public.blocks
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = blocker_id);
CREATE POLICY "blocks_delete" ON public.blocks
  FOR DELETE USING (auth.jwt()->>'sub' = blocker_id);

-- 8. PUSH SUBSCRIPTIONS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id) WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.jwt()->>'sub' = user_id);

-- ==========================================
-- STORAGE POLICIES
-- ==========================================
-- Ensure you have a 'photos' bucket created in Supabase Storage.
CREATE POLICY "users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]
  );
CREATE POLICY "photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]
  );

-- ==========================================
-- UPDATED FUNCTIONS FOR FIREBASE AUTH
-- ==========================================

DROP FUNCTION IF EXISTS get_blocked_pair_ids();
CREATE OR REPLACE FUNCTION get_blocked_pair_ids()
RETURNS TABLE(user_id text) AS $$
  SELECT blocked_id FROM public.blocks WHERE blocker_id = auth.jwt()->>'sub'
  UNION
  SELECT blocker_id FROM public.blocks WHERE blocked_id = auth.jwt()->>'sub';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP FUNCTION IF EXISTS delete_account();
CREATE OR REPLACE FUNCTION delete_account()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
    WHERE bucket_id = 'photos'
      AND (storage.foldername(name))[1] = auth.jwt()->>'sub';
  DELETE FROM public.profiles WHERE id = auth.jwt()->>'sub';
  -- Firebase handles auth.users, so we only clean up Supabase storage and profiles
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION delete_account() FROM anon, public;
GRANT EXECUTE ON FUNCTION delete_account() TO authenticated;