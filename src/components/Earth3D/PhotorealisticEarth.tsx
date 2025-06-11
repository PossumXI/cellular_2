import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, TextureLoader, CanvasTexture, Vector3, Texture } from 'three';
import * as THREE from 'three';

interface PhotorealisticEarthProps {
  onLocationClick?: (coordinates: [number, number]) => void;
  showSatelliteLayer?: boolean;
  cloudOpacity?: number;
  dayNightCycle?: boolean;
  targetPosition?: Vector3;
  targetZoom?: number;
  mapMode?: 'satellite' | 'terrain' | 'hybrid';
}

export default function PhotorealisticEarth({ 
  onLocationClick,
  showSatelliteLayer = true,
  cloudOpacity = 0.3,
  dayNightCycle = true,
  targetPosition,
  targetZoom,
  mapMode = 'satellite'
}: PhotorealisticEarthProps) {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);
  const { camera } = useThree();
  const [currentTexture, setCurrentTexture] = useState<Texture | null>(null);
  
  // Enhanced Earth textures for different modes
  const earthTextures = useMemo(() => {
    const createSatelliteTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4096;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create high-resolution satellite-style texture
        const gradient = ctx.createRadialGradient(2048, 1024, 0, 2048, 1024, 2048);
        gradient.addColorStop(0, '#1a4d3a');
        gradient.addColorStop(0.3, '#2d7a3d');
        gradient.addColorStop(0.6, '#0a5f2a');
        gradient.addColorStop(1, '#0a2f1f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 4096, 2048);
        
        // Add realistic continent shapes with high detail
        const continents = [
          // North America
          { x: 800, y: 600, size: 400, detail: 12, color: '#00C896' },
          // South America
          { x: 1000, y: 1200, size: 300, detail: 8, color: '#7CB342' },
          // Europe
          { x: 2200, y: 500, size: 200, detail: 6, color: '#8BC34A' },
          // Africa
          { x: 2300, y: 900, size: 350, detail: 10, color: '#689F38' },
          // Asia
          { x: 2800, y: 600, size: 500, detail: 15, color: '#558B2F' },
          // Australia
          { x: 3200, y: 1300, size: 150, detail: 5, color: '#33691E' }
        ];

        continents.forEach(continent => {
          ctx.fillStyle = continent.color;
          for (let i = 0; i < continent.detail; i++) {
            ctx.beginPath();
            ctx.arc(
              continent.x + (Math.random() - 0.5) * continent.size,
              continent.y + (Math.random() - 0.5) * continent.size * 0.6,
              Math.random() * (continent.size / 6) + 15,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        });

        // Add detailed coastlines and islands
        ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < 800; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * 4096,
            Math.random() * 2048,
            Math.random() * 8 + 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Add city lights for night mode
        ctx.fillStyle = 'rgba(255, 255, 150, 0.8)';
        for (let i = 0; i < 300; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * 4096,
            Math.random() * 2048,
            Math.random() * 3 + 1,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      
      return new CanvasTexture(canvas);
    };

    const createTerrainTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4096;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create terrain-style texture with elevation colors
        const gradient = ctx.createLinearGradient(0, 0, 0, 2048);
        gradient.addColorStop(0, '#8B4513'); // Mountains
        gradient.addColorStop(0.3, '#228B22'); // Forests
        gradient.addColorStop(0.6, '#32CD32'); // Plains
        gradient.addColorStop(0.8, '#F4A460'); // Deserts
        gradient.addColorStop(1, '#4682B4'); // Ocean
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 4096, 2048);
        
        // Add terrain features
        for (let i = 0; i < 1000; i++) {
          const x = Math.random() * 4096;
          const y = Math.random() * 2048;
          const size = Math.random() * 20 + 5;
          
          // Elevation-based coloring
          const elevation = Math.sin(x * 0.01) * Math.cos(y * 0.01);
          let color = '#228B22'; // Default green
          
          if (elevation > 0.5) color = '#8B4513'; // Mountains
          else if (elevation > 0.2) color = '#32CD32'; // Hills
          else if (elevation < -0.3) color = '#4682B4'; // Water
          else if (elevation < 0) color = '#F4A460'; // Desert
          
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      return new CanvasTexture(canvas);
    };

    const createHybridTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4096;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Combine satellite and terrain features
        const gradient = ctx.createRadialGradient(2048, 1024, 0, 2048, 1024, 2048);
        gradient.addColorStop(0, '#2d5a3d');
        gradient.addColorStop(0.5, '#1a4d3a');
        gradient.addColorStop(1, '#0a2f1f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 4096, 2048);
        
        // Add hybrid features (satellite + labels)
        const cities = [
          { x: 800, y: 600, name: 'NYC' },
          { x: 1000, y: 1200, name: 'SAO' },
          { x: 2200, y: 500, name: 'LON' },
          { x: 2800, y: 600, name: 'TOK' }
        ];
        
        cities.forEach(city => {
          // City marker
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(city.x, city.y, 8, 0, Math.PI * 2);
          ctx.fill();
          
          // City label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '24px Arial';
          ctx.fillText(city.name, city.x + 15, city.y + 5);
        });
        
        // Add transportation networks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 50; i++) {
          ctx.beginPath();
          ctx.moveTo(Math.random() * 4096, Math.random() * 2048);
          ctx.lineTo(Math.random() * 4096, Math.random() * 2048);
          ctx.stroke();
        }
      }
      
      return new CanvasTexture(canvas);
    };

    return {
      satellite: createSatelliteTexture(),
      terrain: createTerrainTexture(),
      hybrid: createHybridTexture()
    };
  }, []);

  // Enhanced cloud texture with realistic patterns
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, 2048, 1024);
      
      // Create realistic cloud formations
      const cloudFormations = [
        { x: 200, y: 200, size: 150, density: 0.8 },
        { x: 800, y: 400, size: 200, density: 0.6 },
        { x: 1400, y: 300, size: 180, density: 0.7 },
        { x: 1600, y: 700, size: 120, density: 0.9 },
      ];

      cloudFormations.forEach(formation => {
        for (let i = 0; i < 20; i++) {
          const x = formation.x + (Math.random() - 0.5) * formation.size * 2;
          const y = formation.y + (Math.random() - 0.5) * formation.size;
          const radius = Math.random() * 60 + 30;
          const opacity = formation.density * (Math.random() * 0.4 + 0.4);
          
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
          gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Add weather patterns
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 1024;
        const radius = Math.random() * 40 + 20;
        const opacity = Math.random() * 0.3 + 0.1;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    return new CanvasTexture(canvas);
  }, []);

  // Update texture based on map mode
  useEffect(() => {
    setCurrentTexture(earthTextures[mapMode]);
    console.log(`🗺️ Switched to ${mapMode} texture`);
  }, [mapMode, earthTextures]);

  // Smooth camera animation
  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001;
    }
    
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0005;
      cloudsRef.current.rotation.x += 0.0002;
    }

    // Smooth camera transitions
    if (targetPosition) {
      camera.position.lerp(targetPosition, delta * 2);
    }
  });

  // Convert screen coordinates to 3D world coordinates
  const handleClick = (event: any) => {
    if (onLocationClick && event.point) {
      const point = event.point;
      // Convert 3D coordinates to lat/lng with better precision
      const lat = Math.asin(Math.max(-1, Math.min(1, point.y / 5))) * (180 / Math.PI);
      const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
      onLocationClick([lng, lat]);
    }
  };

  return (
    <group>
      {/* Main Earth Sphere with dynamic textures */}
      <mesh
        ref={earthRef}
        onClick={handleClick}
        scale={5}
      >
        <sphereGeometry args={[1, 256, 128]} />
        <meshPhongMaterial
          map={currentTexture}
          shininess={mapMode === 'satellite' ? 100 : 50}
          transparent
          opacity={0.95}
          bumpScale={mapMode === 'terrain' ? 0.1 : 0.05}
        />
      </mesh>

      {/* Enhanced Cloud Layer with realistic movement */}
      {showSatelliteLayer && (
        <mesh
          ref={cloudsRef}
          scale={5.02}
        >
          <sphereGeometry args={[1, 128, 64]} />
          <meshBasicMaterial
            map={cloudTexture}
            transparent
            opacity={cloudOpacity}
            alphaTest={0.1}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Atmospheric Glow with day/night variation */}
      <mesh scale={5.1}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial
          color={dayNightCycle ? "#88FFCC" : "#4466AA"}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Inner atmospheric layer */}
      <mesh scale={5.05}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial
          color="#00FFAA"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Satellite imagery overlay for high zoom levels */}
      {targetZoom && targetZoom < 8 && (
        <mesh scale={5.01}>
          <sphereGeometry args={[1, 512, 256]} />
          <meshBasicMaterial
            map={earthTextures.satellite}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}