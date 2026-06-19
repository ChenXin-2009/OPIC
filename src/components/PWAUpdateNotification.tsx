/**
 * PWA 更新通知 (PWA Update Notification)
 *
 * 监听 Service Worker 的更新事件，当新版本可用时在页面底部显示更新提示横幅。
 */

'use client';

/**
 * PWA Update Notification Banner
 *
 * Listens for SW_UPDATE_AVAILABLE messages from the service worker and
 * displays a non-intrusive bottom banner so the user can reload to apply
 * the latest version.
 *
 * Requirements: 8.11, 8.12
 */

import { useEffect, useState, useCallback } from 'react';

export function PWAUpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Requirement 8.11: Listen for SW_UPDATE_AVAILABLE message posted by the SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        console.log('[PWA] Update available — showing notification banner');
        setShowBanner(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Also show the banner when the controller swaps (i.e. user was already
    // on the page when SW activated for the first time on this session).
    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller) {
        setShowBanner(true);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  /** Requirement 8.12: Activate the new SW version on user acknowledgment */
  const handleUpdate = useCallback(() => {
    setShowBanner(false);
    window.location.reload();
  }, []);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="Application update available"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        borderRadius: '8px',
        background: 'rgba(15, 20, 50, 0.95)',
        border: '1px solid rgba(74, 144, 226, 0.4)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        color: '#e0e6f0',
        fontSize: '0.9rem',
        maxWidth: 'calc(100vw - 32px)',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Icon */}
      <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>🚀</span>

      {/* Message */}
      <span>A new version of OPIC is available.</span>

      {/* Reload button */}
      <button
        onClick={handleUpdate}
        aria-label="Reload to apply update"
        style={{
          padding: '6px 14px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          transition: 'opacity 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        Reload
      </button>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'transparent',
          color: '#808080',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#e0e6f0';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#808080';
        }}
      >
        ✕
      </button>
    </div>
  );
}
