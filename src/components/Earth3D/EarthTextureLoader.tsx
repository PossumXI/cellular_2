import * as THREE from 'three';

export class EarthTextureLoader {
  private static instance: EarthTextureLoader;
  private loader: THREE.TextureLoader;
  private loadedTextures: Map<string, THREE.Texture> = new Map();
  private static nasaApiKey: string = '';
  private zoomLevel: number = 0;
  private tileCache: Map<string, THREE.Texture> = new Map();
  private isLoadingTilesFlag: boolean = false;

  private constructor() {
    this.loader = new THREE.TextureLoader();
  }

  static getInstance(): EarthTextureLoader {
    if (!EarthTextureLoader.instance) {
      EarthTextureLoader.instance = new EarthTextureLoader();
    }
    return EarthTextureLoader.instance;
  }

  static setNasaApiKey(apiKey: string): void {
    EarthTextureLoader.nasaApiKey = apiKey;
    console.log('🛰️ NASA API Key configured');
  }

  static preloadCommonTextures(): void {
    // This method now exists as a static method
    const instance = EarthTextureLoader.getInstance();
    instance.preloadTextures();
  }

  private async preloadTextures(): Promise<void> {
    try {
      console.log('🌍 Preloading Earth textures...');
      await this.loadEarthTextures();
      console.log('✅ Earth textures preloaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to preload textures:', error);
    }
  }

  async loadEarthTextures(mapMode?: string): Promise<{
    diffuse: THREE.Texture;
    normal?: THREE.Texture;
    specular?: THREE.Texture;
    clouds?: THREE.Texture;
  }> {
    try {
      let diffuseUrls: (string | null)[];

      switch (mapMode) {
        case 'terrain':
          diffuseUrls = [
            'https://unpkg.com/three-globe@2.30.0/example/img/earth-landcover.jpg', // Improved terrain texture
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', // Fallback
            null
          ];
          break;
        case 'streets':
          // Uses OpenStreetMap tiles when zoomed. Global view is political.
          diffuseUrls = [
            'https://unpkg.com/three-globe@2.30.0/example/img/earth-political.jpg', 
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', // Fallback
            null
          ];
          break;
        case 'hybrid':
          // Global view for hybrid will use a political map to differentiate from pure satellite.
          // Detailed hybrid tiles (satellite + streets) will load on zoom.
          diffuseUrls = [
            'https://unpkg.com/three-globe@2.30.0/example/img/earth-political.jpg', // Using political map for global hybrid view
            'https://unpkg.com/three-globe@2.30.0/example/img/earth-blue-marble.jpg', // Secondary option if political is too abstract
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', // Fallback
            null
          ];
          break;
        case 'satellite':
        default:
          diffuseUrls = [
            'https://unpkg.com/three-globe@2.30.0/example/img/earth-blue-marble.jpg', // Main satellite view
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', // Fallback 1
            'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', // Fallback 2
            null
          ];
          break;
      }

      const textureUrls = {
        diffuse: diffuseUrls,
        normal: [
          'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
          'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
          null
        ],
        specular: [
          'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
          'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
          null
        ],
        clouds: [
          'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
          'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
          null
        ]
      };

      const results: any = {};

      // Load diffuse texture (required)
      try {
        results.diffuse = await this.loadTextureWithFallbacks(textureUrls.diffuse, 'diffuse');
      } catch (e) {
        console.warn('Diffuse texture not available, using fallback');
        results.diffuse = this.createFallbackTexture('diffuse');
      }

      // Load optional textures
      try {
        results.normal = await this.loadTextureWithFallbacks(textureUrls.normal, 'normal');
      } catch (e) {
        console.warn('Normal texture not available, continuing without it');
      }

      try {
        results.specular = await this.loadTextureWithFallbacks(textureUrls.specular, 'specular');
      } catch (e) {
        console.warn('Specular texture not available, continuing without it');
      }

      try {
        results.clouds = await this.loadTextureWithFallbacks(textureUrls.clouds, 'clouds');
      } catch (e) {
        console.warn('Clouds texture not available, continuing without it');
      }

      return results;
    } catch (error) {
      console.error('Failed to load Earth textures:', error);
      // Return a basic fallback texture
      return {
        diffuse: this.createFallbackTexture('diffuse')
      };
    }
  }

