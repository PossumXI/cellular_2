import { GoogleGenerativeAI } from '@google/generative-ai';
import { secureApiProxy } from './secureApiProxy';
import { config } from '../config';
import { LocationCell, AIPersonality, RealtimeDataStream } from '../../types';
import { NewsResponse } from './news';

export class GeminiAIService {
  private isConfigured: boolean = false;
  private geminiAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      const apiKey = config.google.geminiApiKey;
      if (apiKey) {
        this.geminiAI = new GoogleGenerativeAI(apiKey);
        this.isConfigured = true;
        console.log('✅ Gemini AI service initialized with direct API access');
      } else {
        console.log('✅ Gemini AI service initialized with secure proxy');
        this.isConfigured = true;
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
    if (!this.isConfigured) {
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
      // Try direct API call if configured
      if (this.geminiAI) {
        const model = this.geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        try {
          const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
          const personalityData = JSON.parse(cleanedText);
          return personalityData as AIPersonality;
        } catch (parseError) {
          console.warn('Error parsing Gemini direct API response:', parseError);
          // Fall through to proxy method
        }
      }
      
      // Use secure API proxy as fallback
      const response = await secureApiProxy.callGemini(prompt, 'gemini-1.5-flash');
      
      if (response && response.candidates && response.candidates.length > 0) {
        const text = response.candidates[0].content.parts[0].text;
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        const personalityData = JSON.parse(cleanedText);
        
        return personalityData as AIPersonality;
      }
    } catch (error) {
      console.warn('Gemini API failed:', error);
    }

    console.warn('All Gemini APIs failed, using default personality');
    return this.getDefaultPersonality();
  }

  async generateLocationResponse(
    location: LocationCell,
    userQuery: string,
    newsData?: NewsResponse
  ): Promise<string> {
    if (!this.isConfigured) {
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
      // Try direct API call if configured
      if (this.geminiAI) {
        try {
          const model = this.geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(prompt);
          const response = result.response;
          const text = response.text();
          return text;
        } catch (directError) {
          console.warn('Direct Gemini API failed, falling back to proxy:', directError);
          // Fall through to proxy method
        }
      }
      
      // Use secure API proxy as fallback
      const response = await secureApiProxy.callGemini(prompt, 'gemini-1.5-flash');
      
      if (response && response.candidates && response.candidates.length > 0) {
        return response.candidates[0].content.parts[0].text;
      }
    } catch (error) {
      console.warn('Gemini API failed for response:', error);
    }

    console.warn('All Gemini APIs failed for response, using fallback');
    return this.getFallbackResponse(location, userQuery, newsData);
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