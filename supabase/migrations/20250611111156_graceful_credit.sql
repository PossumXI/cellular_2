-- Create analytics summary view for performance
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
  created_at::date as date,
  COUNT(*) as total_interactions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT location_id) as unique_locations,
  AVG(duration_seconds) as avg_duration,
  COUNT(*) FILTER (WHERE interaction_type = 'voice') as voice_interactions,
  COUNT(*) FILTER (WHERE interaction_type = 'text') as text_interactions
FROM location_interactions
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY created_at::date
ORDER BY created_at::date DESC;

-- Create location popularity view (fixed point type issue)
CREATE OR REPLACE VIEW location_popularity AS
SELECT 
  location_name,
  location_id,
  coordinates[0] as longitude,
  coordinates[1] as latitude,
  COUNT(*) as interaction_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(duration_seconds) as avg_session_duration,
  MAX(created_at) as last_interaction,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_interactions
FROM location_interactions
GROUP BY location_name, location_id, coordinates[0], coordinates[1]
ORDER BY interaction_count DESC;

-- Enhanced function for user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
  time_range TEXT DEFAULT '7d'
)
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  new_users BIGINT,
  avg_session_duration NUMERIC,
  total_interactions BIGINT,
  interactions_per_user NUMERIC,
  retention_rate NUMERIC
) AS $$
DECLARE
  start_date TIMESTAMPTZ;
  previous_start_date TIMESTAMPTZ;
BEGIN
  -- Calculate date ranges
  CASE time_range
    WHEN '24h' THEN 
      start_date := NOW() - INTERVAL '24 hours';
      previous_start_date := NOW() - INTERVAL '48 hours';
    WHEN '7d' THEN 
      start_date := NOW() - INTERVAL '7 days';
      previous_start_date := NOW() - INTERVAL '14 days';
    WHEN '30d' THEN 
      start_date := NOW() - INTERVAL '30 days';
      previous_start_date := NOW() - INTERVAL '60 days';
    WHEN '90d' THEN 
      start_date := NOW() - INTERVAL '90 days';
      previous_start_date := NOW() - INTERVAL '180 days';
    ELSE 
      start_date := NOW() - INTERVAL '7 days';
      previous_start_date := NOW() - INTERVAL '14 days';
  END CASE;

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT li.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN u.created_at >= start_date THEN u.id END) as new_users,
      AVG(li.duration_seconds) as avg_duration,
      COUNT(li.*) as total_interactions
    FROM users u
    LEFT JOIN location_interactions li ON u.id = li.user_id AND li.created_at >= start_date
    WHERE u.created_at <= NOW()
  )
  SELECT 
    cp.total_users,
    cp.active_users,
    cp.new_users,
    COALESCE(cp.avg_duration, 0) as avg_session_duration,
    cp.total_interactions,
    CASE WHEN cp.active_users > 0 THEN cp.total_interactions::NUMERIC / cp.active_users ELSE 0 END as interactions_per_user,
    CASE WHEN cp.total_users > 0 THEN (cp.active_users::NUMERIC / cp.total_users) * 100 ELSE 0 END as retention_rate
  FROM current_period cp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for location analytics with trends (fixed point type issue)
CREATE OR REPLACE FUNCTION get_location_analytics(
  time_range TEXT DEFAULT '7d',
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  location_name TEXT,
  location_id TEXT,
  longitude NUMERIC,
  latitude NUMERIC,
  current_interactions BIGINT,
  previous_interactions BIGINT,
  growth_rate NUMERIC,
  unique_users BIGINT,
  avg_session_duration NUMERIC,
  last_interaction TIMESTAMPTZ
) AS $$
DECLARE
  start_date TIMESTAMPTZ;
  previous_start_date TIMESTAMPTZ;
