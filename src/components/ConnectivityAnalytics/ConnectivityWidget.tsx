import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, Signal, Smartphone, TrendingUp } from 'lucide-react';
import { ConnectivityData } from '../../types';

interface ConnectivityWidgetProps {
  connectivityData: ConnectivityData;
  onExpand: () => void;
}

export default function ConnectivityWidget({ connectivityData, onExpand }: ConnectivityWidgetProps) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-mid rounded-lg p-4 cursor-pointer hover:bg-surface-light transition-colors"
      onClick={onExpand}
    >
      <div className="flex items-center gap-2 mb-3">
        <Wifi size={16} className="text-blue-400" />
        <span className="text-sm font-medium">Network Connectivity</span>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
          Telefonica
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <Signal size={16} className={getNetworkTypeColor(connectivityData.networkType)} />
            {connectivityData.networkType}
          </div>
          <div className={`text-sm ${getCoverageColor(connectivityData.coverage)}`}>
            {connectivityData.signalStrength}% signal
          </div>
        </div>
        
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Bandwidth:</span>
            <span>{connectivityData.bandwidth} Mbps</span>
          </div>
          <div className="flex justify-between">
            <span>Latency:</span>
            <span>{connectivityData.latency}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Devices:</span>
            <span>{connectivityData.digitalFootprint.connectedDevices}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="w-full bg-surface-deep rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${connectivityData.signalStrength}%` }}
          />
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Click for detailed analytics
      </div>
    </motion.div>
  );
}