/*
  # Add Twitter Analytics Table

  1. New Tables
    - `twitter_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, optional foreign key to users)
      - `coordinates` (point, location of tweets)
      - `location_name` (text, human-readable location name)
      - `tweet_id` (text, Twitter tweet ID)
      - `tweet_text` (text, tweet content)
      - `author_id` (text, Twitter user ID)
      - `author_username` (text, Twitter username)
      - `sentiment_score` (numeric, calculated sentiment)
      - `engagement_metrics` (jsonb, likes, retweets, etc.)
      - `hashtags` (text[], extracted hashtags)
      - `mentions` (text[], extracted mentions)
      - `tweet_timestamp` (timestamptz, when tweet was posted)
      - `created_at` (timestamptz, when record was created)

  2. Security
    - Enable RLS on `twitter_analytics` table
    - Add policies for public read access (anonymized data)
    - Add policies for authenticated users to insert data
*/

-- Create twitter analytics table
CREATE TABLE twitter_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  coordinates POINT NOT NULL,
  location_name TEXT NOT NULL,
  tweet_id TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_username TEXT NOT NULL,
  sentiment_score NUMERIC DEFAULT 0.5,
  engagement_metrics JSONB DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  tweet_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_twitter_analytics_coordinates ON twitter_analytics USING GIST(coordinates);
CREATE INDEX idx_twitter_analytics_location_name ON twitter_analytics(location_name);
CREATE INDEX idx_twitter_analytics_tweet_timestamp ON twitter_analytics(tweet_timestamp);
CREATE INDEX idx_twitter_analytics_created_at ON twitter_analytics(created_at);
CREATE INDEX idx_twitter_analytics_sentiment ON twitter_analytics(sentiment_score);
CREATE INDEX idx_twitter_analytics_hashtags ON twitter_analytics USING GIN(hashtags);

-- Enable Row Level Security
ALTER TABLE twitter_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view twitter analytics (for public insights)
CREATE POLICY "Anyone can view twitter analytics" ON twitter_analytics
  FOR SELECT USING (true);

-- Authenticated users can insert twitter data
CREATE POLICY "Users can insert twitter data" ON twitter_analytics
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Anonymous users can also insert twitter data (for broader data collection)
CREATE POLICY "Anonymous users can insert twitter data" ON twitter_analytics
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Function to get twitter analytics for a location
CREATE OR REPLACE FUNCTION get_location_twitter_stats(
  target_lat NUMERIC,
  target_lng NUMERIC,
  radius_km NUMERIC DEFAULT 25
)
RETURNS TABLE (
  avg_sentiment NUMERIC,
  total_tweets BIGINT,
  top_hashtags TEXT[],
  latest_tweet TIMESTAMPTZ,
  engagement_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(ta.sentiment_score) as avg_sentiment,
    COUNT(*) as total_tweets,
    ARRAY(
      SELECT DISTINCT unnest(ta.hashtags) 
      FROM twitter_analytics ta 
      WHERE (
        6371 * acos(
          cos(radians(target_lat)) * 
          cos(radians(ta.coordinates[1])) * 
          cos(radians(ta.coordinates[0]) - radians(target_lng)) + 
          sin(radians(target_lat)) * 
          sin(radians(ta.coordinates[1]))
        )
      ) <= radius_km
      AND ta.tweet_timestamp >= NOW() - INTERVAL '7 days'
      LIMIT 10
    ) as top_hashtags,
    MAX(ta.tweet_timestamp) as latest_tweet,
    AVG(
      COALESCE((ta.engagement_metrics->>'like_count')::numeric, 0) + 
      COALESCE((ta.engagement_metrics->>'retweet_count')::numeric, 0)
    ) as engagement_rate
  FROM twitter_analytics ta
  WHERE 
    -- Calculate distance using PostGIS-style calculation
    (
      6371 * acos(
        cos(radians(target_lat)) * 
        cos(radians(ta.coordinates[1])) * 
        cos(radians(ta.coordinates[0]) - radians(target_lng)) + 
        sin(radians(target_lat)) * 
        sin(radians(ta.coordinates[1]))
      )
    ) <= radius_km
    AND ta.tweet_timestamp >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get global twitter statistics
CREATE OR REPLACE FUNCTION get_global_twitter_stats()
RETURNS TABLE (
  avg_sentiment NUMERIC,
  total_tweets BIGINT,
  tweets_last_24h BIGINT,
  top_hashtags JSON,
  trending_locations JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(ta.sentiment_score) as avg_sentiment,
    COUNT(*) as total_tweets,
    COUNT(*) FILTER (WHERE ta.tweet_timestamp >= NOW() - INTERVAL '24 hours') as tweets_last_24h,
    (
      SELECT json_agg(
        json_build_object(
          'hashtag', hashtag,
          'count', count
        )
      )
      FROM (
        SELECT 
          unnest(hashtags) as hashtag,
          COUNT(*) as count
        FROM twitter_analytics
        WHERE tweet_timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY unnest(hashtags)
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) top_tags
    ) as top_hashtags,
    (
      SELECT json_agg(
        json_build_object(
          'location', location_name,
          'avg_sentiment', avg_sentiment,
          'tweet_count', tweet_count
        )
      )
      FROM (
        SELECT 
          location_name,
          AVG(sentiment_score) as avg_sentiment,
          COUNT(*) as tweet_count
        FROM twitter_analytics
        WHERE tweet_timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY location_name
        HAVING COUNT(*) >= 5
        ORDER BY AVG(sentiment_score) DESC
        LIMIT 10
      ) trending_loc
    ) as trending_locations
  FROM twitter_analytics ta
  WHERE ta.tweet_timestamp >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;