import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'premium';
  daily_interactions_used: number;
  daily_limit: number;
  created_at: string;
  updated_at: string;
  stripe_customer_id?: string;
  subscription_status?: 'active' | 'canceled' | 'past_due';
  subscription_end_date?: string;
}

export interface LocationInteraction {
  id: string;
  user_id: string;
  location_id: string;
  coordinates: [number, number];
  location_name: string;
  interaction_type: 'voice' | 'text' | 'view';
  query?: string;
  response?: string;
  duration_seconds?: number;
  created_at: string;
  blockchain_tx_id?: string;
}

export interface UserAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_interactions: number;
  voice_interactions: number;
  text_interactions: number;
  unique_locations: number;
  total_duration_seconds: number;
  favorite_location?: string;
  created_at: string;
}

export interface LocationMemory {
  id: string;
  location_id: string;
  coordinates: [number, number];
  location_name: string;
  total_interactions: number;
  personality_data: any;
  voice_profile: any;
  last_interaction: string;
  blockchain_address?: string;
  created_at: string;
  updated_at: string;
}