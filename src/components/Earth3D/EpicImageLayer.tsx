import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { nasaService } from '../../lib/apis/nasa'; // Assuming nasaService is correctly exported

interface EpicImageLayerProps {
  visible: boolean;
  date?: string; // YYYY-MM-DD
  onImageLoad?: (imageData: any) => void; // Callback with image data
}

interface EpicImageData {
  texture: THREE.Texture;
  metadata: any; // Replace 'any' with a more specific type from nasaService if available
  aspectRatio: number;
}

export default function EpicImageLayer({ visible, date, onImageLoad }: EpicImageLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [epicImageData, setEpicImageData] = useState<EpicImageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setEpicImageData(null); // Clear image when not visible
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchAndLoadEpicImage = async () => {
      try {
        const images = await nasaService.getEarthImagery(date);
        if (!isMounted || images.length === 0) {
          if (images.length === 0) setError('No EPIC image found for the selected date.');
          setIsLoading(false);
          return;
        }

        // For simplicity, use the first image returned for the day
        const firstImage = images[0];
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          firstImage.imageUrl,
          (loadedTexture) => {
            if (!isMounted) return;
            const aspectRatio = loadedTexture.image ? loadedTexture.image.width / loadedTexture.image.height : 1;
            setEpicImageData({ texture: loadedTexture, metadata: firstImage.metadata, aspectRatio });
            setIsLoading(false);
            if (onImageLoad) onImageLoad(firstImage);
          },
          undefined, // onProgress callback (optional)
          (err) => {
            if (!isMounted) return;
            console.error('Error loading EPIC texture:', err);
            setError('Failed to load EPIC image texture.');
            setIsLoading(false);
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching EPIC imagery:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch EPIC imagery.');
        setIsLoading(false);
      }
    };

    fetchAndLoadEpicImage();

    return () => {
      isMounted = false;
      // Optional: dispose texture if epicImageData is not null
      if (epicImageData?.texture) {
        epicImageData.texture.dispose();
      }
    };
  }, [visible, date, onImageLoad]); // Re-fetch if visibility or date changes

  useFrame(() => {
    if (meshRef.current && epicImageData) {
      // Make the plane face the camera
      meshRef.current.lookAt(camera.position);
      // Adjust scale based on aspect ratio and distance, or keep fixed size
      // For now, let's use a fixed size relative to camera distance
      const distance = camera.position.length(); // Simple distance from origin
      // Scale it to be a reasonable size in the view, e.g., 1/5th of the distance
      const scale = distance / 10; 
      meshRef.current.scale.set(scale * epicImageData.aspectRatio, scale, 1);
    }
  });

  if (!visible || isLoading || error || !epicImageData) {
    // Optionally render a loading/error state or nothing
    if (isLoading) console.log('EPIC Layer: Loading...');
    if (error) console.error('EPIC Layer Error:', error);
    return null; 
  }

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}> {/* Adjust position as needed */}
      <planeGeometry args={[1, 1]} /> {/* Base size, will be scaled */}
      <meshBasicMaterial map={epicImageData.texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}
