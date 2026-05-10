-- 1. EVENT CREATION – ADD EVENT CHAIR & VC
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_chair_id UUID,
ADD COLUMN IF NOT EXISTS vc_id UUID,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 8. DATABASE SCHEMA – ADD SCORES TABLE
CREATE TABLE IF NOT EXISTS user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_evaluation_score DECIMAL(3, 2), -- 0.00 to 5.00
  member_evaluation_score DECIMAL(3, 2), -- 0.00 to 5.00
  average_score DECIMAL(3, 2), -- Will be altered below
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE user_scores DROP COLUMN IF EXISTS average_score;
ALTER TABLE user_scores ADD COLUMN average_score DECIMAL(3, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN event_evaluation_score IS NOT NULL AND member_evaluation_score IS NOT NULL THEN (event_evaluation_score + member_evaluation_score) / 2
    WHEN event_evaluation_score IS NOT NULL THEN event_evaluation_score
    WHEN member_evaluation_score IS NOT NULL THEN member_evaluation_score
    ELSE NULL
  END
) STORED;

CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_event_id ON user_scores(event_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_scores_updated_at'
  ) THEN
    CREATE TRIGGER update_user_scores_updated_at
    BEFORE UPDATE ON user_scores
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

-- 9. MEMBERSHIP SECTION
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP WITH TIME ZONE;

-- CRON JOBS
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add cron job to update memberships
SELECT cron.schedule(
  'update_expired_memberships',
  '0 0 * * *',
  $$
    UPDATE profiles
    SET membership_status = 'unpaid'
    WHERE membership_status = 'paid' 
      AND membership_expires_at IS NOT NULL 
      AND membership_expires_at < NOW();
  $$
);

-- Add cron job to update past events to 'done'
SELECT cron.schedule(
  'update_past_events',
  '0 0 * * *',
  $$
    UPDATE events
    SET status = 'done'
    WHERE status != 'done'
      AND date_end IS NOT NULL
      AND date_end < CURRENT_DATE;
  $$
);

-- 10. EVENT-BASED MEMBER EVALUATION
ALTER TABLE member_evaluation_cycle
ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE CASCADE;
