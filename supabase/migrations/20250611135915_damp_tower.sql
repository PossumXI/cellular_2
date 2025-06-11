/*
  # Enhanced Analytics System for Data Monetization
  
  1. New Tables for Comprehensive Analytics
    - `social_engagement_analytics` - Track X/Twitter engagement by location and time
    - `network_performance_analytics` - Detailed network metrics for telecom insights
    - `location_activity_heatmap` - Real-time location activity tracking
    - `event_correlation_data` - Correlate social activity with events/holidays
    - `ai_interaction_analytics` - Track AI usage patterns for AI companies
    - `monetization_insights` - Aggregated insights ready for sale
    
  2. Enhanced Indexes for Performance
    - Spatial indexes for location-based queries
    - Time-based indexes for temporal analysis
    - Composite indexes for complex analytics queries
    
  3. Real-time Analytics Views
    - Live engagement metrics
    - Network performance trends
    - Location popularity rankings
*/

-- Social Engagement Analytics Table
CREATE TABLE IF NOT EXISTS social_engagement_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  location_name text NOT NULL,
  country_code text,
  region text,
  city text,
  
  -- Temporal data
  timestamp timestamptz NOT NULL DEFAULT now(),
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  day_of_month integer NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  is_weekend boolean DEFAULT false,
  is_holiday boolean DEFAULT false,
  holiday_name text,
  
  -- Social media metrics
  platform text NOT NULL DEFAULT 'twitter',
  total_posts integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_retweets integer DEFAULT 0,
  total_replies integer DEFAULT 0,
  total_quotes integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  verified_users integer DEFAULT 0,
  
  -- Engagement analysis
  avg_sentiment numeric(3,2) DEFAULT 0.5,
  engagement_rate numeric(5,2) DEFAULT 0,
  viral_posts integer DEFAULT 0,
  trending_hashtags text[],
  top_topics text[],
  
  -- Event correlation
  major_event_nearby boolean DEFAULT false,
  event_type text,
  event_name text,
  distance_to_event_km numeric(8,2),
  
  -- Demographics (estimated)
  estimated_age_groups jsonb DEFAULT '{}',
  estimated_languages text[],
  
  created_at timestamptz DEFAULT now()
);

-- Network Performance Analytics Table
CREATE TABLE IF NOT EXISTS network_performance_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  location_name text NOT NULL,
  
  -- Network details
  network_type text NOT NULL, -- 5G, 4G, 3G, WiFi
  carrier text,
  signal_strength integer, -- 0-100
  download_speed numeric(8,2), -- Mbps
  upload_speed numeric(8,2), -- Mbps
  latency numeric(8,2), -- ms
  jitter numeric(8,2), -- ms
  packet_loss numeric(5,2), -- percentage
  
  -- Device and connection info
  device_type text,
  os_type text,
  browser_type text,
  connection_type text, -- cellular, wifi, ethernet
  
  -- Usage patterns
  peak_usage_hours integer[],
  data_consumption_gb numeric(10,2),
  concurrent_connections integer,
  
  -- Quality metrics
  reliability_score numeric(3,2),
  user_satisfaction_score numeric(3,2),
  
  -- Temporal data
  test_timestamp timestamptz NOT NULL,
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  is_peak_hour boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

-- Location Activity Heatmap Table
CREATE TABLE IF NOT EXISTS location_activity_heatmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  location_name text NOT NULL,
  grid_cell_id text NOT NULL, -- For spatial aggregation
  
  -- Activity metrics
  total_interactions integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  ai_queries integer DEFAULT 0,
  voice_interactions integer DEFAULT 0,
  text_interactions integer DEFAULT 0,
  
  -- Engagement quality
  avg_session_duration numeric(8,2), -- seconds
  bounce_rate numeric(5,2), -- percentage
  return_user_rate numeric(5,2), -- percentage
  
  -- Real-time data
  current_active_users integer DEFAULT 0,
  last_activity timestamptz,
  
  -- Temporal aggregation
  date date NOT NULL,
  hour integer NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event Correlation Data Table
