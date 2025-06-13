-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update trigger function
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
    is_weekend boolean NOT NULL DEFAULT false,
    is_holiday boolean DEFAULT false,
    holiday_name text,
    platform text NOT NULL DEFAULT 'twitter',
    total_posts integer NOT NULL DEFAULT 0,
    total_likes integer NOT NULL DEFAULT 0,
    total_retweets integer NOT NULL DEFAULT 0,
    total_replies integer NOT NULL DEFAULT 0,
    unique_users integer NOT NULL DEFAULT 0,
    avg_sentiment numeric(3,2) NOT NULL DEFAULT 0.5 CHECK (avg_sentiment >= 0 AND avg_sentiment <= 1),
    engagement_rate numeric(5,4) NOT NULL DEFAULT 0,
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
    signal_strength numeric(5,2) NOT NULL DEFAULT 0,
    download_speed numeric(8,2) NOT NULL DEFAULT 0,
    upload_speed numeric(8,2) NOT NULL DEFAULT 0,
    latency numeric(8,2) NOT NULL DEFAULT 0,
    jitter numeric(8,2) NOT NULL DEFAULT 0,
    device_type text NOT NULL DEFAULT 'mobile',
    reliability_score numeric(3,2) NOT NULL DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    test_timestamp timestamptz NOT NULL DEFAULT now(),
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
    total_interactions integer NOT NULL DEFAULT 0,
    unique_users integer NOT NULL DEFAULT 0,
    ai_queries integer NOT NULL DEFAULT 0,
    voice_interactions integer NOT NULL DEFAULT 0,
    text_interactions integer NOT NULL DEFAULT 0,
    avg_session_duration numeric(8,2) NOT NULL DEFAULT 0,
    current_active_users integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(location_name, date, hour)
);

-- AI Interaction Analytics Table
CREATE TABLE IF NOT EXISTS ai_interaction_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid,
    session_id text NOT NULL,
    coordinates point NOT NULL,
    location_name text NOT NULL,
    interaction_type text NOT NULL CHECK (interaction_type IN ('voice', 'text', 'personality_generation')),
    query_text text,
    response_text text,
    query_length integer DEFAULT 0,
    response_length integer DEFAULT 0,
    processing_time_ms integer NOT NULL DEFAULT 0,
    model_used text NOT NULL DEFAULT 'gemini-pro',
    api_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
    user_satisfaction numeric(3,2) CHECK (user_satisfaction >= 0 AND user_satisfaction <= 1),
    user_tier text NOT NULL DEFAULT 'free' CHECK (user_tier IN ('free', 'premium')),
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
    market_value_usd numeric(12,2) NOT NULL DEFAULT 0,
    access_tier text NOT NULL DEFAULT 'premium' CHECK (access_tier IN ('free', 'premium', 'enterprise')),
    target_customers text[] DEFAULT '{}',
    data_quality_score numeric(3,2) DEFAULT 0.85 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Event Correlation Data Table
CREATE TABLE IF NOT EXISTS event_correlation_data (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name text NOT NULL,
    event_type text NOT NULL,
    event_date date NOT NULL,
    coordinates point,
    location_name text,
    social_activity_increase numeric(5,2) DEFAULT 0,
    network_usage_increase numeric(5,2) DEFAULT 0,
    ai_interaction_increase numeric(5,2) DEFAULT 0,
    impact_radius_km numeric(8,2) DEFAULT 0,
    impact_score numeric(3,2) DEFAULT 0 CHECK (impact_score >= 0 AND impact_score <= 1),
    created_at timestamptz DEFAULT now()
);

