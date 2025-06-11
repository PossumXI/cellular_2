import { supabase } from '../supabase';
import { dataCollector } from './dataCollector';
import { monetizationService } from './monetizationService';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('📊 Initializing enhanced analytics service...');
    
    try {
      // Start data collection
      dataCollector.startCollection(15); // Collect data every 15 minutes
      
      // Initialize database if needed
      await this.ensureAnalyticsTables();
      
      this.isInitialized = true;
      console.log('✅ Analytics service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing analytics service:', error);
    }
  }

  private async ensureAnalyticsTables(): Promise<void> {
    try {
      // Check if analytics tables exist
      const { data, error } = await supabase
        .from('social_engagement_analytics')
        .select('id')
        .limit(1);
      
      if (error) {
        console.warn('⚠️ Analytics tables may not be set up properly:', error.message);
      } else {
        console.log('✅ Analytics tables are properly configured');
      }
    } catch (error) {
      console.error('❌ Error checking analytics tables:', error);
    }
  }

  async getDashboardData(): Promise<any> {
    try {
      // Get comprehensive analytics data for dashboard
      const [socialData, networkData, locationData, aiData, monetizationData] = await Promise.all([
        this.getSocialAnalytics(),
        this.getNetworkAnalytics(),
        this.getLocationAnalytics(),
        this.getAIAnalytics(),
        this.getMonetizationData()
      ]);

      return {
        social: socialData,
        network: networkData,
        location: locationData,
        ai: aiData,
        monetization: monetizationData,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        social: {},
        network: {},
        location: {},
        ai: {},
        monetization: {},
        lastUpdated: new Date(),
        error: 'Failed to load analytics data'
      };
    }
  }

  async getSocialAnalytics(): Promise<any> {
    try {
      // Get social engagement analytics
      const { data: socialEngagement, error: socialError } = await supabase
        .from('live_social_engagement')
        .select('*')
        .order('total_posts_last_hour', { ascending: false })
        .limit(10);

      if (socialError) throw socialError;

      // Get trending hashtags across all locations
      const { data: hashtagData, error: hashtagError } = await supabase
        .from('social_engagement_analytics')
        .select('trending_hashtags')
        .order('created_at', { ascending: false })
        .limit(100);

      if (hashtagError) throw hashtagError;

      // Aggregate hashtags
      const allHashtags = hashtagData
        .flatMap(item => item.trending_hashtags || [])
        .filter(Boolean);
      
      const hashtagCounts = allHashtags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

      const trendingHashtags = Object.entries(hashtagCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      // Calculate overall sentiment
      const { data: sentimentData, error: sentimentError } = await supabase
        .from('social_engagement_analytics')
        .select('avg_sentiment')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (sentimentError) throw sentimentError;

      const overallSentiment = sentimentData.length > 0
        ? sentimentData.reduce((sum, item) => sum + (item.avg_sentiment || 0), 0) / sentimentData.length
        : 0.5;

      return {
        topLocations: socialEngagement || [],
        trendingHashtags,
        overallSentiment,
        totalPosts: socialEngagement?.reduce((sum, item) => sum + (item.total_posts_last_hour || 0), 0) || 0,
        totalEngagement: socialEngagement?.reduce((sum, item) => sum + (item.total_likes_last_hour || 0) + (item.total_retweets_last_hour || 0), 0) || 0
      };
    } catch (error) {
      console.error('Error getting social analytics:', error);
      return {
        topLocations: [],
        trendingHashtags: [],
        overallSentiment: 0.5,
        totalPosts: 0,
        totalEngagement: 0,
        error: error.message
      };
    }
  }

  async getNetworkAnalytics(): Promise<any> {
    try {
      // Get network performance trends
      const { data: networkTrends, error: networkError } = await supabase
        .from('network_performance_trends')
        .select('*')
        .order('avg_download_speed', { ascending: false })
        .limit(10);

      if (networkError) throw networkError;

      // Get recent speed tests
      const { data: recentTests, error: testsError } = await supabase
        .from('network_performance_analytics')
        .select('*')
        .order('test_timestamp', { ascending: false })
        .limit(20);

      if (testsError) throw testsError;

      // Calculate global averages
      const globalAverages = {
        downloadSpeed: networkTrends?.reduce((sum, item) => sum + (item.avg_download_speed || 0), 0) / (networkTrends?.length || 1),
        uploadSpeed: networkTrends?.reduce((sum, item) => sum + (item.avg_upload_speed || 0), 0) / (networkTrends?.length || 1),
        latency: networkTrends?.reduce((sum, item) => sum + (item.avg_latency || 0), 0) / (networkTrends?.length || 1),
        signalStrength: networkTrends?.reduce((sum, item) => sum + (item.avg_signal_strength || 0), 0) / (networkTrends?.length || 1)
      };

      // Network type distribution
      const networkTypes = (networkTrends || []).reduce((acc, item) => {
        acc[item.network_type] = (acc[item.network_type] || 0) + 1;
        return acc;
      }, {});

      return {
        topLocations: networkTrends || [],
        recentTests: recentTests || [],
        globalAverages,
        networkTypes,
        totalTests: recentTests?.length || 0
      };
    } catch (error) {
      console.error('Error getting network analytics:', error);
      return {
        topLocations: [],
        recentTests: [],
        globalAverages: { downloadSpeed: 0, uploadSpeed: 0, latency: 0, signalStrength: 0 },
        networkTypes: {},
        totalTests: 0,
        error: error.message
      };
    }
  }

  async getLocationAnalytics(): Promise<any> {
    try {
      // Get location popularity rankings
      const { data: popularLocations, error: locationsError } = await supabase
        .from('location_popularity_rankings')
        .select('*')
        .limit(10);

      if (locationsError) throw locationsError;

      // Get location activity heatmap
      const { data: activityData, error: activityError } = await supabase
        .from('location_activity_heatmap')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .order('total_interactions', { ascending: false })
        .limit(20);

      if (activityError) throw activityError;

      // Calculate hourly activity distribution
      const hourlyActivity = Array(24).fill(0);
      activityData?.forEach(item => {
        if (item.hour >= 0 && item.hour < 24) {
          hourlyActivity[item.hour] += item.total_interactions || 0;
        }
      });

      return {
        popularLocations: popularLocations || [],
        activityHeatmap: activityData || [],
        hourlyActivity,
        totalInteractions: activityData?.reduce((sum, item) => sum + (item.total_interactions || 0), 0) || 0,
        uniqueUsers: activityData?.reduce((sum, item) => sum + (item.unique_users || 0), 0) || 0
      };
    } catch (error) {
      console.error('Error getting location analytics:', error);
      return {
        popularLocations: [],
        activityHeatmap: [],
        hourlyActivity: Array(24).fill(0),
        totalInteractions: 0,
        uniqueUsers: 0,
        error: error.message
      };
    }
  }

  async getAIAnalytics(): Promise<any> {
    try {
      // Get AI usage patterns
      const { data: usagePatterns, error: usageError } = await supabase
        .from('ai_usage_patterns')
        .select('*')
        .order('interaction_count', { ascending: false })
        .limit(10);

      if (usageError) throw usageError;

      // Get recent AI interactions
      const { data: recentInteractions, error: interactionsError } = await supabase
        .from('ai_interaction_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (interactionsError) throw interactionsError;

      // Calculate model usage distribution
      const modelUsage = (recentInteractions || []).reduce((acc, item) => {
        acc[item.model_used] = (acc[item.model_used] || 0) + 1;
        return acc;
      }, {});

      // Calculate tier distribution
      const tierDistribution = (recentInteractions || []).reduce((acc, item) => {
        acc[item.user_tier] = (acc[item.user_tier] || 0) + 1;
        return acc;
      }, {});

      return {
        usagePatterns: usagePatterns || [],
        recentInteractions: recentInteractions || [],
        modelUsage,
        tierDistribution,
        totalInteractions: recentInteractions?.length || 0,
        avgProcessingTime: recentInteractions?.reduce((sum, item) => sum + (item.processing_time_ms || 0), 0) / (recentInteractions?.length || 1),
        totalApiCost: recentInteractions?.reduce((sum, item) => sum + (item.api_cost_usd || 0), 0) || 0
      };
    } catch (error) {
      console.error('Error getting AI analytics:', error);
      return {
        usagePatterns: [],
        recentInteractions: [],
        modelUsage: {},
        tierDistribution: {},
        totalInteractions: 0,
        avgProcessingTime: 0,
        totalApiCost: 0,
        error: error.message
      };
    }
  }

  async getMonetizationData(): Promise<any> {
    try {
      // Get monetization insights
      const { data: insights, error: insightsError } = await supabase
        .from('monetization_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (insightsError) throw insightsError;

      // Get revenue report
      const revenueReport = await monetizationService.generateRevenueReport();

      // Get available data packages
      const dataPackages = await monetizationService.getDataPackages();

      return {
        insights: insights || [],
        revenueReport,
        dataPackages,
        totalPackages: insights?.length || 0,
        totalRevenue: revenueReport?.totalRevenue || 0,
        topCategory: revenueReport?.revenueByCategory ? 
          Object.entries(revenueReport.revenueByCategory)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] : null
      };
    } catch (error) {
      console.error('Error getting monetization data:', error);
      return {
        insights: [],
        revenueReport: {},
        dataPackages: [],
        totalPackages: 0,
        totalRevenue: 0,
        error: error.message
      };
    }
  }

  // Get event correlation data
  async getEventCorrelationData(): Promise<any> {
    try {
      // Get upcoming events
      const { data: upcomingEvents, error: eventsError } = await supabase
        .from('event_correlation_data')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(10);

      if (eventsError) throw eventsError;

      // Get past events with high impact
      const { data: pastEvents, error: pastError } = await supabase
        .from('event_correlation_data')
        .select('*')
        .lt('event_date', new Date().toISOString().split('T')[0])
        .order('social_activity_increase', { ascending: false })
        .limit(10);

      if (pastError) throw pastError;

      return {
        upcomingEvents: upcomingEvents || [],
        pastEvents: pastEvents || [],
        totalEvents: (upcomingEvents?.length || 0) + (pastEvents?.length || 0)
      };
    } catch (error) {
      console.error('Error getting event correlation data:', error);
      return {
        upcomingEvents: [],
        pastEvents: [],
        totalEvents: 0,
        error: error.message
      };
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();