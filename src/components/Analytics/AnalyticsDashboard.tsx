import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe, 
  Wifi, 
  MessageCircle, 
  Calendar,
  Download,
  RefreshCw,
  X,
  Filter,
  Eye,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InteractionHeatmap from './InteractionHeatmap';
import LocationTrends from './LocationTrends';
import NetworkPerformanceChart from './NetworkPerformanceChart';
import SentimentMap from './SentimentMap';
import UserEngagementMetrics from './UserEngagementMetrics';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OverviewStats {
  totalInteractions: number;
  uniqueLocations: number;
  activeUsers: number;
  avgSpeedTest: number;
  sentimentScore: number;
  growthRate: number;
}

export default function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalInteractions: 0,
    uniqueLocations: 0,
    activeUsers: 0,
    avgSpeedTest: 0,
    sentimentScore: 0.5,
    growthRate: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'locations', label: 'Locations', icon: Globe },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'social', label: 'Social', icon: MessageCircle },
    { id: 'users', label: 'Users', icon: Users }
  ];

  const timeRanges = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchOverviewStats();
    }
  }, [isOpen, timeRange]);

  const fetchOverviewStats = async () => {
    setLoading(true);
    try {
      const timeFilter = getTimeFilter(timeRange);
      
      // Fetch data from multiple tables
      const [interactions, locations, networkTests, twitterData] = await Promise.all([
        supabase
          .from('location_interactions')
          .select('*')
          .gte('created_at', timeFilter),
        
        supabase
          .from('location_memories')
          .select('*'),
        
        supabase
          .from('network_analytics')
          .select('download_speed')
          .gte('created_at', timeFilter),
        
        supabase
          .from('twitter_analytics')
          .select('sentiment_score')
          .gte('created_at', timeFilter)
      ]);

      const stats: OverviewStats = {
        totalInteractions: interactions.data?.length || 0,
        uniqueLocations: new Set(interactions.data?.map(i => i.location_id)).size || 0,
        activeUsers: new Set(interactions.data?.map(i => i.user_id).filter(Boolean)).size || 0,
        avgSpeedTest: networkTests.data?.length ? 
          networkTests.data.reduce((sum, test) => sum + test.download_speed, 0) / networkTests.data.length : 0,
        sentimentScore: twitterData.data?.length ?
          twitterData.data.reduce((sum, tweet) => sum + tweet.sentiment_score, 0) / twitterData.data.length : 0.5,
        growthRate: calculateGrowthRate(interactions.data || [])
      };

      setOverviewStats(stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  const calculateGrowthRate = (interactions: any[]): number => {
    if (interactions.length < 2) return 0;
    
    const now = new Date();
    const halfPeriod = new Date(now.getTime() - (getTimePeriodMs(timeRange) / 2));
    
    const recentCount = interactions.filter(i => new Date(i.created_at) >= halfPeriod).length;
    const olderCount = interactions.length - recentCount;
    
    if (olderCount === 0) return 100;
    return ((recentCount - olderCount) / olderCount) * 100;
  };

  const getTimePeriodMs = (range: string): number => {
    switch (range) {
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const exportData = async () => {
    try {
      const data = {
        overview: overviewStats,
        timeRange,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cellular-analytics-${timeRange}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-light">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-neural/20 rounded-lg">
              <BarChart3 className="text-accent-neural" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
              <p className="text-gray-400">Comprehensive insights into Earth's neural network</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-surface-mid border border-surface-light rounded-lg px-3 py-2 text-white text-sm"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            
            {/* Export Button */}
            <button
              onClick={exportData}
              className="p-2 text-gray-400 hover:text-accent-neural transition-colors"
              title="Export Data"
            >
              <Download size={20} />
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={fetchOverviewStats}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-accent-neural transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-light">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-accent-neural border-b-2 border-accent-neural bg-accent-neural/5'
                  : 'text-gray-400 hover:text-white hover:bg-surface-mid'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 h-full overflow-y-auto"
              >
                {/* Overview Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-surface-mid rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap size={20} className="text-accent-neural" />
                      <h3 className="text-lg font-semibold text-white">Total Interactions</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {formatNumber(overviewStats.totalInteractions)}
                    </div>
                    <div className={`text-sm flex items-center gap-1 ${
                      overviewStats.growthRate >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <TrendingUp size={14} />
                      {overviewStats.growthRate >= 0 ? '+' : ''}{overviewStats.growthRate.toFixed(1)}% growth
                    </div>
                  </div>

                  <div className="bg-surface-mid rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe size={20} className="text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Active Locations</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {formatNumber(overviewStats.uniqueLocations)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Unique locations with activity
                    </div>
                  </div>

                  <div className="bg-surface-mid rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Users size={20} className="text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">Active Users</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {formatNumber(overviewStats.activeUsers)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Users with interactions
                    </div>
                  </div>

                  <div className="bg-surface-mid rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Wifi size={20} className="text-green-400" />
                      <h3 className="text-lg font-semibold text-white">Avg Speed</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {overviewStats.avgSpeedTest.toFixed(1)} Mbps
                    </div>
                    <div className="text-sm text-gray-400">
                      Network performance
                    </div>
                  </div>

                  <div className="bg-surface-mid rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageCircle size={20} className="text-yellow-400" />
                      <h3 className="text-lg font-semibold text-white">Sentiment</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {(overviewStats.sentimentScore * 100).toFixed(0)}%
                    </div>
                    <div className={`text-sm ${
                      overviewStats.sentimentScore >= 0.6 ? 'text-green-400' : 
                      overviewStats.sentimentScore >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {overviewStats.sentimentScore >= 0.6 ? 'Positive' : 
                       overviewStats.sentimentScore >= 0.4 ? 'Neutral' : 'Negative'} mood
                    </div>
                  </div>

                  <div className="bg-surface-mid rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Eye size={20} className="text-cyan-400" />
                      <h3 className="text-lg font-semibold text-white">Last Update</h3>
                    </div>
                    <div className="text-lg font-bold text-white mb-2">
                      {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Data freshness
                    </div>
                  </div>
                </div>

                {/* Quick Insights */}
                <div className="bg-surface-mid rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="text-gray-300">
                      • Most active time period shows {overviewStats.growthRate >= 0 ? 'growth' : 'decline'} in user engagement
                    </div>
                    <div className="text-gray-300">
                      • Network performance averaging {overviewStats.avgSpeedTest.toFixed(1)} Mbps across all tests
                    </div>
                    <div className="text-gray-300">
                      • Social sentiment is {overviewStats.sentimentScore >= 0.6 ? 'positive' : overviewStats.sentimentScore >= 0.4 ? 'neutral' : 'negative'} across monitored locations
                    </div>
                    <div className="text-gray-300">
                      • {overviewStats.uniqueLocations} unique locations have been activated by users
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'locations' && (
              <motion.div
                key="locations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full">
                  <InteractionHeatmap timeRange={timeRange} />
                  <LocationTrends timeRange={timeRange} />
                </div>
              </motion.div>
            )}

            {activeTab === 'network' && (
              <motion.div
                key="network"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <NetworkPerformanceChart timeRange={timeRange} />
              </motion.div>
            )}

            {activeTab === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <SentimentMap timeRange={timeRange} />
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <UserEngagementMetrics timeRange={timeRange} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}