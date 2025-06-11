/*
  # Create Analytics Tables Migration

  This migration creates all the necessary tables and functions for the analytics system.

  ## New Tables
  1. `social_engagement_analytics` - Social media engagement data
  2. `network_performance_analytics` - Network performance metrics
  3. `location_activity_heatmap` - Location-based activity tracking
  4. `ai_interaction_analytics` - AI interaction tracking
  5. `monetization_insights` - Monetization data and insights

  ## Functions
  1. `generate_monetization_insights` - Generate monetization insights
  2. `update_updated_at_column` - Trigger function for updated_at columns

  ## Security
  - Enable RLS on all tables
  - Add appropriate policies for data access
*/

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Social Engagement Analytics Table
CREATE TABLE IF NOT EXISTS social_engagement_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinates point NOT NULL,
    location_name text NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    hour_of_day integer NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_of_month integer NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
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
    avg_sentiment numeric(3,2) DEFAULT 0.5 CHECK (avg_sentiment >= 0 AND avg_sentiment <= 1),
    engagement_rate numeric(5,4) DEFAULT 0,
    trending_hashtags text[] DEFAULT '{}',
    top_topics text[] DEFAULT '{}',
    major_event_nearby boolean DEFAULT false,
    event_type text,
    event_name text,
    created_at timestamptz DEFAULT now()
);

-- Network Performance Analytics Table
CREATE TABLE IF NOT EXISTS network_performance_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinates point NOT NULL,
    location_name text NOT NULL,
    network_type text NOT NULL DEFAULT '4G',
    carrier text,
    signal_strength numeric(5,2) DEFAULT 0,
    download_speed numeric(8,2) NOT NULL DEFAULT 0,
    upload_speed numeric(8,2) NOT NULL DEFAULT 0,
    latency numeric(6,2) NOT NULL DEFAULT 0,
    jitter numeric(6,2) DEFAULT 0,
    device_type text DEFAULT 'mobile',
    reliability_score numeric(3,2) DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    test_timestamp timestamptz NOT NULL,
    hour_of_day integer NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_peak_hour boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Location Activity Heatmap Table
CREATE TABLE IF NOT EXISTS location_activity_heatmap (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinates point NOT NULL,
    location_name text NOT NULL,
    date date NOT NULL,
    hour integer NOT NULL CHECK (hour >= 0 AND hour <= 23),
    total_interactions integer DEFAULT 0,
    unique_users integer DEFAULT 0,
    ai_queries integer DEFAULT 0,
    voice_interactions integer DEFAULT 0,
    text_interactions integer DEFAULT 0,
    avg_session_duration numeric(8,2) DEFAULT 0,
    current_active_users integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(coordinates, date, hour)
);

-- AI Interaction Analytics Table
CREATE TABLE IF NOT EXISTS ai_interaction_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid,
    session_id text NOT NULL,
    coordinates point NOT NULL,
    location_name text NOT NULL,
    interaction_type text NOT NULL CHECK (interaction_type IN ('voice', 'text', 'view')),
    query_text text,
    response_text text,
    query_length integer DEFAULT 0,
    response_length integer DEFAULT 0,
    processing_time_ms integer DEFAULT 0,
    model_used text NOT NULL DEFAULT 'gemini-pro',
    api_cost_usd numeric(10,6) DEFAULT 0,
    user_satisfaction integer CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
    user_tier text DEFAULT 'free' CHECK (user_tier IN ('free', 'premium')),
    timestamp timestamptz NOT NULL DEFAULT now(),
    hour_of_day integer NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    created_at timestamptz DEFAULT now()
);

