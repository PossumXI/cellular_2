import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Loader, BarChart3 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Vector3 } from 'three';

import NeuralBackground from './components/NeuralBackground';
import FloatingParticles from './components/FloatingParticles';
import EnhancedEarth from './components/Earth3D/EnhancedEarth';
import GoogleEarthControls from './components/Earth3D/GoogleEarthControls';
import LocationPanel from './components/LocationPanel';
import LocationSearch from './components/LocationSearch/LocationSearch';
import NetworkStats from './components/NetworkStats';
import LoadingScreen from './components/UI/LoadingScreen';
import AuthModal from './components/Auth/AuthModal';
import PricingModal from './components/Pricing/PricingModal';
import UserMenu from './components/UI/UserMenu';
import BoltAttribution from './components/UI/BoltAttribution';
import EnhancedAnalyticsDashboard from './components/Analytics/EnhancedAnalyticsDashboard';
import EnhancedDeepMindDashboard from './components/AI/EnhancedDeepMindDashboard';
import PopulationInfoPanel from './components/Earth3D/PopulationInfoPanel';
import WarZoneInfoPanel from './components/Earth3D/WarZoneInfoPanel';
import DetailedEarthLayer from './components/Earth3D/DetailedEarthLayer';

import { useLocationData } from './hooks/useLocationData';
import { useAuthStore } from './store/authStore';
import { algorandService } from './lib/apis/algorand';
import { authService } from './lib/auth/authService';
import { cellularContract } from './lib/blockchain/contracts';
import { telefonicaGatewayService } from './lib/apis/telefonicaGateway';
import { dataCollector } from './lib/analytics/dataCollector';
import { enhancedDeepMindService } from './lib/ai/enhancedDeepMindService';