-- Create text-based indexes for performance (avoiding gist indexes on point type)
CREATE INDEX IF NOT EXISTS idx_social_engagement_location_time ON social_engagement_analytics(location_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_social_engagement_timestamp ON social_engagement_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_social_engagement_sentiment ON social_engagement_analytics(avg_sentiment);

CREATE INDEX IF NOT EXISTS idx_network_performance_location_time ON network_performance_analytics(location_name, test_timestamp);
CREATE INDEX IF NOT EXISTS idx_network_performance_speed ON network_performance_analytics(download_speed);
CREATE INDEX IF NOT EXISTS idx_network_performance_timestamp ON network_performance_analytics(test_timestamp);

CREATE INDEX IF NOT EXISTS idx_location_activity_date_hour ON location_activity_heatmap(date, hour);
CREATE INDEX IF NOT EXISTS idx_location_activity_location ON location_activity_heatmap(location_name);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_timestamp ON ai_interaction_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_user ON ai_interaction_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_location ON ai_interaction_analytics(location_name);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_type ON ai_interaction_analytics(interaction_type);

CREATE INDEX IF NOT EXISTS idx_monetization_insights_category ON monetization_insights(data_category);
CREATE INDEX IF NOT EXISTS idx_monetization_insights_type ON monetization_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_monetization_insights_value ON monetization_insights(market_value_usd);

-- Enable Row Level Security
ALTER TABLE social_engagement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_activity_heatmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_correlation_data ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Anyone can view social engagement analytics" ON social_engagement_analytics
    FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert social engagement analytics" ON social_engagement_analytics
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view network performance analytics" ON network_performance_analytics
    FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert network performance analytics" ON network_performance_analytics
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view location activity heatmap" ON location_activity_heatmap
    FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert location activity heatmap" ON location_activity_heatmap
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update location activity heatmap" ON location_activity_heatmap
    FOR UPDATE TO public USING (true);

CREATE POLICY "Users can view own AI interactions" ON ai_interaction_analytics
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert AI interactions" ON ai_interaction_analytics
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Authenticated users can view monetization insights" ON monetization_insights
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert monetization insights" ON monetization_insights
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view event correlation data" ON event_correlation_data
    FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert event correlation data" ON event_correlation_data
    FOR INSERT TO public WITH CHECK (true);

-- Create Views for Analytics (fixed to avoid GROUP BY with point type)
CREATE OR REPLACE VIEW live_social_engagement AS
SELECT 
    location_name,
    -- Removed coordinates from GROUP BY and SELECT
    SUM(total_posts) as total_posts_last_hour,
    SUM(total_likes) as total_likes_last_hour,
    SUM(total_retweets) as total_retweets_last_hour,
    AVG(avg_sentiment) as avg_sentiment_last_hour,
    AVG(engagement_rate) as avg_engagement_rate,
    -- Fixed: Don't use array_agg with unnest
    string_agg(DISTINCT array_to_string(trending_hashtags, ','), ',') as trending_hashtags_text,
    COUNT(*) as data_points
FROM social_engagement_analytics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY location_name;

CREATE OR REPLACE VIEW network_performance_trends AS
SELECT 
    location_name,
    -- Removed coordinates from GROUP BY and SELECT
    network_type,
    AVG(download_speed) as avg_download_speed,
    AVG(upload_speed) as avg_upload_speed,
    AVG(latency) as avg_latency,
    AVG(signal_strength) as avg_signal_strength,
    COUNT(*) as test_count,
    MAX(test_timestamp) as last_test
FROM network_performance_analytics 
WHERE test_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, network_type;

CREATE OR REPLACE VIEW location_popularity_rankings AS
SELECT 
    location_name,
    -- Removed coordinates from GROUP BY and SELECT
    SUM(total_interactions) as total_interactions,
    AVG(unique_users) as avg_unique_users,
    AVG(avg_session_duration) as avg_session_duration,
    MAX(updated_at) as last_activity
FROM location_activity_heatmap 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY location_name
ORDER BY total_interactions DESC;

CREATE OR REPLACE VIEW ai_usage_patterns AS
SELECT 
    location_name,
    interaction_type,
    model_used,
    user_tier,
    COUNT(*) as interaction_count,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(api_cost_usd) as total_api_cost,
    AVG(user_satisfaction) as avg_satisfaction
FROM ai_interaction_analytics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY location_name, interaction_type, model_used, user_tier;

-- Create the monetization insights generation function
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
BEGIN
    -- Generate insights based on type
    CASE p_insight_type
        WHEN 'social_trends' THEN
            v_insights_data := jsonb_build_object(
                'trending_topics', ARRAY['technology', 'events', 'weather'],
                'engagement_rate', 0.15,
                'sentiment_score', 0.72,
                'viral_content_count', 25
            );
            v_market_value := 1200.00;
            
        WHEN 'network_performance' THEN
            v_insights_data := jsonb_build_object(
                'avg_download_speed', 85.5,
                'coverage_score', 0.92,
                'reliability_index', 0.88,
                'optimization_opportunities', 15
            );
            v_market_value := 2500.00;
            
        WHEN 'ai_usage' THEN
            v_insights_data := jsonb_build_object(
                'total_interactions', 1500,
                'avg_processing_time', 250,
                'cost_efficiency', 0.85,
                'user_satisfaction', 0.78
            );
            v_market_value := 1800.00;
            
        WHEN 'location_popularity' THEN
            v_insights_data := jsonb_build_object(
                'hotspot_count', 45,
                'peak_hours', ARRAY[9, 12, 18],
                'activity_growth', 0.23,
                'unique_visitors', 2500
            );
            v_market_value := 950.00;
            
        ELSE
            v_insights_data := jsonb_build_object('message', 'Generic insights data');
            v_market_value := 500.00;
    END CASE;
    
    -- Insert the generated insights
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
            WHEN 'telecom' THEN ARRAY['Telecom Companies', 'Network Operators']
            WHEN 'ai_companies' THEN ARRAY['AI Companies', 'ML Platforms']
            WHEN 'social_media' THEN ARRAY['Social Media Platforms', 'Marketing Agencies']
            WHEN 'real_estate' THEN ARRAY['Real Estate Companies', 'Urban Planners']
            ELSE ARRAY['Enterprise Clients']
        END,
        0.85 + (random() * 0.15)
    );
