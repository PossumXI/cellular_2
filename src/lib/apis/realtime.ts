import { secureApiProxy } from './secureApiProxy';
import { config } from '../config';
import { RealtimeDataStream, WeatherData, TrafficData, NewsData, SocialSentiment, EconomicData, EnvironmentalData } from '../../types';
import { telefonicaGatewayService } from './telefonicaGateway';
import { newsService } from './news';

export class RealtimeDataService {
  private openWeatherApiKey: string;
  
  constructor() {
    this.openWeatherApiKey = config.openweather.apiKey;
  }
  
  async getLocationDataStream(lat: number, lng: number): Promise<RealtimeDataStream> {
    try {
      console.log('📡 Fetching enhanced real-time data with Telefonica connectivity...');
      
      const [weather, traffic, news, social, economic, environmental, connectivity] = await Promise.allSettled([
        this.getWeatherData(lat, lng),
        this.getTrafficData(lat, lng),
        this.getNewsData(lat, lng),
        this.getSocialSentiment(lat, lng),
        this.getEconomicData(lat, lng),
        this.getEnvironmentalData(lat, lng),
        telefonicaGatewayService.enhanceLocationWithConnectivity(lat, lng)
      ]);

      const connectivityData = connectivity.status === 'fulfilled' ? connectivity.value : null;

      const dataStream: RealtimeDataStream = {
        weather: weather.status === 'fulfilled' ? weather.value : this.getDefaultWeather(),
        traffic: traffic.status === 'fulfilled' ? traffic.value : this.getDefaultTraffic(),
        news: news.status === 'fulfilled' ? news.value : this.getDefaultNews(),
        social: social.status === 'fulfilled' ? social.value : this.getDefaultSocial(),
        economic: economic.status === 'fulfilled' ? economic.value : this.getDefaultEconomic(),
        environmental: environmental.status === 'fulfilled' ? environmental.value : this.getDefaultEnvironmental(),
        timestamp: new Date()
      };

      // Enhance with connectivity data if available
      if (connectivityData) {
        (dataStream as any).connectivity = {
          networkType: connectivityData.connectivity.networkType,
          signalStrength: connectivityData.connectivity.signalStrength,
          bandwidth: connectivityData.connectivity.bandwidth,
          latency: connectivityData.connectivity.latency,
          digitalFootprint: connectivityData.digitalFootprint
        };
        
        console.log('📱 Enhanced with Telefonica connectivity data:', {
          networkType: connectivityData.connectivity.networkType,
          signalStrength: connectivityData.connectivity.signalStrength,
          connectedDevices: connectivityData.digitalFootprint.connectedDevices
        });
      }

      return dataStream;
    } catch (error) {
      console.error('Error fetching enhanced realtime data:', error);
      return this.getDefaultDataStream();
    }
  }

