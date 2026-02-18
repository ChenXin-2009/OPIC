/**
 * Extended Resource Loader Hook
 * 
 * Monitors all critical resources including browser resources and ephemeris data.
 * This ensures the loading animation only disappears when the scene is truly ready.
 * 
 * Requirements: 3.1, 3.5, 5.1, 7.5, 9.1, 9.2, 9.3
 */

import { useState, useEffect } from 'react';
import { ResourceMonitorRegistry } from '../../lib/loading/ResourceMonitorRegistry';
import { BrowserResourceMonitor } from '../../lib/loading/monitors/BrowserResourceMonitor';
import { EphemerisMonitor } from '../../lib/loading/monitors/EphemerisMonitor';
import type { ExtendedResourceLoaderResult } from '../../lib/loading/types';

/**
 * Extended useResourceLoader Hook
 * 
 * Monitors all critical resources:
 * - Browser resources (HTML, CSS, JS, fonts)
 * - Ephemeris data (celestial body positions)
 * 
 * Returns extended result with progress tracking.
 * 
 * Requirements: 3.1, 3.5, 5.1, 7.5, 9.1, 9.2, 9.3
 */
export function useResourceLoader(): ExtendedResourceLoaderResult {
  const [isReady, setIsReady] = useState(false);
  const [wasCached, setWasCached] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('初始化...');
  
  useEffect(() => {
    // Create registry
    const registry = new ResourceMonitorRegistry();
    
    // Register browser resource monitor
    const browserMonitor = new BrowserResourceMonitor();
    registry.register(browserMonitor);
    
    // Register ephemeris monitor
    const ephemerisMonitor = new EphemerisMonitor();
    registry.register(ephemerisMonitor);
    
    // Check if resources were cached
    if (browserMonitor.wasCached()) {
      setWasCached(true);
    }
    
    // Listen for progress updates
    const unsubProgress = registry.onProgress((p) => {
      setProgress(p);
      
      // Update current stage description based on progress
      if (p < 0.3) {
        setCurrentStage('加载浏览器资源...');
      } else if (p < 0.6) {
        setCurrentStage('加载星历数据...');
      } else if (p < 0.9) {
        setCurrentStage('计算天体位置...');
      } else {
        setCurrentStage('准备完成...');
      }
    });
    
    // Listen for ready event
    const unsubReady = registry.onReady(() => {
      setIsReady(true);
      setCurrentStage('完成');
    });
    
    // Timeout protection (10 seconds)
    const timeoutId = setTimeout(() => {
      if (!registry.isAllReady()) {
        console.warn('Loading timeout, proceeding with available resources');
        setIsReady(true);
        setCurrentStage('完成');
      }
    }, 10000);
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      unsubProgress();
      unsubReady();
      registry.dispose();
    };
  }, []);
  
  return { isReady, wasCached, progress, currentStage };
}
