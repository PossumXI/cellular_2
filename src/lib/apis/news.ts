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
  private apiKey = config.newsdata.apiKey;
  private baseURL = 'https://newsdata.io/api/1';

  private validateApiKey(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_newsdata_api_key_here' && this.apiKey.startsWith('pub_');
  }

  private calculateSentiment(articles: NewsArticle[]): number {
    if (!articles.length) return 0.5;

    let totalSentiment = 0;
    const positiveWords = [
      'good', 'great', 'success', 'win', 'positive', 'growth', 'improve', 'breakthrough', 
      'achievement', 'celebration', 'excellent', 'outstanding', 'progress', 'innovation',
      'development', 'expansion', 'boost', 'rise', 'increase', 'benefit'
    ];
    const negativeWords = [
      'bad', 'crisis', 'problem', 'fail', 'negative', 'decline', 'concern', 'disaster', 
      'tragedy', 'conflict', 'issue', 'trouble', 'difficulty', 'challenge', 'threat',
      'danger', 'risk', 'loss', 'decrease', 'damage'
    ];

    articles.forEach(article => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      let sentiment = 0.5; // neutral baseline

      positiveWords.forEach(word => {
        if (text.includes(word)) sentiment += 0.08;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) sentiment -= 0.08;
      });

      totalSentiment += Math.max(0, Math.min(1, sentiment));
    });

    return totalSentiment / articles.length;
  }

  private extractTopics(articles: NewsArticle[]): string[] {
    const topics = new Set<string>();

    articles.forEach(article => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      
      // Extract from categories if available
      if (article.category) {
        article.category.forEach(cat => {
          topics.add(cat.charAt(0).toUpperCase() + cat.slice(1));
        });
      }
      
      // Extract from content analysis
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

    return Array.from(topics).slice(0, 6);
  }

  private getCountryCode(lat: number, lng: number): string {
    // Simple country detection based on coordinates
    if (lat >= 24.396308 && lat <= 49.384358 && lng >= -125.0 && lng <= -66.93457) return 'us';
    if (lat >= 41.40338 && lat <= 51.28554 && lng >= -141.0 && lng <= -52.6480987209) return 'ca';
    if (lat >= 49.162090 && lat <= 61.220966 && lng >= 2.51357303225 && lng <= 11.1993265993) return 'de';
    if (lat >= 50.681 && lat <= 55.7765 && lng >= 1.9440 && lng <= 8.23) return 'gb';
    if (lat >= 35.0 && lat <= 71.0 && lng >= -10.0 && lng <= 40.0) return 'gb'; // Default to GB for Europe
    if (lat >= -55.0 && lat <= 37.0 && lng >= 60.0 && lng <= 180.0) return 'in'; // Default to India for Asia
    if (lat >= -47.0 && lat <= -10.0 && lng >= 110.0 && lng <= 180.0) return 'au';
    return 'us'; // Default fallback
  }

  async getLocationNews(lat: number, lng: number, locationName?: string, limit: number = 10): Promise<NewsResponse> {
    if (!this.validateApiKey()) {
      console.warn('Newsdata.io API key not configured, using mock data');
      return this.getMockNewsResponse(locationName);
    }

    try {
      const country = this.getCountryCode(lat, lng);
      
      // Build search query
      let query = '';
      if (locationName) {
        // Extract city name from location
        const cityName = locationName.split(',')[0].trim();
        query = cityName;
      }

      const params = new URLSearchParams({
        apikey: this.apiKey,
        country: country,
        language: 'en',
        size: Math.min(limit, 10).toString(), // Newsdata.io has a max of 10 per request for free tier
      });

      if (query) {
        params.append('q', query);
      }

      const response = await fetch(`${this.baseURL}/news?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Newsdata.io API rate limit exceeded. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid Newsdata.io API key. Please check your VITE_NEWSDATA_API_KEY.');
        } else if (response.status === 403) {
          throw new Error('Newsdata.io API access forbidden. Please check your subscription plan.');
        } else {
          throw new Error(`Newsdata.io API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.results?.message || 'Newsdata.io API returned an error');
      }

      const articles = data.results || [];
      
      return {
        articles,
        totalResults: data.totalResults || articles.length,
        sentiment: this.calculateSentiment(articles),
        topics: this.extractTopics(articles)
      };
    } catch (error: any) {
      console.warn('News API unavailable, using fallback data:', error.message);
      
      // Return mock data as fallback
      return this.getMockNewsResponse(locationName);
    }
  }

  async getTopHeadlines(country: string = 'us', limit: number = 10): Promise<NewsResponse> {
    if (!this.validateApiKey()) {
      console.warn('Newsdata.io API key not configured, using mock data');
      return this.getMockNewsResponse();
    }

    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        country: country,
        language: 'en',
        category: 'top',
        size: Math.min(limit, 10).toString(),
      });

      const response = await fetch(`${this.baseURL}/news?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Newsdata.io API rate limit exceeded. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid Newsdata.io API key. Please check your VITE_NEWSDATA_API_KEY.');
        } else if (response.status === 403) {
          throw new Error('Newsdata.io API access forbidden. Please check your subscription plan.');
        } else {
          throw new Error(`Newsdata.io API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.results?.message || 'Newsdata.io API returned an error');
      }

      const articles = data.results || [];
      
      return {
        articles,
        totalResults: data.totalResults || articles.length,
        sentiment: this.calculateSentiment(articles),
        topics: this.extractTopics(articles)
      };
    } catch (error: any) {
      console.warn('News API unavailable, using fallback data:', error.message);
      
      // Return mock data as fallback
      return this.getMockNewsResponse();
    }
  }

  private getMockNewsResponse(locationName?: string): NewsResponse {
    const mockArticles: NewsArticle[] = [
      {
        title: `Local Development Project Announced in ${locationName || 'the Area'}`,
        description: 'City officials announce new infrastructure improvements to enhance community connectivity and economic growth. The project aims to modernize local facilities and create new opportunities for residents.',
        link: '#',
        image_url: '',
        pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        source_id: 'local_news',
        source_name: 'Local News Network',
        category: ['politics', 'business'],
        country: ['us'],
        language: 'en'
      },
      {
        title: 'Weather Update: Favorable Conditions Expected This Week',
        description: 'Meteorologists predict stable weather patterns with mild temperatures and clear skies for the coming days. Residents can expect pleasant outdoor conditions.',
        link: '#',
        image_url: '',
        pubDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        source_id: 'weather_service',
        source_name: 'National Weather Service',
        category: ['environment'],
        country: ['us'],
        language: 'en'
      },
      {
        title: 'Community Technology Initiative Launches Successfully',
        description: 'New digital connectivity program aims to improve internet access and digital literacy in the region. The initiative has already connected hundreds of households.',
        link: '#',
        image_url: '',
        pubDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        source_id: 'tech_today',
        source_name: 'Technology Today',
        category: ['technology'],
        country: ['us'],
        language: 'en'
      },
      {
        title: 'Local Business Growth Shows Positive Economic Trends',
        description: 'Recent economic indicators show strong growth in local businesses, with new startups and established companies reporting increased revenue and expansion plans.',
        link: '#',
        image_url: '',
        pubDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        source_id: 'business_weekly',
        source_name: 'Business Weekly',
        category: ['business'],
        country: ['us'],
        language: 'en'
      }
    ];

    return {
      articles: mockArticles,
      totalResults: mockArticles.length,
      sentiment: 0.72, // Positive sentiment for mock data
      topics: ['Development', 'Weather', 'Technology', 'Business']
    };
  }
}

export const newsService = new NewsService();