/*
  # Fix Location Interactions RLS Policy

  1. Security Updates
    - Update RLS policy for location_interactions to allow anonymous users to log views
    - Allow inserts where user_id is null (for anonymous users)
    - Maintain security for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own interactions" ON location_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON location_interactions;

-- Create new policies that handle both authenticated and anonymous users
CREATE POLICY "Users can view own interactions" ON location_interactions
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND auth.role() = 'anon')
  );

CREATE POLICY "Users can insert own interactions" ON location_interactions
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (user_id IS NULL)
  );

-- Update the policy to use 'public' role instead of specific roles
DROP POLICY IF EXISTS "Users can view own interactions" ON location_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON location_interactions;

CREATE POLICY "Users can view own interactions" ON location_interactions
  FOR SELECT TO public USING (
    (auth.uid() = user_id) OR 
    (user_id IS NULL)
  );

CREATE POLICY "Users can insert own interactions" ON location_interactions
  FOR INSERT TO public WITH CHECK (
    (auth.uid() = user_id) OR 
    (user_id IS NULL)
  );