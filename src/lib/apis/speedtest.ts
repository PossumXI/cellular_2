import { config } from '../config';
import { supabase } from '../supabase';

export interface SpeedTestResult {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  jitter: number; // ms
  serverLocation: string;
  timestamp: Date;
  userLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  deviceInfo: {
    userAgent: string;
    connection?: string;
    platform: string;
  };
  ipAddress?: string;
  hostname?: string;
}

export interface NetworkAnalytics {
  id: string;
  user_id?: string;
  coordinates: [number, number];
  location_name: string;
  download_speed: number;
  upload_speed: number;
  latency: number;
  jitter: number;
  server_location: string;
  device_info: any;
  test_timestamp: string;
  created_at: string;
}

export interface SpeedTestProgress {
  type: 'latency' | 'download' | 'upload';
  pass: number;
  percentDone: number;
  currentSpeed?: number;
}

// Declare global SomApi object
declare global {
  interface Window {
    SomApi: {
      account: string;
      domainName: string;
      config: {
        sustainTime: number;
        testServerEnabled: boolean;
        userInfoEnabled: boolean;
        latencyTestEnabled: boolean;
        uploadTestEnabled: boolean;
        progress: {
          enabled: boolean;
          verbose: boolean;
        };
      };
      startTest: () => void;
      onTestCompleted: (result: any) => void;
      onProgress: (progress: any) => void;
      onError: (error: any) => void;
      testResult: any;
      isReady?: boolean;
    };
  }
}

export class SpeedTestService {
  private apiKey = config.speedtest.apiKey;
  private domainName = config.speedtest.domainName;
  private isTestRunning = false;
  private progressCallback?: (progress: SpeedTestProgress) => void;
  private apiInitialized = false;
  private initializationAttempts = 0;
  private maxInitAttempts = 30; // 30 seconds max wait
  private progressTimeoutId?: NodeJS.Timeout;

  constructor() {
    this.initializeSomApi();
  }

  private initializeSomApi() {
    // Wait for SomApi to be available with better error handling
    const checkSomApi = () => {
      this.initializationAttempts++;
      
      if (typeof window !== 'undefined' && window.SomApi) {
        console.log('✅ SpeedOf.Me API loaded successfully');
        
        try {
          // Configure SomApi with real credentials
          window.SomApi.account = this.apiKey;
          window.SomApi.domainName = this.domainName;
          
          // Configure test settings for real data with increased sustain time
          window.SomApi.config = {
            sustainTime: 10, // Increased from 3 to 10 seconds for better reliability
            testServerEnabled: true,
            userInfoEnabled: true,
            latencyTestEnabled: true,
            uploadTestEnabled: true,
            progress: {
              enabled: true,
              verbose: true
            }
          };
          
          console.log('🔧 SpeedOf.Me API configured successfully:', {
            account: this.apiKey.substring(0, 8) + '...',
            domain: this.domainName,
            sustainTime: window.SomApi.config.sustainTime
          });
          
          // Increased delay from 500ms to 2000ms for better initialization
          setTimeout(() => {
            window.SomApi.isReady = true;
            this.apiInitialized = true;
            console.log('🚀 SpeedOf.Me API fully initialized and ready');
          }, 2000); // Increased delay for internal setup
          
          return;
        } catch (configError) {
          console.error('❌ Error configuring SpeedOf.Me API:', configError);
        }
      }
      
      if (this.initializationAttempts >= this.maxInitAttempts) {
        console.error('❌ SpeedOf.Me API failed to load after 30 seconds');
        return;
      }
      
      console.log(`⏳ Waiting for SpeedOf.Me API... (${this.initializationAttempts}/${this.maxInitAttempts})`);
      setTimeout(checkSomApi, 1000); // Check every second
    };
    
    checkSomApi();
  }

  async runSpeedTest(
    userLocation?: { lat: number; lng: number; accuracy: number },
    locationName?: string,
    onProgress?: (progress: SpeedTestProgress) => void
  ): Promise<SpeedTestResult | null> {
    if (this.isTestRunning) {
      throw new Error('Speed test already in progress');
    }

    if (!this.apiInitialized || !window.SomApi || !window.SomApi.isReady) {
      console.error('❌ SpeedOf.Me API not ready');
      throw new Error('SpeedOf.Me API not ready. Please wait for initialization or refresh the page.');
    }

    this.isTestRunning = true;
    this.progressCallback = onProgress;

    try {
      console.log('🚀 Starting REAL SpeedOf.Me speed test...');
      
      // Clear any previous test results
      if (window.SomApi.testResult) {
        window.SomApi.testResult = null;
      }
      
      const testResult = await this.performRealSpeedOfMeTest();
      
      if (testResult) {
        // Log real analytics to our database
        await this.logSpeedTestAnalytics(testResult, userLocation, locationName);
        
        console.log('✅ REAL speed test completed:', testResult);
        return testResult;
      }
      
      throw new Error('Speed test completed but returned no results');
    } catch (error) {
      console.error('❌ Real speed test failed:', error);
      throw error;
    } finally {
      this.isTestRunning = false;
      this.progressCallback = undefined;
      if (this.progressTimeoutId) {
        clearTimeout(this.progressTimeoutId);
        this.progressTimeoutId = undefined;
      }
    }
  }

