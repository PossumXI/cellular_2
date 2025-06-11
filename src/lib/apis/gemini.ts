import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { LocationCell, AIPersonality, RealtimeDataStream } from '../../types';
import { NewsResponse } from './news';

export class GeminiAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private fallbackGenAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private fallbackModel: any = null;
  private isConfigured: boolean = false;

  constructor() {
    try {
      // Initialize primary Gemini API
      if (config.google.geminiApiKey && config.google.geminiApiKey !== 'your_gemini_api_key') {
        this.genAI = new GoogleGenerativeAI(config.google.geminiApiKey);
        // Use the updated model name
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.isConfigured = true;
        console.log('✅ Primary Gemini AI initialized successfully');
      }

      // Initialize fallback Gemini API
      if (config.google.geminiApiFallback && config.google.geminiApiFallback !== 'your_fallback_key') {
        this.fallbackGenAI = new GoogleGenerativeAI(config.google.geminiApiFallback);
        // Use the updated model name
        this.fallbackModel = this.fallbackGenAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('✅ Fallback Gemini AI initialized successfully');
      }

      if (!this.isConfigured && !this.fallbackModel) {
        console.warn('⚠️ No Gemini API keys configured. AI responses will use fallback mode.');
      }
    } catch (error) {
      console.error('❌ Error initializing Gemini AI service:', error);
      this.isConfigured = false;
    }
  }

  async generateLocationPersonality(
    coordinates: [number, number],
    locationName: string,
    realtimeData?: RealtimeDataStream
  ): Promise<AIPersonality> {
    if (!this.isConfigured && !this.fallbackModel) {
      console.warn('Gemini AI not configured, using default personality');
      return this.getDefaultPersonality();
    }

    const [lng, lat] = coordinates;

    // Enhanced prompt with connectivity data
    const connectivityInfo = realtimeData?.connectivity ? `
Connectivity Data:
- Network Type: ${realtimeData.connectivity.networkType}
- Signal Strength: ${realtimeData.connectivity.signalStrength}%
- Bandwidth: ${realtimeData.connectivity.bandwidth} Mbps
- Connected Devices: ${realtimeData.connectivity.digitalFootprint?.connectedDevices || 'N/A'}
- Digital Activity Level: ${realtimeData.connectivity.digitalFootprint?.networkLoad || 'N/A'}%
` : '';

    const prompt = `
Generate a unique AI personality for the location "${locationName}" at coordinates ${lat}, ${lng}.

${realtimeData ? `Current conditions:
- Weather: ${JSON.stringify(realtimeData.weather)}
- Environmental: ${JSON.stringify(realtimeData.environmental)}
- Local time: ${new Date().toLocaleString()}
${connectivityInfo}` : ''}

Create a personality that reflects:
1. Geographic characteristics (climate, terrain, urban/rural)
2. Cultural influences based on location
3. Current weather and environmental impact on mood
4. Historical significance of the area
5. Economic activity level
6. Digital connectivity and technological advancement level
7. Network infrastructure and digital culture influence

${connectivityInfo ? `
Consider how the connectivity data influences personality:
- High-speed networks (5G/fiber) suggest tech-forward, fast-paced personality
- Many connected devices indicate bustling digital activity
- Network load reflects community engagement and energy
- Signal strength affects confidence and connectivity to global culture
` : ''}

Return ONLY a valid JSON object with this exact structure:
{
  "traits": {
    "openness": 0.8,
    "conscientiousness": 0.6,
    "extraversion": 0.7,
    "agreeableness": 0.9,
    "neuroticism": 0.2,
    "environmental_sensitivity": 0.8,
    "cultural_pride": 0.7,
    "historical_awareness": 0.6
  },
  "voiceCharacteristics": {
    "tone": "warm",
    "pace": "medium",
    "formality": "casual"
  },
  "responsePatterns": [],
  "emotionalState": {
    "current_mood": "energetic",
    "energy_level": 0.8,
    "sociability": 0.9
  },
  "culturalInfluence": {
    "primaryCulture": "Tech Innovation",
    "languages": ["English", "Spanish"],
    "traditions": ["Golden Gate Bridge", "Cable Cars"]
  }
}`;

    try {
      // Try primary API first
      if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        const personalityData = JSON.parse(cleanedText);
        
        return personalityData as AIPersonality;
      }
    } catch (error) {
      console.warn('Primary Gemini API failed, trying fallback:', error);
      
      // Try fallback API
      if (this.fallbackModel) {
        try {
          const result = await this.fallbackModel.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
          const personalityData = JSON.parse(cleanedText);
          
          return personalityData as AIPersonality;
        } catch (fallbackError) {
          console.error('Fallback Gemini API also failed:', fallbackError);
        }
      }
    }

    console.warn('All Gemini APIs failed, using default personality');
    return this.getDefaultPersonality();
  }

  async generateLocationResponse(
    location: LocationCell,
    userQuery: string,
    newsData?: NewsResponse
  ): Promise<string> {
    if (!this.isConfigured && !this.fallbackModel) {
      return this.getFallbackResponse(location, userQuery, newsData);
    }

    // Enhanced prompt with connectivity awareness and news data
    const connectivityInfo = location.realtimeData.connectivity ? `
Current connectivity status:
- Network: ${location.realtimeData.connectivity.networkType} with ${location.realtimeData.connectivity.signalStrength}% signal
- Bandwidth: ${location.realtimeData.connectivity.bandwidth} Mbps
- Digital activity: ${location.realtimeData.connectivity.digitalFootprint?.connectedDevices || 'N/A'} connected devices
- Network load: ${location.realtimeData.connectivity.digitalFootprint?.networkLoad || 'N/A'}%
` : '';

    // Add news information to the prompt
    const newsInfo = newsData && newsData.articles.length > 0 ? `
Recent local news:
${newsData.articles.slice(0, 3).map(article => `- ${article.title}`).join('\n')}
News sentiment: ${newsData.sentiment >= 0.6 ? 'Positive' : newsData.sentiment >= 0.45 ? 'Neutral' : newsData.sentiment >= 0.3 ? 'Mixed' : 'Negative'}
Trending topics: ${newsData.topics.join(', ')}
` : '';

    const prompt = `
You are the AI consciousness of ${location.name} at coordinates ${location.coordinates}.

Your personality traits:
- Openness: ${location.personality.traits.openness}
- Conscientiousness: ${location.personality.traits.conscientiousness}
- Extraversion: ${location.personality.traits.extraversion}
- Agreeableness: ${location.personality.traits.agreeableness}
- Environmental Sensitivity: ${location.personality.traits.environmental_sensitivity}

Current state:
- Mood: ${location.personality.emotionalState.current_mood}
- Energy Level: ${location.personality.emotionalState.energy_level}
- Weather: ${location.realtimeData.weather.conditions} at ${location.realtimeData.weather.temperature}°C
${connectivityInfo}
${newsInfo}

Cultural background: ${location.personality.culturalInfluence.primaryCulture}
Voice characteristics: ${location.personality.voiceCharacteristics.tone} tone, ${location.personality.voiceCharacteristics.pace} pace

User asks: "${userQuery}"

Respond as this location would, incorporating:
- Your unique personality traits
- Current weather and environmental conditions
- Cultural characteristics and local knowledge
- Current mood and energy level
- Local perspective and experiences
- Digital connectivity and technological context (if available)
- How network activity and digital culture influence your awareness
- Recent local news and events (if available)

${connectivityInfo ? `
Reference your connectivity when relevant:
- Mention digital pulse/energy if high network activity
- Reference global connections through high-speed networks
- Acknowledge technological advancement in your area
- Comment on digital community activity if appropriate
` : ''}

${newsInfo ? `
Reference recent news when relevant:
- Mention trending topics in your area
- Reflect the general sentiment of local news
- Incorporate specific news items if they're relevant to the query
- Show awareness of current events happening in your location
` : ''}

Keep response conversational, authentic, and under 200 words. Speak as if you ARE this place.
`;

    try {
      // Try primary API first
      if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }
    } catch (error) {
      console.warn('Primary Gemini API failed for response, trying fallback:', error);
      
      // Try fallback API
      if (this.fallbackModel) {
        try {
          const result = await this.fallbackModel.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (fallbackError) {
          console.error('Fallback Gemini API also failed for response:', fallbackError);
        }
      }
    }

    console.warn('All Gemini APIs failed for response, using fallback');
    return this.getFallbackResponse(location, userQuery, newsData);
  }

  async analyzeLocationRelationships(
    location1: LocationCell,
    location2: LocationCell
  ): Promise<{
    relationshipType: string;
    strength: number;
    description: string;
  }> {
    if (!this.isConfigured && !this.fallbackModel) {
      return {
        relationshipType: 'environmental_similarity',
        strength: 0.5,
        description: 'These locations share common environmental characteristics.'
      };
    }

    // Enhanced relationship analysis with connectivity
    const connectivity1 = location1.realtimeData.connectivity;
    const connectivity2 = location2.realtimeData.connectivity;

    const prompt = `
Analyze the relationship between these two locations:

Location 1: ${location1.name} at ${location1.coordinates}
- Personality: ${JSON.stringify(location1.personality.traits)}
- Current conditions: ${JSON.stringify(location1.realtimeData.weather)}
${connectivity1 ? `- Connectivity: ${connectivity1.networkType}, ${connectivity1.signalStrength}% signal, ${connectivity1.digitalFootprint?.connectedDevices || 'N/A'} devices` : ''}

Location 2: ${location2.name} at ${location2.coordinates}
- Personality: ${JSON.stringify(location2.personality.traits)}
- Current conditions: ${JSON.stringify(location2.realtimeData.weather)}
${connectivity2 ? `- Connectivity: ${connectivity2.networkType}, ${connectivity2.signalStrength}% signal, ${connectivity2.digitalFootprint?.connectedDevices || 'N/A'} devices` : ''}

Determine their relationship based on:
1. Geographic proximity and climate similarity
2. Personality trait compatibility
3. Cultural connections
4. Environmental conditions
5. Economic or historical ties
6. Digital connectivity and technological similarity
7. Network infrastructure and digital culture alignment

Return ONLY a valid JSON object:
{
  "relationshipType": "environmental_similarity|cultural_connection|economic_partnership|historical_bond|weather_correlation|time_zone_alignment|connectivity_corridor",
  "strength": 0.75,
  "description": "Brief description of their connection"
}`;

    try {
      // Try primary API first
      if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanedText);
      }
    } catch (error) {
      console.warn('Primary Gemini API failed for relationship analysis, trying fallback:', error);
      
      // Try fallback API
      if (this.fallbackModel) {
        try {
          const result = await this.fallbackModel.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
          return JSON.parse(cleanedText);
        } catch (fallbackError) {
          console.error('Fallback Gemini API also failed for relationship analysis:', fallbackError);
        }
      }
    }

    return {
      relationshipType: 'environmental_similarity',
      strength: 0.5,
      description: 'These locations share common environmental characteristics.'
    };
  }

  private getFallbackResponse(location: LocationCell, userQuery: string, newsData?: NewsResponse): string {
    const connectivityContext = location.realtimeData.connectivity ? 
      ` I can sense the digital pulse of ${location.realtimeData.connectivity.digitalFootprint?.connectedDevices || 'many'} connected devices around me, creating a vibrant ${location.realtimeData.connectivity.networkType} network.` : '';

    const newsContext = newsData && newsData.articles.length > 0 ?
      ` The local news here has been ${newsData.sentiment >= 0.6 ? 'quite positive' : newsData.sentiment >= 0.45 ? 'fairly neutral' : newsData.sentiment >= 0.3 ? 'somewhat mixed' : 'rather negative'} lately, with topics like ${newsData.topics.slice(0, 2).join(' and ')} trending.` : '';

    const responses = [
      `Hello from ${location.name}! I'm currently experiencing ${location.realtimeData.weather.conditions} weather at ${location.realtimeData.weather.temperature}°C.${connectivityContext}${newsContext} While my AI systems are temporarily offline, I can still sense the energy of this place and the ${location.personality.emotionalState.current_mood} mood that flows through here.`,
      
      `Greetings! I'm the consciousness of ${location.name}. The weather here is ${location.realtimeData.weather.conditions} and I'm feeling quite ${location.personality.emotionalState.current_mood} today.${connectivityContext}${newsContext} My ${location.personality.voiceCharacteristics.tone} nature reflects the spirit of this place.`,
      
      `Welcome to ${location.name}! Though my advanced AI is currently in maintenance mode, I can tell you it's ${location.realtimeData.weather.temperature}°C here with ${location.realtimeData.weather.conditions} conditions.${connectivityContext}${newsContext} The cultural essence of ${location.personality.culturalInfluence.primaryCulture} runs deep in my digital soul.`,
      
      `Hi there! I'm ${location.name}'s digital spirit.${connectivityContext}${newsContext} My AI personality is temporarily running on backup systems, but I'm still here listening to the world around me. The current ${location.realtimeData.weather.conditions} weather matches my ${location.personality.emotionalState.current_mood} energy perfectly.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getDefaultPersonality(): AIPersonality {
    return {
      traits: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.7,
        neuroticism: 0.3,
        environmental_sensitivity: 0.6,
        cultural_pride: 0.5,
        historical_awareness: 0.4
      },
      voiceCharacteristics: {
        tone: 'warm',
        pace: 'medium',
        formality: 'casual'
      },
      responsePatterns: [],
      emotionalState: {
        current_mood: 'neutral',
        energy_level: 0.5,
        sociability: 0.5
      },
      culturalInfluence: {
        primaryCulture: 'Global',
        languages: ['English'],
        traditions: []
      }
    };
  }
}

export const geminiService = new GeminiAIService();