/**
 * Reduced Motion Mode
 * 
 * Reduces or disables non-essential animations for users who prefer reduced motion.
 * Auto-detects system preference and allows manual toggle.
 * 
 * **Features:**
 * - Auto-detection via `prefers-reduced-motion` media query
 * - CSS overrides for animations and transitions
 * - localStorage persistence
 * - System preference watching
 * 
 * **Usage:**
 * ```typescript
 * import { enableReducedMotion, disableReducedMotion } from '@/lib/accessibility/reduced-motion';
 * 
 * // Enable reduced motion
 * enableReducedMotion();
 * 
 * // Disable reduced motion
 * disableReducedMotion();
 * 
 * // Check if enabled
 * const isEnabled = isReducedMotionEnabled();
 * ```
 * 
 * @see Requirements 6.20, 6.21, 6.22
 */

import { logger } from '@/utils/logger';

/**
 * Reduced motion CSS class
 */
const REDUCED_MOTION_CLASS = 'reduce-motion';

/**
 * localStorage key for persistence
 */
const STORAGE_KEY = 'opic_reduced_motion_enabled';

/**
 * Enable reduced motion mode
 * 
 * Sets animation-duration and transition-duration to 0.01ms via CSS class.
 * This effectively disables animations while maintaining accessibility events.
 */
export function enableReducedMotion(): void {
  if (typeof document === 'undefined') return;
  
  // Add CSS class
  document.documentElement.classList.add(REDUCED_MOTION_CLASS);
  
  // Persist preference
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('[ReducedMotion] Failed to save preference:', error);
  }
  
  logger.debug('[ReducedMotion] Reduced motion mode enabled');
}

/**
 * Disable reduced motion mode
 */
export function disableReducedMotion(): void {
  if (typeof document === 'undefined') return;
  
  // Remove CSS class
  document.documentElement.classList.remove(REDUCED_MOTION_CLASS);
  
  // Persist preference
  try {
    localStorage.setItem(STORAGE_KEY, 'false');
  } catch (error) {
    console.warn('[ReducedMotion] Failed to save preference:', error);
  }
  
  logger.debug('[ReducedMotion] Reduced motion mode disabled');
}

/**
 * Toggle reduced motion mode
 */
export function toggleReducedMotion(): boolean {
  const isEnabled = isReducedMotionEnabled();
  
  if (isEnabled) {
    disableReducedMotion();
    return false;
  } else {
    enableReducedMotion();
    return true;
  }
}

/**
 * Check if reduced motion mode is enabled
 */
export function isReducedMotionEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains(REDUCED_MOTION_CLASS);
}

/**
 * Check system preference for reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Initialize reduced motion mode from saved preference or system preference
 */
export function initializeReducedMotion(): void {
  if (typeof window === 'undefined') return;
  
  // Check saved preference first
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
      enableReducedMotion();
      return;
    } else if (saved === 'false') {
      return;
    }
  } catch (error) {
    console.warn('[ReducedMotion] Failed to load preference:', error);
  }
  
  // Auto-detect from system preference
  if (prefersReducedMotion()) {
    enableReducedMotion();
  }
}

/**
 * Listen for system preference changes
 */
export function watchSystemPreference(callback?: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    const enabled = e.matches;
    
    // Auto-enable/disable based on system preference
    if (enabled) {
      enableReducedMotion();
    } else {
      disableReducedMotion();
    }
    
    // Call user callback
    callback?.(enabled);
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    
    // Return cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }
  // Legacy browsers
  else if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
    
    return () => {
      mediaQuery.removeListener(handler);
    };
  }
  
  return () => {};
}

/**
 * Get animation duration based on reduced motion preference
 * 
 * Returns 0 if reduced motion is enabled, otherwise returns the provided duration.
 * Useful for programmatic animations (e.g., with GSAP, anime.js, etc.)
 */
export function getAnimationDuration(defaultDuration: number): number {
  return isReducedMotionEnabled() ? 0 : defaultDuration;
}

/**
 * Check if animations should run
 * 
 * Returns false if reduced motion is enabled.
 */
export function shouldAnimate(): boolean {
  return !isReducedMotionEnabled();
}
