/*
  # Fix Location Interactions Table

  1. Changes
    - Make user_id column nullable in location_interactions table
    - Update RLS policies to allow anonymous interactions
*/

-- Make user_id column nullable in location_interactions table
ALTER TABLE location_interactions ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to allow anonymous interactions
DROP POLICY IF EXISTS "Users can view own interactions" ON location_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON location_interactions;

-- Create new policies that allow anonymous interactions
CREATE POLICY "Users can view own interactions" ON location_interactions
  FOR SELECT USING ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Users can insert own interactions" ON location_interactions
  FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));