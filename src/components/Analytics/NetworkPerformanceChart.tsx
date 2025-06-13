import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Download, Upload, Clock, TrendingUp, MapPin, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NetworkPerformanceChartProps {
  timeRange: string;
}

interface NetworkMetrics {
  location_name: string;
  coordinates: [number, number];
  avg_download: number;
  avg_upload: number;
  avg_latency: number;
  test_count: number;
  reliability_score: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface TimeSeriesData {
  timestamp: string;
  avg_download: number;
  avg_upload: number;
  avg_latency: number;
  test_count: number;
}

export default function NetworkPerformanceChart({ timeRange }: NetworkPerformanceChartProps) {
  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    avgDownload: 0,
    avgUpload: 0,
    avgLatency: 0,
    totalTests: 0
  });

  useEffect(() => {
    fetchNetworkData();
  }, [timeRange]);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const timeFilter = getTimeFilter(timeRange);
      
      // Fetch network analytics data
      const { data: networkData, error } = await supabase
        .from('network_analytics')
        .select('*')
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (networkData && networkData.length > 0) {
        // Calculate global stats
        const totalTests = networkData.length;
        const avgDownload = networkData.reduce((sum, test) => sum + test.download_speed, 0) / totalTests;
        const avgUpload = networkData.reduce((sum, test) => sum + test.upload_speed, 0) / totalTests;
        const avgLatency = networkData.reduce((sum, test) => sum + test.latency, 0) / totalTests;

        setGlobalStats({
          avgDownload,
          avgUpload,
          avgLatency,
          totalTests
        });

        // Group by location
        const locationMap = new Map<string, {
          name: string;
          coordinates: [number, number];
          tests: any[];
        }>();

        networkData.forEach(test => {
          const key = test.location_name;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              name: test.location_name,
              coordinates: [test.coordinates.x, test.coordinates.y],
              tests: []
            });
          }
          locationMap.get(key)!.tests.push(test);
        });

        // Calculate metrics per location
        const locationMetrics: NetworkMetrics[] = Array.from(locationMap.entries()).map(([key, data]) => {
          const tests = data.tests;
          const avgDownload = tests.reduce((sum, test) => sum + test.download_speed, 0) / tests.length;
          const avgUpload = tests.reduce((sum, test) => sum + test.upload_speed, 0) / tests.length;
          const avgLatency = tests.reduce((sum, test) => sum + test.latency, 0) / tests.length;
          
          // Calculate reliability score (simplified)
          const reliabilityScore = Math.min(100, (avgDownload / 100) * 50 + (100 - avgLatency) * 0.5);
          
          // Determine trend (simplified)
          let trend: 'improving' | 'declining' | 'stable' = 'stable';
          if (tests.length >= 2) {
            const firstHalf = tests.slice(0, Math.floor(tests.length / 2));
            const secondHalf = tests.slice(Math.floor(tests.length / 2));
            
            const firstAvg = firstHalf.reduce((sum, test) => sum + test.download_speed, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, test) => sum + test.download_speed, 0) / secondHalf.length;
            
            const improvement = ((secondAvg - firstAvg) / firstAvg) * 100;
            if (improvement > 10) trend = 'improving';
            else if (improvement < -10) trend = 'declining';
          }

          return {
            location_name: data.name,
            coordinates: data.coordinates,
            avg_download: avgDownload,
            avg_upload: avgUpload,
            avg_latency: avgLatency,
            test_count: tests.length,
            reliability_score: reliabilityScore,
            trend
          };
        }).sort((a, b) => b.avg_download - a.avg_download);

        setMetrics(locationMetrics);

        // Generate time series data
        const timeSeriesMap = new Map<string, {
          download: number[];
          upload: number[];
          latency: number[];
          count: number;
        }>();

        networkData.forEach(test => {
          const date = new Date(test.created_at).toISOString().split('T')[0];
          if (!timeSeriesMap.has(date)) {
            timeSeriesMap.set(date, {
              download: [],
              upload: [],
              latency: [],
              count: 0
            });
          }
          const dayData = timeSeriesMap.get(date)!;
          dayData.download.push(test.download_speed);
          dayData.upload.push(test.upload_speed);
          dayData.latency.push(test.latency);
          dayData.count++;
        });

        const timeSeries: TimeSeriesData[] = Array.from(timeSeriesMap.entries()).map(([date, data]) => ({
          timestamp: date,
          avg_download: data.download.reduce((sum, val) => sum + val, 0) / data.download.length,
          avg_upload: data.upload.reduce((sum, val) => sum + val, 0) / data.upload.length,
          avg_latency: data.latency.reduce((sum, val) => sum + val, 0) / data.latency.length,
          test_count: data.count
        })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        setTimeSeriesData(timeSeries);
      }
    } catch (error) {
      console.error('Error fetching network data:', error);
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

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp size={14} className="text-green-400" />;
      case 'declining':
        return <TrendingUp size={14} className="text-red-400 rotate-180" />;
      default:
        return <Activity size={14} className="text-gray-400" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 100) return 'text-green-400';
    if (speed >= 25) return 'text-blue-400';
    if (speed >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-neural border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading network performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Wifi size={20} className="text-accent-neural" />
        <h3 className="text-lg font-semibold text-white">Network Performance Analytics</h3>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Download size={16} className="text-green-400" />
            <span className="text-sm text-gray-400">Avg Download</span>
          </div>
          <div className={`text-2xl font-bold ${getSpeedColor(globalStats.avgDownload)}`}>
            {globalStats.avgDownload.toFixed(1)} Mbps
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={16} className="text-blue-400" />
            <span className="text-sm text-gray-400">Avg Upload</span>
          </div>
          <div className={`text-2xl font-bold ${getSpeedColor(globalStats.avgUpload)}`}>
            {globalStats.avgUpload.toFixed(1)} Mbps
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-sm text-gray-400">Avg Latency</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {globalStats.avgLatency.toFixed(0)}ms
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-purple-400" />
            <span className="text-sm text-gray-400">Total Tests</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {globalStats.totalTests}
          </div>
        </div>
      </div>

      {/* Time Series Chart (Simplified) */}
      {timeSeriesData.length > 0 && (
        <div className="bg-surface-mid rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-white mb-4">Performance Over Time</h4>
          <div className="space-y-4">
            {timeSeriesData.slice(-7).map((data, index) => (
              <div key={data.timestamp} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-400">
                  {new Date(data.timestamp).toLocaleDateString()}
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Download</span>
                      <span className={getSpeedColor(data.avg_download)}>
                        {data.avg_download.toFixed(1)} Mbps
                      </span>
                    </div>
                    <div className="w-full bg-surface-deep rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (data.avg_download / 200) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-xs text-gray-400 text-right">
                    {data.test_count} tests
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location Performance */}
      <div className="bg-surface-mid rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Top Performing Locations</h4>
        <div className="space-y-4">
          {metrics.slice(0, 10).map((metric, index) => (
            <motion.div
              key={metric.location_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-surface-deep rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="font-medium text-white">{metric.location_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm ${getTrendColor(metric.trend)}`}>
                    {metric.trend}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className={`font-medium ${getSpeedColor(metric.avg_download)}`}>
                    {metric.avg_download.toFixed(1)} Mbps
                  </div>
                  <div className="text-gray-400">Download</div>
                </div>
                <div>
                  <div className={`font-medium ${getSpeedColor(metric.avg_upload)}`}>
                    {metric.avg_upload.toFixed(1)} Mbps
                  </div>
                  <div className="text-gray-400">Upload</div>
                </div>
                <div>
                  <div className="font-medium text-white">
                    {metric.avg_latency.toFixed(0)}ms
                  </div>
                  <div className="text-gray-400">Latency</div>
                </div>
                <div>
                  <div className="font-medium text-white">
                    {metric.test_count}
                  </div>
                  <div className="text-gray-400">Tests</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Reliability Score</span>
                  <span className="text-white">{metric.reliability_score.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-surface-light rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metric.reliability_score}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}