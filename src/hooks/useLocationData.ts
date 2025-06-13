import { useState, useEffect } from 'react';
import { LocationCell, RealtimeDataStream } from '../types';
import { geminiService } from '../lib/apis/gemini';
import { geocodingService } from '../lib/apis/geocoding';
import { elevenLabsService } from '../lib/apis/elevenlabs';
import { algorandService } from '../lib/apis/algorand';
import { realtimeDataService } from '../lib/apis/realtime';
import { useAuthStore } from '../store/authStore';

export function useLocationData(coordinates: [number, number] | null) {
  const [location, setLocation] = useState<LocationCell | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!coordinates) return;

    const loadLocationData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [lng, lat] = coordinates;

        // Enhanced location name resolution with multiple strategies
        let locationName = 'Unknown Location';
        
        console.log(`🔍 Resolving location name for coordinates: [${lat}, ${lng}]`);
        
        try {
          // Strategy 1: Try detailed location with context
          const locationContext = await geocodingService.getLocationWithContext(lat, lng);
          if (locationContext && locationContext.name && locationContext.name !== 'Unknown Location') {
            // Build a more descriptive name
            if (locationContext.city && locationContext.state) {
              locationName = `${locationContext.city}, ${locationContext.state}`;
            } else if (locationContext.city) {
              locationName = locationContext.city;
            } else if (locationContext.name) {
              locationName = locationContext.name;
            }
            console.log(`✅ Context-based location resolved: "${locationName}"`);
          } else {
            throw new Error('Context-based location failed');
          }
        } catch (contextError) {
          console.warn('Context-based geocoding failed, trying detailed method:', contextError);
          
          try {
            // Strategy 2: Try detailed location name
            const detailedLocation = await geocodingService.getDetailedLocationName(lat, lng);
            if (detailedLocation && detailedLocation !== 'Unknown Location' && !detailedLocation.startsWith('Location ')) {
              locationName = detailedLocation;
              console.log(`✅ Detailed location resolved: "${locationName}"`);
            } else {
              throw new Error('Detailed location returned generic result');
            }
          } catch (detailedError) {
            console.warn('Detailed geocoding failed, trying basic reverse geocoding:', detailedError);
            
            try {
              // Strategy 3: Basic reverse geocoding
              const basicLocation = await geocodingService.reverseGeocode(lat, lng);
              if (basicLocation && !basicLocation.startsWith('Location ')) {
                locationName = basicLocation;
                console.log(`✅ Basic location resolved: "${locationName}"`);
              } else {
                throw new Error('Basic location also failed');
              }
            } catch (basicError) {
              console.warn('Basic geocoding also failed, using coordinate-based fallback:', basicError);
              
              // Strategy 4: Coordinate-based identification
              locationName = getLocationFromCoordinates(lat, lng);
              console.log(`⚠️ Using coordinate-based location: "${locationName}"`);
            }
          }
        }

        console.log(`📍 Final resolved location: "${locationName}" for coordinates [${lat}, ${lng}]`);

        // Get real-time data stream
        const realtimeData = await realtimeDataService.getLocationDataStream(lat, lng);

        // Generate AI personality based on location and real-time data
        const personality = await geminiService.generateLocationPersonality(
          coordinates,
          locationName,
          realtimeData
        );

        // Create voice profile
        const voice = elevenLabsService.getLocationVoiceProfile(personality, locationName);

        // Get blockchain memory
        const memory = await algorandService.getLocationMemory(`${lat}_${lng}`);

        // Create location cell with proper name
        const locationCell: LocationCell = {
          id: `loc_${lat}_${lng}`,
          name: locationName, // Now uses proper location name
          coordinates,
          personality,
          voice,
          memory,
          relationships: [],
          realtimeData,
          isActive: true,
          lastInteraction: new Date()
        };

        setLocation(locationCell);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load location data');
      } finally {
        setLoading(false);
      }
    };

    loadLocationData();
  }, [coordinates, user]);

  return { location, loading, error };
}

