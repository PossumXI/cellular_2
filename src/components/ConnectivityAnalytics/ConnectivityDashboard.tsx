import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, 
  Signal, 
  Smartphone, 
  Activity, 
  TrendingUp, 
  Globe, 
  Zap,
  Users,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { ConnectivityData } from '../../types';
import { telefonicaGatewayService } from '../../lib/apis/telefonicaGateway';

interface ConnectivityDashboardProps {
  coordinates: [number, number];
  isVisible: boolean;
  onClose: () => void;
}

export default function ConnectivityDashboard({ 
  coordinates, 
  isVisible, 
  onClose 
}: ConnectivityDashboardProps) {
  const [connectivityData, setConnectivityData] = useState<ConnectivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchConnectivityData = async () => {
    setLoading(true);
    try {
      const [lng, lat] = coordinates;
      const data = await telefonicaGatewayService.enhanceLocationWithConnectivity(lat, lng);
      
      const enhancedConnectivity: ConnectivityData = {
        networkType: data.connectivity.networkType as '5G' | '4G' | '3G' | 'WiFi',
        signalStrength: data.connectivity.signalStrength,
        bandwidth: data.connectivity.bandwidth,
        latency: data.connectivity.latency,
        coverage: data.connectivity.signalStrength > 80 ? 'excellent' : 
                 data.connectivity.signalStrength > 60 ? 'good' :
                 data.connectivity.signalStrength > 40 ? 'fair' : 'poor',
        digitalFootprint: {
          ...data.digitalFootprint,
          activeConnections: Math.round(data.digitalFootprint.connectedDevices * 0.7),
          peakUsageHours: ['09:00', '12:00', '18:00', '21:00'],
          deviceTypes: {
            smartphones: Math.round(data.digitalFootprint.connectedDevices * 0.6),
            tablets: Math.round(data.digitalFootprint.connectedDevices * 0.15),
            laptops: Math.round(data.digitalFootprint.connectedDevices * 0.15),
            iot: Math.round(data.digitalFootprint.connectedDevices * 0.08),
            other: Math.round(data.digitalFootprint.connectedDevices * 0.02)
          }
        },
        networkQuality: {
          downloadSpeed: data.connectivity.bandwidth,
          uploadSpeed: data.connectivity.bandwidth * 0.8,
          packetLoss: Math.random() * 2,
          jitter: Math.random() * 10 + 5,
          reliability: data.connectivity.signalStrength
        }
      };

      setConnectivityData(enhancedConnectivity);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching connectivity data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchConnectivityData();
    }
  }, [isVisible, coordinates]);

  if (!isVisible || !connectivityData) return null;

  const getCoverageColor = (coverage: string) => {
    switch (coverage) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getNetworkTypeColor = (type: string) => {
    switch (type) {
      case '5G': return 'text-purple-400';
      case '4G': return 'text-blue-400';
      case '3G': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
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
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-neural/20 rounded-lg">
              <Wifi className="text-accent-neural" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Connectivity Analytics</h2>
              <p className="text-gray-400">Powered by Telefonica Open Gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchConnectivityData}
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

        {/* Network Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Signal size={16} className={getNetworkTypeColor(connectivityData.networkType)} />
              <span className="text-sm text-gray-400">Network</span>
            </div>
            <div className={`text-2xl font-bold ${getNetworkTypeColor(connectivityData.networkType)}`}>
              {connectivityData.networkType}
            </div>
            <div className={`text-sm ${getCoverageColor(connectivityData.coverage)}`}>
              {connectivityData.coverage} coverage
            </div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-green-400" />
              <span className="text-sm text-gray-400">Signal</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {connectivityData.signalStrength}%
            </div>
            <div className="w-full bg-surface-deep rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${connectivityData.signalStrength}%` }}
              />
            </div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm text-gray-400">Bandwidth</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {connectivityData.bandwidth}
            </div>
            <div className="text-sm text-gray-400">Mbps</div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-blue-400" />
              <span className="text-sm text-gray-400">Latency</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {connectivityData.latency}
            </div>
            <div className="text-sm text-gray-400">ms</div>
          </div>
        </div>

        {/* Digital Footprint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Digital Footprint</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Connected Devices</span>
                <span className="text-xl font-bold text-white">
                  {connectivityData.digitalFootprint.connectedDevices}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Data Traffic</span>
                <span className="text-xl font-bold text-white">
                  {connectivityData.digitalFootprint.dataTraffic} GB/h
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network Load</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">
                    {connectivityData.digitalFootprint.networkLoad}%
                  </span>
                  <div className="w-16 bg-surface-deep rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${connectivityData.digitalFootprint.networkLoad}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-mid rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={20} className="text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Device Distribution</h3>
            </div>
            
            <div className="space-y-3">
              {Object.entries(connectivityData.digitalFootprint.deviceTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-gray-400 capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{count}</span>
                    <div className="w-12 bg-surface-deep rounded-full h-2">
                      <div
                        className="bg-accent-neural h-2 rounded-full"
                        style={{ 
                          width: `${(count / connectivityData.digitalFootprint.connectedDevices) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Network Quality Metrics */}
        <div className="bg-surface-mid rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-green-400" />
            <h3 className="text-lg font-semibold text-white">Network Quality</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {connectivityData.networkQuality.downloadSpeed.toFixed(1)}
              </div>
              <div className="text-sm text-gray-400">Download (Mbps)</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {connectivityData.networkQuality.uploadSpeed.toFixed(1)}
              </div>
              <div className="text-sm text-gray-400">Upload (Mbps)</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {connectivityData.networkQuality.packetLoss.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400">Packet Loss</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {connectivityData.networkQuality.jitter.toFixed(1)}
              </div>
              <div className="text-sm text-gray-400">Jitter (ms)</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {connectivityData.networkQuality.reliability.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-400">Reliability</div>
            </div>
          </div>
        </div>

        {/* Peak Usage Hours */}
        <div className="bg-surface-mid rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} className="text-accent-neural" />
            <h3 className="text-lg font-semibold text-white">Peak Usage Analysis</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {connectivityData.digitalFootprint.peakUsageHours.map((hour, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-accent-neural/20 text-accent-neural rounded-full text-sm"
              >
                {hour}
              </span>
            ))}
          </div>
          
          {lastUpdate && (
            <div className="mt-4 text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}