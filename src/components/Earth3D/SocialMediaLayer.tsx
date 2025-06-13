import React, { useEffect, useState, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { supabase } from '../../lib/supabase';
import { SocialEngagementData } from '../../lib/analytics/dataCollector'; // Re-using the interface

interface SocialMediaLayerProps {
  isVisible: boolean;
  // Add other props as needed, e.g., for filtering by platform or time
}

// Helper to convert lat/lng to 3D position on sphere (can be shared or redefined)
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const SocialMediaLayer: React.FC<SocialMediaLayerProps> = ({ isVisible }) => {
  const { scene } = useThree();
  const [socialMetrics, setSocialMetrics] = useState<SocialEngagementData[]>([]);
  const meshGroupRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => {
    scene.add(meshGroupRef.current);
    return () => {
      scene.remove(meshGroupRef.current);
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

    const fetchSocialMediaData = async () => {
      try {
        const { data, error } = await supabase
          .from('social_engagement_analytics')
          .select('*')
          // Fetch data from the last 24 hours for relevance, adjust as needed
          .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1000); // Limit to a reasonable number of points

        if (error) {
          console.error('Error fetching social_engagement_analytics:', error);
          return;
        }

        if (data) {
          const parsedMetrics: SocialEngagementData[] = data
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
                dbLng = record.coordinates[0];
                dbLat = record.coordinates[1];
              }
              
              const finalCoordinates: [number, number] = 
                typeof dbLat === 'number' && typeof dbLng === 'number' ? [dbLat, dbLng] : [NaN, NaN];

              return {
                ...record,
                coordinates: finalCoordinates,
                timestamp: new Date(record.timestamp), // Ensure timestamp is a Date object
              } as SocialEngagementData;
            })
            .filter(metric => !isNaN(metric.coordinates[0]) && !isNaN(metric.coordinates[1]));
          setSocialMetrics(parsedMetrics);
        }
      } catch (err) {
        console.error('Failed to fetch social media data:', err);
      }
    };

    fetchSocialMediaData();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || socialMetrics.length === 0) {
      meshGroupRef.current.clear();
      return;
    }

    meshGroupRef.current.clear();

    socialMetrics.forEach(metric => {
      const lat = metric.coordinates[0];
      const lng = metric.coordinates[1];

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0 && metric.locationName !== "Null Island")) {
        return;
      }

      const position = latLngToVector3(lat, lng, 50.1); // Slightly above surface

      // Visualization: Color by sentiment, size by total posts/engagement
      let sentimentColor = 0x808080; // Grey (neutral)
      if (metric.avgSentiment > 0.6) sentimentColor = 0x00ff00; // Green (positive)
      else if (metric.avgSentiment < 0.4) sentimentColor = 0xff0000; // Red (negative)
      else if (metric.avgSentiment >= 0.4 && metric.avgSentiment <= 0.6) sentimentColor = 0xffff00; // Yellow (mixed/neutral)


      // Normalize totalPosts for size, e.g., cap at 1000 posts for max size
      const normalizedPosts = Math.min(metric.totalPosts || 0, 1000);
      const size = Math.max(0.05, (normalizedPosts / 1000) * 0.5 + 0.05);

      const geometry = new THREE.BoxGeometry(size, size, size * 2); // Use a bar/box shape
      const material = new THREE.MeshBasicMaterial({
        color: sentimentColor,
        transparent: true,
        opacity: 0.75,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.lookAt(new THREE.Vector3(0, 0, 0)); // Orient towards center

      (mesh.userData as any) = { type: 'socialMediaNode', ...metric };
      meshGroupRef.current.add(mesh);
    });

  }, [isVisible, socialMetrics]);

  return null;
};

export default SocialMediaLayer;