BEGIN
  -- Calculate date ranges
  CASE time_range
    WHEN '24h' THEN 
      start_date := NOW() - INTERVAL '24 hours';
      previous_start_date := NOW() - INTERVAL '48 hours';
    WHEN '7d' THEN 
      start_date := NOW() - INTERVAL '7 days';
      previous_start_date := NOW() - INTERVAL '14 days';
    WHEN '30d' THEN 
      start_date := NOW() - INTERVAL '30 days';
      previous_start_date := NOW() - INTERVAL '60 days';
    WHEN '90d' THEN 
      start_date := NOW() - INTERVAL '90 days';
      previous_start_date := NOW() - INTERVAL '180 days';
    ELSE 
      start_date := NOW() - INTERVAL '7 days';
      previous_start_date := NOW() - INTERVAL '14 days';
  END CASE;

  RETURN QUERY
  WITH current_data AS (
    SELECT 
      li.location_name,
      li.location_id,
      li.coordinates[0] as longitude,
      li.coordinates[1] as latitude,
      COUNT(*) as current_count,
      COUNT(DISTINCT li.user_id) as unique_users,
      AVG(li.duration_seconds) as avg_duration,
      MAX(li.created_at) as last_interaction
    FROM location_interactions li
    WHERE li.created_at >= start_date
    GROUP BY li.location_name, li.location_id, li.coordinates[0], li.coordinates[1]
  ),
  previous_data AS (
    SELECT 
      li.location_id,
      COUNT(*) as previous_count
    FROM location_interactions li
    WHERE li.created_at >= previous_start_date AND li.created_at < start_date
    GROUP BY li.location_id
  )
  SELECT 
    cd.location_name,
    cd.location_id,
    cd.longitude,
    cd.latitude,
    cd.current_count as current_interactions,
    COALESCE(pd.previous_count, 0) as previous_interactions,
    CASE 
      WHEN COALESCE(pd.previous_count, 0) > 0 
      THEN ((cd.current_count - COALESCE(pd.previous_count, 0))::NUMERIC / pd.previous_count) * 100
      ELSE CASE WHEN cd.current_count > 0 THEN 100 ELSE 0 END
    END as growth_rate,
    cd.unique_users,
    COALESCE(cd.avg_duration, 0) as avg_session_duration,
    cd.last_interaction
  FROM current_data cd
  LEFT JOIN previous_data pd ON cd.location_id = pd.location_id
  ORDER BY cd.current_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for real-time dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  time_range TEXT DEFAULT '7d'
)
RETURNS TABLE (
  total_interactions BIGINT,
  unique_locations BIGINT,
  active_users BIGINT,
  avg_speed_test NUMERIC,
  sentiment_score NUMERIC,
  growth_rate NUMERIC
) AS $$
DECLARE
  start_date TIMESTAMPTZ;
  previous_start_date TIMESTAMPTZ;
BEGIN
  -- Calculate date ranges
  CASE time_range
    WHEN '24h' THEN 
      start_date := NOW() - INTERVAL '24 hours';
      previous_start_date := NOW() - INTERVAL '48 hours';
    WHEN '7d' THEN 
      start_date := NOW() - INTERVAL '7 days';
      previous_start_date := NOW() - INTERVAL '14 days';
    WHEN '30d' THEN 
      start_date := NOW() - INTERVAL '30 days';
      previous_start_date := NOW() - INTERVAL '60 days';
    WHEN '90d' THEN 
      start_date := NOW() - INTERVAL '90 days';
      previous_start_date := NOW() - INTERVAL '180 days';
    ELSE 
      start_date := NOW() - INTERVAL '7 days';
      previous_start_date := NOW() - INTERVAL '14 days';
  END CASE;

  RETURN QUERY
  WITH current_stats AS (
    SELECT 
      COUNT(li.*) as current_interactions,
      COUNT(DISTINCT li.location_id) as unique_locations,
      COUNT(DISTINCT li.user_id) as active_users
    FROM location_interactions li
    WHERE li.created_at >= start_date
  ),
  previous_stats AS (
    SELECT 
      COUNT(li.*) as previous_interactions
    FROM location_interactions li
    WHERE li.created_at >= previous_start_date AND li.created_at < start_date
  ),
  network_stats AS (
    SELECT 
      AVG(na.download_speed) as avg_download
    FROM network_analytics na
    WHERE na.created_at >= start_date
  ),
  sentiment_stats AS (
    SELECT 
      AVG(ta.sentiment_score) as avg_sentiment
    FROM twitter_analytics ta
    WHERE ta.created_at >= start_date
  )
  SELECT 
    cs.current_interactions as total_interactions,
    cs.unique_locations,
    cs.active_users,
    COALESCE(ns.avg_download, 0) as avg_speed_test,
    COALESCE(ss.avg_sentiment, 0.5) as sentiment_score,
    CASE 
      WHEN ps.previous_interactions > 0 
      THEN ((cs.current_interactions - ps.previous_interactions)::NUMERIC / ps.previous_interactions) * 100
      ELSE CASE WHEN cs.current_interactions > 0 THEN 100 ELSE 0 END
    END as growth_rate
  FROM current_stats cs
  CROSS JOIN previous_stats ps
  CROSS JOIN network_stats ns
  CROSS JOIN sentiment_stats ss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get location coordinates as separate values
