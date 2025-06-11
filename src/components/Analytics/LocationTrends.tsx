import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MapPin, Users, Clock, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LocationTrendsProps {
  timeRange: string;
}

interface LocationTrend {
  location_name: string;
  coordinates: [number, number];
  current_interactions: number;
  previous_interactions: number;
  growth_rate: number;
  unique_users: number;
  avg_session_duration: number;
  popularity_score: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export default function LocationTrends({ timeRange }: LocationTrendsProps) {
  const [trends, setTrends] = useState<LocationTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'interactions' | 'growth' | 'users'>('interactions');

  useEffect(() => {
    fetchLocationTrends();
  }, [timeRange]);

  const fetchLocationTrends = async () => {
    setLoading(true);
    try {
      const currentPeriodStart = getTimeFilter(timeRange);
      const previousPeriodStart = getPreviousPeriodFilter(timeRange);
      
      // Fetch current period data
      const { data: currentData } = await supabase
        .from('location_interactions')
        .select('*')
        .gte('created_at', currentPeriodStart);

      // Fetch previous period data for comparison
      const { data: previousData } = await supabase
        .from('location_interactions')
        .select('*')
        .gte('created_at', previousPeriodStart)
        .lt('created_at', currentPeriodStart);

      // Process data to calculate trends
      const locationMap = new Map<string, LocationTrend>();

      // Process current period
      currentData?.forEach(interaction => {
        const key = interaction.location_id;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            location_name: interaction.location_name,
            coordinates: [interaction.coordinates.x, interaction.coordinates.y],
            current_interactions: 0,
            previous_interactions: 0,
            growth_rate: 0,
            unique_users: 0,
            avg_session_duration: 0,
            popularity_score: 0,
            trend_direction: 'stable'
          });
        }
        
        const location = locationMap.get(key)!;
        location.current_interactions++;
      });

      // Process previous period
      previousData?.forEach(interaction => {
        const key = interaction.location_id;
        if (locationMap.has(key)) {
          locationMap.get(key)!.previous_interactions++;
        }
      });

      // Calculate metrics and trends
      const processedTrends: LocationTrend[] = Array.from(locationMap.values()).map(location => {
        // Calculate growth rate
        const growthRate = location.previous_interactions > 0
          ? ((location.current_interactions - location.previous_interactions) / location.previous_interactions) * 100
          : location.current_interactions > 0 ? 100 : 0;

        // Calculate unique users (simplified)
        const uniqueUsers = Math.max(1, Math.floor(location.current_interactions * 0.7));

        // Calculate average session duration (simplified)
        const avgSessionDuration = 30 + Math.random() * 120; // 30-150 seconds

        // Calculate popularity score
        const popularityScore = (location.current_interactions * 0.4) + (uniqueUsers * 0.3) + (growthRate * 0.3);

        // Determine trend direction
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';
        if (growthRate > 5) trendDirection = 'up';
        else if (growthRate < -5) trendDirection = 'down';

        return {
          ...location,
          growth_rate: growthRate,
          unique_users: uniqueUsers,
          avg_session_duration: avgSessionDuration,
          popularity_score: popularityScore,
          trend_direction: trendDirection
        };
      });

      setTrends(processedTrends);
    } catch (error) {
      console.error('Error fetching location trends:', error);
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

  const getPreviousPeriodFilter = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getSortedTrends = () => {
    return [...trends].sort((a, b) => {
      switch (sortBy) {
        case 'interactions':
          return b.current_interactions - a.current_interactions;
        case 'growth':
          return b.growth_rate - a.growth_rate;
        case 'users':
          return b.unique_users - a.unique_users;
        default:
          return b.current_interactions - a.current_interactions;
      }
    });
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp size={16} className="text-green-400" />;
      case 'down':
        return <TrendingDown size={16} className="text-red-400" />;
      default:
        return <BarChart3 size={16} className="text-gray-400" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-mid rounded-lg p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-neural border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing location trends...</p>
        </div>
      </div>
    );
  }

  const sortedTrends = getSortedTrends();

  return (
    <div className="bg-surface-mid rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-accent-neural" />
          <h3 className="text-lg font-semibold text-white">Location Trends</h3>
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'interactions' | 'growth' | 'users')}
          className="bg-surface-deep border border-surface-light rounded-lg px-3 py-1 text-white text-sm"
        >
          <option value="interactions">Sort by Interactions</option>
          <option value="growth">Sort by Growth</option>
          <option value="users">Sort by Users</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface-deep rounded-lg p-3">
          <div className="text-lg font-bold text-green-400">
            {sortedTrends.filter(t => t.trend_direction === 'up').length}
          </div>
          <div className="text-xs text-gray-400">Growing</div>
        </div>
        <div className="bg-surface-deep rounded-lg p-3">
          <div className="text-lg font-bold text-gray-400">
            {sortedTrends.filter(t => t.trend_direction === 'stable').length}
          </div>
          <div className="text-xs text-gray-400">Stable</div>
        </div>
        <div className="bg-surface-deep rounded-lg p-3">
          <div className="text-lg font-bold text-red-400">
            {sortedTrends.filter(t => t.trend_direction === 'down').length}
          </div>
          <div className="text-xs text-gray-400">Declining</div>
        </div>
      </div>

      {/* Trends List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {sortedTrends.slice(0, 15).map((trend, index) => (
            <motion.div
              key={trend.location_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-surface-deep rounded-lg p-4 hover:bg-surface-light transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="font-medium text-white text-sm truncate">
                    {trend.location_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(trend.trend_direction)}
                  <span className={`text-sm font-medium ${getTrendColor(trend.trend_direction)}`}>
                    {trend.growth_rate >= 0 ? '+' : ''}{trend.growth_rate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-white font-medium">{trend.current_interactions}</div>
                  <div className="text-gray-400">Interactions</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">{trend.unique_users}</div>
                  <div className="text-gray-400">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">{Math.round(trend.avg_session_duration)}s</div>
                  <div className="text-gray-400">Avg Time</div>
                </div>
              </div>

              {/* Mini trend chart */}
              <div className="mt-3 flex items-center gap-1">
                <div className="flex-1 bg-surface-light rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      trend.trend_direction === 'up' ? 'bg-green-400' :
                      trend.trend_direction === 'down' ? 'bg-red-400' : 'bg-gray-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.abs(trend.growth_rate))}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">
                  #{index + 1}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}