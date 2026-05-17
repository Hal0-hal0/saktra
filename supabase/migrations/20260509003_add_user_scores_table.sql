-- Create user_scores table for tracking event and member evaluation scores
CREATE TABLE user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_evaluation_score DECIMAL(3, 2), -- 0.00 to 5.00
  member_evaluation_score DECIMAL(3, 2), -- 0.00 to 5.00
  average_score DECIMAL(3, 2) GENERATED ALWAYS AS ((event_evaluation_score + member_evaluation_score) / 2) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX idx_user_scores_event_id ON user_scores(event_id);
CREATE INDEX idx_user_scores_average ON user_scores(average_score);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_scores_updated_at
BEFORE UPDATE ON user_scores
FOR EACH ROW
EXECUTE FUNCTION update_user_scores_updated_at();
