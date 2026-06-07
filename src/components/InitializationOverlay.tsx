/**
 * InitializationOverlay.tsx - Enhanced Initialization Overlay Component
 * 
 * Features:
 * - Display semi-transparent black blurred overlay during scene initialization
 * - Show Logo and progress bar with detailed loading phases
 * - Track real progress of initialization stages
 * - Smooth fade out after initialization completes
 * - Timeout warning after 30 seconds with diagnostic suggestions
 * - Retry mechanism with exponential backoff (max 3 attempts)
 * - Error display with actionable suggestions
 * - Debounced progress updates (minimum 200ms interval)
 * 
 * @see Requirements 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';

/**
 * Loading phase definitions
 * - Asset Loading (0-40%): Textures, models, shaders
 * - Data Initialization (40-70%): Star catalogs, ephemeris, MODs
 * - Rendering Preparation (70-100%): Scene setup, initial render
 */
export type LoadingPhase = 'assets' | 'data' | 'rendering' | 'complete' | 'error';

export interface InitializationProgress {
  phase: LoadingPhase;
  progress: number; // 0-100
  stage: string; // Detailed description of current operation
  isComplete: boolean;
  error?: {
    message: string;
    suggestions: string[];
  };
}

interface InitializationOverlayProps {
  progress: InitializationProgress;
  lang: 'zh' | 'en';
  onRetry?: () => void; // Retry callback for failed initialization
}

/**
 * Phase display names and progress ranges
 */
const PHASE_INFO = {
  assets: {
    range: [0, 40] as [number, number],
    zh: '资源加载',
    en: 'Asset Loading',
  },
  data: {
    range: [40, 70] as [number, number],
    zh: '数据初始化',
    en: 'Data Initialization',
  },
  rendering: {
    range: [70, 100] as [number, number],
    zh: '渲染准备',
    en: 'Rendering Preparation',
  },
  complete: {
    range: [100, 100] as [number, number],
    zh: '初始化完成',
    en: 'Initialization Complete',
  },
  error: {
    range: [0, 0] as [number, number],
    zh: '初始化失败',
    en: 'Initialization Failed',
  },
};

/**
 * Detailed stage names for each phase
 */

/**
 * Detailed stage names for each phase
 */
const STAGE_NAMES = {
  zh: {
    // Asset loading stages
    loading: '加载资源...',
    textures: '加载纹理资源...',
    models: '加载3D模型...',
    shaders: '编译着色器...',
    
    // Data initialization stages
    idle: '准备中...',
    celestialBodies: '加载天体数据...',
    starCatalog: '加载星表数据...',
    universe: '加载宇宙数据...',
    ephemeris: '加载历表数据...',
    mods: '加载MOD扩展...',
    
    // Rendering stages
    scene: '初始化场景...',
    camera: '设置相机...',
    lights: '配置光照...',
    postProcessing: '初始化后期处理...',
    
    // Final stages
    complete: '初始化完成',
    error: '初始化失败',
  },
  en: {
    // Asset loading stages
    loading: 'Loading Resources...',
    textures: 'Loading Textures...',
    models: 'Loading 3D Models...',
    shaders: 'Compiling Shaders...',
    
    // Data initialization stages
    idle: 'Preparing...',
    celestialBodies: 'Loading Celestial Bodies...',
    starCatalog: 'Loading Star Catalog...',
    universe: 'Loading Universe Data...',
    ephemeris: 'Loading Ephemeris Data...',
    mods: 'Loading MOD Extensions...',
    
    // Rendering stages
    scene: 'Initializing Scene...',
    camera: 'Setting Up Camera...',
    lights: 'Configuring Lights...',
    postProcessing: 'Initializing Post-Processing...',
    
    // Final stages
    complete: 'Initialization Complete',
    error: 'Initialization Failed',
  },
};

/**
 * Timeout warning messages (after 30 seconds)
 */
const TIMEOUT_MESSAGES = {
  zh: {
    title: '初始化时间较长',
    suggestions: [
      '检查网络连接',
      '刷新页面重试',
      '清除浏览器缓存',
      '检查浏览器控制台错误信息',
    ],
  },
  en: {
    title: 'Initialization is taking longer than expected',
    suggestions: [
      'Check your network connection',
      'Try refreshing the page',
      'Clear browser cache',
      'Check browser console for errors',
    ],
  },
};

/**
 * Retry button labels
 */
const RETRY_LABELS = {
  zh: '重试',
  en: 'Retry',
};

/**
 * Timeout threshold (30 seconds)
 */
const TIMEOUT_THRESHOLD = 30000;

/**
 * Minimum progress update interval (200ms) for debouncing
 */
const MIN_UPDATE_INTERVAL = 200;

/**
 * Maximum retry attempts
 */
const MAX_RETRIES = 3;

/**
 * Exponential backoff delays (2s, 4s, 8s)
 */
const RETRY_DELAYS = [2000, 4000, 8000];

