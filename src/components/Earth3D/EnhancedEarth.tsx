import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import LocationMarker from './LocationMarker';
import SatelliteLayer from './SatelliteLayer';
import ConnectivityLayer from './ConnectivityLayer';
import PopulationLayer from './PopulationLayer';
import SocialMediaLayer from './SocialMediaLayer';
import MovementLayer from './MovementLayer'; // Import MovementLayer
import WarZones from './WarZones';
import { EarthTextureLoader } from './EarthTextureLoader';
import EpicImageLayer from './EpicImageLayer'; // Import EpicImageLayer

interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
  isActive?: boolean;
  lastInteraction?: Date; // Changed from string to Date
}

interface EnhancedEarthProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  showSatellites?: boolean;
  showConnectivity?: boolean;
  showPopulation?: boolean;
  showSocialMedia?: boolean;
  showMovement?: boolean; // Add prop for movement layer
  showWarZones?: boolean;
  mapMode?: 'satellite' | 'terrain' | 'hybrid' | 'streets';
  dayNightCycle?: boolean;
  targetPosition?: THREE.Vector3;
  targetZoom?: number;
  className?: string;
  onWarZoneSelect?: (warZone: {
    name: string;
    description: string;
    casualties: string;
    started: string;
    latestUpdate: string;
  }) => void;
  showEpicImage?: boolean; // Add new prop
}

export function EnhancedEarth({
  locations, 
  selectedLocation, 
  onLocationSelect,
  showSatellites = false,
  showConnectivity = false,
  showPopulation = false,
  showSocialMedia = false,
  showMovement = false, // Add to destructuring
  showWarZones = false,
  mapMode = 'satellite',
  dayNightCycle = true,
  targetPosition,
  targetZoom,
  className = "",
  onWarZoneSelect,
  showEpicImage = false // Add to destructuring with default
}: EnhancedEarthProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const { scene, camera } = useThree();
  const [textures, setTextures] = useState<{
    diffuse?: THREE.Texture;
    normal?: THREE.Texture;
    specular?: THREE.Texture;
    clouds?: THREE.Texture;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [nasaApiKey, setNasaApiKey] = useState<string | null>(null);

  const textureLoader = useMemo(() => EarthTextureLoader.getInstance(), []);

  // Initialize EarthTextureLoader static methods
  useEffect(() => {
    // Preload Earth textures
    EarthTextureLoader.preloadCommonTextures();
    
    // Set NASA API key from environment variable
    const apiKey = import.meta.env.VITE_NASA_API_KEY || '';
    setNasaApiKey(apiKey);
    
    if (apiKey) {
      console.log('🛰️ Using NASA API key from environment variables');
      EarthTextureLoader.setNasaApiKey(apiKey);
    } else {
      console.log('⚠️ No NASA API key found in environment variables, using public access');
    }
  }, []);

  // Handle camera animation to target position
  useEffect(() => {
    if (targetPosition && camera) {
      const originalPosition = camera.position.clone();
      const targetDistance = targetZoom || 6;
      const targetDirection = targetPosition.clone().normalize();
      const newPosition = targetDirection.multiplyScalar(targetDistance);
      
      let frame = 0;
      const totalFrames = 60;
      
      const animateCamera = () => {
        if (frame < totalFrames) {
          frame++;
          const t = frame / totalFrames;
          const smoothT = t * t * (3 - 2 * t); // Smooth step interpolation
          
          camera.position.lerpVectors(originalPosition, newPosition, smoothT);
          camera.lookAt(0, 0, 0);
          
          requestAnimationFrame(animateCamera);
        }
      };
      
      animateCamera();
    }
  }, [targetPosition, targetZoom, camera]);

  useEffect(() => {
    let mounted = true;

    const loadTextures = async () => {
      try {
        setIsLoading(true);
        // Pass mapMode to loadEarthTextures.
        // We will update EarthTextureLoader to handle this in the next step.
        const loadedTextures = await textureLoader.loadEarthTextures(mapMode); 
        
        if (mounted) {
          setTextures(loadedTextures);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading Earth textures for mapMode:', mapMode, error);
        if (mounted) {
          // Create a basic fallback
          const fallbackTexture = textureLoader.createFallbackTexture('diffuse');
          setTextures({ diffuse: fallbackTexture }); // Ensure other optional textures are cleared or handled
          setIsLoading(false);
        }
      }
    };

    loadTextures();

    return () => {
      mounted = false;
    };
  }, [textureLoader, mapMode]); // Add mapMode to dependencies

  useFrame((state) => {
    if (earthRef.current) {
      // Slow rotation for the Earth
      earthRef.current.rotation.y += 0.0005;
    }
    if (cloudMeshRef.current) {
      // Slightly faster rotation for clouds
      cloudMeshRef.current.rotation.y += 0.0007;
    }
  });

  // Add ambient and directional lighting
  useEffect(() => {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    
    scene.add(ambientLight);
    scene.add(directionalLight);

    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);
    };
  }, [scene]);

  if (isLoading || !textures.diffuse) {
    return (
      <mesh>
        <sphereGeometry args={[5, 64, 64]} />
        <meshBasicMaterial color="#4A90E2" wireframe />
      </mesh>
    );
  }

  // The earthTexture will now be the mapMode-specific diffuse texture loaded into state
  const earthTexture = textures.diffuse;

  return (
    <group>
      {/* Earth sphere */}
      <mesh ref={earthRef} scale={[5, 5, 5]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial 
          map={earthTexture}
          normalMap={textures.normal}
          specularMap={textures.specular}
          shininess={100}
        />
      </mesh>

      {/* Cloud layer */}
      {textures.clouds && (
        <mesh ref={cloudMeshRef} scale={[5.05, 5.05, 5.05]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshPhongMaterial
            map={textures.clouds}
            transparent={true}
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Location markers */}
      {locations.map((location) => (
        <LocationMarker
          key={location.id}
          location={location}
          isActive={selectedLocation?.id === location.id}
          onClick={() => onLocationSelect(location)}
        />
      ))}

      {/* Optional layers */}
      {showSatellites && <SatelliteLayer visible={showSatellites} />}
      {showConnectivity && <ConnectivityLayer isVisible={showConnectivity} currentLatitude={0} currentLongitude={0} />}
      {showPopulation && <PopulationLayer visible={showPopulation} />}
      {showSocialMedia && <SocialMediaLayer isVisible={showSocialMedia} />}
      {showMovement && <MovementLayer isVisible={showMovement} />}
      {showWarZones && <WarZones visible={showWarZones} onWarZoneSelect={onWarZoneSelect} />}
      {showEpicImage && <EpicImageLayer visible={showEpicImage} />} {/* Render EpicImageLayer */}
    </group>
  );
}

export default EnhancedEarth;
