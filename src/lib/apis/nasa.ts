const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'; // Fallback to DEMO_KEY if not set
const NASA_API_BASE_URL = 'https://api.nasa.gov';

interface ApodResponse {
  copyright?: string;
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
}

/**
 * Fetches the Astronomy Picture of the Day (APOD) from NASA.
 * @param date Optional. The date of the APOD image to retrieve (YYYY-MM-DD). Defaults to today.
 * @returns A promise that resolves to the APOD data.
 */
async function getAstronomyPictureOfTheDay(date?: string): Promise<ApodResponse> {
  let url = `${NASA_API_BASE_URL}/planetary/apod?api_key=${NASA_API_KEY}`;
  if (date) {
    url += `&date=${date}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`NASA APOD API Error: ${response.status} ${errorData.message || response.statusText}`);
    }
    const data: ApodResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching APOD from NASA:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Example of another potential function for Mars Rover Photos
interface MarsRoverPhoto {
  id: number;
  sol: number;
  camera: { id: number; name: string; rover_id: number; full_name: string };
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
  };
}

interface MarsRoverPhotosResponse {
  photos: MarsRoverPhoto[];
}

/**
 * Fetches Mars Rover photos from a specific rover and sol (Martian day).
 * @param roverName The name of the Mars rover (e.g., 'curiosity', 'opportunity', 'spirit').
 * @param sol The Martian sol (day) to fetch photos for.
 * @returns A promise that resolves to an array of Mars Rover photos.
 */
async function getMarsRoverPhotos(roverName: string = 'curiosity', sol: number = 1000): Promise<MarsRoverPhotosResponse> {
  const url = `${NASA_API_BASE_URL}/mars-photos/api/v1/rovers/${roverName}/photos?sol=${sol}&api_key=${NASA_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`NASA Mars Rover API Error: ${response.status} ${errorData.message || response.statusText}`);
    }
    const data: MarsRoverPhotosResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Mars Rover photos from NASA:', error);
    throw error;
  }
}

// --- NASA EPIC (Earth Polychromatic Imaging Camera) API ---
interface EpicImageMetadata {
  identifier: string;
  caption: string;
  image: string; // image name, not full URL
  version: string;
  centroid_coordinates: {
    lat: number;
    lon: number;
  };
  dscovr_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  lunar_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  sun_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  attitude_quaternions: {
    q0: number;
    q1: number;
    q2: number;
    q3: number;
  };
  date: string; // YYYY-MM-DD HH:MM:SS
  coords: {
    centroid_coordinates: {
      lat: number;
      lon: number;
    };
    dscovr_j2000_position: {
      x: number;
      y: number;
      z: number;
    };
    lunar_j2000_position: {
      x: number;
      y: number;
      z: number;
    };
    sun_j2000_position: {
      x: number;
      y: number;
      z: number;
    };
    attitude_quaternions: {
      q0: number;
      q1: number;
      q2: number;
      q3: number;
    };
  };
}

interface EpicImage {
  metadata: EpicImageMetadata;
  imageUrl: string;
}

/**
 * Fetches Earth imagery from NASA's EPIC API.
 * @param date Optional. The date to fetch imagery for (YYYY-MM-DD). Defaults to the most recent available.
 * @returns A promise that resolves to an array of EpicImage objects, each with metadata and a full image URL.
 */
async function getEarthImagery(date?: string): Promise<EpicImage[]> {
  const collection = 'natural'; // 'natural' for color images, 'enhanced' for scientifically enhanced
  let apiUrl = `${NASA_API_BASE_URL}/EPIC/api/${collection}`;

  if (date) {
    apiUrl += `/date/${date}`;
  }
  apiUrl += `?api_key=${NASA_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`NASA EPIC API Error: ${response.status} ${errorData.message || response.statusText}`);
    }
    const imagesMetadata: EpicImageMetadata[] = await response.json();

    if (!imagesMetadata || imagesMetadata.length === 0) {
      return [];
    }

    // Construct full image URLs
    const processedImages: EpicImage[] = imagesMetadata.map(meta => {
      const imageDate = new Date(meta.date);
      const year = imageDate.getUTCFullYear();
      const month = String(imageDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(imageDate.getUTCDate()).padStart(2, '0');
      // Example URL: https://epic.gsfc.nasa.gov/archive/natural/2015/10/31/png/epic_1b_20151031074844.png
      const imageUrl = `https://epic.gsfc.nasa.gov/archive/${collection}/${year}/${month}/${day}/png/${meta.image}.png`;
      return {
        metadata: meta,
        imageUrl: imageUrl,
      };
    });

    return processedImages;
  } catch (error) {
    console.error('Error fetching Earth imagery from NASA EPIC:', error);
    throw error;
  }
}

export const nasaService = {
  getAstronomyPictureOfTheDay,
  getMarsRoverPhotos,
  getEarthImagery,
  // We can add more functions here for other NASA APIs
};

// Log if API key is missing (but still use DEMO_KEY for basic functionality)
if (!import.meta.env.VITE_NASA_API_KEY) {
  console.warn(
    'NASA API Key (VITE_NASA_API_KEY) is not set in .env file. Using DEMO_KEY. Some NASA APIs might be rate-limited or unavailable.'
  );
}
