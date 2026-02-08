import { useState, useEffect } from 'react';
import { ResourceLoaderResult } from './types';

/**
 * Custom hook to monitor browser resource loading status
 * 
 * This hook listens to:
 * - window.load event (all resources loaded)
 * - document.fonts.ready Promise (fonts loaded)
 * - document.readyState (document parsing state)
 * 
 * It also includes:
 * - Fallback for browsers that don't support certain APIs
 * - Timeout protection (10 seconds) to prevent infinite loading
 * - Cache detection to optimize subsequent page visits
 * 
 * **Validates: Requirements 3.1, 3.5, 7.5**
 * 
 * @returns {ResourceLoaderResult} Object containing isReady status and wasCached flag
 */
export function useResourceLoader(): ResourceLoaderResult {
  const [isReady, setIsReady] = useState(false);
  const [wasCached, setWasCached] = useState(false);

  useEffect(() => {
    let isCleanedUp = false;

    // Check if resources are already loaded (e.g., cached or fast network)
    // This is the cache detection logic (Requirement 7.5)
    if (document.readyState === 'complete') {
      // Mark as cached since resources were already ready
      setWasCached(true);
      
      // Even if document is complete, wait for fonts to be ready
      checkFontsReady().then(() => {
        if (!isCleanedUp) {
          setIsReady(true);
        }
      });
      return () => {
        isCleanedUp = true;
      };
    }

    /**
     * Handle the window load event
     * This fires when all resources (images, scripts, stylesheets) are loaded
     */
    const handleLoad = () => {
      if (isCleanedUp) return;
      
      // Wait for fonts to be ready before marking as complete
      checkFontsReady().then(() => {
        if (!isCleanedUp) {
          setIsReady(true);
        }
      });
    };

    // Add load event listener
    window.addEventListener('load', handleLoad);

    // Timeout protection: force ready state after 10 seconds
    // This prevents the loading page from showing indefinitely if resources fail to load
    const timeoutId = setTimeout(() => {
      if (!isCleanedUp && !isReady) {
        setIsReady(true);
      }
    }, 10000); // 10 seconds

    // Cleanup function
    return () => {
      isCleanedUp = true;
      window.removeEventListener('load', handleLoad);
      clearTimeout(timeoutId);
    };
  }, []);

  return { isReady, wasCached };
}

/**
 * Check if fonts are ready to use
 * Includes fallback for browsers that don't support document.fonts API
 * 
 * @returns {Promise<void>} Promise that resolves when fonts are ready
 */
async function checkFontsReady(): Promise<void> {
  // Feature detection: check if document.fonts API is supported
  if (typeof document !== 'undefined' && 'fonts' in document && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {
      // If fonts.ready fails, silently continue
    }
  } else {
    // Fallback for browsers without document.fonts support
    // Wait a fixed time (1 second) to allow fonts to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
