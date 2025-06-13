import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LocationMarkerProps {
  location: any;
  isActive: boolean;
  onClick?: () => void;
}

export default function LocationMarker({ location, isActive, onClick }: LocationMarkerProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Convert lat/lng to 3D coordinates
  const position = React.useMemo(() => {
    const [lng, lat] = location.coordinates;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = 5.1; // Slightly above Earth surface (scaled to match the 5.0 Earth radius)

    return [
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ];
  }, [location.coordinates]);

  // Pulsing animation for active locations
  useFrame((state) => {
    if (markerRef.current && isActive) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 1;
      markerRef.current.scale.setScalar(pulse);
    }

    if (pulseRef.current && isActive) {
      const ringPulse = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 1;
      pulseRef.current.scale.setScalar(ringPulse);
      // @ts-ignore - Material property exists on the mesh
      if (pulseRef.current.material) {
        pulseRef.current.material.opacity = 1 - (ringPulse - 0.5) * 2;
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  return (
    <group position={position as any} onClick={handleClick}>
      {/* Main marker */}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color={isActive ? '#00ff88' : '#ffffff'}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Pulsing ring for active locations */}
      {isActive && (
        <mesh ref={pulseRef}>
          <ringGeometry args={[0.15, 0.2, 16]} />
          <meshBasicMaterial
            color="#00ffaa"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Neural connection beam */}
      {isActive && (
        <mesh>
          <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
          <meshBasicMaterial
            color="#00ffaa"
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}