CREATE OR REPLACE FUNCTION get_location_coordinates(
  location_id_param TEXT
)
RETURNS TABLE (
  longitude NUMERIC,
  latitude NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coordinates[0] as longitude,
    coordinates[1] as latitude
  FROM location_interactions
  WHERE location_id = location_id_param
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for analytics export
CREATE OR REPLACE FUNCTION export_analytics_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  data_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  export_type TEXT,
  data_json JSONB
) AS $$
BEGIN
  IF data_type = 'interactions' OR data_type = 'all' THEN
    RETURN QUERY
    SELECT 
      'interactions'::TEXT as export_type,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'user_id', user_id,
          'location_id', location_id,
          'location_name', location_name,
          'interaction_type', interaction_type,
          'duration_seconds', duration_seconds,
          'created_at', created_at
        )
      ) as data_json
    FROM location_interactions
    WHERE created_at BETWEEN start_date AND end_date;
  END IF;

  IF data_type = 'network' OR data_type = 'all' THEN
    RETURN QUERY
    SELECT 
      'network_analytics'::TEXT as export_type,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'location_name', location_name,
          'download_speed', download_speed,
          'upload_speed', upload_speed,
          'latency', latency,
          'test_timestamp', test_timestamp
        )
      ) as data_json
    FROM network_analytics
    WHERE created_at BETWEEN start_date AND end_date;
  END IF;

  IF data_type = 'social' OR data_type = 'all' THEN
    RETURN QUERY
    SELECT 
      'twitter_analytics'::TEXT as export_type,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'location_name', location_name,
          'sentiment_score', sentiment_score,
          'hashtags', hashtags,
          'tweet_timestamp', tweet_timestamp
        )
      ) as data_json
    FROM twitter_analytics
    WHERE created_at BETWEEN start_date AND end_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic indexes for analytics performance (avoiding DATE() function)
CREATE INDEX IF NOT EXISTS idx_location_interactions_created_date ON location_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_location_interactions_user_created ON location_interactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_location_interactions_location_created ON location_interactions(location_id, created_at);
CREATE INDEX IF NOT EXISTS idx_location_interactions_coordinates ON location_interactions USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_network_analytics_created_speed ON network_analytics(created_at, download_speed);
CREATE INDEX IF NOT EXISTS idx_twitter_analytics_created_sentiment ON twitter_analytics(created_at, sentiment_score);

-- Composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_location_interactions_composite ON location_interactions(location_id, created_at, user_id);
CREATE INDEX IF NOT EXISTS idx_network_analytics_composite ON network_analytics(location_name, created_at, download_speed);
CREATE INDEX IF NOT EXISTS idx_twitter_analytics_composite ON twitter_analytics(location_name, created_at, sentiment_score);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_location_interactions_type_created ON location_interactions(interaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_network_analytics_location_created ON network_analytics(location_name, created_at);
CREATE INDEX IF NOT EXISTS idx_twitter_analytics_location_created ON twitter_analytics(location_name, created_at);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_analytics(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_coordinates(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION export_analytics_data(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- Grant select permissions on views
GRANT SELECT ON analytics_summary TO authenticated;
GRANT SELECT ON location_popularity TO authenticated;

-- Create analytics configuration table
CREATE TABLE IF NOT EXISTS analytics_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default analytics configuration
INSERT INTO analytics_config (config_key, config_value, description) VALUES
('dashboard_refresh_interval', '30', 'Dashboard refresh interval in seconds'),
('data_retention_days', '365', 'Number of days to retain analytics data'),
('export_batch_size', '1000', 'Batch size for data exports'),
('performance_thresholds', '{"slow_query_ms": 1000, "high_memory_mb": 512}', 'Performance monitoring thresholds')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS on analytics config
ALTER TABLE analytics_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read analytics config
CREATE POLICY "Authenticated users can read analytics config" ON analytics_config
  FOR SELECT TO authenticated USING (true);

-- Create analytics cache table for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on cache table
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_created ON analytics_cache(created_at);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or set cache
CREATE OR REPLACE FUNCTION get_analytics_cache(
  cache_key_param TEXT
)
RETURNS JSONB AS $$
DECLARE
  cache_result JSONB;
BEGIN
  SELECT cache_data INTO cache_result
  FROM analytics_cache
  WHERE cache_key = cache_key_param AND expires_at > NOW();
  
  RETURN cache_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set cache
CREATE OR REPLACE FUNCTION set_analytics_cache(
  cache_key_param TEXT,
  cache_data_param JSONB,
  ttl_seconds INTEGER DEFAULT 300
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO analytics_cache (cache_key, cache_data, expires_at)
  VALUES (cache_key_param, cache_data_param, NOW() + (ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (cache_key) 
  DO UPDATE SET 
    cache_data = cache_data_param,
    expires_at = NOW() + (ttl_seconds || ' seconds')::INTERVAL,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for cache management
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_cache TO authenticated;
GRANT EXECUTE ON FUNCTION clean_analytics_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_cache(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_analytics_cache(TEXT, JSONB, INTEGER) TO authenticated;

-- Create trigger to update analytics config updated_at
CREATE OR REPLACE FUNCTION update_analytics_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_config_updated_at
  BEFORE UPDATE ON analytics_config
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_config_updated_at();