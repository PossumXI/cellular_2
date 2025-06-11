import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import * as THREE from 'three';

interface ConnectivityLayerProps {
  visible: boolean;
  connectivityData?: Array<{
    coordinates: [number, number];
    signalStrength: number;
    networkType: string;
  }>;
}

export default function ConnectivityLayer({ visible, connectivityData = [] }: ConnectivityLayerProps) {
  const connectivityRef = useRef<Mesh>(null);

  // Generate connectivity visualization points
  const connectivityPoints = useMemo(() => {
    const points = [];
    
    // Add sample connectivity points around major cities
    const majorCities = [
      { lat: 40.7128, lng: -74.0060, strength: 95, type: '5G' }, // NYC
      { lat: 34.0522, lng: -118.2437, strength: 90, type: '5G' }, // LA
      { lat: 51.5074, lng: -0.1278, strength: 88, type: '5G' }, // London
      { lat: 35.6762, lng: 139.6503, strength: 92, type: '5G' }, // Tokyo
      { lat: 48.8566, lng: 2.3522, strength: 85, type: '4G' }, // Paris
      { lat: 52.5200, lng: 13.4050, strength: 87, type: '5G' }, // Berlin
      { lat: 37.7749, lng: -122.4194, strength: 93, type: '5G' }, // SF
      { lat: 55.7558, lng: 37.6176, strength: 80, type: '4G' }, // Moscow
      { lat: -33.8688, lng: 151.2093, strength: 89, type: '5G' }, // Sydney
      { lat: 19.0760, lng: 72.8777, strength: 75, type: '4G' }, // Mumbai
    ];

    majorCities.forEach(city => {
      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lng + 180) * (Math.PI / 180);
      const radius = 5.15; // Slightly above Earth surface

      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      points.push({
        position: new Vector3(x, y, z),
        strength: city.strength,
        type: city.type,
        id: `${city.lat}_${city.lng}`
      });
    });

    return points;
  }, [connectivityData]);

  // Generate connectivity network lines
  const networkLines = useMemo(() => {
    const lines = [];
    
    for (let i = 0; i < connectivityPoints.length; i++) {
      for (let j = i + 1; j < connectivityPoints.length; j++) {
        const point1 = connectivityPoints[i];
        const point2 = connectivityPoints[j];
        
        // Only connect points with strong signals
        if (point1.strength > 80 && point2.strength > 80) {
          const distance = point1.position.distanceTo(point2.position);
          
          // Only connect nearby points
          if (distance < 3) {
            lines.push({
              start: point1.position,
              end: point2.position,
              strength: Math.min(point1.strength, point2.strength)
            });
          }
        }
      }
    }
    
    return lines;
  }, [connectivityPoints]);

  useFrame((state) => {
    if (!visible || !connectivityRef.current) return;

    // Animate connectivity pulses
    const time = state.clock.elapsedTime;
    // Add pulsing animation here
  });

  if (!visible) return null;

  return (
    <group ref={connectivityRef}>
      {/* Connectivity Points */}
      {connectivityPoints.map((point, index) => (
        <group key={point.id} position={point.position}>
          {/* Main connectivity node */}
          <mesh>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial
              color={point.type === '5G' ? '#8B5CF6' : '#3B82F6'}
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Signal strength ring */}
          <mesh>
            <ringGeometry args={[0.03, 0.05, 16]} />
            <meshBasicMaterial
              color={point.type === '5G' ? '#8B5CF6' : '#3B82F6'}
              transparent
              opacity={point.strength / 200}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Coverage area */}
          <mesh>
            <sphereGeometry args={[point.strength / 1000, 16, 16]} />
            <meshBasicMaterial
              color={point.type === '5G' ? '#8B5CF6' : '#3B82F6'}
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
        </group>
      ))}

      {/* Network Connection Lines */}
      {networkLines.map((line, index) => {
        const direction = new Vector3().subVectors(line.end, line.start);
        const length = direction.length();
        const midpoint = new Vector3().addVectors(line.start, line.end).multiplyScalar(0.5);

        return (
          <group key={index} position={midpoint}>
            <mesh>
              <cylinderGeometry args={[0.001, 0.001, length, 4]} />
              <meshBasicMaterial
                color="#00FFAA"
                transparent
                opacity={line.strength / 200}
              />
            </mesh>
          </group>
        );
      })}

      {/* Global connectivity grid */}
      <mesh>
        <sphereGeometry args={[5.2, 32, 16]} />
        <meshBasicMaterial
          color="#00FFAA"
          transparent
          opacity={0.05}
          wireframe
        />
      </mesh>
    </group>
  );
}