// Enhanced helper function to determine location based on coordinates
function getLocationFromCoordinates(lat: number, lng: number): string {
  // Major city coordinates for fallback identification with tighter radius
  const majorCities = [
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 0.05 },
    { name: 'New York City', lat: 40.7128, lng: -74.0060, radius: 0.05 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 0.05 },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298, radius: 0.05 },
    { name: 'London', lat: 51.5074, lng: -0.1278, radius: 0.05 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 0.05 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, radius: 0.05 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093, radius: 0.05 },
    { name: 'Berlin', lat: 52.5200, lng: 13.4050, radius: 0.05 },
    { name: 'Moscow', lat: 55.7558, lng: 37.6176, radius: 0.05 },
    { name: 'Miami', lat: 25.7617, lng: -80.1918, radius: 0.05 },
    { name: 'Seattle', lat: 47.6062, lng: -122.3321, radius: 0.05 },
    { name: 'Boston', lat: 42.3601, lng: -71.0589, radius: 0.05 },
    { name: 'Washington DC', lat: 38.9072, lng: -77.0369, radius: 0.05 },
    { name: 'Las Vegas', lat: 36.1699, lng: -115.1398, radius: 0.05 },
    { name: 'Denver', lat: 39.7392, lng: -104.9903, radius: 0.05 },
    { name: 'Atlanta', lat: 33.7490, lng: -84.3880, radius: 0.05 },
    { name: 'Phoenix', lat: 33.4484, lng: -112.0740, radius: 0.05 },
    { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, radius: 0.05 },
    { name: 'Houston', lat: 29.7604, lng: -95.3698, radius: 0.05 },
    { name: 'Dallas', lat: 32.7767, lng: -96.7970, radius: 0.05 },
    { name: 'San Diego', lat: 32.7157, lng: -117.1611, radius: 0.05 },
    { name: 'Portland', lat: 45.5152, lng: -122.6784, radius: 0.05 },
    { name: 'Austin', lat: 30.2672, lng: -97.7431, radius: 0.05 },
    { name: 'Nashville', lat: 36.1627, lng: -86.7816, radius: 0.05 },
    // Add more cities for better coverage
    { name: 'Marrakech', lat: 31.6295, lng: -7.9811, radius: 0.05 },
    { name: 'Casablanca', lat: 33.5731, lng: -7.5898, radius: 0.05 },
    { name: 'Rabat', lat: 34.0209, lng: -6.8416, radius: 0.05 },
    { name: 'Fez', lat: 34.0181, lng: -5.0078, radius: 0.05 },
    { name: 'Tangier', lat: 35.7595, lng: -5.8340, radius: 0.05 },
    { name: 'Agadir', lat: 30.4278, lng: -9.5981, radius: 0.05 }
  ];

  // Check if coordinates are near any major city (tighter matching)
  for (const city of majorCities) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    );
    if (distance <= city.radius) {
      console.log(`🎯 Matched coordinates to ${city.name} (distance: ${distance.toFixed(4)})`);
      return city.name;
    }
  }

  // Enhanced regional detection with more specific areas
  if (lat >= 37.7 && lat <= 37.8 && lng >= -122.5 && lng <= -122.3) {
    return 'San Francisco Bay Area';
  } else if (lat >= 40.6 && lat <= 40.8 && lng >= -74.1 && lng <= -73.9) {
    return 'New York Metropolitan Area';
  } else if (lat >= 34.0 && lat <= 34.3 && lng >= -118.5 && lng <= -118.1) {
    return 'Los Angeles Area';
  } else if (lat >= 41.8 && lat <= 42.0 && lng >= -87.8 && lng <= -87.5) {
    return 'Chicago Area';
  } else if (lat >= 31.5 && lat <= 31.7 && lng >= -8.1 && lng <= -7.9) {
    return 'Marrakech Area';
  } else if (lat >= 33.5 && lat <= 33.6 && lng >= -7.7 && lng <= -7.5) {
    return 'Casablanca Area';
  }

  // Broader regional detection
  if (lat >= 24.396308 && lat <= 49.384358 && lng >= -125.0 && lng <= -66.93457) {
    // US state detection
    if (lat >= 32.5 && lat <= 42.0 && lng >= -124.4 && lng <= -114.1) {
      return 'California';
    } else if (lat >= 40.5 && lat <= 45.0 && lng >= -79.8 && lng <= -71.8) {
      return 'New York State';
    } else if (lat >= 25.8 && lat <= 31.0 && lng >= -87.6 && lng <= -79.8) {
      return 'Florida';
    } else if (lat >= 25.8 && lat <= 36.5 && lng >= -106.6 && lng <= -93.5) {
      return 'Texas';
    }
    return 'United States';
  } else if (lat >= 41.40338 && lat <= 51.28554 && lng >= -141.0 && lng <= -52.6480987209) {
    return 'Canada';
  } else if (lat >= 35.0 && lat <= 71.0 && lng >= -10.0 && lng <= 40.0) {
    return 'Europe';
  } else if (lat >= -55.0 && lat <= 37.0 && lng >= 60.0 && lng <= 180.0) {
    return 'Asia';
  } else if (lat >= -47.0 && lat <= -10.0 && lng >= 110.0 && lng <= 180.0) {
    return 'Australia';
  } else if (lat >= -35.0 && lat <= 37.0 && lng >= -20.0 && lng <= 55.0) {
    // Morocco detection
    if (lat >= 27.0 && lat <= 36.0 && lng >= -13.0 && lng <= -1.0) {
      return 'Morocco';
    }
    return 'Africa';
  } else if (lat >= -60.0 && lat <= 15.0 && lng >= -85.0 && lng <= -30.0) {
    return 'South America';
  }

  return `Location ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}