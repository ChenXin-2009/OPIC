/**
 * TypeScript type definitions for the Arknights-style loading page
 * 
 * This file contains all interfaces and types used across the loading page components.
 */

/**
 * Loading page state
 * Tracks the current state of the loading process
 */
export interface LoadingState {
  /** Whether the page is currently loading */
  isLoading: boolean;
  
  /** Whether all resources (images, fonts, scripts) are ready */
  isResourcesReady: boolean;
  
  /** Whether the minimum display time has elapsed */
  isMinTimeElapsed: boolean;
  
  /** Whether the fade-out animation is in progress */
  isFadingOut: boolean;
}

/**
 * Loading page configuration
 * Defines customizable parameters for the loading behavior
 */
export interface LoadingConfig {
  /** Minimum display time in milliseconds (default: 500) */
  minDisplayTime: number;
  
  /** Fade-out animation duration in milliseconds (default: 400) */
  fadeOutDuration: number;
  
  /** Enable debug mode for development (optional) */
  debug?: boolean;
}

/**
 * Default loading configuration
 */
export const DEFAULT_LOADING_CONFIG: LoadingConfig = {
  minDisplayTime: 500,
  fadeOutDuration: 400,
  debug: false,
};

/**
 * Props for the main LoadingPage component
 */
export interface LoadingPageProps {
  /** Minimum display time in milliseconds (default: 500) */
  minDisplayTime?: number;
  
  /** Fast fade-out duration for cached resources in milliseconds (default: 200) */
  fastFadeOutTime?: number;
}

/**
 * Result from the useResourceLoader hook
 * Provides information about resource loading status
 */
export interface ResourceLoaderResult {
  /** Whether all resources are ready */
  isReady: boolean;
  
  /** Whether resources were already cached (loaded instantly) */
  wasCached: boolean;
  
  /** Number of loaded resources (optional, for progress tracking) */
  loadedResources?: number;
  
  /** Total number of resources (optional, for progress tracking) */
  totalResources?: number;
}

/**
 * Result from the useMinimumDisplayTime hook
 * Indicates whether the minimum display time has elapsed
 */
export interface MinimumDisplayTimeResult {
  /** Whether the minimum display time has elapsed */
  isMinTimeElapsed: boolean;
}

/**
 * Props for the ArknightsVisuals component
 * Controls the visual elements and animations
 */
export interface ArknightsVisualsProps {
  /** Whether animations should be playing */
  isAnimating: boolean;
}

/**
 * Props for the LoadingSpinner component
 * Controls the loading spinner appearance and behavior
 */
export interface LoadingSpinnerProps {
  /** Whether the spinner animation should be playing */
  isAnimating: boolean;
  
  /** Size of the spinner in pixels (default: 80) */
  size?: number;
}
