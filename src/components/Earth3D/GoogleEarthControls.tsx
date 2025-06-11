import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Satellite,
  Cloud,
  Sun,
  Moon,
  Navigation,
  MapPin,
  Compass,
  Wifi,
  Map
} from 'lucide-react';

interface GoogleEarthControlsProps {
  onSearch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleLayers: () => void;
  onToggleSatellites: () => void;
  onToggleClouds: () => void;
  onToggleDayNight: () => void;
  onToggleConnectivity?: () => void;
  currentZoom: number;
  satellitesVisible: boolean;
  cloudsVisible: boolean;
  isDayMode: boolean;
  layersVisible: boolean;
  connectivityVisible?: boolean;
  onMapModeChange?: (mode: 'satellite' | 'terrain' | 'hybrid' | 'streets') => void;
}

export default function GoogleEarthControls({
  onSearch,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleLayers,
  onToggleSatellites,
  onToggleClouds,
  onToggleDayNight,
  onToggleConnectivity,
  currentZoom,
  satellitesVisible,
  cloudsVisible,
  isDayMode,
  layersVisible,
  connectivityVisible = false,
  onMapModeChange
}: GoogleEarthControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapMode, setMapMode] = useState<'satellite' | 'terrain' | 'hybrid' | 'streets'>('satellite');

  const handleMapModeChange = (mode: 'satellite' | 'terrain' | 'hybrid' | 'streets') => {
    setMapMode(mode);
    if (onMapModeChange) {
      onMapModeChange(mode);
    }
    console.log(`🗺️ Switching to ${mode} mode`);
  };

  return (
    <>
      {/* Main Search Button - Top Center */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-8 left-1/2 transform -translate-x-1/2 z-30"
      >
        <button
          onClick={onSearch}
          className="bg-surface-deep/90 backdrop-blur-lg border border-accent-neural/20 rounded-full px-6 py-3 flex items-center gap-3 hover:bg-surface-mid transition-all shadow-lg"
        >
          <Search size={20} className="text-accent-neural" />
          <span className="text-white font-medium">Search Earth</span>
        </button>
      </motion.div>

      {/* Map Mode Selector - Top Right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed right-8 top-8 z-30"
      >
        <div className="bg-surface-deep/90 backdrop-blur-lg rounded-2xl border border-accent-neural/20 p-2 flex gap-1">
          <button
            onClick={() => handleMapModeChange('satellite')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapMode === 'satellite'
                ? 'bg-accent-neural text-surface-deep'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Satellite size={16} className="inline mr-1" />
            Satellite
          </button>
          <button
            onClick={() => handleMapModeChange('terrain')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapMode === 'terrain'
                ? 'bg-accent-neural text-surface-deep'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Globe size={16} className="inline mr-1" />
            Terrain
          </button>
          <button
            onClick={() => handleMapModeChange('hybrid')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapMode === 'hybrid'
                ? 'bg-accent-neural text-surface-deep'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Map size={16} className="inline mr-1" />
            Hybrid
          </button>
          <button
            onClick={() => handleMapModeChange('streets')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapMode === 'streets'
                ? 'bg-accent-neural text-surface-deep'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Navigation size={16} className="inline mr-1" />
            Streets
          </button>
        </div>
      </motion.div>

      {/* Zoom Controls - Right Side */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed right-8 top-1/2 transform -translate-y-1/2 z-20"
      >
        <div className="bg-surface-deep/90 backdrop-blur-lg rounded-2xl border border-accent-neural/20 p-2 space-y-2">
          <button
            onClick={onZoomIn}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-mid hover:bg-accent-neural/20 text-white hover:text-accent-neural transition-all"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          
          <div className="px-2 py-1">
            <div className="text-xs text-gray-400 text-center">
              {currentZoom.toFixed(1)}x
            </div>
            <div className="w-8 bg-surface-mid rounded-full h-1 mt-1">
              <div
                className="bg-accent-neural h-1 rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentZoom / 20) * 100)}%` }}
              />
            </div>
          </div>
          
          <button
            onClick={onZoomOut}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-mid hover:bg-accent-neural/20 text-white hover:text-accent-neural transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
        </div>
      </motion.div>

      {/* Layer Controls - Right Side (Below Zoom) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed right-8 top-1/2 transform translate-y-20 z-20"
      >
        <div className="bg-surface-deep/90 backdrop-blur-lg rounded-2xl border border-accent-neural/20 p-2 space-y-2">
          <button
            onClick={onToggleSatellites}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              satellitesVisible 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-surface-mid text-gray-400 hover:bg-surface-light hover:text-white'
            }`}
            title="Toggle Satellites"
          >
            <Satellite size={20} />
          </button>

          <button
            onClick={onToggleClouds}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              cloudsVisible 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'bg-surface-mid text-gray-400 hover:bg-surface-light hover:text-white'
            }`}
            title="Toggle Clouds"
          >
            <Cloud size={20} />
          </button>

          {onToggleConnectivity && (
            <button
              onClick={onToggleConnectivity}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                connectivityVisible 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-surface-mid text-gray-400 hover:bg-surface-light hover:text-white'
              }`}
              title="Toggle Connectivity"
            >
              <Wifi size={20} />
            </button>
          )}

          <button
            onClick={onToggleDayNight}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              isDayMode 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-blue-500/20 text-blue-400'
            }`}
            title={isDayMode ? 'Switch to Night Mode' : 'Switch to Day Mode'}
          >
            {isDayMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </motion.div>

      {/* Navigation Controls - Bottom Right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed right-8 bottom-8 z-20"
      >
        <div className="bg-surface-deep/90 backdrop-blur-lg rounded-2xl border border-accent-neural/20 p-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onResetView}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-mid hover:bg-accent-neural/20 text-white hover:text-accent-neural transition-all"
              title="Reset View"
            >
              <RotateCcw size={20} />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-mid hover:bg-accent-neural/20 text-white hover:text-accent-neural transition-all"
              title="More Controls"
            >
              <Layers size={20} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Expanded Controls */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed right-8 bottom-24 z-20"
        >
          <div className="bg-surface-deep/90 backdrop-blur-lg rounded-2xl border border-accent-neural/20 p-4 space-y-3 min-w-48">
            <h3 className="text-sm font-semibold text-accent-neural mb-3 flex items-center gap-2">
              <Globe size={16} />
              Advanced Controls
            </h3>
            
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">Map Quality</div>
              <div className="flex gap-1">
                <button className="flex-1 text-xs py-1 px-2 rounded bg-surface-mid text-gray-300 hover:bg-accent-neural/20">
                  Low
                </button>
                <button className="flex-1 text-xs py-1 px-2 rounded bg-accent-neural/20 text-accent-neural">
                  High
                </button>
                <button className="flex-1 text-xs py-1 px-2 rounded bg-surface-mid text-gray-300 hover:bg-accent-neural/20">
                  Ultra
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">Animation Speed</div>
              <input 
                type="range" 
                min="0.1" 
                max="2" 
                step="0.1" 
                defaultValue="1"
                className="w-full h-1 bg-surface-mid rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <button
              onClick={onToggleLayers}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-sm ${
                layersVisible 
                  ? 'bg-accent-neural/20 text-accent-neural' 
                  : 'bg-surface-mid text-gray-400 hover:bg-surface-light hover:text-white'
              }`}
            >
              <Layers size={16} />
              <span>Data Layers</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Compass - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed left-8 top-28 z-20"
      >
        <div className="bg-surface-deep/90 backdrop-blur-lg rounded-full border border-accent-neural/20 p-3">
          <Compass size={24} className="text-accent-neural" />
        </div>
      </motion.div>

      {/* Location Info - Bottom Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed left-8 bottom-8 z-20"
      >
        <div className="bg-surface-deep/90 backdrop-blur-lg rounded-xl border border-accent-neural/20 p-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin size={16} className="text-accent-neural" />
            <span>Click anywhere to explore • {mapMode} mode</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}