-- Monetization Insights Table
CREATE TABLE IF NOT EXISTS monetization_insights (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type text NOT NULL,
    data_category text NOT NULL,
    geographic_scope text NOT NULL DEFAULT 'global',
    time_period text NOT NULL DEFAULT 'daily',
    insights_data jsonb NOT NULL DEFAULT '{}',
    market_value_usd numeric(12,2) DEFAULT 0,
    access_tier text DEFAULT 'premium' CHECK (access_tier IN ('free', 'premium', 'enterprise')),
    target_customers text[] DEFAULT '{}',
    data_quality_score numeric(3,2) DEFAULT 0.8 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_engagement_coordinates ON social_engagement_analytics USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_social_engagement_timestamp ON social_engagement_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_social_engagement_location ON social_engagement_analytics (location_name);

CREATE INDEX IF NOT EXISTS idx_network_performance_coordinates ON network_performance_analytics USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_network_performance_timestamp ON network_performance_analytics (test_timestamp);
CREATE INDEX IF NOT EXISTS idx_network_performance_location ON network_performance_analytics (location_name);

CREATE INDEX IF NOT EXISTS idx_location_activity_coordinates ON location_activity_heatmap USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_location_activity_date ON location_activity_heatmap (date);
CREATE INDEX IF NOT EXISTS idx_location_activity_location ON location_activity_heatmap (location_name);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_coordinates ON ai_interaction_analytics USING gist (coordinates);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_timestamp ON ai_interaction_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_user ON ai_interaction_analytics (user_id);

CREATE INDEX IF NOT EXISTS idx_monetization_insights_type ON monetization_insights (insight_type);
CREATE INDEX IF NOT EXISTS idx_monetization_insights_category ON monetization_insights (data_category);

-- Enable Row Level Security
ALTER TABLE social_engagement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_activity_heatmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Social Engagement Analytics Policies
CREATE POLICY "Anyone can view social engagement analytics"
    ON social_engagement_analytics FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Service role can insert social engagement analytics"
    ON social_engagement_analytics FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Network Performance Analytics Policies
CREATE POLICY "Anyone can view network performance analytics"
    ON network_performance_analytics FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Service role can insert network performance analytics"
    ON network_performance_analytics FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Location Activity Heatmap Policies
CREATE POLICY "Anyone can view location activity heatmap"
    ON location_activity_heatmap FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Service role can manage location activity heatmap"
    ON location_activity_heatmap FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- AI Interaction Analytics Policies
CREATE POLICY "Users can view own AI interactions"
    ON ai_interaction_analytics FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI interactions"
    ON ai_interaction_analytics FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Monetization Insights Policies
CREATE POLICY "Authenticated users can view monetization insights"
    ON monetization_insights FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage monetization insights"
    ON monetization_insights FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_location_activity_heatmap_updated_at
    BEFORE UPDATE ON location_activity_heatmap
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monetization_insights_updated_at
    BEFORE UPDATE ON monetization_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the generate_monetization_insights function
CREATE OR REPLACE FUNCTION generate_monetization_insights(
    p_insight_type text,
    p_data_category text,
    p_time_period text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_insights_data jsonb;
    v_market_value numeric;
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
            v_market_value := 1200;
        WHEN 'network_performance' THEN
            v_insights_data := jsonb_build_object(
                'avg_download_speed', 85.5,
                'coverage_score', 0.92,
                'reliability_index', 0.88,
                'optimization_opportunities', 15
            );
            v_market_value := 2500;
        WHEN 'ai_usage' THEN
            v_insights_data := jsonb_build_object(
                'total_interactions', 1500,
                'avg_processing_time', 250,
                'user_satisfaction', 4.2,
                'cost_efficiency', 0.85
            );
            v_market_value := 1800;
        WHEN 'location_popularity' THEN
            v_insights_data := jsonb_build_object(
                'hotspot_locations', ARRAY['downtown', 'tech_district', 'university'],
                'peak_hours', ARRAY[9, 12, 18],
                'growth_rate', 0.23,
                'visitor_retention', 0.67
            );
            v_market_value := 950;
        ELSE
            v_insights_data := jsonb_build_object('message', 'Generic insight data');
            v_market_value := 500;
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
    ) VALUES (
        p_insight_type,
        p_data_category,
        'global',
        p_time_period,
        v_insights_data,
        v_market_value,
        'premium',
        CASE p_data_category
            WHEN 'telecom' THEN ARRAY['Telecom Companies']
            WHEN 'social_media' THEN ARRAY['Social Media Platforms']
            WHEN 'ai_companies' THEN ARRAY['AI Companies']
            WHEN 'real_estate' THEN ARRAY['Real Estate Companies']
            ELSE ARRAY['Enterprise Clients']
        END,
        0.85
    );
END;
$$;

-- Create views for analytics dashboards

-- Analytics Summary View
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
    date_trunc('day', timestamp) as date,
    COUNT(*) as total_interactions,
    COUNT(DISTINCT location_name) as unique_locations,
    AVG(avg_sentiment) as avg_sentiment,
    SUM(total_posts) as total_posts,
    SUM(total_likes) as total_likes
FROM social_engagement_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', timestamp)
ORDER BY date;

-- Location Popularity View
CREATE OR REPLACE VIEW location_popularity AS
SELECT 
    location_name,
    coordinates,
    COUNT(*) as interaction_count,
    COUNT(DISTINCT date_trunc('day', timestamp)) as active_days,
    AVG(avg_sentiment) as avg_sentiment,
    SUM(total_posts) as total_posts,
    MAX(timestamp) as last_activity
FROM social_engagement_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY location_name, coordinates
ORDER BY interaction_count DESC;

-- Network Performance Trends View
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
WHERE test_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY location_name, coordinates, network_type
ORDER BY avg_download_speed DESC;

-- Live Social Engagement View
CREATE OR REPLACE VIEW live_social_engagement AS
SELECT 
    location_name,
    coordinates,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN total_posts ELSE 0 END) as total_posts_last_hour,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN total_likes ELSE 0 END) as total_likes_last_hour,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN total_retweets ELSE 0 END) as total_retweets_last_hour,
    AVG(CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN avg_sentiment END) as avg_sentiment_last_hour,
    COUNT(DISTINCT CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN id END) as activity_count_last_hour