CREATE TABLE IF NOT EXISTS event_correlation_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details
  event_name text NOT NULL,
  event_type text NOT NULL, -- holiday, sports, concert, conference, etc.
  event_date date NOT NULL,
  event_start_time timestamptz,
  event_end_time timestamptz,
  
  -- Location data
  event_coordinates point,
  event_location_name text,
  impact_radius_km numeric(8,2) DEFAULT 10,
  
  -- Impact metrics
  social_activity_increase numeric(5,2), -- percentage increase
  network_load_increase numeric(5,2), -- percentage increase
  ai_usage_increase numeric(5,2), -- percentage increase
  
  -- Correlation scores
  correlation_strength numeric(3,2), -- 0-1
  statistical_significance numeric(10,8),
  
  -- Additional data
  event_size text, -- small, medium, large, massive
  event_category text,
  official_attendance integer,
  
  created_at timestamptz DEFAULT now()
);

-- AI Interaction Analytics Table
CREATE TABLE IF NOT EXISTS ai_interaction_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  
  -- Location context
  coordinates point NOT NULL,
  location_name text NOT NULL,
  
  -- Interaction details
  interaction_type text NOT NULL, -- voice, text, personality_generation
  query_text text,
  response_text text,
  query_length integer,
  response_length integer,
  
  -- AI metrics
  processing_time_ms integer,
  model_used text, -- gemini, elevenlabs, etc.
  api_cost_usd numeric(10,6),
  
  -- Quality metrics
  user_satisfaction integer, -- 1-5 rating
  response_accuracy numeric(3,2), -- 0-1
  response_relevance numeric(3,2), -- 0-1
  
  -- Usage patterns
  is_repeat_user boolean DEFAULT false,
  user_tier text, -- free, premium
  
  -- Temporal data
  timestamp timestamptz NOT NULL DEFAULT now(),
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

-- Monetization Insights Table (Aggregated data ready for sale)
CREATE TABLE IF NOT EXISTS monetization_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Data package details
  insight_type text NOT NULL, -- social_trends, network_performance, ai_usage, location_popularity
  data_category text NOT NULL, -- telecom, ai_companies, social_media, real_estate
  
  -- Geographic scope
  geographic_scope text NOT NULL, -- city, region, country, global
  location_identifier text, -- city name, region code, etc.
  coordinates_center point,
  radius_km numeric(8,2),
  
  -- Temporal scope
  time_period text NOT NULL, -- hourly, daily, weekly, monthly
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Insight data (JSON format for flexibility)
  insights_data jsonb NOT NULL,
  
  -- Metadata
  data_points_count integer,
  confidence_score numeric(3,2),
  data_freshness_hours integer,
  
  -- Monetization
  market_value_usd numeric(10,2),
  access_tier text, -- basic, premium, enterprise
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhanced Indexes for Performance

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_social_engagement_coordinates 
ON social_engagement_analytics USING GIST (coordinates);

CREATE INDEX IF NOT EXISTS idx_network_performance_coordinates 
ON network_performance_analytics USING GIST (coordinates);

CREATE INDEX IF NOT EXISTS idx_location_activity_coordinates 
ON location_activity_heatmap USING GIST (coordinates);

-- Temporal indexes
CREATE INDEX IF NOT EXISTS idx_social_engagement_timestamp 
ON social_engagement_analytics (timestamp);

CREATE INDEX IF NOT EXISTS idx_social_engagement_temporal 
ON social_engagement_analytics (year, month, day_of_month, hour_of_day);

CREATE INDEX IF NOT EXISTS idx_network_performance_temporal 
ON network_performance_analytics (test_timestamp, hour_of_day, day_of_week);

CREATE INDEX IF NOT EXISTS idx_location_activity_temporal 
ON location_activity_heatmap (date, hour);

-- Composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_social_engagement_location_time 
ON social_engagement_analytics (location_name, timestamp, engagement_rate);

