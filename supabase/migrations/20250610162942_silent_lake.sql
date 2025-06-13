-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  daily_interactions_used INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 10,
  stripe_customer_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  subscription_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location interactions table
CREATE TABLE location_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  location_id TEXT NOT NULL,
  coordinates POINT NOT NULL,
  location_name TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('voice', 'text', 'view')),
  query TEXT,
  response TEXT,
  duration_seconds INTEGER,
  blockchain_tx_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User analytics table
CREATE TABLE user_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_interactions INTEGER DEFAULT 0,
  voice_interactions INTEGER DEFAULT 0,
  text_interactions INTEGER DEFAULT 0,
  unique_locations INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  favorite_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Location memories table
CREATE TABLE location_memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_id TEXT UNIQUE NOT NULL,
  coordinates POINT NOT NULL,
  location_name TEXT NOT NULL,
  total_interactions INTEGER DEFAULT 0,
  personality_data JSONB,
  voice_profile JSONB,
  last_interaction TIMESTAMPTZ,
  blockchain_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_location_interactions_user_id ON location_interactions(user_id);
CREATE INDEX idx_location_interactions_location_id ON location_interactions(location_id);
CREATE INDEX idx_location_interactions_created_at ON location_interactions(created_at);
CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_date ON user_analytics(date);
CREATE INDEX idx_location_memories_location_id ON location_memories(location_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Location interactions policies
CREATE POLICY "Users can view own interactions" ON location_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON location_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User analytics policies
CREATE POLICY "Users can view own analytics" ON user_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON user_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON user_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Location memories are public (read-only for users)
CREATE POLICY "Anyone can view location memories" ON location_memories
  FOR SELECT TO authenticated USING (true);

-- Functions
-- Function to increment daily usage
CREATE OR REPLACE FUNCTION increment_daily_usage(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET daily_interactions_used = daily_interactions_used + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily usage (called by cron job)
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET daily_interactions_used = 0,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user subscription
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
  SET subscription_tier = tier,
      subscription_status = status,
      stripe_customer_id = customer_id,
      subscription_end_date = end_date,
      daily_limit = CASE WHEN tier = 'premium' THEN 1000 ELSE 10 END,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_memories_updated_at
  BEFORE UPDATE ON location_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();