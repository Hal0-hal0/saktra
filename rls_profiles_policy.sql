-- ============================================================
-- RLS POLICIES: Allow users to read and update their own profile
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Make sure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to SELECT their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Allow authenticated users to UPDATE their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
