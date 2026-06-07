/**
 * Service Worker Registration Utility
 * 
 * Handles service worker lifecycle management including:
 * - Registration
 * - Update detection
 * - Error handling
 * 
 * Requirements: 8.5, 8.11, 8.12, 8.15
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register the service worker
 * Requirement 8.5: Register service worker for PWA functionality
 */
export function registerServiceWorker(config: ServiceWorkerConfig = {}): void {
  // Only register in production and if service workers are supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Wait for page load to avoid impacting initial render performance
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration);

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Requirement 8.11, 8.12: Handle service worker updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) {
            return;
          }

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[PWA] New content available; please refresh.');
                config.onUpdate?.(registration);
              } else {
                // Content cached for offline use
                console.log('[PWA] Content cached for offline use.');
                config.onSuccess?.(registration);
              }
            }
          };
        };
      })
      .catch((error) => {
        // Requirement 8.15: Error handling with graceful degradation
        console.error('[PWA] Service Worker registration failed:', error);
        config.onError?.(error);
      });

    // Requirement 8.12: Listen for controller change (update activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service Worker controller changed');
      // Page will reload when user accepts update
    });
  });
}

/**
 * Unregister all service workers (for development/cleanup)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    console.log('[PWA] Service Worker unregistered:', unregistered);
    return unregistered;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if service worker is registered and active
 */
export function isServiceWorkerActive(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  return !!navigator.serviceWorker.controller;
}

/**
 * Send message to active service worker
 */
export function sendMessageToServiceWorker(message: unknown): void {
  if (!isServiceWorkerActive()) {
    console.warn('[PWA] No active service worker to send message to');
    return;
  }

  navigator.serviceWorker.controller?.postMessage(message);
}
