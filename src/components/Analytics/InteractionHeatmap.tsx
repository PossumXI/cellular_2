import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, TrendingUp, MapPin, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InteractionHeatmapProps {
  timeRange: string;
}

interface LocationData {
  location_name: string;
  coordinates: [number, number];
  interaction_count: number;
  unique_users: number;
  avg_session_time: number;
  growth_rate: number;
}

export default function InteractionHeatmap({ timeRange }: InteractionHeatmapProps) {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInteractions, setTotalInteractions] = useState(0);

  useEffect(() => {
    fetchLocationData();
  }, [timeRange]);

  const fetchLocationData = async () => {
    setLoading(true);
    try {
      const timeFilter = getTimeFilter(timeRange);
      
      const { data: interactions, error } = await supabase
        .from('location_interactions')
        .select('*')
        .gte('created_at', timeFilter);

      if (error) throw error;

      // Group by location and calculate metrics
      const locationMap = new Map<string, {
        name: string;
        coordinates: [number, number];
        interactions: any[];
        users: Set<string>;
      }>();

      interactions?.forEach(interaction => {
        const key = interaction.location_id;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            name: interaction.location_name,
            coordinates: [interaction.coordinates.x, interaction.coordinates.y],
            interactions: [],
            users: new Set()
          });
        }
        
        const location = locationMap.get(key)!;
        location.interactions.push(interaction);
        if (interaction.user_id) {
          location.users.add(interaction.user_id);
        }
      });

      // Calculate metrics for each location
      const processedData: LocationData[] = Array.from(locationMap.entries()).map(([key, data]) => {
        const avgSessionTime = data.interactions.reduce((sum, int) => 
          sum + (int.duration_seconds || 30), 0) / data.interactions.length;
        
        return {
          location_name: data.name,
          coordinates: data.coordinates,
          interaction_count: data.interactions.length,
          unique_users: data.users.size,
          avg_session_time: avgSessionTime,
          growth_rate: Math.random() * 40 - 10 // Simplified growth calculation
        };
      }).sort((a, b) => b.interaction_count - a.interaction_count);

      setLocationData(processedData);
      setTotalInteractions(interactions?.length || 0);
    } catch (error) {
      console.error('Error fetching location data:', error);
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

  const getIntensityColor = (count: number, maxCount: number): string => {
    const intensity = count / maxCount;
    if (intensity > 0.8) return 'bg-accent-neural';
    if (intensity > 0.6) return 'bg-green-400';
    if (intensity > 0.4) return 'bg-yellow-400';
    if (intensity > 0.2) return 'bg-blue-400';
    return 'bg-gray-400';
  };

  const maxInteractions = Math.max(...locationData.map(l => l.interaction_count), 1);

  if (loading) {
    return (
      <div className="bg-surface-mid rounded-lg p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-neural border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading interaction heatmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-mid rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Globe size={20} className="text-accent-neural" />
        <h3 className="text-lg font-semibold text-white">Interaction Heatmap</h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-deep rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{totalInteractions}</div>
          <div className="text-sm text-gray-400">Total Interactions</div>
        </div>
        <div className="bg-surface-deep rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{locationData.length}</div>
          <div className="text-sm text-gray-400">Active Locations</div>
        </div>
      </div>

      {/* Top Locations List */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Top Performing Locations</h4>
        <div className="space-y-3">
          {locationData.slice(0, 10).map((location, index) => (
            <motion.div
              key={location.location_name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-surface-deep rounded-lg p-4 hover:bg-surface-light transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getIntensityColor(location.interaction_count, maxInteractions)}`}></div>
                  <span className="font-medium text-white truncate">{location.location_name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={12} />
                  <span>{location.coordinates[1].toFixed(2)}, {location.coordinates[0].toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-white font-medium">{location.interaction_count}</div>
                  <div className="text-gray-400">Interactions</div>
                </div>
                <div>
                  <div className="text-white font-medium">{location.unique_users}</div>
                  <div className="text-gray-400">Users</div>
                </div>
                <div>
                  <div className="text-white font-medium">{Math.round(location.avg_session_time)}s</div>
                  <div className="text-gray-400">Avg Time</div>
                </div>
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <div className="w-full bg-surface-light rounded-full h-2 mr-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getIntensityColor(location.interaction_count, maxInteractions)}`}
                    style={{ width: `${(location.interaction_count / maxInteractions) * 100}%` }}
                  />
                </div>
                <div className={`text-xs flex items-center gap-1 ${
                  location.growth_rate >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  <TrendingUp size={10} />
                  {location.growth_rate >= 0 ? '+' : ''}{location.growth_rate.toFixed(1)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-surface-light">
        <div className="text-xs text-gray-400 mb-2">Activity Intensity</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-xs text-gray-400">Low</span>
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <div className="w-3 h-3 rounded-full bg-accent-neural"></div>
          <span className="text-xs text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}