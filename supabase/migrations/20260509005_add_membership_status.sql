-- Add membership status fields to users/profiles table
-- First, add columns to membership table for tracking paid status
ALTER TABLE membership
ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'unpaid' CHECK (membership_status IN ('paid', 'unpaid')),
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP;

-- Also update profiles table to track membership status if needed
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'unpaid' CHECK (membership_status IN ('paid', 'unpaid')),
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP;

-- Create index for membership status queries
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status ON profiles(membership_status);
CREATE INDEX IF NOT EXISTS idx_profiles_membership_expires_at ON profiles(membership_expires_at);
CREATE INDEX IF NOT EXISTS idx_membership_status ON membership(membership_status);
CREATE INDEX IF NOT EXISTS idx_membership_expires_at ON membership(membership_expires_at);
