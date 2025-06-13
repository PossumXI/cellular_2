import React from 'react';
import { motion } from 'framer-motion';
import { X, Users, Globe, ArrowRight, BarChart3 } from 'lucide-react';

interface PopulationInfoPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function PopulationInfoPanel({ isVisible, onClose }: PopulationInfoPanelProps) {
  // World population data by continent (2025 estimates)
  const populationData = [
    { continent: 'Asia', population: 4750000000, percentage: 59.4 },
    { continent: 'Africa', population: 1450000000, percentage: 18.1 },
    { continent: 'Europe', population: 750000000, percentage: 9.4 },
    { continent: 'North America', population: 600000000, percentage: 7.5 },
    { continent: 'South America', population: 430000000, percentage: 5.4 },
    { continent: 'Oceania', population: 45000000, percentage: 0.6 },
    { continent: 'Antarctica', population: 5000, percentage: 0.0001 }
  ];

  // Format population number
  const formatPopulation = (population: number) => {
    if (population >= 1000000000) {
      return `${(population / 1000000000).toFixed(2)} billion`;
    } else if (population >= 1000000) {
      return `${(population / 1000000).toFixed(2)} million`;
    } else if (population >= 1000) {
      return `${(population / 1000).toFixed(2)} thousand`;
    }
    return population.toString();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      className="fixed left-8 top-1/2 transform -translate-y-1/2 z-30 w-80"
    >
      <div className="bg-surface-deep/90 backdrop-blur-lg rounded-xl border border-accent-neural/20 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-accent-neural" />
            <h3 className="text-lg font-bold text-white">World Population</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Population:</span>
            <span className="text-white font-bold">8.03 billion</span>
          </div>
          <div className="text-xs text-gray-500 mb-4">Each yellow dot represents ~1 million people</div>
          
          <div className="space-y-3">
            {populationData.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white">{item.continent}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">{item.percentage}%</span>
                    <span className="text-xs text-gray-400">{formatPopulation(item.population)}</span>
                  </div>
                </div>
                <div className="w-full bg-surface-light rounded-full h-2">
                  <div 
                    className="bg-accent-neural h-2 rounded-full" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Globe size={14} className="text-blue-400" />
            Information Flow
          </h4>
          <p className="text-xs text-gray-300">
            Yellow lines represent data transmission between population centers. Each day, over 500 exabytes of data are exchanged globally through networks.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <ArrowRight size={12} className="text-gray-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-gray-400">= 1TB data/second</span>
          </div>
        </div>

        <div className="bg-surface-mid rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" />
            Population Growth
          </h4>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>2020</span>
            <span>2025</span>
            <span>2030 (est.)</span>
          </div>
          <div className="relative h-8 bg-surface-deep rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-[93%] bg-blue-500/30 rounded-l-lg"></div>
            <div className="absolute left-0 top-0 h-full w-[100%] bg-accent-neural/30 rounded-l-lg"></div>
            <div className="absolute left-0 top-0 h-full w-[107%] bg-purple-500/30 rounded-l-lg"></div>
            
            <div className="absolute left-[93%] top-0 h-full border-l border-blue-500 border-dashed"></div>
            <div className="absolute left-[100%] top-0 h-full border-l border-accent-neural"></div>
            
            <div className="absolute left-[88%] bottom-1 text-[10px] text-blue-400">7.8B</div>
            <div className="absolute left-[95%] bottom-1 text-[10px] text-accent-neural">8.0B</div>
            <div className="absolute left-[102%] bottom-1 text-[10px] text-purple-400">8.5B</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}