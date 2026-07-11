-- Migration: Switch from Supabase Auth (UUID) to Firebase Auth (TEXT)
-- This migration drops foreign key constraints to the built-in auth.users table
-- and changes all user ID columns from UUID to TEXT to accommodate Firebase UIDs.

-- 1. Drop foreign key constraints linking to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Alter columns from UUID to TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE text;

ALTER TABLE likes ALTER COLUMN from_user_id TYPE text;
ALTER TABLE likes ALTER COLUMN to_user_id TYPE text;

ALTER TABLE matches ALTER COLUMN user1_id TYPE text;
ALTER TABLE matches ALTER COLUMN user2_id TYPE text;

ALTER TABLE messages ALTER COLUMN sender_id TYPE text;

ALTER TABLE notifications ALTER COLUMN user_id TYPE text;
ALTER TABLE notifications ALTER COLUMN actor_id TYPE text;

ALTER TABLE reports ALTER COLUMN reporter_id TYPE text;
ALTER TABLE reports ALTER COLUMN reported_id TYPE text;

ALTER TABLE blocks ALTER COLUMN blocker_id TYPE text;
ALTER TABLE blocks ALTER COLUMN blocked_id TYPE text;

ALTER TABLE push_subscriptions ALTER COLUMN user_id TYPE text;

-- 3. The delete_account RPC needs to be updated to NOT attempt to delete from auth.users.
CREATE OR REPLACE FUNCTION delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    uid text;
BEGIN
    uid := auth.uid();
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete from profiles (which cascades to all other tables due to FKs linking to profiles.id)
    -- If your schema didn't have ON DELETE CASCADE from profiles, you'd need to delete from them manually first.
    DELETE FROM profiles WHERE id = uid;

    -- We NO LONGER delete from auth.users because Firebase users don't exist there.
    -- (A separate Firebase Cloud Function or Admin SDK script must be used to delete the Firebase user)
END;
$$;
