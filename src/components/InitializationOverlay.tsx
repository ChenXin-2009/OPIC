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

  // 当初始化完成或进度达到100%时，延迟后开始淡出动画
  useEffect(() => {
    // 触发条件：isComplete 为 true 或进度达到 100%
    if (progress.isComplete || progress.progress >= 100) {
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
    return undefined;
  }, [progress.isComplete, progress.progress]);

  // 如果不应该渲染，直接返回null
  if (!shouldRender) {
    return null;
  }

  const stageText = STAGE_NAMES[lang][progress.stage as keyof typeof STAGE_NAMES['zh']] || progress.stage;

  // 计算遮罩透明度: 50%之前为0.85, 50%-100%线性降低到0
  const calculateOverlayOpacity = () => {
    if (progress.progress <= 50) {
      return 0.85;
    }
    // 从50%到100%线性降低: 0.85 -> 0
    const fadeProgress = (progress.progress - 50) / 50; // 0 到 1
    return 0.85 * (1 - fadeProgress);
  };

  const overlayOpacity = calculateOverlayOpacity();

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'background-color 300ms ease-out',
        // 当不可见或透明度为0时，让点击穿透
        pointerEvents: (!isVisible || overlayOpacity === 0) ? 'none' : 'auto',
      }}
    >
      {/* Logo - 居中 */}
      <div className="relative w-96 h-96 animate-pulse">
        <Image
          src="/LOGO/logolw.svg"
          alt="OPIC Logo"
          fill
          priority
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* 进度条 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center pb-8 px-4">
        {/* 进度百分比 - 在进度条上方 */}
        <div
          className="text-white font-numeric mb-4"
          style={{
            fontSize: '14px',
            fontWeight: 400,
            opacity: 0.7,
          }}
        >
          {Math.round(progress.progress)}%
        </div>

        {/* 进度条容器 - 全屏宽度 */}
        <div
          className="w-full h-2 relative overflow-hidden"
          style={{
            backgroundColor: '#1f1f1f',
            borderRadius: '2px',
          }}
        >
          {/* 进度条填充 */}
          <div
            className="absolute top-0 left-0 h-full transition-all duration-300 ease-out"
            style={{
              width: `${progress.progress}%`,
              backgroundColor: '#ffffff',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
