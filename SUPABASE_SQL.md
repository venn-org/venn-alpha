# Supabase SQL Setup

Run these in your Supabase SQL Editor in order.

---

## 1. Add missing columns to profiles

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type text,
  ADD COLUMN IF NOT EXISTS flat_type text,
  ADD COLUMN IF NOT EXISTS pref_role text,
  ADD COLUMN IF NOT EXISTS pref_areas jsonb,
  ADD COLUMN IF NOT EXISTS pref_flat_type jsonb,
  ADD COLUMN IF NOT EXISTS pref_budget text,
  ADD COLUMN IF NOT EXISTS pref_move_in text,
  ADD COLUMN IF NOT EXISTS pref_gender text,
  ADD COLUMN IF NOT EXISTS pref_age text,
  ADD COLUMN IF NOT EXISTS pref_occupation jsonb,
  ADD COLUMN IF NOT EXISTS pref_food jsonb,
  ADD COLUMN IF NOT EXISTS pref_smoking text,
  ADD COLUMN IF NOT EXISTS pref_drinking text,
  ADD COLUMN IF NOT EXISTS pref_pets jsonb;
```

---

## 2. Likes table

```sql
CREATE TABLE IF NOT EXISTS likes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Users can see likes they sent or received
CREATE POLICY "likes_select" ON likes
  FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- Users can insert their own likes
CREATE POLICY "likes_insert" ON likes
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can delete (unlike) their own likes
CREATE POLICY "likes_delete" ON likes
  FOR DELETE USING (auth.uid() = from_user_id);
```

---

## 3. Matches table

```sql
CREATE TABLE IF NOT EXISTS matches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Users can see matches they are part of
CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );
```

---

## 4. Messages table

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only participants of a match can read/send messages
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = messages.match_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = messages.match_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );
```

---

## 5. Auto-match trigger

When two users both like each other, this trigger creates a match automatically.

```sql
CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the person being liked has already liked back
  IF EXISTS (
    SELECT 1 FROM likes
    WHERE from_user_id = NEW.to_user_id
      AND to_user_id   = NEW.from_user_id
  ) THEN
    -- Insert a match (use least/greatest so (A,B) and (B,A) produce same row)
    INSERT INTO matches (user1_id, user2_id)
    VALUES (LEAST(NEW.from_user_id, NEW.to_user_id), GREATEST(NEW.from_user_id, NEW.to_user_id))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mutual_like ON likes;
CREATE TRIGGER trg_mutual_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION create_match_on_mutual_like();
```

---

## 6. Storage bucket for photos

Run in Supabase **Dashboard → Storage → New bucket**:
- Name: `photos`
- Public: ✅ enabled

Then add an RLS policy via SQL Editor so users can upload their own photos:

```sql
CREATE POLICY "users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
```

---

## 7. Verified badge column

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
```

---

## 8. Reports table

```sql
CREATE TABLE IF NOT EXISTS reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can only see reports they filed themselves
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Users can only file reports as themselves
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
```

---

## 9. Blocks table

```sql
CREATE TABLE IF NOT EXISTS blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users can see blocks they created, so their own client can filter their view
CREATE POLICY "blocks_select" ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- Users can only create blocks as themselves
CREATE POLICY "blocks_insert" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can only remove their own blocks
CREATE POLICY "blocks_delete" ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);
```

Note: the app also needs to know who has blocked *you* (to hide your profile
from them and vice versa) but `blocks_select` only lets a user read rows
where they are the `blocker_id`. To support mutual hiding without exposing
who blocked whom, add a `SECURITY DEFINER` RPC instead of relaxing the
select policy:

```sql
CREATE OR REPLACE FUNCTION get_blocked_pair_ids()
RETURNS TABLE(user_id uuid) AS $$
  SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid()
  UNION
  SELECT blocker_id FROM blocks WHERE blocked_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Call it from the client with `supabase.rpc('get_blocked_pair_ids')`.

---

## 10. Realtime (optional – for live chat)

Enable realtime on the messages table in Supabase Dashboard:
**Database → Replication → Tables → enable `messages`**

Or via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```
