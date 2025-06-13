import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import WarZoneMarker from './WarZoneMarker';
import { supabase } from '../../lib/supabase';
import { Loader, AlertTriangle } from 'lucide-react'; // For loading/error states
// Note: Drei's Text component would require <Canvas> context if used directly here for errors/loading.
// For simplicity, if complex text is needed in these states, consider a helper or simple text meshes.

// Interface for data fetched from Supabase conflict_zones table
interface ConflictZoneData {
  id: string; // UUID
  name: string;
  description: string | null;
  coordinates: { x: number; y: number }; // Supabase point type: {x: lng, y: lat}
  status: string | null;
  intensity: string | null;
  casualties_estimated: string | null;
  start_date: string | null; // Date as string e.g., "YYYY-MM-DD"
  last_update_date: string | null; // Date as string
  // Add other fields from your conflict_zones table if needed for display or logic
}

// Interface for processed war zone data including 3D position for rendering
interface ProcessedWarZone extends ConflictZoneData {
  position: [number, number, number];
  // Mapped fields for WarZoneMarker props
  casualties: string;
  started: string;
  latestUpdate: string;
}

interface WarZonesProps {
  visible: boolean;
  onWarZoneSelect?: (warZone: { // This is the structure expected by App.tsx for the panel
    name: string;
    description: string;
    casualties: string;
    started: string;
    latestUpdate: string;
  }) => void;
}

export default function WarZones({ visible, onWarZoneSelect }: WarZonesProps) {
  const [fetchedWarZones, setFetchedWarZones] = useState<ProcessedWarZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      // setFetchedWarZones([]); // Optionally clear data when not visible
      return;
    }

    const fetchConflictZones = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('conflict_zones')
          .select('*')
          .eq('status', 'active'); // Example: Fetch only active conflict zones, adjust as needed

        if (dbError) {
          throw dbError;
        }

        if (data) {
          const processedData: ProcessedWarZone[] = data.map((zone: ConflictZoneData) => {
            const lng = zone.coordinates.x;
            const lat = zone.coordinates.y;
            
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);
            const radius = 5.05; // Slightly above Earth surface
            
            const xPos = -(radius * Math.sin(phi) * Math.cos(theta));
            const yPos = radius * Math.cos(phi);
            const zPos = radius * Math.sin(phi) * Math.sin(theta);
            
            return {
              ...zone, // Spread all fields from ConflictZoneData
              position: [xPos, yPos, zPos] as [number, number, number],
              // Map specific fields for the onWarZoneSelect callback / WarZoneMarker props
              casualties: zone.casualties_estimated || 'N/A',
              started: zone.start_date ? new Date(zone.start_date).toLocaleDateString() : 'N/A',
              latestUpdate: zone.last_update_date ? new Date(zone.last_update_date).toLocaleDateString() : 'N/A',
              description: zone.description || 'No description available.' // Ensure description is always a string
            };
          });
          setFetchedWarZones(processedData);
        } else {
          setFetchedWarZones([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conflict zones';
        console.error('Error fetching conflict zones:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchConflictZones();
  }, [visible]); // Re-fetch if visibility changes

  if (!visible) return null;

  if (loading) {
    // Simple loading indicator within the 3D scene.
    // For more complex text, you'd use <Text> from @react-three/drei, but it needs to be a child of <Canvas>
    // This is a placeholder. A proper 3D loading text/indicator would be better.
    return (
      <mesh position={[0,0,0]}> {/* Centered, adjust as needed */}
         {/* <planeGeometry args={[1, 0.3]} />
         <meshBasicMaterial color="rgba(0,0,0,0.5)" transparent />  */}
         {/* Loader icon might not render correctly without proper 3D context or as HTML overlay */}
      </mesh>
    );
  }

  if (error) {
    // Simple error indicator.
     return (
      <mesh position={[0,0,0]}>
        {/* <planeGeometry args={[2, 0.5]} />
        <meshBasicMaterial color="rgba(139,0,0,0.7)" transparent /> */}
      </mesh>
    );
  }
  
  return (
    <group>
      {fetchedWarZones.map((zone) => (
        <WarZoneMarker
          key={zone.id} // Use unique ID from database
          position={zone.position}
          name={zone.name}
          // Pass all necessary props that WarZoneMarker expects
          description={zone.description} // Already ensured it's a string
          casualties={zone.casualties}
          started={zone.started}
          latestUpdate={zone.latestUpdate}
          onClick={() => {
            if (onWarZoneSelect) {
              onWarZoneSelect({ 
                name: zone.name || 'Unknown Zone', // zone.name is already string, but defensive
                description: zone.description,     // zone.description is already string
                casualties: zone.casualties,       // zone.casualties is already string
                started: zone.started,             // zone.started is already string
                latestUpdate: zone.latestUpdate   // zone.latestUpdate is already string
              });
            }
          }}
        />
      ))}
    </group>
  );
}
