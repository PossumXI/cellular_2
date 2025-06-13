import { secureApiProxy } from './secureApiProxy';
import { VoiceProfile, LocationCell } from '../../types';
import { config } from '../config';

export class ElevenLabsService {
  private isKeyValid: boolean | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = config.elevenlabs.apiKey;
    console.log('🎵 ElevenLabs service initialized with secure proxy');
  }

  async getAvailableVoices() {
    try {
      // Check if we have a valid API key
      if (!this.apiKey) {
        return this.getMockVoices();
      }

      // This would need to be implemented in the secure API proxy
      // For now, return a predefined list of voices
      return this.getMockVoices();
    } catch (error) {
      console.error('Error fetching voices:', error);
      return this.getMockVoices();
    }
  }

  private getMockVoices() {
    return [
      { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
      { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Josh' },
      { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam' },
      { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam' },
      { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh' },
      { voice_id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi' }
    ];
  }

  async synthesizeVoice(
    text: string,
    voiceProfile: VoiceProfile
  ): Promise<ArrayBuffer | null> {
    try {
      // Check if we have a valid API key
      if (!this.apiKey) {
        console.warn('ElevenLabs API key not configured, cannot synthesize voice');
        return null;
      }

      // Use secure API proxy instead of direct API call
      const audioData = await secureApiProxy.callElevenLabs(
        text,
        voiceProfile.voiceId,
        {
          stability: voiceProfile.stability,
          similarity_boost: voiceProfile.similarityBoost,
          style: voiceProfile.style,
          use_speaker_boost: true
        }
      );
      
      return audioData;
    } catch (error) {
      console.error('Error synthesizing voice:', error);
      return null;
    }
  }

  async playLocationVoice(text: string, voiceProfile: VoiceProfile, location?: LocationCell) {
    try {
      // Enhance the text with location-specific context
      const enhancedText = this.enhanceTextWithContext(text, location);
      
      const audioBuffer = await this.synthesizeVoice(enhancedText, voiceProfile);
      
      // Check if audioBuffer is valid before attempting to play
      if (audioBuffer && audioBuffer.byteLength > 0) {
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Add audio event listeners for better UX
        audio.addEventListener('loadstart', () => {
          console.log('🎵 Audio loading started');
        });

        audio.addEventListener('canplay', () => {
          console.log('🎵 Audio ready to play');
        });

        audio.addEventListener('error', (e) => {
          console.error('🎵 Audio playback error:', e);
        });
        
        await audio.play();
        
        // Clean up URL after playing
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl);
          console.log('🎵 Audio playback completed');
        });

        return { success: true, audio, enhancedText };
      }
      
      return { 
        success: false, 
        error: 'Failed to generate audio - API key may be invalid or quota exceeded',
        fallbackText: enhancedText
      };
    } catch (error) {
      console.error('Error playing location voice:', error);
      return { 
        success: false, 
        error: error.message,
        fallbackText: text
      };
    }
  }

  private enhanceTextWithContext(text: string, location?: LocationCell): string {
    if (!location) return text;

    // Add natural pauses and emphasis based on location data
    let enhancedText = text;

    // Add weather context if mentioned
    if (location.realtimeData?.weather) {
      const weather = location.realtimeData.weather;
      enhancedText = enhancedText.replace(
        /weather|temperature|climate/gi,
        (match) => `${match} - currently ${weather.temperature} degrees with ${weather.conditions}`
      );
    }

    // Add emotional context based on personality
    if (location.personality?.emotionalState) {
      const mood = location.personality.emotionalState.current_mood;
      if (mood === 'energetic') {
        enhancedText = enhancedText.replace(/\./g, '!');
      } else if (mood === 'calm') {
        enhancedText = enhancedText.replace(/!/g, '.');
      }
    }

    // Add natural pauses for better speech flow
    enhancedText = enhancedText.replace(/\. /g, '... ');
    enhancedText = enhancedText.replace(/\, /g, ', ');

    return enhancedText;
  }

  getLocationVoiceProfile(personality: any, locationName: string): VoiceProfile {
    // Enhanced voice selection based on location and personality
    const voices = [
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', traits: ['warm', 'friendly', 'nurturing'] },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Josh', traits: ['energetic', 'young', 'enthusiastic'] },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', traits: ['calm', 'professional', 'authoritative'] },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', traits: ['neutral', 'clear', 'balanced'] },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', traits: ['confident', 'articulate'] },
      { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', traits: ['cheerful', 'expressive'] }
    ];

    // Select voice based on personality traits and location characteristics
    let selectedVoice = voices[3]; // Default to Sam

    if (personality.traits.extraversion > 0.7) {
      selectedVoice = voices[1]; // Josh - energetic
    } else if (personality.traits.agreeableness > 0.8) {
      selectedVoice = voices[0]; // Sarah - warm
    } else if (personality.traits.conscientiousness > 0.7) {
      selectedVoice = voices[2]; // Adam - professional
    } else if (personality.traits.openness > 0.8) {
      selectedVoice = voices[5]; // Gigi - expressive
    }

    // Adjust voice settings based on personality and location
    const baseStability = 0.5;
    const baseSimilarity = 0.7;
    const baseStyle = 0.3;

    return {
      voiceId: selectedVoice.id,
      stability: Math.max(0.1, Math.min(1.0, baseStability + (personality.traits.conscientiousness * 0.3))),
      similarityBoost: Math.max(0.1, Math.min(1.0, baseSimilarity + (personality.traits.openness * 0.2))),
      style: Math.max(0.1, Math.min(1.0, baseStyle + (personality.traits.extraversion * 0.4))),
      speakingRate: this.calculateSpeakingRate(personality),
      accent: this.getLocationAccent(locationName)
    };
  }

  private calculateSpeakingRate(personality: any): number {
    // Base speaking rate
    let rate = 1.0;

    // Adjust based on personality traits
    if (personality.traits.extraversion > 0.7) {
      rate += 0.1; // More extraverted = faster speech
    }
    if (personality.traits.neuroticism > 0.6) {
      rate += 0.05; // More anxious = slightly faster
    }
    if (personality.traits.conscientiousness > 0.8) {
      rate -= 0.05; // More careful = slightly slower
    }

    return Math.max(0.8, Math.min(1.3, rate));
  }

  private getLocationAccent(locationName: string): string {
    const lowerName = locationName.toLowerCase();
    
    // Enhanced accent detection based on location
    const accentMap = {
      'london': 'British RP',
      'manchester': 'Northern English',
      'edinburgh': 'Scottish',
      'dublin': 'Irish',
      'new york': 'American East Coast',
      'boston': 'Boston',
      'chicago': 'Midwest American',
      'los angeles': 'California',
      'san francisco': 'California',
      'texas': 'Southern American',
      'miami': 'Southern American',
      'toronto': 'Canadian',
      'vancouver': 'Canadian',
      'sydney': 'Australian',
      'melbourne': 'Australian',
      'paris': 'French-influenced English',
      'berlin': 'German-influenced English',
      'tokyo': 'Japanese-influenced English',
      'mumbai': 'Indian English',
      'cape town': 'South African'
    };

    // Check for specific city matches
    for (const [city, accent] of Object.entries(accentMap)) {
      if (lowerName.includes(city)) {
        return accent;
      }
    }

    // Regional fallbacks
    if (lowerName.includes('uk') || lowerName.includes('england') || lowerName.includes('britain')) {
      return 'British';
    }
    if (lowerName.includes('australia')) return 'Australian';
    if (lowerName.includes('canada')) return 'Canadian';
    if (lowerName.includes('ireland')) return 'Irish';
    if (lowerName.includes('scotland')) return 'Scottish';
    if (lowerName.includes('south africa')) return 'South African';
    
    return 'Neutral International';
  }
}

export const elevenLabsService = new ElevenLabsService();