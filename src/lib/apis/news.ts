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

  async getLocationNews(lat: number, lng: number, locationName?: string, limit: number = 10): Promise<NewsResponse> {
    if (!this.validateApiKey()) {
      console.warn('❌ Newsdata.io API key not configured properly');
      throw new Error('News API key not configured. Please set VITE_NEWSDATA_API_KEY in your environment variables.');
    }

    try {
      console.log(`📰 Fetching REAL news for location: ${locationName || `${lat}, ${lng}`}`);
      
      const country = this.getCountryCode(lat, lng);
      
      // Build search query
      let query = '';
      if (locationName) {
        const cityName = locationName.split(',')[0].trim();
        query = cityName;
      }

      const params = new URLSearchParams({
        apikey: this.apiKey,
        country: country,
        language: 'en',
        size: Math.min(limit, 10).toString(),
      });

      if (query) {
        params.append('q', query);
      }

      console.log(`🔗 Making request to: ${this.baseURL}/news?${params}`);

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
      
      console.log(`✅ Successfully fetched ${articles.length} real news articles`);
      
      return {
        articles,
        totalResults: data.totalResults || articles.length,
        sentiment: this.calculateSentiment(articles),
        topics: this.extractTopics(articles)
      };
    } catch (error: any) {
      console.error('❌ Real news API failed:', error.message);
      throw error; // Re-throw to let components handle the error
    }
  }

  async getTopHeadlines(country: string = 'us', limit: number = 10): Promise<NewsResponse> {
    if (!this.validateApiKey()) {
      console.warn('❌ Newsdata.io API key not configured properly');
      throw new Error('News API key not configured. Please set VITE_NEWSDATA_API_KEY in your environment variables.');
    }

    try {
      console.log(`📰 Fetching REAL top headlines for country: ${country}`);
      
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
      
      console.log(`✅ Successfully fetched ${articles.length} real top headlines`);
      
      return {
        articles,
        totalResults: data.totalResults || articles.length,
        sentiment: this.calculateSentiment(articles),
        topics: this.extractTopics(articles)
      };
    } catch (error: any) {
      console.error('❌ Real news API failed:', error.message);
      throw error; // Re-throw to let components handle the error
    }
  }
}

export const newsService = new NewsService();