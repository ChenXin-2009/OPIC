'use client';

/**
 * MOD管理器按钮
 * 
 * 阿肯骑士风格的按钮，用于打开MOD管理器面板。
 */

import React, { useState } from 'react';
import { ModManagerPanel } from '@/components/mod-manager/ModManagerPanel';

interface ModManagerButtonProps {
  /** 语言 */
  lang?: 'zh' | 'en';
}

export const ModManagerButton: React.FC<ModManagerButtonProps> = ({
  lang = 'zh',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const label = lang === 'zh' ? 'MOD' : 'MOD';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed"
        style={{
          top: '12.5rem',
          right: '2rem',
          zIndex: 1001,
          background: '#0a0a0a',
          border: `2px solid ${isHovered ? '#ffffff' : '#333333'}`,
          cursor: 'pointer',
          padding: '8px 16px',
          transition: 'all 0.3s ease',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: isHovered ? '0 0 20px rgba(255, 255, 255, 0.5)' : 'none',
        }}
        aria-label="MOD Manager"
      >
        {/* 左上角菱形装饰 */}
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />

        {/* 右下角菱形装饰 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />

        {label}
      </button>

      {isOpen && (
        <ModManagerPanel
          onClose={() => setIsOpen(false)}
          lang={lang}
        />
      )}
    </>
  );
};

export default ModManagerButton;