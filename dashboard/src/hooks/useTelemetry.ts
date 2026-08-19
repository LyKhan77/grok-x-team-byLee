'use client';

import { useState, useEffect, useCallback } from 'react';
import { TelemetryData } from '@/lib/types';

const POLL_INTERVAL = 2000; // 2 seconds per PRD spec

export function useTelemetry() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry/live', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TelemetryData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  return { data, error, loading };
}
