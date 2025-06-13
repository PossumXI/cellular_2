import { secureApiProxy } from './secureApiProxy';
import { config } from '../config';

export class GeocodingService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = config.google.mapsApiKey;
  }
  
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      // Use secure API proxy instead of direct API call
      const data = await secureApiProxy.callGoogleMaps('geocode', {
        latlng: `${lat},${lng}`,
        result_type: 'locality|administrative_area_level_1|country'
      });
      
      if (data.results && data.results.length > 0) {
        // Try to get city name from address components
        const result = data.results[0];
        const cityComponent = result.address_components.find((component: any) =>
          component.types.includes('locality')
        );
        
        const stateComponent = result.address_components.find((component: any) =>
          component.types.includes('administrative_area_level_1')
        );
        
        if (cityComponent && stateComponent) {
          return `${cityComponent.long_name}, ${stateComponent.short_name}`;
        } else if (cityComponent) {
          return cityComponent.long_name;
        } else if (stateComponent) {
          return stateComponent.long_name;
        }
        
        // Fallback to formatted address
        const addressParts = result.formatted_address.split(',');
        return addressParts[0].trim();
      }
      
      return `Location ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `Location ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
  }

  // Enhanced method to get detailed location name with multiple components
  async getDetailedLocationName(lat: number, lng: number): Promise<string> {
    try {
      // Use secure API proxy instead of direct API call
      const data = await secureApiProxy.callGoogleMaps('geocode', {
        latlng: `${lat},${lng}`,
        result_type: 'locality|sublocality|neighborhood|administrative_area_level_1|administrative_area_level_2|country|point_of_interest|establishment'
      });
      
      if (data.results && data.results.length > 0) {
        // Priority order for location naming
        const priorityTypes = [
          'point_of_interest',     // Specific landmark - highest priority
          'establishment',         // Business or facility
          'locality',              // City
          'neighborhood',          // Neighborhood
          'sublocality_level_1',   
          'sublocality',
          'administrative_area_level_2', // County
          'administrative_area_level_1', // State/Province
          'country'                // Least specific
        ];

        let bestMatch = null;
        let bestPriority = 999;
        let cityName = null;
        let stateName = null;
        let pointOfInterest = null;

        // Find the best match and extract city/state info
        for (const result of data.results) {
          for (const component of result.address_components) {
            // Extract city and state for combination
            if (component.types.includes('locality')) {
              cityName = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              stateName = component.short_name || component.long_name;
            }
            if (component.types.includes('point_of_interest') || component.types.includes('establishment')) {
              pointOfInterest = component.long_name;
            }
            
            // Find best match based on priority
            for (let i = 0; i < priorityTypes.length; i++) {
              if (component.types.includes(priorityTypes[i]) && i < bestPriority) {
                bestMatch = component.long_name;
                bestPriority = i;
                break;
              }
            }
          }
        }

        // Build the most descriptive name
        if (pointOfInterest) {
          // If we have a specific point of interest, use it with the city
          if (cityName) {
            return `${pointOfInterest}, ${cityName}`;
          }
          return pointOfInterest;
        } else if (cityName && stateName && bestPriority <= 2) {
          // We have a city and state, use both
          return `${cityName}, ${stateName}`;
        } else if (bestMatch) {
          // Use the best match we found
          if (bestPriority <= 2 && stateName && bestMatch !== stateName) {
            // City with state
            return `${bestMatch}, ${stateName}`;
          }
          return bestMatch;
        }

        // Fallback to formatted address parsing
        const formattedAddress = data.results[0].formatted_address;
        const parts = formattedAddress.split(',').map(part => part.trim());
        
        // Return the first meaningful part (not a number/postal code)
        for (const part of parts) {
          if (!/^\d+/.test(part) && part.length > 2) {
            return part;
          }
        }
      }
      
      // Instead of throwing an error, fall back to basic reverse geocoding
      return await this.reverseGeocode(lat, lng);
    } catch (error) {
      console.error('Error getting detailed location name:', error);
      // Fallback to basic reverse geocoding
      return await this.reverseGeocode(lat, lng);
    }
  }

  // Get location with additional context
  async getLocationWithContext(lat: number, lng: number): Promise<any> {
    try {
      // Use secure API proxy instead of direct API call
      const data = await secureApiProxy.callGoogleMaps('geocode', {
        latlng: `${lat},${lng}`,
        result_type: 'locality|sublocality|neighborhood|administrative_area_level_1|administrative_area_level_2|country|point_of_interest|establishment'
      });
      
      if (!data.results || data.results.length === 0) {
        return { name: 'Unknown Location' };
      }
      
      const result = data.results[0];
      const components = result.address_components;
      
      const context = {
        name: result.formatted_address.split(',')[0],
        city: components.find((c: any) => c.types.includes('locality'))?.long_name,
        state: components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name,
        country: components.find((c: any) => c.types.includes('country'))?.long_name,
        neighborhood: components.find((c: any) => c.types.includes('neighborhood'))?.long_name,
        pointOfInterest: components.find((c: any) => c.types.includes('point_of_interest'))?.long_name,
        formattedAddress: result.formatted_address
      };
      
      return context;
    } catch (error) {
      console.error('Error getting location context:', error);
      return { name: 'Unknown Location' };
    }
  }

  // Search for a location by name
  async searchLocation(query: string): Promise<{ name: string; lat: number; lng: number } | null> {
    try {
      // Use secure API proxy instead of direct API call
      const data = await secureApiProxy.callGoogleMaps('geocode', {
        address: query
      });
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          name: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error searching location:', error);
      return null;
    }
  }

  // Search for multiple places
  async searchPlaces(query: string): Promise<Array<{
    name: string;
    lat: number;
    lng: number;
    types?: string[];
    placeId?: string;
    address?: string;
    rating?: number;
    country?: string;
  }>> {
    try {
      // Use secure API proxy instead of direct API call
      const data = await secureApiProxy.callGoogleMaps('place/textsearch', {
        query,
        fields: 'formatted_address,name,geometry,place_id,types,rating'
      });
      
      if (data.results && data.results.length > 0) {
        return data.results.map((result: any) => {
          // Extract country from address components if available
          const addressParts = result.formatted_address?.split(', ') || [];
          const country = addressParts.length > 0 ? addressParts[addressParts.length - 1] : undefined;
          
          return {
            name: result.name,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            types: result.types,
            placeId: result.place_id,
            address: result.formatted_address,
            rating: result.rating,
            country
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  // Convert coordinates to a more readable format
  formatCoordinates(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
  }

  // Calculate distance between two points
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const geocodingService = new GeocodingService();