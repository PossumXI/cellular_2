import React, { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Movement {
  id: string;
  from: [number, number]; // [lat, lng]
  to: [number, number];   // [lat, lng]
  color?: THREE.ColorRepresentation;
  speed?: number; // For potential animation
}

interface MovementLayerProps {
  isVisible: boolean;
  movements?: Movement[]; // Optional: pass dynamic movements
}

const EARTH_RADIUS = 50; // Consistent with other layers

// Helper to convert lat/lng to 3D position on sphere
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

// Creates a CatmullRomCurve3 arc between two points on the sphere
const createSphereArc = (startVec: THREE.Vector3, endVec: THREE.Vector3, segments: number = 50, arcHeightFactor: number = 0.3): THREE.CatmullRomCurve3 => {
  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  const distance = startVec.distanceTo(endVec);
  const arcHeight = distance * arcHeightFactor;
  midPoint.normalize().multiplyScalar(EARTH_RADIUS + arcHeight); // Push midpoint outwards

  // Ensure start and end points are on the sphere surface
  const surfaceStart = startVec.clone().normalize().multiplyScalar(EARTH_RADIUS + 0.01); // Slightly above surface
  const surfaceEnd = endVec.clone().normalize().multiplyScalar(EARTH_RADIUS + 0.01);

  return new THREE.CatmullRomCurve3([surfaceStart, midPoint, surfaceEnd], false, 'catmullrom', 0.5);
};

const MovementLayer: React.FC<MovementLayerProps> = ({ isVisible, movements: propMovements }) => {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(new THREE.Group());

  // Sample movements if none are provided
  const defaultMovements: Movement[] = useMemo(() => [
    { id: 'm1', from: [34.0522, -118.2437], to: [40.7128, -74.0060], color: 0xff0000 }, // LA to NYC (Red)
    { id: 'm2', from: [51.5074, -0.1278], to: [35.6895, 139.6917], color: 0x00ff00 }, // London to Tokyo (Green)
    { id: 'm3', from: [-33.8688, 151.2093], to: [37.7749, -122.4194], color: 0x0000ff }, // Sydney to SF (Blue)
  ], []);

  const movementsToRender = propMovements || defaultMovements;

  useEffect(() => {
    scene.add(groupRef.current);
    return () => {
      scene.remove(groupRef.current);
      groupRef.current.children.forEach((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      groupRef.current.clear();
    };
  }, [scene]);

  useEffect(() => {
    groupRef.current.visible = isVisible;
    if (!isVisible) {
      return;
    }

    groupRef.current.clear(); // Clear previous lines

    movementsToRender.forEach(movement => {
      const startVec = latLngToVector3(movement.from[0], movement.from[1], EARTH_RADIUS);
      const endVec = latLngToVector3(movement.to[0], movement.to[1], EARTH_RADIUS);

      const curve = createSphereArc(startVec, endVec);
      const points = curve.getPoints(50); // Get 50 points along the curve

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: movement.color || 0xffffff,
        linewidth: 2, // Note: linewidth > 1 may not work on all platforms with WebGL1
        transparent: true,
        opacity: 0.8,
      });

      const line = new THREE.Line(geometry, material);
      groupRef.current.add(line);
    });

  }, [isVisible, movementsToRender]);

  // Placeholder for animation logic if needed in the future
  // useFrame(() => {
  //   if (!isVisible) return;
  //   // Animation logic here
  // });

  return null; // This layer directly adds to the scene
};

export default MovementLayer;
