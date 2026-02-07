/**
 * Custom hooks for TimeControl component
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to throttle time updates
 * Reduces re-render frequency by updating at most once per interval
 * 
 * @param currentTime - The current time to throttle
 * @param interval - Throttle interval in milliseconds (default: 100ms)
 * @returns Throttled time value
 */
export function useThrottledTime(currentTime: Date, interval: number = 100): Date {
  const [throttledTime, setThrottledTime] = useState(currentTime);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= interval) {
      setThrottledTime(currentTime);
      lastUpdateRef.current = now;
      return undefined;
    } else {
      const timeoutId = setTimeout(() => {
        setThrottledTime(currentTime);
        lastUpdateRef.current = Date.now();
      }, interval - (now - lastUpdateRef.current));
      return () => clearTimeout(timeoutId);
    }
  }, [currentTime, interval]);

  return throttledTime;
}

/**
 * Custom hook to get real time on client side only
 * Avoids hydration errors by returning null on server
 * 
 * @returns Current real time or null if on server
 */
export function useRealTime(): Date | null {
  const [realTime, setRealTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setRealTime(new Date());
  }, []);
  
  return realTime;
}
