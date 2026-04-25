// src/app/page.tsx 或 src/app/solar-system/page.tsx
'use client';

import { useEffect, useRef, useState } from "react";import SolarSystemCanvas3D from "@/components/canvas/3d/SolarSystemCanvas3D";
import TimeControl from "@/components/TimeControl";
import InfoModal from "@/components/InfoModal";
import { SatelliteMenu } from "@/components/satellite";
import { HEADER_CONFIG } from "@/lib/config/visualConfig";
import EphemerisStatusPanel from "@/components/EphemerisStatusPanel";
import CesiumToggleButton from "@/components/CesiumToggleButton";
import CesiumMapSourcePanel from "@/components/cesium/CesiumMapSourcePanel";
import EarthLockButton from "@/components/EarthLockButton";
import EarthLightButton from "@/components/EarthLightButton";
import { useSolarSystemStore } from "@/lib/state";
import ModManagerButton from "@/components/ModManagerButton";
import { initModManager, autoEnableMods } from "@/lib/mod-manager";
import { registerCoreMods } from "@/lib/mods";
import { useModStore } from "@/lib/mod-manager/store";
import { useModManager } from "@/hooks/useModManager";
import WeatherDisasterOverlay from "@/components/weather-disaster/WeatherDisasterOverlay";
import SpaceLaunchOverlay from "@/components/space-launches/SpaceLaunchOverlay";
import GlobalTrafficOverlay from "@/components/global-traffic/GlobalTrafficOverlay";
import InitializationOverlay from "@/components/InitializationOverlay";

/**
 * Info button component for top-right corner.
 * Arknights-style design matching the settings button.
 */
