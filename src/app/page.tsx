/**
 * 主页面 (Main Page)
 *
 * OPIC 宇宙可视化系统的根页面，负责：
 * - 动态加载 3D 太阳系场景（SolarSystemCanvas3DDynamic - 延迟加载 Three.js/Cesium）
 * - 加载和初始化 MOD 管理器
 * - 渲染浮动 UI 控件（时间控制、信息面板、状态指示器）
 * - 管理初始化遮罩层的显示/隐藏
 */

// src/app/page.tsx 或 src/app/solar-system/page.tsx
'use client';

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import TimeControl from "@/components/TimeControl";
import InfoModal from "@/components/InfoModal";
import { HEADER_CONFIG } from "@/lib/config/visualConfig";
import EphemerisStatusPanel from "@/components/EphemerisStatusPanel";
import { useSolarSystemStore } from "@/lib/state";
import { useEarthControlStore } from "@/lib/state/EarthControlStore";
import { initModManager, autoEnableMods } from "@/lib/mod-manager";
import { registerCoreMods } from "@/lib/mods";
import { useModStore } from "@/lib/mod-manager/store";
import { useModManager } from "@/hooks/useModManager";
import WeatherDisasterOverlay from "@/components/weather-disaster/WeatherDisasterOverlay";
import SpaceLaunchOverlay from "@/components/space-launches/SpaceLaunchOverlay";
import GlobalTrafficOverlay from "@/components/global-traffic/GlobalTrafficOverlay";
import { MoonOverlay } from "@/components/moon/MoonOverlay";
import InitializationOverlay, { type InitializationProgress } from "@/components/InitializationOverlay";

// 动态延迟加载 3D 渲染管线 - 减少首屏 JS 体积约 40-60%
const SolarSystemCanvas3D = dynamic(
  () => import("@/components/canvas/3d/SolarSystemCanvas3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#000' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(100,180,255,0.3)', borderTopColor: 'transparent' }} />
          <div className="text-sm tracking-wider" style={{ color: 'rgba(180,220,255,0.6)' }}>正在加载 3D 引擎...</div>
        </div>
      </div>
    ),
  }
);

export default function SolarSystemPage() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEphemerisStatusOpen, setIsEphemerisStatusOpen] = useState(false);
  
  // 使用全局状态管理地球控制 - 细粒度 selector 减少重渲染
  const userCesiumEnabled = useEarthControlStore((s) => s.cesiumEnabled);
  const earthLockEnabled = useEarthControlStore((s) => s.earthLockEnabled);
  const earthLightEnabled = useEarthControlStore((s) => s.earthLightEnabled);
  const earthPlanet = useEarthControlStore((s) => s.earthPlanet);
  const setEarthPlanet = useEarthControlStore((s) => s.setEarthPlanet);
  
  const [camera, setCamera] = useState<any>(null);
  
  // 初始化进度状态
  const [initProgress, setInitProgress] = useState<InitializationProgress>({
    phase: 'assets',
    stage: 'idle',
    progress: 0,
    isComplete: false,
  });
  
  // 获取当前语言 - 细粒度 selector
  const lang = useSolarSystemStore((state) => state.lang);

  // 从MOD状态读取功能启用状态 - 细粒度 selector
  const weatherDisasterModEnabled = useModStore((s) => s.mods['weather-disaster']?.state === 'enabled');
  const globalTrafficModEnabled = useModStore((s) => s.mods['global-traffic']?.state === 'enabled');
  const spaceLaunchesModEnabled = useModStore((s) => s.mods['space-launches']?.state === 'enabled');

  // cesiumEnabled 直接由用户控制，不受 MOD 限制
  const cesiumEnabled = userCesiumEnabled;

  const { enableMod: _enableMod, disableMod: _disableMod } = useModManager();

  // 初始化MOD管理器
  useEffect(() => {
    const init = async () => {
      initModManager();
      await registerCoreMods(); // 改为 await
      // 自动启用 defaultEnabled 的 MOD
      await autoEnableMods();
    };
    init();
  }, []);

  // 监听星历状态面板打开事件
  useEffect(() => {
    const handleOpenEphemerisStatus = () => {
      setIsEphemerisStatusOpen(true);
    };
    
    window.addEventListener('openEphemerisStatus', handleOpenEphemerisStatus);
    
    return () => {
      window.removeEventListener('openEphemerisStatus', handleOpenEphemerisStatus);
    };
  }, []);

  // 计算顶部偏移（Header高度）- 漂浮模式下不需要预留空间
  const headerHeight = (HEADER_CONFIG.enabled && !HEADER_CONFIG.floatingMode) ? HEADER_CONFIG.height : 0;

  return (
    <div 
      className="w-screen flex flex-col overflow-hidden relative"
      style={{ 
        height: '100vh',
        // 使用 dvh 适配移动端动态视口
        // @ts-expect-error - dvh 是较新的 CSS 单位
        height: '100dvh',
      }}
    >
      {/* 初始化遮罩 */}
      <InitializationOverlay progress={initProgress} lang={lang} />
      
      {/* MOD 覆盖层 */}
      {weatherDisasterModEnabled && <WeatherDisasterOverlay lang={lang} />}
      {spaceLaunchesModEnabled && <SpaceLaunchOverlay lang={lang} />}
      {globalTrafficModEnabled && <GlobalTrafficOverlay lang={lang} />}
      
      {/* 月球探索 MOD (Dock 图标触发，数据由动画循环驱动) */}
      <MoonOverlay lang={lang} />
      
      {/* 模态框 */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      <EphemerisStatusPanel isOpen={isEphemerisStatusOpen} onClose={() => setIsEphemerisStatusOpen(false)} />

      {/* 主容器，漂浮模式下不需要留出Header高度空间 */}
      <div 
        className="flex-1 relative min-h-0 flex flex-col"
        style={{ 
          marginTop: `${headerHeight}px`,
          isolation: 'isolate',
          // 确保不超出父容器
          maxHeight: '100%',
        }}
      >
        <div className="flex-1 relative min-h-0" style={{ isolation: 'isolate', maxHeight: '100%' }}>
          <SolarSystemCanvas3D 
            cesiumEnabled={cesiumEnabled}
            earthLockEnabled={earthLockEnabled}
            earthLightEnabled={earthLightEnabled}
            onEarthPlanetReady={setEarthPlanet}
            onCameraReady={setCamera}
            onInitializationProgress={(stage, progress, isComplete) => {
              // 直接使用场景初始化进度（0-100%）
              setInitProgress(prev => {
                // 进度只能前进，不能后退（防止重复初始化导致进度跳回）
                if (progress > prev.progress || isComplete) {
                  return { ...prev, stage, progress, isComplete };
                }
                return prev;
              });
            }}
          />
        </div>
        <TimeControl />
      </div>
    </div>
  );
}
