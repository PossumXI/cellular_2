import { config } from '../config';
import { supabase } from '../supabase';

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  geo?: {
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
    place_id?: string;
  };
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  verified?: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface TwitterResponse {
  tweets: Tweet[];
  users: TwitterUser[];
  sentiment: number;
  topics: string[];
  totalResults: number;
}

class TwitterService {
  private apiKey = config.twitter.apiKey;
  private apiSecret = config.twitter.apiSecret;
  private bearerToken = config.twitter.bearerToken;
  private baseURL = 'https://api.twitter.com/2';

  private validateApiKey(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_twitter_api_key_here' && this.apiKey.length > 10;
  }

  private validateBearerToken(): boolean {
    return !!this.bearerToken && this.bearerToken !== 'your_bearer_token_here' && this.bearerToken.length > 10;
  }

  private async getBearerToken(): Promise<string | null> {
    // First check if we have a valid bearer token configured
    if (this.validateBearerToken()) {
      return this.bearerToken;
    }

    // If no valid bearer token, check if we can get one via proxy
    if (!this.validateApiKey()) {
      console.warn('No valid Twitter API credentials configured');
      return null;
    }

    try {
      // Try to get bearer token from proxy endpoint
      // Note: This endpoint would need to be implemented as a Supabase Edge Function
      const response = await fetch('/api/twitter/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          apiSecret: this.apiSecret
        })
      });

      if (!response.ok) {
        console.warn(`Twitter bearer token proxy not available (${response.status}). Using mock data.`);
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.warn('Twitter bearer token proxy not available. Using mock data.');
      return null;
    }
  }

  private calculateSentiment(tweets: Tweet[]): number {
    if (!tweets.length) return 0.5;

    let totalSentiment = 0;
    const positiveWords = [
      'good', 'great', 'awesome', 'amazing', 'love', 'happy', 'excited', 'wonderful',
      'fantastic', 'excellent', 'perfect', 'beautiful', 'incredible', 'outstanding',
      'brilliant', 'superb', 'magnificent', 'spectacular', 'phenomenal', 'remarkable',
      'blessed', 'grateful', 'thrilled', 'delighted', 'proud', 'successful', 'winning',
      'celebrate', 'joy', 'positive', 'optimistic', 'hope', 'inspiring', 'uplifting'
    ];
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'frustrated', 'disappointed',
      'horrible', 'disgusting', 'pathetic', 'annoying', 'stupid', 'ridiculous',
      'outrageous', 'unacceptable', 'disaster', 'nightmare', 'crisis', 'problem',
      'worried', 'concerned', 'upset', 'broken', 'failed', 'losing', 'worst',
      'tragic', 'devastating', 'alarming', 'shocking', 'disturbing', 'depressing'
    ];

    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase();
      let sentiment = 0.5; // neutral baseline

      positiveWords.forEach(word => {
        const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        sentiment += matches * 0.08;
      });
      negativeWords.forEach(word => {
        const matches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        sentiment -= matches * 0.08;
      });

      totalSentiment += Math.max(0, Math.min(1, sentiment));
    });

    return totalSentiment / tweets.length;
  }

  private extractTopics(tweets: Tweet[]): string[] {
    const topics = new Set<string>();

    tweets.forEach(tweet => {
      // Extract hashtags with better filtering
      const hashtags = tweet.text.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi);
      if (hashtags) {
        hashtags.forEach(tag => {
          const cleanTag = tag.slice(1).toLowerCase();
          if (cleanTag.length > 2 && cleanTag.length < 25 && !/^\d+$/.test(cleanTag)) {
            topics.add(cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1));
          }
        });
      }

      // Extract from context annotations
      if (tweet.context_annotations) {
        tweet.context_annotations.forEach(annotation => {
          if (annotation.entity.name && annotation.entity.name.length < 30) {
            topics.add(annotation.entity.name);
          }
        });
      }

      // Enhanced topic extraction from text content
      const text = tweet.text.toLowerCase();
      const topicPatterns = [
        { pattern: /\b(weather|climate|rain|snow|sunny|storm|hurricane|tornado)\b/g, topic: 'Weather' },
        { pattern: /\b(food|restaurant|coffee|lunch|dinner|eat|cooking|recipe)\b/g, topic: 'Food' },
        { pattern: /\b(traffic|transport|commute|road|highway|subway|bus|train)\b/g, topic: 'Transportation' },
        { pattern: /\b(event|festival|concert|party|celebration|show|performance)\b/g, topic: 'Events' },
        { pattern: /\b(business|work|job|office|company|startup|economy|market)\b/g, topic: 'Business' },
        { pattern: /\b(sports|game|team|match|football|basketball|soccer|baseball)\b/g, topic: 'Sports' },
        { pattern: /\b(music|song|artist|album|band|concert|singer|musician)\b/g, topic: 'Music' },
        { pattern: /\b(tech|technology|app|digital|ai|software|coding|programming)\b/g, topic: 'Technology' },
        { pattern: /\b(news|breaking|update|report|announcement|alert)\b/g, topic: 'News' },
        { pattern: /\b(local|community|neighborhood|city|town|area|region)\b/g, topic: 'Local' },
        { pattern: /\b(health|medical|hospital|doctor|wellness|fitness|exercise)\b/g, topic: 'Health' },
        { pattern: /\b(education|school|university|student|teacher|learning)\b/g, topic: 'Education' },
        { pattern: /\b(politics|government|election|vote|policy|law|congress)\b/g, topic: 'Politics' },
        { pattern: /\b(environment|green|climate|pollution|sustainability|eco)\b/g, topic: 'Environment' }
      ];

      topicPatterns.forEach(({ pattern, topic }) => {
        if (pattern.test(text)) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics).slice(0, 10);
  }

  async getLocationTweets(lat: number, lng: number, locationName?: string, radius: number = 25): Promise<TwitterResponse> {
    try {
      console.log(`🐦 Attempting to fetch tweets for location: ${locationName} (${lat}, ${lng}) within ${radius}km`);
      
      // Try to get bearer token
      const bearerToken = await this.getBearerToken();
      
      if (!bearerToken) {
        console.log('No valid Twitter bearer token available, using enhanced location-specific mock data');
        return this.getLocationSpecificMockData(locationName, lat, lng);
      }

      // Try multiple search strategies for better results
      const searchQueries = [];
      
      if (locationName) {
        const cityName = locationName.split(',')[0].trim();
        searchQueries.push(
          `"${cityName}" OR near:"${cityName}" OR #${cityName.replace(/\s+/g, '')}`,
          `${cityName} weather OR ${cityName} traffic OR ${cityName} news`,
          `${cityName} local OR ${cityName} community`
        );
      }
      
      // Add coordinate-based search
      searchQueries.push(`geocode:${lat},${lng},${radius}km`);

      let allTweets: Tweet[] = [];
      let allUsers: TwitterUser[] = [];

      // Try each search query
      for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries to avoid rate limits
        try {
          const params = new URLSearchParams({
            query: `${query} -is:retweet lang:en`,
            'tweet.fields': 'created_at,public_metrics,context_annotations,geo',
            'user.fields': 'name,username,verified,public_metrics,profile_image_url',
            'expansions': 'author_id',
            'max_results': '10'
          });

          const response = await fetch(`${this.baseURL}/tweets/search/recent?${params}`, {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
              const tweets: Tweet[] = data.data.map((tweet: any) => ({
                id: tweet.id,
                text: tweet.text,
                author_id: tweet.author_id,
                created_at: tweet.created_at,
                public_metrics: tweet.public_metrics || {
                  retweet_count: 0,
                  like_count: 0,
                  reply_count: 0,
                  quote_count: 0
                },
                geo: tweet.geo,
                context_annotations: tweet.context_annotations
              }));

              const users: TwitterUser[] = data.includes?.users?.map((user: any) => ({
                id: user.id,
                name: user.name,
                username: user.username,
                profile_image_url: user.profile_image_url,
                verified: user.verified,
                public_metrics: user.public_metrics || {
                  followers_count: 0,
                  following_count: 0,
                  tweet_count: 0
                }
              })) || [];

              allTweets = [...allTweets, ...tweets];
              allUsers = [...allUsers, ...users];
            }
          } else {
            console.warn(`Twitter API query "${query}" failed with status ${response.status}`);
          }
        } catch (queryError) {
          console.warn(`Query "${query}" failed:`, queryError);
          continue;
        }
      }

      if (allTweets.length > 0) {
        // Remove duplicates
        const uniqueTweets = allTweets.filter((tweet, index, self) => 
          index === self.findIndex(t => t.id === tweet.id)
        );
        const uniqueUsers = allUsers.filter((user, index, self) => 
          index === self.findIndex(u => u.id === user.id)
        );

        // Store real tweets in analytics
        await this.storeTweetAnalytics(uniqueTweets, lat, lng, locationName);

        console.log(`✅ Successfully fetched ${uniqueTweets.length} real tweets from Twitter API`);

        return {
          tweets: uniqueTweets.slice(0, 10),
          users: uniqueUsers,
          sentiment: this.calculateSentiment(uniqueTweets),
          topics: this.extractTopics(uniqueTweets),
          totalResults: uniqueTweets.length
        };
      } else {
        console.log('No real tweets found, using location-specific mock data');
        return this.getLocationSpecificMockData(locationName, lat, lng);
      }
    } catch (error: any) {
      console.warn('Twitter API error, using enhanced location-specific mock data:', error.message);
      return this.getLocationSpecificMockData(locationName, lat, lng);
    }
  }

  async searchTweets(query: string, maxResults: number = 10): Promise<TwitterResponse> {
    try {
      console.log(`🐦 Searching tweets for: ${query}`);
      
      // Try to get bearer token
      const bearerToken = await this.getBearerToken();
      
      if (!bearerToken) {
        console.log('No valid Twitter bearer token available, using mock data');
        return this.getLocationSpecificMockData();
      }
      
      const params = new URLSearchParams({
        query: `${query} -is:retweet lang:en`,
        'tweet.fields': 'created_at,public_metrics,context_annotations',
        'user.fields': 'name,username,verified,public_metrics,profile_image_url',
        'expansions': 'author_id',
        'max_results': Math.min(maxResults, 100).toString()
      });

      const response = await fetch(`${this.baseURL}/tweets/search/recent?${params}`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Twitter API error: ${response.status} ${response.statusText}. Using mock data.`);
        return this.getLocationSpecificMockData();
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        return this.getLocationSpecificMockData();
      }

      const tweets: Tweet[] = data.data.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics || {
          retweet_count: 0,
          like_count: 0,
          reply_count: 0,
          quote_count: 0
        },
        context_annotations: tweet.context_annotations
      }));

      const users: TwitterUser[] = data.includes?.users?.map((user: any) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        profile_image_url: user.profile_image_url,
        verified: user.verified,
        public_metrics: user.public_metrics || {
          followers_count: 0,
          following_count: 0,
          tweet_count: 0
        }
      })) || [];

      console.log(`✅ Successfully searched ${tweets.length} real tweets from Twitter API`);

      return {
        tweets,
        users,
        sentiment: this.calculateSentiment(tweets),
        topics: this.extractTopics(tweets),
        totalResults: data.meta?.result_count || tweets.length
      };
    } catch (error: any) {
      console.warn('Twitter API unavailable, using mock data:', error.message);
      return this.getLocationSpecificMockData();
    }
  }

  private async storeTweetAnalytics(tweets: Tweet[], lat: number, lng: number, locationName?: string): Promise<void> {
    try {
      const analyticsData = tweets.map(tweet => ({
        coordinates: [lng, lat] as [number, number],
        location_name: locationName || 'Unknown Location',
        tweet_id: tweet.id,
        tweet_text: tweet.text,
        author_id: tweet.author_id,
        author_username: 'unknown', // We'd need to match with users array
        sentiment_score: this.calculateSentiment([tweet]),
        engagement_metrics: tweet.public_metrics,
        hashtags: (tweet.text.match(/#\w+/g) || []).map(tag => tag.slice(1)),
        mentions: (tweet.text.match(/@\w+/g) || []).map(mention => mention.slice(1)),
        tweet_timestamp: tweet.created_at
      }));

      const { error } = await supabase
        .from('twitter_analytics')
        .insert(analyticsData);

      if (error) {
        console.error('Failed to store tweet analytics:', error);
      } else {
        console.log(`✅ Stored ${analyticsData.length} tweets in analytics database`);
      }
    } catch (error) {
      console.error('Error storing tweet analytics:', error);
    }
  }

  private getLocationSpecificMockData(locationName?: string, lat?: number, lng?: number): TwitterResponse {
    const location = locationName || 'the area';
    const timeVariations = [1, 3, 5, 8, 12, 18]; // hours ago
    
    // Generate location-specific content based on coordinates
    let locationContext = '';
    let locationHashtags = ['#local', '#community'];
    
    if (lat && lng) {
      // Determine region-specific content
      if (lat >= 40.4 && lat <= 40.9 && lng >= -74.3 && lng <= -73.7) {
        locationContext = 'NYC';
        locationHashtags = ['#NYC', '#NewYork', '#Manhattan', '#Brooklyn'];
      } else if (lat >= 34.0 && lat <= 34.3 && lng >= -118.5 && lng <= -118.1) {
        locationContext = 'LA';
        locationHashtags = ['#LosAngeles', '#LA', '#Hollywood', '#California'];
      } else if (lat >= 51.3 && lat <= 51.7 && lng >= -0.5 && lng <= 0.2) {
        locationContext = 'London';
        locationHashtags = ['#London', '#UK', '#England', '#Thames'];
      } else if (lat >= 35.4 && lat <= 35.9 && lng >= 139.4 && lng <= 139.9) {
        locationContext = 'Tokyo';
        locationHashtags = ['#Tokyo', '#Japan', '#Shibuya', '#Harajuku'];
      } else if (lat >= 48.7 && lat <= 49.0 && lng >= 2.1 && lng <= 2.5) {
        locationContext = 'Paris';
        locationHashtags = ['#Paris', '#France', '#EiffelTower', '#Seine'];
      } else if (lat >= 37.7 && lat <= 37.9 && lng >= -122.5 && lng <= -122.3) {
        locationContext = 'San Francisco';
        locationHashtags = ['#SanFrancisco', '#SF', '#BayArea', '#California'];
      } else if (lat >= 25.7 && lat <= 25.9 && lng >= -80.3 && lng <= -80.1) {
        locationContext = 'Miami';
        locationHashtags = ['#Miami', '#MiamiBeach', '#Florida', '#SouthBeach'];
      } else if (lat >= 41.8 && lat <= 42.0 && lng >= -87.8 && lng <= -87.5) {
        locationContext = 'Chicago';
        locationHashtags = ['#Chicago', '#WindyCity', '#Illinois', '#ChiTown'];
      }
    }

    const mockTweets: Tweet[] = [
      {
        id: `mock_${Date.now()}_1`,
        text: `Beautiful morning in ${location}! The weather is perfect for exploring the city. Love the energy here! ☀️ ${locationHashtags.slice(0, 2).map(tag => tag).join(' ')}`,
        author_id: 'user1',
        created_at: new Date(Date.now() - timeVariations[0] * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 45) + 15,
          like_count: Math.floor(Math.random() * 120) + 40,
          reply_count: Math.floor(Math.random() * 25) + 5,
          quote_count: Math.floor(Math.random() * 12) + 2
        },
        context_annotations: [
          {
            domain: { id: '1', name: 'Weather', description: 'Weather related content' },
            entity: { id: '1', name: 'Weather', description: 'Weather conditions' }
          }
        ]
      },
      {
        id: `mock_${Date.now()}_2`,
        text: `Just discovered an incredible local spot in ${location}! The atmosphere is amazing and the people are so friendly 🌟 Highly recommend checking it out! ${locationHashtags[0]} #hidden_gem`,
        author_id: 'user2',
        created_at: new Date(Date.now() - timeVariations[1] * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 25) + 8,
          like_count: Math.floor(Math.random() * 80) + 25,
          reply_count: Math.floor(Math.random() * 30) + 10,
          quote_count: Math.floor(Math.random() * 8) + 2
        },
        context_annotations: [
          {
            domain: { id: '2', name: 'Places', description: 'Location related content' },
            entity: { id: '2', name: 'Local Business', description: 'Local establishment' }
          }
        ]
      },
      {
        id: `mock_${Date.now()}_3`,
        text: `Traffic flowing smoothly through ${location} this morning! 🚗 The new infrastructure improvements are really making a difference. Great work by the city planners! ${locationHashtags[1]} #infrastructure`,
        author_id: 'user3',
        created_at: new Date(Date.now() - timeVariations[2] * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 15) + 5,
          like_count: Math.floor(Math.random() * 60) + 20,
          reply_count: Math.floor(Math.random() * 12) + 3,
          quote_count: Math.floor(Math.random() * 5) + 1
        },
        context_annotations: [
          {
            domain: { id: '3', name: 'Transportation', description: 'Transportation related content' },
            entity: { id: '3', name: 'Traffic', description: 'Traffic conditions' }
          }
        ]
      },
      {
        id: `mock_${Date.now()}_4`,
        text: `Exciting community event happening this weekend in ${location}! 🎵 Live music, local food, and activities for everyone. Can't wait to see the whole neighborhood come together! ${locationHashtags[0]} #community #weekend`,
        author_id: 'user4',
        created_at: new Date(Date.now() - timeVariations[3] * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 55) + 20,
          like_count: Math.floor(Math.random() * 150) + 50,
          reply_count: Math.floor(Math.random() * 35) + 15,
          quote_count: Math.floor(Math.random() * 18) + 5
        },
        context_annotations: [
          {
            domain: { id: '4', name: 'Events', description: 'Event related content' },
            entity: { id: '4', name: 'Community Event', description: 'Local community gathering' }
          }
        ]
      },
      {
        id: `mock_${Date.now()}_5`,
        text: `The innovation scene in ${location} is absolutely thriving! 💻 Just attended an amazing tech meetup. So many brilliant minds and groundbreaking ideas. The future is being built right here! ${locationHashtags[1]} #innovation #tech`,
        author_id: 'user5',
        created_at: new Date(Date.now() - timeVariations[4] * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 30) + 10,
          like_count: Math.floor(Math.random() * 90) + 35,
          reply_count: Math.floor(Math.random() * 20) + 8,
          quote_count: Math.floor(Math.random() * 12) + 3
        },
        context_annotations: [
          {
            domain: { id: '5', name: 'Technology', description: 'Technology related content' },
            entity: { id: '5', name: 'Innovation', description: 'Technology innovation' }
          }
        ]
      },
      {
        id: `mock_${Date.now()}_6`,
        text: `Real-time update from ${location}: Network connectivity is excellent today! 📶 5G speeds are impressive and the digital infrastructure keeps getting better. Perfect for remote work! ${locationHashtags[0]} #connectivity #5G`,
        author_id: 'user6',
        created_at: new Date(Date.now() - timeVariations[5] * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 20) + 6,
          like_count: Math.floor(Math.random() * 70) + 28,
          reply_count: Math.floor(Math.random() * 15) + 4,
          quote_count: Math.floor(Math.random() * 7) + 2
        },
        context_annotations: [
          {
            domain: { id: '6', name: 'Technology', description: 'Technology related content' },
            entity: { id: '6', name: 'Connectivity', description: 'Network connectivity' }
          }
        ]
      }
    ];

    const mockUsers: TwitterUser[] = [
      {
        id: 'user1',
        name: 'Local Explorer',
        username: 'localexplorer',
        verified: false,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 2000) + 500,
          following_count: Math.floor(Math.random() * 1500) + 300,
          tweet_count: Math.floor(Math.random() * 5000) + 1000
        }
      },
      {
        id: 'user2',
        name: 'City Wanderer',
        username: 'citywanderer',
        verified: false,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 3000) + 800,
          following_count: Math.floor(Math.random() * 2000) + 400,
          tweet_count: Math.floor(Math.random() * 7000) + 2000
        }
      },
      {
        id: 'user3',
        name: 'City Updates',
        username: 'cityupdates',
        verified: true,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 20000) + 10000,
          following_count: Math.floor(Math.random() * 1000) + 200,
          tweet_count: Math.floor(Math.random() * 15000) + 5000
        }
      },
      {
        id: 'user4',
        name: 'Community Events',
        username: 'communityevents',
        verified: false,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 8000) + 2000,
          following_count: Math.floor(Math.random() * 1200) + 300,
          tweet_count: Math.floor(Math.random() * 4000) + 1000
        }
      },
      {
        id: 'user5',
        name: 'Tech Innovator',
        username: 'techinnovator',
        verified: false,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 5000) + 1500,
          following_count: Math.floor(Math.random() * 2500) + 600,
          tweet_count: Math.floor(Math.random() * 6000) + 1500
        }
      },
      {
        id: 'user6',
        name: 'Digital Nomad',
        username: 'digitalnomad',
        verified: false,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 4000) + 1200,
          following_count: Math.floor(Math.random() * 1800) + 500,
          tweet_count: Math.floor(Math.random() * 5500) + 1300
        }
      }
    ];

    return {
      tweets: mockTweets,
      users: mockUsers,
      sentiment: this.calculateSentiment(mockTweets),
      topics: this.extractTopics(mockTweets),
      totalResults: mockTweets.length
    };
  }
}

export const twitterService = new TwitterService();