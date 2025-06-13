import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EarthTextureLoader } from './EarthTextureLoader';
import { Text } from '@react-three/drei';

interface DetailedEarthLayerProps {
  visible: boolean;
  coordinates: [number, number]; // [lng, lat]
  zoom: number;
  mapMode: 'satellite' | 'terrain' | 'hybrid' | 'streets';
}

export default function DetailedEarthLayer({ 
  visible, 
  coordinates, 
  zoom,
  mapMode
}: DetailedEarthLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [tiles, setTiles] = useState<THREE.Texture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const { camera } = useThree();
  
  const textureLoader = useMemo(() => EarthTextureLoader.getInstance(), []);
  
  // Memoize load parameters to prevent unnecessary reloads
  const loadKey = useMemo(() => {
    if (!visible || !coordinates) return null;
    // Calculate effective zoom level (0-18)
    const effectiveZoom = Math.min(18, Math.max(0, Math.floor(12 - zoom)));
    setZoomLevel(effectiveZoom);
    return `${coordinates[0].toFixed(4)}-${coordinates[1].toFixed(4)}-${effectiveZoom}-${mapMode}`;
  }, [visible, coordinates, zoom, mapMode]);

  // Load tiles when parameters change
  useEffect(() => {
    if (!loadKey || !coordinates) {
      setTiles([]);
      return;
    }
    
    let isCancelled = false;
    
    const loadTiles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [lng, lat] = coordinates;
        // Calculate zoom level (0-18)
        const effectiveZoom = Math.min(18, Math.max(0, Math.floor(12 - zoom)));
        
        console.log(`🌍 Loading detailed tiles for [${lat.toFixed(4)}, ${lng.toFixed(4)}] at zoom ${effectiveZoom}, mode: ${mapMode}`);
        
        // Load a 3x3 grid of tiles
        const loadedTiles = await textureLoader.getMapTiles(lat, lng, effectiveZoom, mapMode, 3);
        
        if (!isCancelled) {
          setTiles(loadedTiles);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error('Error loading detailed tiles:', err);
          setError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    
    loadTiles();
    
    return () => {
      isCancelled = true;
    };
  }, [loadKey, coordinates, zoom, mapMode, textureLoader]);
  
  // Position the layer on Earth's surface
  useEffect(() => {
    if (!groupRef.current || !coordinates) return;
    
    const [lng, lat] = coordinates;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const radius = 5.01; // Slightly above Earth surface
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    groupRef.current.position.set(x, y, z);
    
    // Orient to be tangent to the Earth's surface
    groupRef.current.lookAt(0, 0, 0);
    groupRef.current.rotateX(Math.PI / 2);
  }, [coordinates]);
  
  // Make the layer face the camera
  useFrame(() => {
    if (!groupRef.current || !coordinates || !camera) return;
    
    // Get the direction from the center of the Earth to the layer
    const direction = new THREE.Vector3().copy(groupRef.current.position).normalize();
    
    // Calculate the up vector (perpendicular to the direction)
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, direction).normalize();
    up.crossVectors(direction, right).normalize();
    
    // Create a rotation matrix
    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, direction);
    
    // Apply the rotation
    groupRef.current.setRotationFromMatrix(rotMatrix);
  });
  
  // Animate loading indicator
  useFrame((state) => {
    if (!groupRef.current || !isLoading) return;
    
    const time = state.clock.getElapsedTime();
    const loadingMesh = groupRef.current.children.find(child => 
      child.userData && child.userData.isLoadingIndicator
    );
    
    if (loadingMesh) {
      loadingMesh.rotation.z = time * 2;
    }
  });
  
  if (!visible || !coordinates) return null;
  
  // Calculate tile size based on zoom level
  const tileSize = 0.2 * Math.pow(0.8, Math.max(0, 10 - zoom));
  
  return (
    <group ref={groupRef}>
      {/* Loading indicator */}
      {isLoading && (
        <mesh position={[0, 0, 0.01]} userData={{ isLoadingIndicator: true }}>
          <ringGeometry args={[0.08, 0.12, 16]} />
          <meshBasicMaterial color="#00FFAA" transparent opacity={0.7} />
        </mesh>
      )}
      
      {/* Error indicator */}
      {error && !isLoading && (
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color="#FF4444" transparent opacity={0.7} />
          <Text
            position={[0, 0, 0.001]}
            fontSize={0.03}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            Error loading tiles
          </Text>
        </mesh>
      )}
      
      {/* Detailed tiles */}
      {tiles.length > 0 && tiles.map((tile, index) => {
        // Calculate position in 3x3 grid
        const row = Math.floor(index / 3) - 1;
        const col = (index % 3) - 1;
        
        return (
          <mesh 
            key={`tile-${index}-${loadKey}`}
            position={[col * tileSize, row * tileSize, 0.001]}
          >
            <planeGeometry args={[tileSize, tileSize]} />
            <meshBasicMaterial 
              map={tile} 
              transparent 
              opacity={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      
      {/* Map type indicator */}
      <mesh position={[0, -tileSize * 1.5, 0.002]}>
        <planeGeometry args={[tileSize * 1.5, tileSize * 0.3]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
        <Text
          position={[0, 0, 0.001]}
          fontSize={tileSize * 0.15}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          {mapMode.charAt(0).toUpperCase() + mapMode.slice(1)} View • Zoom {zoomLevel}
        </Text>
      </mesh>
      
      {/* Center marker */}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[0.005, 8]} />
        <meshBasicMaterial color="#FF4444" />
      </mesh>
    </group>
  );
}