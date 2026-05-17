-- Add Event Chair and Vice Chair fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_chair_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vc_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moved_to_history_at TIMESTAMP;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_events_event_chair_id ON events(event_chair_id);
CREATE INDEX IF NOT EXISTS idx_events_vc_id ON events(vc_id);