CREATE INDEX IF NOT EXISTS idx_network_performance_quality 
ON network_performance_analytics (network_type, signal_strength, download_speed, test_timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_patterns 
ON ai_interaction_analytics (user_tier, interaction_type, timestamp);

-- Event correlation indexes
CREATE INDEX IF NOT EXISTS idx_event_correlation_date 
ON event_correlation_data (event_date, event_type);

CREATE INDEX IF NOT EXISTS idx_event_correlation_location 
ON event_correlation_data USING GIST (event_coordinates);

-- Monetization indexes
CREATE INDEX IF NOT EXISTS idx_monetization_insights_category 
ON monetization_insights (data_category, insight_type, time_period);

CREATE INDEX IF NOT EXISTS idx_monetization_insights_location 
ON monetization_insights (geographic_scope, location_identifier);

-- Real-time Analytics Views

-- Live Social Engagement View
CREATE OR REPLACE VIEW live_social_engagement AS
SELECT 
  location_name,
  coordinates,
  COUNT(*) as total_posts_last_hour,
  SUM(total_likes) as total_likes_last_hour,
  SUM(total_retweets) as total_retweets_last_hour,
  AVG(avg_sentiment) as avg_sentiment_last_hour,
  AVG(engagement_rate) as avg_engagement_rate,
  array_agg(DISTINCT unnest(trending_hashtags)) as trending_hashtags,
  MAX(timestamp) as last_update
FROM social_engagement_analytics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY location_name, coordinates
ORDER BY total_posts_last_hour DESC;

-- Network Performance Trends View
CREATE OR REPLACE VIEW network_performance_trends AS
SELECT 
  location_name,
  network_type,
  AVG(download_speed) as avg_download_speed,
  AVG(upload_speed) as avg_upload_speed,
  AVG(latency) as avg_latency,
  AVG(signal_strength) as avg_signal_strength,
  COUNT(*) as test_count,
  MAX(test_timestamp) as last_test
FROM network_performance_analytics 
WHERE test_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, network_type
ORDER BY avg_download_speed DESC;

-- Location Popularity Rankings View
CREATE OR REPLACE VIEW location_popularity_rankings AS
SELECT 
  location_name,
  coordinates,
  SUM(total_interactions) as total_interactions_today,
  SUM(unique_users) as unique_users_today,
  AVG(avg_session_duration) as avg_session_duration,
  AVG(return_user_rate) as return_user_rate,
  RANK() OVER (ORDER BY SUM(total_interactions) DESC) as popularity_rank
FROM location_activity_heatmap 
WHERE date = CURRENT_DATE
GROUP BY location_name, coordinates
ORDER BY popularity_rank;

-- AI Usage Patterns View
CREATE OR REPLACE VIEW ai_usage_patterns AS
SELECT 
  location_name,
  interaction_type,
  user_tier,
  COUNT(*) as interaction_count,
  AVG(processing_time_ms) as avg_processing_time,
  AVG(user_satisfaction) as avg_satisfaction,
  SUM(api_cost_usd) as total_api_cost,
  DATE_TRUNC('hour', timestamp) as hour_bucket
FROM ai_interaction_analytics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, interaction_type, user_tier, DATE_TRUNC('hour', timestamp)
ORDER BY hour_bucket DESC, interaction_count DESC;

-- Enable Row Level Security
ALTER TABLE social_engagement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_activity_heatmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_correlation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Analytics Tables

-- Social engagement analytics - public read for aggregated data
CREATE POLICY "Public can read aggregated social engagement data"
  ON social_engagement_analytics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert social engagement data"
  ON social_engagement_analytics
  FOR INSERT
  TO public
  USING (true);

-- Network performance analytics - public read
CREATE POLICY "Public can read network performance data"
  ON network_performance_analytics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert network performance data"
  ON network_performance_analytics
  FOR INSERT
  TO public
  USING (true);

-- Location activity heatmap - public read
CREATE POLICY "Public can read location activity data"
  ON location_activity_heatmap
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage location activity data"
  ON location_activity_heatmap
  FOR ALL
  TO public
  USING (true);

-- Event correlation data - public read
CREATE POLICY "Public can read event correlation data"
  ON event_correlation_data
  FOR SELECT
  TO public
  USING (true);

-- AI interaction analytics - users can read own data
CREATE POLICY "Users can read own AI interaction data"
  ON ai_interaction_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI interaction data"
  ON ai_interaction_analytics
  FOR INSERT
  TO public
  USING (true);

-- Monetization insights - restricted access
CREATE POLICY "Authenticated users can read basic monetization insights"
  ON monetization_insights
  FOR SELECT
  TO authenticated
  USING (access_tier = 'basic');

-- Functions for Analytics

-- Function to update location activity heatmap
CREATE OR REPLACE FUNCTION update_location_activity_heatmap(
  p_coordinates point,
  p_location_name text,
  p_interaction_type text,
  p_session_duration numeric DEFAULT 0
) RETURNS void AS $$
DECLARE
  grid_cell text;
  current_hour integer;
  current_date date;
BEGIN
  -- Generate grid cell ID for spatial aggregation
  grid_cell := CONCAT(
    FLOOR(ST_X(p_coordinates) * 100)::text, '_',
    FLOOR(ST_Y(p_coordinates) * 100)::text
  );
  
  current_hour := EXTRACT(hour FROM NOW());
  current_date := CURRENT_DATE;
  
  -- Insert or update heatmap data
  INSERT INTO location_activity_heatmap (
    coordinates, location_name, grid_cell_id, date, hour,
    total_interactions, unique_users, last_activity
  ) VALUES (
    p_coordinates, p_location_name, grid_cell, current_date, current_hour,
    1, 1, NOW()
  )
  ON CONFLICT (grid_cell_id, date, hour) 
  DO UPDATE SET
    total_interactions = location_activity_heatmap.total_interactions + 1,
    last_activity = NOW(),
    updated_at = NOW();
    
  -- Update session duration if provided
  IF p_session_duration > 0 THEN
    UPDATE location_activity_heatmap 
    SET avg_session_duration = COALESCE(
      (avg_session_duration * (total_interactions - 1) + p_session_duration) / total_interactions,
      p_session_duration
    )
    WHERE grid_cell_id = grid_cell AND date = current_date AND hour = current_hour;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to log social engagement data
CREATE OR REPLACE FUNCTION log_social_engagement(
  p_coordinates point,
  p_location_name text,
  p_platform text,
  p_posts integer DEFAULT 0,
  p_likes integer DEFAULT 0,
  p_retweets integer DEFAULT 0,
  p_sentiment numeric DEFAULT 0.5,
  p_hashtags text[] DEFAULT ARRAY[]::text[]
) RETURNS void AS $$
DECLARE
  current_time timestamptz := NOW();
BEGIN
  INSERT INTO social_engagement_analytics (
    coordinates, location_name, platform, timestamp,
    hour_of_day, day_of_week, day_of_month, month, year,
    is_weekend, total_posts, total_likes, total_retweets,
    avg_sentiment, trending_hashtags
  ) VALUES (
    p_coordinates, p_location_name, p_platform, current_time,
    EXTRACT(hour FROM current_time),
    EXTRACT(dow FROM current_time),
    EXTRACT(day FROM current_time),
    EXTRACT(month FROM current_time),
    EXTRACT(year FROM current_time),
    EXTRACT(dow FROM current_time) IN (0, 6),
    p_posts, p_likes, p_retweets, p_sentiment, p_hashtags
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate monetization insights
CREATE OR REPLACE FUNCTION generate_monetization_insights(
  p_insight_type text,
  p_data_category text,
  p_time_period text DEFAULT 'daily'
) RETURNS void AS $$
DECLARE
  insights_data jsonb;
  data_count integer;
BEGIN
  -- Generate insights based on type
  CASE p_insight_type
    WHEN 'social_trends' THEN
      SELECT jsonb_build_object(
        'top_locations', jsonb_agg(jsonb_build_object(
          'location', location_name,
          'engagement_rate', avg_engagement_rate,
          'sentiment', avg_sentiment
        ) ORDER BY avg_engagement_rate DESC LIMIT 10),
        'trending_hashtags', array_agg(DISTINCT unnest(trending_hashtags)),
        'peak_hours', array_agg(DISTINCT hour_of_day ORDER BY hour_of_day)
      ), COUNT(*)
      INTO insights_data, data_count
      FROM social_engagement_analytics
      WHERE timestamp >= NOW() - INTERVAL '1 day';
      
    WHEN 'network_performance' THEN
      SELECT jsonb_build_object(
        'avg_speeds_by_network', jsonb_object_agg(
          network_type, 
          jsonb_build_object(
            'download', avg_download_speed,
            'upload', avg_upload_speed,
            'latency', avg_latency
          )
        ),
        'coverage_quality', jsonb_build_object(
          'excellent', COUNT(*) FILTER (WHERE signal_strength >= 80),
          'good', COUNT(*) FILTER (WHERE signal_strength >= 60 AND signal_strength < 80),
          'poor', COUNT(*) FILTER (WHERE signal_strength < 60)
        )
      ), COUNT(*)
      INTO insights_data, data_count
      FROM network_performance_analytics
      WHERE test_timestamp >= NOW() - INTERVAL '1 day'
      GROUP BY network_type;
  END CASE;
  
  -- Insert monetization insight
  INSERT INTO monetization_insights (
    insight_type, data_category, geographic_scope, time_period,
    start_date, end_date, insights_data, data_points_count,
    confidence_score, data_freshness_hours, market_value_usd, access_tier
  ) VALUES (
    p_insight_type, p_data_category, 'global', p_time_period,
    CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE,
    insights_data, data_count, 0.85, 1, 
    CASE 
      WHEN data_count > 1000 THEN 500.00
      WHEN data_count > 100 THEN 100.00
      ELSE 25.00
    END,
    'premium'
  );
END;
$$ LANGUAGE plpgsql;