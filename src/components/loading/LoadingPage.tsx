/**
 * LoadingPage Component
 * 
 * Main loading page component that displays an Arknights-style loading screen
 * while resources are being loaded. This component:
 * - Monitors resource loading status (images, fonts, scripts)
 * - Ensures minimum display time to avoid flickering
 * - Provides smooth fade-out transition when loading completes
 * - Renders as a full-screen overlay with z-index 9999
 * 
 * Requirements: 1.1, 1.2, 4.2, 4.3, 5.1, 7.1, 7.3
 */

'use client';

import { useState, useEffect } from 'react';
import ArknightsVisuals from './ArknightsVisuals';
import { useResourceLoader } from './useResourceLoader';
import { useMinimumDisplayTime } from './useMinimumDisplayTime';
import type { LoadingPageProps } from './types';

/**
 * LoadingPage - Full-screen loading overlay with Arknights-style visuals
 * 
 * This component orchestrates the loading experience by:
 * 1. Monitoring resource loading via useResourceLoader hook
 * 2. Enforcing minimum display time via useMinimumDisplayTime hook
 * 3. Managing fade-out animation when loading completes
 * 4. Removing itself from DOM after fade-out completes
 * 5. Implementing fast fade-out for cached resources (Requirement 7.5)
 * 
 * @param minDisplayTime - Minimum time to display loading page (default: 500ms)
 * @param fastFadeOutTime - Shortened display time for cached resources (default: 200ms)
 * 
 * @example
 * ```tsx
 * // In layout.tsx
 * <body>
 *   <LoadingPage />
 *   <Header />
 *   {children}
 * </body>
 * ```
 */
export default function LoadingPage({
  minDisplayTime = 1000,
  fastFadeOutTime = 1000
}: LoadingPageProps = {}) {
  // Track whether component is mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);
  
  // Track loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Track fade-out animation state
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  // Monitor resource loading status (Requirement 3.1, 3.5, 7.5)
  const { isReady: isResourcesReady, wasCached } = useResourceLoader();
  
  // Use fast fade-out time if resources were cached, otherwise use normal minimum time
  // This implements the fast fade-out logic for cached scenarios (Requirement 7.5)
  const effectiveMinTime = wasCached ? fastFadeOutTime : minDisplayTime;
  
  // Ensure minimum display time (Requirements 4.1, 4.2, 4.3, 4.4, 7.5)
  const { isMinTimeElapsed } = useMinimumDisplayTime(effectiveMinTime);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle loading completion logic
  useEffect(() => {
    // Loading is complete when both conditions are met:
    // 1. All resources are ready (Requirements 4.2, 4.3)
    // 2. Minimum display time has elapsed
    const isLoadingComplete = isResourcesReady && isMinTimeElapsed;

    if (isLoadingComplete && !isFadingOut) {
      // Start fade-out animation (Requirement 5.1)
      setIsFadingOut(true);
    }
  }, [isResourcesReady, isMinTimeElapsed, isFadingOut, wasCached, effectiveMinTime]);

  /**
   * Handle animation end event
   * Triggered when fade-out animation completes (Requirement 5.4)
   */
  const handleAnimationEnd = () => {
    if (isFadingOut) {
      // Remove component from DOM after fade-out completes
      // Add 'loaded' class to body to show main content
      document.body.classList.add('loaded');
      setIsLoading(false);
    }
  };

  // Don't render on server-side (Requirement 7.1)
  if (!isMounted) {
    return null;
  }

  // Don't render after loading completes (Requirement 5.4, 7.3)
  if (!isLoading) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!isFadingOut}
      aria-label={isFadingOut ? "页面加载完成" : "页面加载中"}
      className={`
        fixed inset-0 z-[9999] bg-black
        ${isFadingOut ? 'animate-fadeOut' : ''}
      `}
      style={{
        willChange: isFadingOut ? 'opacity, transform' : 'auto'
      }}
      onAnimationEnd={handleAnimationEnd}
      onTransitionEnd={handleAnimationEnd}
    >
      {/* Screen reader text for accessibility (Requirement 10.4) */}
      <span className="sr-only">
        {isFadingOut ? "加载完成" : "正在加载页面资源，请稍候..."}
      </span>

      {/* Arknights-style visual elements (Requirements 1.3, 1.4, 2.1-2.6) */}
      <ArknightsVisuals isAnimating={!isFadingOut} />
    </div>
  );
}
