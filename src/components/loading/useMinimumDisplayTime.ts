/**
 * useMinimumDisplayTime Hook
 * 
 * Ensures the loading page displays for at least a specified minimum time
 * to avoid flickering and provide a smooth user experience.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */

import { useEffect, useState } from 'react';
import type { MinimumDisplayTimeResult } from './types';

/**
 * Hook to ensure minimum display time for the loading page
 * 
 * This hook guarantees that the loading page will be displayed for at least
 * the specified minimum time, even if resources load faster. This prevents
 * flickering and provides a smoother user experience.
 * 
 * @param minTime - Minimum display time in milliseconds (default: 500)
 * @returns Object containing isMinTimeElapsed boolean
 * 
 * @example
 * ```tsx
 * const { isMinTimeElapsed } = useMinimumDisplayTime(500);
 * 
 * // Only proceed when both resources are ready AND minimum time has elapsed
 * if (isResourcesReady && isMinTimeElapsed) {
 *   startFadeOut();
 * }
 * ```
 */
export function useMinimumDisplayTime(
  minTime: number = 500
): MinimumDisplayTimeResult {
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Record the component mount time (Requirement 4.1)
    const startTime = Date.now();

    // Set up a timer to mark minimum time as elapsed
    // This ensures the loading page displays for at least minTime milliseconds
    // (Requirements 4.2, 4.3, 4.4)
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, minTime);

    // Cleanup: Clear the timer when component unmounts
    // This prevents memory leaks and ensures proper cleanup
    return () => {
      clearTimeout(timer);
    };
  }, [minTime]);

  return { isMinTimeElapsed };
}
