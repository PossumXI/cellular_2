import { useState, useEffect, useCallback } from 'react';
import { RealtimeDataStream } from '../types';
import { realtimeDataService } from '../lib/apis/realtime';

export function useRealtimeData(coordinates: [number, number] | null, refreshInterval: number = 30000) {
  const [data, setData] = useState<RealtimeDataStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!coordinates) return;

    setLoading(true);
    setError(null);

    try {
      const [lng, lat] = coordinates;
      const realtimeData = await realtimeDataService.getLocationDataStream(lat, lng);
      setData(realtimeData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch realtime data');
    } finally {
      setLoading(false);
    }
  }, [coordinates]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (!coordinates) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [coordinates, refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh: fetchData
  };
}