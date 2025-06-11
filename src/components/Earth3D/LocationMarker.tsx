import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { LocationCell } from '../../types';

interface LocationMarkerProps {
  location: LocationCell;
  isActive: boolean;
}

export default function LocationMarker({ location, isActive }: LocationMarkerProps) {
  const markerRef = useRef<Mesh>(null);
  const pulseRef = useRef<Mesh>(null);

  // Convert lat/lng to 3D coordinates
  const position = useMemo(() => {
    const [lng, lat] = location.coordinates;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = 5.1; // Slightly above Earth surface

    return [
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ] as [number, number, number];
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
      // @ts-ignore
      pulseRef.current.material.opacity = 1 - (ringPulse - 0.5) * 2;
    }
  });

  return (
    <group position={position}>
      {/* Main marker */}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={isActive ? '#00ff88' : '#ffffff'}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Pulsing ring for active locations */}
      {isActive && (
        <mesh ref={pulseRef}>
          <ringGeometry args={[0.1, 0.15, 16]} />
          <meshBasicMaterial
            color="#00ffaa"
            transparent
            opacity={0.6}
            side={2}
          />
        </mesh>
      )}

      {/* Neural connection beam */}
      {isActive && (
        <mesh>
          <cylinderGeometry args={[0.002, 0.002, 1, 8]} />
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