import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationCell } from '../types';
import { MapPin, Activity, Brain, Zap, Volume2, MessageCircle, Loader, RefreshCw, TrendingUp, Cloud, Wind, Thermometer, Wifi, Smartphone, Signal, BarChart3 } from 'lucide-react';
import { useVoiceInteraction } from '../hooks/useVoiceInteraction';
import { useRealtimeData } from '../hooks/useRealtimeData';
import ConnectivityWidget from './ConnectivityAnalytics/ConnectivityWidget';
import ConnectivityDashboard from './ConnectivityAnalytics/ConnectivityDashboard';
import SpeedTestWidget from './SpeedTest/SpeedTestWidget';
import NetworkAnalyticsDashboard from './SpeedTest/NetworkAnalyticsDashboard';
import NewsWidget from './NewsWidget/NewsWidget';
import TwitterWidget from './TwitterWidget/TwitterWidget';
import { SpeedTestResult } from '../lib/apis/speedtest';
import { geocodingService } from '../lib/apis/geocoding';
import { dataCollector } from '../lib/analytics/dataCollector';
import { algorandService } from '../lib/apis/algorand';
import BlockchainMemoryModal from './Blockchain/BlockchainMemoryModal';

interface LocationPanelProps {
  location: LocationCell | null;
  onClose: () => void;
}

