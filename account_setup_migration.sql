-- ============================================================
-- ACCOUNT SETUP: New columns for profiles table
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add is_setup_complete flag (false = new user, must complete setup)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN DEFAULT FALSE;

-- 2. Personal info fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS school TEXT;

-- 3. Organization fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role_title TEXT,
ADD COLUMN IF NOT EXISTS year_joined TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;

-- 4. Emergency contact fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS contact_person_relationship TEXT,
ADD COLUMN IF NOT EXISTS contact_person_phone TEXT;

-- 5. Avatar URL for profile photo uploads
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- STORAGE: Create profile-avatars bucket (run in Supabase Storage UI
-- or use the Storage API. Bucket should be public.)
-- ============================================================
-- Run via Supabase Dashboard → Storage → New Bucket:
--   Name: profile-avatars
--   Public: true

-- ============================================================
-- OPTIONAL: Mark all existing (pre-setup) users as setup_complete
-- so only truly NEW accounts are forced through setup.
-- Uncomment and adjust as needed:
-- ============================================================
-- UPDATE profiles
-- SET is_setup_complete = TRUE
-- WHERE is_setup_complete = FALSE
--   AND full_name IS NOT NULL
--   AND phone IS NOT NULL;
