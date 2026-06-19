/**
 * 性能初始化器 (Performance Initializer)
 *
 * 客户端组件，在挂载时初始化 PerformanceMonitor 单例。
 * 收集 FPS、内存、Web Vitals 等性能指标。
 */

'use client';

import { useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { logger } from '@/utils/logger';

/**
 * PerformanceInitializer
 * 
 * Client component that initializes the PerformanceMonitor singleton.
 * Should be included in the root layout to start monitoring on app load.
 * 
 * **Features:**
 * - Automatic startup on component mount
 * - Automatic cleanup on unmount
 * - Threshold-based metric export (FPS < 30 or memory > 80%)
 * - Error handling with graceful degradation
 * 
 * **Integration:**
 * Add to `src/app/layout.tsx`:
 * ```tsx
 * import { PerformanceInitializer } from '@/components/PerformanceInitializer';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PerformanceInitializer />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 * 
 * @see Requirements 2.16, 2.19
 */
export function PerformanceInitializer() {
  useEffect(() => {
    try {
      logger.debug('[PerformanceInitializer] Starting performance monitoring...');
      
      // Start monitoring
      performanceMonitor.start();
      
      // Subscribe to metrics updates for threshold-based export
      const unsubscribe = performanceMonitor.subscribe((metrics) => {
        // Check thresholds
        const lowFPS = metrics.fps < 30;
        const highMemoryUsage = metrics.heapLimit > 0 && 
                                (metrics.usedHeapSize / metrics.heapLimit) > 0.8;
        
        // Export if thresholds exceeded
        if (lowFPS || highMemoryUsage) {
          console.warn('[PerformanceInitializer] Performance threshold exceeded:', {
            fps: metrics.fps,
            memoryUsagePercent: metrics.heapLimit > 0 
              ? ((metrics.usedHeapSize / metrics.heapLimit) * 100).toFixed(2) + '%'
              : 'N/A',
          });
          
          // Export metrics (will be saved to localStorage automatically)
          performanceMonitor.exportMetrics();
        }
      });
      
      logger.debug('[PerformanceInitializer] Performance monitoring started successfully');
      
      // Cleanup on unmount
      return () => {
        logger.debug('[PerformanceInitializer] Stopping performance monitoring...');
        unsubscribe();
        performanceMonitor.stop();
      };
    } catch (error) {
      // Graceful degradation: log error but don't crash app
      console.error('[PerformanceInitializer] Failed to initialize performance monitoring:', error);
      console.warn('[PerformanceInitializer] Application will continue without performance monitoring');
      return;
    }
  }, []);
  
  // This component doesn't render anything
  return null;
}
