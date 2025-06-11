import { supabase } from '../supabase';
import { newsService } from '../apis/news';
import { twitterService } from '../apis/twitter';
import { speedTestService } from '../apis/speedtest';
import { telefonicaGatewayService } from '../apis/telefonicaGateway';

export interface SocialEngagementData {
  coordinates: [number, number];
  locationName: string;
  platform: string;
  totalPosts: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  uniqueUsers: number;
  avgSentiment: number;
  engagementRate: number;
  trendingHashtags: string[];
  topTopics: string[];
  timestamp: Date;
}

export interface NetworkPerformanceData {
  coordinates: [number, number];
  locationName: string;
  networkType: string;
  carrier?: string;
  signalStrength: number;
  downloadSpeed: number;
  uploadSpeed: number;
  latency: number;
  jitter: number;
  deviceType: string;
  reliabilityScore: number;
  testTimestamp: Date;
}

export interface LocationActivityData {
  coordinates: [number, number];
  locationName: string;
  totalInteractions: number;
  uniqueUsers: number;
  aiQueries: number;
  voiceInteractions: number;
  textInteractions: number;
  avgSessionDuration: number;
  currentActiveUsers: number;
}

export interface AIInteractionData {
  userId?: string;
  sessionId: string;
  coordinates: [number, number];
  locationName: string;
  interactionType: string;
  queryText?: string;
  responseText?: string;
  processingTimeMs: number;
  modelUsed: string;
  apiCostUsd: number;
  userSatisfaction?: number;
  userTier: string;
}

export class DataCollector {
  private static instance: DataCollector;
  private collectionInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;

  static getInstance(): DataCollector {
    if (!DataCollector.instance) {
      DataCollector.instance = new DataCollector();
    }
    return DataCollector.instance;
  }

