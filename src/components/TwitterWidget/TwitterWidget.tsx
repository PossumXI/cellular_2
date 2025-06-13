import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Heart, Repeat, Share, Clock, AlertCircle, RefreshCw, TrendingUp, Hash, CheckCircle, Wifi } from 'lucide-react';
import { twitterService, TwitterResponse } from '../../lib/apis/twitter';

interface TwitterWidgetProps {
  coordinates?: [number, number];
  locationName?: string;
  className?: string;
}

export default function TwitterWidget({ coordinates, locationName, className = '' }: TwitterWidgetProps) {
  const [twitterData, setTwitterData] = useState<TwitterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTweets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('🐦 Fetching tweets for location:', locationName, coordinates);
      
      let response: TwitterResponse;
      if (coordinates && locationName) {
        response = await twitterService.getLocationTweets(coordinates[1], coordinates[0], locationName, 25);
      } else {
        response = await twitterService.searchTweets('local community', 10);
      }
      
      setTwitterData(response);
      setLastRefresh(new Date());
      
      console.log('✅ Successfully fetched tweets:', response.tweets.length);
    } catch (err: any) {
      console.error('Error fetching tweets:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coordinates, locationName]);

  const handleRefresh = () => {
    console.log('🔄 Refreshing tweets...');
    fetchTweets(true);
  };

  useEffect(() => {
    fetchTweets(false);
  }, [fetchTweets]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.6) return 'text-green-400';
    if (sentiment >= 0.45) return 'text-yellow-400';
    if (sentiment >= 0.3) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 0.6) return 'Positive';
    if (sentiment >= 0.45) return 'Neutral';
    if (sentiment >= 0.3) return 'Mixed';
    return 'Negative';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading && !twitterData) {
    return (
      <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">𝕏</span>
          </div>
          <span className="text-sm font-medium">Local Tweets</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
            Real Data
          </span>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-surface-light rounded mb-2"></div>
              <div className="h-3 bg-surface-deep rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Wifi size={12} className="animate-pulse" />
            <span>Connecting to X API...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">𝕏</span>
          </div>
          <span className="text-sm font-medium">Local Tweets</span>
          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
            API Error
          </span>
        </div>
        <div className="flex items-start gap-3 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200 text-xs leading-relaxed">{error}</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 mt-2 px-2 py-1 bg-red-500/30 hover:bg-red-500/40 rounded text-red-200 text-xs transition-colors disabled:opacity-50"
              id="retry-tweets"
              name="retry-tweets"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!twitterData || !twitterData.tweets.length) {
    return (
      <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">𝕏</span>
          </div>
          <span className="text-sm font-medium">Local Tweets</span>
          <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full">
            No Data
          </span>
        </div>
        <p className="text-gray-400 text-xs mb-3">No tweets available for this location.</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 mx-auto"
          id="search-tweets-again"
          name="search-tweets-again"
        >
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Searching...' : 'Search Again'}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">𝕏</span>
          </div>
          <span className="text-sm font-medium">Local Tweets</span>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={8} />
            Live Data
          </span>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
          title="Refresh tweets"
          id="refresh-tweets"
          name="refresh-tweets"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {/* Last Refresh Time */}
      {lastRefresh && (
        <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <Clock size={10} />
          <span>Updated {formatTimeAgo(lastRefresh.toISOString())}</span>
        </div>
      )}
      
      {/* Sentiment and Topics Summary */}
      <div className="mb-4 p-3 bg-surface-deep rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Social Sentiment</span>
          <span className={`text-xs font-medium ${getSentimentColor(twitterData.sentiment)}`}>
            {getSentimentLabel(twitterData.sentiment)} ({Math.round(twitterData.sentiment * 100)}%)
          </span>
        </div>
        <div className="w-full bg-surface-light rounded-full h-2 mb-3">
          <motion.div
            className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-1000"
            initial={{ width: 0 }}
            animate={{ width: `${twitterData.sentiment * 100}%` }}
          />
        </div>
        
        {twitterData.topics.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Trending Topics</div>
            <div className="flex flex-wrap gap-1">
              {twitterData.topics.slice(0, 4).map((topic, index) => (
                <motion.span 
                  key={topic}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded flex items-center gap-1"
                >
                  <Hash size={8} />
                  {topic}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Tweets */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {twitterData.tweets.slice(0, 3).map((tweet, index) => {
            const user = twitterData.users.find(u => u.id === tweet.author_id);
            
            return (
              <motion.div
                key={tweet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="group"
                layout
              >
                <div className="p-3 rounded-lg bg-surface-deep hover:bg-surface-light transition-all duration-200 border border-transparent hover:border-blue-500/30">
                  {/* User Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {user?.name.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-white text-xs font-medium truncate">
                          {user?.name || 'Unknown User'}
                        </span>
                        {user?.verified && (
                          <CheckCircle size={12} className="text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-gray-400 text-xs">
                        @{user?.username || 'unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={10} />
                      <span>{formatTimeAgo(tweet.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* Tweet Content */}
                  <p className="text-white text-xs leading-relaxed mb-3 line-clamp-3">
                    {tweet.text}
                  </p>
                  
                  {/* Engagement Metrics */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <motion.div 
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <MessageCircle size={12} />
                      <span>{formatNumber(tweet.public_metrics.reply_count)}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center gap-1 hover:text-green-400 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Repeat size={12} />
                      <span>{formatNumber(tweet.public_metrics.retweet_count)}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Heart size={12} />
                      <span>{formatNumber(tweet.public_metrics.like_count)}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Share size={12} />
                      <span>{formatNumber(tweet.public_metrics.quote_count)}</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-surface-light">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {twitterData.totalResults > 3 ? `Showing 3 of ${twitterData.totalResults}` : `${twitterData.totalResults} tweets`}
          </span>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
            id="refresh-tweets-footer"
            name="refresh-tweets-footer"
          >
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}