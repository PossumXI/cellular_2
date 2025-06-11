/*
  # Create Analytics Tables and Functions

  1. New Tables
    - `social_engagement_analytics` - Social media engagement data
    - `network_performance_analytics` - Network performance metrics
    - `ai_interaction_analytics` - AI interaction tracking
    - `ai_usage_patterns` - AI usage pattern analysis
    - `location_popularity_rankings` - Location popularity data
    - `live_social_engagement` - Real-time social engagement
    - `network_performance_trends` - Network performance trends
    - `event_correlation_data` - Event correlation analysis
    - `location_activity_heatmap` - Location activity heatmap data
    - `monetization_insights` - Monetization insights data

  2. Views
    - `live_social_engagement` - Live social engagement view
    - `network_performance_trends` - Network performance trends view
    - `location_popularity_rankings` - Location popularity rankings view
    - `ai_usage_patterns` - AI usage patterns view

  3. Functions
    - `update_location_activity_heatmap` - Update location activity
    - `generate_monetization_insights` - Generate monetization insights

  4. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create social_engagement_analytics table
CREATE TABLE IF NOT EXISTS social_engagement_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  location_name text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  day_of_month integer NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  is_weekend boolean DEFAULT false,
  is_holiday boolean DEFAULT false,
  holiday_name text,
  platform text NOT NULL DEFAULT 'twitter',
  total_posts integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_retweets integer DEFAULT 0,
  total_replies integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  avg_sentiment numeric DEFAULT 0.5,
  engagement_rate numeric DEFAULT 0,
  trending_hashtags text[] DEFAULT '{}',
  top_topics text[] DEFAULT '{}',
  major_event_nearby boolean DEFAULT false,
  event_type text,
  event_name text,
  created_at timestamptz DEFAULT now()
);

-- Create network_performance_analytics table
CREATE TABLE IF NOT EXISTS network_performance_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  location_name text NOT NULL,
  network_type text NOT NULL,
  carrier text,
  signal_strength numeric NOT NULL,
  download_speed numeric NOT NULL,
  upload_speed numeric NOT NULL,
  latency numeric NOT NULL,
  jitter numeric NOT NULL,
  device_type text NOT NULL,
  reliability_score numeric DEFAULT 0,
  test_timestamp timestamptz NOT NULL,
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  is_peak_hour boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create ai_interaction_analytics table
CREATE TABLE IF NOT EXISTS ai_interaction_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  coordinates point NOT NULL,
  location_name text NOT NULL,
  interaction_type text NOT NULL,
  query_text text,
  response_text text,
  query_length integer DEFAULT 0,
  response_length integer DEFAULT 0,
  processing_time_ms integer NOT NULL,
  model_used text NOT NULL,
  api_cost_usd numeric DEFAULT 0,
  user_satisfaction numeric,
  user_tier text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create event_correlation_data table
CREATE TABLE IF NOT EXISTS event_correlation_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  location_name text NOT NULL,
  coordinates point NOT NULL,
  social_activity_increase numeric DEFAULT 0,
  network_usage_increase numeric DEFAULT 0,
  ai_interaction_increase numeric DEFAULT 0,
  estimated_attendance integer DEFAULT 0,
  impact_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create location_activity_heatmap table
CREATE TABLE IF NOT EXISTS location_activity_heatmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  location_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  hour integer NOT NULL,
  total_interactions integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  ai_queries integer DEFAULT 0,
  voice_interactions integer DEFAULT 0,
  text_interactions integer DEFAULT 0,
  avg_session_duration numeric DEFAULT 0,
  current_active_users integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create monetization_insights table
CREATE TABLE IF NOT EXISTS monetization_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  data_category text NOT NULL,
  geographic_scope text NOT NULL,
  time_period text NOT NULL,
  insights_data jsonb NOT NULL DEFAULT '{}',
  market_value_usd numeric NOT NULL DEFAULT 0,
  access_tier text NOT NULL DEFAULT 'basic',
  target_customers text[] DEFAULT '{}',
  data_quality_score numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_engagement_location ON social_engagement_analytics USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_social_engagement_timestamp ON social_engagement_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_social_engagement_location_time ON social_engagement_analytics (location_name, timestamp);

CREATE INDEX IF NOT EXISTS idx_network_performance_location ON network_performance_analytics USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_network_performance_timestamp ON network_performance_analytics (test_timestamp);
CREATE INDEX IF NOT EXISTS idx_network_performance_location_time ON network_performance_analytics (location_name, test_timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_location ON ai_interaction_analytics USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_timestamp ON ai_interaction_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_user ON ai_interaction_analytics (user_id);

CREATE INDEX IF NOT EXISTS idx_location_activity_location ON location_activity_heatmap USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_location_activity_date_hour ON location_activity_heatmap (date, hour);

CREATE INDEX IF NOT EXISTS idx_monetization_insights_type ON monetization_insights (insight_type);
CREATE INDEX IF NOT EXISTS idx_monetization_insights_category ON monetization_insights (data_category);

-- Enable RLS
ALTER TABLE social_engagement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_correlation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_activity_heatmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view social engagement analytics"
  ON social_engagement_analytics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert social engagement analytics"
  ON social_engagement_analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view network performance analytics"
  ON network_performance_analytics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert network performance analytics"
  ON network_performance_analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own AI interactions"
  ON ai_interaction_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can insert AI interactions"
  ON ai_interaction_analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view event correlation data"
  ON event_correlation_data
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert event correlation data"
  ON event_correlation_data
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view location activity heatmap"
  ON location_activity_heatmap
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage location activity heatmap"
  ON location_activity_heatmap
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view monetization insights"
  ON monetization_insights
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage monetization insights"
  ON monetization_insights
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create views
CREATE OR REPLACE VIEW live_social_engagement AS
SELECT 
  location_name,
  coordinates,
  SUM(total_posts) as total_posts_last_hour,
  SUM(total_likes) as total_likes_last_hour,
  SUM(total_retweets) as total_retweets_last_hour,
  SUM(total_replies) as total_replies_last_hour,
  AVG(avg_sentiment) as avg_sentiment_last_hour,
  AVG(engagement_rate) as avg_engagement_rate,
  COUNT(DISTINCT id) as data_points
FROM social_engagement_analytics
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY location_name, coordinates
ORDER BY total_posts_last_hour DESC;

CREATE OR REPLACE VIEW network_performance_trends AS
SELECT 
  location_name,
  coordinates,
  network_type,
  AVG(download_speed) as avg_download_speed,
  AVG(upload_speed) as avg_upload_speed,
  AVG(latency) as avg_latency,
  AVG(signal_strength) as avg_signal_strength,
  COUNT(*) as test_count,
  MAX(test_timestamp) as last_test
FROM network_performance_analytics
WHERE test_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, coordinates, network_type
ORDER BY avg_download_speed DESC;

CREATE OR REPLACE VIEW location_popularity_rankings AS
SELECT 
  location_name,
  coordinates,
  SUM(total_interactions) as total_interactions,
  AVG(unique_users) as avg_unique_users,
  AVG(avg_session_duration) as avg_session_duration,
  MAX(updated_at) as last_activity
FROM location_activity_heatmap
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY location_name, coordinates
ORDER BY total_interactions DESC;

CREATE OR REPLACE VIEW ai_usage_patterns AS
SELECT 
  location_name,
  interaction_type,
  model_used,
  user_tier,
  COUNT(*) as interaction_count,
  AVG(processing_time_ms) as avg_processing_time,
  AVG(user_satisfaction) as avg_satisfaction,
  SUM(api_cost_usd) as total_api_cost,
  MAX(timestamp) as last_interaction
FROM ai_interaction_analytics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, interaction_type, model_used, user_tier
ORDER BY interaction_count DESC;

-- Create functions
CREATE OR REPLACE FUNCTION update_location_activity_heatmap(
  p_coordinates point,
  p_location_name text,
  p_interaction_type text,
  p_session_duration numeric DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO location_activity_heatmap (
    coordinates,
    location_name,
    date,
    hour,
    total_interactions,
    unique_users,
    ai_queries,
    voice_interactions,
    text_interactions,
    avg_session_duration
  )
  VALUES (
    p_coordinates,
    p_location_name,
    CURRENT_DATE,
    EXTRACT(HOUR FROM NOW())::integer,
    1,
    1,
    CASE WHEN p_interaction_type = 'ai_query' THEN 1 ELSE 0 END,
    CASE WHEN p_interaction_type = 'voice' THEN 1 ELSE 0 END,
    CASE WHEN p_interaction_type = 'text' THEN 1 ELSE 0 END,
    p_session_duration
  )
  ON CONFLICT (location_name, date, hour) 
  DO UPDATE SET
    total_interactions = location_activity_heatmap.total_interactions + 1,
    unique_users = location_activity_heatmap.unique_users + 1,
    ai_queries = location_activity_heatmap.ai_queries + CASE WHEN p_interaction_type = 'ai_query' THEN 1 ELSE 0 END,
    voice_interactions = location_activity_heatmap.voice_interactions + CASE WHEN p_interaction_type = 'voice' THEN 1 ELSE 0 END,
    text_interactions = location_activity_heatmap.text_interactions + CASE WHEN p_interaction_type = 'text' THEN 1 ELSE 0 END,
    avg_session_duration = (location_activity_heatmap.avg_session_duration + p_session_duration) / 2,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION generate_monetization_insights(
  p_insight_type text,
  p_data_category text,
  p_time_period text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_insights_data jsonb;
  v_market_value numeric;
  v_geographic_scope text;
BEGIN
  -- Generate sample insights data based on type
  CASE p_insight_type
    WHEN 'social_trends' THEN
      v_insights_data := jsonb_build_object(
        'trending_topics', ARRAY['technology', 'events', 'weather'],
        'engagement_rate', 0.15,
        'sentiment_score', 0.72,
        'viral_content_count', 25
      );
      v_market_value := 1200.00;
      v_geographic_scope := 'city';
    
    WHEN 'network_performance' THEN
      v_insights_data := jsonb_build_object(
        'avg_download_speed', 85.5,
        'coverage_score', 0.92,
        'reliability_index', 0.88,
        'optimization_opportunities', 15
      );
      v_market_value := 2500.00;
      v_geographic_scope := 'region';
    
    WHEN 'ai_usage' THEN
      v_insights_data := jsonb_build_object(
        'total_interactions', 1500,
        'avg_processing_time', 250,
        'satisfaction_score', 0.85,
        'cost_efficiency', 0.78
      );
      v_market_value := 1800.00;
      v_geographic_scope := 'city';
    
    WHEN 'location_popularity' THEN
      v_insights_data := jsonb_build_object(
        'foot_traffic_index', 0.82,
        'peak_hours', ARRAY[9, 12, 18],
        'growth_rate', 0.15,
        'commercial_value', 'high'
      );
      v_market_value := 950.00;
      v_geographic_scope := 'local';
    
    ELSE
      v_insights_data := jsonb_build_object('status', 'unknown_type');
      v_market_value := 500.00;
      v_geographic_scope := 'local';
  END CASE;

  -- Insert the monetization insight
  INSERT INTO monetization_insights (
    insight_type,
    data_category,
    geographic_scope,
    time_period,
    insights_data,
    market_value_usd,
    access_tier,
    target_customers,
    data_quality_score
  )
  VALUES (
    p_insight_type,
    p_data_category,
    v_geographic_scope,
    p_time_period,
    v_insights_data,
    v_market_value,
    'premium',
    CASE p_data_category
      WHEN 'telecom' THEN ARRAY['Telecom Companies', 'Network Operators']
      WHEN 'ai_companies' THEN ARRAY['AI Companies', 'Tech Startups']
      WHEN 'social_media' THEN ARRAY['Marketing Agencies', 'Brand Managers']
      WHEN 'real_estate' THEN ARRAY['Real Estate Companies', 'Urban Planners']
      ELSE ARRAY['Enterprise Clients']
    END,
    0.85 + (RANDOM() * 0.1)
  );
END;
$$;

-- Add unique constraint for location_activity_heatmap
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'location_activity_heatmap_unique_location_date_hour'
  ) THEN
    ALTER TABLE location_activity_heatmap 
    ADD CONSTRAINT location_activity_heatmap_unique_location_date_hour 
    UNIQUE (location_name, date, hour);
  END IF;
END $$;

-- Create trigger for updating updated_at
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
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_location_activity_heatmap_updated_at'
  ) THEN
    CREATE TRIGGER update_location_activity_heatmap_updated_at
      BEFORE UPDATE ON location_activity_heatmap
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_monetization_insights_updated_at'
  ) THEN
    CREATE TRIGGER update_monetization_insights_updated_at
      BEFORE UPDATE ON monetization_insights
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;