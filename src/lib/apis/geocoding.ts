import { config } from '../config';

export class GeocodingService {
  private apiKey = config.google.mapsApiKey;

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}&result_type=locality|administrative_area_level_1|country`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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
      // Use a more comprehensive approach with multiple result types
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}&result_type=locality|sublocality|neighborhood|administrative_area_level_1|administrative_area_level_2|country|point_of_interest|establishment`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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

  // Enhanced method to get location with context (city, state, country)
  async getLocationWithContext(lat: number, lng: number): Promise<{
    name: string;
    city?: string;
    state?: string;
    country?: string;
    formattedAddress: string;
    pointsOfInterest?: string[];
  } | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;

        const pointOfInterest = components.find((comp: any) => 
          comp.types.includes('point_of_interest') || comp.types.includes('establishment')
        )?.long_name;

        const neighborhood = components.find((comp: any) => 
          comp.types.includes('neighborhood') || comp.types.includes('sublocality')
        )?.long_name;

        const city = components.find((comp: any) => 
          comp.types.includes('locality')
        )?.long_name;

        const state = components.find((comp: any) => 
          comp.types.includes('administrative_area_level_1')
        )?.long_name;

        const stateShort = components.find((comp: any) => 
          comp.types.includes('administrative_area_level_1')
        )?.short_name;

        const country = components.find((comp: any) => 
          comp.types.includes('country')
        )?.long_name;

        // Collect nearby points of interest
        const pointsOfInterest: string[] = [];
        data.results.forEach((res: any) => {
          const poi = res.address_components.find((comp: any) => 
            comp.types.includes('point_of_interest') || comp.types.includes('establishment')
          )?.long_name;
          
          if (poi && !pointsOfInterest.includes(poi)) {
            pointsOfInterest.push(poi);
          }
        });

        // Determine the best name to use with proper formatting
        let name = 'Unknown Location';
        
        if (pointOfInterest) {
          name = city ? `${pointOfInterest}, ${city}` : pointOfInterest;
        } else if (city && stateShort) {
          name = `${city}, ${stateShort}`;
        } else if (city && state) {
          name = `${city}, ${state}`;
        } else if (city) {
          name = city;
        } else if (neighborhood) {
          name = neighborhood;
        } else if (state) {
          name = state;
        } else if (country) {
          name = country;
        }

        return {
          name,
          city,
          state: stateShort || state,
          country,
          formattedAddress: result.formatted_address,
          pointsOfInterest: pointsOfInterest.length > 0 ? pointsOfInterest : undefined
        };
      }
      
      // Return null instead of throwing an error when no location data is found
      return null;
    } catch (error) {
      console.error('Error getting location with context:', error);
      return {
        name: 'Unknown Location',
        formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      };
    }
  }

  async searchLocation(query: string): Promise<{lat: number, lng: number, name: string, placeId?: string} | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        
        // Extract proper name from components
        const components = result.address_components;
        const city = components.find((comp: any) => comp.types.includes('locality'))?.long_name;
        const state = components.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.short_name;
        const poi = components.find((comp: any) => 
          comp.types.includes('point_of_interest') || comp.types.includes('establishment')
        )?.long_name;
        
        let name = result.formatted_address.split(',')[0];
        if (poi) {
          name = poi;
        } else if (city && state) {
          name = `${city}, ${state}`;
        } else if (city) {
          name = city;
        }
        
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          name,
          placeId: result.place_id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  }

  async searchPlaces(query: string, location?: { lat: number, lng: number }, radius: number = 50000): Promise<any[]> {
    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
      
      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=${radius}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results) {
        return data.results.map((place: any) => ({
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          address: place.formatted_address,
          rating: place.rating,
          types: place.types,
          placeId: place.place_id,
          photos: place.photos,
          country: this.extractCountry(place.formatted_address)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  private extractCountry(formattedAddress: string): string | undefined {
    if (!formattedAddress) return undefined;
    
    const parts = formattedAddress.split(',');
    if (parts.length > 0) {
      return parts[parts.length - 1].trim();
    }
    
    return undefined;
  }

  async getPlaceDetails(placeId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,geometry,formatted_address,photos,types,rating,reviews,website,phone_number,opening_hours,price_level&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
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