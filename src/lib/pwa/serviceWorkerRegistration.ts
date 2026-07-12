/**
 * Service Worker Registration Utility
 *
 * 提供 Service Worker 的全生命周期管理能力，包括注册、更新检测、
 * 反注册、活跃性检查以及消息通信。
 *
 * 功能摘要：
 * - `registerServiceWorker` — 注册 SW，每小时自动检查更新，处理 install/update 回调
 * - `unregisterServiceWorker` — 注销当前 SW（开发/清理用）
 * - `isServiceWorkerActive` — 检查是否有激活的 SW
 * - `sendMessageToServiceWorker` — 向激活的 SW 发送消息
 *
 * Requirements: 8.5, 8.11, 8.12, 8.15
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
 */

/**
 * Service Worker 配置选项
 */
export interface ServiceWorkerConfig {
  /** 注册成功（内容已缓存供离线使用）时的回调 */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  /** 检测到新版本可用时的回调 */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** 注册失败时的错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 注册 Service Worker
 *
 * 在生产环境中注册 `/sw.js`，监听更新事件并在检测到新版本时通过
 * `onUpdate` 回调通知。每小时自动触发 `registration.update()` 以
 * 检查新版本。
 *
 * Requirement 8.5: Register service worker for PWA functionality
 * Requirement 8.11, 8.12: Handle service worker updates
 * Requirement 8.15: Error handling with graceful degradation
 *
 * @param config - 配置回调（onSuccess / onUpdate / onError）
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
 * 注销当前 Service Worker
 *
 * 用于开发环境清理或用户主动注销场景。
 *
 * @returns 注销成功返回 true，失败或环境不支持 SW 返回 false
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
 * 检查 Service Worker 是否已注册并激活
 *
 * @returns 有激活的 SW 返回 true，否则返回 false
 */
export function isServiceWorkerActive(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  return !!navigator.serviceWorker.controller;
}

/**
 * 向激活的 Service Worker 发送消息
 *
 * 通过 postMessage API 与 SW 通信。如果当前没有激活的 SW，
 * 仅输出警告，不会抛出异常。
 *
 * @param message - 要发送的消息内容（可以是任意结构化数据）
 */
export function sendMessageToServiceWorker(message: unknown): void {
  if (!isServiceWorkerActive()) {
    console.warn('[PWA] No active service worker to send message to');
    return;
  }

  navigator.serviceWorker.controller?.postMessage(message);
}
