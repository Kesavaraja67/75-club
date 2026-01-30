-- Phase 3.5: Timetable Feature
-- Create timetable_slots table for storing user class schedules

-- Enable required extension for GIST index on UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create timetable_slots table
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create index for faster queries (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timetable_user_day') THEN
    CREATE INDEX idx_timetable_user_day ON timetable_slots(user_id, day_of_week);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timetable_subject') THEN
    CREATE INDEX idx_timetable_subject ON timetable_slots(subject_id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own timetable slots" ON timetable_slots;
CREATE POLICY "Users can view own timetable slots"
  ON timetable_slots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own timetable slots" ON timetable_slots;
CREATE POLICY "Users can insert own timetable slots"
  ON timetable_slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own timetable slots" ON timetable_slots;
CREATE POLICY "Users can update own timetable slots"
  ON timetable_slots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own timetable slots" ON timetable_slots;
CREATE POLICY "Users can delete own timetable slots"
  ON timetable_slots FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Constraint for overlapping slots (Exclude constraint requires btree_gist)
-- Note: Room number is optional, but time ranges should not overlap for the same user on the same day.
-- This might be complex with CHECK constraints, so we often rely on application logic or EXCLUDE.
-- For now, let's at least enforce a unique subject per day/time if applicable, or leave it to trigger.
-- A simpler approach mentioned in CodeRabbit: Unique index on (user_id, day_of_week, start_time)
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_no_duplicates 
  ON timetable_slots(user_id, day_of_week, start_time);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timetable_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timetable_updated_at
  BEFORE UPDATE ON timetable_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_timetable_updated_at();

-- Add comment
COMMENT ON TABLE timetable_slots IS 'Stores user class schedules with day/time information';
