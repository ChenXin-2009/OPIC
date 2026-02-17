/**
 * SettingsMenu.tsx - 设置菜单（明日方舟风格）
 * 位于右下角，点击按钮弹出设置菜单
 * 风格：黑色背景 + 黄色/橙色高光 + 菱形元素
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSolarSystemStore } from '@/lib/state';

// ==================== 明日方舟风格配置 ====================
// 🎨 真实明日方舟 UI：黑色背景 + 黄橙色高光 + 简洁线条

const ARKNIGHTS_CONFIG = {
  position: {
    bottom: '2rem',
    right: '2rem',
    // 移动端位置（避免被时间控制遮挡）
    bottomMobile: '10rem',
    rightMobile: '1rem',
  },
  
  button: {
    size: '3.5rem',
    iconSize: '1.5rem',
  },
  
  menu: {
    width: '18rem',
    maxHeight: '28rem',
    padding: '1rem',
  },
  
  // 明日方舟真实配色
  colors: {
    primary: '#ffffff',      // 白色主色
    secondary: '#e0e0e0',    // 浅灰
    accent: '#f0f0f0',       // 亮白
    dark: '#0a0a0a',         // 纯黑背景
    darkLight: '#1a1a1a',    // 深灰
    border: '#333333',       // 边框灰
    text: '#ffffff',         // 白色文字
    textDim: '#999999',      // 暗淡文字
  },
};

interface SettingsMenuProps {
  cameraController: any;
}

export default function SettingsMenu({ cameraController }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isWideAngle, setIsWideAngle] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const lang = useSolarSystemStore((state) => state.lang);
  const setLang = useSolarSystemStore((state) => state.setLang);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  // 切换超广角模式
  const handleWideAngleToggle = (wide: boolean) => {
    setIsWideAngle(wide);
    if (cameraController) {
      const fov = wide ? 120 : 45;
      cameraController.setFov(fov, true);
    }
  };

  return (
    <>
      {/* 明日方舟风格设置按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed group"
        style={{
          bottom: isMobile ? ARKNIGHTS_CONFIG.position.bottomMobile : ARKNIGHTS_CONFIG.position.bottom,
          right: isMobile ? ARKNIGHTS_CONFIG.position.rightMobile : ARKNIGHTS_CONFIG.position.right,
          width: ARKNIGHTS_CONFIG.button.size,
          height: ARKNIGHTS_CONFIG.button.size,
          zIndex: 99999,
          background: ARKNIGHTS_CONFIG.colors.dark,
          border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)',
          transition: 'all 0.3s ease',
        }}
        aria-label={lang === 'zh' ? '设置' : 'Settings'}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.primary;
          e.currentTarget.style.boxShadow = `0 0 20px ${ARKNIGHTS_CONFIG.colors.primary}80`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* 左上角装饰 */}
        <div 
          className="absolute"
          style={{
            top: '4px',
            left: '4px',
            width: '8px',
            height: '8px',
            background: ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
        
        {/* 右下角装饰 */}
        <div 
          className="absolute"
          style={{
            bottom: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            background: ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />
        
        {/* 图标 */}
        <svg
          className="absolute inset-0 m-auto"
          fill="none"
          stroke={ARKNIGHTS_CONFIG.colors.primary}
          viewBox="0 0 24 24"
          style={{ 
            width: ARKNIGHTS_CONFIG.button.iconSize, 
            height: ARKNIGHTS_CONFIG.button.iconSize,
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* 明日方舟风格设置菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50"
          style={{
            bottom: isMobile 
              ? `calc(${ARKNIGHTS_CONFIG.position.bottomMobile} + ${ARKNIGHTS_CONFIG.button.size} + 0.75rem)`
              : `calc(${ARKNIGHTS_CONFIG.position.bottom} + ${ARKNIGHTS_CONFIG.button.size} + 0.75rem)`,
            right: isMobile ? ARKNIGHTS_CONFIG.position.rightMobile : ARKNIGHTS_CONFIG.position.right,
            width: ARKNIGHTS_CONFIG.menu.width,
            maxHeight: ARKNIGHTS_CONFIG.menu.maxHeight,
            background: ARKNIGHTS_CONFIG.colors.dark,
            border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {/* 左上角菱形装饰 */}
          <div 
            className="absolute"
            style={{
              top: '-1px',
              left: '-1px',
              width: '12px',
              height: '12px',
              background: ARKNIGHTS_CONFIG.colors.primary,
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            }}
          />
          
          {/* 右下角菱形装饰 */}
          <div 
            className="absolute"
            style={{
              bottom: '-1px',
              right: '-1px',
              width: '12px',
              height: '12px',
              background: ARKNIGHTS_CONFIG.colors.primary,
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            }}
          />
          
          <div 
            className="overflow-y-auto"
            style={{ 
              padding: ARKNIGHTS_CONFIG.menu.padding,
              maxHeight: ARKNIGHTS_CONFIG.menu.maxHeight,
            }}
          >
            <div className="flex flex-col gap-4">
              {/* 标题 */}
              <div 
                className="flex items-center gap-2 pb-3"
                style={{
                  borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                }}
              >
                <div 
                  style={{
                    width: '4px',
                    height: '16px',
                    background: ARKNIGHTS_CONFIG.colors.primary,
                  }}
                />
                <span 
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: ARKNIGHTS_CONFIG.colors.text }}
                >
                  {lang === 'zh' ? '设置' : 'SETTINGS'}
                </span>
              </div>

              {/* 语言切换 */}
              <div className="flex flex-col gap-2">
                <span 
                  className="text-xs uppercase tracking-wide"
                  style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                >
                  {lang === 'zh' ? '语言' : 'LANGUAGE'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLang('zh')}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                    style={{
                      background: lang === 'zh' ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.darkLight,
                      color: lang === 'zh' ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.textDim,
                      border: `1px solid ${lang === 'zh' ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
                      clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    }}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                    style={{
                      background: lang === 'en' ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.darkLight,
                      color: lang === 'en' ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.textDim,
                      border: `1px solid ${lang === 'en' ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
                      clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    }}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* 相机视野 */}
              <div className="flex flex-col gap-2">
                <span 
                  className="text-xs uppercase tracking-wide"
                  style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                >
                  {lang === 'zh' ? '相机视野' : 'CAMERA FOV'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleWideAngleToggle(false)}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                    style={{
                      background: !isWideAngle ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.darkLight,
                      color: !isWideAngle ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.textDim,
                      border: `1px solid ${!isWideAngle ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
                      clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    }}
                  >
                    {lang === 'zh' ? '正常' : 'NORMAL'}
                  </button>
                  <button
                    onClick={() => handleWideAngleToggle(true)}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                    style={{
                      background: isWideAngle ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.darkLight,
                      color: isWideAngle ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.textDim,
                      border: `1px solid ${isWideAngle ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
                      clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    }}
                  >
                    {lang === 'zh' ? '广角' : 'WIDE'}
                  </button>
                </div>
              </div>

              {/* 星历状态按钮 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    // Trigger ephemeris status panel
                    const event = new CustomEvent('openEphemerisStatus');
                    window.dispatchEvent(event);
                  }}
                  className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                  style={{
                    background: ARKNIGHTS_CONFIG.colors.darkLight,
                    color: ARKNIGHTS_CONFIG.colors.text,
                    border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.primary;
                    e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.border;
                    e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.text;
                  }}
                >
                  {lang === 'zh' ? '星历状态' : 'EPHEMERIS STATUS'}
                </button>
              </div>

              {/* 分隔线 */}
              <div 
                style={{
                  height: '1px',
                  background: ARKNIGHTS_CONFIG.colors.border,
                }}
              />

              {/* 关于信息 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs uppercase"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    {lang === 'zh' ? '版本' : 'VERSION'}
                  </span>
                  <span 
                    className="text-xs font-mono font-bold"
                    style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
                  >
                    v4.6.0
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs uppercase"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    {lang === 'zh' ? '作者' : 'AUTHOR'}
                  </span>
                  <span 
                    className="text-xs font-mono font-bold"
                    style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
                  >
                    CXIN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
