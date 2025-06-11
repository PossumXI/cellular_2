export interface LocationCell {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  name: string;
  personality: AIPersonality;
  voice: VoiceProfile;
  memory: BlockchainMemory;
  relationships: LocationRelationship[];
  realtimeData: RealtimeDataStream;
  isActive: boolean;
  lastInteraction: Date;
}

export interface AIPersonality {
  traits: PersonalityTraits;
  voiceCharacteristics: VoiceCharacteristics;
  responsePatterns: ResponsePattern[];
  emotionalState: EmotionalState;
  culturalInfluence: CulturalData;
}

export interface PersonalityTraits {
  openness: number; // 0-1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  environmental_sensitivity: number;
  cultural_pride: number;
  historical_awareness: number;
}

export interface VoiceProfile {
  voiceId: string; // ElevenLabs voice ID
  stability: number;
  similarityBoost: number;
  style: number;
  speakingRate: number;
  accent: string;
}

export interface VoiceCharacteristics {
  tone: 'warm' | 'cool' | 'neutral';
  pace: 'slow' | 'medium' | 'fast';
  formality: 'casual' | 'formal' | 'mixed';
}

export interface ResponsePattern {
  trigger: string;
  response: string;
  probability: number;
}

export interface EmotionalState {
  current_mood: string;
  energy_level: number;
  sociability: number;
}

export interface CulturalData {
  primaryCulture: string;
  languages: string[];
  traditions: string[];
}

export interface BlockchainMemory {
  interactions: Interaction[];
  personalityEvolution: PersonalitySnapshot[];
  relationships: RelationshipHistory[];
  events: LocationEvent[];
}

export interface Interaction {
  id: string;
  timestamp: Date;
  type: 'voice' | 'text' | 'system';
  content: string;
  response: string;
  mood: string;
}

export interface PersonalitySnapshot {
  timestamp: Date;
  traits: PersonalityTraits;
  trigger: string;
}

export interface RelationshipHistory {
  targetLocationId: string;
  formed: Date;
  events: RelationshipEvent[];
}

export interface RelationshipEvent {
  timestamp: Date;
  type: string;
  description: string;
}

export interface LocationEvent {
  id: string;
  timestamp: Date;
  type: 'weather' | 'social' | 'economic' | 'environmental' | 'connectivity';
  description: string;
  impact: number;
}

export interface RealtimeDataStream {
  weather: WeatherData;
  traffic: TrafficData;
  news: NewsData;
  social: SocialSentiment;
  economic: EconomicData;
  environmental: EnvironmentalData;
  connectivity?: ConnectivityData; // NEW: Telefonica connectivity data
  timestamp: Date;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  conditions: string;
  visibility: number;
}

export interface TrafficData {
  congestionLevel: number;
  averageSpeed: number;
  incidents: number;
}

export interface NewsData {
  sentiment: number;
  topics: string[];
  volume: number;
}

export interface SocialSentiment {
  score: number;
  volume: number;
  trending: string[];
}

export interface EconomicData {
  marketIndex: number;
  volume: number;
  volatility: number;
}

export interface EnvironmentalData {
  airQuality: number;
  pollutionLevel: number;
  uvIndex: number;
  noiseLevel: number;
}

// NEW: Telefonica Open Gateway Types
export interface ConnectivityData {
  networkType: '5G' | '4G' | '3G' | 'WiFi';
  signalStrength: number; // 0-100%
  bandwidth: number; // Mbps
  latency: number; // milliseconds
  coverage: 'excellent' | 'good' | 'fair' | 'poor';
  digitalFootprint: DigitalFootprint;
  networkQuality: NetworkQuality;
}

export interface DigitalFootprint {
  connectedDevices: number;
  dataTraffic: number; // GB/hour
  networkLoad: number; // 0-100%
  activeConnections: number;
  peakUsageHours: string[];
  deviceTypes: DeviceTypeDistribution;
}

export interface DeviceTypeDistribution {
  smartphones: number;
  tablets: number;
  laptops: number;
  iot: number;
  other: number;
}

export interface NetworkQuality {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  packetLoss: number; // percentage
  jitter: number; // milliseconds
  reliability: number; // 0-100%
}

export interface LocationRelationship {
  targetLocationId: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1
  formed: Date;
  lastInteraction: Date;
  sharedEvents: SharedEvent[];
}

export interface SharedEvent {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  impact: number;
}

export type RelationshipType =
  | 'environmental_similarity'
  | 'cultural_connection'
  | 'economic_partnership'
  | 'historical_bond'
  | 'weather_correlation'
  | 'time_zone_alignment'
  | 'connectivity_corridor'; // NEW: Connectivity-based relationship