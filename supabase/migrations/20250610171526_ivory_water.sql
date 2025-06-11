/*
  # Fix RLS Policies for User Registration

  1. Security
    - Update RLS policies to allow user registration
    - Fix INSERT policy for users table
    - Ensure proper authentication flow
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create proper RLS policies for users table
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, subscription_tier, daily_interactions_used, daily_limit)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'free',
    0,
    10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to increment daily usage
CREATE OR REPLACE FUNCTION increment_daily_usage(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET daily_interactions_used = daily_interactions_used + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user subscription
CREATE OR REPLACE FUNCTION update_user_subscription(
  user_id UUID,
  tier TEXT,
  status TEXT,
  customer_id TEXT,
  end_date TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET 
    subscription_tier = tier,
    subscription_status = status,
    stripe_customer_id = customer_id,
    subscription_end_date = end_date,
    daily_limit = CASE WHEN tier = 'premium' THEN 1000 ELSE 10 END,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;