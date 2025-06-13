import { supabase } from '../supabase';
import { newsService } from '../apis/news';
import { twitterService } from '../apis/twitter';
// import { speedTestService } from '../apis/speedtest'; // Not directly used by collector
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
  private retryAttempts = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds
  private activityCache = new Map<string, { timestamp: number, count: number }>();

  static getInstance(): DataCollector {
    if (!DataCollector.instance) {
      DataCollector.instance = new DataCollector();
    }
    return DataCollector.instance;
  }

  public startCollection(frequencyMinutes: number): void {
    if (this.isCollecting) {
      console.log('Data collection already running');
      return;
    }

    this.isCollecting = true;
    console.log(`🚀 Starting data collection every ${frequencyMinutes} minutes`);

    // Run initial collection
    this.collectAllData();

    // Set up interval for periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectAllData();
    }, frequencyMinutes * 60 * 1000);
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    console.log('🛑 Data collection stopped');
  }

  private async collectAllData(): Promise<void> {
    try {
      console.log('📊 Starting data collection cycle...');
      
      // Check if we have connectivity
      const isConnected = await this.checkSupabaseConnection();
      if (!isConnected) {
        console.warn('⚠️ No database connectivity, skipping collection cycle');
        return;
      }

      // Collect data for major cities (sample locations)
      const sampleLocations = [
        { name: 'New York', coordinates: [-74.006, 40.7128] as [number, number] },
        { name: 'London', coordinates: [-0.1276, 51.5074] as [number, number] },
        { name: 'Tokyo', coordinates: [139.6917, 35.6895] as [number, number] },
        { name: 'Sydney', coordinates: [151.2093, -33.8688] as [number, number] },
        { name: 'San Francisco', coordinates: [-122.4194, 37.7749] as [number, number] }
      ];

      for (const location of sampleLocations) {
        await this.collectLocationData(location.coordinates, location.name);
        // Add small delay between locations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
      }

      this.retryAttempts = 0; // Reset retry counter on successful collection
      console.log('✅ Data collection cycle completed');
    } catch (error) {
      console.error('❌ Error in data collection cycle:', error);
      
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        console.log(`🔄 Retrying in ${this.retryDelay / 1000} seconds (attempt ${this.retryAttempts}/${this.maxRetries})`);
        setTimeout(() => this.collectAllData(), this.retryDelay);
      } else {
        console.error('❌ Max retry attempts reached, skipping this collection cycle');
        this.retryAttempts = 0;
      }
    }
  }

  private async collectLocationData(coordinates: [number, number], locationName: string): Promise<void> {
    try {
      // Fetch Twitter data
      const twitterResponse = await twitterService.getLocationTweets(coordinates[1], coordinates[0], locationName);
      if (twitterResponse && twitterResponse.tweets.length > 0) {
        // twitterService.storeTweetAnalytics already handles storing this data
        console.log(`🐦 Processed ${twitterResponse.tweets.length} tweets for ${locationName}`);
      } else {
        console.log(`🐦 No real tweets found for ${locationName}, mock data might have been used by twitterService.`);
      }

      // Fetch News data
      const newsResponse = await newsService.getLocationNews(coordinates[1], coordinates[0], locationName);
      if (newsResponse && newsResponse.articles.length > 0) {
        const newsSocialData: SocialEngagementData = {
          coordinates,
          locationName,
          platform: 'news',
          totalPosts: newsResponse.articles.length,
          totalLikes: 0, // News articles don't have likes in this model
          totalRetweets: 0, // News articles don't have retweets
          totalReplies: 0, // News articles don't have replies
          uniqueUsers: newsResponse.articles.reduce((acc, article) => acc + (article.source_id ? 1 : 0), 0), // Approximate unique sources as users
          avgSentiment: newsResponse.sentiment,
          engagementRate: 0, // Engagement rate not applicable directly
          trendingHashtags: [], // News articles don't typically have hashtags in this format
          topTopics: newsResponse.topics,
          timestamp: new Date()
        };
        await this.storeSocialEngagementData(newsSocialData, false); // Store news data
      } else {
        console.log(`📰 No real news found for ${locationName}, mock data might have been used by newsService.`);
      }

      // Fetch network performance data from Telefonica service
      const telefonicaNetworkQuality = await telefonicaGatewayService.getNetworkQuality(coordinates[1], coordinates[0]);
      
      const networkData: NetworkPerformanceData = {
        coordinates,
        locationName,
        networkType: telefonicaNetworkQuality.networkType,
        carrier: 'Telefonica Simulated', // Carrier info not directly from this API endpoint
        signalStrength: telefonicaNetworkQuality.signalStrength, // Assuming this is a comparable metric
        downloadSpeed: telefonicaNetworkQuality.bandwidth, // Using bandwidth as download speed
        uploadSpeed: telefonicaNetworkQuality.bandwidth * (Math.random() * 0.3 + 0.2), // Estimate upload as 20-50% of download
        latency: telefonicaNetworkQuality.latency,
        jitter: Math.random() * 10 + 1, // Jitter not provided, keep mock
        deviceType: 'fixed/mobile', // Generic device type
        reliabilityScore: Math.max(0, Math.min(1, (telefonicaNetworkQuality.signalStrength / 100) * (1 - telefonicaNetworkQuality.latency / 200))), // Basic reliability score
        testTimestamp: new Date()
      };

      // Store network performance data
      await this.storeNetworkPerformanceData(networkData);

      console.log(`📍 Finished data collection for ${locationName}`);
    } catch (error) {
      console.error(`❌ Error collecting data for ${locationName}:`, error);
    }
  }

  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { data: _data, error } = await supabase // data renamed to _data
        .from('users')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('Failed to fetch')) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Supabase connection check failed:', error);
      return false;
    }
  }

  private async storeSocialEngagementData(
    data: SocialEngagementData, 
    isHoliday: boolean, 
    holidayName?: string,
    majorEvent?: any
  ): Promise<void> {
    try {
      const isConnected = await this.checkSupabaseConnection();
      if (!isConnected) {
        console.warn(`⚠️ Skipping social engagement data storage for ${data.locationName} - no connectivity`);
        return;
      }

      const { count: _count, error: checkError } = await supabase // count renamed to _count
        .from('social_engagement_analytics')
        .select('*', { count: 'exact', head: true });
      
      if (checkError) {
        if (checkError.message.includes('Failed to fetch')) {
          console.warn(`⚠️ Network error checking social engagement analytics table: ${checkError.message}`);
          return;
        }
        console.warn('Social engagement analytics table not ready:', checkError.message);
        return;
      }
      
      const now = data.timestamp;
      
      const safeHashtags = Array.isArray(data.trendingHashtags) ? 
        data.trendingHashtags.filter(tag => typeof tag === 'string') : [];
      
      const safeTopics = Array.isArray(data.topTopics) ? 
        data.topTopics.filter(topic => typeof topic === 'string') : [];
      
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
          avg_sentiment: Math.max(0, Math.min(1, data.avgSentiment)),
          engagement_rate: Math.max(0, Math.min(1, data.engagementRate)),
          trending_hashtags: safeHashtags,
          top_topics: safeTopics,
          major_event_nearby: !!majorEvent,
          event_type: majorEvent?.type,
          event_name: majorEvent?.name
        });

      if (error) {
        if (error.message.includes('Failed to fetch')) {
          console.warn(`⚠️ Network error storing social engagement data: ${error.message}`);
          return;
        }
        console.error('Error storing social engagement data:', error);
      } else {
        console.log(`✅ Stored social engagement data for ${data.locationName}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn(`⚠️ Network connectivity issue storing social engagement data for ${data.locationName}`);
        return;
      }
      console.error('Error storing social engagement data:', error);
    }
  }

  private async storeNetworkPerformanceData(data: NetworkPerformanceData): Promise<void> {
    try {
      const isConnected = await this.checkSupabaseConnection();
      if (!isConnected) {
        console.warn(`⚠️ Skipping network performance data storage for ${data.locationName} - no connectivity`);
        return;
      }

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
          reliability_score: Math.max(0, Math.min(1, data.reliabilityScore)),
          test_timestamp: now.toISOString(),
          hour_of_day: now.getHours(),
          day_of_week: now.getDay(),
          is_peak_hour: now.getHours() >= 8 && now.getHours() <= 22
        });

      if (error) {
        if (error.message.includes('Failed to fetch')) {
          console.warn(`⚠️ Network error storing network performance data: ${error.message}`);
          return;
        }
        console.error('Error storing network performance data:', error);
      } else {
        console.log(`✅ Stored network performance data for ${data.locationName}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn(`⚠️ Network connectivity issue storing network performance data for ${data.locationName}`);
        return;
      }
      console.error('Error storing network performance data:', error);
    }
  }

  public async storeAIInteraction(data: AIInteractionData): Promise<void> {
    try {
      const isConnected = await this.checkSupabaseConnection();
      if (!isConnected) {
        console.warn(`⚠️ Skipping AI interaction data storage - no connectivity`);
        return;
      }

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
        console.error('Error storing AI interaction data:', error);
      } else {
        console.log(`✅ Stored AI interaction data for ${data.locationName}`);
      }
    } catch (error) {
      console.error('Error storing AI interaction data:', error);
    }
  }

  public async updateLocationActivityHeatmap(lat: number, lng: number, locationName: string, userId?: string): Promise<void> {
    try {
      const isConnected = await this.checkSupabaseConnection();
      if (!isConnected) {
        console.warn(`⚠️ Skipping location activity heatmap update for ${locationName} - no connectivity`);
        return;
      }

      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const hour = now.getHours();
      
      // Create a cache key to prevent duplicate updates in the same hour
      const cacheKey = `${locationName}_${date}_${hour}`;
      const currentTime = Date.now();
      const cachedEntry = this.activityCache.get(cacheKey);
      
      // If we've already updated this location in this hour recently, skip
      if (cachedEntry && (currentTime - cachedEntry.timestamp < 5 * 60 * 1000)) { // 5 minutes
        console.log(`⏩ Skipping duplicate update for ${locationName} at ${hour}:00`);
        
        // Just increment the count in the cache
        this.activityCache.set(cacheKey, {
          timestamp: cachedEntry.timestamp,
          count: cachedEntry.count + 1
        });
        
        return;
      }

      // Check if a record already exists for this location, date, and hour
      const { data: existingData, error: selectError } = await supabase
        .from('location_activity_heatmap')
        .select('id, total_interactions, unique_users, current_active_users')
        .eq('location_name', locationName)
        .eq('date', date)
        .eq('hour', hour)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing location activity:', selectError);
        return;
      }

      // Update the cache
      this.activityCache.set(cacheKey, {
        timestamp: currentTime,
        count: (cachedEntry?.count || 0) + 1
      });

      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('location_activity_heatmap')
          .update({
            total_interactions: existingData.total_interactions + 1,
            unique_users: userId ? Math.max(existingData.unique_users, existingData.unique_users + 1) : existingData.unique_users,
            current_active_users: existingData.current_active_users + 1,
            updated_at: now.toISOString()
          })
          .eq('id', existingData.id);

        if (updateError) {
          console.error('Error updating location activity heatmap:', updateError);
        } else {
          console.log(`✅ Updated location activity heatmap for ${locationName}`);
        }
      } else {
        // Insert new record with upsert strategy to avoid conflicts
        const { error: upsertError } = await supabase
          .from('location_activity_heatmap')
          .upsert({
            coordinates: `(${lng},${lat})`,
            location_name: locationName,
            date: date,
            hour: hour,
            total_interactions: 1,
            unique_users: userId ? 1 : 0,
            ai_queries: 0,
            voice_interactions: 0,
            text_interactions: 0,
            avg_session_duration: 0,
            current_active_users: 1,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          }, {
            onConflict: 'location_name,date,hour'
          });

        if (upsertError) {
          console.error('Error upserting location activity heatmap:', upsertError);
        } else {
          console.log(`✅ Created new location activity heatmap entry for ${locationName}`);
        }
      }

      // Also log the location interaction
      await this.logLocationView(lat, lng, locationName, userId);

    } catch (error) {
      console.error('Error updating location activity heatmap:', error);
    }
  }

  public async logLocationView(lat: number, lng: number, locationName: string, userId?: string): Promise<void> {
    try {
      const isConnected = await this.checkSupabaseConnection();
      if (!isConnected) {
        console.warn(`⚠️ Skipping location view logging for ${locationName} - no connectivity`);
        return;
      }

      // Generate a location ID based on coordinates
      const locationId = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

      // Only proceed if we have a user ID or if we're allowing anonymous views
      if (!userId) {
        console.log(`ℹ️ Skipping location view logging for ${locationName} - no user ID provided`);
        return;
      }

      const { error } = await supabase
        .from('location_interactions')
        .insert({
          user_id: userId,
          location_id: locationId,
          coordinates: `(${lng},${lat})`,
          location_name: locationName,
          interaction_type: 'view',
          query: null,
          response: null,
          duration_seconds: null,
          blockchain_tx_id: null
        });

      if (error) {
        console.error('Error logging location view:', error);
      } else {
        console.log(`✅ Logged location view for ${locationName}`);
      }
    } catch (error) {
      console.error('Error logging location view:', error);
    }
  }

  public isCollectionRunning(): boolean {
    return this.isCollecting;
  }
}

export const dataCollector = DataCollector.getInstance();
