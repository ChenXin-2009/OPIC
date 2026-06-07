/**
 * OPIC Service Worker
 *
 * Implements Progressive Web App functionality with:
 * - Cache-first strategy for static assets (7 day max age)
 * - Network-first strategy for API data (5 second timeout)
 * - Cache-first with network fallback for images
 * - Offline fallback pages for main routes
 * - Update notification system
 * - Error handling with graceful degradation
 *
 * Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.15
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `opic-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `opic-dynamic-${CACHE_VERSION}`;
const API_CACHE = `opic-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `opic-images-${CACHE_VERSION}`;

// Cache expiration times (in milliseconds)
const CACHE_MAX_AGE = {
  static: 7 * 24 * 60 * 60 * 1000,   // 7 days  — Requirement 8.6
  api: 5 * 60 * 1000,                  // 5 minutes
  images: 30 * 24 * 60 * 60 * 1000,   // 30 days  — Requirement 8.9
};

// Network timeout for API requests — Requirement 8.7
const NETWORK_TIMEOUT = 5000;

// Critical static assets to cache on install — Requirement 8.5
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Offline fallback page — Requirement 8.10
const OFFLINE_FALLBACK = '/offline.html';

// ============================================================================
// Lifecycle Events
// ============================================================================

/**
 * Install event: Pre-cache critical static assets
 * Requirement 8.5: Cache critical static resources including HTML, CSS, and JS
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Use individual adds to allow partial failure
        return Promise.allSettled(
          STATIC_ASSETS.map((url) => cache.add(url).catch((err) => {
            console.warn('[Service Worker] Failed to cache:', url, err);
          }))
        );
      })
      .then(() => {
        console.log('[Service Worker] Install complete — skipping waiting');
        // Activate immediately so new SW takes control without waiting
        return self.skipWaiting();
      })
      .catch((error) => {
        // Requirement 8.15: Log error and continue in degraded mode
        console.error('[Service Worker] Install error:', error);
      })
  );
});

/**
 * Activate event: Clean old caches, claim clients, notify update, purge expired entries
 * Requirements 8.11, 8.12: Update notification system
 * Requirement 8.15: Error handling with graceful degradation
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    Promise.resolve()
      // Step 1: Remove old caches that don't match the current version
      .then(() =>
        caches.keys().then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (name) =>
                  name.startsWith('opic-') && !name.endsWith(`-${CACHE_VERSION}`)
              )
              .map((name) => {
                console.log('[Service Worker] Deleting old cache:', name);
                return caches.delete(name);
              })
          )
        )
      )
      // Step 2: Take control of all open clients immediately
      .then(() => {
        console.log('[Service Worker] Old caches cleaned — claiming clients');
        return self.clients.claim();
      })
      // Step 3: Notify all clients that a new SW version is active
      // Requirement 8.11: Notify User through a non-intrusive banner
      .then(() =>
        self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATE_AVAILABLE',
              version: CACHE_VERSION,
            });
          });
        })
      )
      // Step 4: Clean up expired cache entries
      .then(() => cleanExpiredCaches())
      .catch((error) => {
        // Requirement 8.15: Log error and continue
        console.error('[Service Worker] Activate error:', error);
      })
  );
});

/**
 * Fetch event: Route requests to the appropriate caching strategy
 * Requirements 8.6, 8.7, 8.8, 8.9, 8.10
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  try {
    const url = new URL(request.url);

    // Requirement 8.6: Cache-first for static assets (/_next/static/, *.css, *.js)
    if (isStaticAsset(url)) {
      event.respondWith(
        cacheFirstStrategy(request, STATIC_CACHE, CACHE_MAX_AGE.static)
      );
    }
    // Requirements 8.7, 8.8: Network-first for API data (5-second timeout, fallback to cache)
    else if (isAPIRequest(url)) {
      event.respondWith(
        networkFirstWithTimeout(request, API_CACHE, NETWORK_TIMEOUT)
      );
    }
    // Requirement 8.9: Cache-first with network fallback for images
    else if (isImageRequest(url)) {
      event.respondWith(
        cacheFirstStrategy(request, IMAGE_CACHE, CACHE_MAX_AGE.images)
      );
    }
    // Default: Network-first with offline fallback for HTML navigation
    else {
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    }
  } catch (error) {
    // Requirement 8.15: Error handling — never let SW crash the page
    console.error('[Service Worker] Fetch routing error:', error);
    event.respondWith(handleFetchError(request));
  }
});

/**
 * Message event: Handle commands from clients
 * Requirement 8.12: Handle update acknowledgment (SKIP_WAITING)
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================================
// Resource Type Detection
// ============================================================================

/**
 * Cache-first static assets:
 *   - Next.js static chunks  /_next/static/**
 *   - CSS and JS files       *.css, *.js
 *   - Fonts                  *.woff, *.woff2, *.ttf, *.eot, *.otf
 *   - Site manifest & icons
 *
 * Requirement 8.6
 */
function isStaticAsset(url) {
  const pathname = url.pathname;
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.otf'];

  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    staticExtensions.some((ext) => pathname.endsWith(ext))
  );
}