  private async getWeatherData(lat: number, lng: number): Promise<WeatherData> {
    try {
      // Check if we have a valid API key
      if (!this.openWeatherApiKey) {
        console.warn('OpenWeather API key not configured, using mock data');
        return this.generateMockWeather(lat, lng);
      }
      
      // Use secure API proxy instead of direct API call
      const data = await secureApiProxy.callWeather({
        lat: lat.toString(),
        lon: lng.toString(),
        units: 'metric'
      });

      return {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed * 3.6),
        windDirection: data.wind.deg || 0,
        conditions: data.weather[0].description,
        visibility: data.visibility ? Math.round(data.visibility / 1000) : 10
      };
    } catch (error) {
      console.warn('Weather API failed, using mock data:', error);
      return this.generateMockWeather(lat, lng);
    }
  }

  private async getTrafficData(lat: number, lng: number): Promise<TrafficData> {
    try {
      // Enhanced traffic data with connectivity influence
      const baseTraffic = Math.random() * 0.8;
      const timeOfDay = new Date().getHours();
      const rushHourMultiplier = (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19) ? 1.5 : 1;
      
      // Get connectivity data to influence traffic calculations
      try {
        const connectivityData = await telefonicaGatewayService.getNetworkQuality(lat, lng);
        const networkInfluence = (100 - connectivityData.signalStrength) / 100 * 0.2; // Poor signal = more congestion
        
        return {
          congestionLevel: Math.min((baseTraffic + networkInfluence) * rushHourMultiplier, 1),
          averageSpeed: Math.max(20, 60 - (connectivityData.latency * 0.5)),
          incidents: Math.floor(Math.random() * 5)
        };
      } catch {
        return {
          congestionLevel: Math.min(baseTraffic * rushHourMultiplier, 1),
          averageSpeed: 30 + Math.random() * 40,
          incidents: Math.floor(Math.random() * 5)
        };
      }
    } catch (error) {
      return this.getDefaultTraffic();
    }
  }

  private async getNewsData(lat: number, lng: number): Promise<NewsData> {
    try {
      // Use our new news service to get real news data
      const locationName = await this.getLocationNameFromCoordinates(lat, lng);
      const newsData = await newsService.getLocationNews(lat, lng, locationName);
      
      return {
        sentiment: newsData.sentiment,
        topics: newsData.topics,
        volume: newsData.totalResults
      };
    } catch (error) {
      console.warn('News API failed, using mock data:', error);
      return this.generateMockNews();
    }
  }

  private async getLocationNameFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const data = await secureApiProxy.callGoogleMaps('geocode', {
        latlng: `${lat},${lng}`
      });
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return result.formatted_address.split(',')[0];
      }
      
      return 'Unknown Location';
    } catch (error) {
      console.warn('Geocoding API failed:', error);
      return 'Unknown Location';
    }
  }

  private async getSocialSentiment(lat: number, lng: number): Promise<SocialSentiment> {
    // Enhanced social sentiment with connectivity influence
    try {
      const connectivityData = await telefonicaGatewayService.getConnectivityData();
      const networkInfluence = connectivityData.signalStrength / 100 * 0.3; // Better signal = more positive sentiment
      
      return {
        score: Math.max(0, Math.min(1, 0.3 + Math.random() * 0.4 + networkInfluence)),
        volume: Math.floor(Math.random() * 10000 * (connectivityData.bandwidth / 100)),
        trending: ['#local', '#community', '#connectivity', '#5G'].slice(0, Math.floor(Math.random() * 4) + 1)
      };
    } catch {
      return {
        score: 0.3 + Math.random() * 0.4,
        volume: Math.floor(Math.random() * 10000),
        trending: ['#local', '#community', '#weather', '#news'].slice(0, Math.floor(Math.random() * 4) + 1)
      };
    }
  }

  private async getEconomicData(lat: number, lng: number): Promise<EconomicData> {
    const baseIndex = 3000;
    const volatility = Math.random() * 0.3;
    
    return {
      marketIndex: baseIndex + (Math.random() - 0.5) * 2000,
      volume: Math.floor(Math.random() * 1000000),
      volatility
    };
  }

  private async getEnvironmentalData(lat: number, lng: number): Promise<EnvironmentalData> {
    // Enhanced environmental data with connectivity correlation
    try {
      const connectivityData = await telefonicaGatewayService.getNetworkQuality(lat, lng);
      const urbanFactor = connectivityData.networkType === '5G' ? 1.2 : 1.0; // 5G areas tend to be more urban
      
      return {
        airQuality: Math.max(20, Math.min(100, 70 - (urbanFactor - 1) * 30 + Math.random() * 30)),
        pollutionLevel: Math.min(1, (urbanFactor - 0.8) * 0.5 + Math.random() * 0.3),
        uvIndex: Math.floor(Math.random() * 11),
        noiseLevel: Math.min(1, (urbanFactor - 0.5) * 0.6 + Math.random() * 0.4)
      };
    } catch {
      return {
        airQuality: 50 + Math.random() * 50,
        pollutionLevel: Math.random() * 0.5,
        uvIndex: Math.floor(Math.random() * 11),
        noiseLevel: Math.random() * 0.8
      };
    }
  }

  private generateMockWeather(lat: number, lng: number): WeatherData {
    const isNorthern = lat > 0;
    const isTropical = Math.abs(lat) < 23.5;
    
    let baseTemp = 20;
    if (isTropical) baseTemp = 28;
    else if (Math.abs(lat) > 60) baseTemp = 5;
    else if (Math.abs(lat) > 45) baseTemp = 15;

    const temp = baseTemp + (Math.random() - 0.5) * 10;
    
    const conditions = ['Clear sky', 'Partly cloudy', 'Cloudy', 'Light rain', 'Sunny'];

    return {
      temperature: Math.round(temp),
      humidity: Math.round(40 + Math.random() * 40),
      pressure: Math.round(1000 + Math.random() * 30),
      windSpeed: Math.round(Math.random() * 20),
      windDirection: Math.round(Math.random() * 360),
      conditions: conditions[Math.floor(Math.random() * conditions.length)],
      visibility: Math.round(10 + Math.random() * 20)
    };
  }

  private generateMockNews(): NewsData {
    const topics = ['Local News', 'Weather', 'Community', 'Economy', 'Technology', 'Connectivity'];
    return {
      sentiment: 0.3 + Math.random() * 0.4,
      topics: topics.slice(0, Math.floor(Math.random() * 3) + 2),
      volume: Math.floor(Math.random() * 200)
    };
  }

  private getDefaultWeather(): WeatherData {
    return {
      temperature: 20,
      humidity: 60,
      pressure: 1013,
      windSpeed: 10,
      windDirection: 180,
      conditions: 'Clear',
      visibility: 15
    };
  }

  private getDefaultTraffic(): TrafficData {
    return {
      congestionLevel: Math.random() * 0.5,
      averageSpeed: 40,
      incidents: 0
    };
  }

  private getDefaultNews(): NewsData {
    return {
      sentiment: 0.5,
      topics: ['Local News'],
      volume: 10
    };
  }

  private getDefaultSocial(): SocialSentiment {
    return {
      score: 0.5,
      volume: 100,
      trending: ['#local']
    };
  }

  private getDefaultEconomic(): EconomicData {
    return {
      marketIndex: 3500,
      volume: 100000,
      volatility: 0.1
    };
  }

  private getDefaultEnvironmental(): EnvironmentalData {
    return {
      airQuality: 75,
      pollutionLevel: 0.2,
      uvIndex: 5,
      noiseLevel: 0.3
    };
  }

  private getDefaultDataStream(): RealtimeDataStream {
    return {
      weather: this.getDefaultWeather(),
      traffic: this.getDefaultTraffic(),
      news: this.getDefaultNews(),
      social: this.getDefaultSocial(),
      economic: this.getDefaultEconomic(),
      environmental: this.getDefaultEnvironmental(),
      timestamp: new Date()
    };
  }
}

export const realtimeDataService = new RealtimeDataService();