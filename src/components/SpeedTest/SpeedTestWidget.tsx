import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  Download, 
  Upload, 
  Clock, 
  Zap, 
  Play, 
  Pause, 
  BarChart3,
  MapPin,
  Loader,
  CheckCircle,
  AlertCircle,
  Activity,
  Shield,
  RefreshCw
} from 'lucide-react';
import { speedTestService, SpeedTestResult, SpeedTestProgress } from '../../lib/apis/speedtest';

interface SpeedTestWidgetProps {
  coordinates?: [number, number];
  locationName?: string;
  onTestComplete?: (result: SpeedTestResult) => void;
  className?: string;
}

export default function SpeedTestWidget({ 
  coordinates, 
  locationName, 
  onTestComplete,
  className = '' 
}: SpeedTestWidgetProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SpeedTestProgress | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [apiValidation, setApiValidation] = useState<{ isValid: boolean; issues: string[] }>({ isValid: false, issues: [] });
  const [initializationProgress, setInitializationProgress] = useState(0);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    
    const checkApiStatus = () => {
      const validation = speedTestService.validateApiConfig();
      setApiValidation(validation);
      
      if (speedTestService.isApiAvailable()) {
        setApiStatus('ready');
        setInitializationProgress(100);
        console.log('✅ SpeedOf.Me API ready for real speed tests');
        if (checkInterval) clearInterval(checkInterval);
        if (progressInterval) clearInterval(progressInterval);
      } else if (validation.issues.length > 0) {
        // Check if it's just loading vs actual error
        const isLoading = validation.issues.some(issue => 
          issue.includes('not loaded') || 
          issue.includes('not initialized') || 
          issue.includes('not ready')
        );
        
        if (isLoading) {
          setApiStatus('loading');
        } else {
          setApiStatus('error');
          console.error('❌ SpeedOf.Me API configuration issues:', validation.issues);
          if (checkInterval) clearInterval(checkInterval);
          if (progressInterval) clearInterval(progressInterval);
        }
      } else {
        setApiStatus('loading');
      }
    };
    
    // Update progress bar during loading
    const updateProgress = () => {
      setInitializationProgress(prev => {
        if (prev >= 90) return prev; // Don't go to 100 until actually ready
        return prev + Math.random() * 10;
      });
    };
    
    checkApiStatus();
    
    // Check API status every second
    checkInterval = setInterval(checkApiStatus, 1000);
    
    // Update progress every 500ms during loading
    if (apiStatus === 'loading') {
      progressInterval = setInterval(updateProgress, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [apiStatus]);

  const runRealSpeedTest = async () => {
    if (isRunning || apiStatus !== 'ready') return;

    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      console.log('🚀 Starting REAL speed test with SpeedOf.Me API...');
      
      // Get user location if not provided
      let userLocation = coordinates ? {
        lat: coordinates[1],
        lng: coordinates[0],
        accuracy: 100
      } : undefined;

      if (!userLocation && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            });
          });
          
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          console.log('📍 Got user location for real test:', userLocation);
        } catch (geoError) {
          console.warn('⚠️ Geolocation failed, continuing without location:', geoError);
        }
      }

      // Run REAL speed test with progress callback
      const testResult = await speedTestService.runSpeedTest(
        userLocation, 
        locationName,
        (progressUpdate) => {
          console.log('📈 Real-time progress:', progressUpdate);
          setProgress(progressUpdate);
        }
      );
      
      if (testResult) {
        console.log('✅ REAL speed test completed:', testResult);
        setResult(testResult);
        onTestComplete?.(testResult);
      } else {
        throw new Error('Speed test completed but returned no results');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Real speed test failed';
      console.error('❌ Real speed test error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  const handleRetryInitialization = () => {
    setApiStatus('loading');
    setInitializationProgress(0);
    speedTestService.reinitialize();
  };

  const formatSpeed = (speed: number) => {
    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(1)} Gbps`;
    }
    return `${speed.toFixed(1)} Mbps`;
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 100) return 'text-green-400';
    if (speed >= 25) return 'text-blue-400';
    if (speed >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'download': return <Download size={16} />;
      case 'upload': return <Upload size={16} />;
      case 'latency': return <Clock size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'download': return 'Testing Download Speed';
      case 'upload': return 'Testing Upload Speed';
      case 'latency': return 'Measuring Latency & Jitter';
      default: return 'Running Speed Test';
    }
  };

  const getApiStatusDisplay = () => {
    switch (apiStatus) {
      case 'loading':
        return {
          icon: <Loader size={16} className="animate-spin" />,
          text: 'Loading SpeedOf.Me API...',
          color: 'text-yellow-400',
          showProgress: true
        };
      case 'ready':
        return {
          icon: <Shield size={16} />,
          text: 'Real Speed Test Ready',
          color: 'text-green-400',
          showProgress: false
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: 'API Configuration Error',
          color: 'text-red-400',
          showProgress: false
        };
    }
  };

  const statusDisplay = getApiStatusDisplay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface-mid rounded-xl p-6 border border-accent-neural/20 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Real Speed Test</h3>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
            SpeedOf.Me
          </span>
        </div>
        
        {locationName && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin size={12} />
            <span>{locationName}</span>
          </div>
        )}
      </div>

      {/* API Status */}
      <div className="mb-4 p-3 bg-surface-deep rounded-lg">
        <div className={`flex items-center gap-2 text-sm ${statusDisplay.color}`}>
          {statusDisplay.icon}
          <span>{statusDisplay.text}</span>
          {apiStatus === 'error' && (
            <button
              onClick={handleRetryInitialization}
              className="ml-auto p-1 hover:bg-surface-mid rounded"
              title="Retry initialization"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        
        {/* Initialization Progress */}
        {statusDisplay.showProgress && (
          <div className="mt-2">
            <div className="w-full bg-surface-mid rounded-full h-2">
              <div
                className="bg-gradient-to-r from-yellow-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${initializationProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Initializing API... {Math.round(initializationProgress)}%
            </div>
          </div>
        )}
        
        {/* Error Details */}
        {apiValidation.issues.length > 0 && apiStatus === 'error' && (
          <div className="mt-2 text-xs text-red-300">
            Issues: {apiValidation.issues.join(', ')}
          </div>
        )}
      </div>

      {/* Test Button */}
      {!isRunning && !result && (
        <button
          onClick={runRealSpeedTest}
          disabled={apiStatus !== 'ready'}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            apiStatus === 'ready'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Play size={18} />
          {apiStatus === 'ready' ? 'Start Real Speed Test' : 
           apiStatus === 'loading' ? 'Waiting for API...' : 'API Error'}
        </button>
      )}

      {/* Running Test */}
      {isRunning && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-blue-400">
            <Loader size={18} className="animate-spin" />
            <span>{progress ? getPhaseLabel(progress.type) : 'Initializing test...'}</span>
            {progress && getPhaseIcon(progress.type)}
          </div>
          
          {progress && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  {progress.type.charAt(0).toUpperCase() + progress.type.slice(1)} Test
                  {progress.pass > 0 && ` (Pass ${progress.pass})`}
                </span>
                <span className="text-white">{Math.round(progress.percentDone)}%</span>
              </div>
              
              <div className="w-full bg-surface-deep rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentDone}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              {progress.currentSpeed && progress.currentSpeed > 0 && (
                <div className="text-center">
                  <span className="text-sm text-gray-400">Current Speed: </span>
                  <span className="text-lg font-bold text-accent-neural">
                    {formatSpeed(progress.currentSpeed)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-center text-gray-500">
            Getting real data from SpeedOf.Me servers...
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
            <CheckCircle size={18} />
            <span className="font-medium">Real Speed Test Complete</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-deep rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Download size={14} className="text-green-400" />
                <span className="text-xs text-gray-400">Download</span>
              </div>
              <div className={`text-lg font-bold ${getSpeedColor(result.downloadSpeed)}`}>
                {formatSpeed(result.downloadSpeed)}
              </div>
            </div>
            
            <div className="bg-surface-deep rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Upload size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400">Upload</span>
              </div>
              <div className={`text-lg font-bold ${getSpeedColor(result.uploadSpeed)}`}>
                {formatSpeed(result.uploadSpeed)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-deep rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-yellow-400" />
                <span className="text-xs text-gray-400">Latency</span>
              </div>
              <div className="text-lg font-bold text-white">
                {result.latency.toFixed(0)}ms
              </div>
            </div>
            
            <div className="bg-surface-deep rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-purple-400" />
                <span className="text-xs text-gray-400">Jitter</span>
              </div>
              <div className="text-lg font-bold text-white">
                {result.jitter.toFixed(0)}ms
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Shield size={12} className="text-green-400" />
              <span>Real data from: {result.serverLocation}</span>
            </div>
            <div>Tested: {result.timestamp.toLocaleTimeString()}</div>
            {result.ipAddress && (
              <div>Your IP: {result.ipAddress}</div>
            )}
          </div>
          
          <button
            onClick={runRealSpeedTest}
            disabled={apiStatus !== 'ready'}
            className="w-full bg-surface-light text-gray-300 py-2 px-4 rounded-lg text-sm hover:bg-surface-air transition-colors disabled:opacity-50"
          >
            Run Test Again
          </button>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">Speed Test Failed</span>
          </div>
          <p className="text-xs text-red-300 mt-1">{error}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={runRealSpeedTest}
              disabled={apiStatus !== 'ready'}
              className="flex-1 bg-red-500/20 text-red-300 py-2 px-4 rounded-lg text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              Try Again
            </button>
            <button
              onClick={handleRetryInitialization}
              className="flex-1 bg-yellow-500/20 text-yellow-300 py-2 px-4 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors"
            >
              Reset API
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}