  private async loadTextureWithFallbacks(urls: (string | null)[], textureType: string): Promise<THREE.Texture> {
    for (const url of urls) {
      if (!url) continue;
      
      try {
        if (typeof url === 'string') {
          const texture = await this.loadTexture(url);
          console.log(`Successfully loaded ${textureType} texture from:`, url);
          return texture;
        } else {
          // This is a fallback texture
          return this.createFallbackTexture(textureType);
        }
      } catch (error) {
        console.warn(`Failed to load ${textureType} texture from ${url}:`, error);
        continue;
      }
    }
    
    throw new Error(`Failed to load ${textureType} texture from all sources`);
  }

  // Convert lat/lng to tile coordinates
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number, y: number } {
    // Clamp latitude to avoid edge cases
    const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
    
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(clampedLat * Math.PI / 180) + 1 / Math.cos(clampedLat * Math.PI / 180)) / Math.PI) / 2 * n);
    
    // Ensure coordinates are within bounds
    return { 
      x: Math.max(0, Math.min(n - 1, x)), 
      y: Math.max(0, Math.min(n - 1, y)) 
    };
  }

  // Get map tiles for a specific location and zoom level
  async getMapTiles(lat: number, lng: number, zoom: number, mapType: string = 'satellite', gridSize: number = 3): Promise<THREE.Texture[]> {
    try {
      this.isLoadingTilesFlag = true;
      // const tiles: THREE.Texture[] = []; // Unused variable
      
      // Get API key from environment or static property
      const apiKey = EarthTextureLoader.nasaApiKey || import.meta.env.VITE_NASA_API_KEY || '';
      
      // Clamp zoom level (0-8 for NASA GIBS, 0-18 for OSM)
      const clampedZoom = mapType === 'streets' 
        ? Math.max(0, Math.min(18, zoom)) 
        : Math.max(0, Math.min(8, zoom));
      
      // Calculate center tile coordinates
      const centerTile = this.latLngToTile(lat, lng, clampedZoom);
      
      // Load grid of tiles around center
      const tilePromises: Promise<THREE.Texture>[] = [];
      const offset = Math.floor(gridSize / 2);
      
      for (let dy = -offset; dy <= offset; dy++) {
        for (let dx = -offset; dx <= offset; dx++) {
          const tileX = centerTile.x + dx;
          const tileY = centerTile.y + dy;
          
          // Skip invalid tiles
          const maxTiles = Math.pow(2, clampedZoom);
          if (tileX < 0 || tileX >= maxTiles || tileY < 0 || tileY >= maxTiles) {
            tilePromises.push(Promise.resolve(this.createFallbackTexture('tile')));
            continue;
          }
          
          // Generate tile URL based on map type
          let tileUrl: string;
          
          switch (mapType) {
            case 'streets':
              // OpenStreetMap for streets
              tileUrl = `https://tile.openstreetmap.org/${clampedZoom}/${tileX}/${tileY}.png`;
              break;
            case 'terrain':
              // NASA GIBS terrain layer
              tileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_Land_Surface_Temp_Day/default/2023-01-01/250m/${clampedZoom}/${tileY}/${tileX}.jpg`;
              break;
            case 'hybrid':
              // NASA GIBS hybrid layer
              tileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/2012-07-09/500m/${clampedZoom}/${tileY}/${tileX}.jpg`;
              break;
            case 'satellite':
            default:
              // NASA GIBS satellite layer
              tileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2012-07-09/500m/${clampedZoom}/${tileY}/${tileX}.jpg`;
          }
          
          // Add API key if available and not using OpenStreetMap
          if (apiKey && !tileUrl.includes('openstreetmap')) {
            tileUrl += `?api_key=${apiKey}`;
          }
          
          // Cache key for this tile
          const cacheKey = `tile_${mapType}_${clampedZoom}_${tileX}_${tileY}`;
          
          // Check cache first
          if (this.tileCache.has(cacheKey)) {
            tilePromises.push(Promise.resolve(this.tileCache.get(cacheKey)!));
          } else {
            const tilePromise = this.loadTexture(tileUrl)
              .then(texture => {
                this.tileCache.set(cacheKey, texture);
                return texture;
              })
              .catch(error => {
                console.warn(`Failed to load tile at ${tileX},${tileY},${clampedZoom}:`, error);
                return this.createFallbackTexture('tile');
              });
            
            tilePromises.push(tilePromise);
          }
        }
      }
      
      const loadedTiles = await Promise.all(tilePromises);
      this.isLoadingTilesFlag = false;
      return loadedTiles;
      
    } catch (error) {
      console.error('Failed to load map tiles:', error);
      this.isLoadingTilesFlag = false;
      return Array(gridSize * gridSize).fill(null).map(() => this.createFallbackTexture('tile'));
    }
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (this.loadedTextures.has(url)) {
        resolve(this.loadedTextures.get(url)!.clone());
        return;
      }

      this.loader.load(
        url,
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          
          // Cache the texture
          this.loadedTextures.set(url, loadedTexture);
          resolve(loadedTexture);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  createFallbackTexture(type: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create a gradient based on texture type
    switch (type) {
      case 'diffuse':
        // Blue to green gradient for Earth-like appearance
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#4A90E2'); // Sky blue
        gradient.addColorStop(0.3, '#7ED321'); // Green
        gradient.addColorStop(0.7, '#8B4513'); // Brown
        gradient.addColorStop(1, '#2E8B57'); // Sea green
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some noise for texture
        for (let i = 0; i < 1000; i++) {
          ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
          ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
        }
        break;
        
      case 'normal':
        // Gray texture for normal map
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Add some random bumps
        for (let i = 0; i < 500; i++) {
          const shade = 128 + Math.floor(Math.random() * 60) - 30;
          ctx.fillStyle = `rgb(${shade}, ${shade}, 255)`;
          ctx.beginPath();
          ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
                  Math.random() * 5 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      case 'specular':
        // Dark texture with some bright spots for specular
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Add some bright spots
        for (let i = 0; i < 300; i++) {
          const brightness = Math.floor(Math.random() * 200) + 55;
          ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
          ctx.beginPath();
          ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
                  Math.random() * 3 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      case 'clouds':
        // Transparent with white cloud-like patterns
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Add cloud patterns
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const radius = Math.random() * 30 + 10;
          const alpha = Math.random() * 0.5 + 0.1;
          
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      case 'tile':
        // Grid pattern for missing tiles
        ctx.fillStyle = '#1a1a4a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#4a4a8a';
        ctx.lineWidth = 2;
        
        // Draw grid
        for (let x = 0; x < canvas.width; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        
        // Add text
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tile', canvas.width / 2, canvas.height / 2 - 12);
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2 + 24);
        break;
        
      default:
        // Default gray texture
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    console.log(`Created fallback ${type} texture`);
    return texture;
  }

  // Set current zoom level
  setZoomLevel(zoom: number): void {
    this.zoomLevel = Math.floor(zoom);
  }

  // Get current zoom level
  getZoomLevel(): number {
    return this.zoomLevel;
  }

  // Check if tiles are currently loading
  isLoadingTiles(): boolean {
    return this.isLoadingTilesFlag;
  }

  dispose(): void {
    this.loadedTextures.forEach(texture => texture.dispose());
    this.loadedTextures.clear();
    this.tileCache.forEach(texture => texture.dispose());
    this.tileCache.clear();
  }
}

export default EarthTextureLoader;