function InfoButton({ onClick, lang }: { onClick: () => void; lang: 'zh' | 'en' }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed"
      style={{
        top: '2rem',
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
      aria-label={lang === 'zh' ? '关于' : 'About'}
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
      
      {lang === 'zh' ? '关于' : 'ABOUT'}
    </button>
  );
}

/**
 * Ephemeris Status button component for top-right corner.
 * Arknights-style design matching other buttons.
 */
function EphemerisButton({ onClick, lang }: { onClick: () => void; lang: 'zh' | 'en' }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed"
      style={{
        top: '5.5rem',
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
      aria-label={lang === 'zh' ? '星历状态' : 'Ephemeris Status'}
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
      
      {lang === 'zh' ? '星历状态' : 'EPHEMERIS'}
    </button>
  );
}

export default function SolarSystemPage() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEphemerisStatusOpen, setIsEphemerisStatusOpen] = useState(false);
  const [earthLockEnabled, setEarthLockEnabled] = useState(true);
  const [earthLightEnabled, setEarthLightEnabled] = useState(true);
  const [earthPlanet, setEarthPlanet] = useState<any>(null);
  const [camera, setCamera] = useState<any>(null);
  // 地球是否可见（相机足够近时显示按钮）
  const [earthVisible, setEarthVisible] = useState(false);
  
  // 初始化进度状态
  const [initProgress, setInitProgress] = useState({
    stage: 'loading',
    progress: 0,
    isComplete: false,
  });
  
  // 获取当前语言
  const lang = useSolarSystemStore((state) => state.lang);

  // 模拟页面加载进度 (0-60%)
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      if (progress >= 60) {
        progress = 60;
        clearInterval(interval);
      }
      setInitProgress(prev => {
        // 只在场景初始化之前更新
        if (prev.stage === 'loading' || prev.stage === 'idle') {
          return { stage: 'loading', progress, isComplete: false };
        }
        return prev;
      });
    }, 50); // 每50ms增加2%,约1.5秒到达60%

    return () => clearInterval(interval);
  }, []);

  // 从MOD状态读取功能启用状态
  const cesiumModEnabled = useModStore((state) => state.mods['cesium-integration']?.state === 'enabled');
  const satelliteModEnabled = useModStore((state) => state.mods['satellite-tracking']?.state === 'enabled');
  const weatherDisasterModEnabled = useModStore((state) => state.mods['weather-disaster']?.state === 'enabled');
  const globalTrafficModEnabled = useModStore((state) => state.mods['global-traffic']?.state === 'enabled');
  const spaceLaunchesModEnabled = useModStore((state) => state.mods['space-launches']?.state === 'enabled');

  // cesiumEnabled 由 MOD 状态 + 用户手动切换共同决定
  const [userCesiumEnabled, setUserCesiumEnabled] = useState(true);
  const cesiumEnabled = cesiumModEnabled && userCesiumEnabled;

  const { enableMod, disableMod } = useModManager();

  // 初始化MOD管理器
  useEffect(() => {
    const init = async () => {
      initModManager();
      registerCoreMods();
      // 自动启用 defaultEnabled 的 MOD
      await autoEnableMods();
    };
    init();
  }, []);

  // 每帧检测相机到地球的距离，控制按钮显隐
  // 距离阈值：10 AU 以内认为"可以看见地球"
  const EARTH_VISIBLE_THRESHOLD = 10;
  const cameraRef = useRef(camera);
  const earthPlanetRef = useRef(earthPlanet);
  useEffect(() => { cameraRef.current = camera; }, [camera]);
  useEffect(() => { earthPlanetRef.current = earthPlanet; }, [earthPlanet]);

  useEffect(() => {
    let rafId: number;
    const check = () => {
      const cam = cameraRef.current;
      const ep = earthPlanetRef.current;
      if (cam && ep) {
        const earthPos = ep.getMesh?.()?.position;
        if (earthPos) {
          const dist = cam.position.distanceTo(earthPos);
          setEarthVisible(dist < EARTH_VISIBLE_THRESHOLD);
        }
      }
      rafId = requestAnimationFrame(check);
    };
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 计算顶部偏移（Header高度）- 漂浮模式下不需要预留空间
  const headerHeight = (HEADER_CONFIG.enabled && !HEADER_CONFIG.floatingMode) ? HEADER_CONFIG.height : 0;

  return (
    <div 
      className="w-screen flex flex-col overflow-hidden relative"
      style={{ 
        height: '100vh',
        // 使用 dvh 适配移动端动态视口
        // @ts-ignore - dvh 是较新的 CSS 单位
        height: '100dvh',
      }}
    >
      {/* 初始化遮罩 */}
      <InitializationOverlay progress={initProgress} lang={lang} />
      
      <InfoButton onClick={() => setIsInfoModalOpen(true)} lang={lang} />
      <EphemerisButton onClick={() => setIsEphemerisStatusOpen(true)} lang={lang} />
      <ModManagerButton lang={lang} />
      {weatherDisasterModEnabled && <WeatherDisasterOverlay lang={lang} />}
      {spaceLaunchesModEnabled && <SpaceLaunchOverlay lang={lang} />}
      {globalTrafficModEnabled && <GlobalTrafficOverlay lang={lang} />}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      <EphemerisStatusPanel isOpen={isEphemerisStatusOpen} onClose={() => setIsEphemerisStatusOpen(false)} />
      
      {/* Cesium 切换按钮 + 地球锁定按钮 — 右侧中间，仅地球可见时显示 */}
      <div
        style={{
          position: 'fixed',
          right: '1.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          opacity: earthVisible ? 1 : 0,
          pointerEvents: earthVisible ? 'auto' : 'none',
          transition: 'opacity 0.6s ease',
        }}
      >
        {cesiumModEnabled && <CesiumToggleButton onToggle={setUserCesiumEnabled} initialEnabled={cesiumEnabled} />}
        <EarthLockButton onToggle={setEarthLockEnabled} initialEnabled={earthLockEnabled} />
        <EarthLightButton
          initialEnabled={earthLightEnabled}
          onToggle={(enabled) => {
            setEarthLightEnabled(enabled);
            const ext = earthPlanet?.getCesiumExtension?.();
            ext?.setEnableLighting?.(enabled);
          }}
        />
        {satelliteModEnabled && <SatelliteMenu lang={lang} />}
      </div>
      
      {/* Cesium 地图源切换面板（仅 Cesium 模式下显示） */}
      <CesiumMapSourcePanel earthPlanet={earthPlanet} visible={cesiumEnabled} />

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
            onEarthPlanetReady={setEarthPlanet}
            onCameraReady={setCamera}
            onInitializationProgress={(stage, progress, isComplete) => {
              // 将场景初始化进度映射到 60-100% 范围
              const mappedProgress = 60 + (progress * 0.4);
              setInitProgress({ stage, progress: mappedProgress, isComplete });
            }}
          />
        </div>
        <TimeControl />
      </div>
    </div>
  );
}
