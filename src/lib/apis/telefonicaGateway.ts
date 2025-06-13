import { config } from '../config';

export interface TelefonicaConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  baseUrl: string;
}

export interface ConnectivityData {
  networkType: string;
  signalStrength: number;
  bandwidth: number;
  latency: number;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
}

export class TelefonicaOpenGatewayService {
  private config: TelefonicaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      clientId: config.telefonica.clientId,
      clientSecret: config.telefonica.clientSecret,
      redirectUrl: config.telefonica.redirectUrl,
      baseUrl: config.telefonica.baseUrl
    };
    
    console.log('📱 Telefonica Open Gateway service initialized');
    console.log('🔗 Sandbox Mode: Enhanced connectivity mapping');
  }

  async authenticate(): Promise<boolean> {
    try {
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return true;
      }

      console.log('🔐 Authenticating with Telefonica Open Gateway...');

      // Skip actual API call if credentials are missing
      if (!this.config.clientId || !this.config.clientSecret) {
        console.warn('⚠️ Telefonica credentials missing, using mock mode');
        return false;
      }

      const response = await fetch(`${this.config.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'connectivity location'
        })
      });

      if (!response.ok) {
        console.warn('⚠️ Telefonica authentication failed, using mock mode');
        return false;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      console.log('✅ Telefonica Open Gateway authenticated successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ Telefonica authentication error, using mock mode:', error);
      return false;
    }
  }

  async getConnectivityData(phoneNumber?: string): Promise<ConnectivityData> {
    try {
      const isAuthenticated = await this.authenticate();
      
      if (!isAuthenticated) {
        return this.getMockConnectivityData();
      }

      // In sandbox mode, we'll use mock data but with realistic patterns
      return this.getMockConnectivityData();
    } catch (error) {
      console.error('Error fetching connectivity data:', error);
      return this.getMockConnectivityData();
    }
  }

  async getLocationFromConnectivity(phoneNumber?: string): Promise<{ lat: number; lng: number; accuracy: number } | null> {
    try {
      const isAuthenticated = await this.authenticate();
      
      if (!isAuthenticated) {
        return null;
      }

      // In production, this would use the actual Location API
      // For now, return null to use other location methods
      return null;
    } catch (error) {
      console.error('Error fetching location from connectivity:', error);
      return null;
    }
  }

  async getNetworkQuality(lat: number, lng: number): Promise<{
    signalStrength: number;
    networkType: string;
    bandwidth: number;
    latency: number;
  }> {
    try {
      const isAuthenticated = await this.authenticate();
      
      if (!isAuthenticated) {
        return this.getMockNetworkQuality(lat, lng);
      }

      // Skip API call if we're in development mode
      if (!this.accessToken) {
        return this.getMockNetworkQuality(lat, lng);
      }

      // Use Telefonica's network quality API
      const response = await fetch(`${this.config.baseUrl}/connectivity/v1/network-quality`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: {
            latitude: lat,
            longitude: lng
          }
        })
      });

      if (!response.ok) {
        return this.getMockNetworkQuality(lat, lng);
      }

      const data = await response.json();
      return {
        signalStrength: data.signalStrength || 85,
        networkType: data.networkType || '5G',
        bandwidth: data.bandwidth || 100,
        latency: data.latency || 20
      };
    } catch (error) {
      console.error('Error fetching network quality:', error);
      return this.getMockNetworkQuality(lat, lng);
    }
  }

  private getMockConnectivityData(): ConnectivityData {
    // Generate realistic mock data based on time and location patterns
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;
    
    return {
      networkType: Math.random() > 0.3 ? '5G' : '4G',
      signalStrength: Math.round(70 + Math.random() * 25), // 70-95%
      bandwidth: Math.round((isBusinessHours ? 80 : 120) + Math.random() * 40), // Mbps
      latency: Math.round((isBusinessHours ? 25 : 15) + Math.random() * 10), // ms
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Around NYC
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
        accuracy: Math.round(10 + Math.random() * 40) // 10-50m accuracy
      }
    };
  }

  private getMockNetworkQuality(lat: number, lng: number): {
    signalStrength: number;
    networkType: string;
    bandwidth: number;
    latency: number;
  } {
    // Generate location-based mock data
    const isUrban = Math.abs(lat) < 60 && Math.abs(lng) < 120; // Rough urban area detection
    const baseSignal = isUrban ? 85 : 70;
    const baseBandwidth = isUrban ? 100 : 50;
    const baseLatency = isUrban ? 15 : 30;

    return {
      signalStrength: Math.round(baseSignal + (Math.random() - 0.5) * 20),
      networkType: Math.random() > (isUrban ? 0.2 : 0.6) ? '5G' : '4G',
      bandwidth: Math.round(baseBandwidth + (Math.random() - 0.5) * 40),
      latency: Math.round(baseLatency + (Math.random() - 0.5) * 10)
    };
  }

  // Enhanced location consciousness with connectivity data
  async enhanceLocationWithConnectivity(lat: number, lng: number): Promise<{
    connectivity: ConnectivityData;
    networkQuality: any;
    digitalFootprint: {
      connectedDevices: number;
      dataTraffic: number;
      networkLoad: number;
    };
  }> {
    try {
      const [connectivity, networkQuality] = await Promise.all([
        this.getConnectivityData(),
        this.getNetworkQuality(lat, lng)
      ]);

      // Calculate digital footprint based on connectivity
      const digitalFootprint = {
        connectedDevices: Math.round(50 + Math.random() * 200), // Estimated devices in area
        dataTraffic: Math.round(connectivity.bandwidth * 0.7), // GB/hour
        networkLoad: Math.round((100 - connectivity.signalStrength) * 1.2) // Load percentage
      };

      return {
        connectivity,
        networkQuality,
        digitalFootprint
      };
    } catch (error) {
      console.error('Error enhancing location with connectivity:', error);
      return {
        connectivity: this.getMockConnectivityData(),
        networkQuality: this.getMockNetworkQuality(lat, lng),
        digitalFootprint: {
          connectedDevices: 100,
          dataTraffic: 50,
          networkLoad: 30
        }
      };
    }
  }
}

export const telefonicaGatewayService = new TelefonicaOpenGatewayService();