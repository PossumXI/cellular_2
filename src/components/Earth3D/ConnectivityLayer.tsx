import React, { useEffect, useState, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { speedTestService, NetworkAnalytics } from '../../lib/apis/speedtest'; // Assuming NetworkAnalytics is exported
import { dataCollector, NetworkPerformanceData } from '../../lib/analytics/dataCollector'; // For data collected by DataCollector
import { supabase } from '../../lib/supabase';

interface ConnectivityLayerProps {
  isVisible: boolean;
  currentLatitude: number;
  currentLongitude: number;
}

// Helper to convert lat/lng to 3D position on sphere
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const ConnectivityLayer: React.FC<ConnectivityLayerProps> = ({ isVisible, currentLatitude, currentLongitude }) => {
  const { scene } = useThree();
  // const [connectivityDataPoints, setConnectivityDataPoints] = useState<THREE.Vector3[]>([]); // Removed, as performanceMetrics is sufficient
  const [performanceMetrics, setPerformanceMetrics] = useState<NetworkPerformanceData[]>([]);
  const meshGroupRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => {
    scene.add(meshGroupRef.current);
    return () => {
      scene.remove(meshGroupRef.current);
      // Clean up geometries and materials if necessary
      meshGroupRef.current.children.forEach((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      meshGroupRef.current.clear();
    };
  }, [scene]);

  useEffect(() => {
    meshGroupRef.current.visible = isVisible;
    if (!isVisible) {
      return;
    }

    const fetchConnectivityData = async () => {
      try {
        // Option 1: Fetch from network_performance_analytics (collected by DataCollector)
        const { data, error } = await supabase
          .from('network_performance_analytics')
          .select('*')
          .limit(500); // Fetch a reasonable number of recent records

        if (error) {
          console.error('Error fetching network_performance_analytics:', error);
          return;
        }

        if (data) {
          const parsedMetrics: NetworkPerformanceData[] = data
            .map((record: any) => {
              let dbLng: number | undefined, dbLat: number | undefined;

              if (typeof record.coordinates === 'string') {
                const match = record.coordinates.match(/\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
                if (match) {
                  dbLng = parseFloat(match[1]);
                  dbLat = parseFloat(match[2]);
                }
              } else if (
                Array.isArray(record.coordinates) &&
                record.coordinates.length === 2 &&
                typeof record.coordinates[0] === 'number' &&
                typeof record.coordinates[1] === 'number'
              ) {
                // Assuming array from DB is [lng, lat]
                dbLng = record.coordinates[0];
                dbLat = record.coordinates[1];
              }

              // Ensure coordinates in NetworkPerformanceData is [lat, lng]
              const finalCoordinates: [number, number] =
                typeof dbLat === 'number' && typeof dbLng === 'number' ? [dbLat, dbLng] : [NaN, NaN];
              
              return {
                ...record,
                coordinates: finalCoordinates,
              } as NetworkPerformanceData;
            })
            .filter(metric => !isNaN(metric.coordinates[0]) && !isNaN(metric.coordinates[1]));
          setPerformanceMetrics(parsedMetrics);
        }

        // Option 2: Use speedTestService for more specific queries if needed
        // const globalStats = await speedTestService.getGlobalNetworkStats();
        // console.log('Global Network Stats:', globalStats);
        // const localAnalytics = await speedTestService.getLocationNetworkAnalytics([currentLongitude, currentLatitude], 500);
        // console.log('Local Network Analytics:', localAnalytics);

      } catch (err) {
        console.error('Failed to fetch connectivity data:', err);
      }
    };

    fetchConnectivityData();
  }, [isVisible, currentLatitude, currentLongitude]);

  useEffect(() => {
    if (!isVisible || performanceMetrics.length === 0) {
      meshGroupRef.current.clear(); // Clear previous meshes
      return;
    }

    meshGroupRef.current.clear(); // Clear previous meshes before adding new ones

    performanceMetrics.forEach(metric => {
      // metric.coordinates is now reliably [lat, lng]
      const lat = metric.coordinates[0];
      const lng = metric.coordinates[1];

      // Already filtered out NaN, but double check for safety if needed, or remove this check.
      // The (0,0) check might still be relevant if 0,0 is considered an invalid data point.
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0 && !(metric.locationName === "Null Island" || metric.locationName === "Test Location 0,0"))) { // Allow legitimate 0,0 if named
         return;
      }

      const position = latLngToVector3(lat, lng, 50.05); // Slightly above surface

      // Determine color based on download speed (example)
      let color = 0xff0000; // Red (slow)
      if (metric.downloadSpeed > 100) color = 0x00ff00; // Green (fast)
      else if (metric.downloadSpeed > 50) color = 0xffff00; // Yellow (medium)
      
      // Determine size based on reliability score (example)
      const size = Math.max(0.05, (metric.reliabilityScore || 0.5) * 0.3);


      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.lookAt(new THREE.Vector3(0,0,0)); // Orient towards center of Earth
      
      // Add userData for potential interactivity
      (mesh.userData as any) = { type: 'connectivityNode', ...metric };

      meshGroupRef.current.add(mesh);
    });

  }, [isVisible, performanceMetrics]);


  return null; // This layer directly adds to the scene
};

export default ConnectivityLayer;