export default function LocationPanel({ location, onClose }: LocationPanelProps) {
  const [userQuery, setUserQuery] = useState('');
  const [showConnectivityDashboard, setShowConnectivityDashboard] = useState(false);
  const [showNetworkAnalytics, setShowNetworkAnalytics] = useState(false);
  const [showBlockchainMemory, setShowBlockchainMemory] = useState(false);
  const [speedTestResult, setSpeedTestResult] = useState<SpeedTestResult | null>(null);
  const [isStable, setIsStable] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const { speakWithLocation, isPlaying, isGenerating } = useVoiceInteraction();
  const { data: realtimeData, loading: dataLoading, lastUpdate, refresh } = useRealtimeData(
    location ? location.coordinates : null
  );

  // Stabilization effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStable(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [location]);

  // Prevent scroll jumping when content changes
  useEffect(() => {
    if (scrollContainerRef.current && isStable) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      // Maintain scroll position during content updates
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollTop;
        }
      });
    }
  }, [realtimeData, isStable]);

  // Log location activity for analytics
  useEffect(() => {
    if (location) {
      // Log location view in analytics
      dataCollector.updateLocationActivityHeatmap(
        location.coordinates[1], 
        location.coordinates[0], 
        location.name
      );
    }
  }, [location]);

  if (!location) return null;

  const currentData = realtimeData || location.realtimeData;
  const connectivityData = (currentData as any)?.connectivity;

  const handleVoiceInteraction = async () => {
    if (!location) return;
    
    const query = userQuery.trim() || `Hello! Tell me about yourself and what's happening in ${location.name} right now.`;
    await speakWithLocation(location, query);
    setUserQuery('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleVoiceInteraction();
    }
  };

  const handleSpeedTestComplete = (result: SpeedTestResult) => {
    setSpeedTestResult(result);
    // Optionally refresh real-time data to include new speed test results
    refresh();
  };

  const handleClosePanel = () => {
    onClose();
  };

  const handleViewBlockchainMemory = () => {
    setShowBlockchainMemory(true);
  };

  // Format coordinates for display
  const formattedCoordinates = geocodingService.formatCoordinates(
    location.coordinates[1], 
    location.coordinates[0]
  );

  return (
    <>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, x: 300 }}
        animate={{ 
          opacity: 1, 
          x: 0,
          transition: {
            type: "spring",
            damping: 25,
            stiffness: 200,
            mass: 1
          }
        }}
        exit={{ 
          opacity: 0, 
          x: 300,
          transition: {
            duration: 0.2,
            ease: "easeInOut"
          }
        }}
        className="fixed right-4 top-20 bottom-4 w-96 z-50"
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: '1000px'
        }}
      >
        <div className="location-cell h-full flex flex-col" style={{ minHeight: '600px' }}>
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center justify-between mb-6 bg-surface-deep/95 backdrop-blur-sm rounded-t-2xl p-4 border-b border-surface-light">
            <div className="flex items-center gap-3">
              <div className="neural-indicator" />
              <div>
                <h2 className="text-2xl font-bold text-white">{location.name}</h2>
                <div className="text-sm text-gray-400 font-mono">
                  {formattedCoordinates}
                </div>
              </div>
            </div>
            <button
              onClick={handleClosePanel}
              className="text-gray-400 hover:text-white transition-colors text-2xl flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4"
            style={{
              scrollBehavior: 'smooth',
              overscrollBehavior: 'contain'
            }}
          >
            <div className="space-y-6" style={{ minHeight: 'fit-content' }}>
              {/* Location Info */}
              <div className="flex items-center gap-2 text-gray-300">
                <MapPin size={16} />
                <div>
                  <div className="text-sm font-medium">{location.name}</div>
                  <div className="text-xs text-gray-500 font-mono">
                    {location.coordinates[1].toFixed(4)}, {location.coordinates[0].toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Real-time Data Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity size={18} className="text-accent-neural" />
                  Live Data
                </h3>
                <div className="flex items-center gap-2">
                  {lastUpdate && (
                    <span className="text-xs text-gray-400">
                      {formatTime(lastUpdate)}
                    </span>
                  )}
                  <button
                    onClick={refresh}
                    disabled={dataLoading}
                    className="p-1 text-gray-400 hover:text-accent-neural transition-colors"
                  >
                    <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* News Widget - Stable Container */}
              <div style={{ minHeight: '200px' }}>
                <NewsWidget 
                  coordinates={location.coordinates}
                  locationName={location.name}
                />
              </div>

              {/* Twitter Widget - Stable Container */}
              <div style={{ minHeight: '200px' }}>
                <TwitterWidget 
                  coordinates={location.coordinates}
                  locationName={location.name}
                />
              </div>

              {/* Speed Test Widget - Stable Container */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-1" style={{ minHeight: '250px' }}>
                <SpeedTestWidget
                  coordinates={location.coordinates}
                  locationName={location.name}
                  onTestComplete={handleSpeedTestComplete}
                  className="bg-surface-deep/50"
                />
              </div>

              {/* Network Analytics Button */}
              {speedTestResult && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setShowNetworkAnalytics(true)}
                  className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-400 py-3 px-4 rounded-lg font-medium hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <BarChart3 size={18} />
                  View Network Analytics
                </motion.button>
              )}

              {/* Connectivity Widget - Stable Container */}
              {connectivityData && (
                <div style={{ minHeight: '150px' }}>
                  <ConnectivityWidget
                    connectivityData={connectivityData}
                    onExpand={() => setShowConnectivityDashboard(true)}
                  />
                </div>
              )}

              {/* Weather Card - Fixed Height */}
              <div className="bg-surface-mid rounded-lg p-4" style={{ minHeight: '120px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer size={16} className="text-blue-400" />
                  <span className="text-sm font-medium">Weather</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {currentData.weather.temperature}°C
                    </div>
                    <div className="text-sm text-gray-300 capitalize">
                      {currentData.weather.conditions}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Humidity:</span>
                      <span>{currentData.weather.humidity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wind:</span>
                      <span>{currentData.weather.windSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pressure:</span>
                      <span>{currentData.weather.pressure} hPa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environmental Data - Fixed Height */}
              <div className="bg-surface-mid rounded-lg p-4" style={{ minHeight: '140px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Cloud size={16} className="text-green-400" />
                  <span className="text-sm font-medium">Environment</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-gray-400">Air Quality</div>
                    <div className="text-lg font-semibold text-white">
                      {Math.round(currentData.environmental.airQuality)}
                    </div>
                    <div className="w-full bg-surface-deep rounded-full h-2 mt-1">
                      <div
                        className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${currentData.environmental.airQuality}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">UV Index</div>
                    <div className="text-lg font-semibold text-white">
                      {currentData.environmental.uvIndex}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Noise: {Math.round(currentData.environmental.noiseLevel * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Footprint - Fixed Height */}
              {connectivityData?.digitalFootprint && (
                <div className="bg-surface-mid rounded-lg p-4" style={{ minHeight: '160px' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone size={16} className="text-purple-400" />
                    <span className="text-sm font-medium">Digital Footprint</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Connected Devices</span>
                        <span className="text-sm font-medium text-white">
                          {connectivityData.digitalFootprint.connectedDevices}
                        </span>
                      </div>
                      <div className="w-full bg-surface-deep rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, connectivityData.digitalFootprint.connectedDevices / 3)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Data Traffic</span>
                        <div className="text-white font-medium">{connectivityData.digitalFootprint.dataTraffic} GB/h</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Network Load</span>
                        <div className="text-white font-medium">{connectivityData.digitalFootprint.networkLoad}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Interaction - Fixed Height */}
              <div style={{ minHeight: '180px' }}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle size={18} className="text-accent-neural" />
                  Speak with {location.name}
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Ask ${location.name} anything...`}
                    className="bio-input w-full h-20 resize-none"
                    disabled={isPlaying || isGenerating}
                    style={{ minHeight: '80px' }}
                    id="location-query"
                    name="location-query"
                  />
                  <button
                    onClick={handleVoiceInteraction}
                    disabled={isPlaying || isGenerating}
                    className="neural-button w-full flex items-center justify-center gap-2"
                    style={{ minHeight: '48px' }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Thinking...
                      </>
                    ) : isPlaying ? (
                      <>
                        <Volume2 size={18} />
                        Speaking...
                      </>
                    ) : (
                      <>
                        <Volume2 size={18} />
                        Speak with Location
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Personality Traits - Fixed Height */}
              <div style={{ minHeight: '200px' }}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Brain size={18} className="text-accent-neural" />
                  Personality
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(location.personality.traits).slice(0, 6).map(([trait, value]) => (
                    <div key={trait} className="bg-surface-mid rounded-lg p-3" style={{ minHeight: '70px' }}>
                      <div className="text-xs text-gray-400 mb-1 capitalize">
                        {trait.replace('_', ' ')}
                      </div>
                      <div className="w-full bg-surface-deep rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-emerald to-accent-neural h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-accent-neural mt-1">
                        {Math.round(value * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cultural Information - Fixed Height */}
              <div style={{ minHeight: '140px' }}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Zap size={18} className="text-accent-neural" />
                  Cultural Identity
                </h3>
                <div className="bg-surface-mid rounded-lg p-3">
                  <div className="text-sm text-gray-400 mb-2">Primary Culture</div>
                  <div className="text-lg font-medium mb-3">
                    {location.personality.culturalInfluence.primaryCulture}
                  </div>
                  
                  {location.personality.culturalInfluence.languages.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-400 mb-1">Languages</div>
                      <div className="flex flex-wrap gap-1">
                        {location.personality.culturalInfluence.languages.map((lang, index) => (
                          <span key={index} className="text-xs bg-accent-neural/20 text-accent-neural px-2 py-1 rounded">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-400 mb-1">Voice Characteristics</div>
                  <div className="text-sm text-gray-300">
                    {location.personality.voiceCharacteristics.tone} tone, {location.personality.voiceCharacteristics.pace} pace
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="flex-shrink-0 mt-6 space-y-3 p-4 bg-surface-deep/95 backdrop-blur-sm rounded-b-2xl border-t border-surface-light">
            <button 
              onClick={() => handleVoiceInteraction()}
              disabled={isPlaying || isGenerating}
              className="neural-button w-full"
              style={{ minHeight: '48px' }}
            >
              {isGenerating ? 'Generating Response...' : isPlaying ? 'Speaking...' : 'Quick Chat'}
            </button>
            <button 
              onClick={handleViewBlockchainMemory}
              className="w-full bg-transparent border border-accent-neural text-accent-neural rounded-full py-3 px-6 font-medium hover:bg-accent-neural hover:text-white transition-colors"
            >
              View Memory on Blockchain
            </button>
          </div>
        </div>
      </motion.div>

      {/* Connectivity Dashboard Modal */}
      {showConnectivityDashboard && connectivityData && (
        <ConnectivityDashboard
          coordinates={location.coordinates}
          isVisible={showConnectivityDashboard}
          onClose={() => setShowConnectivityDashboard(false)}
        />
      )}

      {/* Network Analytics Dashboard Modal */}
      {showNetworkAnalytics && (
        <NetworkAnalyticsDashboard
          coordinates={location.coordinates}
          locationName={location.name}
          isVisible={showNetworkAnalytics}
          onClose={() => setShowNetworkAnalytics(false)}
        />
      )}

      {/* Blockchain Memory Modal */}
      {showBlockchainMemory && (
        <BlockchainMemoryModal
          location={location}
          isVisible={showBlockchainMemory}
          onClose={() => setShowBlockchainMemory(false)}
        />
      )}
    </>
  );
}

// Helper function to format time
function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}