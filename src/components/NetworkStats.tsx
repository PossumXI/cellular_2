import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, Zap, Database, TrendingUp, Activity, Wifi, Signal } from 'lucide-react';
import { algorandService } from '../lib/apis/algorand';
import { telefonicaGatewayService } from '../lib/apis/telefonicaGateway';
import { speedTestService } from '../lib/apis/speedtest';

interface NetworkStatsProps {
  activeLocations: number;
  totalConnections: number;
  dataPoints: number;
  memoryBlocks: number;
}

export default function NetworkStats({ 
  activeLocations, 
  totalConnections, 
  dataPoints, 
  memoryBlocks 
}: NetworkStatsProps) {
  const [networkHealth, setNetworkHealth] = useState(0);
  const [transactionRate, setTransactionRate] = useState(0);
  const [connectivityMetrics, setConnectivityMetrics] = useState({
    avgSignalStrength: 0,
    totalDevices: 0,
    networkCoverage: 0
  });
  const [globalSpeedStats, setGlobalSpeedStats] = useState({
    avgDownload: 0,
    totalTests: 0
  });

  useEffect(() => {
    // Simulate network health calculation
    const health = Math.min(100, (activeLocations * 10) + (totalConnections * 5) + Math.random() * 20);
    setNetworkHealth(Math.round(health));

    // Simulate transaction rate
    setTransactionRate(Math.round(Math.random() * 50 + 10));

    // Fetch connectivity metrics
    fetchConnectivityMetrics();
    
    // Fetch real speed test statistics
    fetchGlobalSpeedStats();
  }, [activeLocations, totalConnections]);

  const fetchConnectivityMetrics = async () => {
    try {
      // Sample multiple locations for global metrics
      const sampleLocations = [
        [40.7128, -74.0060], // NYC
        [34.0522, -118.2437], // LA
        [51.5074, -0.1278], // London
        [35.6762, 139.6503], // Tokyo
      ];

      const connectivityData = await Promise.all(
        sampleLocations.map(([lat, lng]) => 
          telefonicaGatewayService.enhanceLocationWithConnectivity(lat, lng)
        )
      );

      const avgSignal = connectivityData.reduce((sum, data) => 
        sum + data.connectivity.signalStrength, 0) / connectivityData.length;
      
      const totalDevices = connectivityData.reduce((sum, data) => 
        sum + data.digitalFootprint.connectedDevices, 0);

      const coverage = connectivityData.filter(data => 
        data.connectivity.signalStrength > 70).length / connectivityData.length * 100;

      setConnectivityMetrics({
        avgSignalStrength: Math.round(avgSignal),
        totalDevices,
        networkCoverage: Math.round(coverage)
      });
    } catch (error) {
      console.error('Error fetching connectivity metrics:', error);
    }
  };

  const fetchGlobalSpeedStats = async () => {
    try {
      const stats = await speedTestService.getGlobalNetworkStats();
      setGlobalSpeedStats({
        avgDownload: stats.averageDownload,
        totalTests: stats.totalTests
      });
    } catch (error) {
      console.error('Error fetching global speed stats:', error);
    }
  };

  const stats = [
    {
      icon: Globe,
      label: 'Active Locations',
      value: activeLocations.toLocaleString(),
      color: 'text-accent-neural',
      trend: '+12%'
    },
    {
      icon: Zap,
      label: 'Neural Connections',
      value: totalConnections.toLocaleString(),
      color: 'text-accent-pulse',
      trend: '+8%'
    },
    {
      icon: Users,
      label: 'Data Points',
      value: dataPoints.toLocaleString(),
      color: 'text-primary-emerald',
      trend: '+24%'
    },
    {
      icon: Database,
      label: 'Memory Blocks',
      value: memoryBlocks.toLocaleString(),
      color: 'text-primary-moss',
      trend: '+15%'
    },
    {
      icon: Activity,
      label: 'Network Health',
      value: `${networkHealth}%`,
      color: 'text-green-400',
      trend: '+3%'
    },
    {
      icon: TrendingUp,
      label: 'TX/sec',
      value: transactionRate.toString(),
      color: 'text-blue-400',
      trend: '+5%'
    },
    {
      icon: Wifi,
      label: 'Avg Speed',
      value: globalSpeedStats.avgDownload > 0 ? `${globalSpeedStats.avgDownload.toFixed(0)} Mbps` : 'Loading...',
      color: 'text-purple-400',
      trend: '+7%'
    },
    {
      icon: Signal,
      label: 'Speed Tests',
      value: globalSpeedStats.totalTests > 0 ? globalSpeedStats.totalTests.toLocaleString() : '0',
      color: 'text-cyan-400',
      trend: '+18%'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10"
    >
      <div className="bio-nav flex items-center gap-4 px-6 py-3 max-w-7xl overflow-x-auto">
        {stats.map((stat, index) => (
          <motion.div 
            key={index} 
            className="flex items-center gap-2 group cursor-pointer flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <stat.icon size={18} className={stat.color} />
            <div>
              <div className="text-xs text-gray-400">{stat.label}</div>
              <div className={`text-sm font-bold ${stat.color} flex items-center gap-1`}>
                {stat.value}
                <span className="text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {stat.trend}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Enhanced Attribution */}
      <div className="text-center mt-2">
        <span className="text-xs text-gray-500">
          Real speed data powered by SpeedOf.Me • Connectivity by Telefonica Open Gateway
        </span>
      </div>
    </motion.div>
  );
}