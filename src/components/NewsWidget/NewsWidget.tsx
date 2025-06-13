import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Clock, AlertCircle, RefreshCw, TrendingUp, Globe } from 'lucide-react';
import { newsService, NewsResponse } from '../../lib/apis/news';

interface NewsWidgetProps {
  coordinates?: [number, number];
  locationName?: string;
  className?: string;
}

export default function NewsWidget({ coordinates, locationName, className = '' }: NewsWidgetProps) {
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response: NewsResponse;
      if (coordinates && locationName) {
        response = await newsService.getLocationNews(coordinates[1], coordinates[0], locationName, 5);
      } else {
        response = await newsService.getTopHeadlines('us', 5);
      }
      
      setNewsData(response);
    } catch (err: any) {
      console.error('Error fetching news:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchNews();
  };

  useEffect(() => {
    fetchNews();
  }, [coordinates, locationName, retryCount]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
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

  if (loading) {
    return (
      <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Newspaper size={16} className="text-purple-400" />
          <span className="text-sm font-medium">Live News Feed</span>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            Newsdata.io
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
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Newspaper size={16} className="text-purple-400" />
          <span className="text-sm font-medium">Live News Feed</span>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            Newsdata.io
          </span>
        </div>
        <div className="flex items-start gap-3 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200 text-xs leading-relaxed">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 mt-2 px-2 py-1 bg-red-500/30 hover:bg-red-500/40 rounded text-red-200 text-xs transition-colors"
              id="retry-news"
              name="retry-news"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!newsData || !newsData.articles.length) {
    return (
      <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Newspaper size={16} className="text-purple-400" />
          <span className="text-sm font-medium">Live News Feed</span>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            Newsdata.io
          </span>
        </div>
        <p className="text-gray-400 text-xs">No news articles available at the moment.</p>
      </div>
    );
  }

  return (
    <div className={`bg-surface-mid rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={16} className="text-purple-400" />
        <span className="text-sm font-medium">Live News Feed</span>
        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
          Newsdata.io
        </span>
      </div>
      
      {/* Sentiment and Topics Summary */}
      <div className="mb-4 p-3 bg-surface-deep rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">News Sentiment</span>
          <span className={`text-xs font-medium ${getSentimentColor(newsData.sentiment)}`}>
            {getSentimentLabel(newsData.sentiment)} ({Math.round(newsData.sentiment * 100)}%)
          </span>
        </div>
        <div className="w-full bg-surface-light rounded-full h-2 mb-3">
          <div
            className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${newsData.sentiment * 100}%` }}
          />
        </div>
        
        {newsData.topics.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Trending Topics</div>
            <div className="flex flex-wrap gap-1">
              {newsData.topics.slice(0, 4).map((topic, index) => (
                <span key={index} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* News Articles */}
      <div className="space-y-3">
        {newsData.articles.slice(0, 3).map((article, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-surface-deep hover:bg-surface-light transition-all duration-200 border border-transparent hover:border-purple-500/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="text-white font-medium text-xs leading-snug mb-1 group-hover:text-purple-300 transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                  {article.description && (
                    <p className="text-gray-400 text-xs leading-relaxed mb-2 line-clamp-2">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{article.source_name || article.source_id}</span>
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{formatTimeAgo(article.pubDate)}</span>
                    </div>
                    {article.country && article.country[0] && (
                      <div className="flex items-center gap-1">
                        <Globe size={10} />
                        <span>{article.country[0].toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ExternalLink size={12} className="text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </div>
            </a>
          </motion.div>
        ))}
      </div>
      
      {newsData.totalResults > 3 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">
            Showing 3 of {newsData.totalResults} articles
          </span>
        </div>
      )}
      
      <div className="mt-3 text-center">
        <button
          onClick={handleRetry}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 mx-auto"
          id="refresh-news"
          name="refresh-news"
        >
          <RefreshCw size={10} />
          Refresh News
        </button>
      </div>
    </div>
  );
}