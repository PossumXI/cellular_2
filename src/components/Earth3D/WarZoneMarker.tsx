import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface WarZoneMarkerProps {
  position: [number, number, number];
  name: string;
  description: string;
  casualties: string;
  started: string;
  latestUpdate: string;
  onClick: (warZone: {
    name: string;
    description: string;
    casualties: string;
    started: string;
    latestUpdate: string;
  }) => void;
}

export default function WarZoneMarker({
  position,
  name,
  description,
  casualties,
  started,
  latestUpdate,
  onClick
}: WarZoneMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  
  // Pulsing animation
  useFrame((state) => {
    if (pulseRef.current) {
      const t = state.clock.getElapsedTime();
      pulseRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.2);
      if (pulseRef.current.material) {
        (pulseRef.current.material as THREE.Material).opacity = 0.6 + Math.sin(t * 2) * 0.2;
      }
    }
    
    if (markerRef.current) {
      // Keep marker facing the camera
      markerRef.current.quaternion.copy(state.camera.quaternion);
    }
  });
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick({
      name,
      description,
      casualties,
      started,
      latestUpdate
    });
  };
  
  return (
    <group 
      position={position}
      ref={markerRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Alert icon */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#FF4444" />
      </mesh>
      
      {/* Pulsing effect */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.06, 0.08, 16]} />
        <meshBasicMaterial color="#FF4444" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Label */}
      {hovered && (
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.1}
          color="#FF4444"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {name}
        </Text>
      )}
    </group>
  );
}