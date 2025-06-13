import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Html } from '@react-three/drei';

interface PopulationLayerProps {
  visible: boolean;
}

export default function PopulationLayer({ visible }: PopulationLayerProps) {
  const populationRef = useRef<THREE.Group>(null);
  const infoFlowRef = useRef<THREE.Group>(null);
  const [hoveredContinent, setHoveredContinent] = useState<any | null>(null);
  const [infoFlows, setInfoFlows] = useState<any[]>([]);
  
  // Continent data with accurate population figures (2025 estimates)
  const continentData = useMemo((): any[] => {
    return [
      { name: 'ASIA', coordinates: [100, 30], population: 4750000000, size: 0.25 },
      { name: 'AFRICA', coordinates: [20, 0], population: 1450000000, size: 0.22 },
      { name: 'EUROPE', coordinates: [15, 50], population: 750000000, size: 0.18 },
      { name: 'NORTH AMERICA', coordinates: [-100, 40], population: 600000000, size: 0.22 },
      { name: 'SOUTH AMERICA', coordinates: [-60, -20], population: 430000000, size: 0.22 },
      { name: 'OCEANIA', coordinates: [135, -25], population: 45000000, size: 0.18 },
      { name: 'ANTARCTICA', coordinates: [0, -80], population: 5000, size: 0.18 },
    ].map(continent => {
      const [lng, lat] = continent.coordinates;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const radius = 5.5; // Above Earth surface for visibility (scaled to match the 5.0 Earth radius)
      
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      return { ...continent, position: new THREE.Vector3(x, y, z) };
    });
  }, []);
  
  // Population data - accurate representation of global population density
  const populationPoints = useMemo(() => {
    const points: any[] = [];
    const totalPoints = 2000; // Representing ~8 billion people
    
    // Population density by continent (accurate percentages)
    const regions = [
      { name: 'ASIA', center: continentData[0].coordinates, density: 0.594, radius: 40 }, // 59.4% of population
      { name: 'AFRICA', center: continentData[1].coordinates, density: 0.181, radius: 35 }, // 18.1%
      { name: 'EUROPE', center: continentData[2].coordinates, density: 0.094, radius: 20 }, // 9.4%
      { name: 'NORTH AMERICA', center: continentData[3].coordinates, density: 0.075, radius: 30 }, // 7.5%
      { name: 'SOUTH AMERICA', center: continentData[4].coordinates, density: 0.054, radius: 30 }, // 5.4%
      { name: 'OCEANIA', center: continentData[5].coordinates, density: 0.006, radius: 20 }, // 0.6%
      { name: 'ANTARCTICA', center: continentData[6].coordinates, density: 0.0001, radius: 10 }, // ~0%
    ];
    
    // Generate points based on population density
    regions.forEach(region => {
      const pointCount = Math.floor(totalPoints * region.density);
      
      for (let i = 0; i < pointCount; i++) {
        // Create random distribution within region
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * region.radius * (Math.random() * 0.5 + 0.5); // More concentration in centers
        
        // Calculate position with some randomness
        const lng = region.center[0] + Math.cos(angle) * distance;
        const lat = region.center[1] + Math.sin(angle) * distance;
        
        // Convert to 3D coordinates
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const radius = 5.02; // Slightly above Earth surface (scaled to match the 5.0 Earth radius)
        
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        // Add movement data for network simulation
        const movementSpeed = Math.random() * 0.0002 + 0.0001;
        const movementAngle = Math.random() * Math.PI * 2;
        const movementRadius = Math.random() * 0.05 + 0.01;
        
        points.push({ 
          position: new THREE.Vector3(x, y, z), 
          region: region.name,
          population: 1000000, // Each dot represents ~1 million people
          movement: {
            speed: movementSpeed,
            angle: movementAngle,
            radius: movementRadius,
            phase: Math.random() * Math.PI * 2
          },
          connections: [], // Will be filled with indices of connected points
          // Human behavior simulation
          behavior: {
            type: Math.random() > 0.7 ? 'active' : 'passive',
            activityLevel: Math.random(),
            socialConnections: Math.floor(Math.random() * 5) + 1,
            dailyRoutine: Math.random() > 0.5 ? 'day' : 'night',
            travelProbability: Math.random() * 0.1
          }
        });
      }
    });
    
    // Create connections between points (information flow)
    points.forEach((point, index) => {
      // Each point connects to 1-3 other points
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      const connections: number[] = [];
      
      for (let i = 0; i < connectionCount; i++) {
        // Find a random point to connect to
        let targetIndex;
        do {
          targetIndex = Math.floor(Math.random() * points.length);
        } while (targetIndex === index || connections.includes(targetIndex));
        
        connections.push(targetIndex);
      }
      
      point.connections = connections;
    });
    
    return points;
  }, [continentData]);
  
  // Generate initial info flows
  useEffect(() => {
    if (!visible) return;
    
    // Create initial information flows
    const initialFlows: any[] = [];
    const flowCount = 20; // Reduced for performance
    
    for (let i = 0; i < flowCount; i++) {
      const fromIndex = Math.floor(Math.random() * populationPoints.length);
      if (populationPoints[fromIndex].connections.length > 0) {
        const toIndex = populationPoints[fromIndex].connections[
          Math.floor(Math.random() * populationPoints[fromIndex].connections.length)
        ];
        
        initialFlows.push({
          from: fromIndex,
          to: toIndex,
          progress: Math.random(), // Random starting progress
          speed: 0.2 + Math.random() * 0.8, // Random speed
          color: getRandomInfoColor()
        });
      }
    }
    
    setInfoFlows(initialFlows);
    
    // Set up interval to add new flows
    const interval = setInterval(() => {
      setInfoFlows(prevFlows => {
        // Remove completed flows
        const updatedFlows = prevFlows.filter(flow => flow.progress < 1);
        
        // Add new flows to replace completed ones
        const newFlowsNeeded = flowCount - updatedFlows.length;
        
        for (let i = 0; i < newFlowsNeeded; i++) {
          const fromIndex = Math.floor(Math.random() * populationPoints.length);
          if (populationPoints[fromIndex].connections.length > 0) {
            const toIndex = populationPoints[fromIndex].connections[
              Math.floor(Math.random() * populationPoints[fromIndex].connections.length)
            ];
            
            updatedFlows.push({
              from: fromIndex,
              to: toIndex,
              progress: 0,
              speed: 0.2 + Math.random() * 0.8,
              color: getRandomInfoColor()
            });
          }
        }
        
        return updatedFlows;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [visible, populationPoints]);
  
  // Random color for information flow
  const getRandomInfoColor = () => {
    const colors = [
      '#00FFAA', // Teal
      '#FFFF00', // Yellow
      '#FF00FF', // Magenta
      '#00FFFF', // Cyan
      '#FFFFFF', // White
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Update information flows and simulate human behavior
  useFrame((state, delta) => {
    if (!visible || !populationRef.current || !infoFlowRef.current) return;
    
    // Get current time for day/night cycle simulation
    const time = state.clock.getElapsedTime();
    const dayTime = (time % 24) / 24; // 0-1 representing time of day
    const isDay = dayTime > 0.25 && dayTime < 0.75;
    
    // Animate population dots based on network activity and simulated human behavior
    const populationDots = populationRef.current.children.filter(
      child => child.name === 'populationDot'
    );
    
    populationDots.forEach((dot, i) => {
      if (i % 5 === 0) { // Only animate some dots for performance
        const dotData = populationPoints[i];
        if (dotData && dotData.movement) {
          const { speed, angle, radius, phase } = dotData.movement;
          const behavior = dotData.behavior;
          
          // Adjust movement based on behavior
          let movementFactor = 1;
          
          // Active people move more
          if (behavior.type === 'active') {
            movementFactor *= 1.5;
          }
          
          // Day/night cycle affects movement
          if ((behavior.dailyRoutine === 'day' && isDay) || 
              (behavior.dailyRoutine === 'night' && !isDay)) {
            movementFactor *= 1.3;
          } else {
            movementFactor *= 0.5; // Less movement during sleep hours
          }
          
          // Social connections increase movement
          movementFactor *= (1 + behavior.socialConnections * 0.1);
          
          // Random travel events
          if (Math.random() < behavior.travelProbability * delta) {
            // Simulate travel with a larger movement
            const travelDistance = (Math.random() * 0.1 + 0.05) * movementFactor;
            const travelAngle = Math.random() * Math.PI * 2;
            
            dot.position.x += Math.cos(travelAngle) * travelDistance;
            dot.position.y += Math.sin(travelAngle) * travelDistance;
            dot.position.z += Math.cos(travelAngle + Math.PI/2) * travelDistance;
          } else {
            // Regular movement
            const movement = Math.sin(time * speed + phase) * radius * movementFactor;
            
            // Small circular movement to simulate network activity
            const x = Math.cos(angle) * movement;
            const y = Math.sin(angle) * movement;
            const z = Math.cos(angle + Math.PI/2) * movement;
            
            dot.position.x += x * delta * 10;
            dot.position.y += y * delta * 10;
            dot.position.z += z * delta * 10;
          }
          
          // Adjust dot size based on activity level
          const activityScale = 0.8 + behavior.activityLevel * 0.4;
          dot.scale.setScalar(activityScale);
        }
      }
    });
    
    // Update information flows
    setInfoFlows(prevFlows => {
      return prevFlows.map(flow => ({
        ...flow,
        progress: flow.progress + (flow.speed * delta)
      }));
    });
    
    // Subtle floating animation for continent labels
    const labelChildren = populationRef.current.children.filter(
      child => child.name === 'continentLabel'
    );
    
    labelChildren.forEach((label, i) => {
      label.position.y += Math.sin(time * 0.5 + i) * 0.0005;
    });
  });
  
  // Handle continent hover
  const handleContinentHover = (continent: any | null) => {
    setHoveredContinent(continent);
  };
  
  if (!visible) return null;
  
  return (
    <>
      <group ref={populationRef}>
        {/* Population dots */}
        {populationPoints.map((point, i) => (
          <mesh 
            key={`pop-${i}`}
            position={point.position}
            renderOrder={1}
            name="populationDot"
          >
            <sphereGeometry args={[0.02, 3, 3]} />
            <meshBasicMaterial 
              color={point.behavior.type === 'active' ? "#FFFF00" : "#FFCC00"} 
              transparent 
              opacity={0.7 + (point.behavior.activityLevel * 0.3)}
            />
          </mesh>
        ))}
        
        {/* Continent labels */}
        {continentData.map((continent, index) => (
          <group key={`continent-${index}`}>
            <Text
              position={continent.position}
              fontSize={continent.size}
              color="#00FFAA"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="#000000"
              renderOrder={1000}
              depthTest={false}
              name="continentLabel"
              onPointerOver={() => handleContinentHover(continent)}
              onPointerOut={() => handleContinentHover(null)}
            >
              {continent.name}
            </Text>
          </group>
        ))}
      </group>
      
      {/* Information flow lines */}
      <group ref={infoFlowRef}>
        {infoFlows.map((flow, index) => {
          const fromPoint = populationPoints[flow.from];
          const toPoint = populationPoints[flow.to];
          
          if (!fromPoint || !toPoint) return null;
          
          const fromPos = new THREE.Vector3().copy(fromPoint.position);
          const toPos = new THREE.Vector3().copy(toPoint.position);
          
          // Calculate current position along the path
          const currentPos = new THREE.Vector3().lerpVectors(fromPos, toPos, flow.progress);
          
          return (
            <group key={`flow-${index}`}>
              {/* Information packet */}
              <mesh position={currentPos.toArray()}>
                <sphereGeometry args={[0.03, 4, 4]} />
                <meshBasicMaterial color={flow.color} transparent opacity={0.8} />
              </mesh>
              
              {/* Partial line showing progress */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      fromPos.x, fromPos.y, fromPos.z,
                      currentPos.x, currentPos.y, currentPos.z
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={flow.color} transparent opacity={0.4} />
              </line>
            </group>
          );
        })}
      </group>
      
      {/* Continent info popup */}
      {hoveredContinent && (
        <Html position={hoveredContinent.position} distanceFactor={10} zIndexRange={[100, 0]}>
          <div className="bg-black/80 backdrop-blur-sm border border-accent-neural/50 rounded-lg p-3 w-64 text-white shadow-lg">
            <h3 className="text-accent-neural font-bold text-lg mb-1">{hoveredContinent.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Population:</span>
                <span className="text-white">{(hoveredContinent.population / 1000000000).toFixed(2)} billion</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Global Share:</span>
                <span className="text-white">{(hoveredContinent.population / 8025000000 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-surface-deep rounded-full h-2 mt-1">
                <div 
                  className="bg-accent-neural h-2 rounded-full" 
                  style={{ width: `${(hoveredContinent.population / 8025000000 * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Html>
      )}
    </>
  );
}