export default function InitializationOverlay({ 
  progress, 
  lang,
  onRetry,
}: InitializationOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  const [showTimeout, setShowTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [debouncedProgress, setDebouncedProgress] = useState(progress);
  
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateRef = useRef<number>(Date.now());
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced progress updates (minimum 200ms interval)
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    if (timeSinceLastUpdate >= MIN_UPDATE_INTERVAL) {
      setDebouncedProgress(progress);
      lastUpdateRef.current = now;
      return;
    } else {
      // Schedule update for remaining time
      const remainingTime = MIN_UPDATE_INTERVAL - timeSinceLastUpdate;
      const timer = setTimeout(() => {
        setDebouncedProgress(progress);
        lastUpdateRef.current = Date.now();
      }, remainingTime);
      
      return () => clearTimeout(timer);
    }
  }, [progress]);

  // Timeout warning (after 30 seconds)
  useEffect(() => {
    if (progress.isComplete || progress.phase === 'error') {
      return;
    }
    
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = TIMEOUT_THRESHOLD - elapsed;
    
    if (remaining <= 0) {
      setShowTimeout(true);
    } else {
      timeoutTimerRef.current = setTimeout(() => {
        setShowTimeout(true);
      }, remaining);
    }
    
    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
    };
  }, [progress.isComplete, progress.phase]);

  // Handle retry with exponential backoff
  const handleRetry = useCallback(() => {
    if (!onRetry || retryCount >= MAX_RETRIES) {
      return;
    }
    
    setIsRetrying(true);
    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    
    retryTimerRef.current = setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      setIsRetrying(false);
      setShowTimeout(false);
      startTimeRef.current = Date.now(); // Reset start time
      onRetry();
    }, delay);
  }, [onRetry, retryCount]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

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

  const currentProgress = debouncedProgress;
  const phaseInfo = PHASE_INFO[currentProgress.phase] || PHASE_INFO.assets;
  const phaseText = phaseInfo[lang];
  const stageText = STAGE_NAMES[lang][currentProgress.stage as keyof typeof STAGE_NAMES['zh']] || currentProgress.stage;

  // 计算遮罩透明度: 50%之前为0.85, 50%-100%线性降低到0
  const calculateOverlayOpacity = () => {
    if (currentProgress.progress <= 50) {
      return 0.85;
    }
    // 从50%到100%线性降低: 0.85 -> 0
    const fadeProgress = (currentProgress.progress - 50) / 50; // 0 到 1
    return 0.85 * (1 - fadeProgress);
  };

  const overlayOpacity = calculateOverlayOpacity();
  const hasError = currentProgress.phase === 'error';
  const canRetry = hasError && retryCount < MAX_RETRIES && onRetry;
  const retryDisabled = isRetrying || retryCount >= MAX_RETRIES;

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
        // 始终允许点击穿透，不阻挡用户操作
        pointerEvents: hasError || showTimeout ? 'auto' : 'none',
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

      {/* Error message display */}
      {hasError && currentProgress.error && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-32 px-6 py-4 bg-red-900/90 backdrop-blur-md rounded-lg max-w-md">
          <div className="text-white font-semibold text-lg mb-2">
            {currentProgress.error.message}
          </div>
          {currentProgress.error.suggestions.length > 0 && (
            <div className="text-white/80 text-sm space-y-1">
              <div className="font-medium mb-1">
                {lang === 'zh' ? '建议：' : 'Suggestions:'}
              </div>
              <ul className="list-disc list-inside space-y-1">
                {currentProgress.error.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={retryDisabled}
              className={`mt-4 px-4 py-2 bg-white text-red-900 rounded font-medium transition-colors ${
                retryDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {isRetrying
                ? `${RETRY_LABELS[lang]} (${retryCount + 1}/${MAX_RETRIES})...`
                : `${RETRY_LABELS[lang]} (${retryCount}/${MAX_RETRIES})`}
            </button>
          )}
          {retryCount >= MAX_RETRIES && (
            <div className="mt-3 text-white/70 text-sm">
              {lang === 'zh'
                ? '已达到最大重试次数，请刷新页面'
                : 'Maximum retry attempts reached. Please refresh the page.'}
            </div>
          )}
        </div>
      )}

      {/* Timeout warning display */}
      {!hasError && showTimeout && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-32 px-6 py-4 bg-yellow-900/90 backdrop-blur-md rounded-lg max-w-md">
          <div className="text-white font-semibold text-lg mb-2">
            {TIMEOUT_MESSAGES[lang].title}
          </div>
          <div className="text-white/80 text-sm space-y-1">
            <ul className="list-disc list-inside space-y-1">
              {TIMEOUT_MESSAGES[lang].suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 进度条 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center pb-8 px-4">
        {/* Phase and stage info */}
        <div className="text-white text-center mb-4 space-y-1">
          <div
            className="font-semibold"
            style={{
              fontSize: '16px',
              opacity: 0.9,
            }}
          >
            {phaseText}
          </div>
          <div
            className="text-sm"
            style={{
              fontSize: '13px',
              opacity: 0.6,
            }}
          >
            {stageText}
          </div>
        </div>
        
        {/* 进度百分比 - 在进度条上方 */}
        <div
          className="text-white font-numeric mb-4"
          style={{
            fontSize: '14px',
            fontWeight: 400,
            opacity: 0.7,
          }}
        >
          {Math.round(currentProgress.progress)}%
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
              width: `${currentProgress.progress}%`,
              backgroundColor: hasError ? '#ef4444' : '#ffffff',
              boxShadow: hasError
                ? '0 0 10px rgba(239, 68, 68, 0.5)'
                : '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
