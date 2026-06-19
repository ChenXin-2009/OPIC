/**
 * MOD 管理器按钮 (Mod Manager Button)
 *
 * macOS 风格的 Dock 栏按钮，点击打开 MOD 管理器面板。
 */

'use client';

/**
 * MOD管理器按钮
 * 
 * macOS风格的按钮，用于打开MOD管理器面板。
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
        className="fixed transition-all duration-200"
        style={{
          top: '12.5rem',
          right: '2rem',
          zIndex: 1001,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
          cursor: 'pointer',
          padding: '10px 20px',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          borderRadius: '10px',
          boxShadow: isHovered 
            ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset' 
            : '0 4px 16px rgba(0, 0, 0, 0.2)',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
        aria-label="MOD Manager"
      >
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