/**
 * Network-first API requests:
 *   - Any path under /api/
 *
 * Requirement 8.7
 * Note: We only treat same-origin /api/ paths as API requests to avoid
 * accidentally applying this strategy to external CDN resources.
 */
function isAPIRequest(url) {
  return (
    url.hostname === self.location.hostname &&
    url.pathname.startsWith('/api/')
  );
}

/**
 * Cache-first image requests:
 *   - Common image extensions
 *   - /textures/ and /screenshots/ directories
 *
 * Requirement 8.9
 */
function isImageRequest(url) {
  const pathname = url.pathname;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.avif'];

  return (
    imageExtensions.some((ext) => pathname.endsWith(ext)) ||
    pathname.startsWith('/textures/') ||
    pathname.startsWith('/screenshots/')
  );
}

// ============================================================================
// Caching Strategies
// ============================================================================

/**
 * Cache-first: serve from cache when available and not expired.
 * On cache miss or expiry, fetch from network and update cache.
 * On network failure, serve stale cache or offline fallback.
 *
 * Requirement 8.6 (static), 8.9 (images)
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @param {number}  maxAge  — milliseconds
 */
async function cacheFirstStrategy(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      const dateHeader = cached.headers.get('date');
      const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : 0;

      if (age < maxAge) {
        console.log('[Service Worker] Cache-first hit:', request.url);

        // Revalidate in the background (stale-while-revalidate)
        fetchAndCache(request, cache).catch((err) => {
          console.warn('[Service Worker] Background revalidation failed:', err);
        });

        return cached;
      }
    }

    // Cache miss or expired — fetch from network
    console.log('[Service Worker] Cache miss, fetching:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Requirement 8.15: Graceful degradation
    console.error('[Service Worker] Cache-first error:', error);

    // Try stale cached response before giving up
    const stale = await caches.match(request);
    if (stale) {
      console.log('[Service Worker] Serving stale cache:', request.url);
      return stale;
    }

    return handleFetchError(request);
  }
}

/**
 * Network-first with timeout: attempt network fetch within `timeout` ms.
 * On timeout or failure, fall back to cached response.
 *
 * Requirements 8.7, 8.8
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @param {number}  timeout  — milliseconds
 */
async function networkFirstWithTimeout(request, cacheName, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }

    console.log('[Service Worker] Network-first success:', request.url);
    return response;
  } catch (fetchError) {
    clearTimeout(timeoutId);

    // Requirement 8.8: Fall back to cached data on timeout or network failure
    console.warn('[Service Worker] Network-first fallback to cache:', request.url, fetchError.name);

    const cached = await caches.match(request);
    if (cached) {
      console.log('[Service Worker] Serving cached API response:', request.url);
      return cached;
    }

    // Requirement 8.15: Log and return graceful error response
    console.error('[Service Worker] No cached API response available:', request.url);
    return handleFetchError(request);
  }
}

/**
 * Network-first (no timeout): used for HTML navigation and other resources.
 * On network failure, fall back to cache then offline page.
 *
 * Requirement 8.10
 *
 * @param {Request} request
 * @param {string}  cacheName
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[Service Worker] Network-first error:', error);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return handleFetchError(request);
  }
}

/**
 * Fetch a resource and update the provided cache in place.
 *
 * @param {Request} request
 * @param {Cache}   cache
 */
async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Return an offline fallback for navigation requests, or a JSON error for others.
 * Requirement 8.10: Offline fallback pages for main navigation routes
 * Requirement 8.15: Error handling with graceful degradation
 *
 * @param {Request} request
 */
async function handleFetchError(request) {
  // Navigation requests → serve offline.html
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match(OFFLINE_FALLBACK);
    if (offlinePage) {
      return offlinePage;
    }
  }

  // API / other requests → minimal JSON error
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'Network request failed and no cached version is available.',
      url: request.url,
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }
  );
}

// ============================================================================
// Cache Maintenance
// ============================================================================

/**
 * Remove cache entries whose age exceeds the configured maximum.
 * Called during the activate phase to keep caches lean.
 */
async function cleanExpiredCaches() {
  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      if (!cacheName.startsWith('opic-')) continue;

      // Determine max age for this cache
      let maxAge = CACHE_MAX_AGE.static;
      if (cacheName.includes('api')) {
        maxAge = CACHE_MAX_AGE.api;
      } else if (cacheName.includes('images')) {
        maxAge = CACHE_MAX_AGE.images;
      }

      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const req of requests) {
        const response = await cache.match(req);
        if (!response) continue;

        const dateHeader = response.headers.get('date');
        if (!dateHeader) continue;

        const age = Date.now() - new Date(dateHeader).getTime();
        if (age > maxAge) {
          await cache.delete(req);
          console.log('[Service Worker] Expired cache entry removed:', req.url);
        }
      }
    }
  } catch (error) {
    // Requirement 8.15: Log but don't crash
    console.error('[Service Worker] Cache cleanup error:', error);
  }
}

console.log('[Service Worker] Script loaded, version:', CACHE_VERSION);
