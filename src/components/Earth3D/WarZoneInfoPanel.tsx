import React from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, AlertCircle, Info, ExternalLink } from 'lucide-react';

interface WarZoneInfoPanelProps {
  warZone: {
    name: string;
    description: string;
    casualties: string;
    started: string;
    latestUpdate: string;
  };
  onClose: () => void;
}

export default function WarZoneInfoPanel({ warZone, onClose }: WarZoneInfoPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 right-8 z-30 w-80"
    >
      <div className="bg-surface-deep/95 backdrop-blur-lg border border-red-500/30 rounded-xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="bg-red-900/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" />
            <h3 className="font-bold text-white">{warZone.name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-gray-300 text-sm mb-4">{warZone.description}</p>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Started:</span>
              <span className="text-white">{warZone.started}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Casualties:</span>
              <span className="text-white">{warZone.casualties}</span>
            </div>
          </div>
          
          <div className="bg-surface-mid rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-400" />
              <h4 className="text-sm font-medium text-white">Latest Update</h4>
            </div>
            <p className="text-sm text-gray-300">{warZone.latestUpdate}</p>
            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <RefreshCw size={10} />
              Updated 2 hours ago
            </div>
          </div>
          
          <a 
            href={`https://news.google.com/search?q=${encodeURIComponent(warZone.name)}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-4 rounded-lg text-sm transition-colors"
          >
            <ExternalLink size={14} />
            View Latest News
          </a>
        </div>
      </div>
    </motion.div>
  );
}