  // Start automated data collection
  startCollection(intervalMinutes: number = 15): void {
    if (this.isCollecting) {
      console.log('📊 Data collection already running');
      return;
    }

    this.isCollecting = true;
    console.log(`📊 Starting automated data collection every ${intervalMinutes} minutes`);

    // Immediate collection
    this.collectAllData();

    // Set up interval
    this.collectionInterval = setInterval(() => {
      this.collectAllData();
    }, intervalMinutes * 60 * 1000);
  }

  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    console.log('📊 Data collection stopped');
  }

  // Collect all types of analytics data
  private async collectAllData(): Promise<void> {
    try {
      console.log('📊 Starting comprehensive data collection cycle...');

      // Define major cities and regions for data collection
      const majorLocations = [
        { name: 'New York City', lat: 40.7128, lng: -74.0060 },
        { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
        { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
        { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
        { name: 'London', lat: 51.5074, lng: -0.1278 },
        { name: 'Paris', lat: 48.8566, lng: 2.3522 },
        { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
        { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
        { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
        { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
        { name: 'Miami', lat: 25.7617, lng: -80.1918 },
        { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
        { name: 'Boston', lat: 42.3601, lng: -71.0589 },
        { name: 'Washington DC', lat: 38.9072, lng: -77.0369 },
        { name: 'Las Vegas', lat: 36.1699, lng: -115.1398 }
      ];

      // Collect data for each major location
      const collectionPromises = majorLocations.map(location => 
        this.collectLocationData(location.lat, location.lng, location.name)
      );

      await Promise.allSettled(collectionPromises);

      // Generate monetization insights
      await this.generateMonetizationInsights();

      console.log('✅ Data collection cycle completed successfully');
    } catch (error) {
      console.error('❌ Error in data collection cycle:', error);
    }
  }

  // Collect comprehensive data for a specific location
  private async collectLocationData(lat: number, lng: number, locationName: string): Promise<void> {
    try {
      console.log(`📍 Collecting data for ${locationName}...`);

      // Collect social engagement data
      await this.collectSocialEngagementData(lat, lng, locationName);

      // Collect network performance data
      await this.collectNetworkPerformanceData(lat, lng, locationName);

      // Update location activity heatmap
      await this.updateLocationActivityHeatmap(lat, lng, locationName);

    } catch (error) {
      console.error(`❌ Error collecting data for ${locationName}:`, error);
    }
  }

  // Collect social media engagement data
  async collectSocialEngagementData(lat: number, lng: number, locationName: string): Promise<void> {
    try {
      console.log(`🐦 Collecting social engagement data for ${locationName}...`);

      // Get Twitter data
      const twitterData = await twitterService.getLocationTweets(lat, lng, locationName, 50);

      if (twitterData && twitterData.tweets.length > 0) {
        // Calculate engagement metrics
        const totalLikes = twitterData.tweets.reduce((sum, tweet) => sum + tweet.public_metrics.like_count, 0);
        const totalRetweets = twitterData.tweets.reduce((sum, tweet) => sum + tweet.public_metrics.retweet_count, 0);
        const totalReplies = twitterData.tweets.reduce((sum, tweet) => sum + tweet.public_metrics.reply_count, 0);
        const totalQuotes = twitterData.tweets.reduce((sum, tweet) => sum + tweet.public_metrics.quote_count, 0);

        const engagementRate = twitterData.tweets.length > 0 ? 
          (totalLikes + totalRetweets + totalReplies + totalQuotes) / twitterData.tweets.length : 0;

        // Determine if it's a holiday or major event
        const { isHoliday, holidayName, majorEvent } = await this.checkForEvents(new Date());

        const socialData: SocialEngagementData = {
          coordinates: [lng, lat],
          locationName,
          platform: 'twitter',
          totalPosts: twitterData.tweets.length,
          totalLikes,
          totalRetweets,
          totalReplies,
          uniqueUsers: twitterData.users.length,
          avgSentiment: twitterData.sentiment,
          engagementRate,
          trendingHashtags: twitterData.topics,
          topTopics: twitterData.topics,
          timestamp: new Date()
        };

        // Store in database
        await this.storeSocialEngagementData(socialData, isHoliday, holidayName, majorEvent);

        console.log(`✅ Stored social engagement data for ${locationName}: ${twitterData.tweets.length} tweets`);
      }
    } catch (error) {
      console.error(`❌ Error collecting social engagement data for ${locationName}:`, error);
    }
  }

  // Collect network performance data
  async collectNetworkPerformanceData(lat: number, lng: number, locationName: string): Promise<void> {
    try {
      console.log(`📶 Collecting network performance data for ${locationName}...`);

      // Get connectivity data from Telefonica
      const connectivityData = await telefonicaGatewayService.enhanceLocationWithConnectivity(lat, lng);

      if (connectivityData) {
        const networkData: NetworkPerformanceData = {
          coordinates: [lng, lat],
          locationName,
          networkType: connectivityData.connectivity.networkType,
          signalStrength: connectivityData.connectivity.signalStrength,
          downloadSpeed: connectivityData.connectivity.bandwidth,
          uploadSpeed: connectivityData.connectivity.bandwidth * 0.8, // Estimate upload
          latency: connectivityData.connectivity.latency,
          jitter: Math.random() * 10 + 5, // Simulated jitter
          deviceType: 'mobile',
          reliabilityScore: connectivityData.connectivity.signalStrength / 100,
          testTimestamp: new Date()
        };

        // Store in database
        await this.storeNetworkPerformanceData(networkData);

        console.log(`✅ Stored network performance data for ${locationName}`);
      }

      // Also collect real speed test data if available
      const speedTestData = await speedTestService.getLocationNetworkAnalytics([lng, lat], 25);
      if (speedTestData.length > 0) {
        // Process and store speed test analytics
        for (const test of speedTestData.slice(0, 5)) { // Limit to recent tests
          const networkData: NetworkPerformanceData = {
            coordinates: [lng, lat],
            locationName: test.location_name,
            networkType: '4G', // Default, could be enhanced
            signalStrength: 85, // Default, could be enhanced
            downloadSpeed: test.download_speed,
            uploadSpeed: test.upload_speed,
            latency: test.latency,
            jitter: test.jitter,
            deviceType: 'mobile',
            reliabilityScore: Math.min(test.download_speed / 100, 1),
            testTimestamp: new Date(test.test_timestamp)
          };

          await this.storeNetworkPerformanceData(networkData);
        }
      }
    } catch (error) {
      console.error(`❌ Error collecting network performance data for ${locationName}:`, error);
    }
  }

  // Update location activity heatmap
  async updateLocationActivityHeatmap(lat: number, lng: number, locationName: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_location_activity_heatmap', {
        p_coordinates: `(${lng},${lat})`,
        p_location_name: locationName,
        p_interaction_type: 'system_collection',
        p_session_duration: 0
      });

      if (error) {
        console.error('Error updating location activity heatmap:', error);
      }
    } catch (error) {
      console.error('Error updating location activity heatmap:', error);
    }
  }

  // Store social engagement data
  private async storeSocialEngagementData(
    data: SocialEngagementData, 
    isHoliday: boolean, 
    holidayName?: string,
    majorEvent?: any
  ): Promise<void> {
    try {
      const now = data.timestamp;
      const { error } = await supabase
        .from('social_engagement_analytics')
        .insert({
          coordinates: `(${data.coordinates[0]},${data.coordinates[1]})`,
          location_name: data.locationName,
          timestamp: now.toISOString(),
          hour_of_day: now.getHours(),
          day_of_week: now.getDay(),
          day_of_month: now.getDate(),
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          is_weekend: [0, 6].includes(now.getDay()),
          is_holiday: isHoliday,
          holiday_name: holidayName,
          platform: data.platform,
          total_posts: data.totalPosts,
          total_likes: data.totalLikes,
          total_retweets: data.totalRetweets,
          total_replies: data.totalReplies,
          unique_users: data.uniqueUsers,
          avg_sentiment: data.avgSentiment,
          engagement_rate: data.engagementRate,
          trending_hashtags: data.trendingHashtags,
          top_topics: data.topTopics,
          major_event_nearby: !!majorEvent,
          event_type: majorEvent?.type,
          event_name: majorEvent?.name
        });

      if (error) {
        console.error('Error storing social engagement data:', error);
      }
    } catch (error) {
      console.error('Error storing social engagement data:', error);
    }
  }

  // Store network performance data
  private async storeNetworkPerformanceData(data: NetworkPerformanceData): Promise<void> {
    try {
      const now = data.testTimestamp;
      const { error } = await supabase
        .from('network_performance_analytics')
        .insert({
          coordinates: `(${data.coordinates[0]},${data.coordinates[1]})`,
          location_name: data.locationName,
          network_type: data.networkType,
          carrier: data.carrier,
          signal_strength: data.signalStrength,
          download_speed: data.downloadSpeed,
          upload_speed: data.uploadSpeed,
          latency: data.latency,
          jitter: data.jitter,
          device_type: data.deviceType,
          reliability_score: data.reliabilityScore,
          test_timestamp: now.toISOString(),
          hour_of_day: now.getHours(),
          day_of_week: now.getDay(),
          is_peak_hour: [8, 9, 17, 18, 19].includes(now.getHours())
        });

      if (error) {
        console.error('Error storing network performance data:', error);
      }
    } catch (error) {
      console.error('Error storing network performance data:', error);
    }
  }

  // Check for holidays and major events
  private async checkForEvents(date: Date): Promise<{
    isHoliday: boolean;
    holidayName?: string;
    majorEvent?: any;
  }> {
    // Simple holiday detection (can be enhanced with external APIs)
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const holidays = [
      { month: 1, day: 1, name: 'New Year\'s Day' },
      { month: 7, day: 4, name: 'Independence Day' },
      { month: 12, day: 25, name: 'Christmas Day' },
      { month: 11, day: 24, name: 'Thanksgiving' },
      { month: 10, day: 31, name: 'Halloween' }
    ];

    const holiday = holidays.find(h => h.month === month && h.day === day);
    
    return {
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      majorEvent: null // Can be enhanced with event APIs
    };
  }

  // Generate monetization insights
  private async generateMonetizationInsights(): Promise<void> {
    try {
      console.log('💰 Generating monetization insights...');

      // Generate different types of insights
      const insightTypes = [
        { type: 'social_trends', category: 'social_media' },
        { type: 'network_performance', category: 'telecom' },
        { type: 'ai_usage', category: 'ai_companies' },
        { type: 'location_popularity', category: 'real_estate' }
      ];

      for (const insight of insightTypes) {
        await supabase.rpc('generate_monetization_insights', {
          p_insight_type: insight.type,
          p_data_category: insight.category,
          p_time_period: 'daily'
        });
      }

      console.log('✅ Monetization insights generated successfully');
    } catch (error) {
      console.error('❌ Error generating monetization insights:', error);
    }
  }

  // Log AI interaction for analytics
  async logAIInteraction(data: AIInteractionData): Promise<void> {
    try {
      const now = new Date();
      const { error } = await supabase
        .from('ai_interaction_analytics')
        .insert({
          user_id: data.userId,
          session_id: data.sessionId,
          coordinates: `(${data.coordinates[0]},${data.coordinates[1]})`,
          location_name: data.locationName,
          interaction_type: data.interactionType,
          query_text: data.queryText,
          response_text: data.responseText,
          query_length: data.queryText?.length || 0,
          response_length: data.responseText?.length || 0,
          processing_time_ms: data.processingTimeMs,
          model_used: data.modelUsed,
          api_cost_usd: data.apiCostUsd,
          user_satisfaction: data.userSatisfaction,
          user_tier: data.userTier,
          timestamp: now.toISOString(),
          hour_of_day: now.getHours(),
          day_of_week: now.getDay()
        });

      if (error) {
        console.error('Error logging AI interaction:', error);
      }
    } catch (error) {
      console.error('Error logging AI interaction:', error);
    }
  }

  // Get analytics summary for dashboard
  async getAnalyticsSummary(): Promise<any> {
    try {
      const [socialData, networkData, locationData, aiData] = await Promise.all([
        supabase.from('live_social_engagement').select('*').limit(10),
        supabase.from('network_performance_trends').select('*').limit(10),
        supabase.from('location_popularity_rankings').select('*').limit(10),
        supabase.from('ai_usage_patterns').select('*').limit(10)
      ]);

      return {
        socialEngagement: socialData.data || [],
        networkPerformance: networkData.data || [],
        locationPopularity: locationData.data || [],
        aiUsage: aiData.data || []
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return {
        socialEngagement: [],
        networkPerformance: [],
        locationPopularity: [],
        aiUsage: []
      };
    }
  }
}

export const dataCollector = DataCollector.getInstance();