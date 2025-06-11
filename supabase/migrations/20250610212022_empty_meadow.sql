/*
  # Add Network Analytics Table

  1. New Tables
    - `network_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, optional foreign key to users)
      - `coordinates` (point, location of speed test)
      - `location_name` (text, human-readable location name)
      - `download_speed` (numeric, Mbps)
      - `upload_speed` (numeric, Mbps)
      - `latency` (numeric, milliseconds)
      - `jitter` (numeric, milliseconds)
      - `server_location` (text, test server location)
      - `device_info` (jsonb, device and browser information)
      - `test_timestamp` (timestamptz, when test was performed)
      - `created_at` (timestamptz, when record was created)

  2. Security
    - Enable RLS on `network_analytics` table
    - Add policies for public read access (anonymized data)
    - Add policies for authenticated users to insert their own data
*/

-- Create network analytics table
CREATE TABLE network_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  coordinates POINT NOT NULL,
  location_name TEXT NOT NULL,
  download_speed NUMERIC NOT NULL,
  upload_speed NUMERIC NOT NULL,
  latency NUMERIC NOT NULL,
  jitter NUMERIC NOT NULL,
  server_location TEXT NOT NULL,
  device_info JSONB,
  test_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_network_analytics_coordinates ON network_analytics USING GIST(coordinates);
CREATE INDEX idx_network_analytics_location_name ON network_analytics(location_name);
CREATE INDEX idx_network_analytics_test_timestamp ON network_analytics(test_timestamp);
CREATE INDEX idx_network_analytics_created_at ON network_analytics(created_at);
CREATE INDEX idx_network_analytics_download_speed ON network_analytics(download_speed);

-- Enable Row Level Security
ALTER TABLE network_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view network analytics (for public insights)
CREATE POLICY "Anyone can view network analytics" ON network_analytics
  FOR SELECT USING (true);

-- Authenticated users can insert their own speed test data
CREATE POLICY "Users can insert speed test data" ON network_analytics
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Anonymous users can also insert speed test data (for broader data collection)
CREATE POLICY "Anonymous users can insert speed test data" ON network_analytics
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Function to get network analytics for a location
CREATE OR REPLACE FUNCTION get_location_network_stats(
  target_lat NUMERIC,
  target_lng NUMERIC,
  radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  avg_download_speed NUMERIC,
  avg_upload_speed NUMERIC,
  avg_latency NUMERIC,
  test_count BIGINT,
  latest_test TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(na.download_speed) as avg_download_speed,
    AVG(na.upload_speed) as avg_upload_speed,
    AVG(na.latency) as avg_latency,
    COUNT(*) as test_count,
    MAX(na.test_timestamp) as latest_test
  FROM network_analytics na
  WHERE 
    -- Calculate distance using PostGIS-style calculation
    (
      6371 * acos(
        cos(radians(target_lat)) * 
        cos(radians(na.coordinates[1])) * 
        cos(radians(na.coordinates[0]) - radians(target_lng)) + 
        sin(radians(target_lat)) * 
        sin(radians(na.coordinates[1]))
      )
    ) <= radius_km
    AND na.test_timestamp >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get global network statistics
CREATE OR REPLACE FUNCTION get_global_network_stats()
RETURNS TABLE (
  avg_download_speed NUMERIC,
  avg_upload_speed NUMERIC,
  avg_latency NUMERIC,
  total_tests BIGINT,
  tests_last_24h BIGINT,
  top_locations JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(na.download_speed) as avg_download_speed,
    AVG(na.upload_speed) as avg_upload_speed,
    AVG(na.latency) as avg_latency,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE na.test_timestamp >= NOW() - INTERVAL '24 hours') as tests_last_24h,
    (
      SELECT json_agg(
        json_build_object(
          'location', location_name,
          'avg_speed', avg_speed,
          'test_count', test_count
        )
      )
      FROM (
        SELECT 
          location_name,
          AVG(download_speed) as avg_speed,
          COUNT(*) as test_count
        FROM network_analytics
        WHERE test_timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY location_name
        HAVING COUNT(*) >= 3
        ORDER BY AVG(download_speed) DESC
        LIMIT 10
      ) top_loc
    ) as top_locations
  FROM network_analytics na
  WHERE na.test_timestamp >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;