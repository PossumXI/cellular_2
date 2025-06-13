import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, TrendingUp, Hash, Heart, Users, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SentimentMapProps {
  timeRange: string;
}

interface LocationSentiment {
  location_name: string;
  coordinates: [number, number];
  avg_sentiment: number;
  tweet_count: number;
  engagement_rate: number;
  top_hashtags: string[];
  sentiment_trend: 'improving' | 'declining' | 'stable';
  mood_label: string;
}

interface GlobalSentiment {
  overall_sentiment: number;
  total_tweets: number;
  trending_hashtags: { hashtag: string; count: number }[];
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export default function SentimentMap({ timeRange }: SentimentMapProps) {
  const [locationSentiments, setLocationSentiments] = useState<LocationSentiment[]>([]);
  const [globalSentiment, setGlobalSentiment] = useState<GlobalSentiment>({
    overall_sentiment: 0.5,
    total_tweets: 0,
    trending_hashtags: [],
    sentiment_distribution: { positive: 0, neutral: 0, negative: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSentimentData();
  }, [timeRange]);

  const fetchSentimentData = async () => {
    setLoading(true);
    try {
      const timeFilter = getTimeFilter(timeRange);
      
      // Fetch Twitter analytics data
      const { data: twitterData, error } = await supabase
        .from('twitter_analytics')
        .select('*')
        .gte('created_at', timeFilter);

      if (error) throw error;

      if (twitterData && twitterData.length > 0) {
        // Calculate global sentiment
        const totalTweets = twitterData.length;
        const overallSentiment = twitterData.reduce((sum, tweet) => sum + tweet.sentiment_score, 0) / totalTweets;
        
        // Calculate sentiment distribution
        const positive = twitterData.filter(tweet => tweet.sentiment_score >= 0.6).length;
        const negative = twitterData.filter(tweet => tweet.sentiment_score <= 0.4).length;
        const neutral = totalTweets - positive - negative;

        // Extract trending hashtags
        const hashtagMap = new Map<string, number>();
        twitterData.forEach(tweet => {
          tweet.hashtags?.forEach((hashtag: string) => {
            hashtagMap.set(hashtag, (hashtagMap.get(hashtag) || 0) + 1);
          });
        });

        const trendingHashtags = Array.from(hashtagMap.entries())
          .map(([hashtag, count]) => ({ hashtag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setGlobalSentiment({
          overall_sentiment: overallSentiment,
          total_tweets: totalTweets,
          trending_hashtags: trendingHashtags,
          sentiment_distribution: {
            positive: (positive / totalTweets) * 100,
            neutral: (neutral / totalTweets) * 100,
            negative: (negative / totalTweets) * 100
          }
        });

        // Group by location
        const locationMap = new Map<string, {
          name: string;
          coordinates: [number, number];
          tweets: any[];
        }>();

        twitterData.forEach(tweet => {
          const key = tweet.location_name;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              name: tweet.location_name,
              coordinates: [tweet.coordinates.x, tweet.coordinates.y],
              tweets: []
            });
          }
          locationMap.get(key)!.tweets.push(tweet);
        });

        // Calculate sentiment per location
        const locationSentiments: LocationSentiment[] = Array.from(locationMap.entries()).map(([key, data]) => {
          const tweets = data.tweets;
          const avgSentiment = tweets.reduce((sum, tweet) => sum + tweet.sentiment_score, 0) / tweets.length;
          
          // Calculate engagement rate
          const totalEngagement = tweets.reduce((sum, tweet) => {
            const metrics = tweet.engagement_metrics || {};
            return sum + (metrics.like_count || 0) + (metrics.retweet_count || 0);
          }, 0);
          const engagementRate = totalEngagement / tweets.length;

          // Extract top hashtags for this location
          const locationHashtags = new Map<string, number>();
          tweets.forEach(tweet => {
            tweet.hashtags?.forEach((hashtag: string) => {
              locationHashtags.set(hashtag, (locationHashtags.get(hashtag) || 0) + 1);
            });
          });

          const topHashtags = Array.from(locationHashtags.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hashtag]) => hashtag);

          // Determine sentiment trend (simplified)
          let sentimentTrend: 'improving' | 'declining' | 'stable' = 'stable';
          if (tweets.length >= 4) {
            const firstHalf = tweets.slice(0, Math.floor(tweets.length / 2));
            const secondHalf = tweets.slice(Math.floor(tweets.length / 2));
            
            const firstAvg = firstHalf.reduce((sum, tweet) => sum + tweet.sentiment_score, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, tweet) => sum + tweet.sentiment_score, 0) / secondHalf.length;
            
            const change = secondAvg - firstAvg;
            if (change > 0.1) sentimentTrend = 'improving';
            else if (change < -0.1) sentimentTrend = 'declining';
          }

          // Determine mood label
          let moodLabel = 'Neutral';
          if (avgSentiment >= 0.7) moodLabel = 'Very Positive';
          else if (avgSentiment >= 0.6) moodLabel = 'Positive';
          else if (avgSentiment >= 0.4) moodLabel = 'Neutral';
          else if (avgSentiment >= 0.3) moodLabel = 'Negative';
          else moodLabel = 'Very Negative';

          return {
            location_name: data.name,
            coordinates: data.coordinates,
            avg_sentiment: avgSentiment,
            tweet_count: tweets.length,
            engagement_rate: engagementRate,
            top_hashtags: topHashtags,
            sentiment_trend: sentimentTrend,
            mood_label: moodLabel
          };
        }).sort((a, b) => b.avg_sentiment - a.avg_sentiment);

        setLocationSentiments(locationSentiments);
      }
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilter = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return 'text-green-400';
    if (sentiment >= 0.6) return 'text-green-300';
    if (sentiment >= 0.4) return 'text-yellow-400';
    if (sentiment >= 0.3) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSentimentBgColor = (sentiment: number) => {
    if (sentiment >= 0.7) return 'bg-green-400';
    if (sentiment >= 0.6) return 'bg-green-300';
    if (sentiment >= 0.4) return 'bg-yellow-400';
    if (sentiment >= 0.3) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp size={14} className="text-green-400" />;
      case 'declining':
        return <TrendingUp size={14} className="text-red-400 rotate-180" />;
      default:
        return <MessageCircle size={14} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-neural border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing social sentiment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle size={20} className="text-accent-neural" />
        <h3 className="text-lg font-semibold text-white">Social Sentiment Analysis</h3>
      </div>

      {/* Global Sentiment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={16} className="text-purple-400" />
            <span className="text-sm text-gray-400">Overall Sentiment</span>
          </div>
          <div className={`text-2xl font-bold ${getSentimentColor(globalSentiment.overall_sentiment)}`}>
            {(globalSentiment.overall_sentiment * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-400">
            {globalSentiment.overall_sentiment >= 0.6 ? 'Positive' : 
             globalSentiment.overall_sentiment >= 0.4 ? 'Neutral' : 'Negative'}
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-400" />
            <span className="text-sm text-gray-400">Total Tweets</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {globalSentiment.total_tweets}
          </div>
          <div className="text-sm text-gray-400">Analyzed</div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-sm text-gray-400">Positive</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {globalSentiment.sentiment_distribution.positive.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-400">Of all tweets</div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={16} className="text-yellow-400" />
            <span className="text-sm text-gray-400">Trending</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {globalSentiment.trending_hashtags.length}
          </div>
          <div className="text-sm text-gray-400">Hashtags</div>
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="bg-surface-mid rounded-lg p-6 mb-8">
        <h4 className="text-lg font-semibold text-white mb-4">Sentiment Distribution</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-400">Positive</span>
              <span className="text-white">{globalSentiment.sentiment_distribution.positive.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface-deep rounded-full h-3">
              <div
                className="bg-green-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${globalSentiment.sentiment_distribution.positive}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-yellow-400">Neutral</span>
              <span className="text-white">{globalSentiment.sentiment_distribution.neutral.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface-deep rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${globalSentiment.sentiment_distribution.neutral}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-red-400">Negative</span>
              <span className="text-white">{globalSentiment.sentiment_distribution.negative.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface-deep rounded-full h-3">
              <div
                className="bg-red-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${globalSentiment.sentiment_distribution.negative}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trending Hashtags */}
      {globalSentiment.trending_hashtags.length > 0 && (
        <div className="bg-surface-mid rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-white mb-4">Trending Hashtags</h4>
          <div className="flex flex-wrap gap-2">
            {globalSentiment.trending_hashtags.slice(0, 15).map((hashtag, index) => (
              <motion.span
                key={hashtag.hashtag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-surface-deep px-3 py-2 rounded-full text-sm text-accent-neural border border-accent-neural/20 hover:bg-accent-neural/10 transition-colors"
              >
                #{hashtag.hashtag} ({hashtag.count})
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Location Sentiment */}
      <div className="bg-surface-mid rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Location Sentiment Analysis</h4>
        <div className="space-y-4">
          {locationSentiments.slice(0, 10).map((location, index) => (
            <motion.div
              key={location.location_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-surface-deep rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="font-medium text-white">{location.location_name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(location.avg_sentiment)} bg-opacity-20`}>
                    {location.mood_label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(location.sentiment_trend)}
                  <span className={`text-sm ${getSentimentColor(location.avg_sentiment)}`}>
                    {(location.avg_sentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <div>
                  <div className="text-white font-medium">{location.tweet_count}</div>
                  <div className="text-gray-400">Tweets</div>
                </div>
                <div>
                  <div className="text-white font-medium">{location.engagement_rate.toFixed(1)}</div>
                  <div className="text-gray-400">Avg Engagement</div>
                </div>
                <div>
                  <div className="text-white font-medium">{location.top_hashtags.length}</div>
                  <div className="text-gray-400">Hashtags</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="w-full bg-surface-light rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getSentimentBgColor(location.avg_sentiment)}`}
                    style={{ width: `${location.avg_sentiment * 100}%` }}
                  />
                </div>
              </div>

              {location.top_hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {location.top_hashtags.slice(0, 5).map((hashtag, hashIndex) => (
                    <span
                      key={hashIndex}
                      className="text-xs bg-accent-neural/20 text-accent-neural px-2 py-1 rounded"
                    >
                      #{hashtag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}