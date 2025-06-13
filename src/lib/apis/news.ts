import { secureApiProxy } from './secureApiProxy';
import { config } from '../config';

export interface NewsArticle {
  title: string;
  description: string;
  link: string;
  image_url?: string;
  pubDate: string;
  source_id: string;
  source_name?: string;
  category?: string[];
  country?: string[];
  language?: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  sentiment: number;
  topics: string[];
}

class NewsService {
  private newsdataApiKey: string;
  private newsApiKey: string;

  constructor() {
    this.newsdataApiKey = config.newsdata.apiKey;
    this.newsApiKey = config.newsapi.apiKey;
  }

  private calculateSentiment(articles: NewsArticle[]): number {
    if (!articles.length) return 0.5;

    let totalSentiment = 0;
    const positiveWords = [
      'good', 'great', 'success', 'win', 'positive', 'growth', 'improve', 'breakthrough', 
      'achievement', 'celebration', 'excellent', 'outstanding', 'progress', 'innovation',
      'development', 'expansion', 'boost', 'rise', 'increase', 'benefit', 'wonderful',
      'amazing', 'fantastic', 'brilliant', 'superb', 'magnificent', 'spectacular'
    ];
    const negativeWords = [
      'bad', 'crisis', 'problem', 'fail', 'negative', 'decline', 'concern', 'disaster', 
      'tragedy', 'conflict', 'issue', 'trouble', 'difficulty', 'challenge', 'threat',
      'danger', 'risk', 'loss', 'decrease', 'damage', 'terrible', 'awful', 'horrible'
    ];

    articles.forEach(article => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      let sentiment = 0.5; // neutral baseline

      positiveWords.forEach(word => {
        if (text.includes(word)) sentiment += 0.06;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) sentiment -= 0.06;
      });

      totalSentiment += Math.max(0, Math.min(1, sentiment));
    });

    return totalSentiment / articles.length;
  }

  private extractTopics(articles: NewsArticle[]): string[] {
    const topics = new Set<string>();

    articles.forEach(article => {
      // Extract from categories if available
      if (article.category) {
        article.category.forEach(cat => {
          topics.add(cat.charAt(0).toUpperCase() + cat.slice(1));
        });
      }
      
      // Extract from content analysis
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      
      if (text.includes('weather') || text.includes('climate') || text.includes('temperature')) topics.add('Weather');
      if (text.includes('economy') || text.includes('market') || text.includes('business') || text.includes('financial')) topics.add('Economy');
      if (text.includes('politics') || text.includes('government') || text.includes('election') || text.includes('policy')) topics.add('Politics');
      if (text.includes('technology') || text.includes('tech') || text.includes('digital') || text.includes('ai')) topics.add('Technology');
      if (text.includes('health') || text.includes('medical') || text.includes('hospital') || text.includes('healthcare')) topics.add('Health');
      if (text.includes('sports') || text.includes('game') || text.includes('team') || text.includes('match')) topics.add('Sports');
      if (text.includes('education') || text.includes('school') || text.includes('university') || text.includes('student')) topics.add('Education');
      if (text.includes('environment') || text.includes('pollution') || text.includes('green') || text.includes('sustainability')) topics.add('Environment');
      if (text.includes('crime') || text.includes('police') || text.includes('court') || text.includes('law')) topics.add('Crime');
      if (text.includes('entertainment') || text.includes('movie') || text.includes('music') || text.includes('celebrity')) topics.add('Entertainment');
      if (text.includes('transport') || text.includes('traffic') || text.includes('road') || text.includes('infrastructure')) topics.add('Transportation');
      if (text.includes('real estate') || text.includes('housing') || text.includes('property') || text.includes('construction')) topics.add('Real Estate');
    });

    return Array.from(topics).slice(0, 8);
  }

  private getCountryCode(lat: number, lng: number): string {
    // Enhanced country detection based on coordinates
    if (lat >= 24.396308 && lat <= 49.384358 && lng >= -125.0 && lng <= -66.93457) return 'us';
    if (lat >= 41.40338 && lat <= 51.28554 && lng >= -141.0 && lng <= -52.6480987209) return 'ca';
    if (lat >= 49.162090 && lat <= 61.220966 && lng >= 2.51357303225 && lng <= 11.1993265993) return 'de';
    if (lat >= 50.681 && lat <= 55.7765 && lng >= 1.9440 && lng <= 8.23) return 'gb';
    if (lat >= 35.0 && lat <= 71.0 && lng >= -10.0 && lng <= 40.0) return 'gb'; // Europe default
    if (lat >= -55.0 && lat <= 37.0 && lng >= 60.0 && lng <= 180.0) return 'in'; // Asia default
    if (lat >= -47.0 && lat <= -10.0 && lng >= 110.0 && lng <= 180.0) return 'au';
    if (lat >= -35.0 && lat <= 37.0 && lng >= -20.0 && lng <= 55.0) return 'za'; // Africa
    if (lat >= -60.0 && lat <= 15.0 && lng >= -85.0 && lng <= -30.0) return 'br'; // South America
    return 'us'; // Default fallback
  }

  private createEmptyNewsResponse(): NewsResponse {
    return {
      articles: [],
      totalResults: 0,
      sentiment: 0.5,
      topics: []
    };
  }

  async getLocationNews(lat: number, lng: number, locationName?: string, limit: number = 10): Promise<NewsResponse> {
    try {
      console.log(`📰 Fetching news for location: ${locationName || `${lat}, ${lng}`}`);
      
      // Check if we have valid API keys
      if (!this.newsdataApiKey && !this.newsApiKey) {
        console.warn('No news API keys configured, using mock data');
        return this.generateMockNewsData(locationName, lat, lng);
      }
      
      // Try NewsData.io first if we have a key
      if (this.newsdataApiKey) {
        try {
          const countryCode = this.getCountryCode(lat, lng);
          const query = locationName || `${lat},${lng}`;
          
          const data = await secureApiProxy.callNews('newsdata', {
            q: query,
            country: countryCode,
            language: 'en',
            size: limit.toString()
          });
          
          if (data && data.results && data.results.length > 0) {
            const articles: NewsArticle[] = data.results.map((article: any) => ({
              title: article.title,
              description: article.description,
              link: article.link,
              image_url: article.image_url,
              pubDate: article.pubDate,
              source_id: article.source_id,
              source_name: article.source_name,
              category: article.category,
              country: article.country,
              language: article.language
            }));
            
            return {
              articles,
              totalResults: data.totalResults || articles.length,
              sentiment: this.calculateSentiment(articles),
              topics: this.extractTopics(articles)
            };
          }
        } catch (error) {
          console.warn('NewsData.io API failed, trying NewsAPI.org:', error);
        }
      }
      
      // Try NewsAPI.org as fallback if we have a key
      if (this.newsApiKey) {
        try {
          const query = locationName || `${lat},${lng}`;
          
          const data = await secureApiProxy.callNews('newsapi', {
            q: query,
            language: 'en',
            pageSize: limit.toString()
          });
          
          if (data && data.articles && data.articles.length > 0) {
            const articles: NewsArticle[] = data.articles.map((article: any) => ({
              title: article.title,
              description: article.description,
              link: article.url,
              image_url: article.urlToImage,
              pubDate: article.publishedAt,
              source_id: article.source.id || 'newsapi',
              source_name: article.source.name
            }));
            
            return {
              articles,
              totalResults: data.totalResults || articles.length,
              sentiment: this.calculateSentiment(articles),
              topics: this.extractTopics(articles)
            };
          }
        } catch (error) {
          console.warn('NewsAPI.org API failed:', error);
        }
      }
      
      // If all APIs fail, return mock data
      return this.generateMockNewsData(locationName, lat, lng);
    } catch (error: any) {
      console.error('❌ News API failed:', error.message);
      // Return mock data as fallback
      return this.generateMockNewsData(locationName, lat, lng);
    }
  }

  async getTopHeadlines(country: string = 'us', limit: number = 10): Promise<NewsResponse> {
    try {
      console.log(`📰 Fetching top headlines for country: ${country}`);
      
      // Check if we have valid API keys
      if (!this.newsdataApiKey && !this.newsApiKey) {
        console.warn('No news API keys configured, using mock data');
        return this.generateMockNewsData(`${country} headlines`, 0, 0);
      }
      
      // Try NewsAPI.org first for headlines if we have a key
      if (this.newsApiKey) {
        try {
          const data = await secureApiProxy.callNews('newsapi', {
            country,
            pageSize: limit.toString(),
            category: 'general'
          });
          
          if (data && data.articles && data.articles.length > 0) {
            const articles: NewsArticle[] = data.articles.map((article: any) => ({
              title: article.title,
              description: article.description,
              link: article.url,
              image_url: article.urlToImage,
              pubDate: article.publishedAt,
              source_id: article.source.id || 'newsapi',
              source_name: article.source.name
            }));
            
            return {
              articles,
              totalResults: data.totalResults || articles.length,
              sentiment: this.calculateSentiment(articles),
              topics: this.extractTopics(articles)
            };
          }
        } catch (error) {
          console.warn('NewsAPI.org API failed, trying NewsData.io:', error);
        }
      }
      
      // Try NewsData.io as fallback if we have a key
      if (this.newsdataApiKey) {
        try {
          const data = await secureApiProxy.callNews('newsdata', {
            country,
            language: 'en',
            size: limit.toString()
          });
          
          if (data && data.results && data.results.length > 0) {
            const articles: NewsArticle[] = data.results.map((article: any) => ({
              title: article.title,
              description: article.description,
              link: article.link,
              image_url: article.image_url,
              pubDate: article.pubDate,
              source_id: article.source_id,
              source_name: article.source_name,
              category: article.category,
              country: article.country,
              language: article.language
            }));
            
            return {
              articles,
              totalResults: data.totalResults || articles.length,
              sentiment: this.calculateSentiment(articles),
              topics: this.extractTopics(articles)
            };
          }
        } catch (error) {
          console.warn('NewsData.io API failed:', error);
        }
      }
      
      // If all APIs fail, return mock data
      return this.generateMockNewsData(`${country} headlines`, 0, 0);
    } catch (error: any) {
      console.error('❌ News API failed:', error.message);
      // Return mock data as fallback
      return this.generateMockNewsData(`${country} headlines`, 0, 0);
    }
  }

  // Generate realistic mock news data
  private generateMockNewsData(locationName?: string, lat?: number, lng?: number): NewsResponse {
    const location = locationName || 'the area';
    const now = new Date();
    
    // Generate location-specific content
    let locationContext = '';
    let topics: string[] = ['Local', 'Weather', 'Technology', 'Business'];
    
    if (lat && lng) {
      // Determine region-specific content
      if (lat >= 40.4 && lat <= 40.9 && lng >= -74.3 && lng <= -73.7) {
        locationContext = 'NYC';
        topics = ['Business', 'Finance', 'Arts', 'Urban Development'];
      } else if (lat >= 34.0 && lat <= 34.3 && lng >= -118.5 && lng <= -118.1) {
        locationContext = 'LA';
        topics = ['Entertainment', 'Film', 'Technology', 'Lifestyle'];
      } else if (lat >= 51.3 && lat <= 51.7 && lng >= -0.5 && lng <= 0.2) {
        locationContext = 'London';
        topics = ['Finance', 'Politics', 'Arts', 'International'];
      } else if (lat >= 35.4 && lat <= 35.9 && lng >= 139.4 && lng <= 139.9) {
        locationContext = 'Tokyo';
        topics = ['Technology', 'Business', 'Culture', 'Innovation'];
      }
    }
    
    // Generate mock articles
    const articles: NewsArticle[] = [
      {
        title: `Local Development Project Announced in ${location}`,
        description: `A new urban development initiative has been announced for ${location}, promising to revitalize the area with sustainable infrastructure and community spaces.`,
        link: 'https://example.com/news/1',
        pubDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        source_id: 'local_news',
        source_name: 'Local News Network',
        category: ['Urban Development', 'Local']
      },
      {
        title: `Tech Company Expands Operations in ${location}`,
        description: `Leading technology firm announces expansion of their operations in ${location}, creating hundreds of new jobs and boosting the local economy.`,
        link: 'https://example.com/news/2',
        pubDate: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        source_id: 'tech_daily',
        source_name: 'Tech Daily',
        category: ['Technology', 'Business']
      },
      {
        title: `Weather Update: Sunny Conditions Expected in ${location}`,
        description: `Meteorologists predict clear skies and warm temperatures for ${location} over the coming days, perfect for outdoor activities.`,
        link: 'https://example.com/news/3',
        pubDate: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        source_id: 'weather_channel',
        source_name: 'Weather Channel',
        category: ['Weather', 'Local']
      },
      {
        title: `Community Event Draws Large Crowds in ${location}`,
        description: `The annual community festival in ${location} saw record attendance this year, with local businesses reporting increased sales and visibility.`,
        link: 'https://example.com/news/4',
        pubDate: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        source_id: 'community_post',
        source_name: 'Community Post',
        category: ['Events', 'Local', 'Culture']
      },
      {
        title: `New Transportation Options Coming to ${location}`,
        description: `City officials have announced plans to improve public transportation in ${location}, including expanded bus routes and bike-sharing programs.`,
        link: 'https://example.com/news/5',
        pubDate: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        source_id: 'transit_news',
        source_name: 'Transit News',
        category: ['Transportation', 'Urban Development']
      }
    ];
    
    // Calculate sentiment and extract topics
    const sentiment = this.calculateSentiment(articles);
    
    return {
      articles,
      totalResults: articles.length,
      sentiment,
      topics
    };
  }
}

export const newsService = new NewsService();