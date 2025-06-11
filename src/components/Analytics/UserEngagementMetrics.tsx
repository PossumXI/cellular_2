import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, Activity, UserPlus, Eye, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserEngagementMetricsProps {
  timeRange: string;
}

interface EngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  avgSessionDuration: number;
  totalInteractions: number;
  interactionsPerUser: number;
  retentionRate: number;
  growthRate: number;
}

interface UserActivity {
  date: string;
  new_users: number;
  active_users: number;
  total_interactions: number;
  avg_session_duration: number;
}

interface TopUser {
  user_id: string;
  interaction_count: number;
  unique_locations: number;
  total_duration: number;
  last_active: string;
}

export default function UserEngagementMetrics({ timeRange }: UserEngagementMetricsProps) {
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    avgSessionDuration: 0,
    totalInteractions: 0,
    interactionsPerUser: 0,
    retentionRate: 0,
    growthRate: 0
  });
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementData();
  }, [timeRange]);

  const fetchEngagementData = async () => {
    setLoading(true);
    try {
      const timeFilter = getTimeFilter(timeRange);
      const previousTimeFilter = getPreviousTimeFilter(timeRange);
      
      // Fetch current period data
      const [usersData, interactionsData, previousUsersData] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .gte('created_at', timeFilter),
        
        supabase
          .from('location_interactions')
          .select('*')
          .gte('created_at', timeFilter),
        
        supabase
          .from('users')
          .select('*')
          .gte('created_at', previousTimeFilter)
          .lt('created_at', timeFilter)
      ]);

      const currentUsers = usersData.data || [];
      const interactions = interactionsData.data || [];
      const previousUsers = previousUsersData.data || [];

      // Calculate metrics
      const totalUsers = currentUsers.length;
      const activeUsers = new Set(interactions.map(i => i.user_id).filter(Boolean)).size;
      const newUsers = currentUsers.filter(user => 
        new Date(user.created_at) >= new Date(timeFilter)
      ).length;

      const totalInteractions = interactions.length;
      const interactionsPerUser = activeUsers > 0 ? totalInteractions / activeUsers : 0;

      // Calculate average session duration
      const avgSessionDuration = interactions.reduce((sum, interaction) => 
        sum + (interaction.duration_seconds || 30), 0) / Math.max(interactions.length, 1);

      // Calculate growth rate
      const growthRate = previousUsers.length > 0 
        ? ((currentUsers.length - previousUsers.length) / previousUsers.length) * 100 
        : 100;

      // Calculate retention rate (simplified)
      const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      setMetrics({
        totalUsers,
        activeUsers,
        newUsers,
        avgSessionDuration,
        totalInteractions,
        interactionsPerUser,
        retentionRate,
        growthRate
      });

      // Generate daily activity data
      const activityMap = new Map<string, {
        new_users: Set<string>;
        active_users: Set<string>;
        interactions: any[];
      }>();

      // Process users
      currentUsers.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        if (!activityMap.has(date)) {
          activityMap.set(date, {
            new_users: new Set(),
            active_users: new Set(),
            interactions: []
          });
        }
        activityMap.get(date)!.new_users.add(user.id);
      });

      // Process interactions
      interactions.forEach(interaction => {
        const date = new Date(interaction.created_at).toISOString().split('T')[0];
        if (!activityMap.has(date)) {
          activityMap.set(date, {
            new_users: new Set(),
            active_users: new Set(),
            interactions: []
          });
        }
        const dayData = activityMap.get(date)!;
        if (interaction.user_id) {
          dayData.active_users.add(interaction.user_id);
        }
        dayData.interactions.push(interaction);
      });

      const activity: UserActivity[] = Array.from(activityMap.entries()).map(([date, data]) => ({
        date,
        new_users: data.new_users.size,
        active_users: data.active_users.size,
        total_interactions: data.interactions.length,
        avg_session_duration: data.interactions.reduce((sum, int) => 
          sum + (int.duration_seconds || 30), 0) / Math.max(data.interactions.length, 1)
      })).sort((a, b) => a.date.localeCompare(b.date));

      setUserActivity(activity);

      // Calculate top users
      const userInteractionMap = new Map<string, {
        interactions: any[];
        locations: Set<string>;
      }>();

      interactions.forEach(interaction => {
        if (interaction.user_id) {
          if (!userInteractionMap.has(interaction.user_id)) {
            userInteractionMap.set(interaction.user_id, {
              interactions: [],
              locations: new Set()
            });
          }
          const userData = userInteractionMap.get(interaction.user_id)!;
          userData.interactions.push(interaction);
          userData.locations.add(interaction.location_id);
        }
      });

      const topUsersList: TopUser[] = Array.from(userInteractionMap.entries()).map(([userId, data]) => ({
        user_id: userId,
        interaction_count: data.interactions.length,
        unique_locations: data.locations.size,
        total_duration: data.interactions.reduce((sum, int) => sum + (int.duration_seconds || 30), 0),
        last_active: Math.max(...data.interactions.map(int => new Date(int.created_at).getTime())).toString()
      })).sort((a, b) => b.interaction_count - a.interaction_count).slice(0, 10);

      setTopUsers(topUsersList);

    } catch (error) {
      console.error('Error fetching engagement data:', error);
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

  const getPreviousTimeFilter = (range: string): string => {
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

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatUserId = (userId: string): string => {
    return `User ${userId.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-neural border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading user engagement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Users size={20} className="text-accent-neural" />
        <h3 className="text-lg font-semibold text-white">User Engagement Metrics</h3>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-400" />
            <span className="text-sm text-gray-400">Total Users</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.totalUsers}
          </div>
          <div className={`text-sm flex items-center gap-1 ${
            metrics.growthRate >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            <TrendingUp size={12} />
            {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-green-400" />
            <span className="text-sm text-gray-400">Active Users</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.activeUsers}
          </div>
          <div className="text-sm text-gray-400">
            {metrics.totalUsers > 0 ? ((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={16} className="text-purple-400" />
            <span className="text-sm text-gray-400">New Users</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.newUsers}
          </div>
          <div className="text-sm text-gray-400">This period</div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-sm text-gray-400">Avg Session</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(metrics.avgSessionDuration)}
          </div>
          <div className="text-sm text-gray-400">Duration</div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-accent-neural" />
            <span className="text-sm text-gray-400">Interactions/User</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.interactionsPerUser.toFixed(1)}
          </div>
          <div className="text-sm text-gray-400">Average</div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-cyan-400" />
            <span className="text-sm text-gray-400">Retention Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.retentionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Active/Total</div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-orange-400" />
            <span className="text-sm text-gray-400">Total Interactions</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.totalInteractions}
          </div>
          <div className="text-sm text-gray-400">This period</div>
        </div>
      </div>

      {/* Activity Timeline */}
      {userActivity.length > 0 && (
        <div className="bg-surface-mid rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-white mb-4">Daily Activity</h4>
          <div className="space-y-3">
            {userActivity.slice(-7).map((day, index) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-400">
                  {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">New Users</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface-deep rounded-full h-2">
                        <div
                          className="bg-purple-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (day.new_users / Math.max(...userActivity.map(d => d.new_users), 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-8">{day.new_users}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Active Users</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface-deep rounded-full h-2">
                        <div
                          className="bg-green-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (day.active_users / Math.max(...userActivity.map(d => d.active_users), 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-8">{day.active_users}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Interactions</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface-deep rounded-full h-2">
                        <div
                          className="bg-accent-neural h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (day.total_interactions / Math.max(...userActivity.map(d => d.total_interactions), 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-8">{day.total_interactions}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Users */}
      {topUsers.length > 0 && (
        <div className="bg-surface-mid rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Most Active Users</h4>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <motion.div
                key={user.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface-deep rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent-neural/20 rounded-full flex items-center justify-center">
                    <span className="text-accent-neural font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{formatUserId(user.user_id)}</div>
                    <div className="text-sm text-gray-400">
                      Last active: {new Date(parseInt(user.last_active)).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-white font-medium">{user.interaction_count}</div>
                    <div className="text-gray-400">Interactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-medium">{user.unique_locations}</div>
                    <div className="text-gray-400">Locations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-medium">{formatDuration(user.total_duration)}</div>
                    <div className="text-gray-400">Total Time</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}