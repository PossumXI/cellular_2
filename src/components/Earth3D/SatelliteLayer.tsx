import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SatelliteLayerProps {
  visible: boolean;
  opacity?: number;
}

export default function SatelliteLayer({ visible, opacity = 0.8 }: SatelliteLayerProps) {
  const satelliteRef = useRef<THREE.Group>(null);

  // Create satellite orbit paths
  const satellites = useMemo(() => {
    const sats = [];
    for (let i = 0; i < 12; i++) {
      sats.push({
        id: i,
        radius: 8 + Math.random() * 3, // Scaled to match the 5.0 Earth radius
        speed: 0.01 + Math.random() * 0.02,
        inclination: (Math.random() - 0.5) * Math.PI * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    return sats;
  }, []);

  useFrame((state) => {
    if (!visible || !satelliteRef.current) return;

    // Animate satellites
    const time = state.clock.elapsedTime;
    
    // Update satellite positions
    satelliteRef.current.children.forEach((satellite, index) => {
      const sat = satellites[index % satellites.length];
      
      // Calculate position based on orbital parameters
      const angle = time * sat.speed + sat.phase;
      const x = Math.cos(angle) * sat.radius;
      const z = Math.sin(angle) * sat.radius;
      const y = Math.sin(angle) * Math.sin(sat.inclination) * sat.radius;
      
      satellite.position.set(x, y, z);
    });
  });

  if (!visible) return null;

  return (
    <group ref={satelliteRef}>
      {satellites.map((sat) => (
        <group key={sat.id}>
          {/* Satellite body */}
          <mesh scale={[0.1, 0.1, 0.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          
          {/* Solar panels */}
          <mesh scale={[0.3, 0.05, 0.05]} position={[0.2, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#3B82F6" />
          </mesh>
          
          {/* Orbit path (transparent ring) */}
          <mesh rotation={[Math.PI/2, 0, 0]}>
            <ringGeometry args={[sat.radius - 0.02, sat.radius + 0.02, 64]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}