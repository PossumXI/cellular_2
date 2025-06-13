import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Clock, Star, Loader, Globe, Navigation } from 'lucide-react';
import { geocodingService } from '../../lib/apis/geocoding';

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
  type: string;
  country?: string;
  region?: string;
  placeId?: string;
  rating?: number;
  formattedAddress?: string;
}

interface LocationSearchProps {
  onLocationSelect: (coordinates: [number, number], name: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export default function LocationSearch({ onLocationSelect, isVisible, onClose }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [popularLocations] = useState<SearchResult[]>([
    { name: 'Times Square, New York', lat: 40.7580, lng: -73.9855, type: 'landmark', country: 'United States', rating: 4.3 },
    { name: 'Tokyo Tower', lat: 35.6586, lng: 139.7454, type: 'landmark', country: 'Japan', rating: 4.1 },
    { name: 'Big Ben, London', lat: 51.5007, lng: -0.1246, type: 'landmark', country: 'United Kingdom', rating: 4.5 },
    { name: 'Eiffel Tower, Paris', lat: 48.8584, lng: 2.2945, type: 'landmark', country: 'France', rating: 4.6 },
    { name: 'Sydney Opera House', lat: -33.8568, lng: 151.2153, type: 'landmark', country: 'Australia', rating: 4.4 },
    { name: 'Mount Everest Base Camp', lat: 27.9881, lng: 86.9250, type: 'natural', country: 'Nepal', rating: 4.8 },
    { name: 'Machu Picchu', lat: -13.1631, lng: -72.5450, type: 'landmark', country: 'Peru', rating: 4.7 },
    { name: 'Great Wall of China', lat: 40.4319, lng: 116.5704, type: 'landmark', country: 'China', rating: 4.6 },
    { name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, type: 'landmark', country: 'United States', rating: 4.4 },
    { name: 'Taj Mahal', lat: 27.1751, lng: 78.0421, type: 'landmark', country: 'India', rating: 4.5 },
    { name: 'Christ the Redeemer', lat: -22.9519, lng: -43.2105, type: 'landmark', country: 'Brazil', rating: 4.6 },
    { name: 'Santorini, Greece', lat: 36.3932, lng: 25.4615, type: 'city', country: 'Greece', rating: 4.5 },
    // Added Morocco and other locations for better search coverage
    { name: 'Marrakech, Morocco', lat: 31.6295, lng: -7.9811, type: 'city', country: 'Morocco', rating: 4.3 },
    { name: 'Casablanca, Morocco', lat: 33.5731, lng: -7.5898, type: 'city', country: 'Morocco', rating: 4.1 },
    { name: 'Fez, Morocco', lat: 34.0181, lng: -5.0078, type: 'city', country: 'Morocco', rating: 4.4 },
    { name: 'Rabat, Morocco', lat: 34.0209, lng: -6.8416, type: 'city', country: 'Morocco', rating: 4.2 },
    { name: 'Tangier, Morocco', lat: 35.7595, lng: -5.8340, type: 'city', country: 'Morocco', rating: 4.0 },
    { name: 'Agadir, Morocco', lat: 30.4278, lng: -9.5981, type: 'city', country: 'Morocco', rating: 4.1 }
  ]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('cellular-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const saveRecentSearch = (result: SearchResult) => {
    const updated = [result, ...recentSearches.filter(r => r.name !== result.name)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('cellular-recent-searches', JSON.stringify(updated));
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      console.log('🔍 Searching for:', searchQuery);
      
      // First, try to find in popular locations for instant results
      const popularMatches = popularLocations.filter(loc => 
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.country?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // If we have popular matches, show them immediately
      if (popularMatches.length > 0) {
        setResults(popularMatches);
      }

      // Enhanced search with multiple results using Google Places API
      const places = await geocodingService.searchPlaces(searchQuery);
      
      if (places && places.length > 0) {
        console.log('✅ Found places:', places.length);
        
        const searchResults: SearchResult[] = await Promise.all(
          places.slice(0, 8).map(async (place) => {
            // Get enhanced location name for each result
            let enhancedName = place.name;
            try {
              const detailedName = await geocodingService.getDetailedLocationName(place.lat, place.lng);
              if (detailedName && detailedName !== place.name) {
                enhancedName = detailedName;
              }
            } catch (error) {
              // Keep original name if enhancement fails
            }

            return {
              name: enhancedName,
              lat: place.lat,
              lng: place.lng,
              type: place.types?.[0] || 'location',
              placeId: place.placeId,
              rating: place.rating,
              formattedAddress: place.address,
              country: place.country
            };
          })
        );
        
        // Combine popular matches with API results, removing duplicates
        const combinedResults = [...popularMatches];
        searchResults.forEach(apiResult => {
          const isDuplicate = combinedResults.some(existing => 
            Math.abs(existing.lat - apiResult.lat) < 0.01 && 
            Math.abs(existing.lng - apiResult.lng) < 0.01
          );
          if (!isDuplicate) {
            combinedResults.push(apiResult);
          }
        });
        
        setResults(combinedResults.slice(0, 10));
        setError(null);
      } else if (popularMatches.length === 0) {
        // Fallback to single location search if no popular matches and no API results
        const result = await geocodingService.searchLocation(searchQuery);
        if (result) {
          // Enhance the single result name too
          let enhancedName = result.name;
          try {
            const detailedName = await geocodingService.getDetailedLocationName(result.lat, result.lng);
            if (detailedName) {
              enhancedName = detailedName;
            }
          } catch (error) {
            // Keep original name
          }

          setResults([{
            name: enhancedName,
            lat: result.lat,
            lng: result.lng,
            type: 'location',
            formattedAddress: result.name
          }]);
          setError(null);
        } else {
          // No results found
          setResults([]);
          setError(`No locations found for "${searchQuery}"`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('An error occurred while searching. Please try again.');
      
      // Show popular locations as fallback
      const filtered = popularLocations.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.country?.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationClick = (result: SearchResult) => {
    console.log('🌍 Selected location:', result.name, [result.lng, result.lat]);
    // Ensure coordinates are passed in the correct order [lng, lat]
    onLocationSelect([result.lng, result.lat], result.name);
    saveRecentSearch(result);
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleLocationClick(results[selectedIndex]);
    } else if (e.key === 'Enter' && query.trim() && results.length === 0 && !isSearching) {
      // If user presses Enter with a query but no results, trigger search again
      handleSearch(query);
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'landmark':
      case 'tourist_attraction':
        return '🏛️';
      case 'natural':
      case 'natural_feature':
        return '🏔️';
      case 'city':
      case 'locality':
        return '🏙️';
      case 'country':
        return '🌍';
      default:
        return '📍';
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query);
      } else {
        setResults([]);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="w-full max-w-3xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-surface-deep/95 backdrop-blur-lg rounded-2xl border border-accent-neural/20 shadow-2xl overflow-hidden">
          {/* Search Header */}
          <div className="p-6 border-b border-surface-light">
            <div className="flex items-center gap-4 mb-4">
              <Globe className="text-accent-neural" size={24} />
              <h2 className="text-xl font-bold text-white">Explore Earth</h2>
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search for any place on Earth..."
                className="w-full bg-white/95 border border-surface-light rounded-xl pl-12 pr-12 py-4 text-gray-900 placeholder-gray-600 focus:border-accent-neural focus:outline-none text-lg"
                style={{ color: '#1a1a1a !important' }}
                autoFocus
                id="location-search"
                name="location-search"
              />
              {isSearching && (
                <Loader className="absolute right-4 top-1/2 transform -translate-y-1/2 text-accent-neural animate-spin" size={20} />
              )}
              {!isSearching && query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="mt-3 text-sm text-gray-400">
              Try: "Morocco", "New York", "Eiffel Tower", "Mount Fuji", "Sydney Opera House"
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 m-4 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            {query && results.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-accent-neural mb-3 flex items-center gap-2">
                  <Navigation size={16} />
                  Search Results ({results.length})
                </h3>
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleLocationClick(result)}
                      className={`w-full text-left p-3 rounded-lg transition-all group ${
                        selectedIndex === index 
                          ? 'bg-accent-neural/20 border border-accent-neural' 
                          : 'bg-surface-mid hover:bg-surface-light border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">
                          {getLocationIcon(result.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white group-hover:text-accent-neural transition-colors truncate">
                            {result.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="capitalize">{result.type.replace('_', ' ')}</span>
                            {result.country && (
                              <>
                                <span>•</span>
                                <span>{result.country}</span>
                              </>
                            )}
                            {result.rating && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  ⭐ {result.rating}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {geocodingService.formatCoordinates(result.lat, result.lng)}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-4 border-b border-surface-light">
                <h3 className="text-sm font-semibold text-accent-neural mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  Recent Searches
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recentSearches.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleLocationClick(result)}
                      className="text-left p-3 rounded-lg bg-surface-mid hover:bg-surface-light transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Clock size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white group-hover:text-accent-neural transition-colors text-sm truncate">
                            {result.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {geocodingService.formatCoordinates(result.lat, result.lng)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Destinations */}
            {!query && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-accent-neural mb-3 flex items-center gap-2">
                  <Star size={16} />
                  Popular Destinations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {popularLocations.slice(0, 12).map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleLocationClick(result)}
                      className="text-left p-3 rounded-lg bg-surface-mid hover:bg-surface-light transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg flex-shrink-0">
                          {getLocationIcon(result.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white group-hover:text-accent-neural transition-colors text-sm truncate">
                            {result.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{result.country}</span>
                            {result.rating && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  ⭐ {result.rating}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query && !isSearching && results.length === 0 && !error && (
              <div className="p-8 text-center">
                <Globe size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No locations found</h3>
                <p className="text-gray-400 mb-4">
                  Try searching for a city name, landmark, or famous place
                </p>
                <div className="text-sm text-gray-500">
                  Examples: "Morocco", "Tokyo Tower", "Central Park", "Golden Gate Bridge"
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}