function App() {
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'degraded' | 'failed'>('connecting');
  
  // Auth modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Search functionality
  const [searchVisible, setSearchVisible] = useState(false);
  
  // Earth visualization controls with enhanced layer management
  const [satellitesVisible, setSatellitesVisible] = useState(false);
  const [connectivityVisible, setConnectivityVisible] = useState(true);
  const [cloudsVisible, setCloudsVisible] = useState(true);
  const [epicImageVisible, setEpicImageVisible] = useState(false); // State for EPIC Image Layer
  const [isDayMode, setIsDayMode] = useState(true);
  const [layersVisible, setLayersVisible] = useState(false);
  const [mapMode, setMapMode] = useState<'satellite' | 'terrain' | 'hybrid' | 'streets'>('satellite');
  const [populationVisible, setPopulationVisible] = useState(true);
  const [populationInfoVisible, setPopulationInfoVisible] = useState(false);
  
  // War zone state
  const [selectedWarZone, setSelectedWarZone] = useState<{
    name: string;
    description: string;
    casualties: string;
    started: string;
    latestUpdate: string;
  } | null>(null);
  
  // Camera controls
  const [cameraTarget, setCameraTarget] = useState<Vector3 | undefined>();
  const [currentZoom, setCurrentZoom] = useState(10);
  const controlsRef = useRef<any>();

  // Analytics dashboard
  const [analyticsDashboardOpen, setAnalyticsDashboardOpen] = useState(false);
  
  // DeepMind training dashboard
  const [deepMindDashboardOpen, setDeepMindDashboardOpen] = useState(false);
  
  // Kaggle export modal
  // const [kaggleExportOpen, setKaggleExportOpen] = useState(false); // No longer on main panel
  // const [selectedTable, setSelectedTable] = useState<string>('social_engagement_analytics'); // No longer on main panel

  // New Modals/Views
const [askDeepMindModalOpen, setAskDeepMindModalOpen] = useState(false);
  const [simulationCenterModalOpen, setSimulationCenterModalOpen] = useState(false);

  const { user, setUser, setLoading } = useAuthStore();
  const { location, loading, error } = useLocationData(selectedCoordinates);

  useEffect(() => {
    // Initialize the application with enhanced error handling
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing ItsEarth powered by Cellular Neural Network...');
        setConnectionStatus('connecting');
        
        // Check for existing user session
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          console.log('✅ User session restored');
        }

        // Enhanced connection with graceful degradation
        console.log('🔗 Establishing connection to Algorand MAINNET...');
        
        // Test basic connection first with timeout
        const connectionTest = await Promise.race([
          algorandService.testConnection(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10000)) // 10 second timeout
        ]);

        if (!connectionTest) {
          console.warn('⚠️ Basic connection test failed or timed out, continuing with degraded mode...');
          setConnectionStatus('degraded');
        }

        // Get network status with error handling
        let status;
        try {
          status = await Promise.race([
            algorandService.getNetworkStatus(),
            new Promise<any>((resolve) => setTimeout(() => resolve(null), 8000)) // 8 second timeout
          ]);
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.warn('⚠️ Network status fetch failed:', error.message);
          status = null;
        }

        if (status && status.connectionStatus !== 'failed') {
          setNetworkStatus(status);
          console.log('📊 Network Status:', {
            network: status.network,
            lastRound: status.lastRound,
            connectionStatus: status.connectionStatus
          });
        } else {
          // Create fallback status
          setNetworkStatus({
            network: 'mainnet',
            lastRound: 0,
            connectionStatus: 'degraded',
            note: 'Running in offline mode'
          });
          console.log('📊 Using fallback network status');
        }

        // Verify connection with timeout
        let isMainnetConnected = false;
        try {
          isMainnetConnected = await Promise.race([
            algorandService.verifyMainnetConnection(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5 second timeout
          ]);
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.warn('⚠️ Connection verification failed:', error.message);
        }
        
        if (isMainnetConnected) {
          console.log('🎉 MAINNET connection verified successfully');
          setConnectionStatus('connected');
        } else {
          console.warn('⚠️ MAINNET verification failed, running in degraded mode');
          setConnectionStatus('degraded');
        }

        // Initialize smart contract with error handling
        try {
          const contractStats = await cellularContract.getNetworkStats();
          console.log('📋 Smart contract stats:', contractStats);
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.warn('⚠️ Smart contract initialization failed:', error.message);
        }

        // Initialize Telefonica Open Gateway
        try {
          console.log('📱 Initializing Telefonica Open Gateway...');
          await telefonicaGatewayService.getConnectivityData();
          console.log('✅ Telefonica Open Gateway initialized');
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.warn('⚠️ Telefonica Open Gateway initialization failed:', error.message);
        }

        // Initialize data collection for analytics
        try {
          console.log('📊 Initializing data collection for analytics...');
          dataCollector.startCollection(30); // Collect data every 30 minutes
          console.log('✅ Data collection initialized');
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.warn('⚠️ Data collection initialization failed:', error.message);
        }
        
        // Initialize enhanced DeepMind service
        try {
          console.log('🧠 Initializing Enhanced DeepMind service...');
          await enhancedDeepMindService.initialize();
          console.log('✅ Enhanced DeepMind service initialized');
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.warn('⚠️ Enhanced DeepMind service initialization failed:', error.message);
        }

        console.log('🎉 ItsEarth application initialized successfully');

      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('❌ Failed to initialize app:', error);
        setConnectionStatus('failed');
        
        // Set minimal fallback state to allow app to continue
        setNetworkStatus({
          network: 'mainnet',
          lastRound: 0,
          connectionStatus: 'failed',
          error: error.message
        });
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [setUser, setLoading]);

  const handleLocationClick = async (coordinates: [number, number]) => {
    // Check if user needs to sign up for more interactions
    if (user) {
      const { canInteract } = await authService.checkDailyLimit(user.id);
      
      if (!canInteract && user.subscription_tier === 'free') {
        setPricingModalOpen(true);
        return;
      }
    }

    setSelectedCoordinates(coordinates);
  };

  const handleLocationSelect = (coordinates: [number, number], name: string) => {
    console.log('🌍 Selected location:', name, coordinates);
    
    // Convert coordinates to 3D position for camera animation
    const [lng, lat] = coordinates;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = 6; // Zoom in closer for selected locations

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    setCameraTarget(new Vector3(x, y, z));
    setCurrentZoom(6);
    handleLocationClick(coordinates);
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const newZoom = Math.max(3, currentZoom - 2);
      setCurrentZoom(newZoom);
      controlsRef.current.dollyIn(1.3);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const newZoom = Math.min(25, currentZoom + 2);
      setCurrentZoom(newZoom);
      controlsRef.current.dollyOut(1.3);
      controlsRef.current.update();
    }
  };

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setCurrentZoom(10);
      setCameraTarget(undefined);
      setSelectedCoordinates(null);
    }
  };

  const handleClosePanel = () => {
    setSelectedCoordinates(null);
    setCameraTarget(undefined);
    setCurrentZoom(10);
  };

  const handleLoadingComplete = () => {
    setAppReady(true);
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleMapModeChange = (mode: 'satellite' | 'terrain' | 'hybrid' | 'streets') => {
    setMapMode(mode);
  };
  
  // const openKaggleExport = (tableName: string) => { // No longer on main panel
  //   setSelectedTable(tableName);
  //   setKaggleExportOpen(true);
  // };

  const handleTogglePopulation = () => {
    setPopulationVisible(!populationVisible);
    
    // Show population info panel when enabling population
    if (!populationVisible) {
      setPopulationInfoVisible(true);
    } else {
      setPopulationInfoVisible(false);
    }
  };

  const handleWarZoneSelect = (warZone: {
    name: string;
    description: string;
    casualties: string;
    started: string;
    latestUpdate: string;
  }) => {
    setSelectedWarZone(warZone);
  };

  // Show loading screen first
  if (!appReady) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Show initialization screen with enhanced status
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-deep via-surface-mid to-surface-light flex items-center justify-center">
        <div className="text-center">
          <div className="neural-indicator w-16 h-16 mx-auto mb-4" style={{ width: '64px', height: '64px' }} />
          <h1 className="text-3xl font-bold text-white mb-2">ItsEarth</h1>
          <p className="text-gray-400 mb-4">Connecting to Earth's Neural Network...</p>
          
          {/* Enhanced connection status */}
          <div className="space-y-2 mb-4">
            <p className={`text-sm ${
              connectionStatus === 'connected' ? 'text-accent-neural' : 
              connectionStatus === 'degraded' ? 'text-yellow-400' :
              connectionStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {connectionStatus === 'connecting' && '🔗 Connecting to Cellular Network...'}
              {connectionStatus === 'connected' && '✅ Connected to Cellular Network'}
              {connectionStatus === 'degraded' && '⚠️ Connected with limited functionality'}
              {connectionStatus === 'failed' && '❌ Running in offline mode'}
            </p>
            <p className="text-sm text-accent-neural">📡 Loading NASA satellite imagery...</p>
            <p className="text-sm text-blue-400">📱 Initializing Telefonica connectivity...</p>
            <p className="text-sm text-purple-400">📊 Preparing analytics dashboard...</p>
            <p className="text-sm text-purple-400">🧠 Initializing DeepMind with Kaggle datasets...</p>
          </div>
          
          {networkStatus && (
            <div className="text-sm text-accent-neural">
              🌐 Algorand {networkStatus.network.toUpperCase()} 
              {networkStatus.lastRound > 0 && ` • Block #${networkStatus.lastRound}`}
              {networkStatus.connectionStatus === 'degraded' && ' • Limited Mode'}
              {networkStatus.connectionStatus === 'failed' && ' • Offline Mode'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1B263B',
            color: '#ffffff',
            border: '1px solid rgba(0, 255, 170, 0.2)'
          }
        }}
      />

      {/* Neural Grid Background */}
      <NeuralBackground />
      
      {/* Floating Data Particles */}
      <FloatingParticles />
      
      {/* 3D Earth Canvas with Enhanced Google Earth Integration */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00FFAA" />
          
          {/* Enhanced Earth with multiple map modes */}
          <EnhancedEarth 
            locations={location ? [location] : []}
            selectedLocation={location}
            onLocationSelect={(loc) => handleLocationClick(loc.coordinates)}
            showSatellites={satellitesVisible}
            showConnectivity={connectivityVisible}
            showPopulation={populationVisible}
            showWarZones={true}
            mapMode={mapMode}
            dayNightCycle={isDayMode}
            targetPosition={cameraTarget}
            targetZoom={currentZoom}
            onWarZoneSelect={handleWarZoneSelect}
            showEpicImage={epicImageVisible} // Pass state to EnhancedEarth
          />
          
          {/* Detailed Earth Layer for zoomed-in views */}
          {selectedCoordinates && (
            <DetailedEarthLayer
              visible={currentZoom <= 6}
              coordinates={selectedCoordinates}
              zoom={currentZoom}
              mapMode={mapMode}
            />
          )}
          
          <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade />
          <OrbitControls 
            ref={controlsRef}
            enableZoom={true}
            enablePan={true}
            autoRotate={false}
            autoRotateSpeed={0.2}
            minDistance={3}
            maxDistance={25}
            enableDamping={true}
            dampingFactor={0.05}
            onChange={() => {
              if (controlsRef.current) {
                const distance = controlsRef.current.getDistance();
                setCurrentZoom(distance);
              }
            }}
          />
        </Canvas>
      </div>

      {/* Google Earth Style Controls */}
      <GoogleEarthControls
        onSearch={() => setSearchVisible(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onToggleLayers={() => setLayersVisible(!layersVisible)}
        onToggleSatellites={() => setSatellitesVisible(!satellitesVisible)}
        onToggleClouds={() => setCloudsVisible(!cloudsVisible)}
        onToggleDayNight={() => setIsDayMode(!isDayMode)}
        onToggleConnectivity={() => setConnectivityVisible(!connectivityVisible)}
        onTogglePopulation={handleTogglePopulation}
        currentZoom={currentZoom}
        satellitesVisible={satellitesVisible}
        cloudsVisible={cloudsVisible}
        isDayMode={isDayMode}
        layersVisible={layersVisible}
        connectivityVisible={connectivityVisible}
        populationVisible={populationVisible}
        onMapModeChange={handleMapModeChange}
        onToggleEpicImage={() => setEpicImageVisible(!epicImageVisible)} // Pass toggle handler
        epicImageVisible={epicImageVisible} // Pass visibility state
      />

      {/* Population Info Panel */}
      <AnimatePresence>
        {populationInfoVisible && (
          <PopulationInfoPanel 
            isVisible={populationInfoVisible}
            onClose={() => setPopulationInfoVisible(false)}
          />
        )}
      </AnimatePresence>

      {/* War Zone Info Panel */}
      <AnimatePresence>
        {selectedWarZone && (
          <WarZoneInfoPanel
            warZone={selectedWarZone}
            onClose={() => setSelectedWarZone(null)}
          />
        )}
      </AnimatePresence>

      {/* Location Search Modal */}
      <AnimatePresence>
        {searchVisible && (
          <LocationSearch
            onLocationSelect={handleLocationSelect}
            isVisible={searchVisible}
            onClose={() => setSearchVisible(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Header */}
      <motion.header 
        className="absolute top-8 left-8 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <nav className="bio-nav flex items-center gap-8 px-8 py-4">
          <div className="flex items-center gap-3">
            <Globe className="text-accent-neural" size={24} />
            <div className="text-2xl font-bold text-accent-neural">
              ItsEarth
            </div>
          </div>
          
          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <UserMenu onOpenPricing={() => setPricingModalOpen(true)} />
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => openAuth('signin')}
                  className="text-accent-neural hover:text-accent-pulse transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="bg-accent-neural text-surface-deep px-4 py-2 rounded-full font-medium hover:bg-accent-pulse transition-colors"
                >
                  Start Free
                </button>
              </div>
            )}
          </div>
        </nav>
      </motion.header>

      {/* Welcome Panel */}
      <motion.div 
        className="absolute bottom-20 left-20 z-10 max-w-2xl"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <h1 className="text-6xl font-bold mb-6 leading-tight">
          ItsEarth:{' '}
          <span className="bg-gradient-to-r from-accent-neural to-accent-pulse bg-clip-text text-transparent">
            Visualizing Global Interconnectivity
          </span>
        </h1>
        <p className="text-xl text-surface-air mb-8 leading-relaxed">
          Explore a living digital twin of Earth. Analyze real-time human connectivity, social media trends, geopolitical events, and simulate complex global movements. Uncover deep insights with AI-powered analytics.
        </p>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button 
              className="neural-button"
              onClick={() => setSearchVisible(true)}
            >
              🔍 Search Earth
            </button>
            <button 
              className="neural-button"
onClick={() => setAskDeepMindModalOpen(true)} // New Action
            >
🗣️ Ask DeepMind
            </button>
          </div>
          <div className="flex gap-4">
            <button 
              className="bg-transparent border border-accent-neural text-accent-neural px-4 py-2 rounded-full hover:bg-accent-neural hover:text-white transition-colors"
              onClick={() => setAnalyticsDashboardOpen(true)}
            >
              <BarChart3 size={16} className="inline mr-2" />
              View Analytics Dashboard
            </button>
            
            <button 
              className="bg-transparent border border-purple-400 text-purple-400 px-4 py-2 rounded-full hover:bg-purple-400/10 transition-colors"
              onClick={() => setSimulationCenterModalOpen(true)} // New Action
            >
              🚀 Simulation Center
            </button>
            
            {/* Kaggle Export button removed from here, can be accessed from DeepMind Dashboard */}
          </div>
          {networkStatus && (
            <div className="text-sm text-accent-neural">
              🌐 Powered by Cellular Network
              {networkStatus.lastRound > 0 && ` • Block #${networkStatus.lastRound}`}
              {connectionStatus === 'degraded' && ' • Limited Mode'}
              {connectionStatus === 'failed' && ' • Offline Mode'}
            </div>
          )}
          <div className="text-sm text-gray-400">
            🛰️ Real-time NASA satellite imagery • 🤖 AI location consciousness • 📱 Telefonica connectivity data • 📊 Advanced analytics dashboard
          </div>
        </div>
      </motion.div>

      {/* Enhanced Network Statistics with Connectivity */}
      <NetworkStats
        activeLocations={location ? 1 : 0}
        totalConnections={networkStatus ? 1 : 0}
        dataPoints={networkStatus?.lastRound ?? 0}
        memoryBlocks={networkStatus?.lastRound ? Math.floor(networkStatus.lastRound / 1000) : 0}
      />

      {/* Loading Indicator */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className="bg-surface-deep/90 backdrop-blur-lg rounded-lg p-6 flex items-center gap-3">
            <Loader className="animate-spin text-accent-neural" size={24} />
            <span className="text-white">Awakening location consciousness...</span>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <div className="bg-error-coral/90 backdrop-blur-lg rounded-lg p-4 text-white max-w-sm">
            <h3 className="font-semibold mb-2">Connection Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Location Panel */}
      <AnimatePresence>
        {location && (
          <LocationPanel
            location={location}
            onClose={handleClosePanel}
          />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

      {/* Pricing Modal */}
      <PricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
      />

      {/* Enhanced Analytics Dashboard */}
      <EnhancedAnalyticsDashboard
        isOpen={analyticsDashboardOpen}
        onClose={() => setAnalyticsDashboardOpen(false)}
      />
      
      {/* Enhanced DeepMind Training Dashboard */}
      <EnhancedDeepMindDashboard
        isOpen={deepMindDashboardOpen}
        onClose={() => setDeepMindDashboardOpen(false)}
      />
      
      {/* Kaggle Export Modal */}
      {/* KaggleExportModal no longer triggered from main App panel 
      <KaggleExportModal
        isOpen={kaggleExportOpen}
        onClose={() => setKaggleExportOpen(false)}
        tableName={selectedTable}
      />
      */}

      {/* Placeholder for new Modals - to be implemented later */}
{askDeepMindModalOpen && (
<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={() => setAskDeepMindModalOpen(false)}>
          <div className="bg-surface-deep p-8 rounded-lg text-white" onClick={(e) => e.stopPropagation()}>
Ask DeepMind Modal (To be implemented)
<button onClick={() => setAskDeepMindModalOpen(false)} className="mt-4 p-2 bg-red-500 rounded">Close</button>
          </div>
        </div>
      )}

      {simulationCenterModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={() => setSimulationCenterModalOpen(false)}>
          <div className="bg-surface-deep p-8 rounded-lg text-white" onClick={(e) => e.stopPropagation()}>
            Simulation Center Modal (To be implemented)
            <button onClick={() => setSimulationCenterModalOpen(false)} className="mt-4 p-2 bg-red-500 rounded">Close</button>
          </div>
        </div>
      )}

      {/* Bolt Attribution */}
      <BoltAttribution />
    </div>
  );
}

export default App
