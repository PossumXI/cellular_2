import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Globe, 
  MapPin, 
  Wifi, 
  Download, 
  Upload, 
  Clock,
  Users,
  RefreshCw
} from 'lucide-react';
import { speedTestService, NetworkAnalytics } from '../../lib/apis/speedtest';

interface NetworkAnalyticsDashboardProps {
  coordinates?: [number, number];
  locationName?: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function NetworkAnalyticsDashboard({ 
  coordinates, 
  locationName, 
  isVisible, 
  onClose 
}: NetworkAnalyticsDashboardProps) {
  const [localAnalytics, setLocalAnalytics] = useState<NetworkAnalytics[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    if (!coordinates) return;
    
    setLoading(true);
    try {
      const [local, global] = await Promise.all([
        speedTestService.getLocationNetworkAnalytics(coordinates, 25), // 25km radius
        speedTestService.getGlobalNetworkStats()
      ]);
      
      setLocalAnalytics(local);
      setGlobalStats(global);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching network analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && coordinates) {
      fetchAnalytics();
    }
  }, [isVisible, coordinates]);

  if (!isVisible) return null;

  const localAvgDownload = localAnalytics.length > 0 
    ? localAnalytics.reduce((sum, record) => sum + record.download_speed, 0) / localAnalytics.length 
    : 0;

  const localAvgUpload = localAnalytics.length > 0 
    ? localAnalytics.reduce((sum, record) => sum + record.upload_speed, 0) / localAnalytics.length 
    : 0;

  const localAvgLatency = localAnalytics.length > 0 
    ? localAnalytics.reduce((sum, record) => sum + record.latency, 0) / localAnalytics.length 
    : 0;

  const formatSpeed = (speed: number) => {
    if (speed >= 1000) return `${(speed / 1000).toFixed(1)} Gbps`;
    return `${speed.toFixed(1)} Mbps`;
  };

  const getSpeedRating = (speed: number) => {
    if (speed >= 100) return { label: 'Excellent', color: 'text-green-400' };
    if (speed >= 25) return { label: 'Good', color: 'text-blue-400' };
    if (speed >= 10) return { label: 'Fair', color: 'text-yellow-400' };
    return { label: 'Poor', color: 'text-red-400' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Network Analytics</h2>
              <p className="text-gray-400">Real-time speed test data and insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-accent-neural transition-colors"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Location Info */}
        {locationName && (
          <div className="bg-surface-mid rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-accent-neural">
              <MapPin size={16} />
              <span className="font-medium">{locationName}</span>
              {coordinates && (
                <span className="text-gray-400 text-sm">
                  ({coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Local Area Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="text-green-400" />
              <span className="text-sm text-gray-400">Avg Download</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatSpeed(localAvgDownload)}
            </div>
            <div className={`text-sm ${getSpeedRating(localAvgDownload).color}`}>
              {getSpeedRating(localAvgDownload).label}
            </div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className="text-blue-400" />
              <span className="text-sm text-gray-400">Avg Upload</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatSpeed(localAvgUpload)}
            </div>
            <div className={`text-sm ${getSpeedRating(localAvgUpload).color}`}>
              {getSpeedRating(localAvgUpload).label}
            </div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-yellow-400" />
              <span className="text-sm text-gray-400">Avg Latency</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {localAvgLatency.toFixed(0)}ms
            </div>
            <div className={`text-sm ${localAvgLatency < 50 ? 'text-green-400' : localAvgLatency < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
              {localAvgLatency < 50 ? 'Excellent' : localAvgLatency < 100 ? 'Good' : 'Poor'}
            </div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-purple-400" />
              <span className="text-sm text-gray-400">Local Tests</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {localAnalytics.length}
            </div>
            <div className="text-sm text-gray-400">
              Last 30 days
            </div>
          </div>
        </div>

        {/* Global Comparison */}
        {globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-mid rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={20} className="text-accent-neural" />
                <h3 className="text-lg font-semibold text-white">Global Comparison</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Global Avg Download</span>
                  <span className="text-white font-medium">
                    {formatSpeed(globalStats.averageDownload)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Local vs Global</span>
                  <span className={`font-medium ${
                    localAvgDownload > globalStats.averageDownload ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {localAvgDownload > globalStats.averageDownload ? '+' : ''}
                    {((localAvgDownload - globalStats.averageDownload) / globalStats.averageDownload * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Global Tests</span>
                  <span className="text-white font-medium">
                    {globalStats.totalTests.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface-mid rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-green-400" />
                <h3 className="text-lg font-semibold text-white">Top Performing Areas</h3>
              </div>
              
              <div className="space-y-2">
                {globalStats.topLocations.slice(0, 5).map((location: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm truncate">
                      {location.location}
                    </span>
                    <div className="text-right">
                      <div className="text-white font-medium text-sm">
                        {formatSpeed(location.avgSpeed)}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {location.testCount} tests
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Local Tests */}
        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Recent Local Tests</h3>
          </div>
          
          {localAnalytics.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {localAnalytics.slice(0, 10).map((test, index) => (
                <div key={test.id} className="flex justify-between items-center p-3 bg-surface-deep rounded-lg">
                  <div>
                    <div className="text-white font-medium text-sm">
                      {test.location_name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(test.test_timestamp).toLocaleDateString()} at{' '}
                      {new Date(test.test_timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm">
                      ↓ {formatSpeed(test.download_speed)} ↑ {formatSpeed(test.upload_speed)}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {test.latency.toFixed(0)}ms latency
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Wifi size={48} className="mx-auto mb-4 opacity-50" />
              <p>No speed test data available for this area</p>
              <p className="text-sm">Run a speed test to contribute data!</p>
            </div>
          )}
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="mt-4 text-center text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}