import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, TextureLoader, CanvasTexture, Vector3, Texture } from 'three';
import * as THREE from 'three';

interface EnhancedEarthProps {
  onLocationClick?: (coordinates: [number, number]) => void;
  showSatelliteLayer?: boolean;
  cloudOpacity?: number;
  dayNightCycle?: boolean;
  targetPosition?: Vector3;
  targetZoom?: number;
  mapMode?: 'satellite' | 'terrain' | 'hybrid' | 'streets';
}

export default function EnhancedEarth({ 
  onLocationClick,
  showSatelliteLayer = true,
  cloudOpacity = 0.3,
  dayNightCycle = true,
  targetPosition,
  targetZoom,
  mapMode = 'satellite'
}: EnhancedEarthProps) {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);
  const { camera } = useThree();
  const [currentTexture, setCurrentTexture] = useState<Texture | null>(null);
  
  // Helper function to adjust colors
  const adjustColor = (color: string, adjustment: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.min(255, r + Math.round(r * adjustment)));
    const newG = Math.max(0, Math.min(255, g + Math.round(g * adjustment)));
    const newB = Math.max(0, Math.min(255, b + Math.round(b * adjustment)));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Optimized Earth textures with reasonable resolution
  const earthTextures = useMemo(() => {
    const createSatelliteTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048; // Reduced from 8192 for performance
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create photorealistic satellite-style texture
        const gradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 1024);
        gradient.addColorStop(0, '#1a4d3a');
        gradient.addColorStop(0.3, '#2d7a3d');
        gradient.addColorStop(0.6, '#0a5f2a');
        gradient.addColorStop(1, '#0a2f1f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 1024);
        
        // Add realistic continent shapes
        const continents = [
          { x: 400, y: 300, size: 200, detail: 12, color: '#00C896' },
          { x: 500, y: 600, size: 150, detail: 8, color: '#7CB342' },
          { x: 1100, y: 250, size: 100, detail: 6, color: '#8BC34A' },
          { x: 1150, y: 450, size: 175, detail: 10, color: '#689F38' },
          { x: 1400, y: 300, size: 250, detail: 15, color: '#558B2F' },
          { x: 1600, y: 650, size: 75, detail: 5, color: '#33691E' }
        ];

        continents.forEach(continent => {
          ctx.fillStyle = continent.color;
          for (let i = 0; i < continent.detail; i++) {
            ctx.beginPath();
            ctx.arc(
              continent.x + (Math.random() - 0.5) * continent.size,
              continent.y + (Math.random() - 0.5) * continent.size * 0.6,
              Math.random() * (continent.size / 6) + 8,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        });

        // Add detailed coastlines and islands
        ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < 400; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * 2048,
            Math.random() * 1024,
            Math.random() * 4 + 1,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Add city lights
        ctx.fillStyle = 'rgba(255, 255, 150, 0.8)';
        for (let i = 0; i < 150; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * 2048,
            Math.random() * 1024,
            Math.random() * 2 + 1,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      
      return new CanvasTexture(canvas);
    };

    const createStreetsTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Base satellite texture
        const gradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 1024);
        gradient.addColorStop(0, '#2d5a3d');
        gradient.addColorStop(0.5, '#1a4d3a');
        gradient.addColorStop(1, '#0a2f1f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 1024);
        
        // Add street networks for major cities
        const majorCities = [
          { x: 400, y: 300, name: 'NYC', size: 50 },
          { x: 300, y: 350, name: 'LA', size: 45 },
          { x: 1100, y: 250, name: 'London', size: 40 },
          { x: 1450, y: 300, name: 'Tokyo', size: 55 },
          { x: 1200, y: 250, name: 'Paris', size: 35 }
        ];
        
        majorCities.forEach(city => {
          // City center
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(city.x, city.y, 6, 0, Math.PI * 2);
          ctx.fill();
          
          // Street grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1;
          
          // Main roads
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(city.x, city.y);
            ctx.lineTo(
              city.x + Math.cos(angle) * city.size,
              city.y + Math.sin(angle) * city.size
            );
            ctx.stroke();
          }
          
          // City label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.fillText(city.name, city.x + 10, city.y - 10);
        });
      }
      
      return new CanvasTexture(canvas);
    };

    const createTerrainTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create terrain with elevation colors
        const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
        gradient.addColorStop(0, '#8B4513'); // Mountains
        gradient.addColorStop(0.3, '#228B22'); // Forests
        gradient.addColorStop(0.6, '#32CD32'); // Plains
        gradient.addColorStop(0.8, '#F4A460'); // Deserts
        gradient.addColorStop(1, '#4682B4'); // Ocean
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 1024);
        
        // Add terrain features
        for (let i = 0; i < 500; i++) {
          const x = Math.random() * 2048;
          const y = Math.random() * 1024;
          const size = Math.random() * 10 + 3;
          
          const elevation = Math.sin(x * 0.01) * Math.cos(y * 0.01);
          let color = '#228B22';
          
          if (elevation > 0.5) color = '#8B4513';
          else if (elevation > 0.2) color = '#32CD32';
          else if (elevation < -0.3) color = '#4682B4';
          else if (elevation < 0) color = '#F4A460';
          
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
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Combine satellite and street data
        const gradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 1024);
        gradient.addColorStop(0, '#2d5a3d');
        gradient.addColorStop(0.5, '#1a4d3a');
        gradient.addColorStop(1, '#0a2f1f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 1024);
        
        // Add cities with labels
        const cities = [
          { x: 400, y: 300, name: 'NYC' },
          { x: 500, y: 600, name: 'SAO' },
          { x: 1100, y: 250, name: 'LON' },
          { x: 1400, y: 300, name: 'TOK' }
        ];
        
        cities.forEach(city => {
          // City marker
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(city.x, city.y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // City label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.fillText(city.name, city.x + 8, city.y + 3);
        });
        
        // Add transportation networks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 25; i++) {
          ctx.beginPath();
          ctx.moveTo(Math.random() * 2048, Math.random() * 1024);
          ctx.lineTo(Math.random() * 2048, Math.random() * 1024);
          ctx.stroke();
        }
      }
      
      return new CanvasTexture(canvas);
    };

    return {
      satellite: createSatelliteTexture(),
      terrain: createTerrainTexture(),
      hybrid: createHybridTexture(),
      streets: createStreetsTexture()
    };
  }, [adjustColor]);

  // Optimized cloud texture
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; // Reduced resolution
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, 1024, 512);
      
      // Create realistic cloud formations
      const cloudFormations = [
        { x: 100, y: 100, size: 75, density: 0.8 },
        { x: 400, y: 200, size: 100, density: 0.6 },
        { x: 700, y: 150, size: 90, density: 0.7 },
        { x: 800, y: 350, size: 60, density: 0.9 },
      ];

      cloudFormations.forEach(formation => {
        for (let i = 0; i < 10; i++) {
          const x = formation.x + (Math.random() - 0.5) * formation.size * 2;
          const y = formation.y + (Math.random() - 0.5) * formation.size;
          const radius = Math.random() * 30 + 15;
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
      for (let i = 0; i < 25; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const radius = Math.random() * 20 + 10;
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
      const lat = Math.asin(Math.max(-1, Math.min(1, point.y / 5))) * (180 / Math.PI);
      const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
      onLocationClick([lng, lat]);
    }
  };

  return (
    <group>
      {/* Main Earth Sphere with optimized detail */}
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

      {/* Enhanced Cloud Layer */}
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

      {/* Atmospheric Glow */}
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

      {/* High detail overlay for close zoom */}
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