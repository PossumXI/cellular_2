import { useState } from 'react';
import { LocationCell } from '../types';
import { geminiService } from '../lib/apis/gemini';
import { elevenLabsService } from '../lib/apis/elevenlabs';
import { algorandService } from '../lib/apis/algorand';
import { authService } from '../lib/auth/authService';
import { useAuthStore } from '../store/authStore';
import { newsService } from '../lib/apis/news';
import toast from 'react-hot-toast';

export function useVoiceInteraction() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuthStore();

  const speakWithLocation = async (location: LocationCell, userQuery: string = '') => {
    if (isPlaying || isGenerating) return;

    setIsGenerating(true);

    try {
      // Check daily limit for free users
      if (user) {
        const { canInteract, remaining } = await authService.checkDailyLimit(user.id);
        
        if (!canInteract && user.subscription_tier === 'free') {
          toast.error(`Daily limit reached! You have ${remaining} interactions remaining. Upgrade to Premium for unlimited access.`);
          setIsGenerating(false);
          return { success: false, error: 'Daily limit reached' };
        }
      }

      // Fetch latest news for the location to enhance the AI response
      const newsData = await newsService.getLocationNews(
        location.coordinates[1], 
        location.coordinates[0], 
        location.name
      );

      // Generate response based on user query or default greeting
      const query = userQuery || `Hello! Tell me about yourself and what's happening in ${location.name} right now.`;
      
      const response = await geminiService.generateLocationResponse(
        location, 
        query, 
        newsData // Pass news data to the AI
      );

      // Store interaction in blockchain memory (this is simulated)
      try {
        await algorandService.storeLocationMemory(location.id, {
          type: 'voice_interaction',
          userQuery: query,
          locationResponse: response,
          timestamp: Date.now()
        });
      } catch (blockchainError) {
        console.warn('Blockchain storage failed (simulated):', blockchainError);
        // Continue with voice synthesis even if blockchain storage fails
      }

      // Increment daily usage for authenticated users
      if (user) {
        await authService.incrementDailyUsage(user.id);
      }

      setIsGenerating(false);
      setIsPlaying(true);

      // Synthesize and play voice
      const result = await elevenLabsService.playLocationVoice(response, location.voice, location);

      if (result.success && result.audio) {
        result.audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });
        
        result.audio.addEventListener('error', () => {
          setIsPlaying(false);
          // Show text fallback if audio fails
          toast.success(`${location.name} says: ${result.fallbackText || response}`);
        });
      } else {
        setIsPlaying(false);
        // Fallback: display text if voice synthesis fails
        toast.success(`${location.name} says: ${result.fallbackText || response}`);
      }

      return { success: true, response };
    } catch (error) {
      setIsGenerating(false);
      setIsPlaying(false);
      console.error('Error in voice interaction:', error);
      toast.error('Failed to communicate with location. Please try again.');
      return { success: false, error: error.message };
    }
  };

  return {
    speakWithLocation,
    isPlaying,
    isGenerating
  };
}