  private async performRealSpeedOfMeTest(): Promise<SpeedTestResult | null> {
    return new Promise((resolve, reject) => {
      const testTimeout = 120000; // 2 minutes timeout
      const progressTimeout = 60000; // Increased from 45 to 60 seconds without progress = timeout
      
      let lastProgressTime = Date.now();
      let timeoutId: NodeJS.Timeout;
      
      // Set up progress timeout
      const resetProgressTimeout = () => {
        if (this.progressTimeoutId) clearTimeout(this.progressTimeoutId);
        this.progressTimeoutId = setTimeout(() => {
          console.warn('⚠️ Speed test timeout - no progress for 60 seconds, but continuing...');
          // Don't reject immediately, give more time for the test to complete
        }, progressTimeout);
      };
      
      resetProgressTimeout();
      
      // Set up callbacks for REAL data
      window.SomApi.onTestCompleted = (testResult: any) => {
        console.log('📊 REAL SpeedOf.Me test completed:', testResult);
        
        // Clear timeouts
        if (timeoutId) clearTimeout(timeoutId);
        if (this.progressTimeoutId) clearTimeout(this.progressTimeoutId);
        this.progressTimeoutId = undefined;
        
        // Validate that we got real data
        if (!testResult || typeof testResult !== 'object') {
          reject(new Error('Invalid test result format'));
          return;
        }
        
        // Extract data with fallbacks
        const downloadSpeed = parseFloat(testResult.download || testResult.downloadSpeed || '0');
        const uploadSpeed = parseFloat(testResult.upload || testResult.uploadSpeed || '0');
        const latency = parseFloat(testResult.latency || testResult.ping || '0');
        const jitter = parseFloat(testResult.jitter || '0');
        
        if (downloadSpeed <= 0) {
          reject(new Error('Invalid download speed - test may have failed'));
          return;
        }
        
        const result: SpeedTestResult = {
          downloadSpeed,
          uploadSpeed,
          latency,
          jitter,
          serverLocation: testResult.testServer || testResult.server || 'SpeedOf.Me Server',
          timestamp: new Date(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            connection: (navigator as any).connection?.effectiveType || 'unknown',
            platform: navigator.platform
          },
          ipAddress: testResult.ip_address || testResult.ip,
          hostname: testResult.hostname
        };
        
        // Validate realistic ranges
        if (result.downloadSpeed > 10000 || result.uploadSpeed > 10000) {
          console.warn('⚠️ Unusually high speeds detected, but accepting result');
        }
        
        console.log('✅ REAL speed test data validated:', {
          download: result.downloadSpeed,
          upload: result.uploadSpeed,
          latency: result.latency,
          server: result.serverLocation
        });
        
        resolve(result);
      };

      window.SomApi.onProgress = (progressObject: any) => {
        lastProgressTime = Date.now();
        resetProgressTimeout(); // Reset progress timeout on each update
        
        console.log('📈 Real-time progress:', progressObject);
        
        if (this.progressCallback && progressObject) {
          const progress: SpeedTestProgress = {
            type: (progressObject.type || 'download') as 'latency' | 'download' | 'upload',
            pass: parseInt(progressObject.pass || '0'),
            percentDone: parseFloat(progressObject.percentDone || '0'),
            currentSpeed: progressObject.currentSpeed ? parseFloat(progressObject.currentSpeed) : undefined
          };
          
          this.progressCallback(progress);
        }
      };

      window.SomApi.onError = (error: any) => {
        console.error('❌ SpeedOf.Me API error:', error);
        
        // Clear timeouts
        if (timeoutId) clearTimeout(timeoutId);
        if (this.progressTimeoutId) clearTimeout(this.progressTimeoutId);
        this.progressTimeoutId = undefined;
        
        const errorMessage = error?.message || error?.code || 'Unknown SpeedOf.Me error';
        reject(new Error(`SpeedOf.Me error: ${errorMessage}`));
      };

      // Start the REAL test with error handling and additional delay
      try {
        console.log('🔄 Starting SpeedOf.Me test...');
        
        // Increased delay from 100ms to 500ms before starting the test
        setTimeout(() => {
          try {
            window.SomApi.startTest();
          } catch (startError) {
            if (timeoutId) clearTimeout(timeoutId);
            if (this.progressTimeoutId) clearTimeout(this.progressTimeoutId);
            this.progressTimeoutId = undefined;
            console.error('❌ Error starting SpeedOf.Me test:', startError);
            reject(new Error(`Failed to start speed test: ${startError.message}`));
          }
        }, 500); // Increased delay before starting
        
        // Set overall timeout
        timeoutId = setTimeout(() => {
          if (this.progressTimeoutId) clearTimeout(this.progressTimeoutId);
          this.progressTimeoutId = undefined;
          reject(new Error('Speed test timeout - test took longer than 2 minutes'));
        }, testTimeout);
        
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (this.progressTimeoutId) clearTimeout(this.progressTimeoutId);
        this.progressTimeoutId = undefined;
        console.error('❌ Error starting SpeedOf.Me test:', error);
        reject(new Error(`Failed to start speed test: ${error.message}`));
      }
    });
  }

