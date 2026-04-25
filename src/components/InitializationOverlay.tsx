/**
 * InitializationOverlay.tsx - 初始化遮罩组件
 * 
 * 功能：
 * - 在场景初始化时显示半透明黑色模糊遮罩
 * - 显示Logo和进度条
 * - 跟踪初始化各个阶段的真实进度
 * - 初始化完成后平滑淡出
 */

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export interface InitializationProgress {
  stage: string;
  progress: number; // 0-100
  isComplete: boolean;
}

interface InitializationOverlayProps {
  progress: InitializationProgress;
  lang: 'zh' | 'en';
}

const STAGE_NAMES = {
  zh: {
    loading: '加载资源...',
    idle: '准备中...',
    scene: '初始化场景...',
    celestialBodies: '加载天体数据...',
    universe: '加载宇宙数据...',
    textures: '加载纹理...',
    complete: '初始化完成',
  },
  en: {
    loading: 'Loading Resources...',
    idle: 'Preparing...',
    scene: 'Initializing Scene...',
    celestialBodies: 'Loading Celestial Bodies...',
    universe: 'Loading Universe Data...',
    textures: 'Loading Textures...',
    complete: 'Initialization Complete',
  },
};

export default function InitializationOverlay({ progress, lang }: InitializationOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  // 当初始化完成时，延迟后开始淡出动画
  useEffect(() => {
    if (progress.isComplete) {
      // 延迟500ms后开始淡出
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
      }, 500);

      // 淡出动画完成后移除组件
      const removeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 1000); // 500ms延迟 + 500ms淡出动画

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [progress.isComplete]);

  // 如果不应该渲染，直接返回null
  if (!shouldRender) {
    return null;
  }

  const stageText = STAGE_NAMES[lang][progress.stage as keyof typeof STAGE_NAMES['zh']] || progress.stage;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative w-32 h-32 animate-pulse">
          <Image
            src="/LOGO/logolw.svg"
            alt="CXIC Logo"
            fill
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* 进度信息 */}
        <div className="flex flex-col items-center gap-4 min-w-[300px]">
          {/* 阶段文本 */}
          <div
            className="text-white text-center font-numeric"
            style={{
              fontSize: '16px',
              fontWeight: 500,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {stageText}
          </div>

          {/* 进度条容器 */}
          <div
            className="w-full h-1 bg-gray-800 relative overflow-hidden"
            style={{
              borderRadius: '2px',
            }}
          >
            {/* 进度条填充 */}
            <div
              className="absolute top-0 left-0 h-full bg-white transition-all duration-300 ease-out"
              style={{
                width: `${progress.progress}%`,
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
              }}
            />
          </div>

          {/* 进度百分比 */}
          <div
            className="text-white font-numeric"
            style={{
              fontSize: '14px',
              fontWeight: 400,
              opacity: 0.7,
            }}
          >
            {Math.round(progress.progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}
