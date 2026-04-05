'use client';

/**
 * 商业航天发射追踪按钮 - Arknights 风格
 * 直接渲染 SpaceLaunchOverlay（含 3D 渲染器集成）
 */

import React, { useState } from 'react';
import SpaceLaunchOverlay from './SpaceLaunchOverlay';

interface Props {
  lang?: 'zh' | 'en';
}

export default function SpaceLaunchButton({ lang = 'zh' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const label = lang === 'zh' ? '航天' : 'LAUNCH';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed"
        style={{
          top: '19.5rem',
          right: '2rem',
          zIndex: 1001,
          background: '#0a0a0a',
          border: `2px solid ${isHovered ? '#4488ff' : '#112244'}`,
          cursor: 'pointer',
          padding: '8px 16px',
          transition: 'all 0.3s ease',
          color: isHovered ? '#4488ff' : '#224488',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: isHovered ? '0 0 20px rgba(68, 136, 255, 0.4)' : 'none',
        }}
        aria-label={lang === 'zh' ? '商业航天发射追踪' : 'Space Launch Tracker'}
      >
        <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, background: isHovered ? '#4488ff' : '#112244', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, background: isHovered ? '#4488ff' : '#112244', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        {label}
      </button>

      {isOpen && (
        <SpaceLaunchOverlay lang={lang} />
      )}
    </>
  );
}