  private async logSpeedTestAnalytics(
    result: SpeedTestResult,
    userLocation?: { lat: number; lng: number; accuracy: number },
    locationName?: string
  ): Promise<void> {
    try {
      const coordinates: [number, number] = userLocation 
        ? [userLocation.lng, userLocation.lat]
        : [0, 0];

      const analyticsData = {
        coordinates,
        location_name: locationName || 'Unknown Location',
        download_speed: result.downloadSpeed,
        upload_speed: result.uploadSpeed,
        latency: result.latency,
        jitter: result.jitter,
        server_location: result.serverLocation,
        device_info: {
          ...result.deviceInfo,
          ip_address: result.ipAddress,
          hostname: result.hostname,
          test_type: 'speedofme_real',
          api_version: '2024'
        },
        test_timestamp: result.timestamp.toISOString()
      };

      // Store REAL data in our database
      const { error } = await supabase
        .from('network_analytics')
        .insert(analyticsData);

      if (error) {
        console.error('Failed to log speed test analytics:', error);
      } else {
        console.log('✅ Speed test analytics logged successfully');
      }
    } catch (error) {
      console.error('Error logging speed test analytics:', error);
    }
  }

  async getLocationNetworkAnalytics(coordinates: [number, number], radiusKm: number = 10): Promise<NetworkAnalytics[]> {
    try {
      const [lng, lat] = coordinates;
      
      // Query nearby speed test results
      const { data, error } = await supabase
        .from('network_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching network analytics:', error);
        return [];
      }

      // Filter by distance
      const filtered = (data || []).filter(record => {
        const [recordLng, recordLat] = record.coordinates;
        const distance = this.calculateDistance(lat, lng, recordLat, recordLng);
        return distance <= radiusKm;
      });

      console.log(`📊 Found ${filtered.length} speed test records within ${radiusKm}km`);
      return filtered;
    } catch (error) {
      console.error('Error getting location network analytics:', error);
      return [];
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async getGlobalNetworkStats(): Promise<{
    averageDownload: number;
    averageUpload: number;
    averageLatency: number;
    totalTests: number;
    topLocations: Array<{ location: string; avgSpeed: number; testCount: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('network_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return {
          averageDownload: 0,
          averageUpload: 0,
          averageLatency: 0,
          totalTests: 0,
          topLocations: []
        };
      }

      const totalTests = data.length;
      const averageDownload = data.reduce((sum, record) => sum + record.download_speed, 0) / totalTests;
      const averageUpload = data.reduce((sum, record) => sum + record.upload_speed, 0) / totalTests;
      const averageLatency = data.reduce((sum, record) => sum + record.latency, 0) / totalTests;

      // Group by location
      const locationStats = data.reduce((acc, record) => {
        const location = record.location_name;
        if (!acc[location]) {
          acc[location] = { totalSpeed: 0, count: 0 };
        }
        acc[location].totalSpeed += record.download_speed;
        acc[location].count += 1;
        return acc;
      }, {} as Record<string, { totalSpeed: number; count: number }>);

      const topLocations = Object.entries(locationStats)
        .map(([location, stats]) => ({
          location,
          avgSpeed: stats.totalSpeed / stats.count,
          testCount: stats.count
        }))
        .sort((a, b) => b.avgSpeed - a.avgSpeed)
        .slice(0, 10);

      console.log(`📊 Global stats: ${totalTests} tests, avg ${averageDownload.toFixed(1)} Mbps`);

      return {
        averageDownload,
        averageUpload,
        averageLatency,
        totalTests,
        topLocations
      };
    } catch (error) {
      console.error('Error getting global network stats:', error);
      return {
        averageDownload: 0,
        averageUpload: 0,
        averageLatency: 0,
        totalTests: 0,
        topLocations: []
      };
    }
  }

  // Check if SpeedOf.Me API is available and initialized
  isApiAvailable(): boolean {
    return typeof window !== 'undefined' && 
           !!window.SomApi && 
           this.apiInitialized && 
           window.SomApi.isReady === true;
  }

  // Get current test status
  isTestInProgress(): boolean {
    return this.isTestRunning;
  }

  // Validate API configuration
  validateApiConfig(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      issues.push('Invalid API key');
    }
    
    if (!this.domainName || this.domainName === 'your_domain_here') {
      issues.push('Invalid domain name');
    }
    
    if (typeof window === 'undefined') {
      issues.push('Not running in browser');
    } else if (!window.SomApi) {
      issues.push('SpeedOf.Me API script not loaded');
    } else if (!this.apiInitialized) {
      issues.push('API not initialized');
    } else if (!window.SomApi.isReady) {
      issues.push('API not ready');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Force re-initialization
  reinitialize(): void {
    this.apiInitialized = false;
    this.initializationAttempts = 0;
    this.initializeSomApi();
  }
}

export const speedTestService = new SpeedTestService();