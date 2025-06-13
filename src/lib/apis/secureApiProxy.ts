import { supabase } from '../supabase';

/**
 * Secure API proxy service for handling sensitive API calls
 * This service routes all API calls through Supabase Edge Functions
 * to keep API keys secure on the server side
 */
export class SecureApiProxyService {
  private static instance: SecureApiProxyService;
  private mockMode: boolean = false;
  
  static getInstance(): SecureApiProxyService {
    if (!SecureApiProxyService.instance) {
      SecureApiProxyService.instance = new SecureApiProxyService();
    }
    return SecureApiProxyService.instance;
  }

  constructor() {
    // Check if we're in development mode with missing API keys
    this.mockMode = !import.meta.env.VITE_SUPABASE_URL || 
                    !import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (this.mockMode) {
      console.warn('⚠️ Running in mock mode - API keys missing or incomplete');
    }
  }
  
  /**
   * Call Algorand API securely
   */
  async callAlgorand(endpoint: string, params: Record<string, string>): Promise<any> {
    try {
      if (this.mockMode) {
        return this.getMockAlgorandResponse(endpoint);
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'algorand',
          endpoint,
          params
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure Algorand API:', error);
      return this.getMockAlgorandResponse(endpoint);
    }
  }
  
  /**
   * Call Google Maps API securely
   */
  async callGoogleMaps(endpoint: string, params: Record<string, string>): Promise<any> {
    try {
      if (this.mockMode) {
        return this.getMockGoogleMapsResponse(endpoint, params);
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'google-maps',
          endpoint,
          params
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure Google Maps API:', error);
      return this.getMockGoogleMapsResponse(endpoint, params);
    }
  }
  
  /**
   * Call Google Gemini API securely
   */
  async callGemini(prompt: string, model: string = 'gemini-1.5-flash'): Promise<any> {
    try {
      if (this.mockMode) {
        return this.getMockGeminiResponse(prompt);
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'gemini',
          prompt,
          model
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure Gemini API:', error);
      return this.getMockGeminiResponse(prompt);
    }
  }
  
  /**
   * Call ElevenLabs API securely
   */
  async callElevenLabs(text: string, voiceId: string, voiceSettings: any): Promise<ArrayBuffer> {
    try {
      if (this.mockMode) {
        return new ArrayBuffer(0); // Can't mock audio data effectively
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'elevenlabs',
          text,
          voiceId,
          voiceSettings
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure ElevenLabs API:', error);
      throw error;
    }
  }
  
  /**
   * Call OpenWeather API securely
   */
  async callWeather(params: Record<string, string>): Promise<any> {
    try {
      if (this.mockMode) {
        return this.getMockWeatherResponse(params);
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'weather',
          params
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure Weather API:', error);
      return this.getMockWeatherResponse(params);
    }
  }
  
  /**
   * Call News API securely
   */
  async callNews(source: 'newsdata' | 'newsapi', params: Record<string, string>): Promise<any> {
    try {
      if (this.mockMode) {
        return this.getMockNewsResponse(source, params);
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'news',
          source,
          params
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure News API:', error);
      return this.getMockNewsResponse(source, params);
    }
  }
  
  /**
   * Call Twitter API securely
   */
  async callTwitter(endpoint: string, params: Record<string, string>): Promise<any> {
    try {
      if (this.mockMode) {
        return this.getMockTwitterResponse(endpoint, params);
      }
      
      const { data, error } = await supabase.functions.invoke('secure-api-proxy', {
        body: {
          service: 'twitter',
          endpoint,
          params
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling secure Twitter API:', error);
      return this.getMockTwitterResponse(endpoint, params);
    }
  }

  // Mock response generators
  private getMockAlgorandResponse(endpoint: string): any {
    switch (endpoint) {
      case 'status':
        return {
          'last-round': 30000000,
          'time-since-last-round': 1000000,
          'catchup-time': 0,
          'has-synced-since-startup': true,
          'genesis-id': 'mainnet-v1.0',
          'genesis-hash': 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='
        };
      case 'account':
        return {
          address: '0x1234567890abcdef',
          amount: 1000000,
          status: 'Online'
        };
      default:
        return { status: 'ok', mock: true };
    }
  }

  private getMockGoogleMapsResponse(endpoint: string, params: Record<string, string>): any {
    if (endpoint === 'geocode') {
      return {
        results: [
          {
            formatted_address: 'San Francisco, CA, USA',
            geometry: {
              location: {
                lat: 37.7749,
                lng: -122.4194
              }
            },
            address_components: [
              {
                long_name: 'San Francisco',
                short_name: 'SF',
                types: ['locality']
              },
              {
                long_name: 'California',
                short_name: 'CA',
                types: ['administrative_area_level_1']
              },
              {
                long_name: 'United States',
                short_name: 'US',
                types: ['country']
              }
            ]
          }
        ],
        status: 'OK'
      };
    }
    return { status: 'OK', results: [], mock: true };
  }

  private getMockGeminiResponse(prompt: string): any {
    return {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  traits: {
                    openness: 0.8,
                    conscientiousness: 0.6,
                    extraversion: 0.7,
                    agreeableness: 0.9,
                    neuroticism: 0.2,
                    environmental_sensitivity: 0.8,
                    cultural_pride: 0.7,
                    historical_awareness: 0.6
                  },
                  voiceCharacteristics: {
                    tone: "warm",
                    pace: "medium",
                    formality: "casual"
                  },
                  responsePatterns: [],
                  emotionalState: {
                    current_mood: "energetic",
                    energy_level: 0.8,
                    sociability: 0.9
                  },
                  culturalInfluence: {
                    primaryCulture: "Tech Innovation",
                    languages: ["English", "Spanish"],
                    traditions: ["Golden Gate Bridge", "Cable Cars"]
                  }
                })
              }
            ]
          }
        }
      ]
    };
  }

  private getMockWeatherResponse(params: Record<string, string>): any {
    return {
      main: {
        temp: 22,
        humidity: 65,
        pressure: 1012
      },
      weather: [
        {
          description: 'Clear sky'
        }
      ],
      wind: {
        speed: 5,
        deg: 180
      },
      visibility: 10000,
      name: 'San Francisco'
    };
  }

  private getMockNewsResponse(source: string, params: Record<string, string>): any {
    return {
      status: 'ok',
      totalResults: 10,
      articles: [
        {
          title: 'Mock News Article',
          description: 'This is a mock news article for development purposes.',
          url: 'https://example.com/news/1',
          publishedAt: new Date().toISOString()
        }
      ]
    };
  }

  private getMockTwitterResponse(endpoint: string, params: Record<string, string>): any {
    return {
      data: [
        {
          id: '1234567890',
          text: 'This is a mock tweet for development purposes. #mock #development',
          author_id: '987654321',
          created_at: new Date().toISOString(),
          public_metrics: {
            retweet_count: 5,
            like_count: 20,
            reply_count: 2,
            quote_count: 1
          }
        }
      ],
      includes: {
        users: [
          {
            id: '987654321',
            name: 'Mock User',
            username: 'mockuser',
            verified: true
          }
        ]
      },
      meta: {
        result_count: 1
      }
    };
  }
}

export const secureApiProxy = SecureApiProxyService.getInstance();