END;
$$;

-- Create function to update location activity heatmap
CREATE OR REPLACE FUNCTION update_location_activity_heatmap(
    p_coordinates point,
    p_location_name text,
    p_interaction_type text,
    p_session_duration numeric DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_date date := CURRENT_DATE;
    v_current_hour integer := EXTRACT(HOUR FROM CURRENT_TIMESTAMP)::integer;
    v_record_exists boolean;
BEGIN
    -- Check if record exists
    SELECT EXISTS(
        SELECT 1 FROM location_activity_heatmap
        WHERE location_name = p_location_name
        AND date = v_current_date
        AND hour = v_current_hour
    ) INTO v_record_exists;
    
    IF v_record_exists THEN
        -- Update existing record
        UPDATE location_activity_heatmap
        SET 
            total_interactions = total_interactions + 1,
            unique_users = unique_users + 1,
            ai_queries = CASE WHEN p_interaction_type = 'ai_query' THEN ai_queries + 1 ELSE ai_queries END,
            voice_interactions = CASE WHEN p_interaction_type = 'voice' THEN voice_interactions + 1 ELSE voice_interactions END,
            text_interactions = CASE WHEN p_interaction_type = 'text' THEN text_interactions + 1 ELSE text_interactions END,
            avg_session_duration = (avg_session_duration + p_session_duration) / 2,
            updated_at = NOW()
        WHERE 
            location_name = p_location_name
            AND date = v_current_date
            AND hour = v_current_hour;
    ELSE
        -- Insert new record
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
        ) VALUES (
            p_coordinates,
            p_location_name,
            v_current_date,
            v_current_hour,
            1,
            1,
            CASE WHEN p_interaction_type = 'ai_query' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'voice' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'text' THEN 1 ELSE 0 END,
            p_session_duration
        );
    END IF;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_location_activity_heatmap_updated_at
    BEFORE UPDATE ON location_activity_heatmap
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monetization_insights_updated_at
    BEFORE UPDATE ON monetization_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial sample data for testing
INSERT INTO social_engagement_analytics (
    coordinates, location_name, hour_of_day, day_of_week, day_of_month, month, year,
    platform, total_posts, total_likes, total_retweets, total_replies, unique_users,
    avg_sentiment, engagement_rate, trending_hashtags, top_topics
) VALUES 
    ('(-74.0060, 40.7128)', 'New York City', 14, 1, 15, 1, 2025, 'twitter', 150, 1200, 300, 85, 120, 0.72, 0.15, ARRAY['NYC', 'weather', 'traffic'], ARRAY['Weather', 'Transportation']),
    ('(-118.2437, 34.0522)', 'Los Angeles', 16, 1, 15, 1, 2025, 'twitter', 95, 850, 180, 45, 85, 0.68, 0.12, ARRAY['LA', 'entertainment', 'tech'], ARRAY['Entertainment', 'Technology']),
    ('(-0.1278, 51.5074)', 'London', 12, 1, 15, 1, 2025, 'twitter', 120, 980, 220, 65, 95, 0.75, 0.18, ARRAY['London', 'business', 'culture'], ARRAY['Business', 'Culture']);

INSERT INTO network_performance_analytics (
    coordinates, location_name, network_type, signal_strength, download_speed, upload_speed,
    latency, jitter, device_type, reliability_score, hour_of_day, day_of_week, test_timestamp
) VALUES 
    ('(-74.0060, 40.7128)', 'New York City', '5G', 85.5, 125.3, 45.8, 12.5, 2.1, 'mobile', 0.92, 14, 1, NOW()),
    ('(-118.2437, 34.0522)', 'Los Angeles', '4G', 78.2, 89.7, 32.4, 18.3, 3.2, 'mobile', 0.85, 16, 1, NOW()),
    ('(-0.1278, 51.5074)', 'London', '5G', 92.1, 156.8, 52.3, 8.7, 1.8, 'mobile', 0.95, 12, 1, NOW());

INSERT INTO location_activity_heatmap (
    coordinates, location_name, date, hour, total_interactions, unique_users,
    ai_queries, voice_interactions, text_interactions, avg_session_duration, current_active_users
) VALUES 
    ('(-74.0060, 40.7128)', 'New York City', CURRENT_DATE, 14, 45, 32, 15, 8, 22, 125.5, 12),
    ('(-118.2437, 34.0522)', 'Los Angeles', CURRENT_DATE, 16, 38, 28, 12, 6, 20, 98.3, 9),
    ('(-0.1278, 51.5074)', 'London', CURRENT_DATE, 12, 52, 35, 18, 10, 24, 142.7, 15);

-- Generate initial monetization insights
SELECT generate_monetization_insights('social_trends', 'social_media', 'daily');
SELECT generate_monetization_insights('network_performance', 'telecom', 'daily');
SELECT generate_monetization_insights('ai_usage', 'ai_companies', 'daily');
SELECT generate_monetization_insights('location_popularity', 'real_estate', 'daily');