FROM social_engagement_analytics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, coordinates
HAVING SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN total_posts ELSE 0 END) > 0
ORDER BY total_posts_last_hour DESC;

-- AI Usage Patterns View
CREATE OR REPLACE VIEW ai_usage_patterns AS
SELECT 
    location_name,
    coordinates,
    interaction_type,
    model_used,
    user_tier,
    COUNT(*) as interaction_count,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(api_cost_usd) as total_api_cost,
    AVG(user_satisfaction) as avg_satisfaction
FROM ai_interaction_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY location_name, coordinates, interaction_type, model_used, user_tier
ORDER BY interaction_count DESC;

-- Event Correlation Data View (for holidays and events)
CREATE OR REPLACE VIEW event_correlation_data AS
SELECT 
    CURRENT_DATE + (interval '1 day' * generate_series(0, 365)) as event_date,
    CASE 
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 1 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 1 THEN 'New Year''s Day'
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 2 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 14 THEN 'Valentine''s Day'
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 7 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 4 THEN 'Independence Day'
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 10 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 31 THEN 'Halloween'
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 12 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 25 THEN 'Christmas Day'
        ELSE NULL
    END as event_name,
    CASE 
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) IN (1, 2, 7, 10, 12) THEN 'holiday'
        ELSE 'regular'
    END as event_type,
    CASE 
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 12 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 25 THEN 85
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 1 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 1 THEN 75
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 7 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 4 THEN 65
        ELSE 0
    END as social_activity_increase,
    CASE 
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 12 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 25 THEN 42
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 1 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 1 THEN 38
        WHEN EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 7 AND EXTRACT(day FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) = 4 THEN 35
        ELSE 0
    END as network_activity_increase
WHERE EXTRACT(month FROM CURRENT_DATE + (interval '1 day' * generate_series(0, 365))) IN (1, 2, 7, 10, 12)
LIMIT 50;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;